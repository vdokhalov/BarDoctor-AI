export const EQUIPMENT_STORE_KEY = "bd_equipment";
export const EQUIPMENT_HISTORY_STORE_KEY = "bd_equipment_history";
export const EQUIPMENT_WORK_ORDER_STORE_KEY = "bd_equipment_work_orders";
export const EQUIPMENT_EXPENSE_STORE_KEY = "bd_finance_expenses";
export const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

export const EQUIPMENT_WORKFLOW = [
  "detected",
  "assigned",
  "in_progress",
  "fixed",
  "verified",
] as const;

export type EquipmentWorkflowStatus = (typeof EQUIPMENT_WORKFLOW)[number];

export type MaintenancePolicy = {
  mode?: "interval_days" | "interval_months" | "date" | "as_needed" | "not_required";
  interval?: number;
  nextDate?: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function dateKey(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function isEquipmentWorkflowStatus(value: unknown): value is EquipmentWorkflowStatus {
  return typeof value === "string"
    && (EQUIPMENT_WORKFLOW as readonly string[]).includes(value);
}

export function canAdvanceEquipmentWorkflow(
  current: EquipmentWorkflowStatus,
  next: EquipmentWorkflowStatus,
): boolean {
  if (current === next) return true;
  const currentIndex = EQUIPMENT_WORKFLOW.indexOf(current);
  return EQUIPMENT_WORKFLOW[currentIndex + 1] === next;
}

export function equipmentExpenseId(workOrderId: string): string {
  return `equipment-work-order:${workOrderId}`;
}

export function nextMaintenanceFromPolicy(
  policyValue: unknown,
  completedDate: string,
): string | null {
  const policy = record(policyValue) as MaintenancePolicy | null;
  if (!policy?.mode) return null;
  if (policy.mode === "not_required" || policy.mode === "as_needed") return null;
  if (policy.mode === "date") {
    return typeof policy.nextDate === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(policy.nextDate)
      && policy.nextDate > completedDate
      ? policy.nextDate
      : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completedDate)) return null;
  const interval = Math.floor(Number(policy.interval));
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const completed = new Date(`${completedDate}T12:00:00.000Z`);
  if (Number.isNaN(completed.getTime())) return null;
  if (policy.mode === "interval_days") completed.setUTCDate(completed.getUTCDate() + interval);
  if (policy.mode === "interval_months") completed.setUTCMonth(completed.getUTCMonth() + interval);
  return dateKey(completed);
}

export type EquipmentCost = {
  id: string;
  equipmentId: string;
  date: string;
  amount: number;
  type: "repair" | "maintenance";
  source: "finance" | "work_order" | "history";
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function tupleKey(equipmentId: string, date: string, value: number): string {
  return `${equipmentId}|${date.slice(0, 10)}|${Math.round(value * 100)}`;
}

/**
 * Builds one factual cost stream for Equipment. Finance is authoritative when
 * a linked expense exists. Unlinked legacy work-order/history costs are kept,
 * while exact equipment/date/amount duplicates are ignored.
 */
export function mergeEquipmentCosts(input: {
  expenses?: unknown[];
  workOrders?: unknown[];
  history?: unknown[];
}): EquipmentCost[] {
  const result: EquipmentCost[] = [];
  const seenExpenseIds = new Set<string>();
  const seenTuples = new Set<string>();

  for (const value of input.expenses ?? []) {
    const row = record(value);
    if (!row || text(row.category) !== "repairs") continue;
    const equipmentId = text(row.equipmentId);
    const date = text(row.date);
    const valueAmount = amount(row.amount);
    if (!equipmentId || !date || valueAmount === null) continue;
    const id = text(row.id) || `finance:${result.length}`;
    const workOrderId = text(row.equipmentWorkOrderId);
    if (workOrderId) seenExpenseIds.add(equipmentExpenseId(workOrderId));
    seenExpenseIds.add(id);
    seenTuples.add(tupleKey(equipmentId, date, valueAmount));
    result.push({
      id,
      equipmentId,
      date,
      amount: valueAmount,
      type: text(row.equipmentCostType) === "maintenance" ? "maintenance" : "repair",
      source: "finance",
    });
  }

  for (const value of input.workOrders ?? []) {
    const row = record(value);
    if (!row) continue;
    const equipmentId = text(row.equipmentId);
    const date = text(row.costDate) || text(row.fixedAt) || text(row.updatedAt);
    const valueAmount = amount(row.cost);
    const id = text(row.financeExpenseId) || equipmentExpenseId(text(row.id));
    if (!equipmentId || !date || valueAmount === null || seenExpenseIds.has(id)) continue;
    const tuple = tupleKey(equipmentId, date, valueAmount);
    if (seenTuples.has(tuple)) continue;
    seenTuples.add(tuple);
    result.push({
      id: text(row.id) || `work-order:${result.length}`,
      equipmentId,
      date,
      amount: valueAmount,
      type: text(row.costType) === "maintenance" || text(row.kind) === "maintenance"
        ? "maintenance"
        : "repair",
      source: "work_order",
    });
  }

  for (const value of input.history ?? []) {
    const row = record(value);
    if (!row) continue;
    const equipmentId = text(row.equipmentId);
    const date = text(row.date);
    const valueAmount = amount(row.cost);
    if (!equipmentId || !date || valueAmount === null) continue;
    const tuple = tupleKey(equipmentId, date, valueAmount);
    if (seenTuples.has(tuple)) continue;
    seenTuples.add(tuple);
    result.push({
      id: text(row.id) || `history:${result.length}`,
      equipmentId,
      date,
      amount: valueAmount,
      type: ["maintenance", "cleaning", "inspection"].includes(text(row.type))
        ? "maintenance"
        : "repair",
      source: "history",
    });
  }

  return result.sort((left, right) => right.date.localeCompare(left.date));
}
