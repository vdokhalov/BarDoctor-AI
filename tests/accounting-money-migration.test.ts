import assert from "node:assert/strict";
import test from "node:test";
import { previewPurchaseAccountingMigration } from "../lib/bardoctor/accounting-money-migration";

test("migration preview separates safe, FX-required, ambiguous and source-verification records", () => {
  const base = { venueId: 1, status: "confirmed", documentType: "invoice", supplierName: "S", date: "2026-08-01", items: [{ id: "l", name: "A", quantity: 1, unitPrice: 100, lineTotal: 100 }] };
  const result = previewPurchaseAccountingMigration({
    accountingCurrency: "MDL",
    legacyRubSemanticAmbiguous: true,
    documents: [
      { ...base, id: "same", currency: "MDL", total: 100 },
      { ...base, id: "foreign", currency: "EUR", total: 100 },
      { ...base, id: "legacy-rub", currency: "RUB", total: 100 },
      { ...base, id: "bad", currency: "MDL", total: 60, items: [{ id: "bad-line", name: "B", quantity: 100, unitPrice: 0.5, lineTotal: 60 }] },
    ],
  });
  assert.deepEqual(result.safeAutoNormalization.sort(), ["bad", "same"]);
  assert.deepEqual(result.requiresFx, ["foreign"]);
  assert.deepEqual(result.ambiguous, ["legacy-rub"]);
  assert.deepEqual(result.requiresSourceVerification, [{ documentId: "bad", lineIds: ["bad-line"] }]);
});
