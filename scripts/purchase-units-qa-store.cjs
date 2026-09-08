/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated browser acceptance backend, never a production endpoint.
require("tsx/cjs");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { normalizePurchaseDocument } = require("../lib/bardoctor/purchases.ts");
const { preparePurchaseConversions } = require("../lib/bardoctor/purchase-conversion.ts");
const { applyPurchaseToInventory } = require("../lib/bardoctor/inventory.ts");

module.exports = function purchaseQaStore() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE state (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
  const products = [
    { id: "qa-pcs", key: "qa-pcs", productKey: "qa-pcs", name: "Phase 4 bottles", unit: "pcs", category: "products", venueId: 401, unitModelVersion: 4 },
    { id: "qa-liquid", key: "qa-liquid", productKey: "qa-liquid", name: "Phase 4 whisky", unit: "l", category: "alcohol", venueId: 401, unitModelVersion: 4 },
  ];
  const save = (value) => db.prepare("INSERT OR REPLACE INTO state VALUES (?, ?)").run("state", JSON.stringify(value));
  const reload = () => JSON.parse(db.prepare("SELECT data FROM state WHERE id = ?").get("state").data);
  save({ documents: [], assortment: { nomenclature: products, stockBalances: [] }, stockMovements: [] });
  return {
    products, reload, close: () => db.close(),
    confirm(raw) {
      assert.equal(raw.venueId, 401);
      const before = reload();
      const prepared = preparePurchaseConversions(normalizePurchaseDocument({ ...raw, status: "confirmed" }, raw.id), raw, before.assortment);
      assert.equal(prepared.ok, true, JSON.stringify(prepared));
      // Persist and reload the confirmed conversion BEFORE stock posting.
      save({ ...before, documents: [...before.documents, prepared.document] });
      const persisted = reload();
      const document = persisted.documents.at(-1);
      const posting = applyPurchaseToInventory({ assortment: persisted.assortment, stockMovements: persisted.stockMovements,
        document, accountingCurrency: "RUB", now: "2026-09-08T12:00:00.000Z" });
      assert.deepEqual(posting.summary.unresolvedLines, []);
      assert.equal(posting.movements.length, 1);
      save({ ...persisted, assortment: posting.assortment, stockMovements: [...persisted.stockMovements, ...posting.movements] });
      return { ok: true, ...reload(), document, expenses: [], inventorySummary: { postedLines: 1 } };
    },
  };
};
