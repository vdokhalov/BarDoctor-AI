import { configuredInvoiceOcr, type OcrSourceDocument } from "./invoice-ocr";
import {
  normalizeInvoiceText,
  parseInvoiceOcr,
  type InvoiceOcrResult,
  type ParsedInvoiceDocument,
} from "./invoice-recognition-v2";

type OcrEnvironment = Parameters<typeof configuredInvoiceOcr>[0]["environment"];

export type InvoiceOcrAttemptQuality = {
  attempt: number;
  detectedBlocks: number;
  parsedLines: number;
  arithmeticSafeLines: number;
  itemTotal: number;
  documentTotal: number;
  totalGap: number;
  totalGapRatio: number;
  reconciled: boolean;
  identitySignature: string;
  durationMs: number;
};

export type StableInvoiceOcrResult = {
  ocr: InvoiceOcrResult;
  parsed: ParsedInvoiceDocument;
  selectedAttempt: number;
  attempts: InvoiceOcrAttemptQuality[];
};

function stableLineIdentity(value: string): string {
  return normalizeInvoiceText(value)
    .replace(/\b(?:ml|l|kg|g|pcs|bottle|package|piece)\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function invoiceOcrAttemptQuality(
  ocr: InvoiceOcrResult,
  parsed: ParsedInvoiceDocument,
  attempt = 1,
): InvoiceOcrAttemptQuality {
  const itemTotal = Math.round(parsed.items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const documentTotal = Math.round(parsed.total * 100) / 100;
  const totalGap = Math.round(Math.abs(documentTotal - itemTotal) * 100) / 100;
  const totalGapRatio = documentTotal > 0 ? totalGap / documentTotal : 0;
  const identitySignature = parsed.items
    .map((item) => stableLineIdentity(item.rawName))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "ru"))
    .join("|");
  return {
    attempt,
    detectedBlocks: ocr.lines.length,
    parsedLines: parsed.items.length,
    arithmeticSafeLines: parsed.items.filter((item) => !item.requiresReview).length,
    itemTotal,
    documentTotal,
    totalGap,
    totalGapRatio,
    reconciled: parsed.items.length > 0 && totalGapRatio <= 0.025,
    identitySignature,
    durationMs: ocr.durationMs,
  };
}

function compareAttempts(
  left: { quality: InvoiceOcrAttemptQuality },
  right: { quality: InvoiceOcrAttemptQuality },
): number {
  if (left.quality.reconciled !== right.quality.reconciled) return left.quality.reconciled ? -1 : 1;
  if (left.quality.totalGapRatio !== right.quality.totalGapRatio) {
    return left.quality.totalGapRatio - right.quality.totalGapRatio;
  }
  if (left.quality.arithmeticSafeLines !== right.quality.arithmeticSafeLines) {
    return right.quality.arithmeticSafeLines - left.quality.arithmeticSafeLines;
  }
  if (left.quality.parsedLines !== right.quality.parsedLines) return right.quality.parsedLines - left.quality.parsedLines;
  return left.quality.attempt - right.quality.attempt;
}

/**
 * OCR.Space occasionally returns a different table decomposition for the same
 * immutable source image. Two independent reads are therefore compared, and a
 * third is used only when neither of the first two reconciles commercial line
 * totals or their structured identities disagree. The selected result is still
 * parsed normally; this function never invents or merges invoice rows.
 */
export async function configuredStableInvoiceOcr(input: {
  documents: OcrSourceDocument[];
  environment: OcrEnvironment;
  fetchImpl?: typeof fetch;
  maximumAttempts?: number;
}): Promise<StableInvoiceOcrResult> {
  const provider = String(input.environment.INVOICE_OCR_PROVIDER ?? "").toLocaleLowerCase("en-US");
  const maximumAttempts = provider === "ocr_space" || provider === "ocrspace"
    ? Math.min(3, Math.max(2, input.maximumAttempts ?? 3))
    : 1;
  const attempts: Array<{
    ocr: InvoiceOcrResult;
    parsed: ParsedInvoiceDocument;
    quality: InvoiceOcrAttemptQuality;
  }> = [];
  let lastError: unknown;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const ocr = await configuredInvoiceOcr({
        documents: input.documents,
        environment: input.environment,
        fetchImpl: input.fetchImpl,
      });
      const parsed = parseInvoiceOcr(ocr);
      attempts.push({ ocr, parsed, quality: invoiceOcrAttemptQuality(ocr, parsed, attempt) });
    } catch (error) {
      lastError = error;
      if (!attempts.length) throw error;
      break;
    }
    if (maximumAttempts === 1) break;
    if (attempts.length === 2) {
      const [first, second] = attempts;
      const bothReconciled = first.quality.reconciled && second.quality.reconciled;
      const sameIdentity = first.quality.identitySignature === second.quality.identitySignature;
      if (bothReconciled && sameIdentity) break;
      const oneComplete = attempts.some((value) => value.quality.reconciled);
      const otherHasNoMoreLines = Math.max(first.quality.parsedLines, second.quality.parsedLines)
        === attempts.find((value) => value.quality.reconciled)?.quality.parsedLines;
      if (oneComplete && otherHasNoMoreLines) break;
    }
  }
  if (!attempts.length) throw lastError;
  const selected = [...attempts].sort(compareAttempts)[0];
  const totalDurationMs = attempts.reduce((sum, value) => sum + value.ocr.durationMs, 0);
  return {
    ocr: {
      ...selected.ocr,
      durationMs: totalDurationMs,
      metadata: {
        ...selected.ocr.metadata,
        stabilityAttempts: attempts.length,
        selectedStabilityAttempt: selected.quality.attempt,
        stabilityReconciled: selected.quality.reconciled,
      },
    },
    parsed: selected.parsed,
    selectedAttempt: selected.quality.attempt,
    attempts: attempts.map((value) => value.quality),
  };
}
