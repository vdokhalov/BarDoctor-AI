import { normalizeAccountingCurrency, type AccountingCurrency } from "./currency";
import { resolveAccountingMoney } from "./accounting-money";
import { explicitCostStatus, type CostKnowledgeStatus } from "./cost-knowledge";
import { COST_BASIS_METHOD, resolveCostBasis } from "./cost-basis";

type JsonRecord = Record<string, unknown>;

export const INVENTORY_VALUATION_METHOD = COST_BASIS_METHOD;

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
  costStatus: CostKnowledgeStatus;
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
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
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

function balanceLine(
  balance: JsonRecord,
  accountingCurrency: AccountingCurrency | null,
  receipts: unknown[],
  venueId: number,
  asOf: string,
  requestedWarehouseId?: string | null,
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
  const basis = resolveCostBasis({
    venueId,
    warehouseId: (requestedWarehouseId ?? String(balance.warehouseId ?? balance.warehouseExternalId ?? "")) || undefined,
    nomenclatureItem: { productKey: key, unit },
    asOf,
    receipts,
    accountingCurrency,
  });
  if (!basis.known) {
    return {
      productKey: key,
      name,
      quantity: rawQuantity,
      unit,
      status: "unvalued",
      value: 0,
      currency,
      reason: basis.reason === "CURRENCY_MISMATCH"
        ? "currency_mismatch"
        : basis.reason === "UNIT_MISMATCH"
          ? "broken_base_unit"
          : balance.costNeedsReview === true
            ? "cost_basis_requires_review"
            : reasonFromBalance(balance),
    };
  }
  const value = money(rawQuantity * (basis.value ?? 0));
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

function valuationScopes(balance: JsonRecord, requestedWarehouseId?: string | null): JsonRecord[] {
  const warehouseBalances = record(balance.warehouseBalances);
  const entries = Object.entries(warehouseBalances).filter(([, value]) => {
    const row = record(value);
    return finite(row.current ?? row.quantity ?? row.onHand) !== null;
  });
  if (!entries.length) return [balance];
  const scoped = requestedWarehouseId
    ? entries.filter(([warehouseId]) => warehouseId === requestedWarehouseId)
    : entries;
  return scoped.map(([warehouseId, value]) => {
    const row = record(value);
    return {
      ...balance,
      ...row,
      current: row.current ?? row.quantity ?? row.onHand,
      warehouseId,
    };
  });
}

export function summarizeInventoryValuation(input: {
  balances: unknown;
  accountingCurrency: unknown;
  warehouseId?: string | null;
  stockMovements?: unknown[];
  venueId?: number;
  asOf?: string;
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
    if (!input.warehouseId || Object.keys(record(balance.warehouseBalances)).length > 0) return true;
    const scope = String(balance.warehouseId ?? balance.warehouseExternalId ?? "");
    return !scope || scope === input.warehouseId;
  }).flatMap((balance) => valuationScopes(balance, input.warehouseId));
  const asOf = input.asOf ?? new Date().toISOString();
  const lines = active.map((balance) => balanceLine(
    balance,
    accountingCurrency,
    input.stockMovements ?? [],
    input.venueId ?? Number(balance.venueId ?? 0),
    asOf,
    input.warehouseId,
  ));
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
  const requestedCostStatus = explicitCostStatus(line);
  const accountingCurrency = normalizeAccountingCurrency(input.accountingCurrency);
  const transactionCurrency = normalizedCurrency(document.currency ?? line.currency);
  const quantity = positive(line.quantity);
  const explicitTotal = finite(line.lineTotal ?? line.total);
  const explicitUnitPrice = finite(line.unitPrice ?? line.price);
  const explicitQuantity = finite(line.quantity);
  const hasExplicitTotal = explicitTotal != null && explicitTotal >= 0;
  const hasDerivedTotal = explicitUnitPrice != null && explicitUnitPrice >= 0
    && explicitQuantity != null && explicitQuantity >= 0;
  const hasTransactionAmount = requestedCostStatus !== "UNKNOWN" && (hasExplicitTotal || hasDerivedTotal);
  const transactionAmount = money(hasExplicitTotal
    ? explicitTotal
    : hasDerivedTotal
      ? explicitUnitPrice * quantity
      : 0);
  const unavailable = (
    reason: PurchaseLineAccountingCost["reason"],
  ): PurchaseLineAccountingCost => ({
    known: false,
    costStatus: "UNKNOWN",
    amount: 0,
    accountingCurrency,
    transactionAmount,
    transactionCurrency,
    source: "unavailable",
    reason,
  });
  if (!accountingCurrency) return unavailable("missing_accounting_currency");
  if (!transactionCurrency) return unavailable("missing_document_currency");
  if (!hasTransactionAmount) return unavailable("missing_cost_basis");
  if (transactionCurrency === accountingCurrency) {
    return {
      known: true,
      costStatus: transactionAmount === 0 ? "KNOWN_ZERO" : "KNOWN",
      amount: transactionAmount,
      accountingCurrency,
      transactionAmount,
      transactionCurrency,
      source: "same_currency",
    };
  }
  const canonical = resolveAccountingMoney({
    value: {
      ...document,
      ...line,
      originalAmount: line.originalLineTotal ?? line.lineTotal ?? line.total
        ?? positive(line.unitPrice ?? line.price) * quantity,
      originalCurrency: line.originalCurrency ?? document.originalCurrency ?? transactionCurrency,
      accountingAmount: line.accountingLineTotal,
      accountingCurrency: line.accountingCurrency ?? document.accountingCurrency,
      fxRate: line.fxRate ?? line.exchangeRateToAccounting ?? document.fxRate ?? document.exchangeRateToAccounting,
    },
    accountingCurrency,
  });
  if (canonical?.accountingAmount != null) {
    return {
      known: true,
      costStatus: canonical.accountingAmount === 0 ? "KNOWN_ZERO" : "KNOWN",
      amount: canonical.accountingAmount,
      accountingCurrency,
      transactionAmount,
      transactionCurrency,
      exchangeRate: canonical.fxRate,
      source: line.accountingLineTotal != null ? "stored_normalized_amount" : "stored_historical_rate",
    };
  }
  const normalizedCandidates: Array<[unknown, unknown]> = [
    [line.accountingLineTotal, line.accountingCurrency ?? document.accountingCurrency],
    [line.normalizedLineTotal, line.normalizedCurrency ?? document.normalizedCurrency],
    [line.reportingLineTotal, line.reportingCurrency ?? document.reportingCurrency],
    [line.baseLineTotal, line.baseCurrency ?? document.baseCurrency],
  ];
  for (const [amountValue, currencyValue] of normalizedCandidates) {
    const amount = finite(amountValue);
    if (amount != null && amount >= 0 && normalizedCurrency(currencyValue) === accountingCurrency) {
      return {
        known: true,
        costStatus: amount === 0 ? "KNOWN_ZERO" : "KNOWN",
        amount: money(amount),
        accountingCurrency,
        transactionAmount,
        transactionCurrency,
        source: "stored_normalized_amount",
      };
    }
  }
  const rate = positive(line.exchangeRateToAccounting ?? document.exchangeRateToAccounting);
  if (rate > 0 && transactionAmount >= 0) {
    return {
      known: true,
      costStatus: transactionAmount === 0 ? "KNOWN_ZERO" : "KNOWN",
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
