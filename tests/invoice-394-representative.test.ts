import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  runInvoiceAIBulkMatching,
  type InvoiceAIMatchingProvider,
} from "../lib/bardoctor/invoice-ai-matching";
import {
  applyDeterministicMappings,
  upsertConfirmedSupplierMappings,
  type ParsedInvoiceDocument,
} from "../lib/bardoctor/invoice-recognition-v2";
import {
  changedInvoice394Document,
  INVOICE_394_SUPPLIER_ID,
  INVOICE_394_VENUE_ID,
  invoice394Document,
  invoice394GroundTruth,
  representativeNomenclature,
} from "../lib/bardoctor/invoice-394-representative-fixture";

function fixtureSemanticProvider(): InvoiceAIMatchingProvider {
  return {
    async match(batch) {
      return {
        lines: batch.lines.map((line) => {
          const [best, second] = line.candidates;
          const margin = (best?.score ?? 0) - (second?.score ?? 0);
          const high = Boolean(best && best.score >= 0.82 && margin >= 0.1);
          const medium = Boolean(best && best.score >= 0.64 && margin >= 0.08);
          return {
            lineId: line.lineId,
            nomenclatureId: high || medium ? best?.id ?? null : null,
            confidence: high ? 0.93 : medium ? 0.76 : 0,
            reason: high || medium ? "alias_or_abbreviation" : "no_match",
            alternateNomenclatureId: medium ? second?.id ?? null : null,
            unresolved: !high,
          };
        }),
      };
    },
  };
}

function deterministic(document: ParsedInvoiceDocument, mappings: ReturnType<typeof upsertConfirmedSupplierMappings> = []) {
  return applyDeterministicMappings({
    document,
    supplierId: INVOICE_394_SUPPLIER_ID,
    venueId: INVOICE_394_VENUE_ID,
    mappings,
    nomenclature: representativeNomenclature(),
  });
}

function score(document: ParsedInvoiceDocument) {
  let correct = 0;
  let incorrect = 0;
  for (const line of document.items) {
    const expected = invoice394GroundTruth.get(line.id);
    if (!line.nomenclatureId) continue;
    if (line.nomenclatureId === expected) correct += 1;
    else incorrect += 1;
  }
  return { correct, incorrect };
}

test("representative invoice 394 fixture has one hidden target per real line and 100-500 competing positions", () => {
  const nomenclature = representativeNomenclature();
  assert.equal(invoice394GroundTruth.size, 15);
  assert.ok(nomenclature.length >= 100 && nomenclature.length <= 500);
  for (const target of invoice394GroundTruth.values()) {
    assert.equal(nomenclature.filter((candidate) => candidate.id === target).length, 1);
  }
  assert.ok(nomenclature.some((candidate) => candidate.name === "Coca-Cola" && candidate.packageSize === "0,5 л"));
  assert.ok(nomenclature.some((candidate) => candidate.name === "Coca-Cola" && candidate.packageSize === "1,25 л"));
  assert.ok(nomenclature.some((candidate) => /Shamp/i.test(candidate.name)));
});

test("representative provider QA route is owner-only and cannot write production domain data", async () => {
  const route = await readFile(new URL("../app/api/purchases/matching-qa/route.ts", import.meta.url), "utf8");
  assert.match(route, /account\.role !== "owner"/);
  assert.match(route, /get\("dataset"\) !== "invoice-394"/);
  assert.match(route, /businessDataWritten: false/);
  assert.doesNotMatch(route, /getD1|INSERT INTO domain_data|applyPurchaseToInventory|StockMovement/);
});

test("invoice 394 first, persisted repeat, changed supplier lines and AI outage stay safe", async () => {
  const firstDeterministic = deterministic(invoice394Document());
  const first = await runInvoiceAIBulkMatching({
    document: firstDeterministic,
    jobId: "invoice-394-first",
    provider: fixtureSemanticProvider(),
  });
  const firstScore = score(first.document);
  assert.equal(first.document.items.length, 15);
  assert.equal(firstScore.incorrect, 0);
  assert.ok(firstScore.correct >= 10);
  assert.ok(first.requestCount <= 1);

  const confirmedItems = first.document.items.map((line) => {
    const target = invoice394GroundTruth.get(line.id);
    assert.ok(target);
    const candidate = representativeNomenclature().find((value) => value.id === target);
    assert.ok(candidate);
    return {
      ...line,
      nomenclatureId: candidate.id,
      purchaseProductKey: candidate.key,
      mappingSource: line.nomenclatureId === candidate.id ? line.mappingSource : "manual" as const,
      confidence: 1,
      confidenceLevel: "high" as const,
      requiresReview: false,
    };
  });
  let transientMappings = upsertConfirmedSupplierMappings({
    current: [],
    venueId: INVOICE_394_VENUE_ID,
    supplierId: INVOICE_394_SUPPLIER_ID,
    actorAccountId: 7,
    items: confirmedItems,
    now: "2026-08-27T10:00:00.000Z",
  });
  assert.equal(transientMappings.length, 15);

  // Persistence boundary: discard the live objects and reload the serialized
  // value that the confirmation route stores in domain_data.
  const persistenceDirectory = await mkdtemp(join(tmpdir(), "bardoctor-invoice-394-"));
  const persistenceFile = join(persistenceDirectory, "domain-data.json");
  await writeFile(persistenceFile, JSON.stringify(transientMappings), "utf8");
  transientMappings = [];
  assert.equal(transientMappings.length, 0);
  const restoredMappings = JSON.parse(await readFile(persistenceFile, "utf8")) as ReturnType<typeof upsertConfirmedSupplierMappings>;
  await rm(persistenceDirectory, { recursive: true, force: true });

  const repeatDeterministic = deterministic(invoice394Document(), restoredMappings);
  const repeat = await runInvoiceAIBulkMatching({
    document: repeatDeterministic,
    jobId: "invoice-394-repeat",
    provider: fixtureSemanticProvider(),
  });
  assert.equal(repeat.document.items.filter((line) => line.mappingSource === "history").length, 15);
  assert.equal(repeat.sentLines, 0);
  assert.equal(repeat.requestCount, 0);
  assert.equal(repeat.estimatedInputTokens + repeat.estimatedOutputTokens, 0);

  const changedDeterministic = deterministic(changedInvoice394Document(), restoredMappings);
  assert.equal(changedDeterministic.items.filter((line) => line.mappingSource === "history").length, 12);
  const changed = await runInvoiceAIBulkMatching({
    document: changedDeterministic,
    jobId: "invoice-394-change",
    provider: fixtureSemanticProvider(),
  });
  assert.ok(changed.sentLines <= 3);
  assert.ok(changed.requestCount <= 1);

  const unavailable = await runInvoiceAIBulkMatching({
    document: firstDeterministic,
    jobId: "invoice-394-ai-unavailable",
    provider: { async match() { throw Object.assign(new Error("offline"), { status: 503, code: "provider_unavailable" }); } },
  });
  assert.equal(unavailable.unavailable, true);
  assert.deepEqual(
    unavailable.document.items.filter((line) => !line.requiresReview).map((line) => line.id),
    firstDeterministic.items.filter((line) => !line.requiresReview).map((line) => line.id),
  );
  assert.equal(score(unavailable.document).incorrect, 0);

  const foreignVenue = applyDeterministicMappings({
    document: invoice394Document(),
    supplierId: INVOICE_394_SUPPLIER_ID,
    venueId: INVOICE_394_VENUE_ID + 1,
    mappings: restoredMappings,
    nomenclature: representativeNomenclature(),
  });
  assert.equal(foreignVenue.items.filter((line) => line.mappingSource === "history").length, 0);
});
