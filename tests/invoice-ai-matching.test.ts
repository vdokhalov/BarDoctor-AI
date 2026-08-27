import assert from "node:assert/strict";
import test from "node:test";
import {
  createInvoiceAIBatches,
  runInvoiceAIBulkMatching,
  type InvoiceAIMatchingProvider,
} from "../lib/bardoctor/invoice-ai-matching";
import {
  applyDeterministicMappings,
  normalizeInvoiceText,
  upsertConfirmedSupplierMappings,
  type NomenclatureCandidate,
  type ParsedInvoiceDocument,
} from "../lib/bardoctor/invoice-recognition-v2";

function documentWithLines(count: number): ParsedInvoiceDocument {
  return {
    documentType: "invoice",
    supplierId: "supplier-1",
    supplierName: "Поставщик",
    supplierType: "wholesale",
    currency: "RUB",
    paymentMethod: "unknown",
    total: count * 10,
    confidence: 0.95,
    warnings: [],
    items: Array.from({ length: count }, (_, index) => ({
      id: `line-${index}`,
      rawName: `SUP-${index} Товар ${index}`,
      normalizedRawName: normalizeInvoiceText(`SUP-${index} Товар ${index}`),
      name: `SUP-${index} Товар ${index}`,
      quantity: 1,
      unit: "шт.",
      packageSize: "1 шт.",
      unitPrice: 10,
      lineTotal: 10,
      confidence: 0.8,
      confidenceLevel: "medium",
      requiresReview: true,
      mappingCandidates: [{
        id: `product-${index}`,
        key: `stock:product-${index}|pcs`,
        name: `Товар ${index}`,
        score: 0.72,
        unit: "pcs",
        packageSize: "1 шт.",
      }],
    })),
  };
}

function matchingProvider(confidence = 0.93): InvoiceAIMatchingProvider {
  return {
    async match(batch) {
      return {
        lines: batch.lines.map((line) => ({
          lineId: line.lineId,
          nomenclatureId: line.candidates[0]?.id ?? null,
          confidence,
          reason: "alias_or_abbreviation",
          alternateNomenclatureId: null,
          unresolved: confidence < 0.88,
        })),
      };
    },
  };
}

test("500 unresolved lines use controlled batches instead of 500 requests", async () => {
  const document = documentWithLines(500);
  const batches = createInvoiceAIBatches({ document, jobId: "job-500" });
  assert.equal(batches.length, 13);
  assert.ok(batches.every((batch) => batch.lines.length <= 40));
  const result = await runInvoiceAIBulkMatching({ document, jobId: "job-500", provider: matchingProvider() });
  assert.equal(result.sentLines, 500);
  assert.equal(result.requestCount, 13);
  assert.equal(result.highCount, 500);
  assert.equal(result.document.items.filter((line) => line.requiresReview).length, 0);
});

test("lines without bounded candidates stay manual and are not sent to AI", async () => {
  const document = documentWithLines(2);
  document.items[1] = { ...document.items[1], mappingCandidates: [] };
  let sent = 0;
  const result = await runInvoiceAIBulkMatching({
    document,
    jobId: "no-candidate",
    provider: {
      async match(batch) {
        sent += batch.lines.length;
        return matchingProvider().match(batch, 1);
      },
    },
  });
  assert.equal(sent, 1);
  assert.equal(result.sentLines, 1);
  assert.equal(result.document.items[1].requiresReview, true);
  assert.equal(result.document.items[1].nomenclatureId, undefined);
});

test("AI can select only supplied candidates and duplicate or unknown line IDs are ignored", async () => {
  const document = documentWithLines(2);
  const result = await runInvoiceAIBulkMatching({
    document,
    jobId: "validation",
    provider: {
      async match(batch) {
        return { lines: [
          {
            lineId: batch.lines[0].lineId,
            nomenclatureId: "invented-id",
            confidence: 1,
            reason: "exact_semantics",
            alternateNomenclatureId: null,
            unresolved: false,
          },
          {
            lineId: batch.lines[0].lineId,
            nomenclatureId: batch.lines[0].candidates[0].id,
            confidence: 1,
            reason: "exact_semantics",
            alternateNomenclatureId: null,
            unresolved: false,
          },
          {
            lineId: "unknown-line",
            nomenclatureId: batch.lines[1].candidates[0].id,
            confidence: 1,
            reason: "exact_semantics",
            alternateNomenclatureId: null,
            unresolved: false,
          },
        ] };
      },
    },
  });
  assert.equal(result.document.items[0].nomenclatureId, undefined);
  assert.equal(result.document.items[1].nomenclatureId, undefined);
  assert.equal(result.noMatchCount, 2);
});

test("server vetoes a high-confidence AI proposal with conflicting package or volume", async () => {
  const document = documentWithLines(3);
  document.items = [
    {
      ...document.items[0], rawName: "Coca-Cola 1,25 л", packageSize: "1,25 л",
      mappingCandidates: [{ id: "cola-500", key: "stock:cola-500|pcs", name: "Coca-Cola", score: 0.59, unit: "pcs", packageSize: "0,5 л" }],
    },
    {
      ...document.items[1], rawName: "Вода 6 x 0,5 л", packageSize: "6 x 0,5 л",
      mappingCandidates: [{ id: "water-3l", key: "stock:water-3l|pcs", name: "Вода", score: 0.59, unit: "pcs", packageSize: "1 x 3 л" }],
    },
    {
      ...document.items[2], rawName: "Сок коробка 12 шт", packageSize: "12 шт",
      mappingCandidates: [{ id: "juice-one", key: "stock:juice-one|pcs", name: "Сок", score: 0.59, unit: "pcs", packageSize: "1 шт" }],
    },
  ];
  const result = await runInvoiceAIBulkMatching({
    document,
    jobId: "package-veto",
    provider: matchingProvider(0.99),
  });
  assert.equal(result.highCount, 0);
  assert.equal(result.noMatchCount, 3);
  assert.ok(result.document.items.every((line) => !line.nomenclatureId && line.requiresReview));
});

test("temporary 429 honors bounded retry and preserves line IDs", async () => {
  let calls = 0;
  const result = await runInvoiceAIBulkMatching({
    document: documentWithLines(3),
    jobId: "rate-limit",
    provider: {
      async match(batch) {
        calls += 1;
        if (calls < 3) throw Object.assign(new Error("temporary"), { status: 429, code: "rate_limit_exceeded", retryAfterMs: 1 });
        return matchingProvider().match(batch, calls);
      },
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.requestCount, 3);
  assert.deepEqual(result.document.items.map((line) => line.id), ["line-0", "line-1", "line-2"]);
  assert.equal(result.unavailable, false);
});

test("quota error is not retried and deterministic draft remains usable", async () => {
  let calls = 0;
  const document = documentWithLines(45);
  document.items[0] = { ...document.items[0], requiresReview: false, mappingSource: "exact_alias", nomenclatureId: "product-0", purchaseProductKey: "stock:product-0|pcs" };
  const result = await runInvoiceAIBulkMatching({
    document,
    jobId: "quota",
    provider: {
      async match() {
        calls += 1;
        throw Object.assign(new Error("quota"), { status: 429, code: "insufficient_quota" });
      },
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.requestCount, 1);
  assert.equal(result.unavailable, true);
  assert.equal(result.document.items[0].mappingSource, "exact_alias");
  assert.equal(result.document.items.filter((line) => line.requiresReview).length, 44);
});

test("first 500-line invoice learns confirmations and repeat invoice needs no AI", async () => {
  const firstDocument = documentWithLines(500);
  const first = await runInvoiceAIBulkMatching({
    document: firstDocument,
    jobId: "first-arrival",
    provider: matchingProvider(0.93),
  });
  assert.equal(first.requestCount, 13);
  const confirmed = upsertConfirmedSupplierMappings({
    current: [],
    venueId: 10,
    supplierId: "supplier-1",
    actorAccountId: 7,
    items: first.document.items,
    now: "2026-08-26T15:00:00.000Z",
  });
  assert.equal(confirmed.length, 500);
  const nomenclature: NomenclatureCandidate[] = Array.from({ length: 1_200 }, (_, index) => ({
    id: `product-${index}`,
    key: `stock:product-${index}|pcs`,
    name: `Товар ${index}`,
    unit: "pcs",
    packageSize: "1 шт.",
    aliases: [],
  }));
  const repeatSource: ParsedInvoiceDocument = {
    ...firstDocument,
    items: firstDocument.items.map((line) => ({ ...line, mappingCandidates: undefined })),
  };
  const repeat = applyDeterministicMappings({
    document: repeatSource,
    supplierId: "supplier-1",
    venueId: 10,
    mappings: confirmed,
    nomenclature,
  });
  assert.equal(repeat.items.filter((line) => line.mappingSource === "history").length, 500);
  const repeatAI = await runInvoiceAIBulkMatching({ document: repeat, jobId: "repeat-arrival", provider: matchingProvider() });
  assert.equal(repeatAI.sentLines, 0);
  assert.equal(repeatAI.requestCount, 0);
});
