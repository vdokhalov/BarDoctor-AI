import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPurchaseToInventory,
} from "../lib/bardoctor/inventory";
import {
  auditCanonicalNomenclature,
  canonicalSupplierMappings,
  manualCanonicalDuplicateSuggestions,
  reconcileCanonicalNomenclaturePreview,
  upsertSupplierProductMapping,
} from "../lib/bardoctor/nomenclature-identity";
import {
  collectIngredientMatchCandidates,
  rankIngredientCandidates,
} from "../lib/bardoctor/tech-card-ingredient-matching";

type JsonRecord = Record<string, unknown>;

function canonical(key = "cheese:suluguni", venueId = 501): JsonRecord {
  return {
    id: key,
    key,
    productKey: key,
    venueId,
    name: "Сыр Сулугуни",
    kind: "stock",
    unit: "g",
    packageSize: "1 кг",
    packageOptions: ["1 кг"],
    active: true,
    current: 0,
    inventoryValue: 0,
    averageUnitCost: 0,
    category: "food",
    sectionId: "kitchen",
    taxonomyCategoryId: "food",
    subcategoryId: "dairy",
  };
}

function assortment(): JsonRecord {
  const item = canonical();
  return {
    nomenclature: [{ ...item }],
    stockBalances: [{ ...item }],
    supplierProductMappings: [],
    recipes: [],
    inventorySnapshots: [{ id: "snapshot-1", lines: [{ productKey: item.productKey, name: item.name, expected: 10_000 }] }],
  };
}

function purchase(input: {
  id: string;
  supplierId: string;
  supplierName: string;
  lineId: string;
  name: string;
  sku?: string;
  packageSize?: string;
  quantity?: number;
  venueId?: number;
}): JsonRecord {
  return {
    id: input.id,
    venueId: input.venueId ?? 501,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    status: "confirmed",
    sourceType: "scan",
    date: "2026-08-24",
    currency: "RUB",
    items: [{
      id: input.lineId,
      name: input.name,
      supplierSku: input.sku,
      quantity: input.quantity ?? 2,
      unit: "кг",
      packageSize: input.packageSize ?? "1 кг",
      unitPrice: 500,
      lineTotal: 1_000,
      category: "food",
    }],
  };
}

test("one canonical product accepts two suppliers without creating duplicate nomenclature", () => {
  const first = applyPurchaseToInventory({
    assortment: assortment(),
    document: purchase({ id: "p1", supplierId: "market", supplierName: "Рынок", lineId: "l1", name: "Сыр Сулугуни" }),
    accountingCurrency: "RUB",
    now: "2026-08-24T10:00:00.000Z",
  });
  const second = applyPurchaseToInventory({
    assortment: first.assortment,
    document: purchase({ id: "p2", supplierId: "b", supplierName: "Supplier B", lineId: "l2", name: "Сулугуни сыр" }),
    accountingCurrency: "RUB",
    now: "2026-08-24T11:00:00.000Z",
  });
  assert.equal((second.assortment.nomenclature as unknown[]).length, 1);
  assert.equal(canonicalSupplierMappings(second.assortment).length, 2);
  assert.equal((second.assortment.nomenclature as JsonRecord[])[0].supplierCount, 2);
});

test("same supplier item repeated across invoices reuses one stable mapping", () => {
  const first = applyPurchaseToInventory({
    assortment: assortment(),
    document: purchase({ id: "p1", supplierId: "market", supplierName: "Рынок", lineId: "l1", name: "Сулугуни 45%", sku: "SKU-45" }),
    accountingCurrency: "RUB",
  });
  const second = applyPurchaseToInventory({
    assortment: first.assortment,
    document: purchase({ id: "p2", supplierId: "market", supplierName: "Рынок", lineId: "l2", name: "Сулугуни 45%", sku: "SKU-45" }),
    accountingCurrency: "RUB",
  });
  const mappings = canonicalSupplierMappings(second.assortment);
  assert.equal(mappings.length, 1);
  assert.deepEqual(mappings[0].purchaseDocumentIds.sort(), ["p1", "p2"]);
});

test("supplier mapping upsert removes every stale duplicate for the source identity", () => {
  const template = {
    id: "old", sourceItemKey: "501:supplier:sku-1|g", venueId: 501,
    supplierId: "supplier", supplierName: "Supplier", sourceName: "Old",
    normalizedSourceName: "old", purchaseUnit: "g", packageSize: "1 kg",
    supplierSku: "sku-1", barcode: null,
    canonicalProductKey: "old", status: "confirmed" as const, confidence: 1,
    firstSeenAt: "2026-01-01", lastSeenAt: "2026-01-01", purchaseDocumentIds: [], purchaseLineIds: [],
    lastPrice: null, currency: "RUB",
  };
  const latest = { ...template, id: "latest", canonicalProductKey: "canonical", sourceName: "Latest" };
  const result = upsertSupplierProductMapping([
    template,
    { ...template, id: "stale-duplicate", canonicalProductKey: "wrong" },
  ], latest);
  assert.equal(result.filter((mapping) => mapping.sourceItemKey === template.sourceItemKey).length, 1);
  assert.equal(result[0].canonicalProductKey, "canonical");
});

test("ambiguous purchase identity is blocked before it creates canonical stock", () => {
  const root = assortment();
  root.nomenclature = [
    { ...canonical("cheese:a"), name: "Сыр Нистру классический" },
    { ...canonical("cheese:b"), name: "Нистру сыр классический" },
  ];
  root.stockBalances = root.nomenclature;
  const before = JSON.stringify(root);
  const result = applyPurchaseToInventory({
    assortment: root,
    document: purchase({ id: "ambiguous", supplierId: "s", supplierName: "S", lineId: "l", name: "Сыр Нистру классический" }),
    accountingCurrency: "RUB",
  });
  assert.equal(result.movements.length, 0);
  assert.equal(result.summary.sourceMappingsNeedingReview, 1);
  assert.equal(result.summary.unresolvedLines.length, 1);
  assert.equal((result.assortment.nomenclature as unknown[]).length, 2);
  assert.equal(JSON.stringify(root), before);
});

test("supplier suffix is source evidence and never becomes canonical display name", () => {
  const result = applyPurchaseToInventory({
    assortment: assortment(),
    document: purchase({ id: "p1", supplierId: "market", supplierName: "Рынок", lineId: "l1", name: "Сыр Сулугуни · Рынок" }),
    accountingCurrency: "RUB",
  });
  assert.equal((result.assortment.nomenclature as JsonRecord[])[0].name, "Сыр Сулугуни");
  assert.equal(canonicalSupplierMappings(result.assortment)[0].sourceName, "Сыр Сулугуни · Рынок");
});

test("tech-card candidate list contains canonical items only and uses supplier alias as evidence", () => {
  const posted = applyPurchaseToInventory({
    assortment: assortment(),
    document: purchase({ id: "p1", supplierId: "market", supplierName: "Рынок", lineId: "l1", name: "Сулугуни сыр" }),
    accountingCurrency: "RUB",
  });
  const collected = collectIngredientMatchCandidates({
    assortment: posted.assortment,
    purchaseDocuments: [purchase({ id: "p1", supplierId: "market", supplierName: "Рынок", lineId: "l1", name: "Сулугуни сыр" })],
    venueId: 501,
  });
  assert.equal(collected.candidates.length, 1);
  assert.equal(collected.candidates[0].productKey, "cheese:suluguni");
  assert.deepEqual(collected.candidates[0].supplierAliases, ["Сулугуни сыр"]);
  const decision = rankIngredientCandidates({
    ingredient: { name: "СУЛУГУНИ", quantity: 100, unit: "г" },
    candidates: collected.candidates,
    assortment: posted.assortment,
    venueId: 501,
  });
  assert.equal(decision.candidate?.productKey, "cheese:suluguni");
});

test("audit identifies true canonical duplicate and source masquerading cases", () => {
  const root = assortment();
  root.nomenclature = [
    canonical("cheese:suluguni"),
    { ...canonical("legacy:suluguni"), name: "Сулугуни сыр" },
    { ...canonical("source:suluguni"), name: "Сыр Сулугуни Рынок" },
  ];
  root.supplierProductMappings = [{
    id: "map-1", sourceItemKey: "501:market:name:сыр сулугуни рынок|g", venueId: 501,
    supplierId: "market", supplierName: "Рынок", sourceName: "Сыр Сулугуни Рынок",
    normalizedSourceName: "сыр сулугуни рынок", purchaseUnit: "g", packageSize: "1 кг",
    canonicalProductKey: "cheese:suluguni", status: "confirmed", confidence: 1,
    firstSeenAt: "2026-08-24", lastSeenAt: "2026-08-24", purchaseDocumentIds: [], purchaseLineIds: [],
  }];
  const report = auditCanonicalNomenclature({ assortment: root, venueId: 501 });
  assert.ok(Number(report.safeMergeCandidates) >= 1);
  assert.ok(Number(report.sourceRowsMasqueradingAsProducts) >= 1);
});

test("safe reconciliation preserves total quantity and valuation", () => {
  const root = assortment();
  root.nomenclature = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  root.stockBalances = [
    { ...canonical("primary"), current: 10_000, inventoryValue: 5_000, averageUnitCost: 0.5, currency: "RUB" },
    { ...canonical("secondary"), name: "Сулугуни сыр", current: 4_000, inventoryValue: 2_400, averageUnitCost: 0.6, currency: "RUB" },
  ];
  const result = reconcileCanonicalNomenclaturePreview({ assortment: root, venueId: 501 });
  assert.equal(result.report.changed, true);
  assert.equal((result.assortment.stockBalances as JsonRecord[]).length, 1);
  assert.equal((result.assortment.stockBalances as JsonRecord[])[0].current, 14_000);
  assert.equal((result.assortment.stockBalances as JsonRecord[])[0].inventoryValue, 7_400);
  assert.equal((result.report.invariants as JsonRecord[])[0].quantityPreserved, true);
  assert.equal((result.report.invariants as JsonRecord[])[0].valuationPreserved, true);
});

test("reconciliation keeps purchase history byte-equivalent and inventory snapshots readable", () => {
  const root = assortment();
  root.nomenclature = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  root.stockBalances = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  const documents = [purchase({ id: "history", supplierId: "market", supplierName: "Рынок", lineId: "old-line", name: "Сулугуни сыр" })];
  const snapshotBefore = JSON.stringify(root.inventorySnapshots);
  const documentsBefore = JSON.stringify(documents);
  const result = reconcileCanonicalNomenclaturePreview({ assortment: root, purchaseDocuments: documents, venueId: 501 });
  assert.equal(JSON.stringify(result.purchaseDocuments), documentsBefore);
  assert.equal(JSON.stringify(result.assortment.inventorySnapshots), snapshotBefore);
  assert.equal(result.report.historicalPurchaseDocumentsRewritten, 0);
  assert.equal(result.report.historicalInventorySnapshotsRewritten, 0);
});

test("reconciliation repoints tech cards and movements while retaining original keys", () => {
  const root = assortment();
  root.nomenclature = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  root.stockBalances = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  root.recipes = [{ id: "recipe", ingredients: [{ id: "ingredient", name: "Сулугуни", purchaseProductKey: "secondary" }] }];
  const result = reconcileCanonicalNomenclaturePreview({
    assortment: root,
    stockMovements: [{ id: "move", productKey: "secondary", amount: 1 }],
    venueId: 501,
  });
  const ingredient = ((result.assortment.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0];
  assert.equal(ingredient.purchaseProductKey, "primary");
  assert.equal(result.stockMovements[0].productKey, "primary");
  assert.equal(result.stockMovements[0].originalProductKey, "secondary");
});

test("similar products with meaningful percentage variants are not merged", () => {
  const root = assortment();
  root.nomenclature = [
    { ...canonical("cream:10"), name: "Сливки 10%" },
    { ...canonical("cream:33"), name: "Сливки 33%" },
  ];
  root.stockBalances = root.nomenclature;
  const report = auditCanonicalNomenclature({ assortment: root, venueId: 501 });
  assert.equal(report.safeMergeCandidates, 0);
  const result = reconcileCanonicalNomenclaturePreview({ assortment: root, venueId: 501 });
  assert.equal(result.report.changed, false);
});

test("named package variants remain distinct when the canonical model treats them as stock variants", () => {
  const root = assortment();
  root.nomenclature = [
    { ...canonical("cola:05"), name: "Coca-Cola 0,5 л", unit: "pcs" },
    { ...canonical("cola:10"), name: "Coca-Cola 1,0 л", unit: "pcs" },
  ];
  const report = auditCanonicalNomenclature({ assortment: root, venueId: 501 });
  assert.equal(report.safeMergeCandidates, 0);
});

test("package options stay inside one canonical item", () => {
  const root = assortment();
  (root.nomenclature as JsonRecord[])[0].packageOptions = ["1 кг", "0,5 кг", "0,4 кг"];
  (root.nomenclature as JsonRecord[])[0].multiplePackageSizes = true;
  const report = auditCanonicalNomenclature({ assortment: root, venueId: 501 });
  assert.equal(report.totalCanonicalItems, 1);
  assert.equal(report.packagingDuplicationCases, 0);
});

test("manual create returns similar canonical suggestions without using UNIQUE(name)", () => {
  const suggestions = manualCanonicalDuplicateSuggestions({
    assortment: assortment(),
    name: "Сулугуни сыр",
    unit: "g",
    venueId: 501,
  });
  assert.equal(suggestions[0].productKey, "cheese:suluguni");
  const distinct = manualCanonicalDuplicateSuggestions({
    assortment: { nomenclature: [{ ...canonical("cream:10"), name: "Сливки 10%" }] },
    name: "Сливки 33%",
    unit: "g",
    venueId: 501,
  });
  assert.equal(distinct.length, 0);
});

test("cross-venue items and mappings are never reused or merged", () => {
  const root = assortment();
  root.nomenclature = [canonical("venue-501", 501), { ...canonical("venue-502", 502), name: "Сулугуни сыр" }];
  root.stockBalances = root.nomenclature;
  const report = auditCanonicalNomenclature({ assortment: root, venueId: 501 });
  assert.equal(report.totalCanonicalItems, 1);
  assert.equal(report.safeMergeCandidates, 0);
  const collected = collectIngredientMatchCandidates({ assortment: root, venueId: 501 });
  assert.deepEqual(collected.candidates.map((candidate) => candidate.productKey), ["venue-501"]);
  assert.equal(collected.crossVenueRejected, 2);
  assert.deepEqual(new Set(collected.crossVenueProductKeys), new Set(["venue-502"]));
});

test("preview reconciliation is idempotent", () => {
  const root = assortment();
  root.nomenclature = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  root.stockBalances = [canonical("primary"), { ...canonical("secondary"), name: "Сулугуни сыр" }];
  const first = reconcileCanonicalNomenclaturePreview({ assortment: root, venueId: 501, now: "2026-08-24T12:00:00.000Z" });
  const second = reconcileCanonicalNomenclaturePreview({ assortment: first.assortment, stockMovements: first.stockMovements, venueId: 501, now: "2026-08-24T13:00:00.000Z" });
  assert.equal(second.report.changed, false);
  assert.equal(second.report.mergedCanonicalItems, 0);
  assert.equal((second.assortment.nomenclature as unknown[]).length, 1);
});
