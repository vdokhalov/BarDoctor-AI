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
export type HealthOperationIssue = Row & { managementId: string; issueKey: string; title: string; target: {path:string;label:string}; verificationKind?: "day" | "stock" };
export type HealthStockFact = { managementId:string; productKey:string; warehouseKey:string; unit:string; name:string; quantity:number|null; minimum:number|null; evidenceComplete:boolean; active:boolean };
export type HealthOperationsInputs = {
  unclosedShifts: number | null;
  stockAnomalies: number | null;
  criticalBlockers: number | null;
  recurringEquipmentFailures: number | null;
  counters: Record<"unclosedShifts" | "stockAnomalies" | "criticalBlockers" | "recurringEquipmentFailures", HealthCounter>;
  days: Array<{ businessDate: string; status: string; cashShiftStatuses: string[]; reportSaved: boolean; managementId?:string }>;
  issues?: HealthOperationIssue[];
  stockFacts?: HealthStockFact[];
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
  const scopedValues = new Map<string, Row[]>();
  const values = (key: string) => {
    let result = scopedValues.get(key);
    if (!result) {
      result = array(sourceMap.get(key)?.data).filter(value => derivedInputBelongs(value, scope));
      scopedValues.set(key, result);
    }
    return result;
  };
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
  const stockSourcesTrusted=stockKeys.every(key=>{
    const source=sourceMap.get(key),data=record(source?.data);
    return source?.state==='AVAILABLE'&&!['STALE','PARTIAL','UNAVAILABLE','CONFLICT'].includes(String(data.sourceState))&&data.stale!==true&&data.sourceConflict!==true
      &&(!Array.isArray(source.data)||source.data.every(value=>record(value).stale!==true&&record(value).sourceConflict!==true));
  });
  const balances = array(record(sourceMap.get("bd_assortment_v1")?.data).stockBalances), stockDiagnostics = rowDiagnostics(stockKeys.filter(key => key !== "bd_assortment_v1"));
  if(!stockSourcesTrusted)stockDiagnostics.push('SOURCE_UNTRUSTED');
  const projectedProducts = new Set(balances.map(balance => balance.productKey ?? balance.key));
  const catalogue = array(record(sourceMap.get("bd_assortment_v1")?.data).nomenclature);
  if (catalogue.some(item => item.active !== false && item.kind === "stock" && !projectedProducts.has(item.productKey ?? item.key ?? item.id))
    || values("bd_stock_movements").some(movement => activeBusinessRow(movement) && !projectedProducts.has(movement.productKey ?? movement.key))) stockDiagnostics.push("RELATED_EVIDENCE_UNAVAILABLE");
  const seenStock = new Set<string>();
  // Partition once per read. Keep duplicate identities, original order and all
  // warehouses: the existing proof still decides scope, anchors and validity.
  const partition = (rows: Row[], key: (row: Row) => unknown) => {
    const groups = new Map<unknown, Row[]>();
    for (const row of rows) {
      const identity = key(row), group = groups.get(identity);
      if (group) group.push(row); else groups.set(identity, [row]);
    }
    return groups;
  };
  const movementsByProduct = partition(values("bd_stock_movements"), row => String(row.productKey ?? row.key ?? ""));
  const countsById = partition(values("bd_inventory_snapshots"), row => row.id);
  const openingsById = partition(values("bd_opening_stock_v1"), row => row.id);
  let anomalyCount = 0;
  const stockFacts: HealthStockFact[] = [];
  for (const balance of balances) {
    const identity = JSON.stringify([balance.productKey ?? balance.key, balance.warehouseId ?? balance.warehouseExternalId ?? null, balance.unit]);
    if (!derivedInputBelongs(balance, scope) || !(balance.productKey ?? balance.key) || seenStock.has(identity)) { stockDiagnostics.push("RECORD_NEEDS_REVIEW"); continue; }
    seenStock.add(identity);
    const proof = stockQuantityEvidence({ ...scope, balance,
      movements: movementsByProduct.get(String(balance.productKey ?? balance.key ?? "")) ?? [],
      counts: countsById.get(balance.lastInventoryDocumentId) ?? [],
      openings: openingsById.get(balance.openingDocumentId) ?? [] });
    const factTrusted=stockSourcesTrusted&&balance.stale!==true&&balance.sourceConflict!==true;
    const productKey = String(balance.productKey ?? balance.key), warehouseKey = String(balance.warehouseId ?? balance.warehouseExternalId ?? ""), unit = String(balance.unit ?? "");
    const minimum = finite(balance.safety ?? balance.minimum ?? balance.minStock);
    stockFacts.push({ managementId: `health:${input.venueId}:stock:${encodeURIComponent(JSON.stringify([productKey,warehouseKey,unit]))}`, productKey,warehouseKey,unit,
      name:String(catalogue.find(item => (item.productKey ?? item.key) === productKey)?.name ?? balance.name ?? productKey).slice(0,240),
      quantity:factTrusted&&proof.evidenceComplete?proof.quantity:null,minimum,evidenceComplete:factTrusted&&proof.evidenceComplete,active:factTrusted&&proof.evidenceComplete && (proof.quantity! <= 0 || minimum !== null && proof.quantity! <= minimum) });
    if(!factTrusted)stockDiagnostics.push('SOURCE_UNTRUSTED');
    if (!proof.evidenceComplete) { stockDiagnostics.push(...proof.diagnostics, "PARTIAL_EVIDENCE"); continue; }
    const quantity = proof.quantity!, safety = finite(balance.safety ?? balance.minimum ?? balance.minStock);
    if (quantity <= 0 || safety !== null && quantity <= safety) anomalyCount += 1;
  }
  // Never double count the same low/negative balance or count a capped UI sample.
  const stockCounter = counter(stockKeys, anomalyCount, "PRODUCT_WAREHOUSE_UNIT", "current captured stock balances", [...new Set(stockDiagnostics)]);
  const context = (managementId:string) => `venueId=${input.venueId}&healthAction=${encodeURIComponent(managementId)}&returnTo=health`;
  const evidence = (source:string, entityId:string, fact:string) => [{id:entityId,source,label:fact,fact}];
  const issues: HealthOperationIssue[] = [];
  if (blockers.availability === "AVAILABLE") for (const item of cases.filter(row => activeBusinessRow(row) && row.priority === "critical" && !["closed","resolved"].includes(String(row.status)))) {
    const entityId=String(item.id), managementId=`health:${input.venueId}:case:${encodeURIComponent(entityId)}`;
    issues.push({managementId,issueKey:"operational-blocker",caseId:entityId,affectedEntity:entityId,title:String(item.title ?? "Проверить критическую проблему").slice(0,240),
      priority:"critical",criticalOverride:true,managementActionable:true,signalClass:"problem",fact:"В заведении зафиксировано активное критическое происшествие.",
      consequence:"Критический статус требует внимания прежде менее срочных вопросов. Причина и безопасное состояние проверяются по происшествию.",
      action:"Открыть происшествие и проверить безопасное состояние и план устранения.",successCriterion:"Состояние и результат проверки зафиксированы в исходном происшествии.",deadline:"Сейчас",evidence:evidence("operations",entityId,"Активное critical происшествие"),
      target:{path:`/cases/${encodeURIComponent(entityId)}?venueId=${input.venueId}`,label:"Открыть происшествие"}});
  }
  if (unclosed.availability === "AVAILABLE") for (const day of days.filter(day => day.status === "AWAITING_OPERATIONAL_DATA")) {
    const managementId=`health:${input.venueId}:day:${day.businessDate}`,shiftId=day.cashShifts[0]?.id;
    issues.push({managementId,issueKey:"unclosed-shifts",affectedEntity:day.businessDate,businessDate:day.businessDate,verificationKind:"day",managementActionable:true,signalClass:"data_quality",
      title:`Заполнить операционный отчёт за ${day.businessDate}`,fact:`Рабочий день ${day.businessDate}: операционные данные неполны.`,
      consequence:"Пока отчёт не заполнен, операционные расходы и результат этого дня нельзя полноценно проверить.",
      action:"Проверить данные рабочего дня и сохранить операционный отчёт.",successCriterion:"Для этого рабочего дня выручка окончательная, операционный отчёт и ФОТ заполнены; день COMPLETE.",
      evidence:evidence("shifts",day.businessDate,"Рабочий день ожидает операционные данные"),
      target:{path:`/shifts?month=${day.businessDate.slice(0,7)}&${context(managementId)}&businessDate=${day.businessDate}${shiftId?"&shift="+encodeURIComponent(String(shiftId)):""}`,label:"Заполнить отчёт дня"}});
  }
  // Aggregate coverage can be partial because a different grain lacks an
  // anchor. Keep independently proven items actionable in the same queue.
  if (stockSourcesTrusted) for (const fact of stockFacts.filter(item=>item.active)) issues.push({
    ...fact,issueKey:"stock",affectedEntity:JSON.stringify([fact.productKey,fact.warehouseKey,fact.unit]),verificationKind:"stock",managementActionable:true,signalClass:"problem",
    title:`Проверить остаток: ${fact.name}`,fact:`${fact.name}: ${fact.quantity} ${fact.unit}${fact.minimum!==null?`, минимум ${fact.minimum} ${fact.unit}`:""}.`,
    consequence:"Остаток требует проверки обеспеченности позиции. Время до исчерпания и денежный эффект пока не установлены.",
    action:"Открыть точную складскую позицию и проверить пополнение или фактический остаток через существующие складские операции.",
    successCriterion:"Подтверждённый остаток этой позиции больше нуля и установленного минимального уровня.",evidence:evidence("warehouse",fact.managementId,"Подтверждённый низкий остаток"),
    target:{path:`/warehouse?${context(fact.managementId)}&product=${encodeURIComponent(fact.productKey)}&warehouseKey=${encodeURIComponent(fact.warehouseKey)}&unit=${encodeURIComponent(fact.unit)}`,label:"Проверить эту позицию"},
  });
  if (equipmentCounter.availability === "AVAILABLE") for (const item of affected) issues.push({
    managementId:`health:${input.venueId}:equipment:${encodeURIComponent(String(item.id))}`,issueKey:"equipment-recurring",equipmentId:String(item.id),affectedEntity:String(item.id),managementActionable:true,signalClass:"problem",
    title:validDate(item.nextMaintenance)&&item.nextMaintenance<today?`Проверить просроченное ТО: ${String(item.name ?? item.id)}`:`Проверить повторные ремонты: ${String(item.name ?? item.id)}`,
    fact:validDate(item.nextMaintenance)&&item.nextMaintenance<today?`Срок обслуживания: ${item.nextMaintenance}.` : "В истории оборудования есть повторные ремонтные события.",
    consequence:"Нужно проверить обслуживание и состояние оборудования. Финансовый эффект и физическое устранение неисправности не доказаны.",
    action:"Открыть карточку оборудования и проверить историю и план обслуживания.",successCriterion:"Результат обслуживания проверен и зафиксирован в существующих источниках.",deadline:"До следующей смены",
    evidence:evidence("equipment",String(item.id),"Оборудование требует проверки"),target:{path:`/equipment/${encodeURIComponent(String(item.id))}?venueId=${input.venueId}`,label:"Проверить оборудование"},
  });
  return { unclosedShifts: unclosed.value, criticalBlockers: blockers.value, recurringEquipmentFailures: equipmentCounter.value, stockAnomalies: stockCounter.value,
    counters: { unclosedShifts: unclosed, criticalBlockers: blockers, recurringEquipmentFailures: equipmentCounter, stockAnomalies: stockCounter },
    issues,stockFacts,
    days: days.map(day => ({ managementId:`health:${input.venueId}:day:${day.businessDate}`,businessDate: day.businessDate, status: day.status, cashShiftStatuses: day.cashShifts.map(shift => shift.status), reportSaved: day.report !== null })) };
}
