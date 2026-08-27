import type {
  NomenclatureCandidate,
  NomenclatureCandidateReference,
  ParsedInvoiceDocument,
  ParsedInvoiceLine,
  RecognitionConfidence,
} from "./invoice-recognition-v2";
import { hasStrongInvoiceIdentityEvidence, invoiceIdentityConflicts } from "./invoice-recognition-v2";

export const INVOICE_AI_BATCH_MAX_LINES = 40;
export const INVOICE_AI_BATCH_MAX_ESTIMATED_TOKENS = 12_000;
const INVOICE_AI_MAX_ATTEMPTS = 3;
const INVOICE_AI_MAX_RETRY_DELAY_MS = 8_000;

export type InvoiceAIMatchReason =
  | "exact_semantics"
  | "brand_product_package"
  | "alias_or_abbreviation"
  | "ocr_typo"
  | "ambiguous"
  | "no_match";

export type InvoiceAIMatchProposal = {
  lineId: string;
  nomenclatureId: string | null;
  confidence: number;
  reason: InvoiceAIMatchReason;
  alternateNomenclatureId: string | null;
  unresolved: boolean;
};

export type InvoiceAIBatchLine = {
  lineId: string;
  rawName: string;
  normalizedName: string;
  supplierArticle: string | null;
  barcode: string | null;
  quantity: number;
  unit: string;
  packageSize: string | null;
  candidates: NomenclatureCandidateReference[];
};

export type InvoiceAIBatch = {
  batchId: string;
  supplierId: string | null;
  supplierName: string;
  lines: InvoiceAIBatchLine[];
};

export type InvoiceAIMatchingProvider = {
  match(batch: InvoiceAIBatch, attempt: number): Promise<unknown>;
};

export type InvoiceAIBulkMatchingResult = {
  document: ParsedInvoiceDocument;
  sentLines: number;
  requestCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  highCount: number;
  mediumCount: number;
  noMatchCount: number;
  unavailable: boolean;
  providerErrors: string[];
};

export const INVOICE_AI_RESPONSE_SCHEMA = {
  name: "invoice_bulk_matching",
  description: "Candidate-only canonical matches for unresolved invoice lines",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            lineId: { type: "string" },
            nomenclatureId: { type: ["string", "null"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: {
              type: "string",
              enum: ["exact_semantics", "brand_product_package", "alias_or_abbreviation", "ocr_typo", "ambiguous", "no_match"],
            },
            alternateNomenclatureId: { type: ["string", "null"] },
            unresolved: { type: "boolean" },
          },
          required: ["lineId", "nomenclatureId", "confidence", "reason", "alternateNomenclatureId", "unresolved"],
        },
      },
    },
    required: ["lines"],
  },
} satisfies { name: string; description: string; schema: Record<string, unknown> };

function bounded(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseJson(value: string): unknown {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function text(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function estimatedTokens(value: unknown): number {
  return Math.max(1, Math.ceil(JSON.stringify(value).length / 4));
}

function linePayload(line: ParsedInvoiceLine): InvoiceAIBatchLine {
  return {
    lineId: line.id,
    rawName: line.rawName,
    normalizedName: line.normalizedRawName,
    supplierArticle: line.supplierArticle ?? null,
    barcode: line.barcode ?? null,
    quantity: line.quantity,
    unit: line.unit,
    packageSize: line.packageSize ?? null,
    candidates: (line.mappingCandidates ?? []).slice(0, 5),
  };
}

export function createInvoiceAIBatches(input: {
  document: ParsedInvoiceDocument;
  jobId: string;
}): InvoiceAIBatch[] {
  const unresolved = input.document.items
    .filter((line) => line.requiresReview && Boolean(line.mappingCandidates?.length))
    .map(linePayload);
  const batches: InvoiceAIBatch[] = [];
  let current: InvoiceAIBatchLine[] = [];
  let currentTokens = 0;
  const flush = () => {
    if (!current.length) return;
    batches.push({
      batchId: `${input.jobId}:${batches.length + 1}`,
      supplierId: input.document.supplierId ?? null,
      supplierName: input.document.supplierName,
      lines: current,
    });
    current = [];
    currentTokens = 0;
  };
  for (const line of unresolved) {
    const tokens = estimatedTokens(line);
    if (current.length && (
      current.length >= INVOICE_AI_BATCH_MAX_LINES
      || currentTokens + tokens > INVOICE_AI_BATCH_MAX_ESTIMATED_TOKENS
    )) flush();
    current.push(line);
    currentTokens += tokens;
  }
  flush();
  return batches;
}

function confidenceLevel(score: number): RecognitionConfidence {
  if (score >= 0.88) return "high";
  if (score >= 0.66) return "medium";
  return "low";
}

function validatedProposals(batch: InvoiceAIBatch, raw: unknown): InvoiceAIMatchProposal[] {
  const parsed = typeof raw === "string" ? record(parseJson(raw)) : record(raw);
  const rows = Array.isArray(parsed.lines) ? parsed.lines.map(record) : [];
  const sourceById = new Map(batch.lines.map((line) => [line.lineId, line]));
  const seen = new Set<string>();
  const results: InvoiceAIMatchProposal[] = [];
  for (const row of rows) {
    const lineId = text(row.lineId, 160);
    const source = sourceById.get(lineId);
    if (!source || seen.has(lineId)) continue;
    seen.add(lineId);
    const allowed = new Set(source.candidates.flatMap((candidate) => [candidate.id, candidate.key]));
    const requested = text(row.nomenclatureId, 300) || null;
    const alternate = text(row.alternateNomenclatureId, 300) || null;
    const nomenclatureId = requested && allowed.has(requested) ? requested : null;
    const alternateNomenclatureId = alternate && allowed.has(alternate) && alternate !== nomenclatureId ? alternate : null;
    const reason = ["exact_semantics", "brand_product_package", "alias_or_abbreviation", "ocr_typo", "ambiguous", "no_match"]
      .includes(String(row.reason)) ? row.reason as InvoiceAIMatchReason : "ambiguous";
    const confidence = nomenclatureId ? bounded(row.confidence) : 0;
    results.push({
      lineId,
      nomenclatureId,
      confidence,
      reason: nomenclatureId ? reason : "no_match",
      alternateNomenclatureId,
      unresolved: !nomenclatureId || row.unresolved === true || confidenceLevel(confidence) === "low",
    });
  }
  for (const line of batch.lines) {
    if (!seen.has(line.lineId)) results.push({
      lineId: line.lineId,
      nomenclatureId: null,
      confidence: 0,
      reason: "no_match",
      alternateNomenclatureId: null,
      unresolved: true,
    });
  }
  return results;
}

function retryable(error: unknown): boolean {
  const value = record(error);
  const code = text(value.code, 120);
  const status = Number(value.status);
  if (["insufficient_quota", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded"].includes(code)) return false;
  return status === 408 || status === 409 || status === 429 || status >= 500 || code === "network" || !Number.isFinite(status);
}

function fatalProviderError(error: unknown): boolean {
  const value = record(error);
  const status = Number(value.status);
  const code = text(value.code, 120);
  return (
    status === 401
    || status === 403
    || ["insufficient_quota", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded"].includes(code)
  );
}

function providerErrorCode(error: unknown): string {
  return text(record(error).code, 120) || "provider_unavailable";
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function matchWithRetry(provider: InvoiceAIMatchingProvider, batch: InvoiceAIBatch): Promise<{
  raw: unknown;
  attempts: number;
}> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= INVOICE_AI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return { raw: await provider.match(batch, attempt), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= INVOICE_AI_MAX_ATTEMPTS || !retryable(error)) break;
      const requestedDelay = Number(record(error).retryAfterMs) || null;
      const delay = Math.min(
        INVOICE_AI_MAX_RETRY_DELAY_MS,
        requestedDelay && requestedDelay > 0 ? requestedDelay : (250 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 125)),
      );
      await wait(delay);
    }
  }
  throw lastError;
}

function applyProposals(document: ParsedInvoiceDocument, proposals: InvoiceAIMatchProposal[]): ParsedInvoiceDocument {
  const byLine = new Map(proposals.map((proposal) => [proposal.lineId, proposal]));
  return {
    ...document,
    items: document.items.map((line) => {
      if (!line.requiresReview) return line;
      const proposal = byLine.get(line.id);
      if (!proposal?.nomenclatureId) return line;
      const selected = line.mappingCandidates?.find((candidate) =>
        candidate.id === proposal.nomenclatureId || candidate.key === proposal.nomenclatureId
      );
      if (!selected) return line;
      const identityCandidate: NomenclatureCandidate = {
        id: selected.id,
        key: selected.key,
        name: selected.name,
        unit: selected.unit ?? "",
        packageSize: selected.packageSize ?? "",
        aliases: [],
      };
      // The provider may only choose from bounded candidates, but candidate
      // membership alone is not enough: a wrong size/pack is a different SKU.
      // Keep it unresolved even when the provider reports high confidence.
      if (invoiceIdentityConflicts(line, identityCandidate).length) return line;
      const providerLevel = confidenceLevel(proposal.confidence);
      const level = providerLevel === "high" && !hasStrongInvoiceIdentityEvidence(line, identityCandidate)
        ? "medium"
        : providerLevel;
      return {
        ...line,
        nomenclatureName: selected.name,
        nomenclatureId: selected.id,
        purchaseProductKey: selected.key,
        mappingSource: "ai",
        matchReason: proposal.reason,
        alternateNomenclatureId: proposal.alternateNomenclatureId ?? undefined,
        confidence: proposal.confidence,
        confidenceLevel: level,
        requiresReview: level !== "high" || proposal.unresolved,
      };
    }),
  };
}

export async function runInvoiceAIBulkMatching(input: {
  document: ParsedInvoiceDocument;
  jobId: string;
  provider: InvoiceAIMatchingProvider;
}): Promise<InvoiceAIBulkMatchingResult> {
  const batches = createInvoiceAIBatches({ document: input.document, jobId: input.jobId });
  if (!batches.length) return {
    document: input.document,
    sentLines: 0,
    requestCount: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    highCount: 0,
    mediumCount: 0,
    noMatchCount: 0,
    unavailable: false,
    providerErrors: [],
  };
  const proposals: InvoiceAIMatchProposal[] = [];
  const providerErrors: string[] = [];
  let requestCount = 0;
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 0;
  let abortRemaining = false;
  for (const batch of batches) {
    estimatedInputTokens += estimatedTokens(batch);
    if (abortRemaining) continue;
    try {
      const matched = await matchWithRetry(input.provider, batch);
      requestCount += matched.attempts;
      estimatedOutputTokens += estimatedTokens(matched.raw);
      proposals.push(...validatedProposals(batch, matched.raw));
    } catch (error) {
      requestCount += !retryable(error) ? 1 : INVOICE_AI_MAX_ATTEMPTS;
      providerErrors.push(providerErrorCode(error));
      abortRemaining = fatalProviderError(error);
    }
  }
  const document = applyProposals(input.document, proposals);
  return {
    document,
    sentLines: batches.reduce((sum, batch) => sum + batch.lines.length, 0),
    requestCount,
    estimatedInputTokens,
    estimatedOutputTokens,
    highCount: document.items.filter((line) => line.mappingSource === "ai" && line.confidenceLevel === "high").length,
    mediumCount: document.items.filter((line) => line.mappingSource === "ai" && line.confidenceLevel === "medium").length,
    noMatchCount: document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
    unavailable: providerErrors.length > 0,
    providerErrors: [...new Set(providerErrors)],
  };
}
