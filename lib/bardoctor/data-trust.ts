import {
  hasPermission,
  isAccessRole,
  permissionsFor,
  type AuthenticatedAccount,
  type PermissionKey,
} from "./access-control";

export type DataMutation = {
  action: "create" | "update" | "delete";
  entityId: string | null;
  entityLabel: string | null;
  monthKey: string | null;
  before: unknown;
  after: unknown;
  changedFields: string[];
};

export const MONTH_LOCKED_STORE_KEYS = new Set([
  "bd_finance_revenue",
  "bd_finance_expenses",
  "bd_finance_gap_reasons",
  "bd_inventory_snapshots",
  "bd_purchase_documents",
  "bd_stock_movements",
  "bd_sales_documents",
  "bd_sales_batches",
  "bd_payroll_entries",
]);

const ROLE_WRITE_KEYS: Record<string, Set<string> | "all"> = {
  owner: "all",
  admin: "all",
  manager: "all",
  accountant: new Set([
    "bd_finance_revenue",
    "bd_finance_expenses",
    "bd_finance_gap_reasons",
    "bd_inventory_snapshots",
    "bd_finance_settings",
    "bd_payroll_rules",
    "bd_payroll_entries",
    "bd_month_closings",
    "bd_import_history",
    "bd_suppliers",
    "bd_purchase_documents",
    "bd_assortment_v1",
    "bd_stock_movements",
    "bd_sales_documents",
    "bd_sales_batches",
    "bd_sales_mappings",
    "bd_sales_warehouse_routes",
  ]),
  shift_manager: new Set([
    "bd_finance_revenue",
    "bd_finance_gap_reasons",
    "bd_cases",
    "bd_events",
    "bd_tasks",
    "bd_action_plans",
    "bd_action_tasks",
    "bd_decisions",
    "bd_equipment",
    "bd_equipment_history",
    "bd_equipment_work_orders",
    "bd_suppliers",
    "bd_purchase_documents",
    "bd_assortment_v1",
    "bd_stock_movements",
    "bd_sales_documents",
    "bd_sales_batches",
  ]),
  employee: new Set(["bd_cases", "bd_events", "bd_tasks", "bd_action_tasks", "bd_decisions"]),
  viewer: new Set(),
};

type AccessSubject =
  | string
  | Pick<AuthenticatedAccount, "role" | "permissions">;

const STORE_ACCESS: Record<string, { read: PermissionKey; write: PermissionKey }> = {
  bd_employees: { read: "team.view", write: "team.manage" },
  bd_finance_revenue: { read: "shifts.view", write: "shifts.manage" },
  bd_finance_expenses: { read: "finance.view", write: "finance.manage" },
  bd_finance_gap_reasons: { read: "shifts.view", write: "shifts.manage" },
  bd_inventory_snapshots: { read: "inventory.view", write: "inventory.manage" },
  bd_suppliers: { read: "inventory.view", write: "inventory.manage" },
  bd_purchase_documents: { read: "inventory.view", write: "inventory.manage" },
  bd_assortment_v1: { read: "inventory.view", write: "inventory.manage" },
  bd_stock_movements: { read: "inventory.view", write: "inventory.manage" },
  bd_sales_documents: { read: "shifts.view", write: "shifts.manage" },
  bd_sales_batches: { read: "sales.view", write: "sales.create" },
  bd_sales_mappings: { read: "sales.view", write: "sales.manage_mapping" },
  bd_sales_warehouse_routes: { read: "sales.view", write: "sales.manage_mapping" },
  bd_warehouses: { read: "inventory.view", write: "integrations.manage" },
  bd_finance_settings: { read: "finance.view", write: "settings.manage" },
  bd_equipment: { read: "equipment.view", write: "equipment.manage" },
  bd_equipment_history: { read: "equipment.view", write: "equipment.manage" },
  bd_equipment_work_orders: { read: "equipment.view", write: "equipment.manage" },
  bd_payroll_rules: { read: "payroll.view", write: "payroll.manage" },
  bd_payroll_entries: { read: "payroll.view", write: "payroll.manage" },
  bd_cases: { read: "incidents.view", write: "incidents.manage" },
  bd_events: { read: "tasks.view", write: "tasks.manage" },
  bd_tasks: { read: "tasks.view", write: "tasks.manage" },
  bd_action_plans: { read: "tasks.view", write: "tasks.manage" },
  bd_action_tasks: { read: "tasks.view", write: "tasks.manage" },
  bd_decisions: { read: "tasks.view", write: "tasks.manage" },
  bd_ai_diagnosis_v3: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v4: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v5: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v6: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v7: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v8: { read: "analysis.view", write: "analysis.run" },
  bd_ai_diagnosis_v9: { read: "analysis.view", write: "analysis.run" },
  bd_guest_reviews: { read: "reviews.view", write: "reviews.manage" },
  bd_month_closings: { read: "reports.view", write: "month.close" },
  bd_opportunity_calendar_v1: { read: "calendar.view", write: "calendar.manage" },
  bd_access_roles: { read: "access.manage", write: "access.manage" },
  bd_import_history: { read: "audit.view", write: "data.import" },
};

function subjectHas(subject: AccessSubject, permission: PermissionKey): boolean {
  if (typeof subject !== "string") return hasPermission(subject, permission);
  if (subject === "admin") return true;
  if (isAccessRole(subject)) {
    return hasPermission({ role: subject, permissions: permissionsFor(subject) }, permission);
  }
  return false;
}

export function canReadStore(subject: AccessSubject, storeKey: string): boolean {
  const access = STORE_ACCESS[storeKey];
  return Boolean(access && subjectHas(subject, access.read));
}

function recordStatus(value: unknown): string {
  return value && typeof value === "object" && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).status === "string"
    ? String((value as Record<string, unknown>).status)
    : "";
}

function requiredWritePermissions(
  storeKey: string,
  mutations: DataMutation[],
): PermissionKey[] {
  const access = STORE_ACCESS[storeKey];
  if (!access) return [];
  const required = new Set<PermissionKey>([access.write]);

  if (storeKey === "bd_finance_expenses" && mutations.length > 0) {
    required.clear();
    required.add(
      mutations.every((mutation) => mutation.action === "create")
        ? "expenses.create"
        : "finance.manage",
    );
  }
  if (
    storeKey === "bd_finance_revenue"
    && mutations.some((mutation) => mutation.action === "delete")
  ) {
    required.add("shifts.delete");
  }
  if (storeKey === "bd_payroll_entries") {
    const approvalOnly = mutations.length > 0 && mutations.every((mutation) =>
      mutation.action === "update"
      && mutation.changedFields.length > 0
      && mutation.changedFields.every((field) =>
        ["confirmationStatus", "confirmedAt", "confirmedBy", "updatedAt"].includes(field),
      )
    );
    if (approvalOnly) {
      required.clear();
      required.add("payroll.approve");
    }
  }
  if (storeKey === "bd_month_closings") {
    required.clear();
    required.add(
      mutations.some((mutation) => recordStatus(mutation.after) === "reopened")
        ? "month.reopen"
        : "month.close",
    );
  }
  return [...required];
}

export function canWriteStore(
  subject: AccessSubject,
  storeKey: string,
  mutations: DataMutation[] = [],
): boolean {
  if (typeof subject === "string" && !isAccessRole(subject)) {
    const legacy = ROLE_WRITE_KEYS[subject] ?? ROLE_WRITE_KEYS.viewer;
    return legacy === "all" || legacy.has(storeKey);
  }
  const required = requiredWritePermissions(storeKey, mutations);
  return required.length > 0 && required.every((permission) => subjectHas(subject, permission));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableValue(left) === stableValue(right);
}

function recordId(value: unknown, index: number): string {
  if (!isRecord(value)) return `index:${index}`;
  const candidate = value.id ?? value.entryId ?? value.monthKey ?? value.date;
  return candidate == null || String(candidate).trim() === "" ? `index:${index}` : String(candidate);
}

function recordTimestamp(value: unknown): string {
  if (!isRecord(value)) return "";
  const candidate = value.updatedAt ?? value.createdAt;
  return typeof candidate === "string" ? candidate : "";
}

export type StoreMergeResult = {
  data: unknown;
  conflicts: number;
};

/**
 * Three-way merge for a store snapshot.
 *
 * `base` is what the client originally read, `desired` is the client's new
 * state and `current` is the state already stored by another request. This
 * keeps independent edits from different venue users instead of silently
 * replacing the whole store with the last PUT.
 */
export function mergeConcurrentStoreData(
  base: unknown,
  desired: unknown,
  current: unknown,
): StoreMergeResult {
  if (valuesEqual(desired, current)) return { data: desired, conflicts: 0 };

  if (Array.isArray(base) && Array.isArray(desired) && Array.isArray(current)) {
    const asMap = (rows: unknown[]) =>
      new Map(rows.map((value, index) => [recordId(value, index), value]));
    const baseMap = asMap(base);
    const desiredMap = asMap(desired);
    const currentMap = asMap(current);
    const ids = new Set([
      ...desiredMap.keys(),
      ...currentMap.keys(),
      ...baseMap.keys(),
    ]);
    const merged: unknown[] = [];
    let conflicts = 0;

    for (const id of ids) {
      const previous = baseMap.get(id);
      const local = desiredMap.get(id);
      const remote = currentMap.get(id);
      const localChanged = !valuesEqual(local, previous);
      const remoteChanged = !valuesEqual(remote, previous);

      if (!localChanged && !remoteChanged) {
        if (remote !== undefined) merged.push(remote);
        continue;
      }
      if (remoteChanged && !localChanged) {
        if (remote !== undefined) merged.push(remote);
        continue;
      }
      if (localChanged && !remoteChanged) {
        if (local !== undefined) merged.push(local);
        continue;
      }
      if (valuesEqual(local, remote)) {
        if (local !== undefined) merged.push(local);
        continue;
      }

      conflicts += 1;
      if (local === undefined) {
        if (remote !== undefined) merged.push(remote);
      } else if (remote === undefined) {
        merged.push(local);
      } else {
        merged.push(
          recordTimestamp(local) > recordTimestamp(remote) ? local : remote,
        );
      }
    }

    return { data: merged, conflicts };
  }

  if (isRecord(base) && isRecord(desired) && isRecord(current)) {
    const keys = new Set([
      ...Object.keys(desired),
      ...Object.keys(current),
      ...Object.keys(base),
    ]);
    const merged: Record<string, unknown> = {};
    let conflicts = 0;

    for (const key of keys) {
      const previous = base[key];
      const local = desired[key];
      const remote = current[key];
      const localChanged = !valuesEqual(local, previous);
      const remoteChanged = !valuesEqual(remote, previous);

      if (!localChanged) {
        if (remote !== undefined) merged[key] = remote;
      } else if (!remoteChanged || valuesEqual(local, remote)) {
        if (local !== undefined) merged[key] = local;
      } else if (local === undefined) {
        if (remote !== undefined) merged[key] = remote;
        conflicts += 1;
      } else {
        merged[key] = local;
        conflicts += 1;
      }
    }

    return { data: merged, conflicts };
  }

  const localChanged = !valuesEqual(desired, base);
  const remoteChanged = !valuesEqual(current, base);
  if (!localChanged) return { data: current, conflicts: 0 };
  if (!remoteChanged || valuesEqual(desired, current)) {
    return { data: desired, conflicts: 0 };
  }
  return { data: desired, conflicts: 1 };
}

function recordLabel(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const candidate =
    value.title ??
    value.name ??
    value.employeeName ??
    value.customCategoryLabel ??
    value.description ??
    value.category ??
    value.type ??
    value.date;
  return candidate == null ? null : String(candidate).slice(0, 180);
}

export function monthKeyFromValue(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const candidates = [
    value.monthKey,
    value.accountingMonth,
    value.month,
    value.date,
    value.periodStart,
    value.shiftStart,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const match = candidate.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  return null;
}

function changedFields(before: unknown, after: unknown): string[] {
  if (!isRecord(before) || !isRecord(after)) return ["value"];
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields].filter((field) => stableValue(before[field]) !== stableValue(after[field]));
}

export function compareStoreData(before: unknown, after: unknown): DataMutation[] {
  if (stableValue(before) === stableValue(after)) return [];

  if (!Array.isArray(before) || !Array.isArray(after)) {
    return [
      {
        action: before == null ? "create" : after == null ? "delete" : "update",
        entityId: null,
        entityLabel: recordLabel(after ?? before),
        monthKey: monthKeyFromValue(after) ?? monthKeyFromValue(before),
        before,
        after,
        changedFields: changedFields(before, after),
      },
    ];
  }

  const previous = new Map(before.map((value, index) => [recordId(value, index), value]));
  const next = new Map(after.map((value, index) => [recordId(value, index), value]));
  const mutations: DataMutation[] = [];

  for (const [id, value] of next) {
    const oldValue = previous.get(id);
    if (oldValue === undefined) {
      mutations.push({
        action: "create",
        entityId: id,
        entityLabel: recordLabel(value),
        monthKey: monthKeyFromValue(value),
        before: null,
        after: value,
        changedFields: isRecord(value) ? Object.keys(value) : ["value"],
      });
    } else if (stableValue(oldValue) !== stableValue(value)) {
      mutations.push({
        action: "update",
        entityId: id,
        entityLabel: recordLabel(value) ?? recordLabel(oldValue),
        monthKey: monthKeyFromValue(value) ?? monthKeyFromValue(oldValue),
        before: oldValue,
        after: value,
        changedFields: changedFields(oldValue, value),
      });
    }
  }

  for (const [id, value] of previous) {
    if (next.has(id)) continue;
    mutations.push({
      action: "delete",
      entityId: id,
      entityLabel: recordLabel(value),
      monthKey: monthKeyFromValue(value),
      before: value,
      after: null,
      changedFields: isRecord(value) ? Object.keys(value) : ["value"],
    });
  }

  return mutations;
}

export function closedMonthsFromStore(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .filter((item) => isRecord(item) && item.status === "closed" && typeof item.monthKey === "string")
      .map((item) => String((item as Record<string, unknown>).monthKey)),
  );
}
