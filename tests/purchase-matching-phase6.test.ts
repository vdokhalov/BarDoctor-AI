import test from "node:test";
import assert from "node:assert/strict";
import { applyDeterministicMappings, type ParsedInvoiceDocument } from "../lib/bardoctor/invoice-recognition-v2";
import { createInvoiceAIBatches, runInvoiceAIBulkMatching } from "../lib/bardoctor/invoice-ai-matching";

function fixture(): ParsedInvoiceDocument {
  return { documentType: "invoice", supplierName: "Test", supplierType: "wholesale", currency: "MDL",
    paymentMethod: "unknown", total: 100, confidence: 1, warnings: [], items: [{
      id: "stable-line", rawName: "Tea classic", normalizedRawName: "tea classic", name: "Tea classic",
      quantity: 1, unit: "pcs", unitPrice: 100, lineTotal: 100,
      nomenclatureId: "black-tea", purchaseProductKey: "tea-black-stock", nomenclatureName: "Black tea",
      mappingSource: "manual", confidence: 1, confidenceLevel: "high", requiresReview: false,
      mappingCandidates: [{id: "wrong-tea", key: "wrong-stock", name: "Tea classic", score: 0.99}],
    }] };
}

test("Phase 6 re-recognition preserves explicit manual choice against a misleading exact alias", () => {
  const document = fixture();
  const result = applyDeterministicMappings({ document, venueId: 1, mappings: [], nomenclature: [
    {id: "wrong-tea", key: "wrong-stock", name: "Tea classic", unit: "pcs", packageSize: "", aliases: []},
    {id: "black-tea", key: "tea-black-stock", name: "Black tea", unit: "pcs", packageSize: "", aliases: []},
  ] });
  assert.equal(result.items[0].nomenclatureId, "black-tea");
  assert.equal(result.items[0].purchaseProductKey, "tea-black-stock");
  assert.equal(result.items[0].mappingSource, "manual");
  assert.equal(result.items[0].id, "stable-line");
  assert.deepEqual(document, fixture());
});

test("Phase 6 arithmetic review must not send manually mapped identity back to AI", () => {
  const document = fixture();
  document.items[0].requiresReview = true;
  document.items[0].lineTotal = 80;
  assert.deepEqual(createInvoiceAIBatches({ document, jobId: "phase6" }), []);
});

test("Phase 6 a missing manual target requires review without silently choosing a replacement", () => {
  const result = applyDeterministicMappings({ document: fixture(), venueId: 1, mappings: [], nomenclature: [] });
  assert.equal(result.items[0].nomenclatureId, "black-tea");
  assert.equal(result.items[0].mappingSource, "manual");
  assert.equal(result.items[0].requiresReview, true);
});

test("Phase 6 manual identity does not suppress an arithmetic error", () => {
  const document = fixture();
  document.items[0].lineTotal = 80;
  const result = applyDeterministicMappings({ document, venueId: 1, mappings: [], nomenclature: [
    { id: "black-tea", key: "tea-black-stock", name: "Black tea", unit: "pcs", packageSize: "", aliases: [] },
  ] });
  assert.equal(result.items[0].requiresReview, true);
  assert.equal(result.items[0].nomenclatureId, "black-tea");
});

test("Phase 6 a queued AI proposal cannot overwrite a manual correction made while it is pending", async () => {
  const document = fixture();
  document.items[0] = {
    ...document.items[0], mappingSource: "fuzzy", nomenclatureId: "wrong-tea",
    purchaseProductKey: "wrong-stock", nomenclatureName: "Tea classic", requiresReview: true,
  };
  let releaseProposal!: () => void;
  const proposalReady = new Promise<void>((resolve) => { releaseProposal = resolve; });
  let markQueued!: () => void;
  const queued = new Promise<void>((resolve) => { markQueued = resolve; });
  const pending = runInvoiceAIBulkMatching({
    document, jobId: "phase6-stale-proposal", provider: {
      async match(batch) {
        assert.equal(batch.lines.length, 1);
        assert.equal(batch.lines[0].lineId, "stable-line");
        assert.equal(batch.lines[0].candidates[0].id, "wrong-tea");
        markQueued();
        await proposalReady;
        return { lines: [{ lineId: "stable-line", nomenclatureId: "wrong-tea", confidence: 0.99,
          reason: "exact_semantics", alternateNomenclatureId: null, unresolved: false }] };
      },
    },
  });
  await queued;
  // Identity is corrected while the old candidate request is still outstanding.
  // A separate arithmetic review keeps requiresReview true at proposal arrival.
  document.items[0] = { ...fixture().items[0], requiresReview: true, lineTotal: 80 };
  const manuallyCorrected = structuredClone(document.items[0]);
  releaseProposal();
  const result = await pending;
  assert.equal(result.sentLines, 1);
  assert.equal(result.requestCount, 1);
  assert.equal(result.unavailable, false);
  assert.deepEqual(result.document.items[0], manuallyCorrected);
  assert.deepEqual(document.items[0], manuallyCorrected);
  assert.equal(result.highCount, 0);
});
