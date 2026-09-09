import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { previewOpeningStock, confirmOpeningStock, type OpeningContext, type OpeningInput } from "../lib/bardoctor/opening-stock";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";
import { isAllowedStoreKey } from "../lib/bardoctor/constants";

const context = (): OpeningContext => ({ venueId: 1, assortment: {}, documents: [], movements: [], currency: "MDL", now: "2026-09-09T10:00:00.000Z",
  taxonomy: { version: "v336", sections: [{ id: "bar", name: "Бар", active: true, order: 1 }], categories: [{ id: "drinks", name: "Напитки", parentId: "bar", active: true, order: 1 }], subcategories: [], locations: [] } });
const input = (extra: Partial<OpeningInput> = {}): OpeningInput => ({ rowId: "r1", name: "Товар", stockUnit: "pcs", sectionId: "bar", taxonomyCategoryId: "drinks", ...extra });
function persist<T>(value: T): T {
  const db = new DatabaseSync(":memory:");
  try { db.exec("CREATE TABLE state (data TEXT NOT NULL)"); db.prepare("INSERT INTO state VALUES (?)").run(JSON.stringify(value));
    return JSON.parse((db.prepare("SELECT data FROM state").get() as { data: string }).data); } finally { db.close(); }
}
for (const [unit, quantity, sourceUnit, content, expected] of [
  ["pcs", 12, "pcs", undefined, 12], ["l", 50, "ml", undefined, 0.05], ["kg", 8, "g", undefined, 0.008],
  ["pcs", 2, "box", { quantity: 12, unit: "pcs" }, 24], ["l", 6, "bottle", { quantity: 0.7, unit: "l" }, 4.2],
] as const) test(`opening ${quantity} ${sourceUnit}: preview -> confirm -> SQLite reload; UNKNOWN cost`, async () => {
  const ctx = context(), before = structuredClone(ctx);
  const row = input({ stockUnit: unit, quantity, unit: sourceUnit, packageContent: content });
  assert.deepEqual(previewOpeningStock([row], ctx)[0].errors, []);
  assert.deepEqual(ctx, before, "preview is read-only");
  const result = persist(await confirmOpeningStock({ id: "opening-001", inputs: [row], selectedRowIds: [row.rowId] }, ctx));
  assert.ok("document" in result); assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].type, "opening_balance"); assert.equal(result.movements[0].amount, expected);
  assert.equal(result.movements[0].unit, unit); assert.deepEqual(ctx, before);
  const balance = (result.assortment.stockBalances as Record<string, unknown>[])[0];
  assert.equal(balance.current, expected); assert.equal(balance.lastPurchasePrice, undefined);
  const basis = resolveCostBasis({ venueId: 1, nomenclatureItem: balance, receipts: result.movements, asOf: ctx.now, accountingCurrency: "MDL" });
  assert.equal(basis.status, "UNKNOWN"); assert.equal(basis.value, null);
});
test("known opening cost is a separate immutable snapshot; never a receipt basis", async () => {
  const ctx = context(), row = input({ quantity: 2, unit: "box", packageContent: { quantity: 12, unit: "pcs" }, openingUnitCost: 15, costSource: "Документ об остатках" });
  const command = { id: "opening-002", inputs: [row], selectedRowIds: [row.rowId] };
  const result = persist(await confirmOpeningStock(command, ctx)); assert.ok("document" in result);
  assert.equal(result.document.items[0].unitCost, 15); assert.equal(result.document.items[0].quantity, 24);
  const valuation = result.movements[0].openingValuation as { totalCost: number };
  assert.equal(valuation.totalCost, 360);
  const after = { ...ctx, assortment: result.assortment, movements: result.movements, documents: result.documents };
  const retry = await confirmOpeningStock(command, after); assert.ok("document" in retry); assert.equal(retry.duplicate, true);
  assert.deepEqual(retry.movements, result.movements); assert.deepEqual(retry.documents, result.documents);
  row.packageContent!.quantity = 24;
  await assert.rejects(confirmOpeningStock(command, after), /OPENING_ID_CONFLICT/);
  assert.equal(result.document.items[0].conversion?.canonicalQuantity, 24);
  assert.equal(resolveCostBasis({ venueId: 1, nomenclatureItem: { productKey: result.document.items[0].productKey, unit: "pcs" }, receipts: result.movements, asOf: ctx.now }).value, null);
});
test("nomenclature without opening quantity needs neither purchase nor fake cost", async () => {
  const result = await confirmOpeningStock({ id: "catalog-001", inputs: [input()], selectedRowIds: ["r1"] }, context());
  assert.ok("document" in result); assert.equal(result.movements.length, 0); assert.equal(result.document.items[0].quantity, null);
});
test("optional package metadata persists without stock or an artificial purchase", async () => {
  const result = persist(await confirmOpeningStock({ id: "catalog-pack", inputs: [input({ stockUnit: "l", packageContent: { quantity: 0.7, unit: "l" } })], selectedRowIds: ["r1"] }, context()));
  assert.ok("document" in result);
  const product = (result.assortment.nomenclature as Record<string, unknown>[])[0];
  assert.equal(product.packageSize, "0.7 l"); assert.equal(product.packageAmount, 0.7);
  assert.equal(result.movements.length, 0); assert.equal(product.lastPurchasePrice, undefined);
});
test("CSV taxonomy names resolve only uniquely within their parent; snapshots retain IDs", () => {
  const ctx = context();
  const row = input({ sectionId: "Бар", taxonomyCategoryId: "Напитки" });
  const preview = previewOpeningStock([row], ctx)[0]; assert.deepEqual(preview.errors, []);
  assert.equal(preview.sectionId, "bar"); assert.equal(preview.taxonomyCategoryId, "drinks");
  ctx.taxonomy.categories.push({ id: "duplicate", name: "Напитки", parentId: "bar", active: true, order: 2 });
  assert.ok(previewOpeningStock([row], ctx)[0].errors.length);
});
test("invalid dimensions and unknown boxes reject selected set atomically; explicit skip works", async () => {
  const ctx = context(), before = structuredClone(ctx);
  const inputs = [input({ quantity: 12, unit: "pcs" }), input({ rowId: "r2", name: "Другой", stockUnit: "kg", quantity: 2, unit: "l" })];
  const failed = await confirmOpeningStock({ id: "opening-003", inputs, selectedRowIds: ["r1", "r2"] }, ctx);
  assert.ok("errors" in failed); assert.deepEqual(ctx, before);
  const ok = await confirmOpeningStock({ id: "opening-003", inputs, selectedRowIds: ["r1"] }, ctx);
  assert.ok("document" in ok); assert.equal(ok.movements.length, 1); assert.deepEqual(ok.document.skippedRowIds, ["r2"]);
  assert.ok(previewOpeningStock([input({ quantity: 2, unit: "boxes" })], ctx)[0].errors.length);
});
test("venue scope, duplicate input, taxonomy and existing history fail closed", async () => {
  const ctx = context();
  const foreign = { id: "foreign", productKey: "foreign", venueId: 2, name: "Чужой", kind: "stock", unit: "pcs", current: 0 };
  ctx.assortment = { nomenclature: [foreign], stockBalances: [foreign] };
  assert.ok(previewOpeningStock([input({ productKey: "foreign", quantity: 2, unit: "pcs" })], ctx)[0].errors.length);
  assert.ok(previewOpeningStock([input(), input({ rowId: "r2" })], ctx).every(v => v.errors.length));
  assert.ok(previewOpeningStock([input({ taxonomyCategoryId: "foreign-category" })], ctx)[0].errors.length);
  const result = await confirmOpeningStock({ id: "opening-004", inputs: [input({ quantity: 1, unit: "pcs" })], selectedRowIds: ["r1"] }, ctx);
  assert.ok("document" in result); assert.deepEqual((result.assortment.nomenclature as unknown[])[0], foreign);
  const after = { ...ctx, assortment: result.assortment, documents: result.documents, movements: result.movements };
  const next = previewOpeningStock([input({ productKey: result.document.items[0].productKey, quantity: 2, unit: "pcs" })], after);
  assert.ok(next[0].errors.some(v => v.includes("история")));
});
test("opening store cannot be mutated through generic PUT; route uses atomic CAS and closed-month guard", () => {
  assert.equal(isAllowedStoreKey("bd_opening_stock_v1"), false);
  const source = readFileSync(new URL("../app/api/inventory/opening/route.ts", import.meta.url), "utf8");
  assert.match(source, /runStoreCasBatch\(db, account.id, snapshots, statements/);
  assert.match(source, /withStoreCasRetries/); assert.match(source, /MONTH_LOCKED/);
  assert.match(source, /body.venueId !== account.venueId/);
});
