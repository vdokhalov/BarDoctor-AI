import { normalizeAccountingCurrency, type AccountingCurrency } from "./currency";

type JsonRecord = Record<string, unknown>;

export const INVENTORY_VALUATION_METHOD = "moving_weighted_average" as const;

export type InventoryValuationReason =
  | "negative_stock"
  | "invalid_quantity"
  | "broken_base_unit"
  | "missing_cost_basis"
  | "historical_import_without_cost"
  | "opening_balance_without_cost"
  | "missing_cost_currency"
  | "currency_mismatch"
  | "missing_fx"
  | "cost_basis_requires_review";

export type InventoryValuationLine = {
  productKey: string;
  name: string;
  quantity: number;
  unit: string;
  status: "valued" | "unvalued" | "excluded_zero_stock";
  value: number;
  currency: string;
  reason?: InventoryValuationReason;
};

export type InventoryValuationSummary = {
  accountingCurrency: AccountingCurrency | null;
  method: typeof INVENTORY_VALUATION_METHOD;
  total: number;
  status: "full" | "partial" | "unvalued" | "currency_missing";
  complete: boolean;
  valuedCount: number;
  unvaluedCount: number;
  denominator: number;
  zeroStockExcluded: number;
  breakdown: Partial<Record<InventoryValuationReason, number>>;
  lines: InventoryValuationLine[];
};

export type PurchaseLineAccountingCost = {
  known: boolean;
  amount: number;
  accountingCurrency: AccountingCurrency | null;
  transactionAmount: number;
  transactionCurrency: string;
  exchangeRate?: number;
  source: "same_currency" | "stored_normalized_amount" | "stored_historical_rate" | "unavailable";
  reason?: "missing_accounting_currency" | "missing_document_currency" | "missing_cost_basis" | "missing_fx";
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function finite(value: unknown): number | null {
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positive(value: unknown): number {
  return Math.max(0, finite(value) ?? 0);
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedCurrency(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().slice(0, 12) : "";
}

function productKey(value: JsonRecord): string {
  return String(value.productKey ?? value.key ?? value.id ?? "").trim().slice(0, 300);
}

function reasonFromBalance(balance: JsonRecord): InventoryValuationReason {
  const explicit = String(balance.costReviewReason ?? balance.valuationReason ?? "").trim();
  if (explicit === "missing_fx") return "missing_fx";
  if (explicit === "currency_mismatch") return "currency_mismatch";
  if (explicit === "broken_base_unit" || explicit === "broken_packaging_conversion") {
    return "broken_base_unit";
  }
  const source = String(balance.source ?? balance.metadataSource ?? "").toLocaleLowerCase("ru");
  if (/opening|initial|начальн|входящ/.test(source)) return "opening_balance_without_cost";
  if (/import|excel|csv|1c|1с|legacy/.test(source)) return "historical_import_without_cost";
  return "missing_cost_basis";
}

function normalizedStoredValue(
  balance: JsonRecord,
  accountingCurrency: AccountingCurrency,
): number | null {
  const candidates: Array<[unknown, unknown]> = [
    [balance.accountingInventoryValue, balance.accountingCurrency],
    [balance.normalizedInventoryValue, balance.normalizedCostCurrency ?? balance.normalizedCurrency],
    [balance.reportingInventoryValue, balance.reportingCurrency],
    [balance.baseInventoryValue, balance.baseCurrency],
  ];
  for (const [amountValue, currencyValue] of candidates) {
    const amount = finite(amountValue);
    if (amount == null || amount < 0) continue;
    if (normalizedCurrency(currencyValue) === accountingCurrency) return money(amount);
  }
  return null;
}

function balanceLine(
  balance: JsonRecord,
  accountingCurrency: AccountingCurrency | null,
): InventoryValuationLine {
  const key = productKey(balance);
  const name = String(balance.name ?? balance.productName ?? "Позиция без названия").trim().slice(0, 240);
  const rawQuantity = finite(balance.current ?? balance.quantity ?? balance.onHand);
  const unit = String(balance.unit ?? balance.baseUnit ?? "unknown").trim().toLowerCase();
  const currency = normalizedCurrency(
    balance.accountingCurrency ?? balance.normalizedCostCurrency ?? balance.currency,
  );
  if (rawQuantity == null) {
    return { productKey: key, name, quantity: 0, unit, status: "unvalued", value: 0, currency, reason: "invalid_quantity" };
  }
  if (Math.abs(rawQuantity) < 0.0000001) {
    return { productKey: key, name, quantity: 0, unit, status: "excluded_zero_stock", value: 0, currency };
  }
  if (rawQuantity < 0) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: "negative_stock" };
  }
  if (!["ml", "g", "pcs"].includes(unit)) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: "broken_base_unit" };
  }
  if (!accountingCurrency) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: "missing_cost_currency" };
  }
  const storedNormalized = normalizedStoredValue(balance, accountingCurrency);
  const storedInventoryValue = finite(balance.inventoryValue);
  const averageUnitCost = positive(balance.averageUnitCost);
  const derivedValue = storedInventoryValue != null && storedInventoryValue > 0
    ? money(storedInventoryValue)
    : averageUnitCost > 0
      ? money(rawQuantity * averageUnitCost)
      : 0;
  const value = storedNormalized ?? derivedValue;
  if (balance.costNeedsReview === true) {
    return {
      productKey: key,
      name,
      quantity: rawQuantity,
      unit,
      status: "unvalued",
      value: 0,
      currency,
      reason: reasonFromBalance(balance) === "missing_cost_basis"
        ? "cost_basis_requires_review"
        : reasonFromBalance(balance),
    };
  }
  if (value <= 0) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: reasonFromBalance(balance) };
  }
  if (storedNormalized == null && !currency) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: "missing_cost_currency" };
  }
  if (storedNormalized == null && currency !== accountingCurrency) {
    return { productKey: key, name, quantity: rawQuantity, unit, status: "unvalued", value: 0, currency, reason: "currency_mismatch" };
  }
  return {
    productKey: key,
    name,
    quantity: rawQuantity,
    unit,
    status: "valued",
    value,
    currency: accountingCurrency,
  };
}

export function summarizeInventoryValuation(input: {
  balances: unknown;
  accountingCurrency: unknown;
  warehouseId?: string | null;
}): InventoryValuationSummary {
  const accountingCurrency = normalizeAccountingCurrency(input.accountingCurrency);
  const root = record(input.balances);
  const source = Array.isArray(input.balances)
    ? input.balances
    : Array.isArray(root.stockBalances)
      ? root.stockBalances
      : [];
  const active = source.map(record).filter((balance) => {
    if (balance.archived === true || balance.deleted === true || balance.active === false) return false;
    if (!input.warehouseId) return true;
    const scope = String(balance.warehouseId ?? balance.warehouseExternalId ?? "");
    return !scope || scope === input.warehouseId;
  });
  const lines = active.map((balance) => balanceLine(balance, accountingCurrency));
  const valued = lines.filter((line) => line.status === "valued");
  const unvalued = lines.filter((line) => line.status === "unvalued");
  const zeroStockExcluded = lines.filter((line) => line.status === "excluded_zero_stock").length;
  const breakdown: InventoryValuationSummary["breakdown"] = {};
  for (const line of unvalued) {
    if (!line.reason) continue;
    breakdown[line.reason] = (breakdown[line.reason] ?? 0) + 1;
  }
  const denominator = valued.length + unvalued.length;
  const status = !accountingCurrency
    ? "currency_missing" as const
    : unvalued.length === 0
      ? "full" as const
      : valued.length > 0
        ? "partial" as const
        : "unvalued" as const;
  return {
    accountingCurrency,
    method: INVENTORY_VALUATION_METHOD,
    total: money(valued.reduce((sum, line) => sum + line.value, 0)),
    status,
    complete: status === "full",
    valuedCount: valued.length,
    unvaluedCount: unvalued.length,
    denominator,
    zeroStockExcluded,
    breakdown,
    lines,
  };
}

export function resolvePurchaseLineAccountingCost(input: {
  document: unknown;
  line: unknown;
  accountingCurrency: unknown;
}): PurchaseLineAccountingCost {
  const document = record(input.document);
  const line = record(input.line);
  const accountingCurrency = normalizeAccountingCurrency(input.accountingCurrency);
  const transactionCurrency = normalizedCurrency(document.currency ?? line.currency);
  const quantity = positive(line.quantity);
  const transactionAmount = money(positive(line.lineTotal ?? line.total)
    || positive(line.unitPrice ?? line.price) * quantity);
  const unavailable = (
    reason: PurchaseLineAccountingCost["reason"],
  ): PurchaseLineAccountingCost => ({
    known: false,
    amount: 0,
    accountingCurrency,
    transactionAmount,
    transactionCurrency,
    source: "unavailable",
    reason,
  });
  if (!accountingCurrency) return unavailable("missing_accounting_currency");
  if (!transactionCurrency) return unavailable("missing_document_currency");
  if (transactionCurrency === accountingCurrency) {
    return {
      known: transactionAmount > 0,
      amount: transactionAmount,
      accountingCurrency,
      transactionAmount,
      transactionCurrency,
      source: "same_currency",
      reason: transactionAmount > 0 ? undefined : "missing_cost_basis",
    };
  }
  const normalizedCandidates: Array<[unknown, unknown]> = [
    [line.accountingLineTotal, line.accountingCurrency ?? document.accountingCurrency],
    [line.normalizedLineTotal, line.normalizedCurrency ?? document.normalizedCurrency],
    [line.reportingLineTotal, line.reportingCurrency ?? document.reportingCurrency],
    [line.baseLineTotal, line.baseCurrency ?? document.baseCurrency],
  ];
  for (const [amountValue, currencyValue] of normalizedCandidates) {
    const amount = positive(amountValue);
    if (amount > 0 && normalizedCurrency(currencyValue) === accountingCurrency) {
      return {
        known: true,
        amount: money(amount),
        accountingCurrency,
        transactionAmount,
        transactionCurrency,
        source: "stored_normalized_amount",
      };
    }
  }
  const rate = positive(line.exchangeRateToAccounting ?? document.exchangeRateToAccounting);
  if (rate > 0 && transactionAmount > 0) {
    return {
      known: true,
      amount: money(transactionAmount * rate),
      accountingCurrency,
      transactionAmount,
      transactionCurrency,
      exchangeRate: rate,
      source: "stored_historical_rate",
    };
  }
  return unavailable("missing_fx");
}
