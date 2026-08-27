import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalGroundTruthPurchase,
  confirmedMemoryFromPurchase,
  confirmedMemoryFromReviewedGroundTruth,
  productionMatchingQuality,
  productionMatchingTrace,
  selectProductionHybridDocuments,
  storedPurchaseAsParsed,
} from "../lib/bardoctor/invoice-production-validation";
import { applyDeterministicMappings, nomenclatureCandidates } from "../lib/bardoctor/invoice-recognition-v2";
import type { PurchaseDocument } from "../lib/bardoctor/purchases";

function purchase(id: string, supplierId: string, lines: number, number?: string): PurchaseDocument {
  return {
    id,
    venueId: 1,
    documentType: "invoice",
    supplierId,
    supplierName: supplierId,
    supplierType: "wholesale",
    date: "2026-08-01",
    documentNumber: number,
    currency: "RUB",
    paymentMethod: "unknown",
    expenseCategory: "products",
    total: lines * 10,
    items: Array.from({ length: lines }, (_, index) => ({
      id: `${id}-${index}`,
      name: `Товар ${id} ${index}`,
      rawName: `Товар ${id} ${index}`,
      purchaseProductKey: `stock:${id}-${index}|pcs`,
      quantity: 1,
      unit: "шт.",
      packageSize: "1 шт.",
      unitPrice: 10,
      lineTotal: 10,
      category: "products",
      confidence: 0.95,
    })),
    confidence: 0.95,
    warnings: [],
    sourceFileId: `source-${id}-1234567890`,
    source: "gallery",
    status: "confirmed",
  };
}

test("production selector chooses three real sizes and never borrows invoice 394 from another venue", () => {
  const result = selectProductionHybridDocuments([
    purchase("small", "market", 1),
    purchase("medium", "vprok", 10, "379"),
    purchase("large", "sheriff", 15),
    { ...purchase("foreign-394", "foreign", 15, "394"), venueId: 3162 },
  ], 1);
  assert.deepEqual(result.selected.map((document) => document.id), ["small", "medium", "large"]);
  assert.equal(result.invoice394Included, false);
  assert.equal(result.invoice394Reason, "not_found_in_authoritative_koln_history");
});

test("production quality reports a wrong High proposal as a critical false positive", () => {
  const expected = purchase("invoice", "supplier", 1);
  const candidates = nomenclatureCandidates({ nomenclature: [
    { id: "right", key: "stock:invoice-0|pcs", venueId: 1, name: "Товар invoice 0", unit: "pcs", packageSize: "1 шт." },
    { id: "wrong", key: "stock:wrong|pcs", venueId: 1, name: "Товар invoice 0", unit: "pcs", packageSize: "1 шт." },
  ] }, 1);
  const document = storedPurchaseAsParsed(expected);
  document.items[0] = {
    ...document.items[0],
    nomenclatureId: "wrong",
    purchaseProductKey: "stock:wrong|pcs",
    confidenceLevel: "high",
    requiresReview: false,
  };
  const quality = productionMatchingQuality({ document, expected, candidates });
  assert.equal(quality.incorrect, 1);
  assert.equal(quality.criticalHighFalsePositives, 1);
});

test("production quality resolves migrated nomenclature ids to canonical keys", () => {
  const expected = purchase("invoice", "supplier", 1);
  expected.items[0].nomenclatureId = "right";
  expected.items[0].purchaseProductKey = "legacy:purchase-key";
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "right",
    key: "stock:invoice-0|pcs",
    venueId: 1,
    name: "Товар invoice 0",
    unit: "pcs",
    packageSize: "1 шт.",
  }] }, 1);
  const document = storedPurchaseAsParsed(expected);
  document.items[0] = {
    ...document.items[0],
    nomenclatureId: "right",
    purchaseProductKey: "stock:invoice-0|pcs",
    confidenceLevel: "high",
    requiresReview: false,
  };
  const quality = productionMatchingQuality({ document, expected, candidates });
  assert.equal(quality.correct, 1);
  assert.equal(quality.incorrect, 0);
  assert.equal(quality.criticalHighFalsePositives, 0);
});

test("production parser quality does not treat a legacy measured-total package as the bottle size", () => {
  const expected = purchase("vprok", "vprok", 1, "379");
  expected.items[0] = { ...expected.items[0], name: "Водка Volk", rawName: "Водка Volk", quantity: 10, unit: "л", packageSize: "10 л", unitPrice: 114.3, lineTotal: 1143 };
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "vodka", key: "stock:vodka|ml", venueId: 1, name: "Водка Volk", unit: "ml", packageSize: "1 л",
  }] }, 1);
  expected.items[0].nomenclatureId = "vodka";
  expected.items[0].purchaseProductKey = "stock:vodka|ml";
  const document = storedPurchaseAsParsed(expected);
  document.items[0] = { ...document.items[0], rawName: "Водка Volk л.1", normalizedRawName: "водка volk л.1", packageSize: "1 л", nomenclatureId: "vodka", purchaseProductKey: "stock:vodka|ml" };
  const quality = productionMatchingQuality({ document, expected, candidates });
  assert.equal(quality.commercialFields.packageCorrect, 1);
});

test("production ground truth prefers canonical migrated supplier mappings over legacy purchase keys", () => {
  const expected = purchase("invoice", "supplier", 1);
  expected.items[0].nomenclatureId = "legacy-id";
  expected.items[0].purchaseProductKey = "legacy:purchase-key";
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "right",
    key: "stock:invoice-0|pcs",
    venueId: 1,
    name: "Товар invoice 0",
    unit: "pcs",
    packageSize: "1 шт.",
  }] }, 1);
  const groundTruth = canonicalGroundTruthPurchase({
    document: expected,
    supplierId: "supplier",
    candidates,
    mappings: [{
      id: "mapping",
      venueId: 1,
      supplierId: "supplier",
      rawName: "Товар invoice 0",
      normalizedRawName: "товар invoice 0",
      packageFingerprint: "pcs:1",
      nomenclatureId: "stock:invoice-0|pcs",
      confirmations: 0,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    }],
  });
  assert.equal(groundTruth.items[0].nomenclatureId, "right");
  assert.equal(groundTruth.items[0].purchaseProductKey, "stock:invoice-0|pcs");
});

test("in-memory confirmation survives serialization and removes repeat AI work", () => {
  const expected = purchase("invoice", "supplier", 1);
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "right",
    key: "stock:invoice-0|pcs",
    venueId: 1,
    name: "Товар invoice 0",
    unit: "pcs",
    packageSize: "1 шт.",
  }] }, 1);
  const memory = confirmedMemoryFromPurchase({
    venueId: 1,
    supplierId: "supplier",
    actorAccountId: 1,
    document: expected,
    candidates,
    now: "2026-08-27T00:00:00.000Z",
  });
  const restored = JSON.parse(JSON.stringify(memory));
  const repeat = applyDeterministicMappings({
    document: storedPurchaseAsParsed(expected),
    supplierId: "supplier",
    venueId: 1,
    mappings: restored,
    nomenclature: candidates,
  });
  assert.equal(repeat.items[0].mappingSource, "history");
  assert.equal(repeat.items[0].requiresReview, false);
});

test("reviewed OCR source text becomes the remembered supplier key", () => {
  const groundTruth = purchase("invoice", "supplier", 1);
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "right",
    key: "stock:invoice-0|pcs",
    venueId: 1,
    name: "Товар invoice 0",
    unit: "pcs",
    packageSize: "1 шт.",
  }] }, 1);
  const recognized = storedPurchaseAsParsed(groundTruth);
  recognized.items[0].rawName = "Товар  invoice 0";
  recognized.items[0].normalizedRawName = "товар invoice 0";
  const memory = confirmedMemoryFromReviewedGroundTruth({
    venueId: 1,
    supplierId: "supplier",
    actorAccountId: 1,
    recognized,
    groundTruth,
    candidates,
    now: "2026-08-27T00:00:00.000Z",
  });
  const repeat = applyDeterministicMappings({
    document: recognized,
    supplierId: "supplier",
    venueId: 1,
    mappings: JSON.parse(JSON.stringify(memory)),
    nomenclature: candidates,
  });
  assert.equal(repeat.items[0].mappingSource, "history");
  assert.equal(repeat.items[0].purchaseProductKey, "stock:invoice-0|pcs");
});

test("reviewed confirmation pairs an OCR typo by exact commercial fields and removes repeat AI work", () => {
  const groundTruth = purchase("invoice", "supplier", 1);
  const candidates = nomenclatureCandidates({ nomenclature: [{
    id: "right", key: "stock:invoice-0|pcs", venueId: 1, name: "Товар invoice 0", unit: "pcs", packageSize: "1 шт.",
  }] }, 1);
  const recognized = storedPurchaseAsParsed(groundTruth);
  recognized.items[0] = {
    ...recognized.items[0],
    rawName: "OCR QXZ UNKNOWN",
    normalizedRawName: "ocr qxz unknown",
    requiresReview: true,
    mappingCandidates: [{ id: "right", key: "stock:invoice-0|pcs", name: "Товар invoice 0", score: 0.7, unit: "pcs", packageSize: "1 шт." }],
  };
  const memory = confirmedMemoryFromReviewedGroundTruth({
    venueId: 1, supplierId: "supplier", actorAccountId: 1, recognized, groundTruth, candidates,
  });
  assert.equal(memory.length, 1);
  const repeat = applyDeterministicMappings({ document: recognized, supplierId: "supplier", venueId: 1, mappings: memory, nomenclature: candidates });
  assert.equal(repeat.items[0].mappingSource, "history");
  assert.equal(repeat.items[0].requiresReview, false);
});

test("production trace exposes selected versus expected identity without writing business data", () => {
  const expected = purchase("invoice", "supplier", 1);
  const candidates = nomenclatureCandidates({ nomenclature: [
    { id: "right", key: "stock:invoice-0|pcs", venueId: 1, name: "Товар invoice 0", unit: "pcs", packageSize: "1 шт." },
    { id: "wrong", key: "stock:wrong|pcs", venueId: 1, name: "Товар invoice 0", unit: "pcs", packageSize: "1 шт." },
  ] }, 1);
  const document = storedPurchaseAsParsed(expected);
  document.items[0] = { ...document.items[0], nomenclatureId: "wrong", purchaseProductKey: "stock:wrong|pcs", mappingSource: "exact_alias", confidenceLevel: "high", requiresReview: false };
  const [trace] = productionMatchingTrace({ document, expected, candidates });
  assert.equal(trace.rawSupplierLine, "Товар invoice 0");
  assert.equal(trace.selectedCandidate?.id, "wrong");
  assert.equal(trace.expectedCandidate?.id, "right");
  assert.equal(trace.correct, false);
});

test("production Hybrid QA route is controlled, keeps Primary legacy, and cannot post business data", async () => {
  const route = await readFile(new URL("../app/api/purchases/hybrid-production-qa/route.ts", import.meta.url), "utf8");
  assert.match(route, /account\.role !== "owner"/);
  assert.match(route, /validate-koln-hybrid-v2-read-only/);
  assert.match(route, /configuredMode !== "legacy"/);
  assert.match(route, /observabilityOnly: true/);
  assert.match(route, /postingInvoked: false/);
  assert.doesNotMatch(route, /INSERT INTO domain_data|UPDATE domain_data|DELETE FROM domain_data/);
  assert.doesNotMatch(route, /applyPurchaseToInventory|createStockMovement|applySupplierDebt|createExpense/);
});
