import test from "node:test";
import assert from "node:assert/strict";
import { payrollForOperationalEdit, readFinanceInputs, type FinanceReadInput } from "../lib/bardoctor/finance-inputs";
import { operationalDay } from "../lib/bardoctor/operational-day";
import { normaliseDailyMetrics, comparableWeekdayBaseline } from "../lib/bardoctor/business-intelligence";
import { buildVenueAIContextFromSources } from "../lib/bardoctor/venue-ai-context";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const date = "2026-10-01";
function input(overrides: Partial<FinanceReadInput> = {}): FinanceReadInput {
  return { venueId: 1, currency: "MDL", asOf: "2026-10-02T12:00:00Z", startDate: "2026-10-01", endDate: "2026-10-31",
    revenues: [100, 200, 0].map((revenue, index) => ({ id: "shift-" + index, venueId: 1, date, revenue, currency: "MDL", receipts: revenue ? 1 : 0, revenueSource: "sales_events_v1", closingStatus: "closed" })),
    events: [100, 200].map((revenue, index) => ({ id: "sale-" + index, venueId: 1, businessDate: date, revenueRowId: "shift-" + index, status: "POSTED", currency: "MDL", revenue, source: "POS_API" })),
    reports: [{ id: "operational-report:1:" + date, venueId: 1, date, closingStatus: "closed", payrollBreakdown: { total: 90 }, guests: 8 }], expenses: [], payrollEntries: [], ...overrides };
}
test("100 + 200 = daily 300; three session identities, one report FOT 90; read-only and repeatable", () => {
  const source = input(), bytes = JSON.stringify(source), result = readFinanceInputs(source);
  assert.equal(result.daily.length, 1); assert.equal(result.daily[0].revenue, 300);
  assert.equal(result.payroll, 90); assert.equal(result.preliminaryResult, 210);
  assert.equal(result.days[0].revenue.amount, 300); assert.equal(result.days[0].payroll.amount, 90);
  assert.equal(result.days[0].status, "COMPLETE");
  assert.equal(result.revenueRows.filter(row => row.payrollBreakdown != null).length, 1);
  assert.deepEqual(readFinanceInputs(source), result); assert.equal(JSON.stringify(source), bytes);
  const normalized = normaliseDailyMetrics(source.revenues); assert.equal(normalized.length, 1); assert.equal(normalized[0].revenue, 300); assert.equal(normalized[0].checks, 2); assert.equal(normalized[0].averageCheck, 150);
});
test("repeated read rows do not multiply identities; invalid revenue rows are excluded", () => {
  const source = input(); const result = readFinanceInputs({ ...source, revenues: [...source.revenues, source.revenues[0], { id: "draft", date, revenue: 999, status: "draft" }], events: [...source.events!, source.events![0]] });
  assert.equal(result.revenue, 300); assert.equal(result.days[0].revenue.amount, 300); assert.equal(result.payroll, 90);
});
test("OPEN is provisional even with recorded operations; closed cash without report is incomplete", () => {
  const source = input(); const open = readFinanceInputs({ ...source, revenues: source.revenues.map((value, index) => ({ ...value as object, closingStatus: index === 1 ? "open" : "closed" })) });
  assert.equal(open.days[0].revenue.status, "PROVISIONAL"); assert.equal(open.days[0].status, "OPERATING"); assert.equal(open.finality, "PRELIMINARY");
  const closed = readFinanceInputs(input({ reports: [] })); assert.equal(closed.days[0].revenue.status, "FINAL"); assert.equal(closed.days[0].status, "AWAITING_OPERATIONAL_DATA"); assert.equal(closed.payroll, null); assert.equal(closed.preliminaryResult, null);
  const baseline = comparableWeekdayBaseline(normaliseDailyMetrics([{ date: "2026-09-24", revenue: 300, closingStatus: "open" }]), date); assert.equal(baseline, null);
});
test("recorded zero beats expense fallback; missing FOT is unknown; partial days do not silently become zero", () => {
  const source = input({ reports: [{ venueId: 1, date, closingStatus: "closed", payrollBreakdown: { total: 0 } }], expenses: [{ id: "pay", date, category: "payroll", amount: 900, currency: "MDL" }] });
  assert.equal(readFinanceInputs(source).payroll, 0); assert.equal(readFinanceInputs(source).preliminaryResult, 300);
  const missing = readFinanceInputs(input({ reports: [{ venueId: 1, date, closingStatus: "closed" }] })); assert.equal(missing.payroll, null); assert.equal(missing.days[0].status, "AWAITING_OPERATIONAL_DATA"); assert.ok(missing.missing.includes("PAYROLL")); assert.equal(missing.resultStatus, "PARTIAL");
  const partial = readFinanceInputs({ ...input(), revenues: [...input().revenues, { id: "next", venueId: 1, date: "2026-10-02", revenue: 10, currency: "MDL" }] }); assert.equal(partial.payroll, null);
});
test("changing employees/rules cannot recalculate saved FOT; bonus accrues once, payments/deductions settle only", () => {
  const source = input({ payrollEntries: [{ id: "bonus", venueId: 1, date, type: "bonus", amount: 10, currency: "MDL" }, { id: "pay", venueId: 1, date, type: "payment", amount: 50, currency: "MDL" }, { id: "fine", venueId: 1, date, type: "fine", amount: 5, confirmationStatus: "confirmed", currency: "MDL" }] });
  const result = readFinanceInputs(source); assert.equal(result.payrollBase, 90); assert.equal(result.payroll, 100); assert.equal(result.preliminaryResult, 200);
  const stores = new Map(Object.entries({ bd_finance_revenue: source.revenues, bd_operational_reports_v1: source.reports, bd_sales_events_v1: source.events, bd_finance_expenses: [], bd_payroll_entries: source.payrollEntries, bd_payroll_rules: [{ amount: 999 }] }).map(([key, data]) => [key, { data, updatedAt: source.asOf }]));
  const read = () => buildVenueAIContextFromSources("diagnosis", { accountProfile: { venueId: 1, currency: "MDL", timezone: "Europe/Chisinau" }, stores, now: new Date(source.asOf) }).promptData.performanceHistory.period as Record<string, unknown>;
  assert.equal(read().payroll, 100); stores.set("bd_payroll_rules", { data: [{ amount: 99999 }], updatedAt: source.asOf }); assert.equal(read().payroll, 100); assert.equal(read().result, 200);
});
test("editing a recorded report with unchanged operational inputs preserves 90 after rule/coefficient changes; changed staffing is an estimate", () => {
  const previous = { date, payrollBreakdown: { total: 90, employees: [{ employeeId: "A", total: 90 }] }, staffing: [{ employeeId: "A", hours: 8 }], shiftDepartmentSales: { bar: 100 }, shiftVenueSales: 300 };
  const bytes = JSON.stringify(previous), next = { previous, businessDate: date, staffing: [{ employeeId: "A", hours: "8" }], shiftDepartmentSales: { bar: "100" }, shiftVenueSales: 300, estimate: { total: 9999 } };
  assert.deepEqual(payrollForOperationalEdit(next), { payrollBreakdown: previous.payrollBreakdown, basis: "RECORDED" });
  assert.equal(JSON.stringify(previous), bytes);
  assert.deepEqual(payrollForOperationalEdit({ ...next, staffing: [{ employeeId: "A", hours: 9 }] }), { payrollBreakdown: next.estimate, basis: "CURRENT_RULE_ESTIMATE" });
  assert.equal(payrollForOperationalEdit({ ...next, previous: undefined, estimate: undefined }).basis, "MISSING");
  assert.equal((payrollForOperationalEdit({ ...next, previous: { ...previous, payrollBreakdown: { total: 0 } } }).payrollBreakdown as { total: number }).total, 0);
});
for (const status of ["cancelled", "void", "voided", "reversed", "draft"]) test("expense lifecycle excludes " + status, () => {
  const result = readFinanceInputs(input({ expenses: [{ id: "active", date, amount: 10, currency: "MDL", status: "active" }, { id: "inactive", date, amount: 999, currency: "MDL", status }] }));
  assert.equal(result.operatingExpenses, 10); assert.equal(result.preliminaryResult, 200);
});
test("reversedAt excludes expense and payroll entries even with active status", () => {
  const result = readFinanceInputs(input({ expenses: [{ date, amount: 999, currency: "MDL", status: "active", reversedAt: date }], payrollEntries: [{ id: "bonus", date, type: "bonus", amount: 999, currency: "MDL", reversedAt: date }] })); assert.equal(result.expenses, 90); assert.equal(result.preliminaryResult, 210);
});
test("reversed sale counts zero and does not create a second ledger receipt", () => {
  const source = input(); const result = readFinanceInputs({ ...source, events: source.events!.map((value, index) => ({ ...value as object, ...(index === 1 ? { status: "REVERSED", reversedAt: date } : {}) })), revenues: source.revenues.map((value, index) => ({ ...value as object, ...(index === 1 ? { revenue: 0, receipts: 0 } : {}) })) }); assert.equal(result.revenue, 100); assert.equal(result.days[0].revenue.amount, 100); assert.equal(result.days[0].revenue.receipts, 1);
});
test("foreign currencies are unknown unless existing captured FX resolves them; zero stays zero", () => {
  const source = input();
  const foreign = { ...source, revenues: source.revenues.map((value, index) => ({ ...value as object, ...(index === 1 ? { currency: "EUR" } : {}) })) };
  assert.equal(readFinanceInputs(foreign).revenue, null); assert.equal(readFinanceInputs(foreign).preliminaryResult, null);
  assert.equal(operationalDay({ ...foreign, currency: undefined, businessDate: date }).revenue.amount, null);
  const converted = readFinanceInputs({ ...foreign, revenues: foreign.revenues.map((row, index) => ({ ...row, ...(index === 1 ? { accountingCurrency: "MDL", accountingAmount: 200, fxRate: 1, fxSource: "captured", fxEffectiveDate: date } : {}) })) }); assert.equal(converted.revenue, 300);
  assert.equal(readFinanceInputs(input({ expenses: [{ date, amount: 10, currency: "EUR" }] })).operatingExpenses, null);
});
test("missing currency/input, unlike explicit zero, does not produce a proven result", () => {
  assert.equal(readFinanceInputs(input({ currency: null })).preliminaryResult, null);
  assert.equal(readFinanceInputs(input({ expensesAvailable: false })).operatingExpenses, null);
  assert.equal(readFinanceInputs(input({ payrollEntriesAvailable: false })).payroll, null);
});
test("authorized Operational Day projection survives client cache boundary, but mismatched source IDs cannot certify completion", () => {
  const source = input(), canonical = readFinanceInputs(source);
  const client = readFinanceInputs({ ...source, reports: [], events: [], revenues: canonical.revenueRows, operationalDayProjection: canonical.days });
  assert.equal(client.payroll, 90); assert.equal(client.payrollBasis, "RECORDED"); assert.equal(client.days[0].status, "COMPLETE"); assert.equal(client.daily[0].guests, 8);
  const stale = structuredClone(canonical.days); stale[0].revenue.sourceIds = ["different-session"];
  const rejected = readFinanceInputs({ ...source, reports: [], events: [], revenues: canonical.revenueRows, operationalDayProjection: stale });
  assert.equal(rejected.days[0].status, "AWAITING_OPERATIONAL_DATA"); assert.equal(rejected.payrollBasis, "LEGACY_RECORDED");
  assert.equal(rejected.payrollByDay[0].basis, "LEGACY_RECORDED", "unverified cached fields stay explicitly legacy");
});
for (const businessDate of ["2026-09-30", "2026-12-31", "2026-03-29", "2026-10-25"]) test("businessDate survives month/year/DST boundary " + businessDate, () => {
  const source = input(), changed = { ...source, startDate: businessDate, endDate: businessDate, revenues: source.revenues.map(row => ({ ...row as object, date: businessDate, closedAt: businessDate + "T23:50:00Z" })), reports: source.reports!.map(row => ({ ...row as object, date: businessDate })), events: source.events!.map(row => ({ ...row as object, businessDate, occurredAt: businessDate + "T23:59:00Z" })) };
  const result = readFinanceInputs(changed); assert.equal(result.days[0].businessDate, businessDate); assert.equal(result.revenue, 300); assert.equal(result.payroll, 90);
});
test("Operational Day, Finance input and server context agree for the same declared metric/scope", () => {
  const source = input(), result = readFinanceInputs(source);
  const stores = new Map(Object.entries({ bd_finance_revenue: source.revenues, bd_operational_reports_v1: source.reports, bd_sales_events_v1: source.events, bd_finance_expenses: [], bd_payroll_entries: [] }).map(([key, data]) => [key, { data, updatedAt: source.asOf }]));
  const context = buildVenueAIContextFromSources("diagnosis", { accountProfile: { venueId: 1, currency: "MDL", timezone: "Europe/Chisinau" }, stores, now: new Date(source.asOf) });
  const period = context.promptData.performanceHistory.period as Record<string, unknown>; assert.equal(period.revenue, result.revenue); assert.equal(period.payroll, result.days[0].payroll.amount); assert.equal(period.result, result.preliminaryResult);
  const daily = context.promptData.performanceHistory.recentDaily as Record<string, unknown>[]; assert.equal(daily.length, 1); assert.equal(daily[0].revenue, 300); assert.equal(daily[0].revenueStatus, "FINAL");
});
test("actual read route reauthorizes restricted/revoked/foreign membership and isolates data owner", async t => {
  const r = await lifecycleRuntime({ days: "./app/api/operational-days/route", context: "./lib/bardoctor/venue-ai-context" }); t.after(r.close);
  const owner = await r.register("phase3a6-owner@isolated.test"), member = await r.register("phase3a6-member@isolated.test"), foreign = await r.register("phase3a6-foreign@isolated.test");
  const workspaceId = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(owner.activeVenueId)!.id);
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId, member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(owner.activeVenueId, member.userId);
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ currency: "MDL" }), owner.userId);
  r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,'test')").run(owner.userId, "bd_finance_revenue", JSON.stringify([{ id: "own", date, revenue: 300, venueId: owner.activeVenueId }, { id: "foreign", date, revenue: 99999, venueId: foreign.activeVenueId }, { id: "foreign-workspace", date, revenue: 88888, venueId: owner.activeVenueId, workspaceId: workspaceId + 999 }, { id: "foreign-data-account", date, revenue: 77777, venueId: owner.activeVenueId, dataAccountId: foreign.userId }]));
  const request = (who: typeof owner, venueId = owner.activeVenueId) => { const request = r.request(who, "/api/operational-days"); request.headers.set("X-Venue-Id", String(venueId)); return request; };
  const response = await r.api.days.GET(request(member)); assert.equal(response.status, 200); const data = await response.json() as { revenues: unknown[] }; assert.equal(data.revenues.length, 1);
  r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({ deny: ["shifts.view"] }), owner.activeVenueId, member.userId);
  assert.equal((await r.api.days.GET(request(member))).status, 403);
  assert.equal((await r.api.days.GET(request(member, foreign.activeVenueId))).status, 401);
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(owner.activeVenueId, member.userId);
  assert.equal((await r.api.days.GET(request(member))).status, 401);
  assert.equal((await r.api.days.GET(request(foreign))).status, 401);
});
