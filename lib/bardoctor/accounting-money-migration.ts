import { resolveAccountingMoney } from "./accounting-money";
import { normalizeAccountingCurrency } from "./currency";
import { purchaseCommercialArithmeticIssues } from "./purchases";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
const code = (value: unknown): string => typeof value === "string" ? value.trim().toUpperCase() : "";

export type AccountingMigrationPreview = {
  recordsTotal: number;
  noActionRequired: string[];
  safeAutoNormalization: string[];
  requiresFx: string[];
  requiresSourceVerification: Array<{ documentId: string; lineIds: string[] }>;
  ambiguous: string[];
  explanation: string[];
};

/** Read-only classifier. It never mutates records or guesses what legacy RUB meant. */
export function previewPurchaseAccountingMigration(input: {
  documents: unknown[];
  accountingCurrency: unknown;
  legacyRubSemanticAmbiguous?: boolean;
}): AccountingMigrationPreview {
  const accountingCurrency = normalizeAccountingCurrency(input.accountingCurrency);
  const result: AccountingMigrationPreview = {
    recordsTotal: 0,
    noActionRequired: [],
    safeAutoNormalization: [],
    requiresFx: [],
    requiresSourceVerification: [],
    ambiguous: [],
    explanation: [],
  };
  for (const value of input.documents) {
    const document = record(value);
    if (document.documentType === "price_list" || document.status !== "confirmed") continue;
    const id = String(document.id ?? "");
    if (!id) continue;
    result.recordsTotal += 1;
    const issues = purchaseCommercialArithmeticIssues(document);
    if (issues.length) {
      result.requiresSourceVerification.push({
        documentId: id,
        lineIds: issues.map((issue) => issue.itemId ?? "").filter(Boolean),
      });
    }
    if (input.legacyRubSemanticAmbiguous && code(document.originalCurrency ?? document.currency) === "RUB") {
      result.ambiguous.push(id);
      continue;
    }
    const money = accountingCurrency ? resolveAccountingMoney({ value: document, accountingCurrency }) : null;
    if (!money || money.accountingAmount == null) {
      result.requiresFx.push(id);
    } else if (document.accountingAmount != null && code(document.accountingCurrency) === accountingCurrency) {
      result.noActionRequired.push(id);
    } else {
      result.safeAutoNormalization.push(id);
    }
  }
  if (input.legacyRubSemanticAmbiguous) {
    result.explanation.push("Legacy RUB must be confirmed as ISO RUB or PMR_RUB before migration; no automatic semantic rewrite is safe.");
  }
  result.explanation.push("requiresFx records need an authoritative historical conversion; current rates and implicit 1:1 are forbidden.");
  return result;
}
