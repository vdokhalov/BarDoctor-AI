import { resolveAccountingMoney } from "./accounting-money";
import { normalizeAccountingCurrency } from "./currency";
import { operationalDays } from "./operational-day";
import { activeBusinessRow, aggregateBusinessDates, businessRecord as record, eligibleRevenueRows, finiteBusinessNumber as finite, scopedBusinessRows } from "./business-day-rows";

type Row = Record<string, unknown>;
export type FinanceReadInput = { venueId: number; workspaceId?: number; dataAccountId?: number; legacyVenueKeys?: string[]; currency: string | null; asOf: string; startDate: string; endDate: string; revenues: unknown[]; reports?: unknown[]; events?: unknown[]; documents?: unknown[]; operationalDayProjection?: ReturnType<typeof operationalDays>; expenses?: unknown[]; payrollEntries?: unknown[]; expensesAvailable?: boolean; payrollEntriesAvailable?: boolean };
const round = (value: number) => Math.round(value * 100) / 100;
const scope = (rows: unknown[], input: FinanceReadInput) => scopedBusinessRows(rows, { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId });

/** Current rules are an edit estimate. An unrelated save cannot replace the
 * recorded historical breakdown when the underlying staffing/sales is unchanged. */
export function payrollForOperationalEdit(input: { previous?: unknown; businessDate: string; staffing: unknown[]; shiftDepartmentSales?: unknown; shiftVenueSales?: unknown; estimate?: unknown }) {
  const previous = record(input.previous), saved = record(previous.payrollBreakdown);
  const staffing = (value: unknown) => (Array.isArray(value) ? value : []).map(record).map(row => ({ employeeId: row.employeeId, hours: finite(row.hours), personalSales: finite(row.personalSales), units: finite(row.units) })).sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId)));
  const departments = (value: unknown) => Object.entries(record(value)).map(([key, value]) => [key, finite(value)]).filter(([, value]) => value != null).sort(([a], [b]) => String(a).localeCompare(String(b)));
  const sameFacts = previous.date === input.businessDate
    && JSON.stringify(staffing(previous.staffing)) === JSON.stringify(staffing(input.staffing))
    && JSON.stringify(departments(previous.shiftDepartmentSales)) === JSON.stringify(departments(input.shiftDepartmentSales))
    && finite(previous.shiftVenueSales) === finite(input.shiftVenueSales);
  if (sameFacts && finite(saved.total ?? saved.totalPayroll) != null) return { payrollBreakdown: saved, basis: "RECORDED" };
  return { payrollBreakdown: input.estimate, basis: input.estimate == null ? "MISSING" : "CURRENT_RULE_ESTIMATE" };
}

/** Existing accounting money rules, with missing monetary fields kept unknown. */
export function financeAmount(row: Row, field: string, currency: string | null): number | null {
  if (finite(row[field]) == null) {
    const saved = finite(row.accountingAmount);
    return saved != null && normalizeAccountingCurrency(currency) && (row.accountingCurrency == null || row.accountingCurrency === currency) ? saved : null;
  }
  const target = normalizeAccountingCurrency(currency);
  if (!target) return null;
  // Existing venue-scoped legacy rows predate currency storage; keep the legacy
  // accounting convention. Explicit foreign currency always needs captured FX.
  const resolved = resolveAccountingMoney({ value: row, originalAmount: row[field], originalCurrency: row.originalCurrency ?? row.currency ?? target, accountingCurrency: target });
  return resolved?.accountingAmount ?? null;
}

/** Attach a recorded report once per date without changing any session identity. */
export function revenueRowsWithReports(revenues: unknown[], days: ReturnType<typeof operationalDays>): Row[] {
  const seen = new Set<string>();
  return eligibleRevenueRows(revenues).map(row => {
    const day = days.find(day => day.businessDate === row.date && (row.venueId == null || Number(row.venueId) === day.venueId));
    if (!day) return row;
    const first = !seen.has(day.businessDate); seen.add(day.businessDate);
    const result: Row = { ...row, _bdOperationalDay: day, revenueStatus: day.revenue.status, operationalStatus: day.status };
    // The separate report overrides legacy operational fields. Later sessions
    // carry neither a second recorded payroll nor a second guest population.
    if (day.report) {
      delete result.payrollBreakdown; delete result.staffing; delete result.guests;
      if (first) Object.assign(result, day.report);
      else if (finite(day.report.guests) != null) result.guests = 0; // once-per-day report population
    }
    result.payrollBasis = first && day.report && day.operations.fot === "RECORDED" ? "RECORDED" : "MISSING";
    return result;
  });
}

/** One declared metric: revenue minus active recorded expenses and accrued FOT,
 * before COGS, recurring estimates and final closed-month reconciliation. */
export function readFinanceInputs(input: FinanceReadInput) {
  const revenues = eligibleRevenueRows(input.revenues, input.venueId, input).filter(row => String(row.date) >= input.startDate && String(row.date) <= input.endDate);
  const periodRows = (values: unknown[] = []) => scope(values, input).filter(row => String(row.businessDate ?? row.date) >= input.startDate && String(row.businessDate ?? row.date) <= input.endDate);
  const days = operationalDays({ ...input, revenues, events: periodRows(input.events), documents: periodRows(input.documents), reports: periodRows(input.reports) }).map(day => {
    // Existing client consumers receive authorized Operational Day metadata,
    // while internal event/report stores deliberately stay out of bulk sync.
    // Reuse that read projection only for the exact same source identities and
    // accounting amount. A stale/different scope cannot certify a new total.
    const projected = input.operationalDayProjection?.find(candidate => candidate.venueId === input.venueId && candidate.businessDate === day.businessDate);
    const dayRows = revenues.filter(row => row.date === day.businessDate);
    const ids = dayRows.map(row => row.id).sort();
    const amounts = dayRows.map(row => financeAmount(row, "revenue", input.currency));
    const matches = projected && Array.isArray(projected.revenue.sourceIds) && projected.revenue.currency === input.currency && ids.every(id => id != null)
      && JSON.stringify([...projected.revenue.sourceIds].sort()) === JSON.stringify(ids)
      && amounts.every(amount => amount != null) && round(amounts.reduce<number>((sum, amount) => sum + amount!, 0)) === projected.revenue.amount;
    return matches ? projected : day;
  });
  const joined = revenueRowsWithReports(revenues, days);
  const daily = aggregateBusinessDates(joined.map(row => ({ ...row, revenue: financeAmount(row, "revenue", input.currency), amount: undefined, currency: input.currency })));
  const excluded = revenues.filter(row => financeAmount(row, "revenue", input.currency) == null).map(row => ({ id: row.id ?? null, kind: "revenue", currency: row.currency ?? null }));
  const periodExpenses = scope(input.expenses ?? [], input).filter(row => activeBusinessRow(row) && String(row.accountingMonth ?? String(row.date).slice(0, 7)) >= input.startDate.slice(0, 7) && String(row.accountingMonth ?? String(row.date).slice(0, 7)) <= input.endDate.slice(0, 7) && (!row.date || String(row.date) <= input.endDate));
  const entries = scope((input.payrollEntries ?? []).map(value => { const row = record(value); return row.venueId != null && input.legacyVenueKeys?.includes(String(row.venueId)) ? { ...row, venueId: input.venueId } : row; }), input).filter(row => activeBusinessRow(row) && String(row.date) >= input.startDate && String(row.date) <= input.endDate);
  const total = (rows: Row[], field: string) => { const amounts = rows.map(row => financeAmount(row, field, input.currency)); return amounts.some(value => value == null) ? null : round(amounts.reduce<number>((sum, value) => sum + value!, 0)); };
  const revenue = total(revenues, "revenue");
  // The same authorization boundary applies to every day's recorded payroll.
  // Resolve it once, preserving the first report per date and its original FX.
  const scopedReports = scope(input.reports ?? [], input);
  const payrollByDay = days.filter(day => day.report != null || revenues.some(row => row.date === day.businessDate)).map(day => {
    const saved = day.payroll.amount;
    // Even a recorded zero wins over expenses and future rule edits.
    const legacy = joined.find(row => row.date === day.businessDate && finite(record(row.payrollBreakdown).total ?? record(row.payrollBreakdown).totalPayroll) != null);
    const amount = saved ?? finite(record(legacy?.payrollBreakdown).total ?? record(legacy?.payrollBreakdown).totalPayroll);
    const source = day.operations.fot === "RECORDED" && saved != null ? "RECORDED" : amount != null ? "LEGACY_RECORDED" : "MISSING";
    const original = scopedReports.find(row => row.date === day.businessDate) ?? revenues.find(row => row.date === day.businessDate) ?? {};
    const converted = amount == null ? null : financeAmount({ ...original, originalAmount: amount, amount, accountingAmount: undefined }, "amount", input.currency);
    return { businessDate: day.businessDate, amount: converted, basis: source };
  });
  const recordedPresent = payrollByDay.some(day => day.amount != null);
  const legacyPayrollExpenses = periodExpenses.filter(row => row.category === "payroll");
  const payrollBase = recordedPresent ? payrollByDay.every(day => day.amount != null) ? round(payrollByDay.reduce((sum, day) => sum + day.amount!, 0)) : null
    : legacyPayrollExpenses.length ? total(legacyPayrollExpenses, "amount") : null;
  const paid = total(entries.filter(row => row.type === "payment"), "amount");
  const deductions = total(entries.filter(row => ["order", "fine", "dishware", "other_deduction"].includes(String(row.type)) && (!row.confirmationStatus || row.confirmationStatus === "confirmed")), "amount");
  const bonus = total(entries.filter(row => row.type === "bonus"), "amount");
  const payroll = payrollBase != null && bonus != null && input.payrollEntriesAvailable !== false ? round(payrollBase + bonus) : null;
  const operatingExpenses = input.expensesAvailable === false ? null : total(periodExpenses.filter(row => row.category !== "payroll"), "amount");
  const expenses = payroll != null && operatingExpenses != null ? round(payroll + operatingExpenses) : null;
  const preliminaryResult = revenue != null && expenses != null ? round(revenue - expenses) : null;
  const missing = [...(revenue == null ? ["REVENUE_OR_CURRENCY"] : []), ...(payroll == null ? ["PAYROLL"] : []), ...(operatingExpenses == null ? ["EXPENSES_OR_CURRENCY"] : [])];
  return { version: "business-day-finance-v1", metric: "recorded_current_result_before_cogs", venueId: input.venueId, currency: input.currency,
    startDate: input.startDate, endDate: input.endDate, asOf: input.asOf, revenue, payroll, payrollBase, payrollBonuses: bonus, payrollPaid: paid, payrollDeductions: deductions, operatingExpenses, expenses, preliminaryResult,
    resultStatus: missing.length ? "PARTIAL" : "PROVISIONAL", finality: "PRELIMINARY", missing, excluded, payrollByDay,
    payrollBasis: recordedPresent ? payrollByDay.every(day => day.basis === "RECORDED") ? "RECORDED" : "LEGACY_RECORDED" : legacyPayrollExpenses.length ? "LEGACY_EXPENSE" : "MISSING",
    days, daily, revenueRows: joined,
  };
}
