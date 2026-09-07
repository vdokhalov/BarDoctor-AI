import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { changedConsumptionModeIssues, resolveConsumptionMode } from "../lib/bardoctor/consumption-mode";
import { directBalanceMutations } from "../lib/bardoctor/inventory-write-guard";
import { applyInventoryCount, applyPurchaseToInventory } from "../lib/bardoctor/inventory";
import { normalizePurchaseDocument } from "../lib/bardoctor/purchases";
import { salesImportIdentity } from "../lib/bardoctor/sales-import-identity";
import { createOrUpdateSalesBatch, tabularSalesAdapter } from "../lib/bardoctor/sales-consumption";
import { readStoreSnapshots, runStoreCasBatch, StoreWriteConflictError, withStoreCasRetries } from "../lib/bardoctor/store-cas";
import { summarizeInventoryValuation } from "../lib/bardoctor/valuation";

class FakeStatement {
  constructor(private readonly statement: StatementSync, private readonly params: SQLInputValue[] = []) {}
  bind(...params: unknown[]) { return new FakeStatement(this.statement, params as SQLInputValue[]); }
  all<T>() { return { success: true, results: this.statement.all(...this.params) as T[] }; }
  run() {
    const result = this.statement.run(...this.params);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class FakeD1 {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec(`CREATE TABLE domain_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      store_key TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(account_id, store_key)
    )`);
  }
  prepare(sql: string) { return new FakeStatement(this.sqlite.prepare(sql)); }
  async batch(statements: FakeStatement[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  value(accountId: number, key: string): unknown {
    const row = this.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ?").get(accountId, key) as { data_json?: string } | undefined;
    return row?.data_json ? JSON.parse(row.data_json) : undefined;
  }
}

function upsert(database: FakeD1, accountId: number, key: string, value: unknown, now: string) {
  return database.prepare(`INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
    .bind(accountId, key, JSON.stringify(value), now);
}

function purchase(id: string, quantity: number) {
  return normalizePurchaseDocument({
    id,
    venueId: 7,
    documentType: "invoice",
    supplierName: "Test supplier",
    date: "2026-09-01",
    currency: "RUB",
    total: quantity * 10,
    items: [{ id: `${id}:line`, name: "Cola", purchaseProductKey: "cola", quantity, unit: "шт.", packageSize: "1 шт.", unitPrice: 10, lineTotal: quantity * 10, category: "products" }],
    source: "manual",
  }, id);
}

test("recipe save cannot mutate current stock through an assortment write", () => {
  const before = { stockBalances: [{ productKey: "coffee", current: 1_000, unit: "g" }] };
  const recipePayload = { stockBalances: [{ productKey: "coffee", current: 900, unit: "g", safety: 100 }] };
  assert.deepEqual(directBalanceMutations(before, recipePayload), [{ productKey: "coffee", before: 1_000, after: 900 }]);
  assert.deepEqual(directBalanceMutations(before, { stockBalances: [{ productKey: "coffee", current: 1_000, unit: "g", safety: 100 }] }), []);
});

test("explicit inventory adjustment creates a canonical movement", () => {
  const result = applyInventoryCount({
    assortment: { stockBalances: [{ productKey: "coffee", name: "Coffee", current: 1_000, unit: "g", averageUnitCost: 0.1, inventoryValue: 100, currency: "RUB" }] },
    snapshot: { id: "count-1", date: "2026-09-01", items: [{ id: "line-1", productKey: "coffee", actual: 900 }] },
    now: "2026-09-01T10:00:00.000Z",
  });
  assert.equal((result.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 900);
  assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].type, "inventory_adjustment");
  assert.equal(result.movements[0].amount, -100);
});

test("CAS rejects a stale lifecycle write and deterministic replay preserves both purchases", async () => {
  const database = new FakeD1();
  const accountId = 1;
  const keys = ["purchases", "assortment", "movements"];
  const initial = { nomenclature: [], stockBalances: [], recipes: [], menuItems: [] };
  const seededAt = "2026-09-01T09:00:00.000Z";
  await database.batch([upsert(database, accountId, "purchases", [], seededAt), upsert(database, accountId, "assortment", initial, seededAt), upsert(database, accountId, "movements", [], seededAt)]);
  const firstSnapshot = await readStoreSnapshots(database as unknown as D1Database, accountId, keys);
  const secondSnapshot = await readStoreSnapshots(database as unknown as D1Database, accountId, keys);

  const writePurchase = async (document: ReturnType<typeof purchase>, snapshot: typeof firstSnapshot, now: string) => {
    const documents = database.value(accountId, "purchases") as unknown[];
    const assortment = database.value(accountId, "assortment");
    const movements = database.value(accountId, "movements") as unknown[];
    const applied = applyPurchaseToInventory({ assortment, document, accountingCurrency: "RUB", now });
    await runStoreCasBatch(database as unknown as D1Database, accountId, snapshot, [
      upsert(database, accountId, "purchases", [document, ...documents], now),
      upsert(database, accountId, "assortment", applied.assortment, now),
      upsert(database, accountId, "movements", [...applied.movements, ...movements], now),
    ] as unknown as D1PreparedStatement[], now);
  };

  await writePurchase(purchase("purchase-a", 10), firstSnapshot, "2026-09-01T10:00:00.000Z");
  await assert.rejects(() => writePurchase(purchase("purchase-b", 14), secondSnapshot, "2026-09-01T10:00:01.000Z"), StoreWriteConflictError);
  const fresh = await readStoreSnapshots(database as unknown as D1Database, accountId, keys);
  await writePurchase(purchase("purchase-b", 14), fresh, "2026-09-01T10:00:02.000Z");

  assert.deepEqual((database.value(accountId, "purchases") as Array<{ id: string }>).map((item) => item.id), ["purchase-b", "purchase-a"]);
  assert.equal((database.value(accountId, "movements") as unknown[]).length, 2);
  const balance = (database.value(accountId, "assortment") as { stockBalances: Array<{ current: number }> }).stockBalances[0];
  assert.equal(balance.current, 24);
});

test("CAS exhaustion returns an explicit conflict instead of false success", async () => {
  let attempts = 0;
  const response = await withStoreCasRetries(new Request("https://example.test", { method: "POST", body: "{}" }), async () => {
    attempts += 1;
    throw new StoreWriteConflictError();
  });
  assert.equal(attempts, 3);
  assert.equal(response.status, 409);
  assert.equal((await response.json() as { code: string }).code, "STORE_WRITE_CONFLICT");
});

test("sales import identity is content-, parser-, and venue-scoped and duplicate drafts stay single", async () => {
  const bytes = new TextEncoder().encode("name,qty\nCola,1\n");
  const sameRenamed = await salesImportIdentity({ venueId: 7, sourceType: "tabular", content: bytes });
  const same = await salesImportIdentity({ venueId: 7, sourceType: "tabular", content: bytes });
  const otherVenue = await salesImportIdentity({ venueId: 8, sourceType: "tabular", content: bytes });
  const changed = await salesImportIdentity({ venueId: 7, sourceType: "tabular", content: new TextEncoder().encode("name,qty\nCola,2\n") });
  const changedMapping = await salesImportIdentity({ venueId: 7, sourceType: "tabular", content: bytes, parserVersion: "tabular-v1:Sheet2:0:0:1" });
  assert.equal(sameRenamed, same);
  assert.notEqual(same, otherVenue);
  assert.notEqual(same, changed);
  assert.notEqual(same, changedMapping);

  const draft = tabularSalesAdapter({ rows: [["name", "qty"], ["Cola", "1"]], headerRow: 0, nameColumn: 0, quantityColumn: 1, sourceReference: "renamed.xlsx", externalBatchId: same });
  const input = { assortment: { menuItems: [] }, mappings: [], warehouseRoutes: [], warehouses: [], venueId: 7, actor: { accountId: 1, name: "QA", role: "owner" }, now: "2026-09-01T10:00:00.000Z" };
  const first = createOrUpdateSalesBatch({ ...input, batches: [], draft });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const duplicate = createOrUpdateSalesBatch({ ...input, batches: first.batches, draft: { ...draft, sourceReference: "another-name.xlsx" } });
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) return;
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.batches.length, 1);
  assert.equal(duplicate.batch.id, first.batch.id);
});

test("conflicting consumption modes are rejected while a service resolves to NONE", () => {
  const conflicting = {
    menuItems: [{ id: "espresso", type: "ready", readyProduct: { productKey: "coffee", packagesPerSale: 1 } }],
    nomenclature: [{ id: "coffee", productKey: "coffee", unit: "g" }],
    stockBalances: [{ productKey: "coffee", unit: "g" }],
    recipes: [{ id: "recipe-1", menuItemId: "espresso", status: "confirmed", reviewStatus: "approved", current: true, ingredients: [] }],
  };
  assert.equal(resolveConsumptionMode(conflicting.menuItems[0], conflicting).code, "CONSUMPTION_MODE_CONFLICT");
  assert.equal(changedConsumptionModeIssues({ menuItems: [], recipes: [] }, conflicting).length, 1);
  assert.deepEqual(resolveConsumptionMode({ id: "service", type: "service" }, { recipes: [] }), { ok: true, mode: "NONE" });
});

test("explicit zero cost remains known zero while missing cost remains unknown", () => {
  const zero = normalizePurchaseDocument({ documentType: "invoice", currency: "RUB", total: 0, items: [{ name: "Free sample", quantity: 1, unitPrice: 0, lineTotal: 0 }] }, "zero");
  const missing = normalizePurchaseDocument({ documentType: "invoice", currency: "RUB", items: [{ name: "Unknown", quantity: 1 }] }, "unknown");
  assert.equal(zero.costStatus, "KNOWN_ZERO");
  assert.equal(zero.items[0].costStatus, "KNOWN_ZERO");
  assert.equal(missing.costStatus, "UNKNOWN");
  assert.equal(missing.items[0].costStatus, "UNKNOWN");
  assert.equal(normalizePurchaseDocument({ documentType: "invoice", items: [{ name: "Paid", quantity: 1, lineTotal: 10, costStatus: "KNOWN_ZERO" }] }, "mismatch").items[0].costStatus, "KNOWN");
  const valuation = summarizeInventoryValuation({
    balances: [{ productKey: "free", name: "Free", current: 2, unit: "pcs", averageUnitCost: 0, inventoryValue: 0, costStatus: "KNOWN_ZERO", currency: "RUB" }],
    accountingCurrency: "RUB",
    venueId: 1,
    stockMovements: [{ id: "free-receipt", type: "receipt", status: "active", venueId: 1, productKey: "free", amount: 2, unit: "pcs", costAmount: 0, costStatus: "KNOWN_ZERO", currency: "RUB", businessDate: "2026-08-01" }],
  });
  assert.equal(valuation.status, "full");
  assert.equal(valuation.total, 0);
});
