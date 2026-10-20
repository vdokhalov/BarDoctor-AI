import test from "node:test";
import assert from "node:assert/strict";
import * as accounting from "../lib/bardoctor/sales-accounting";
import { historicalPeriodCost } from "../lib/bardoctor/financial-reconciliation";
import { operationalDay } from "../lib/bardoctor/operational-day";
import { reconcileSalesRevenue } from "../lib/bardoctor/sales-revenue";
import { normalizeSalesDocument } from "../lib/bardoctor/sales";
import { openingRuntime } from "./helpers/opening-runtime";
import * as consumption from "../lib/bardoctor/sales-consumption";
import * as salesRevenue from "../lib/bardoctor/sales-revenue";
import { currentFinance } from "../lib/bardoctor/current-finance";
import { buildBusinessIntelligence, type BusinessIntelligenceInput } from "../lib/bardoctor/business-intelligence";

const setting: accounting.SalesAccounting = { version: 1, venueId: 1, changes: [{ id: "manual-enabled", mode: "MANUAL", effectiveDate: "2026-10-01", createdAt: "2026-09-30T10:00:00Z", actorId: 7 }] };
const base = { setting, venueId: 1, currency: "MDL", date: "2026-10-10", now: "2026-10-20T10:00:00Z", timezone: "Europe/Chisinau",
  role: "owner", actorId: 7, operationId: "manual-save-001", expectedRevision: 0, cash: 100, card: 200, revenues: [], closedMonths: new Set<string>() };
test("legacy venues remain legacy; new venue defaults POS; timezone controls tomorrow", () => {
  assert.equal(accounting.salesModeForDate(null, "2026-10-20"), "LEGACY");
  assert.equal(accounting.salesModeForDate(accounting.initialSalesAccounting(1, base.now, 7), "2026-10-20"), "POS");
  const plan = accounting.planSalesMode({ setting: null, venueId: 1, actorId: 7, role: "owner", mode: "MANUAL", operationId: "switch-001",
    now: "2026-10-20T23:30:00Z", timezone: "Europe/Chisinau", revenues: [], reports: [], orders: [] });
  assert.equal(plan.change.effectiveDate, "2026-10-22");
  assert.equal(accounting.salesModeForDate(plan.setting, "2026-10-21"), "LEGACY");
  assert.equal(accounting.salesModeForDate(plan.setting, "2026-10-22"), "MANUAL");
});
test("switch requires owner and closes workday, cash and orders; pending switch cannot rewrite timeline", () => {
  const input = { setting: null, venueId: 1, actorId: 7, role: "owner", mode: "MANUAL", operationId: "switch-001", now: base.now, timezone: "UTC", revenues: [], reports: [], orders: [] };
  for (const change of [{ role: "manager" }, { reports: [{ venueId: 1, workdayStatus: "OPEN" }] }, { revenues: [{ closingStatus: "open" }] }, { orders: [{ venueId: 1, status: "OPEN" }] }]) {
    assert.throws(() => accounting.planSalesMode({ ...input, ...change }), accounting.SalesAccountingError);
  }
  const first = accounting.planSalesMode(input);
  assert.equal(accounting.planSalesMode({ ...input, setting: first.setting }).duplicate, true);
  assert.throws(() => accounting.planSalesMode({ ...input, setting: first.setting, operationId: "switch-002" }), /уже запланирован/);
});
test("manual total is one revenue row, absent receipts/COGS unknown, explicit zero known", () => {
  const a = accounting.planManualTotals(base);
  assert.equal(a.row.revenue, 300); assert.equal(a.row.receipts, null); assert.equal(a.row.declaredCost, null);
  const cost = (revenues: unknown[]) => historicalPeriodCost({ venueId: 1, monthKey: "2026-10", accountingCurrency: "MDL", revenues, events: [], documents: [], batches: [], movements: [] });
  assert.equal(cost(a.revenues).salesCostKnown, false);
  const zero = accounting.planManualTotals({ ...base, cogs: 0 });
  assert.equal(cost(zero.revenues).salesCostKnown, true); assert.equal(cost(zero.revenues).cost, 0);
  const day = operationalDay({ venueId: 1, businessDate: base.date, asOf: base.now, revenues: a.revenues, currency: "MDL" });
  assert.equal(day.revenue.receipts, null); assert.equal(day.revenue.readOnly, true);
  assert.deepEqual(day.revenue.payments, [{ method: "CASH", amount: 100 }, { method: "CARD_EXTERNAL", amount: 200 }]);
});
test("corrections preserve full revisions, reject stale writes, retry never reverts newer value", () => {
  const first = accounting.planManualTotals({ ...base, cogs: 50 });
  const second = accounting.planManualTotals({ ...base, cash: 150, cogs: 60, operationId: "manual-save-002", expectedRevision: 1, reason: "Исправлена сумма", revenues: first.revenues });
  assert.equal(second.row.revenue, 350);
  assert.equal((second.row.manualRevisions as unknown[]).length, 2);
  assert.equal(accounting.planManualTotals({ ...base, cogs: 50, revenues: second.revenues }).row.revenue, 350);
  assert.throws(() => accounting.planManualTotals({ ...base, operationId: "manual-save-003", revenues: second.revenues }), /другом устройстве/);
  assert.throws(() => accounting.planManualTotals({ ...base, role: "waiter" }), /владелец/);
  assert.throws(() => accounting.planManualTotals({ ...base, cash: "" }), /сумму/);
  assert.throws(() => accounting.planManualTotals({ ...base, closedMonths: new Set(["2026-10"]) }), /закрыт/);
});
test("same-day source cannot overlap; delayed imports cannot overwrite manual totals", () => {
  const a = accounting.planManualTotals({ ...base, cogs: 40 });
  assert.throws(() => accounting.assertSalesSource(null, a.revenues, 1, base.date, "IMPORT"), /другого источника/);
  assert.throws(() => accounting.assertSalesSource(setting, [], 1, base.date, "POS"), /другой способ/);
  assert.equal(accounting.managedRevenueMutation(a.revenues, [{ ...a.row, revenue: 0 }], setting), true);
  const doc = normalizeSalesDocument({ id: "doc", date: base.date, status: "confirmed", totalRevenue: 400, items: [] }, "doc");
  assert.equal(reconcileSalesRevenue({ revenues: a.revenues, salesDocuments: [], document: doc, now: base.now }).ok, false);
});
test("real API uses CAS and audit, preserves stock and retries exactly once", async () => {
  const f = openingRuntime(new URL("../app/api/sales-accounting/route.ts", import.meta.url), accounting);
  try {
    f.put(accounting.SALES_ACCOUNTING_KEY, setting); f.put("bd_stock_movements", [{ id: "untouched" }]);
    const request = (body: object) => new Request("http://local/api/sales-accounting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const command = { action: "save_totals", venueId: 1, date: base.date, cash: 100, card: 200, cogs: 0, expectedRevision: 0, operationId: "api-manual-001" };
    const first = await f.api.POST(request(command)); assert.equal(first.status, 201, await first.text());
    const repeat = await f.api.POST(request(command)); assert.equal(repeat.status, 200); assert.equal((await repeat.json() as {duplicate:boolean}).duplicate, true);
    assert.equal((f.get("bd_finance_revenue") as unknown[]).length, 1);
    assert.deepEqual(f.get("bd_stock_movements"), [{ id: "untouched" }]);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log").get()?.n, 1);
    f.failAt(2);
    await assert.rejects(f.api.POST(request({ ...command, operationId: "api-manual-002", expectedRevision: 1, cash: 999, reason: "Correction" })));
    assert.equal((f.get("bd_finance_revenue") as Record<string, unknown>[])[0].revenue, 300);
  } finally { f.close(); }
});
test("manual and POS disjoint days share financial formula and Health margin bands, preserve confirmed loss guard", () => {
  const manual = accounting.planManualTotals({ ...base, cogs: 60 });
  const input = { venueId: 1, profile: { currency: "MDL", timezone: "UTC" }, currency: "MDL",
    startDate: "2026-10-01", endDate: "2026-10-31", asOf: base.now, revenues: manual.revenues,
    reports: [{ venueId: 1, date: base.date, closingStatus: "closed", payrollBreakdown: { total: 40 } }],
    expenses: [{ venueId: 1, date: base.date, amount: 20, currency: "MDL", category: "rent" }],
    payrollEntries: [], events: [], batches: [], documents: [], movements: [], costInputsAvailable: true };
  const result = currentFinance(input);
  assert.equal(result.revenue, 300); assert.equal(result.costOfGoods, 60); assert.equal(result.resultAfterCost, 180);
  const health = (value: object, latestClosedMonth?: object) => buildBusinessIntelligence({ venueId: "1", now: new Date(base.now),
    currentFinancialPeriod: { ...value, monthKey: "2026-10" }, latestClosedMonth } as unknown as BusinessIntelligenceInput).businessHealth;
  assert.equal(health(result).components.find(x => x.id === "finance")?.score, 90);
  const unknown = currentFinance({ ...input, revenues: accounting.planManualTotals(base).revenues });
  assert.equal(unknown.resultAfterCost, null); assert.equal(health(unknown).components.find(x => x.id === "finance")?.score, null);
  const loss = health(result, { monthKey: "2026-09", revenue: 100, finalProfit: -30 });
  assert.equal(loss.label, "critical"); assert.ok(loss.score == null || loss.score <= 44);
  const pos = { id: "pos", venueId: 1, date: "2026-10-11", currency: "MDL", revenueSource: "sales_events_v1", revenue: 100, receipts: 1 };
  const event = { id: "sale", venueId: 1, businessDate: pos.date, revenueRowId: pos.id, revenue: 100, currency: "MDL", source: "POS_API", status: "POSTED",
    batch: { id: "batch", venueId: 1, businessDate: pos.date, status: "POSTED", costStatus: "FULL", totalTheoreticalCost: 0,
      lines: [{ id: "line", salesBatchId: "batch", quantity: 1, processingStatus: "POSTED", theoreticalCost: 0, recipeSnapshot: { recipeId: "none", capturedAt: base.now, consumptionMode: "NONE", ingredients: [] } }] } };
  const mixed = currentFinance({ ...input, revenues: [...manual.revenues, pos], events: [event],
    reports: [...input.reports, { venueId: 1, date: pos.date, closingStatus: "closed", payrollBreakdown: { total: 10 } }] });
  assert.equal(mixed.revenue, 400); assert.equal(mixed.costOfGoods, 60); assert.equal(mixed.resultAfterCost, 270);
});
test("late import API stages exact document without changing revenue/stock, including closed months", async () => {
  const f = openingRuntime();
  try {
    const api = f.loadRoute(new URL("../app/api/sales/confirm/route.ts", import.meta.url), { ...accounting, ...consumption, ...salesRevenue, normalizeSalesDocument });
    const original = accounting.planManualTotals({ ...base, cogs: 0 }).revenues;
    f.put(accounting.SALES_ACCOUNTING_KEY, setting); f.put("bd_finance_revenue", original); f.put("bd_stock_movements", []);
    const document = { id: "late-import", date: base.date, currency: "MDL", sourceType: "file_import", totalRevenue: 320,
      items: [{ id: "line", name: "Coffee", quantity: 2, confidence: 1 }] };
    const post = () => api.POST(new Request("http://local/api/sales/confirm", { method: "POST", body: JSON.stringify({ document }) }));
    assert.equal((await post()).status, 409); assert.equal((await post()).status, 409);
    assert.equal((f.get(accounting.SALES_IMPORT_REVIEW_KEY) as unknown[]).length, 1);
    assert.deepEqual(f.get("bd_finance_revenue"), original); assert.deepEqual(f.get("bd_stock_movements"), []);
    assert.equal(f.get("bd_sales_documents"), null);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log").get()?.n, 1);
    f.put("bd_month_closings", [{ monthKey: "2026-10", status: "closed" }]);
    const late = await api.POST(new Request("http://local/api/sales/confirm", { method: "POST", body: JSON.stringify({ document: { ...document, id: "late-closed-month" } }) }));
    assert.equal(late.status, 409);
    assert.equal((f.get(accounting.SALES_IMPORT_REVIEW_KEY) as unknown[]).length, 2);
    assert.deepEqual(f.get("bd_finance_revenue"), original);
  } finally { f.close(); }
});
test("explicit staged manual replacement is atomic, preserves history and never adds both sources", async () => {
  const f = openingRuntime();
  try {
    const api = f.loadRoute(new URL("../app/api/sales/confirm/route.ts", import.meta.url), { ...accounting, ...consumption, ...salesRevenue, normalizeSalesDocument });
    const original = accounting.planManualTotals({ ...base, cogs: 50 }).revenues;
    f.put(accounting.SALES_ACCOUNTING_KEY, setting); f.put("bd_finance_revenue", original); f.put("bd_stock_movements", []);
    f.put("bd_assortment_v1", { menuItems: [{ id: "service", venueId: 1, name: "Service", active: true, type: "simple", consumptionMode: "NONE", currency: "MDL", salePrice: 320 }] });
    const document = { id: "replace-import", date: base.date, currency: "MDL", sourceType: "file_import", totalRevenue: 320,
      items: [{ id: "line", name: "Service", menuItemId: "service", quantity: 1, confidence: 1 }] };
    const post = (replacement?: object) => api.POST(new Request("http://local/api/sales/confirm", { method: "POST", body: JSON.stringify({ document, replacement }) }));
    assert.equal((await post()).status, 409);
    const replacement = { revenueId: original[0].id, expectedRevision: 1, reason: "Полный отчёт за день вместо ручных итогов" };
    const result = await post(replacement); assert.equal(result.status, 201, await result.text());
    const revenues = f.get("bd_finance_revenue") as Record<string, unknown>[];
    assert.equal(revenues.length, 1); assert.equal(revenues[0].revenue, 320);
    assert.equal(revenues[0].revenueSource, "sales_documents");
    assert.deepEqual((revenues[0].sourceHistory as { snapshot: unknown }[])[0].snapshot, original[0]);
    assert.equal((await post(replacement)).status, 200);
    assert.equal((f.get("bd_finance_revenue") as unknown[]).length, 1);
    const cost = historicalPeriodCost({ venueId: 1, monthKey: "2026-10", accountingCurrency: "MDL", revenues,
      documents: f.get("bd_sales_documents") as unknown[], batches: f.get("bd_sales_batches") as unknown[], movements: [], events: [] });
    assert.equal(cost.cost, 0); assert.equal(cost.salesCostKnown, true);
  } finally { f.close(); }
});
test("mode switch CAS rechecks an intervening open workday; manager and foreign-venue commands are rejected", async () => {
  const f = openingRuntime(new URL("../app/api/sales-accounting/route.ts", import.meta.url), accounting);
  try {
    const command = { action: "set_mode", venueId: 1, mode: "MANUAL", operationId: "mode-api-001" };
    const request = (body: object) => new Request("http://local/api/sales-accounting", { method: "POST", body: JSON.stringify(body) });
    f.beforeBatch(() => f.put("bd_operational_reports_v1", [{ venueId: 1, date: "2026-10-20", workdayStatus: "OPEN" }]));
    const response = await f.api.POST(request(command));
    assert.equal(response.status, 409); assert.equal(f.get(accounting.SALES_ACCOUNTING_KEY), null);
    assert.equal((await f.api.POST(request({ ...command, venueId: 2 }))).status, 409);
    const manager = f.loadRoute(new URL("../app/api/sales-accounting/route.ts", import.meta.url), {
      authenticateRequest: async () => ({ id: 7, venueId: 1, actorAccountId: 8, role: "manager", restaurantJson: '{"currency":"MDL"}' }),
    });
    assert.equal((await manager.POST(request(command))).status, 403);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log").get()?.n, 0);
  } finally { f.close(); }
});
