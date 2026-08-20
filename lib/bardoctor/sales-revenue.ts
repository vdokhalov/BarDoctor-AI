import type { SalesDocument } from "./sales";

export const REVENUE_STORE_KEY = "bd_finance_revenue";

type JsonRecord = Record<string, unknown>;

export type SalesRevenueReconciliation =
  | {
      ok: true;
      revenues: unknown[];
      revenueRecord: JsonRecord;
      before: JsonRecord | null;
      action: "create" | "update";
    }
  | {
      ok: false;
      code: "REVENUE_DATE_CONFLICT";
      error: string;
    };

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(Math.max(0, amount) * 100) / 100 : 0;
}

/**
 * Makes confirmed sales documents the daily revenue source without adding a
 * second finance row for a day that was already closed manually.
 */
export function reconcileSalesRevenue(input: {
  revenues: unknown[];
  salesDocuments: unknown[];
  document: SalesDocument;
  now: string;
}): SalesRevenueReconciliation {
  const byId = new Map<string, JsonRecord>();
  for (const value of [...input.salesDocuments, input.document]) {
    const item = record(value);
    if (!item || item.status !== "confirmed" || item.date !== input.document.date) continue;
    const id = String(item.id ?? "").trim();
    if (id) byId.set(id, item);
  }
  const dailyDocuments = [...byId.values()];
  const revenue = Math.round(
    dailyDocuments.reduce((sum, item) => sum + money(item.totalRevenue), 0) * 100,
  ) / 100;
  const knownChecks = dailyDocuments
    .map((item) => Number(item.checks))
    .filter((value) => Number.isFinite(value) && value > 0);
  const receipts = knownChecks.reduce((sum, value) => sum + Math.round(value), 0);
  const matching = input.revenues
    .map((value, index) => ({ value: record(value), index }))
    .filter((item): item is { value: JsonRecord; index: number } =>
      Boolean(item.value && item.value.date === input.document.date)
    );
  if (matching.length > 1) {
    return {
      ok: false,
      code: "REVENUE_DATE_CONFLICT",
      error: "На эту дату найдено несколько смен. Объедините дубли перед проведением POS-отчёта.",
    };
  }

  const previous = matching[0]?.value ?? null;
  const sourceSystems = [...new Set(
    dailyDocuments.map((item) => String(item.sourceSystem ?? "").trim()).filter(Boolean),
  )].sort();
  const salesDocumentIds = [...byId.keys()].sort();
  const revenueRecord: JsonRecord = {
    ...(previous ?? {}),
    id: previous?.id ?? `sales-revenue:${input.document.date}`,
    date: input.document.date,
    accountingMonth: previous?.accountingMonth ?? input.document.date.slice(0, 7),
    revenue,
    receipts: knownChecks.length ? receipts : money(previous?.receipts),
    revenueSource: "sales_documents",
    salesDocumentIds,
    salesSourceSystems: sourceSystems,
    createdAt: previous?.createdAt ?? input.now,
    updatedAt: input.now,
  };
  const revenues = [...input.revenues];
  if (matching[0]) revenues[matching[0].index] = revenueRecord;
  else revenues.unshift(revenueRecord);
  return {
    ok: true,
    revenues,
    revenueRecord,
    before: previous,
    action: previous ? "update" : "create",
  };
}
