import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import * as inventory from "../lib/bardoctor/inventory";
import * as purchases from "../lib/bardoctor/purchases";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";
import { purchaseVenueScopeIssue } from "../lib/bardoctor/purchase-venue-scope";
import { preparePurchaseConversions } from "../lib/bardoctor/purchase-conversion";

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const now = "2026-09-08T12:00:00.000Z";
function fixture(reverse = false) {
  const row = (venueId: number, current: number) => ({
    id: "beer", key: "beer", productKey: "beer", name: "Beer", venueId,
    unit: "pcs", current, packageSize: "1 pcs", currency: "RUB", active: true,
  });
  const rows = [row(1, 24), row(2, 100)];
  if (reverse) rows.reverse();
  return reload({
    assortment: { stockBalances: rows, nomenclature: structuredClone(rows) },
    stockMovements: [1, 2].map((venueId) => ({
      id: `old-${venueId}`, type: "receipt", venueId, productKey: "beer", productName: "Beer",
      amount: 10, unit: "pcs", costAmount: venueId === 1 ? 150 : 990,
      currency: "RUB", sourceDocumentId: `old-${venueId}`, sourceLineId: "line",
      date: "2026-09-01", createdAt: "2026-09-01", status: "active",
    })),
    document: {
      id: "venue1-receipt", venueId: 1, documentType: "invoice", status: "confirmed",
      supplierName: "Supplier", date: "2026-09-08", currency: "RUB", total: 180,
      costStatus: "KNOWN", items: [{ id: "line", name: "Beer", purchaseProductKey: "beer",
        quantity: 12, unit: "pcs", unitPrice: 15, lineTotal: 180, category: "alcohol", costStatus: "KNOWN" }],
    },
    accountingCurrency: "RUB", now,
  });
}

for (const reverse of [false, true]) {
  test(`mixed-venue purchase is atomically rejected after reload; reversed order=${reverse}`, () => {
    const input = fixture(reverse);
    const before = structuredClone(input);
    const result = reload(inventory.applyPurchaseToInventory(input));
    assert.equal(result.summary.postedLines, 0);
    assert.equal(result.summary.unresolvedLines.length, 1);
    assert.deepEqual(result.movements, []);
    assert.deepEqual(result.assortment, before.assortment);
    assert.deepEqual(input, before);
    for (const venueId of [1, 2]) {
      const cost = resolveCostBasis({ venueId, nomenclatureItem: { productKey: "beer", unit: "pcs" },
        asOf: now, receipts: input.stockMovements, accountingCurrency: "RUB" });
      assert.equal(cost.value, venueId === 1 ? 15 : 99);
    }
    const revision = inventory.revisePurchaseInInventory({ ...input,
      previousDocument: input.document, nextDocument: { ...input.document, total: 360 } });
    assert.equal(revision.ok, false);
    if (!revision.ok) assert.equal(revision.code, "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW");
    assert.deepEqual(input, before);
  });
}

test("valid venue and untagged account-local legacy rows still post, persist and cost correctly", () => {
  for (const legacy of [false, true]) {
    const input = fixture();
    input.assortment.stockBalances = input.assortment.stockBalances.filter((row) => row.venueId === 1);
    input.assortment.nomenclature = input.assortment.nomenclature.filter((row) => row.venueId === 1);
    input.stockMovements = input.stockMovements.filter((row) => row.venueId === 1);
    if (legacy) {
      for (const row of [...input.assortment.stockBalances, ...input.assortment.nomenclature]) {
        Reflect.deleteProperty(row, "venueId");
      }
    }
    const before = structuredClone(input);
    const result = reload(inventory.applyPurchaseToInventory(input));
    assert.deepEqual(result.summary.unresolvedLines, []);
    assert.equal(result.movements.length, 1);
    assert.equal(result.movements[0].venueId, 1);
    assert.equal(result.movements[0].amount, 12);
    assert.equal(result.movements[0].unit, "pcs");
    assert.equal((result.assortment.stockBalances as {current: number}[])[0].current, 36);
    assert.equal(resolveCostBasis({ venueId: 1, nomenclatureItem: { productKey: "beer", unit: "pcs" },
      asOf: now, receipts: [...result.movements, ...input.stockMovements], accountingCurrency: "RUB" }).value, 15);
    assert.deepEqual(input, before);
  }
});

test("foreign aliases, templates, recipes and invalid ownership cannot bypass the preflight", () => {
  for (const key of ["inventoryProductAliases", "supplierProductMappings", "packagingTemplates", "recipes"]) {
    assert.equal(purchaseVenueScopeIssue(1, { [key]: [{ id: "same", venueId: 2 }] })?.code,
      "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW");
  }
  for (const venueId of ["", "invalid", -1, 1.5]) {
    assert.ok(purchaseVenueScopeIssue(1, { venueId }));
  }
  assert.ok(purchaseVenueScopeIssue(undefined, { venueId: 1 }));
  assert.equal(purchaseVenueScopeIssue(1, { supplierProductMappings: [{ venueId: 0 }] }), null);
  assert.equal(purchaseVenueScopeIssue(1, { packagingTemplates: [{ id: "same", venueId: 1 }] }), null);
});

for (const action of ["confirm", "update", "repost"]) {
  for (const reverse of [false, true]) {
    test(`${action} HTTP rejects mixed venues before migration, consolidation or writes; reverse=${reverse}`, async () => {
      const input = fixture(reverse);
      const stores = [
        { store_key: inventory.ASSORTMENT_STORE_KEY, data_json: JSON.stringify(input.assortment) },
        { store_key: inventory.STOCK_MOVEMENT_STORE_KEY, data_json: JSON.stringify(input.stockMovements) },
        { store_key: purchases.PURCHASE_STORE_KEY, data_json: JSON.stringify([input.document]) },
      ];
      const before = structuredClone(stores);
      let writes = 0;
      let migrations = 0;
      let consolidations = 0;
      let reads = 0;
      const dependencies = {
        ...inventory, ...purchases, purchaseVenueScopeIssue,
        INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots",
        INVOICE_MAPPING_STORE_KEY: "bd_invoice_mappings",
        authenticateRequest: async () => ({ id: 1, venueId: 1, role: "owner" }),
        hasPermission: () => true,
        accountingCurrencyFromRestaurantJson: () => "RUB",
        readStoreSnapshots: async () => [],
        withStoreCasRetries: (request: Request, post: (request: Request) => Promise<Response>) => post(request),
        migratePurchaseLedger: () => { migrations++; throw new Error("must not migrate mixed state"); },
        consolidateInventoryDuplicates: () => { consolidations++; throw new Error("must not consolidate mixed state"); },
        runStoreCasBatch: () => { writes++; throw new Error("must not persist mixed state"); },
        getD1: () => ({
          prepare: (sql: string) => {
            assert.match(sql, /^\s*SELECT/);
            return { bind: () => ({ all: async () => { reads++; return { results: stores }; } }) };
          },
          batch: () => { writes++; throw new Error("must not write"); },
        }),
      };
      const source = await readFile(new URL(`../app/api/purchases/${action}/route.ts`, import.meta.url), "utf8");
      const body = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, ""))
        .replace("export async function POST", "async function POST");
      const post = new Function("dependencies", "const {" + Object.keys(dependencies).join(",")
        + "}=dependencies;\n" + body + "\nreturn POST;")(dependencies) as (request: Request) => Promise<Response>;
      const response = await post(new Request(`https://example.test/api/purchases/${action}`, {
        method: "POST", body: JSON.stringify({ document: input.document, documentId: input.document.id }),
      }));
      assert.equal(response.status, 422);
      const result = await response.json() as Record<string, unknown>;
      assert.equal(result.code, "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW");
      assert.equal(result.reviewState, "NEEDS_REVIEW");
      assert.equal(reads, 1);
      assert.equal(writes, 0);
      assert.equal(migrations, 0);
      assert.equal(consolidations, 0);
      assert.deepEqual(stores, before);
      assert.equal(JSON.stringify(result).includes("Beer"), false);
    });
  }
}

for (const action of ["confirm", "update"]) {
  test(`${action} HTTP rejects kg/l conversion before migrations and every write`, async () => {
    const document = { id: "invalid", date: "2026-09-08", venueId: 1, currency: "RUB", total: 20,
      items: [{ id: "line", name: "Weight", purchaseProductKey: "weight", quantity: 2, unit: "l",
        unitPrice: 10, lineTotal: 20, category: "products" }] };
    const stores = [{ store_key: inventory.ASSORTMENT_STORE_KEY, data_json: JSON.stringify({
      nomenclature: [{ id: "weight", key: "weight", unit: "kg", unitModelVersion: 4, venueId: 1 }], stockBalances: [] }) },
      { store_key: purchases.PURCHASE_STORE_KEY, data_json: JSON.stringify([document]) }];
    const before = structuredClone(stores);
    let mutations = 0;
    const forbidden = () => { mutations++; throw new Error("Conversion must reject before mutations"); };
    const dependencies = { ...inventory, ...purchases, purchaseVenueScopeIssue, preparePurchaseConversions,
      INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots", INVOICE_MAPPING_STORE_KEY: "bd_invoice_mappings",
      authenticateRequest: async () => ({ id: 1, venueId: 1, role: "owner" }), hasPermission: () => true,
      accountingCurrencyFromRestaurantJson: () => "RUB", readStoreSnapshots: async () => [],
      withStoreCasRetries: (request: Request, post: (request: Request) => Promise<Response>) => post(request),
      migratePurchaseLedger: forbidden, consolidateInventoryDuplicates: forbidden, runStoreCasBatch: forbidden,
      getD1: () => ({ prepare: (sql: string) => {
        assert.match(sql, /^\s*SELECT/);
        return { bind: () => ({ all: async () => ({ results: stores }) }) };
      }, batch: forbidden }),
    };
    const source = await readFile(new URL(`../app/api/purchases/${action}/route.ts`, import.meta.url), "utf8");
    const body = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, ""))
      .replace("export async function POST", "async function POST");
    const post = new Function("dependencies", "const {" + Object.keys(dependencies).join(",")
      + "}=dependencies;\n" + body + "\nreturn POST;")(dependencies) as (request: Request) => Promise<Response>;
    const response = await post(new Request(`https://example.test/api/purchases/${action}`, {
      method: "POST", body: JSON.stringify({ document, documentId: document.id }),
    }));
    assert.equal(response.status, 422);
    const result = await response.json() as Record<string, unknown>;
    assert.equal(result.code, "PURCHASE_CONVERSION_NEEDS_REVIEW");
    assert.equal(mutations, 0);
    assert.deepEqual(stores, before);
  });
}
