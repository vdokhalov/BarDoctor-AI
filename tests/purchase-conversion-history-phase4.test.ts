import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import * as inventory from "../lib/bardoctor/inventory";
import { repairInventoryPurchaseAmounts, reviewLegacyPurchaseConversions } from "../lib/bardoctor/inventory";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";

function fixture() {
  return {
    assortment: { stockBalances: [{
      key: "jameson", productKey: "jameson", name: "Jameson", venueId: 1,
      unit: "ml", current: 4200, packageSize: "0.7 l", inventoryValue: 1200, currency: "RUB",
    }] },
    purchaseDocuments: [{
      id: "confirmed-receipt", status: "confirmed", venueId: 1, date: "2026-09-01",
      items: [{ id: "line", name: "Jameson", purchaseProductKey: "jameson",
        quantity: 6, unit: "pcs", unitPrice: 200, lineTotal: 1200, category: "alcohol" }],
    }],
    stockMovements: [{
      id: "receipt", type: "receipt", status: "active", venueId: 1,
      sourceDocumentId: "confirmed-receipt", sourceLineId: "line",
      productKey: "jameson", productName: "Jameson", amount: 4200, unit: "ml",
      costAmount: 1200, currency: "RUB", date: "2026-09-01",
    }],
    now: "2026-09-08T00:00:00.000Z",
  };
}

test("current packaging cannot reinterpret a persisted confirmed receipt or its cost", () => {
  for (const packageSize of ["0.7 l", "1 l", "0.1 l", "unknown", "12 pcs"]) {
    const input = fixture();
    input.assortment.stockBalances[0].packageSize = packageSize;
    const persisted = JSON.parse(JSON.stringify(input)) as typeof input;
    const before = structuredClone(persisted);
    const result = repairInventoryPurchaseAmounts(persisted);
    assert.equal(result.summary.reviewState, "NEEDS_REVIEW");
    assert.equal(result.summary.changed, false);
    assert.deepEqual(result.stockMovements, before.stockMovements);
    assert.deepEqual(result.assortment, before.assortment);
    assert.deepEqual(persisted, before);
    const cost = resolveCostBasis({
      venueId: 1, nomenclatureItem: { productKey: "jameson", unit: "ml" },
      asOf: "2026-09-08", receipts: result.stockMovements, accountingCurrency: "RUB",
    });
    assert.equal(cost.value, 0.285714);
    const repeated = repairInventoryPurchaseAmounts({ ...persisted,
      assortment: result.assortment, stockMovements: result.stockMovements });
    assert.deepEqual(repeated, result);
  }
});

test("invoice-local package content remains independent of template changes", () => {
  const input = fixture();
  const item = { ...input.purchaseDocuments[0].items[0], packageSize: "0.7 l" };
  for (const packageSize of ["1 l", "0.1 l", "24 pcs"]) {
    input.assortment.stockBalances[0].packageSize = packageSize;
    const withSnapshot = { ...input, purchaseDocuments: [{ ...input.purchaseDocuments[0], items: [item] }] };
    assert.deepEqual(reviewLegacyPurchaseConversions(withSnapshot), []);
    const result = repairInventoryPurchaseAmounts(withSnapshot);
    assert.deepEqual(result.stockMovements, input.stockMovements);
    assert.equal((result.assortment.stockBalances as { current: number }[])[0].current, 4200);
  }
});

test("unproven conversion blocks balance-only repair and missing receipt restoration atomically", () => {
  const input = fixture();
  input.stockMovements = [];
  input.assortment.stockBalances[0].current = 42000;
  const before = structuredClone(input);
  const result = repairInventoryPurchaseAmounts(input);
  assert.equal(result.summary.reviewState, "NEEDS_REVIEW");
  assert.equal(result.summary.restoredMovements, 0);
  assert.deepEqual(result.stockMovements, []);
  assert.deepEqual(result.assortment, before.assortment);
});

test("same IDs in another venue do not provide conversion evidence", () => {
  const input = fixture();
  input.stockMovements[0].venueId = 2;
  input.assortment.stockBalances[0].venueId = 2;
  // Venue 1's literal six pieces must not acquire venue 2's ml basis.
  assert.deepEqual(reviewLegacyPurchaseConversions(input), []);
});

test("unknown package content and price-ratio guesses require review", () => {
  for (const patch of [
    { unit: "boxes", packageSize: "" },
    { unit: "pcs", packageSize: "коробка" },
    { unit: "pcs", packageSize: "0.7 l", quantity: 3 },
    { unit: "pcs", packageSize: "10 l", quantity: 10, name: "Whisky" },
  ]) {
    const input = fixture();
    const changed = { ...input, purchaseDocuments: [{ ...input.purchaseDocuments[0],
      items: [{ ...input.purchaseDocuments[0].items[0], ...patch }] }] };
    const result = repairInventoryPurchaseAmounts(changed);
    assert.equal(result.summary.reviewState, "NEEDS_REVIEW");
    assert.deepEqual(result.stockMovements, input.stockMovements);
    assert.deepEqual(result.assortment, input.assortment);
  }
});

test("simple pcs has no packaging prerequisite and never becomes 12000", () => {
  const input = fixture();
  input.assortment.stockBalances[0].unit = "pcs";
  input.assortment.stockBalances[0].current = 12;
  input.stockMovements[0].unit = "pcs";
  input.stockMovements[0].amount = 12;
  Object.assign(input.purchaseDocuments[0].items[0], { quantity: 12, unitPrice: 100 });
  const result = repairInventoryPurchaseAmounts(input);
  assert.equal(result.summary.reviewState, undefined);
  assert.equal(result.stockMovements[0].amount, 12);
  assert.equal((result.assortment.stockBalances as { current: number }[])[0].current, 12);
});

test("repair HTTP command returns controlled review before any database write or duplicate consolidation", async () => {
  const input = fixture();
  input.assortment.stockBalances[0].packageSize = "1 l";
  const stores = [
    { store_key: inventory.ASSORTMENT_STORE_KEY, data_json: JSON.stringify(input.assortment) },
    { store_key: inventory.STOCK_MOVEMENT_STORE_KEY, data_json: JSON.stringify(input.stockMovements) },
    { store_key: "bd_purchase_documents", data_json: JSON.stringify(input.purchaseDocuments) },
  ];
  const before = structuredClone(stores);
  let writes = 0;
  let consolidations = 0;
  const dependencies = {
    ...inventory,
    PURCHASE_STORE_KEY: "bd_purchase_documents",
    authenticateRequest: async () => ({ id: 1, venueId: 1, role: "owner", appEmail: "test@example.test" }),
    hasPermission: () => true,
    consolidateInventoryDuplicates: () => { consolidations++; throw new Error("review must precede consolidation"); },
    getD1: () => ({
      prepare: (sql: string) => {
        assert.match(sql, /^\s*SELECT/);
        return { bind: () => ({ all: async () => ({ results: stores }) }) };
      },
      batch: () => { writes++; throw new Error("review must not write"); },
    }),
  };
  const route = await readFile(new URL("../app/api/inventory/products/route.ts", import.meta.url), "utf8");
  const body = stripTypeScriptTypes(route.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, ""))
    .replace("export async function POST", "async function POST");
  const post = new Function("dependencies",
    "const {" + Object.keys(dependencies).join(",") + "}=dependencies;\n" + body + "\nreturn POST;"
  )(dependencies) as (request: Request) => Promise<Response>;
  const response = await post(new Request("https://example.test/api/inventory/products", {
    method: "POST", body: JSON.stringify({ action: "repair" }),
  }));
  assert.equal(response.status, 422);
  const result = await response.json() as Record<string, unknown>;
  assert.equal(result.reviewState, "NEEDS_REVIEW");
  assert.equal(result.code, "LEGACY_PURCHASE_CONVERSION_UNPROVEN");
  assert.equal((result.issues as unknown[]).length, 1);
  assert.equal(writes, 0);
  assert.equal(consolidations, 0);
  assert.deepEqual(stores, before);
});
