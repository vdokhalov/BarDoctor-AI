import assert from "node:assert/strict";
import test from "node:test";

import { auditDataIntegrity } from "../lib/bardoctor/data-integrity-audit";

test("data-integrity audit is read-only and covers chain, cost, snapshot, mapping and venue defects", () => {
  const assortment = {
    nomenclature: [
      { id: "a", productKey: "a", name: "Молоко", unit: "g", venueId: 1, packageOptions: ["1 кг", "1000 г"] },
      { id: "b", productKey: "b", name: "Молоко", unit: "g", venueId: 1 },
      { id: "foreign", productKey: "foreign", name: "Foreign", unit: "ml", venueId: 2 },
    ],
    stockBalances: [
      { productKey: "a", name: "Молоко", unit: "g", current: 1000, averageUnitCost: 0, inventoryValue: 0, venueId: 1 },
      { productKey: "b", name: "Молоко", unit: "g", current: 0, venueId: 1 },
    ],
    supplierProductMappings: [
      { id: "m", sourceItemKey: "source", venueId: 1, supplierId: "s", supplierName: "S", sourceName: "Milk", normalizedSourceName: "milk", purchaseUnit: "g", packageSize: "1 kg", canonicalProductKey: "missing", status: "review", confidence: 0.7, firstSeenAt: "x", lastSeenAt: "x", purchaseDocumentIds: [], purchaseLineIds: [] },
    ],
    menuItems: [{ id: "menu", name: "Drink", venueId: 1 }],
    recipes: [{ id: "card", menuItemId: "menu", venueId: 1, source: "ai", status: "draft", ingredients: [{ id: "i", name: "Foreign", unit: "ml", purchaseProductKey: "foreign" }] }],
    canonicalProductAliases: [{ from: "old", to: "missing" }],
  };
  const purchases = [
    { id: "purchase", venueId: 1, status: "confirmed", documentType: "invoice", items: [] },
    { id: "cancelled", venueId: 1, status: "cancelled", documentType: "invoice", items: [] },
  ];
  const movements = [
    { id: "m1", venueId: 1, type: "receipt", status: "active", sourceDocumentId: "cancelled", sourceLineId: "l", productKey: "a" },
    { id: "m2", venueId: 1, type: "receipt", status: "active", sourceDocumentId: "cancelled", sourceLineId: "l", productKey: "a" },
    { id: "m3", venueId: 1, type: "receipt", status: "active", sourceDocumentId: "missing-document", sourceLineId: "l", productKey: "missing" },
  ];
  const snapshots = [{ id: "snap", venueId: 1, items: [{ productKey: "missing" }] }];
  const before = JSON.stringify({ assortment, purchases, movements, snapshots });
  const report = auditDataIntegrity({ assortment, purchaseDocuments: purchases, stockMovements: movements, inventorySnapshots: snapshots, venueId: 1 });
  assert.equal(report.mode, "read_only_dry_run");
  assert.equal(report.reconciliation.writesPerformed, 0);
  assert.ok(report.findings.some((item) => item.code === "CANONICAL_DUPLICATE"));
  assert.ok(report.findings.some((item) => item.code === "STOCK_WITHOUT_COST_BASIS"));
  assert.ok(report.findings.some((item) => item.code === "PURCHASE_MOVEMENT_CHAIN_BROKEN"));
  assert.ok(report.findings.some((item) => item.code === "PURCHASE_REPOST_OR_CANCEL_CONFLICT"));
  assert.ok(report.findings.some((item) => item.code === "INVENTORY_SNAPSHOT_ORPHAN"));
  assert.ok(report.findings.some((item) => item.code === "CROSS_VENUE_RECORD_OR_REFERENCE"));
  assert.equal(JSON.stringify({ assortment, purchases, movements, snapshots }), before);
});

test("data-integrity audit isolates venue counts", () => {
  const report = auditDataIntegrity({
    assortment: {
      nomenclature: [
        { id: "one", productKey: "one", name: "One", unit: "pcs", venueId: 1 },
        { id: "two", productKey: "two", name: "Two", unit: "pcs", venueId: 2 },
      ],
      stockBalances: [], recipes: [], menuItems: [], supplierProductMappings: [],
    },
    venueId: 1,
  });
  assert.equal(report.counts.canonicalItems, 1);
  assert.ok(report.findings.some((item) => item.code === "CROSS_VENUE_RECORD_OR_REFERENCE"));
});

test("data-integrity audit counts HIGH suggestions that remain protected and unlinked", () => {
  const report = auditDataIntegrity({
    assortment: {
      nomenclature: [{ id: "cheese", productKey: "cheese", name: "Голландский сыр", unit: "g", venueId: 1, active: true }],
      stockBalances: [{ productKey: "cheese", name: "Голландский сыр", unit: "g", venueId: 1, current: 0 }],
      menuItems: [{ id: "menu", name: "Блюдо", venueId: 1 }],
      recipes: [{
        id: "manual", menuItemId: "menu", venueId: 1, status: "confirmed", source: "manual",
        ingredients: [{ id: "ingredient", name: "Сыр Голландский", quantity: 10, unit: "г" }],
      }],
      supplierProductMappings: [],
    },
    venueId: 1,
  });
  assert.equal(report.counts.highSemanticStillUnlinked, 1);
  assert.ok(report.findings.some((item) => item.code === "HIGH_MATCH_UNLINKED"));
});

test("data-integrity audit resolves historical snapshot aliases without rewriting history", () => {
  const snapshot = { id: "snap", venueId: 1, items: [{ productKey: "old" }] };
  const before = JSON.stringify(snapshot);
  const report = auditDataIntegrity({
    assortment: {
      nomenclature: [{ productKey: "new", name: "New", venueId: 1 }],
      stockBalances: [{ productKey: "new", name: "New", current: 0, venueId: 1 }],
      inventoryProductAliases: [{ from: "old", to: "new" }],
      recipes: [], supplierProductMappings: [],
    },
    inventorySnapshots: [snapshot], venueId: 1,
  });
  assert.equal(report.findings.some((item) => item.code === "INVENTORY_SNAPSHOT_ORPHAN"), false);
  assert.equal(JSON.stringify(snapshot), before);
});

test("data-integrity audit reports broken structured write-off chains and missing cost", () => {
  const report = auditDataIntegrity({
    assortment: { stockBalances: [{ productKey: "known", name: "Лимон", unit: "g", current: 10, averageUnitCost: 1 }] },
    writeOffDocuments: [{
      id: "wo-1", venueId: 1, status: "posted", items: [
        { id: "line-1", productKey: "known", baseQuantity: 2, baseUnit: "g", totalCost: null, costStatus: "unvalued" },
        { id: "line-2", productKey: "missing", baseQuantity: 1, baseUnit: "crate", totalCost: 10 },
      ],
    }],
    stockMovements: [{ id: "orphan", venueId: 1, type: "writeoff", productKey: "known", sourceDocumentId: "wo-missing", status: "active" }],
    venueId: 1,
  });
  const codes = new Set(report.findings.map((item) => item.code));
  assert.equal(codes.has("WRITE_OFF_ITEM_WITHOUT_NOMENCLATURE"), true);
  assert.equal(codes.has("WRITE_OFF_COST_BASIS_MISSING"), true);
  assert.equal(codes.has("WRITE_OFF_UNIT_OR_CONVERSION_INVALID"), true);
  assert.equal(codes.has("WRITE_OFF_MOVEMENT_CHAIN_BROKEN"), true);
});
