import { eq } from "drizzle-orm";
import { domainData, type Account } from "../../db/schema";
import { buildAssortmentAnalytics } from "./assortment-analytics";
import { buildProcurementAnalytics } from "./procurement-analytics";
import { accountingCurrencyFromProfile } from "./currency";
import { resolveAccountingMoney } from "./accounting-money";
import {
  canonicalTechCardForOwner,
  reconcileTechCards,
} from "./tech-card-reconciliation";

type JsonRecord = Record<string, unknown>;

export type VenueAIContextPurpose =
  | "diagnosis"
  | "reviews"
  | "incident"
  | "smart"
  | "market"
  | "opportunities"
  | "catalog"
  | "purchase";

export type VenueAIContextFreshness = "fresh" | "aging" | "stale" | "missing";

export type VenueAIContextBlock = {
  id: string;
  label: string;
  available: boolean;
  freshness: VenueAIContextFreshness;
  updatedAt: string | null;
  detail: string;
  missingAction: string | null;
  data: JsonRecord;
};

export type VenueAIContext = {
  version: "venue-ai-context-v1";
  purpose: VenueAIContextPurpose;
  generatedAt: string;
  accountingCurrency: string | null;
  blocks: VenueAIContextBlock[];
  promptData: Record<string, JsonRecord>;
};

export type StoredVenueValue = {
  data: unknown;
  updatedAt: string;
};

export type VenueAIContextSources = {
  accountProfile: JsonRecord;
  accountUpdatedAt?: string | null;
  request?: JsonRecord;
  stores?: Map<string, StoredVenueValue>;
  external?: {
    reviews?: JsonRecord;
    confirmedCompetitors?: unknown[];
  };
  now?: Date;
};

const PURPOSE_BLOCKS: Record<VenueAIContextPurpose, string[]> = {
  diagnosis: [
    "location",
    "format",
    "pricePosition",
    "schedule",
    "performanceHistory",
    "menuAndRecipes",
    "salesAndCost",
    "purchasesAndInventory",
    "team",
    "guestFeedback",
    "seasonalityAndEvents",
    "market",
  ],
  reviews: [
    "location",
    "format",
    "pricePosition",
    "schedule",
    "performanceHistory",
    "menuAndRecipes",
    "team",
    "guestFeedback",
    "seasonalityAndEvents",
  ],
  incident: ["format", "schedule", "performanceHistory", "team", "purchasesAndInventory"],
  smart: ["format", "schedule", "team", "purchasesAndInventory"],
  market: [
    "location",
    "format",
    "pricePosition",
    "schedule",
    "performanceHistory",
    "menuAndRecipes",
    "guestFeedback",
    "seasonalityAndEvents",
    "market",
  ],
  opportunities: [
    "location",
    "format",
    "pricePosition",
    "schedule",
    "performanceHistory",
    "menuAndRecipes",
    "team",
    "seasonalityAndEvents",
  ],
  catalog: ["format", "pricePosition", "menuAndRecipes", "purchasesAndInventory"],
  purchase: ["format", "menuAndRecipes", "purchasesAndInventory"],
};

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", limit = 500): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function iso(value: unknown): string | null {
  const candidate = text(value, "", 40);
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function dateOnly(value: unknown): string | null {
  const candidate = text(value, "", 40);
  const match = candidate.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function zonedDateKey(value: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid legacy timezones fall back to UTC deterministically.
  }
  return value.toISOString().slice(0, 10);
}

function shiftDateKey(value: string, days: number): string {
  const parsed = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!parsed) return value;
  return new Date(Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]) + days, 12))
    .toISOString()
    .slice(0, 10);
}

function maxIso(...values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function latestDateFromRows(rows: unknown[], fields = ["updatedAt", "date", "eventDate", "startDate"]): string | null {
  const dates: string[] = [];
  for (const value of rows) {
    const item = record(value);
    for (const field of fields) {
      const parsed = iso(item[field]);
      if (parsed) dates.push(parsed);
    }
  }
  return maxIso(...dates);
}

function store(sources: VenueAIContextSources, key: string): StoredVenueValue | null {
  return sources.stores?.get(key) ?? null;
}

function statusFor(
  available: boolean,
  updatedAt: string | null,
  now: Date,
  freshDays = 14,
  agingDays = 45,
): VenueAIContextFreshness {
  if (!available) return "missing";
  if (!updatedAt) return "aging";
  const ageDays = Math.max(0, (now.getTime() - Date.parse(updatedAt)) / 86_400_000);
  if (ageDays <= freshDays) return "fresh";
  if (ageDays <= agingDays) return "aging";
  return "stale";
}

function block(input: {
  id: string;
  label: string;
  available: boolean;
  updatedAt: string | null;
  detail: string;
  missingAction: string;
  data: JsonRecord;
  now: Date;
  freshDays?: number;
  agingDays?: number;
}): VenueAIContextBlock {
  return {
    id: input.id,
    label: input.label,
    available: input.available,
    freshness: statusFor(
      input.available,
      input.updatedAt,
      input.now,
      input.freshDays,
      input.agingDays,
    ),
    updatedAt: input.updatedAt,
    detail: input.detail,
    missingAction: input.available ? null : input.missingAction,
    data: input.data,
  };
}

function countsBy(items: unknown[], selector: (item: JsonRecord) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of items) {
    const key = selector(record(value));
    if (!key) continue;
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort((left, right) => right[1] - left[1]).slice(0, 12),
  );
}

function sum(items: unknown[], selector: (item: JsonRecord) => number | null): number {
  return rounded(
    items.reduce<number>((total, value) => total + (selector(record(value)) ?? 0), 0),
    2,
  );
}

function percentOf(amount: number | null, revenue: number | null): number | null {
  if (amount === null || revenue === null || revenue <= 0) return null;
  return rounded(amount / revenue * 100);
}

function monthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function summariseClosedMonths(sources: VenueAIContextSources) {
  const closingStore = store(sources, "bd_month_closings");
  const closings = array(closingStore?.data)
    .map(record)
    .filter((item) => text(item.status) === "closed" && /^\d{4}-\d{2}$/.test(text(item.monthKey)))
    .map((item) => {
      const snapshot = record(item.snapshot);
      const revenue = number(snapshot.revenue);
      const finalProfit = number(snapshot.finalProfit);
      const payroll = number(snapshot.payroll);
      const costOfGoods = number(snapshot.costOfGoods);
      const otherExpenses = number(snapshot.otherExpenses);
      const writeoffs = number(snapshot.writeoffs);
      const taxes = number(snapshot.taxes);
      const utilities = number(snapshot.utilities);
      const components = [
        { id: "costOfGoods", label: "Себестоимость проданного", amount: costOfGoods },
        { id: "payroll", label: "ФОТ", amount: payroll },
        { id: "otherExpenses", label: "Остальные расходы", amount: otherExpenses },
        { id: "writeoffs", label: "Списания", amount: writeoffs },
        { id: "taxes", label: "Налоги", amount: taxes },
        { id: "utilities", label: "Коммунальные услуги", amount: utilities },
      ]
        .filter((component): component is { id: string; label: string; amount: number } => component.amount !== null)
        .map((component) => ({
          ...component,
          shareOfRevenuePercent: percentOf(component.amount, revenue),
        }))
        .sort((left, right) => right.amount - left.amount);
      const sections = array(snapshot.sections)
        .map(record)
        .map((section) => ({
          section: text(section.section, "Без отдела", 80),
          cost: number(section.cost),
        }))
        .filter((section) => section.cost !== null)
        .sort((left, right) => (right.cost ?? 0) - (left.cost ?? 0))
        .slice(0, 8);

      return {
        monthKey: text(item.monthKey),
        periodLabel: monthLabel(text(item.monthKey)),
        closedAt: iso(item.closedAt ?? item.updatedAt),
        revenue,
        finalProfit,
        profitMarginPercent: percentOf(finalProfit, revenue),
        purchasesCash: number(snapshot.purchasePayments ?? snapshot.purchases),
        supplierPayments: number(snapshot.purchasePayments ?? snapshot.purchases),
        legacyPurchaseExpenses: number(snapshot.legacyPurchaseExpenses),
        costOfGoods,
        costOfGoodsSharePercent: percentOf(costOfGoods, revenue),
        payroll,
        payrollSharePercent: percentOf(payroll, revenue),
        otherExpenses,
        otherExpensesSharePercent: percentOf(otherExpenses, revenue),
        writeoffs,
        writeoffsSharePercent: percentOf(writeoffs, revenue),
        taxes,
        utilities,
        openingInventory: number(snapshot.openingInventory),
        closingInventory: number(snapshot.closingInventory),
        cashResult: number(snapshot.cashResult),
        resultBeforeCost: number(snapshot.resultBeforeCost),
        accountedShifts: number(snapshot.accountedShifts),
        expectedShifts: number(snapshot.expectedShifts),
        coveragePercent: number(snapshot.coveragePercent),
        costStructure: components,
        departmentCost: sections,
      };
    })
    .filter((item) => item.finalProfit !== null)
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey));

  const latest = closings[0] ?? null;
  const previous = closings[1] ?? null;
  const delta = (current: number | null, prior: number | null) =>
    current === null || prior === null ? null : rounded(current - prior, 2);
  const changePercent = (current: number | null, prior: number | null) =>
    current === null || prior === null || prior === 0
      ? null
      : rounded((current - prior) / Math.abs(prior) * 100);
  const comparison = latest && previous
    ? {
        basis: "Собственная история заведения",
        previousMonthKey: previous.monthKey,
        previousPeriodLabel: previous.periodLabel,
        revenueDelta: delta(latest.revenue, previous.revenue),
        revenueChangePercent: changePercent(latest.revenue, previous.revenue),
        profitDelta: delta(latest.finalProfit, previous.finalProfit),
        profitChangePercent: changePercent(latest.finalProfit, previous.finalProfit),
        marginDeltaPoints: delta(latest.profitMarginPercent, previous.profitMarginPercent),
        payrollShareDeltaPoints: delta(latest.payrollSharePercent, previous.payrollSharePercent),
        costOfGoodsShareDeltaPoints: delta(
          latest.costOfGoodsSharePercent,
          previous.costOfGoodsSharePercent,
        ),
        otherExpensesShareDeltaPoints: delta(
          latest.otherExpensesSharePercent,
          previous.otherExpensesSharePercent,
        ),
      }
    : null;

  return {
    available: Boolean(latest && latest.finalProfit !== null),
    updatedAt: maxIso(closingStore?.updatedAt, latest?.closedAt),
    latest,
    previous,
    comparison,
    assessmentBasis: previous
      ? "Сравнение с предыдущим закрытым месяцем этого же заведения"
      : latest
        ? "Первый закрытый месяц: это базовая точка, а не доказанная норма"
        : "Закрытых месяцев пока нет",
    guardrails: [
      "Не оценивать ФОТ и расходы по универсальным нормативам без сопоставимой базы",
      "Не повторять финансовый отчёт: выделять только причины результата и управленческие решения",
      "Подробные операции и формулы остаются в разделе финансов и отчётов",
    ],
    history: closings.slice(0, 12).map((item) => ({
      monthKey: item.monthKey,
      periodLabel: item.periodLabel,
      revenue: item.revenue,
      finalProfit: item.finalProfit,
      profitMarginPercent: item.profitMarginPercent,
      payrollSharePercent: item.payrollSharePercent,
      costOfGoodsSharePercent: item.costOfGoodsSharePercent,
      coveragePercent: item.coveragePercent,
    })),
  };
}

function summariseRevenue(request: JsonRecord, sources: VenueAIContextSources, now: Date, timezone: string) {
  const requestFinance = record(request.finance);
  const storedRevenue = store(sources, "bd_finance_revenue");
  const storedExpenses = store(sources, "bd_finance_expenses");
  const storedPayroll = store(sources, "bd_payroll_entries");
  const revenueRows = array(storedRevenue?.data);
  const expenseRows = array(storedExpenses?.data);
  const payrollRows = array(storedPayroll?.data);
  const requestRecent = array(requestFinance.recentDaily);
  const rows = requestRecent.length ? requestRecent : revenueRows;
  const salesDocuments = array(store(sources, "bd_sales_documents")?.data).map(record)
    .filter((item) => !item.status || text(item.status) === "confirmed")
    .sort((left, right) => text(right.date).localeCompare(text(left.date)))
    .slice(0, 90);
  const assortment = record(store(sources, "bd_assortment_v1")?.data);
  const menuItems = array(assortment.menuItems).map(record);
  const menuById = new Map(menuItems.map((item) => [text(item.id), item]));
  const menuByName = new Map(menuItems.map((item) => [text(item.name).toLocaleLowerCase("ru"), item]));
  const today = zonedDateKey(now, timezone);
  const start30 = shiftDateKey(today, -29);
  const start60 = shiftDateKey(today, -59);
  const current = rows.filter((value) => {
    const date = dateOnly(record(value).date);
    return Boolean(date && date >= start30 && date <= today);
  });
  const previous = rows.filter((value) => {
    const date = dateOnly(record(value).date);
    return Boolean(date && date >= start60 && date < start30);
  });
  const revenueOf = (item: JsonRecord) => number(item.revenue ?? item.amount) ?? 0;
  const receiptsOf = (item: JsonRecord) => number(item.receipts ?? item.checks) ?? 0;
  const guestsOf = (item: JsonRecord) => number(item.guests) ?? 0;
  const currentRevenue = sum(current, revenueOf);
  const previousRevenue = sum(previous, revenueOf);
  const monthToDate = record(requestFinance.monthToDate);
  const currentMonthKey = today.slice(0, 7);
  const currentMonthRows = rows.filter((value) => {
    const date = dateOnly(record(value).date);
    return Boolean(date &