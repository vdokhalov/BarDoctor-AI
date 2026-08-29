import {
  normalizeAccountingCurrency,
  type AccountingCurrency,
} from "./currency";

export const VENUE_CURRENCY_ARRAY_STORE_KEYS = new Set([
  "bd_finance_revenue",
  "bd_finance_expenses",
  "bd_suppliers",
  "bd_purchase_documents",
  "bd_sales_documents",
  "bd_sales_batches",
]);

type CurrencyIssue = {
  id: string;
  currency: string;
  code: "ACCOUNTING_CURRENCY_REQUIRED";
};

type CurrencyNormalizationResult = {
  data: unknown;
  issues: CurrencyIssue[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function id(value: Record<string, unknown>): string {
  return String(value.id ?? value.externalId ?? value.date ?? "");
}

function recordsById(value: unknown): Map<string, Record<string, unknown>> {
  return new Map(
    (Array.isArray(value) ? value : []).map((candidate) => {
      const item = record(candidate);
      return [id(item), item] as const;
    }),
  );
}

function normalizeRecord(
  previous: Record<string, unknown> | undefined,
  current: Record<string, unknown>,
  accountingCurrency: AccountingCurrency,
): Record<string, unknown> {
  const previousCurrency = normalizeAccountingCurrency(previous?.currency);
  const currentCurrency = normalizeAccountingCurrency(current.currency);
  const isNew = !previous;
  const hasCurrency = Object.prototype.hasOwnProperty.call(current, "currency");
  const currencyWasExplicitlyChanged = Boolean(previous)
    && hasCurrency
    && currentCurrency !== previousCurrency;

  // Historical records keep their stored source currency unless this write is
  // creating the record or explicitly attempts to change its currency.
  if (!isNew && !hasCurrency) return { ...current, currency: previous?.currency };
  if (!isNew && !currencyWasExplicitlyChanged) return current;
  return { ...current, currency: accountingCurrency };
}

export function normalizeVenueCurrencyArrayUpdates(input: {
  before: unknown;
  after: unknown;
  accountingCurrency: unknown;
}): CurrencyNormalizationResult {
  const accountingCurrency = normalizeAccountingCurrency(input.accountingCurrency);
  if (!accountingCurrency) {
    return {
      data: input.after,
      issues: [{ id: "", currency: "", code: "ACCOUNTING_CURRENCY_REQUIRED" }],
    };
  }
  if (!Array.isArray(input.after)) return { data: input.after, issues: [] };

  const before = recordsById(input.before);
  return {
    data: input.after.map((candidate) => {
      const current = record(candidate);
      return normalizeRecord(before.get(id(current)), current, accountingCurrency);
    }),
    issues: [],
  };
}

export function normalizeVenueMenuCurrencyUpdates(input: {
  before: unknown;
  after: unknown;
  accountingCurrency: unknown;
}): CurrencyNormalizationResult {
  const beforeRoot = record(input.before);
  const afterRoot = { ...record(input.after) };
  const normalized = normalizeVenueCurrencyArrayUpdates({
    before: beforeRoot.menuItems,
    after: afterRoot.menuItems,
    accountingCurrency: input.accountingCurrency,
  });
  afterRoot.menuItems = normalized.data;
  return { data: afterRoot, issues: normalized.issues };
}
