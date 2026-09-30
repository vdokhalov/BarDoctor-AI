import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { operationalDay, OPERATIONAL_REPORT_STORE_KEY, REVENUE_SOURCES } from "../lib/bardoctor/operational-day";

async function fixture() {
  const r = await lifecycleRuntime({ sales: "./app/api/sales-events/route", close: "./app/api/shifts/close/route", days: "./app/api/operational-days/route" });
  const user = await r.register("phase1a@isolated.test"), venueId = user.activeVenueId;
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Phase 1A", currency: "MDL", timezone: "Europe/Chisinau" }), user.userId);
  const put = (key: string, value: unknown) => r.sqlite.prepare("INSERT INTO domain_data (account_id,store_key,data_json,updated_at) VALUES (?,?,?,'test') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId, key, JSON.stringify(value));
  const get = (key: string) => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId, key)?.data_json ?? "null"));
  put("bd_assortment_v1", JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId)));
  const send = (body: object) => r.api.sales.POST(r.request(user, "/api/sales-events", "POST", { venueId, ...body }));
  const close = (body: object) => r.api.close.POST(r.request(user, "/api/shifts/close", "POST", { venueId, sectionsVersion: 1, ...body }));
  const days = async () => ((await (await r.api.days.GET(r.request(user, "/api/operational-days"))).json()) as { days: ReturnType<typeof operationalDay>[] }).days;
  const command = (id: string) => ({ id, source: "POS_API", shiftId: "cash", lines: [{ id: "line", menuItemId: "beer", quantity: 1 }], payments: [{ id: "payment:" + id, method: "CASH", amount: 20 }] });
  const quote = async (id: string) => { const cmd = command(id), response = await send({ action: "preview", command: cmd }); assert.equal(response.status, 200, JSON.stringify(await response.clone().json())); return { cmd, hash: ((await response.json()) as { previewHash: string }).previewHash }; };
  const sale = async (id: string) => { const { cmd, hash } = await quote(id); return send({ action: "post", command: cmd, previewHash: hash }); };
  return { ...r, user, venueId, put, get, send, closeReport: close, days, quote, sale };
}

test("A/J: manual summary, staffing and FOT save; unmarked historical manual data is readable without guessing", async () => {
  const r = await fixture();
  try {
    const historical = { id: "history", date: "2026-01-01", revenue: 123, receipts: 3 };
    r.put("bd_finance_revenue", [historical]);
    const response = await r.closeReport({ shiftCloseId: "manual", revenueRecord: { date: "2026-09-29", revenue: 50, receipts: 5, staffing: [{ employeeId: "A", hours: 8 }], payrollBreakdown: { total: 20 }, note: "manual" }, writeOffItems: [] });
    assert.equal(response.status, 201);
    assert.equal(((await response.json()) as { sections: { revenue: { status: string } } }).sections.revenue.status, "SAVED");
    assert.deepEqual(r.get("bd_finance_revenue").find((row: { id: string }) => row.id === "history"), historical);
    const days = await r.days();
    assert.equal(days.find(day => day.businessDate === "2026-01-01")?.revenue.source, "LEGACY_UNKNOWN");
    const manual = days.find(day => day.businessDate === "2026-09-29")!;
    assert.equal(manual.revenue.amount, 50); assert.equal(manual.revenue.source, "MANUAL_SUMMARY"); assert.equal(manual.status, "COMPLETE");
    assert.deepEqual(manual.report?.payrollBreakdown, { total: 20 });
  } finally { r.close(); }
});

test("B–I/K/M: POS facts immediate, duplicate revenue rejected separately, atomic operations survive, close finalizes unchanged amount", async () => {
  const r = await fixture();
  try {
    assert.equal((await r.send({ action: "open_shift", shiftId: "cash", name: "Cash" })).status, 201);
    assert.equal((await r.sale("one")).status, 201);
    let day = (await r.days())[0];
    assert.equal(day.revenue.amount, 20); assert.equal(day.revenue.source, "BARDOC_POS"); assert.equal(day.revenue.status, "PROVISIONAL");
    assert.equal(day.revenue.consistency, "MATCH"); assert.equal(day.revenue.receipts, 1); assert.deepEqual(day.revenue.payments, [{ method: "CASH", amount: 20 }]);
    assert.equal(day.status, "OPERATING"); assert.equal(day.operations.team, "MISSING");
    const revenueBefore = r.get("bd_finance_revenue"), eventsBefore = r.get("bd_sales_events_v1"), movements = r.get("bd_stock_movements");
    assert.equal(movements[0].salesBatchId, eventsBefore[0].id);
    assert.equal(movements[0].amount, -1); assert.equal(eventsBefore[0].originalMovements[0].amount, -1);
    const body = { shiftCloseId: "ops", shiftId: "cash", revenueRecord: { date: day.businessDate, revenue: 999, receipts: 999, staffing: [{ employeeId: "B", hours: 7 }], payrollBreakdown: { total: 3 }, note: "operations" }, writeOffItems: [], incidents: [{ title: "Broken glass" }] };
    assert.equal((await r.closeReport({ ...body, sectionsVersion: undefined })).status, 422);
    assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY), null);
    const response = await r.closeReport(body); assert.equal(response.status, 201);
    const saved = await response.json() as { sections: { revenue: { status: string }; operations: { status: string } } }; assert.equal(saved.sections.revenue.status, "REJECTED"); assert.equal(saved.sections.operations.status, "SAVED");
    assert.deepEqual(r.get("bd_finance_revenue"), revenueBefore); assert.deepEqual(r.get("bd_sales_events_v1"), eventsBefore);
    assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY)[0].revenue, undefined);
    assert.equal(r.get("bd_cases").length, 1); assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY)[0].note, "operations");
    assert.equal((await r.closeReport(body)).status, 200); assert.equal(r.get("bd_cases").length, 1);
    assert.equal((await r.closeReport({ ...body, revenueRecord: { ...body.revenueRecord, note: "changed" } })).status, 422);
    assert.equal((await r.sale("one")).status, 200); assert.deepEqual(r.get("bd_stock_movements"), movements);
    assert.equal((await r.days())[0].status, "OPERATING");
    assert.equal((await r.send({ action: "close_shift", shiftId: "cash" })).status, 201);
    day = (await r.days())[0]; assert.equal(day.revenue.amount, 20); assert.equal(day.revenue.status, "FINAL"); assert.equal(day.cashShift?.status, "CLOSED"); assert.equal(day.status, "COMPLETE");
    assert.deepEqual(day.report?.payrollBreakdown, { total: 3 });
    assert.equal(r.get("bd_finance_revenue").reduce((sum: number, row: { revenue: number }) => sum + row.revenue, 0), day.revenue.amount);
  } finally { r.close(); }
});

test("G/L/M: two simultaneous sales share a cash shift, retain separate documents and stock, retry is idempotent", async () => {
  const r = await fixture();
  try {
    await r.send({ action: "open_shift", shiftId: "cash", name: "Cash" });
    const a = await r.quote("a"), b = await r.quote("b");
    const responses = await Promise.all([a, b].map(value => r.send({ action: "post", command: value.cmd, previewHash: value.hash })));
    assert.deepEqual(responses.map(response => response.status), [201, 201]);
    assert.equal(r.get("bd_sales_events_v1").length, 2); assert.equal(new Set(r.get("bd_stock_movements").map((row: { salesBatchId: string }) => row.salesBatchId)).size, 2);
    assert.equal(r.get("bd_finance_revenue")[0].revenue, 40); assert.equal(r.get("bd_assortment_v1").stockBalances[0].current, 18);
    assert.equal((await r.sale("a")).status, 200);
    assert.equal((await r.send({ action: "open_shift", shiftId: "other", name: "Other" })).status, 409);
    await r.send({ action: "close_shift", shiftId: "cash" });
    assert.equal((await r.days())[0].status, "AWAITING_OPERATIONAL_DATA");
  } finally { r.close(); }
});

test("operational save rollback on invalid writeoff or injected database failure retains all facts", async () => {
  const r = await fixture();
  try {
    await r.send({ action: "open_shift", shiftId: "cash", name: "Cash" }); await r.sale("one");
    const day = (await r.days())[0], before = r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all();
    const body = { shiftCloseId: "bad", revenueRecord: { date: day.businessDate, note: "must not persist" }, writeOffItems: [{ productKey: "missing", quantity: 1, reasonCode: "other" }], incidents: [{ title: "must not persist" }] };
    assert.equal((await r.closeReport(body)).status, 422); assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all(), before);
    r.failDatabase(); await assert.rejects(r.closeReport({ ...body, writeOffItems: [] }), /injected database failure/);
    assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all(), before);
  } finally { r.close(); }
});

test("POS operational writeoff uses canonical movement and expense; later save and old retry cannot duplicate stock or incidents", async () => {
  const r = await fixture();
  try {
    r.put("bd_stock_movements", [{ id: "receipt-beer", venueId: r.venueId, type: "receipt", date: "2026-09-01", productKey: "beer-stock", amount: 20, unit: "pcs", unitCost: 2, costAmount: 40, currency: "MDL", costStatus: "KNOWN", status: "active", createdAt: "2026-09-01T00:00:00Z", sourceDocumentId: "receipt", sourceLineId: "line" }]);
    await r.send({ action: "open_shift", shiftId: "cash", name: "Cash" }); await r.sale("one");
    const day = (await r.days())[0];
    const body = { shiftCloseId: "writeoff", revenueRecord: { date: day.businessDate, note: "first", staffing: [{ employeeId: "A" }], payrollBreakdown: { total: 4 } }, writeOffItems: [{ productKey: "beer-stock", quantity: 2, unit: "pcs", reasonCode: "breakage" }], incidents: [{ title: "Breakage" }] };
    const response = await r.closeReport(body); assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const movements = r.get("bd_stock_movements"); assert.equal(movements.length, 3); assert.equal(movements.find((row: { type: string }) => row.type === "writeoff").amount, -2);
    assert.equal(r.get("bd_assortment_v1").stockBalances[0].current, 17); assert.equal(r.get("bd_inventory_writeoffs").length, 1);
    assert.equal(r.get("bd_finance_expenses").length, 1);
    assert.equal((await r.closeReport({ ...body, shiftCloseId: "second-save", writeOffItems: [], incidents: [], revenueRecord: { ...body.revenueRecord, note: "second" } })).status, 201);
    assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY)[0].writeOffItemCount, 1);
    assert.equal((await r.closeReport(body)).status, 200); assert.deepEqual(r.get("bd_stock_movements"), movements);
    assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY)[0].note, "second"); assert.equal(r.get("bd_cases").length, 1);
  } finally { r.close(); }
});

test("corrupt store, closed month, foreign venue and mismatched Finance cannot cause a partial operational save", async () => {
  const r = await fixture();
  try {
    await r.send({ action: "open_shift", shiftId: "cash", name: "Cash" }); await r.sale("one");
    const day = (await r.days())[0], body = { shiftCloseId: "blocked", revenueRecord: { date: day.businessDate, note: "never persist" }, writeOffItems: [] };
    assert.equal((await r.closeReport({ ...body, venueId: r.venueId + 1 })).status, 403);
    r.put("bd_month_closings", [{ monthKey: day.businessDate.slice(0, 7), status: "closed", venueId: r.venueId }]);
    assert.equal((await r.closeReport(body)).status, 423); assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY), null);
    r.put("bd_month_closings", []); const revenues = r.get("bd_finance_revenue"); revenues[0].revenue = 999; r.put("bd_finance_revenue", revenues);
    assert.equal((await r.closeReport(body)).status, 422); assert.equal(r.get(OPERATIONAL_REPORT_STORE_KEY), null);
    r.put("bd_cases", { invalid: true }); const before = r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all();
    assert.equal((await r.closeReport(body)).status, 409); assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all(), before);
  } finally { r.close(); }
});

test("source contract classifies facts conservatively, never invents hybrid or rewrites legacy", () => {
  assert.deepEqual(REVENUE_SOURCES, ["BARDOC_POS", "MANUAL_SUMMARY", "IMPORT", "INTEGRATION"]);
  const revenues = [{ id: "row", venueId: 1, date: "2026-01-01", revenue: 75, revenueSource: "sales_events_v1", closingStatus: "closed" }];
  const input = { venueId: 1, businessDate: "2026-01-01", asOf: "2026-01-02", revenues };
  assert.equal(operationalDay(input).revenue.source, "LEGACY_UNKNOWN");
  for (const [source, expected] of [["POS_API", "BARDOC_POS"], ["FILE_IMPORT", "IMPORT"], ["ONE_C", "INTEGRATION"], ["alien", "LEGACY_UNKNOWN"]]) {
    const day = operationalDay({ ...input, events: [{ venueId: 1, businessDate: input.businessDate, revenueRowId: "row", status: "POSTED", source, revenue: 75 }] });
    assert.equal(day.revenue.source, expected); assert.equal(day.revenue.amount, 75); assert.equal(day.revenue.status, "FINAL");
  }
  assert.equal(revenues[0].revenue, 75);
});
