import { normalizeAccountingCurrency, type AccountingCurrency } from "./currency";

export const FX_RATE_DIRECTION = "source_to_accounting" as const;
export type FxRateDirection = typeof FX_RATE_DIRECTION;

export type AccountingMoney = {
  originalAmount: number;
  originalCurrency: string;
  accountingAmount: number | null;
  accountingCurrency: AccountingCurrency;
  fxRate?: number;
  fxRateDirection?: FxRateDirection;
  fxEffectiveDate?: string;
  fxSource?: string;
  fxLockedAt?: string;
  status: "same_currency" | "converted" | "unresolved";
  reason?: "missing_original_currency" | "missing_accounting_currency" | "missing_historical_fx" | "accounting_currency_mismatch";
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function finite(value: unknown): number | null {
  const parsed = typeof value === "string"
    ? Number(value.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundMoney(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeMoneyCurrency(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().slice(0, 16) : "";
}

export function resolveAccountingMoney(input: {
  value?: unknown;
  originalAmount?: unknown;
  originalCurrency?: unknown;
  accountingAmount?: unknown;
  accountingCurrency?: unknown;
  fxRate?: unknown;
  fxRateDirection?: unknown;
  fxEffectiveDate?: unknown;
  fxSource?: unknown;
  fxLockedAt?: unknown;
}): AccountingMoney | null {
  const value = record(input.value);
  const accountingCurrency = normalizeAccountingCurrency(
    input.accountingCurrency ?? value.accountingCurrency,
  );
  if (!accountingCurrency) return null;
  const originalAmount = Math.max(0, finite(
    input.originalAmount ?? value.originalAmount ?? value.total ?? value.amount,
  ) ?? 0);
  const originalCurrency = normalizeMoneyCurrency(
    input.originalCurrency ?? value.originalCurrency ?? value.currency,
  );
  const unresolved = (reason: AccountingMoney["reason"]): AccountingMoney => ({
    originalAmount: roundMoney(originalAmount),
    originalCurrency,
    accountingAmount: null,
    accountingCurrency,
    status: "unresolved",
    reason,
  });
  if (!originalCurrency) return unresolved("missing_original_currency");
  if (originalCurrency === accountingCurrency) {
    return {
      originalAmount: roundMoney(originalAmount),
      originalCurrency,
      accountingAmount: roundMoney(originalAmount),
      accountingCurrency,
      status: "same_currency",
    };
  }
  const storedCurrency = normalizeMoneyCurrency(value.accountingCurrency ?? input.accountingCurrency);
  const storedAmount = finite(input.accountingAmount ?? value.accountingAmount ?? value.normalizedAmount);
  if (storedAmount != null && storedAmount >= 0) {
    if (storedCurrency !== accountingCurrency) return unresolved("accounting_currency_mismatch");
    return {
      originalAmount: roundMoney(originalAmount),
      originalCurrency,
      accountingAmount: roundMoney(storedAmount),
      accountingCurrency,
      fxRate: finite(input.fxRate ?? value.fxRate ?? value.exchangeRateToAccounting) ?? undefined,
      fxRateDirection: FX_RATE_DIRECTION,
      fxEffectiveDate: String(input.fxEffectiveDate ?? value.fxEffectiveDate ?? "") || undefined,
      fxSource: String(input.fxSource ?? value.fxSource ?? "") || undefined,
      fxLockedAt: String(input.fxLockedAt ?? value.fxLockedAt ?? "") || undefined,
      status: "converted",
    };
  }
  const direction = String(input.fxRateDirection ?? value.fxRateDirection ?? FX_RATE_DIRECTION);
  const rate = finite(input.fxRate ?? value.fxRate ?? value.exchangeRateToAccounting);
  if (direction === FX_RATE_DIRECTION && rate != null && rate > 0) {
    return {
      originalAmount: roundMoney(originalAmount),
      originalCurrency,
      accountingAmount: roundMoney(originalAmount * rate),
      accountingCurrency,
      fxRate: rate,
      fxRateDirection: FX_RATE_DIRECTION,
      fxEffectiveDate: String(input.fxEffectiveDate ?? value.fxEffectiveDate ?? "") || undefined,
      fxSource: String(input.fxSource ?? value.fxSource ?? "") || undefined,
      fxLockedAt: String(input.fxLockedAt ?? value.fxLockedAt ?? "") || undefined,
      status: "converted",
    };
  }
  return unresolved("missing_historical_fx");
}

export function lockAccountingMoney(input: {
  value: unknown;
  accountingCurrency: unknown;
  now: string;
  requireFxProvenance?: boolean;
}): AccountingMoney | null {
  const resolved = resolveAccountingMoney({ value: input.value, accountingCurrency: input.accountingCurrency });
  if (!resolved || resolved.status === "unresolved") return resolved;
  if (resolved.status === "converted" && input.requireFxProvenance !== false) {
    if (!resolved.fxEffectiveDate || !resolved.fxSource) return { ...resolved, accountingAmount: null, status: "unresolved", reason: "missing_historical_fx" };
  }
  return resolved.status === "converted" && !resolved.fxLockedAt
    ? { ...resolved, fxLockedAt: input.now }
    : resolved;
}

export function accountingMoneyFields(value: AccountingMoney): Record<string, unknown> {
  return {
    originalAmount: value.originalAmount,
    originalCurrency: value.originalCurrency,
    accountingAmount: value.accountingAmount,
    accountingCurrency: value.accountingCurrency,
    fxRate: value.fxRate,
    fxRateDirection: value.fxRateDirection,
    fxEffectiveDate: value.fxEffectiveDate,
    fxSource: value.fxSource,
    fxLockedAt: value.fxLockedAt,
    accountingMoneyStatus: value.status,
  };
}
