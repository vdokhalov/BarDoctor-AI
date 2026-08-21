export const ACCOUNTING_CURRENCIES = [
  "MDL",
  "RUB",
  "EUR",
  "USD",
  "UAH",
  "RON",
] as const;

export type AccountingCurrency = (typeof ACCOUNTING_CURRENCIES)[number];

const ACCOUNTING_CURRENCY_SET = new Set<string>(ACCOUNTING_CURRENCIES);

export function normalizeAccountingCurrency(value: unknown): AccountingCurrency | null {
  if (typeof value !== "string") return null;
  const currency = value.trim().toUpperCase();
  return ACCOUNTING_CURRENCY_SET.has(currency) ? currency as AccountingCurrency : null;
}

export function isAccountingCurrency(value: unknown): value is AccountingCurrency {
  return normalizeAccountingCurrency(value) !== null;
}

export function accountingCurrencyFromProfile(value: unknown): AccountingCurrency | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeAccountingCurrency((value as Record<string, unknown>).currency);
}
