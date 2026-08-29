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
    return Boolean(date && date >= `${currentMonthKey}-01` && date <= today);
  });
  const currentMonthExpenses = expenseRows.filter((value) => {
    const item = record(value);
    const date = dateOnly(item.date);
    const accountingMonth = text(item.accountingMonth, date?.slice(0, 7) ?? "", 7);
    return accountingMonth === currentMonthKey
      && (!date || date <= today)
      && !["cancelled", "void", "draft"].includes(text(item.status, "posted", 30));
  });
  const currentMonthPayrollEntries = payrollRows.filter((value) => {
    const item = record(value);
    const date = dateOnly(item.date);
    return Boolean(date && date >= `${currentMonthKey}-01` && date <= today)
      && !["cancelled", "void", "draft"].includes(text(item.status, "posted", 30));
  });
  const storedMonthRevenue = sum(currentMonthRows, revenueOf);
  const storedMonthReceipts = sum(currentMonthRows, receiptsOf);
  const storedMonthGuests = sum(currentMonthRows, guestsOf);
  const storedMonthNonPayrollExpenses = sum(currentMonthExpenses, (value) => {
    const item = record(value);
    if (text(item.category, "", 50) === "payroll") return 0;
    return number(item.accountingAmount ?? item.amount) ?? 0;
  });
  const storedMonthPayrollByShift = sum(currentMonthRows, (value) => {
    const item = record(value);
    const payroll = record(item.payrollBreakdown);
    return number(payroll.total ?? payroll.totalPayroll) ?? 0;
  });
  const storedMonthPayrollExpenses = sum(currentMonthExpenses, (value) => {
    const item = record(value);
    if (text(item.category, "", 50) !== "payroll") return 0;
    return number(item.accountingAmount ?? item.amount) ?? 0;
  });
  const storedMonthPayrollBonuses = sum(currentMonthPayrollEntries, (value) => {
    const item = record(value);
    return text(item.type, "", 50) === "bonus" ? number(item.amount) ?? 0 : 0;
  });
  // This mirrors the Finance report's source precedence: calculated payroll
  // from completed shifts wins over manually entered payroll expenses, and
  // confirmed bonuses are added once. Payments/deductions affect settlement,
  // not the accrued preliminary operating result.
  const storedMonthPayroll = (storedMonthPayrollByShift > 0
    ? storedMonthPayrollByShift
    : storedMonthPayrollExpenses) + storedMonthPayrollBonuses;
  const effectiveRevenue = number(monthToDate.revenue) ?? storedMonthRevenue;
  const effectiveReceipts = number(monthToDate.receipts) ?? storedMonthReceipts;
  const effectivePayroll = number(monthToDate.payroll) ?? storedMonthPayroll;
  const effectiveExpenses = number(monthToDate.expenses)
    ?? rounded(storedMonthNonPayrollExpenses + effectivePayroll, 2);
  const effectiveResult = number(monthToDate.result ?? monthToDate.preliminaryResult ?? monthToDate.cashResult)
    ?? rounded(effectiveRevenue - effectiveExpenses, 2);
  const closedMonths = summariseClosedMonths(sources);

  return {
    tracked: requestFinance.tracked === true
      || rows.length > 0
      || expenseRows.length > 0
      || closedMonths.available,
    period: {
      monthKey: currentMonthKey,
      periodLabel: `Текущий месяц · ${monthLabel(currentMonthKey)}`,
      startDate: `${currentMonthKey}-01`,
      endDate: today,
      updatedAt: maxIso(
        storedRevenue?.updatedAt,
        storedExpenses?.updatedAt,
        storedPayroll?.updatedAt,
        latestDateFromRows(rows),
        latestDateFromRows(payrollRows),
      ),
      revenue: effectiveRevenue,
      receipts: effectiveReceipts,
      guests: (number(monthToDate.guests) ?? storedMonthGuests) || null,
      averageReceipt: number(monthToDate.avgReceipt)
        ?? (effectiveReceipts > 0 ? rounded(effectiveRevenue / effectiveReceipts, 2) : null),
      expenses: effectiveExpenses,
      payroll: effectivePayroll,
      result: effectiveResult,
      sampleSize: currentMonthRows.length,
    },
    last30Days: {
      shifts: current.length,
      revenue: currentRevenue,
      previousRevenue,
      revenueChangePercent: previousRevenue > 0
        ? rounded((currentRevenue - previousRevenue) / previousRevenue * 100)
        : null,
    },
    recentDaily: rows
      .map((value) => record(value))
      .sort((left, right) => text(right.date).localeCompare(text(left.date)))
      // Comparable weekday baselines need enough history to avoid comparing a
      // Saturday with an arbitrary recent weekday.
      .slice(0, 90)
      .map((item) => ({
        date: dateOnly(item.date),
        revenue: revenueOf(item),
        receipts: receiptsOf(item),
        guests: number(item.guests),
        avgReceipt: number(item.avgReceipt ?? item.averageReceipt)
          ?? (receiptsOf(item) > 0 ? rounded(revenueOf(item) / receiptsOf(item), 2) : null),
      })),
    hourly: [
      ...array(requestFinance.hourly),
      ...rows.flatMap((value) => {
        const item = record(value);
        const date = dateOnly(item.date);
        return array(item.hourly ?? item.hours ?? item.byHour).map((raw) => ({ ...record(raw), date }));
      }),
    ].slice(0, 1_200),
    salesDocuments: salesDocuments.map((document) => ({
      id: text(document.id, "", 100) || null,
      date: dateOnly(document.date),
      status: text(document.status, "confirmed", 30),
      checks: number(document.checks ?? document.receipts),
      totalRevenue: number(document.totalRevenue ?? document.revenue),
      items: array(document.items).map(record).slice(0, 1_000).map((item) => {
        const menu = menuById.get(text(item.menuItemId))
          ?? menuByName.get(text(item.name ?? item.productName).toLocaleLowerCase("ru"));
        return {
          name: text(item.name ?? item.productName, "Позиция", 140),
          menuItemId: text(item.menuItemId, "", 100) || null,
          category: text(item.category ?? item.categoryName ?? menu?.category, "Без категории", 100),
          quantity: number(item.quantity),
          grossSales: number(item.grossSales ?? item.revenue ?? item.lineTotal),
        };
      }),
    })),
    expenseCategories: countsBy(expenseRows, (item) => text(item.category, "other", 60)),
    latestClosedMonth: closedMonths.latest,
    previousClosedMonth: closedMonths.previous,
    closedMonthComparison: closedMonths.comparison,
    closedMonthHistory: closedMonths.history,
    latestAt: maxIso(
      storedRevenue?.updatedAt,
      storedExpenses?.updatedAt,
      latestDateFromRows(rows),
      closedMonths.updatedAt,
    ),
  };
}

function summariseMenu(sources: VenueAIContextSources, now: Date) {
  const stored = store(sources, "bd_assortment_v1");
  const purchaseDocuments = array(store(sources, "bd_purchase_documents")?.data);
  const reconciliation = reconcileTechCards({
    assortment: stored?.data,
    purchaseDocuments,
    now,
  });
  const root = record(reconciliation.assortment);
  const menuItems = array(root.menuItems).map(record);
  const recipes = array(root.recipes).map(record);
  const groups = array(root.groups).map(record);
  const subgroups = array(root.subgroups).map(record);
  const activeItems = menuItems.filter((item) => item.active !== false);
  const recipeByMenuItem = new Map(activeItems.map((item) => [
    text(item.id),
    canonicalTechCardForOwner(item.id, recipes),
  ]));
  const confirmedRecipes = recipes.filter((recipe) =>
    recipe.current === true && text(recipe.reviewStatus) === "approved"
  );
  const recipeRequiredItems = activeItems.filter((item) => text(item.type) !== "service");
  const prices = activeItems.map((item) => number(item.salePrice)).filter((value): value is number => value !== null);
  const samples = activeItems
    .map((item) => {
      const recipe = recipeByMenuItem.get(text(item.id));
      return {
        name: text(item.name, "Позиция", 120),
        department: text(item.department, "other", 40),
        category: text(item.category, "Без подраздела", 80),
        salePrice: number(item.salePrice),
        plannedSales: number(item.plannedSales),
        recipeStatus: text(recipe?.status, recipe ? "draft" : "missing", 30),
        techCardStatus: text(recipe?.reviewStatus, recipe ? "requires_review" : "missing", 40),
        ingredientCount: array(recipe?.ingredients).length,
      };
    })
    .sort((left, right) => (right.plannedSales ?? 0) - (left.plannedSales ?? 0))
    .slice(0, 15);
  const missingRecipeNames = activeItems
    .filter((item) => text(item.type) !== "service" && !recipeByMenuItem.has(text(item.id)))
    .slice(0, 12)
    .map((item) => text(item.name, "Позиция", 120));
  const analytics = buildAssortmentAnalytics({
    assortment: stored?.data,
    purchaseDocuments,
    salesDocuments: array(store(sources, "bd_sales_documents")?.data),
    financeRevenue: array(store(sources, "bd_finance_revenue")?.data),
    now,
  });

  return {
    available: menuItems.length > 0,
    updatedAt: maxIso(stored?.updatedAt, iso(root.updatedAt)),
    data: {
      groups: groups.length,
      subgroups: subgroups.length,
      items: menuItems.length,
      activeItems: activeItems.length,
      byDepartment: countsBy(activeItems, (item) => text(item.department, "other", 40)),
      recipes: recipes.length,
      confirmedRecipes: confirmedRecipes.length,
      recipeCoveragePercent: recipeRequiredItems.length
        ? rounded(confirmedRecipes.length / recipeRequiredItems.length * 100)
        : 0,
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      sample: samples,
      missingRecipeNames,
      readiness: analytics.readiness,
      qualityCounts: analytics.counts,
      techCardReconciliation: reconciliation.report,
      economics: analytics.economics,
      assortmentSignals: analytics.signals,
      purchaseNeeds: analytics.needs,
      valuation: analytics.valuation,
      assortmentAIContext: analytics.aiContext,
      fullMenuSentToAI: false,
    },
  };
}

function summarisePurchasesAndInventory(
  sources: VenueAIContextSources,
  now: Date,
  accountingCurrency: string | null,
  timezone: string,
) {
  const purchaseStore = store(sources, "bd_purchase_documents");
  const supplierStore = store(sources, "bd_suppliers");
  const inventoryStore = store(sources, "bd_inventory_snapshots");
  const assortmentStore = store(sources, "bd_assortment_v1");
  const expenseStore = store(sources, "bd_finance_expenses");
  const stockMovementStore = store(sources, "bd_stock_movements");
  const supplierAlternativeStore = store(sources, "bd_supplier_alternatives_v1");
  const writeOffStore = store(sources, "bd_inventory_writeoffs");
  const documents = array(purchaseStore?.data).map(record);
  const postedDocuments = documents.filter((item) =>
    text(item.status) === "confirmed" && text(item.documentType) !== "price_list"
  );
  const resolvedDocuments = postedDocuments.map((document) => ({
    document,
    money: accountingCurrency ? resolveAccountingMoney({ value: document, accountingCurrency }) : null,
  }));
  const confirmed = resolvedDocuments
    .filter((entry) => !accountingCurrency || entry.money?.accountingAmount != null)
    .map((entry) => ({
      ...entry.document,
      originalAmount: entry.money?.originalAmount,
      originalCurrency: entry.money?.originalCurrency,
      accountingAmount: entry.money?.accountingAmount,
      accountingCurrency,
      total: entry.money?.accountingAmount ?? entry.document.total,
    } as JsonRecord));
  const unconverted = resolvedDocuments.filter((entry) =>
    accountingCurrency && entry.money?.accountingAmount == null
  );
  const priceLists = documents.filter((item) =>
    text(item.status) === "confirmed" && text(item.documentType) === "price_list"
  );
  const suppliers = array(supplierStore?.data).map(record);
  const procurement = buildProcurementAnalytics({
    documents,
    suppliers,
    expenses: array(expenseStore?.data),
    stockMovements: array(stockMovementStore?.data),
    supplierAlternatives: supplierAlternativeStore?.data,
    accountingCurrency,
    now,
  });
  const cutoff = shiftDateKey(zonedDateKey(now, timezone), -60);
  const recent = confirmed.filter((item) => (dateOnly(item.date) ?? "") >= cutoff);
  const purchaseItems = recent.flatMap((document) =>
    array(document.items).map((value) => ({ document, item: record(value) })),
  );
  const spendByProduct = new Map<string, { name: string; spend: number; quantity: number; lastPrice: number | null }>();
  for (const { document, item } of purchaseItems) {
    const name = text(item.name, "Позиция", 140);
    const key = name.toLocaleLowerCase("ru");
    const current = spendByProduct.get(key) ?? { name, spend: 0, quantity: 0, lastPrice: null };
    const originalDocumentAmount = number(document.originalAmount ?? document.total) ?? 0;
    const accountingDocumentAmount = number(document.accountingAmount ?? document.total) ?? 0;
    const documentRate = number(document.fxRate ?? document.exchangeRateToAccounting)
      ?? (originalDocumentAmount > 0 ? accountingDocumentAmount / originalDocumentAmount : 0);
    const accountingLineTotal = number(item.accountingLineTotal)
      ?? ((number(item.lineTotal) ?? 0) * documentRate);
    current.spend += accountingLineTotal;
    current.quantity += number(item.quantity) ?? 0;
    current.lastPrice = (number(item.quantity) ?? 0) > 0
      ? accountingLineTotal / (number(item.quantity) ?? 1)
      : current.lastPrice;
    spendByProduct.set(key, current);
  }
  const inventorySnapshots = array(inventoryStore?.data).map(record);
  const latestSnapshot = inventorySnapshots
    .slice()
    .sort((left, right) => text(right.date ?? right.updatedAt).localeCompare(text(left.date ?? left.updatedAt)))[0];
  const assortment = record(assortmentStore?.data);
  const stockBalances = array(assortment.stockBalances).map(record);
  const lowStock = stockBalances
    .filter((item) => {
      const current = number(item.current ?? item.balance ?? item.quantity);
      const safety = number(item.safety ?? item.minimum ?? item.minStock);
      return current !== null && (current <= 0 || (safety !== null && current <= safety));
    })
    .slice(0, 15)
    .map((item) => ({
      name: text(item.name, "Товар", 120),
      current: number(item.current ?? item.balance ?? item.quantity),
      safety: number(item.safety ?? item.minimum ?? item.minStock),
      unit: text(item.unit, "", 24),
    }));
  const available = confirmed.length > 0 || inventorySnapshots.length > 0 || stockBalances.length > 0;
  const writeOffDocuments = array(writeOffStore?.data).map(record).filter((item) => ["posted", "confirmed"].includes(text(item.status, "", 30)));
  const writeOffCutoff = shiftDateKey(zonedDateKey(now, timezone), -30);
  const recentWriteOffs = writeOffDocuments.filter((item) => (dateOnly(item.date) ?? "") >= writeOffCutoff);
  const writeOffItems: JsonRecord[] = recentWriteOffs.flatMap((document) => array(document.items).map((item): JsonRecord => ({ ...record(item), reasonCode: text(document.reasonCode, "other", 50), actor: text(record(document.createdBy).name, "Не указан", 120) })));
  const writeOffCost = sum(recentWriteOffs, (item) => number(item.totalCost));

  return {
    available,
    updatedAt: maxIso(
      purchaseStore?.updatedAt,
      supplierStore?.updatedAt,
      inventoryStore?.updatedAt,
      assortmentStore?.updatedAt,
      expenseStore?.updatedAt,
      stockMovementStore?.updatedAt,
      supplierAlternativeStore?.updatedAt,
      writeOffStore?.updatedAt,
      latestDateFromRows(confirmed, ["confirmedAt", "updatedAt", "date"]),
    ),
    data: {
      suppliers: suppliers.length,
      confirmedDocuments: confirmed.length,
      unconvertedForeignCurrencyDocuments: unconverted.length,
      financialDataComplete: unconverted.length === 0,
      accountingCurrency,
      confirmedPriceLists: priceLists.length,
      recentDocuments60Days: recent.length,
      recentSpend60Days: sum(recent, (item) => number(item.total)),
      byCategory: countsBy(recent, (item) => text(item.expenseCategory, "other", 50)),
      topProducts: [...spendByProduct.values()]
        .sort((left, right) => right.spend - left.spend)
        .slice(0, 12)
        .map((item) => ({ ...item, spend: rounded(item.spend, 2), quantity: rounded(item.quantity, 3) })),
      inventorySnapshots: inventorySnapshots.length,
      latestInventoryDate: latestSnapshot ? dateOnly(latestSnapshot.date ?? latestSnapshot.updatedAt) : null,
      latestInventoryTotals: latestSnapshot
        ? record(latestSnapshot.totals ?? latestSnapshot.amounts ?? latestSnapshot.areas)
        : {},
      trackedStockItems: stockBalances.length,
      lowStock,
      procurement: procurement.aiContext,
      procurementSignals: procurement.signals.slice(0, 12),
      procurementIntegrity: procurement.integrity,
      writeOffs: {
        canonicalSource: "bd_inventory_writeoffs",
        postedDocuments: writeOffDocuments.length,
        last30DaysDocuments: recentWriteOffs.length,
        last30DaysItems: writeOffItems.length,
        last30DaysKnownCost: writeOffCost,
        unvaluedItems: writeOffItems.filter((item) => item.totalCost == null || text(item.costStatus) === "unvalued").length,
        byReason: countsBy(recentWriteOffs, (item) => text(item.reasonCode, "other", 50)),
        byProduct: countsBy(writeOffItems, (item) => text(item.productName ?? item.name, "Товар", 120)),
        byEmployee: countsBy(writeOffItems, (item) => text(item.actor, "Не указан", 120)),
        analyticsReady: true,
      },
    },
  };
}

function summariseTeam(request: JsonRecord, sources: VenueAIContextSources) {
  const employeeStore = store(sources, "bd_employees");
  const payrollStore = store(sources, "bd_payroll_entries");
  const employees = array(employeeStore?.data).map(record);
  const requestSummary = record(request.employees);
  const active = employees.filter((item) => text(item.status, "active") === "active");
  const payroll = array(payrollStore?.data).map(record);
  const total = number(requestSummary.total) ?? employees.length;
  const activeTotal = number(requestSummary.active) ?? active.length;
  return {
    available: total > 0,
    updatedAt: maxIso(
      employeeStore?.updatedAt,
      payrollStore?.updatedAt,
      latestDateFromRows(employees),
      latestDateFromRows(payroll),
    ),
    data: {
      total,
      active: activeTotal,
      onLeave: number(requestSummary.onLeave),
      departments: countsBy(active, (item) => text(item.department, "Не указан", 80)),
      positions: countsBy(active, (item) => text(item.position ?? item.role, "Не указана", 80)),
      recentPayrollEntries: payroll.length,
      requestDetails: array(request.employeeDetails).slice(0, 20),
    },
  };
}

function summariseReviews(sources: VenueAIContextSources) {
  const reviewStore = store(sources, "bd_guest_reviews");
  const external = record(sources.external?.reviews);
  const storedReviews = array(reviewStore?.data).map(record);
  const ratings = storedReviews
    .map((item) => number(item.rating))
    .filter((value): value is number => value !== null);
  const total = number(external.total) ?? storedReviews.length;
  const averageRating = number(external.averageRating)
    ?? (ratings.length ? rounded(ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : null);
  const negative = number(external.negative)
    ?? storedReviews.filter((item) => text(item.sentiment) === "negative" || (number(item.rating) ?? 5) <= 2).length;
  return {
    available: total > 0,
    updatedAt: maxIso(
      reviewStore?.updatedAt,
      iso(external.lastUpdatedAt),
      latestDateFromRows(storedReviews),
    ),
    data: {
      total,
      averageRating,
      positive: number(external.positive),
      neutral: number(external.neutral),
      negative,
      commonTopics: array(external.commonTopics).slice(0, 8),
      recent: array(external.recent).slice(0, 12),
    },
  };
}

function summariseSeasonality(request: JsonRecord, sources: VenueAIContextSources, now: Date, timezone: string) {
  const opportunityStore = store(sources, "bd_opportunity_calendar_v1");
  const calendar = record(opportunityStore?.data);
  const today = zonedDateKey(now, timezone);
  const horizon = shiftDateKey(today, 60);
  const upcoming = array(calendar.events)
    .map(record)
    .filter((item) => {
      const date = dateOnly(item.startDate ?? item.eventDate);
      return Boolean(date && date >= today && date <= horizon && text(item.decision) !== "dismissed");
    })
    .sort((left, right) => text(left.startDate).localeCompare(text(right.startDate)))
    .slice(0, 12)
    .map((item) => ({
      id: text(item.id, "", 140) || null,
      title: text(item.title, "Событие", 150),
      date: dateOnly(item.startDate ?? item.eventDate),
      startDate: dateOnly(item.startDate ?? item.eventDate),
      endDate: dateOnly(item.endDate),
      startTime: text(item.startTime, "", 16) || null,
      endTime: text(item.endTime, "", 16) || null,
      activationDate: dateOnly(item.activationDate),
      category: text(item.category, "other", 40),
      potentialScore: number(item.potentialScore),
      decision: text(item.decision, "watching", 30),
      location: text(item.location ?? item.address, "", 180) || null,
      lat: number(item.lat ?? item.latitude),
      lng: number(item.lng ?? item.longitude),
      distanceKm: number(item.distanceKm),
      relation: record(item.relation),
      sourceUrls: array(item.sourceUrls)
        .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
        .slice(0, 4),
    }));
  const recentDaily = array(record(request.finance).recentDaily).map(record);
  const weekday = new Map<number, { revenue: number; shifts: number }>();
  for (const item of recentDaily) {
    const date = dateOnly(item.date);
    if (!date) continue;
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    const current = weekday.get(day) ?? { revenue: 0, shifts: 0 };
    current.revenue += number(item.revenue) ?? 0;
    current.shifts += 1;
    weekday.set(day, current);
  }
  const weekdayPattern = [...weekday.entries()].map(([day, value]) => ({
    day,
    shifts: value.shifts,
    averageRevenue: value.shifts ? rounded(value.revenue / value.shifts, 2) : 0,
  }));
  const available = upcoming.length > 0 || recentDaily.length >= 4;
  return {
    available,
    updatedAt: maxIso(
      opportunityStore?.updatedAt,
      iso(calendar.generatedAt),
      latestDateFromRows(recentDaily),
    ),
    data: {
      upcomingEvents60Days: upcoming,
      weekdayPattern,
      operationalCalendar: record(request.operatingCalendar),
    },
  };
}

function summariseMarket(sources: VenueAIContextSources) {
  const marketStore = store(sources, "bd_market_analysis_v1");
  const market = record(marketStore?.data);
  const externalCompetitors = array(sources.external?.confirmedCompetitors).map(record);
  const storedCompetitors = array(market.competitors).map(record).filter((item) => item.confirmed === true);
  const competitors = externalCompetitors.length ? externalCompetitors : storedCompetitors;
  return {
    available: competitors.length > 0 || Object.keys(market).length > 0,
    updatedAt: maxIso(marketStore?.updatedAt, iso(market.refreshedAt ?? market.generatedAt)),
    data: {
      confirmedCompetitors: competitors.slice(0, 12).map((item) => ({
        key: text(item.key, "", 300) || null,
        name: text(item.name, "Конкурент", 140),
        category: text(item.category, "Заведение", 80),
        relation: text(item.relation, "alternative", 40),
        rating: number(item.rating) ?? (text(item.rating, "", 30) || null),
        distance: text(item.distance, "", 80) || null,
        distanceKm: number(item.distanceKm),
        lat: number(item.lat ?? item.latitude),
        lng: number(item.lng ?? item.longitude),
        eventDistanceKm: number(item.eventDistanceKm),
        openingHours: record(item.openingHours ?? item.schedule),
        audienceOverlap: number(item.audienceOverlap),
        strengths: array(item.strengths).slice(0, 5),
        gaps: array(item.gaps).slice(0, 5),
        sourceUrls: array(item.sourceUrls)
          .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
          .slice(0, 6),
      })),
      audience: record(market.audience),
      economy: record(market.economy),
      positioning: record(market.positioning),
    },
  };
}

export function buildVenueAIContextFromSources(
  purpose: VenueAIContextPurpose,
  sources: VenueAIContextSources,
): VenueAIContext {
  const now = sources.now ?? new Date();
  const generatedAt = now.toISOString();
  const request = sources.request ?? {};
  const requestProfile = record(request.profile);
  const profile = { ...sources.accountProfile, ...requestProfile };
  const timezone = text(profile.timezone, "Europe/Chisinau", 80);
  const accountingCurrency = accountingCurrencyFromProfile(profile);
  const menu = summariseMenu(sources, now);
  const revenue = summariseRevenue(request, sources, now, timezone);
  const purchases = summarisePurchasesAndInventory(sources, now, accountingCurrency, timezone);
  const team = summariseTeam(request, sources);
  const reviews = summariseReviews(sources);
  const seasonality = summariseSeasonality(request, sources, now, timezone);
  const market = summariseMarket(sources);
  const profileAt = maxIso(sources.accountUpdatedAt, iso(profile.updatedAt));
  const hasLocation = Boolean(text(profile.country) || text(profile.region) || text(profile.city) || text(profile.address));
  const hasFormat = Boolean(text(profile.businessType) || text(profile.venueFormat) || text(profile.concept));
  const hasSchedule = Boolean(text(profile.openTime) || text(profile.closeTime) || Object.keys(record(profile.workingDays)).length);
  const priceSegment = text(profile.priceSegment ?? profile.priceTier ?? profile.priceCategory);
  const menuPriceRange = record(menu.data.priceRange);
  const hasPrices = priceSegment.length > 0 || number(menuPriceRange.min) !== null;
  const recipeCoverage = number(menu.data.recipeCoveragePercent) ?? 0;
  const latestClosedMonth = record(revenue.latestClosedMonth);
  const latestClosedProfit = number(latestClosedMonth.finalProfit);
  const latestClosedMargin = number(latestClosedMonth.profitMarginPercent);
  const latestClosedCost = number(latestClosedMonth.costOfGoods);
  const assortmentAI = record(menu.data.assortmentAIContext);
  const hasCost = latestClosedCost !== null
    || array(assortmentAI.confirmedMenuEconomics).length > 0;

  const blocks = [
    block({
      id: "location",
      label: "Местоположение",
      available: hasLocation,
      updatedAt: profileAt,
      detail: hasLocation
        ? [text(profile.country), text(profile.region), text(profile.city), text(profile.district ?? profile.address)].filter(Boolean).join(", ")
        : "Страна, регион, город и район не заполнены",
      missingAction: "Заполнить страну, город и район в профиле заведения",
      data: {
        country: text(profile.country) || null,
        region: text(profile.region) || null,
        city: text(profile.city) || null,
        district: text(profile.district ?? profile.address) || null,
        lat: number(profile.lat ?? profile.latitude),
        lng: number(profile.lng ?? profile.longitude),
      },
      now,
      freshDays: 90,
      agingDays: 365,
    }),
    block({
      id: "format",
      label: "Формат и концепция",
      available: hasFormat,
      updatedAt: profileAt,
      detail: [text(profile.businessType), text(profile.venueFormat), text(profile.concept)].filter(Boolean).join(" · ") || "Формат и концепция не заполнены",
      missingAction: "Указать формат и концепцию заведения",
      data: {
        name: text(profile.name) || null,
        businessType: text(profile.businessType) || null,
        venueFormat: text(profile.venueFormat) || null,
        concept: text(profile.concept) || null,
        seats: number(profile.seats),
        areas: array(profile.areas).slice(0, 12),
        accountingCurrency,
      },
      now,
      freshDays: 90,
      agingDays: 365,
    }),
    block({
      id: "pricePosition",
      label: "Ценовой сегмент",
      available: hasPrices,
      updatedAt: maxIso(profileAt, menu.updatedAt),
      detail: priceSegment
        ? `Указан сегмент: ${priceSegment}`
        : number(menuPriceRange.min) !== null
          ? `Сегмент не указан; цены меню от ${number(menuPriceRange.min)} до ${number(menuPriceRange.max)}`
          : "Нет ценового сегмента и цен меню",
      missingAction: "Указать ценовой сегмент или загрузить цены меню",
      data: {
        declaredSegment: priceSegment || null,
        menuPriceRange: Object.keys(menuPriceRange).length ? menuPriceRange : null,
        note: priceSegment ? "Сегмент задан владельцем" : "Сегмент нельзя определять только по диапазону цен",
      },
      now,
      freshDays: 30,
      agingDays: 120,
    }),
    block({
      id: "schedule",
      label: "График работы",
      available: hasSchedule,
      updatedAt: profileAt,
      detail: hasSchedule
        ? `${text(profile.openTime, "—")}–${text(profile.closeTime, "—")} · рабочие дни учтены`
        : "График работы не заполнен",
      missingAction: "Заполнить часы и рабочие дни",
      data: {
        openTime: text(profile.openTime) || null,
        closeTime: text(profile.closeTime) || null,
        timezone: text(profile.timezone, "Europe/Chisinau", 80),
        workingDays: record(profile.workingDays),
        currentStatus: record(request.operatingCalendar),
      },
      now,
      freshDays: 90,
      agingDays: 365,
    }),
    block({
      id: "performanceHistory",
      label: "История показателей",
      available: revenue.tracked,
      updatedAt: revenue.latestAt,
      detail: latestClosedProfit !== null
        ? `${text(latestClosedMonth.periodLabel, text(latestClosedMonth.monthKey))} закрыт: чистая прибыль ${latestClosedProfit}${latestClosedMargin !== null ? `; рентабельность ${latestClosedMargin}%` : ""}`
        : revenue.tracked
          ? `${record(revenue.last30Days).shifts ?? 0} смен за 30 дней; история сравнения подготовлена`
        : "Нет выручки и расходов для сравнения",
      missingAction: "Закрыть смены и внести расходы минимум за несколько рабочих дней",
      data: revenue,
      now,
      freshDays: 7,
      agingDays: 30,
    }),
    block({
      id: "menuAndRecipes",
      label: "Меню и техкарты",
      available: menu.available,
      updatedAt: menu.updatedAt,
      detail: menu.available
        ? `${menu.data.activeItems} активных позиций; техкарты подтверждены на ${recipeCoverage}%`
        : "Меню ещё не загружено",
      missingAction: "Загрузить меню и подтвердить техкарты",
      data: menu.data,
      now,
      freshDays: 30,
      agingDays: 120,
    }),
    block({
      id: "salesAndCost",
      label: "Продажи и себестоимость",
      available: revenue.tracked || hasCost,
      updatedAt: maxIso(revenue.latestAt, menu.updatedAt, purchases.updatedAt),
      detail: revenue.tracked
        ? hasCost
          ? "Продажи и себестоимость доступны для анализа"
          : "Продажи учтены; надёжная себестоимость пока не рассчитана"
        : "Нет данных продаж и себестоимости",
      missingAction: "Внести продажи; для себестоимости связать техкарты с закупочными ценами",
      data: {
        sales: record(revenue.period),
        closedMonthProfitability: Object.keys(latestClosedMonth).length
          ? {
              monthKey: latestClosedMonth.monthKey,
              periodLabel: latestClosedMonth.periodLabel,
              revenue: latestClosedMonth.revenue,
              finalProfit: latestClosedMonth.finalProfit,
              profitMarginPercent: latestClosedMonth.profitMarginPercent,
              costOfGoods: latestClosedMonth.costOfGoods,
              costOfGoodsSharePercent: latestClosedMonth.costOfGoodsSharePercent,
            }
          : null,
        recipeCoveragePercent: recipeCoverage,
        costDataAvailable: hasCost,
        assortmentEconomics: menu.data.economics,
        assortmentSignals: menu.data.assortmentSignals,
        assortmentAIContext: menu.data.assortmentAIContext,
        warning: hasCost ? null : "Не делать выводы о марже без закупочных цен и подтверждённых техкарт",
      },
      now,
      freshDays: 7,
      agingDays: 30,
    }),
    block({
      id: "purchasesAndInventory",
      label: "Закупки и остатки",
      available: purchases.available,
      updatedAt: purchases.updatedAt,
      detail: purchases.available
        ? `${purchases.data.confirmedDocuments} подтверждённых закупок; ${purchases.data.inventorySnapshots} инвентаризаций`
        : "Нет подтверждённых закупок и инвентаризаций",
      missingAction: "Подтвердить закупки и обновить остатки",
      data: purchases.data,
      now,
      freshDays: 7,
      agingDays: 30,
    }),
    block({
      id: "team",
      label: "Персонал",
      available: team.available,
      updatedAt: team.updatedAt,
      detail: team.available ? `${team.data.active} активных сотрудников` : "Сотрудники не добавлены",
      missingAction: "Добавить сотрудников и правила оплаты",
      data: team.data,
      now,
      freshDays: 30,
      agingDays: 120,
    }),
    block({
      id: "guestFeedback",
      label: "Отзывы гостей",
      available: reviews.available,
      updatedAt: reviews.updatedAt,
      detail: reviews.available
        ? `${reviews.data.total} отзывов; средняя оценка ${reviews.data.averageRating ?? "не рассчитана"}`
        : "Отзывы ещё не добавлены",
      missingAction: "Добавить или синхронизировать отзывы гостей",
      data: reviews.data,
      now,
      freshDays: 30,
      agingDays: 90,
    }),
    block({
      id: "seasonalityAndEvents",
      label: "Сезонность и события",
      available: seasonality.available,
      updatedAt: seasonality.updatedAt,
      detail: seasonality.available
        ? `${array(seasonality.data.upcomingEvents60Days).length} ближайших событий; история по дням недели учтена`
        : "Недостаточно истории и ближайших событий",
      missingAction: "Обновить календарь возможностей и накопить историю смен",
      data: seasonality.data,
      now,
      freshDays: 7,
      agingDays: 30,
    }),
    block({
      id: "market",
      label: "Рынок и конкуренты",
      available: market.available,
      updatedAt: market.updatedAt,
      detail: market.available
        ? `${array(market.data.confirmedCompetitors).length} подтверждённых конкурентов; рыночный контекст учтён`
        : "Подтверждённый рыночный анализ отсутствует",
      missingAction: "Обновить анализ рынка и подтвердить реальных конкурентов",
      data: market.data,
      now,
      freshDays: 30,
      agingDays: 90,
    }),
  ];

  const allowed = new Set(PURPOSE_BLOCKS[purpose]);
  const selected = blocks.filter((item) => allowed.has(item.id));
  return {
    version: "venue-ai-context-v1",
    purpose,
    generatedAt,
    accountingCurrency,
    blocks: selected,
    promptData: Object.fromEntries(selected.map((item) => [item.id, item.data])),
  };
}

export async function loadVenueAIContext(
  account: Account,
  purpose: VenueAIContextPurpose,
  request: JsonRecord = {},
  external?: VenueAIContextSources["external"],
): Promise<VenueAIContext> {
  const { getDb } = await import("../../db");
  const rows = await getDb()
    .select({ storeKey: domainData.storeKey, dataJson: domainData.dataJson, updatedAt: domainData.updatedAt })
    .from(domainData)
    .where(eq(domainData.accountId, account.id));
  const stores = new Map<string, StoredVenueValue>();
  for (const row of rows) {
    try {
      stores.set(row.storeKey, { data: JSON.parse(row.dataJson) as unknown, updatedAt: row.updatedAt });
    } catch {
      // A damaged optional store must not prevent the remaining context from being used.
    }
  }
  let accountProfile: JsonRecord = {};
  try {
    accountProfile = account.restaurantJson ? record(JSON.parse(account.restaurantJson) as unknown) : {};
  } catch {
    accountProfile = {};
  }
  return buildVenueAIContextFromSources(purpose, {
    accountProfile,
    accountUpdatedAt: account.updatedAt,
    request,
    stores,
    external,
  });
}

export function venueAIContextForPrompt(context: VenueAIContext): JsonRecord {
  return {
    version: context.version,
    generatedAt: context.generatedAt,
    purpose: context.purpose,
    accountingCurrency: context.accountingCurrency,
    coverage: context.blocks.map((item) => ({
      id: item.id,
      label: item.label,
      available: item.available,
      freshness: item.freshness,
      updatedAt: item.updatedAt,
      detail: item.detail,
      missingAction: item.missingAction,
    })),
    data: context.promptData,
  };
}
