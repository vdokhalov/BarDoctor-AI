import { derivedInputBelongs } from "./derived-input-scope";
import { businessRecord as record, finiteBusinessNumber as finite, activeBusinessRow } from "./business-day-rows";
import { operationalDays } from "./operational-day";
import { stockQuantityEvidence } from "./stock-quantity-evidence";
import { venueDate, venueTimeFromJson } from "./venue-time";
import type { Availability } from "./evidence-contracts";

type Row = Record<string, unknown>;
export type HealthSourceState = Availability | "RESTRICTED";
export type HealthSource = { key: string; state: HealthSourceState; revision: string | null; updatedAt: string | null; data: unknown };
export type HealthCounter = { value: number | null; availability: HealthSourceState; evidenceStatus: "COMPLETE" | "PARTIAL" | "NONE"; zero: "KNOWN_ZERO" | null; sources: string[]; grain: string; window: string; diagnostics: string[] };
export type HealthOperationsInputs = {
  unclosedShifts: number | null;
  stockAnomalies: number | null;
  criticalBlockers: number | null;
  recurringEquipmentFailures: number | null;
  counters: Record<"unclosedShifts" | "stockAnomalies" | "criticalBlockers" | "recurringEquipmentFailures", HealthCounter>;
  days: Array<{ businessDate: string; status: string; cashShiftStatuses: string[]; reportSaved: boolean }>;
};
export const HEALTH_OPERATIONS_KEYS = ["bd_finance_revenue", "bd_operational_reports_v1", "bd_sales_events_v1", "bd_sales_documents", "bd_cases", "bd_equipment", "bd_equipment_history", "bd_equipment_work_orders", "bd_finance_expenses", "bd_assortment_v1", "bd_inventory_snapshots", "bd_opening_stock_v1", "bd_stock_movements"];
export const MAX_HEALTH_ROWS = 10_000;
export const MAX_HEALTH_SOURCE_BYTES = 2_000_000;
const array = (value: unknown): Row[] => Array.isArray(value) ? value.map(record) : [];
const id = (value: unknown) => typeof value === "string" && value.length > 0 || typeof value === "number" && Number.isSafeInteger(value);
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Read projections only. Missing/invalid/truncated stores can never prove an empty population. */
export function buildHealthOperationsInputs(input: { sources: HealthSource[]; venueId: number; workspaceId: number; dataAccountId: number; profile: Row; asOf: string; currency: string | null }): HealthOperationsInputs {
  const sourceMap = new Map(input.sources.map(source => [source.key, source]));
  const scope = { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId };
  const today = venueDate(input.asOf, venueTimeFromJson(JSON.stringify(input.profile)).timezone);
  const values = (key: string) => array(sourceMap.get(key)?.data).filter(value => derivedInputBelongs(value, scope));
  const counter = (keys: string[], value: number, grain: string, window: string, diagnostics: string[] = []): HealthCounter => {
    const states = keys.map(key => sourceMap.get(key)?.state ?? "UNAVAILABLE");
    const state: HealthSourceState = states.includes("RESTRICTED") ? "RESTRICTED" : states.includes("UNAVAILABLE") ? "UNAVAILABLE" : states.includes("PARTIAL") || diagnostics.length ? "PARTIAL" : "AVAILABLE";
    return { value: state === "AVAILABLE" ? value : null, availability: state, evidenceStatus: state === "AVAILABLE" ? "COMPLETE" : state === "PARTIAL" ? "PARTIAL" : "NONE", zero: state === "AVAILABLE" && value === 0 ? "KNOWN_ZERO" : null, sources: keys, grain, window, diagnostics };
  };
  const rowDiagnostics = (keys: string[]) => keys.flatMap(key => {
    const rows = array(sourceMap.get(key)?.data), seen = new Set<unknown>();
    return rows.some(row => !id(row.id) || seen.has(row.id) || (seen.add(row.id), !derivedInputBelongs(row, scope))) ? ["RECORD_NEEDS_REVIEW"] : [];
  });
  const dayKeys = ["bd_finance_revenue", "bd_operational_reports_v1", "bd_sales_events_v1", "bd_sales_documents"];
  const revenues = values("bd_finance_revenue").filter(activeBusinessRow), reports = values("bd_operational_reports_v1"), events = values("bd_sales_events_v1"), documents = values("bd_sales_documents");
  const dayDiagnostics = rowDiagnostics(dayKeys);
  if ([...revenues, ...reports, ...events, ...documents].some(row => !validDate(row.businessDate ?? row.date))) dayDiagnostics.push("BUSINESS_DATE_UNKNOWN");
  const days = operationalDays({ ...scope, asOf: input.asOf, currency: input.currency, revenues, reports, events, documents }).filter(day => day.businessDate <= today);
  // Existing open sessions are OPERATING, never a failure. Count actual recorded
  // business days awaiting their operational data once per venue/date.
  const unclosed = counter(dayKeys, days.filter(day => day.status === "AWAITING_OPERATIONAL_DATA").length, "VENUE_BUSINESS_DATE", `recorded business days through ${today}`, dayDiagnostics);

  const cases = values("bd_cases"), caseDiagnostics = rowDiagnostics(["bd_cases"]);
  if (cases.some(row => !row.priority || !row.status)) caseDiagnostics.push("CASE_STATE_UNKNOWN");
  const blockers = counter(["bd_cases"], cases.filter(row => activeBusinessRow(row) && row.priority === "critical" && !["closed", "resolved"].includes(String(row.status))).length, "CASE_ID", "current active cases", caseDiagnostics);

  const equipmentKeys = ["bd_equipment", "bd_equipment_history", "bd_equipment_work_orders", "bd_finance_expenses"];
  const equipment = values("bd_equipment"), history = values("bd_equipment_history"), orders = values("bd_equipment_work_orders"), expenses = values("bd_finance_expenses");
  const equipmentDiagnostics = rowDiagnostics(equipmentKeys);
  const parentIds = new Set(equipment.map(row => row.id));
  if ([...history, ...orders, ...expenses.filter(row => row.category === "repairs" && row.equipmentId)].some(row => !parentIds.has(row.equipmentId))) equipmentDiagnostics.push("RELATED_EVIDENCE_UNAVAILABLE");
  if (equipment.some(row => row.nextMaintenance != null && !validDate(row.nextMaintenance))) equipmentDiagnostics.push("MAINTENANCE_DATE_UNKNOWN");
  const affected = equipment.filter(item => {
    if (item.archived || ["replaced", "decommissioned"].includes(String(item.status))) return false;
    const repairs = new Set<string>();
    for (const order of orders.filter(row => row.equipmentId === item.id && activeBusinessRow(row) && row.kind !== "maintenance")) repairs.add(`work:${order.id}`);
    for (const event of history.filter(row => row.equipmentId === item.id && activeBusinessRow(row) && ["repair", "breakdown", "part_replacement", "warranty_repair"].includes(String(row.type)))) repairs.add(event.workOrderId ? `work:${event.workOrderId}` : `history:${event.id}`);
    for (const expense of expenses.filter(row => row.equipmentId === item.id && row.category === "repairs" && activeBusinessRow(row) && row.equipmentCostType !== "maintenance")) repairs.add(expense.equipmentWorkOrderId ? `work:${expense.equipmentWorkOrderId}` : `expense:${expense.id}`);
    return repairs.size >= 2 || validDate(item.nextMaintenance) && item.nextMaintenance < today;
  });
  // Keep the existing combined equipment counter and >=2 threshold; an asset
  // with both recurrence and overdue maintenance contributes only once.
  const equipmentCounter = counter(equipmentKeys, affected.length, "EQUIPMENT_ID", `retained repair history and maintenance due before ${today}`, equipmentDiagnostics);

  const stockKeys = ["bd_assortment_v1", "bd_inventory_snapshots", "bd_opening_stock_v1", "bd_stock_movements"];
  const balances = array(record(sourceMap.get("bd_assortment_v1")?.data).stockBalances), stockDiagnostics = rowDiagnostics(stockKeys.filter(key => key !== "bd_assortment_v1"));
  const projectedProducts = new Set(balances.map(balance => balance.productKey ?? balance.key));
  const catalogue = array(record(sourceMap.get("bd_assortment_v1")?.data).nomenclature);
  if (catalogue.some(item => item.active !== false && item.kind === "stock" && !projectedProducts.has(item.productKey ?? item.key ?? item.id))
    || values("bd_stock_movements").some(movement => activeBusinessRow(movement) && !projectedProducts.has(movement.productKey ?? movement.key))) stockDiagnostics.push("RELATED_EVIDENCE_UNAVAILABLE");
  const seenStock = new Set<string>();
  let anomalyCount = 0;
  for (const balance of balances) {
    const identity = JSON.stringify([balance.productKey ?? balance.key, balance.warehouseId ?? balance.warehouseExternalId ?? null, balance.unit]);
    if (!derivedInputBelongs(balance, scope) || !(balance.productKey ?? balance.key) || seenStock.has(identity)) { stockDiagnostics.push("RECORD_NEEDS_REVIEW"); continue; }
    seenStock.add(identity);
    const proof = stockQuantityEvidence({ ...scope, balance, movements: values("bd_stock_movements"), counts: values("bd_inventory_snapshots"), openings: values("bd_opening_stock_v1") });
    if (!proof.evidenceComplete) { stockDiagnostics.push(...proof.diagnostics, "PARTIAL_EVIDENCE"); continue; }
    const quantity = proof.quantity!, safety = finite(balance.safety ?? balance.minimum ?? balance.minStock);
    if (quantity <= 0 || safety !== null && quantity <= safety) anomalyCount += 1;
  }
  // Never double count the same low/negative balance or count a capped UI sample.
  const stockCounter = counter(stockKeys, anomalyCount, "PRODUCT_WAREHOUSE_UNIT", "current captured stock balances", [...new Set(stockDiagnostics)]);
  return { unclosedShifts: unclosed.value, criticalBlockers: blockers.value, recurringEquipmentFailures: equipmentCounter.value, stockAnomalies: stockCounter.value,
    counters: { unclosedShifts: unclosed, criticalBlockers: blockers, recurringEquipmentFailures: equipmentCounter, stockAnomalies: stockCounter },
    days: days.slice(0, 100).map(day => ({ businessDate: day.businessDate, status: day.status, cashShiftStatuses: day.cashShifts.map(shift => shift.status), reportSaved: day.report !== null })) };
}
