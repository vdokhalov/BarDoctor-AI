import { derivedInputBelongs } from "./derived-input-scope";
import { getD1 } from "../../db";
import { authenticatedEvidenceContext } from "./evidence-resolver";
import { hasPermission, permissionPayload, isAccessRole } from "./access-control";
import { canReadVenueSource } from "./venue-context-access";
import { businessRecord as row, scopedBusinessRows, finiteBusinessNumber } from "./business-day-rows";
import { accountingCurrencyFromProfile } from "./currency";
import { readFinanceInputs } from "./finance-inputs";
import { monthlySnapshotRows, reconcileMonthlyReport, historicalPeriodCost } from "./financial-reconciliation";
import { existingMonthlyCalculation } from "./month-report-calculation.js";
import { runStoreCasBatch, storeSnapshots, StoreWriteConflictError } from "./store-cas";
import { venueDate, venueTimeFromJson } from "./venue-time";
import { stableSalesValue } from "./sales-events";

type Row = Record<string, unknown>;
export const MONTH_CLOSE_VERSION = "verified-month-close-v1";
export const MONTH_CLOSE_INPUT_KEYS = ["bd_finance_revenue", "bd_operational_reports_v1", "bd_sales_events_v1", "bd_sales_documents", "bd_sales_batches", "bd_stock_movements", "bd_inventory_snapshots", "bd_finance_expenses", "bd_payroll_entries", "bd_purchase_documents", "bd_finance_settings", "bd_finance_gap_reasons", "bd_inventory_writeoffs", "bd_opening_stock_v1"];
const KEYS = [...MONTH_CLOSE_INPUT_KEYS, "bd_month_closings"];
const array = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];
const money = (value: number) => Math.round(value * 100) / 100;
export async function monthCloseRevision(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableSalesValue(JSON.parse(JSON.stringify(value)))));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const conflict = () => response({ ok: false, code: "MONTH_CLOSE_INPUTS_CHANGED", error: "Данные месяца изменились. Обновите проверку перед закрытием." }, 409);

/** Reuse the shipped monthly formula; add the recorded Finance and captured-cost
 * contracts. This is a read calculation, never a new accounting ledger. */
export function calculateVerifiedMonth(input: { profile: Row; stores: Record<string, Row[]>; venueId: number; workspaceId: number; dataAccountId: number; monthKey: string; asOf: string }) {
  const { profile, stores, venueId, workspaceId, dataAccountId, monthKey, asOf } = input;
  const currency = accountingCurrencyFromProfile(profile);
  const startDate = `${monthKey}-01`, endDate = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5)), 0)).toISOString().slice(0, 10);
  const scope = { venueId, workspaceId, dataAccountId };
  const data = Object.fromEntries(Object.entries(stores).map(([key, values]) => [key, scopedBusinessRows(values.map(value => value.venueId === "primary" ? { ...value, venueId } : value), scope)]));
  const finance = readFinanceInputs({ ...scope, currency, asOf, startDate, endDate, revenues: data.bd_finance_revenue ?? [], reports: data.bd_operational_reports_v1, events: data.bd_sales_events_v1, documents: data.bd_sales_documents, expenses: data.bd_finance_expenses, payrollEntries: data.bd_payroll_entries });
  const snapshots = monthlySnapshotRows(data.bd_inventory_snapshots, venueId);
  const settings = data.bd_finance_settings?.find(value => value.id === "primary" || Number(value.id) === venueId) ?? data.bd_finance_settings?.[0] ?? {};
  const localDay = venueDate(asOf, venueTimeFromJson(JSON.stringify(profile)).timezone);
  const base = existingMonthlyCalculation(profile, monthKey, finance.revenueRows, data.bd_finance_expenses ?? [], snapshots, settings, data.bd_finance_gap_reasons ?? [], data, `${localDay}T12:00:00Z`, currency) as Row;
  const report = reconcileMonthlyReport({ report: base, venueId, monthKey, snapshots, revenues: finance.revenueRows, events: data.bd_sales_events_v1, movements: data.bd_stock_movements, documents: data.bd_sales_documents, batches: data.bd_sales_batches });
  const history = historicalPeriodCost({ venueId, monthKey, accountingCurrency: currency ?? "", revenues: finance.revenueRows, events: data.bd_sales_events_v1, movements: data.bd_stock_movements, documents: data.bd_sales_documents, batches: data.bd_sales_batches });
  const reasons = [...finance.missing, ...history.reasons];
  for (const field of ["taxModel", "utilityModel"]) {
    const model = row(settings[field]);
    if (model.mode != null && !["manual", "fixed", "percent"].includes(String(model.mode)) || model.mode === "fixed" && finiteBusinessNumber(model.amount) == null || model.mode === "percent" && finiteBusinessNumber(model.percent) == null) reasons.push("RECURRING_INPUT_UNKNOWN");
  }
  if ((data.bd_purchase_documents ?? []).some(value => value.status === "confirmed" && value.documentType !== "price_list" && String(value.date).slice(0, 7) === monthKey && finiteBusinessNumber(value.total) == null)) reasons.push("PURCHASE_AMOUNT_UNKNOWN");
  if (Object.values(stores).some(values => !derivedInputBelongs(values, scope))) reasons.push("NESTED_INPUT_SCOPE_MISMATCH");
  if (!currency || Number(report.unconvertedForeignCurrencyCount) > 0) reasons.push("CURRENCY_UNKNOWN_OR_UNCONVERTED");
  if (!report.periodPast) reasons.push("PERIOD_NOT_ENDED");
  if (report.expectedShifts !== report.accountedShifts) reasons.push("BUSINESS_DAY_COVERAGE_INCOMPLETE");
  if (finance.days.some(day => day.revenue.status !== "FINAL")) reasons.push("REVENUE_NOT_FINAL");
  if (row(report.openingSnapshot).phase7SnapshotKnown !== true || row(report.closingSnapshot).phase7SnapshotKnown !== true) reasons.push("INVENTORY_BOUNDARY_UNKNOWN");
  const finalProfit = reasons.length || finance.revenue == null || finance.payroll == null ? null : money(finance.revenue - history.cost! + history.adjustment - Number(report.writeoffs) - finance.payroll - Number(report.otherExpenses) - Number(report.taxes) - Number(report.utilities));
  const payrollDelta = finance.payroll == null ? null : finance.payroll - Number(report.payroll);
  const adjust = (value: unknown) => value == null || payrollDelta == null ? null : money(Number(value) - payrollDelta);
  const snapshot = JSON.parse(JSON.stringify({ ...report, revenue: finance.revenue, payroll: finance.payroll, payrollBase: finance.payrollBase, payrollBonuses: finance.payrollBonuses, payrollPaid: finance.payrollPaid, payrollDeductions: finance.payrollDeductions, payrollSource: finance.payrollBasis, payrollNet: finance.payroll == null || finance.payrollDeductions == null ? null : money(finance.payroll - finance.payrollDeductions), resultBeforeCost: adjust(report.resultBeforeCost), cashResult: adjust(report.cashResult), shiftEstimates: array(report.shiftEstimates).map(shift => { const payroll = finance.payrollByDay.find(day => day.businessDate === shift.date)?.amount ?? null; const adjustDay = (value: unknown) => value == null || payroll == null ? null : money(Number(value) + Number(shift.payroll) - payroll); return { ...shift, payroll, resultBeforeCost: adjustDay(shift.resultBeforeCost), estimatedResult: adjustDay(shift.estimatedResult) }; }), costOfGoods: history.known ? history.cost : null, rawCostOfGoods: history.known ? history.cost : null, costBasis: "historical_sales_snapshots", inventoryAdjustmentNet: history.known ? history.adjustment : null, operatingResult: finalProfit, finalProfit, isClosed: false, status: "preliminary" })) as Row;
  return { currency, startDate, endDate, snapshot, eligible: finalProfit != null && Number.isFinite(finalProfit), reasons: [...new Set(reasons)], components: { revenue: finance.revenue, recordedFOT: finance.payroll, payrollByDay: finance.payrollByDay, activeExpenses: finance.operatingExpenses, capturedCOGS: history.cost, inventoryAdjustment: history.adjustment, openingId: row(report.openingSnapshot).id ?? null, closingId: row(report.closingSnapshot).id ?? null, openingBoundaryBasis: row(report.openingSnapshot).phase7PhysicalSnapshot === true ? "CAPTURED_PHYSICAL_VALUATION" : "LEGACY_RECORDED_TOTAL", closingBoundaryBasis: row(report.closingSnapshot).phase7PhysicalSnapshot === true ? "CAPTURED_PHYSICAL_VALUATION" : "LEGACY_RECORDED_TOTAL", finalResult: finalProfit } };
}

export async function verifiedMonthCloseRequest(request: Request): Promise<Response> {
  const context = await authenticatedEvidenceContext(request);
  if (!context) return response({ ok: false, code: "UNAVAILABLE" }, 401);
  if (!hasPermission(context.account, "reports.view") || !KEYS.every(key => canReadVenueSource(context.account, key)) || request.method === "POST" && !hasPermission(context.account, "month.close")) return response({ ok: false, code: "ACCESS_DENIED" }, 403);
  const url = new URL(request.url), body = request.method === "POST" ? row(await request.json().catch(() => null)) : {};
  const monthKey = String(body.monthKey ?? url.searchParams.get("monthKey") ?? "");
  const { venueId, workspaceId, account } = context;
  for (const [key, expected] of Object.entries({ venueId, workspaceId, dataAccountId: account.id })) if ((body[key] ?? url.searchParams.get(key)) != null && Number(body[key] ?? url.searchParams.get(key)) !== expected) return response({ ok: false, code: "UNAVAILABLE" }, 404);
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(monthKey)) return response({ ok: false, code: "INVALID_PERIOD" }, 400);
  const database = getD1(), asOf = new Date().toISOString();
  // UNION is one SQLite read snapshot, including profile and selected live access.
  const boundarySql = `SELECT json_object('role',vm.role,'permissions',vm.permissions_json,'workspace',v.workspace_id,'dataAccount',v.data_account_id) FROM venues v JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active' JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?`;
  const boundaryArgs = [account.actorAccountId, venueId, account.id, account.membershipId];
  const result = await database.prepare(`SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN (${KEYS.map(() => "?").join(",")}) UNION ALL SELECT '__profile__',restaurant_json,updated_at FROM accounts WHERE id=? UNION ALL SELECT '__access__',(${boundarySql}),NULL`).bind(account.id, ...KEYS, account.id, ...boundaryArgs).all<{ store_key: string; data_json: string; updated_at: string | null }>();
  const loaded = result.results ?? [], profileRow = loaded.find(value => value.store_key === "__profile__"), boundaryRow = loaded.find(value => value.store_key === "__access__");
  if (!profileRow || !boundaryRow?.data_json) return response({ ok: false, code: "UNAVAILABLE" }, 401);
  const boundary = row(JSON.parse(boundaryRow.data_json));
  if (!isAccessRole(boundary.role)) return response({ ok: false, code: "UNAVAILABLE" }, 401);
  const currentAccount = { ...account, ...permissionPayload(boundary.role, typeof boundary.permissions === "string" ? boundary.permissions : null) };
  if (!hasPermission(currentAccount, "reports.view") || !KEYS.every(key => canReadVenueSource(currentAccount, key)) || request.method === "POST" && !hasPermission(currentAccount, "month.close")) return response({ ok: false, code: "ACCESS_DENIED" }, 403);
  const snapshots = storeSnapshots(loaded, KEYS);
  let stores: Record<string, Row[]>;
  let profile: Row;
  try { profile = row(JSON.parse(profileRow.data_json ?? "{}")); stores = Object.fromEntries(snapshots.map(value => { const data = JSON.parse(value.dataJson ?? "[]"); if (!Array.isArray(data)) throw new Error("invalid store"); return [value.key, array(data)]; })); } catch { return response({ ok: false, code: "MONTH_INPUTS_NEED_REVIEW" }, 422); }
  const closings = stores.bd_month_closings.filter(value => derivedInputBelongs(value, { venueId, workspaceId, dataAccountId: account.id }));
  if (closings.filter(value => value.monthKey === monthKey).length > 1) return response({ ok: false, code: "AMBIGUOUS_MONTH_CLOSING" }, 422);
  const closing = closings.find(value => value.monthKey === monthKey && (value.venueId == null || value.venueId === "primary" || Number(value.venueId) === venueId));
  if (closing?.status === "closed") {
    const manifest = row(closing.inputManifest);
    const verified = manifest.version === MONTH_CLOSE_VERSION && closing.snapshotRevision === await monthCloseRevision(closing.snapshot) && closing.manifestRevision === await monthCloseRevision(manifest) && row(manifest.scope).venueId === venueId && row(manifest.scope).workspaceId === workspaceId && row(manifest.scope).dataAccountId === account.id && manifest.monthKey === monthKey;
    if (request.method === "POST") return verified && closing.previewRevision === body.previewRevision ? response({ ok: true, closing, closings, idempotent: true }) : response({ ok: false, code: "MONTH_ALREADY_CLOSED" }, 409);
    return response({ ok: true, closing, evidenceStatus: verified ? "VERIFIED" : manifest.version === MONTH_CLOSE_VERSION ? "INVALID" : "LEGACY_PARTIAL", report: closing.snapshot });
  }
  const calculation = calculateVerifiedMonth({ profile, stores, venueId, workspaceId, dataAccountId: account.id, monthKey, asOf });
  const manifest = { version: MONTH_CLOSE_VERSION, scope: { venueId, workspaceId, dataAccountId: account.id }, monthKey, startDate: calculation.startDate, endDate: calculation.endDate, currency: calculation.currency, calculationVersion: MONTH_CLOSE_VERSION, sources: await Promise.all(snapshots.filter(value => value.key !== "bd_month_closings").map(async value => ({ key: value.key, present: value.dataJson != null, updatedAt: value.updatedAt, revision: await monthCloseRevision(value.dataJson) }))), profileRevision: await monthCloseRevision(profileRow.data_json), components: calculation.components };
  const previewRevision = await monthCloseRevision(manifest);
  if (request.method !== "POST") return response({ ok: true, ...calculation, report: calculation.snapshot, inputManifest: manifest, previewRevision, evidenceStatus: "PREVIEW" });
  if (body.previewRevision !== previewRevision) return conflict();
  if (!calculation.eligible) return response({ ok: false, code: "MONTH_NOT_READY", reasons: calculation.reasons }, 422);
  const next = { ...closing, id: closing?.id ?? `${venueId}:${monthKey}`, venueId, monthKey, status: "closed", createdAt: closing?.createdAt ?? asOf, updatedAt: asOf, closedAt: asOf, closedBy: account.actorAccountId, snapshot: calculation.snapshot, inputManifest: manifest, previewRevision, manifestRevision: previewRevision, snapshotRevision: await monthCloseRevision(calculation.snapshot) };
  // The extra guard also covers profile and live membership changes in the gap
  // between authentication/read and the atomic close. Same CAS failure semantics.
  const boundaryGuard = database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,'__bd_month_close_guard_v1__',NULL,? WHERE NOT (EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?) AND (${boundarySql}) IS ?)`).bind(account.id, asOf, account.id, profileRow.data_json, ...boundaryArgs, boundaryRow.data_json);
  const values = stores.bd_month_closings.filter(value => value.id !== next.id);
  try {
    await runStoreCasBatch(database, account.id, snapshots, [boundaryGuard, database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_month_closings',?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(account.id, JSON.stringify([...values, next]), asOf), database.prepare(`INSERT INTO audit_log(account_id,store_key,action,entity_id,month_key,before_json,after_json,actor_name,actor_role,created_at) VALUES(?,'bd_month_closings','close',?,?,?,?,?,?,?)`).bind(account.id, next.id, monthKey, closing ? JSON.stringify(closing) : null, JSON.stringify(next), String(account.firstName || account.actorAccountId), currentAccount.role, asOf)], asOf);
  } catch (error) { if (error instanceof StoreWriteConflictError) return conflict(); throw error; }
  return response({ ok: true, closing: next, closings: [...closings.filter(value => value.id !== next.id), next], evidenceStatus: "VERIFIED" });
}
