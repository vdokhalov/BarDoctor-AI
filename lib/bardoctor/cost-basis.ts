import type { BaseInventoryUnit, StockMovement } from "./inventory";

export const COST_BASIS_METHOD = "latest_confirmed_receipt" as const;

export type CostBasisStatus = "KNOWN_VALUE" | "KNOWN_ZERO" | "UNKNOWN";

export type CostBasisResolution = {
  method: typeof COST_BASIS_METHOD;
  status: CostBasisStatus;
  known: boolean;
  value: number | null;
  currency?: string;
  baseUnit?: BaseInventoryUnit;
  asOf: string;
  venueId: number;
  warehouseId?: string;
  sourceDocumentId?: string;
  sourceLineId?: string;
  effectiveDate?: string;
  reason?: "NO_APPLICABLE_RECEIPT" | "UNKNOWN_RECEIPT_COST" | "INVALID_BASE_QUANTITY" | "CURRENCY_MISMATCH" | "UNIT_MISMATCH";
};

type ReceiptLike = Pick<StockMovement,
  "type" | "venueId" | "warehouseId" | "productKey" | "amount" | "unit" | "costAmount" | "costStatus" |
  "currency" | "date" | "businessDate" | "sourceDocumentId" | "sourceLineId" | "createdAt" | "status" | "reversedAt"
>;

function finite(value: unknown): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedCurrency(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase().slice(0, 12) : "";
  return normalized || undefined;
}

function rounded(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizedStatus(value: unknown, totalCost: number | null): CostBasisStatus {
  if (value === "UNKNOWN") return "UNKNOWN";
  if (value === "KNOWN_ZERO") return "KNOWN_ZERO";
  if (value === "KNOWN" || value === "KNOWN_VALUE") return totalCost === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE";
  if (totalCost === null) return "UNKNOWN";
  return totalCost === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE";
}

export function normalizeBaseUnitCost(input: {
  baseQuantity: unknown;
  totalCost: unknown;
  costStatus?: unknown;
  currency?: unknown;
  baseUnit?: BaseInventoryUnit;
}): Pick<CostBasisResolution, "status" | "known" | "value" | "currency" | "baseUnit" | "reason"> {
  const baseQuantity = finite(input.baseQuantity);
  const totalCost = finite(input.totalCost);
  const status = normalizedStatus(input.costStatus, totalCost);
  const currency = normalizedCurrency(input.currency);
  if (baseQuantity === null || baseQuantity <= 0) {
    return { status: "UNKNOWN", known: false, value: null, currency, baseUnit: input.baseUnit, reason: "INVALID_BASE_QUANTITY" };
  }
  if (status === "UNKNOWN" || totalCost === null || totalCost < 0) {
    return { status: "UNKNOWN", known: false, value: null, currency, baseUnit: input.baseUnit, reason: "UNKNOWN_RECEIPT_COST" };
  }
  const value = rounded(totalCost / baseQuantity);
  return {
    status: value === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE",
    known: true,
    value,
    currency,
    baseUnit: input.baseUnit,
  };
}

function effectiveDate(receipt: ReceiptLike): string {
  const raw = String(receipt.businessDate ?? receipt.date ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "";
}

function warehouseScope(receipt: ReceiptLike): string {
  return String(receipt.warehouseId ?? "").trim();
}

export function resolveCostBasis(input: {
  venueId: number;
  warehouseId?: string | null;
  nomenclatureItem: string | { productKey?: unknown; key?: unknown; id?: unknown; unit?: unknown };
  asOf: string;
  receipts: unknown[];
  accountingCurrency?: unknown;
  baseUnit?: BaseInventoryUnit;
}): CostBasisResolution {
  const item = typeof input.nomenclatureItem === "string" ? null : input.nomenclatureItem;
  const productKey = String(typeof input.nomenclatureItem === "string"
    ? input.nomenclatureItem
    : item?.productKey ?? item?.key ?? item?.id ?? "").trim();
  const requestedUnit = input.baseUnit ?? (typeof item?.unit === "string" ? item.unit as BaseInventoryUnit : undefined);
  const asOfDate = /^\d{4}-\d{2}-\d{2}/.test(input.asOf) ? input.asOf.slice(0, 10) : "";
  const requestedWarehouse = String(input.warehouseId ?? "").trim();
  const base: CostBasisResolution = {
    method: COST_BASIS_METHOD,
    status: "UNKNOWN",
    known: false,
    value: null,
    asOf: input.asOf,
    venueId: input.venueId,
    warehouseId: requestedWarehouse || undefined,
  };
  const candidates = input.receipts
    .map((value) => value && typeof value === "object" && !Array.isArray(value) ? value as ReceiptLike : null)
    .filter((receipt): receipt is ReceiptLike => Boolean(
      receipt
      && receipt.type === "receipt"
      && receipt.productKey === productKey
      && receipt.status !== "cancelled"
      && !receipt.reversedAt
      && (!receipt.venueId || receipt.venueId === input.venueId)
      && effectiveDate(receipt)
      && (!asOfDate || effectiveDate(receipt) <= asOfDate),
    ));

  let scoped = candidates;
  if (requestedWarehouse) {
    const exact = candidates.filter((receipt) => warehouseScope(receipt) === requestedWarehouse);
    scoped = exact.length
      ? exact
      : candidates.filter((receipt) => !warehouseScope(receipt) || warehouseScope(receipt) === "__venue__");
  }
  scoped.sort((left, right) =>
    effectiveDate(right).localeCompare(effectiveDate(left))
    || String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
    || String(right.sourceDocumentId ?? "").localeCompare(String(left.sourceDocumentId ?? ""))
    || String(right.sourceLineId ?? "").localeCompare(String(left.sourceLineId ?? ""))
  );
  const receipt = scoped[0];
  if (!receipt) return { ...base, reason: "NO_APPLICABLE_RECEIPT" };
  if (requestedUnit && receipt.unit !== requestedUnit) {
    return {
      ...base,
      sourceDocumentId: receipt.sourceDocumentId,
      sourceLineId: receipt.sourceLineId,
      effectiveDate: effectiveDate(receipt),
      baseUnit: receipt.unit,
      reason: "UNIT_MISMATCH",
    };
  }
  const normalized = normalizeBaseUnitCost({
    baseQuantity: receipt.amount,
    totalCost: receipt.costAmount,
    costStatus: receipt.costStatus,
    currency: receipt.currency,
    baseUnit: receipt.unit,
  });
  const accountingCurrency = normalizedCurrency(input.accountingCurrency);
  if (normalized.known && accountingCurrency && normalized.currency !== accountingCurrency) {
    return {
      ...base,
      currency: normalized.currency,
      baseUnit: receipt.unit,
      sourceDocumentId: receipt.sourceDocumentId,
      sourceLineId: receipt.sourceLineId,
      effectiveDate: effectiveDate(receipt),
      reason: "CURRENCY_MISMATCH",
    };
  }
  return {
    ...base,
    ...normalized,
    sourceDocumentId: receipt.sourceDocumentId,
    sourceLineId: receipt.sourceLineId,
    effectiveDate: effectiveDate(receipt),
  };
}
