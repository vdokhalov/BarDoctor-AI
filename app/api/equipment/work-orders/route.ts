import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  canAdvanceEquipmentWorkflow,
  EQUIPMENT_EXPENSE_STORE_KEY,
  EQUIPMENT_HISTORY_STORE_KEY,
  EQUIPMENT_STORE_KEY,
  EQUIPMENT_WORK_ORDER_STORE_KEY,
  equipmentExpenseId,
  isEquipmentWorkflowStatus,
  MONTH_CLOSING_STORE_KEY,
  nextMaintenanceFromPolicy,
  type EquipmentWorkflowStatus,
} from "../../../../lib/bardoctor/equipment";

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

const KINDS = new Set(["problem", "repair", "maintenance"]);
const PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const PROBLEM_STATUSES = new Set(["broken", "needs_maintenance"]);
const EMPLOYEE_STORE_KEY = "bd_employees";

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function array(value: string | undefined): JsonRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is JsonRecord => Boolean(record(item))) : [];
  } catch {
    return [];
  }
}

function json(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function date(value: unknown, fallback: string): string {
  const candidate = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function upsertStore(
  database: D1Database,
  accountId: number,
  key: string,
  value: unknown,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), updatedAt);
}

function historyType(kind: string, status: EquipmentWorkflowStatus): string {
  if (status === "verified") return "inspection";
  if (kind === "maintenance") return "maintenance";
  return status === "detected" ? "breakdown" : "repair";
}

function workflowLabel(status: EquipmentWorkflowStatus): string {
  return {
    detected: "Обнаружено",
    assigned: "Назначено",
    in_progress: "В работе",
    fixed: "Исправлено, ожидает проверки",
    verified: "Проверено",
  }[status];
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "equipment.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права управлять оборудованием" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 2_500_000) {
    return Response.json({ ok: false, error: "Запись или вложение слишком большое" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return Response.json({ ok: false, error: "Некорректная запись обслуживания" }, { status: 400 });
  }
  const requested = record(body.workOrder);
  if (!requested) {
    return Response.json({ ok: false, error: "Не передана запись обслуживания" }, { status: 400 });
  }

  const database = getD1();
  const rows = await database.prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?, ?)
  `).bind(
    account.id,
    EQUIPMENT_STORE_KEY,
    EQUIPMENT_HISTORY_STORE_KEY,
    EQUIPMENT_WORK_ORDER_STORE_KEY,
    EQUIPMENT_EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    EMPLOYEE_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map(rows.results.map((row) => [row.store_key, row.data_json]));
  const equipment = array(stores.get(EQUIPMENT_STORE_KEY));
  const history = array(stores.get(EQUIPMENT_HISTORY_STORE_KEY));
  const workOrders = array(stores.get(EQUIPMENT_WORK_ORDER_STORE_KEY));
  const expenses = array(stores.get(EQUIPMENT_EXPENSE_STORE_KEY));
  const employees = array(stores.get(EMPLOYEE_STORE_KEY));

  const equipmentId = text(requested.equipmentId, 100);
  const equipmentIndex = equipment.findIndex((item) => text(item.id, 100) === equipmentId);
  if (equipmentIndex < 0) {
    return Response.json({ ok: false, error: "Оборудование не найдено в текущем заведении" }, { status: 404 });
  }
  const equipmentItem = equipment[equipmentIndex];
  const id = text(requested.id, 100) || crypto.randomUUID();
  const existingIndex = workOrders.findIndex((item) => text(item.id, 100) === id);
  const existing = existingIndex >= 0 ? workOrders[existingIndex] : null;
  if (existing && text(existing.equipmentId, 100) !== equipmentId) {
    return Response.json({ ok: false, error: "Нельзя перенести запись к другому оборудованию" }, { status: 409 });
  }

  const kind = text(requested.kind, 30);
  const priority = text(requested.priority, 20) || "medium";
  const title = text(requested.title ?? requested.problem, 240);
  if (!KINDS.has(kind) || !PRIORITIES.has(priority) || !title) {
    return Response.json(
      { ok: false, error: "Укажите оборудование, тип, приоритет и суть работы" },
      { status: 422 },
    );
  }
  const requestedStatus = text(requested.status, 30) || "detected";
  if (!isEquipmentWorkflowStatus(requestedStatus)) {
    return Response.json({ ok: false, error: "Некорректный этап работы" }, { status: 422 });
  }
  const currentStatus = existing && isEquipmentWorkflowStatus(existing.status)
    ? existing.status
    : "detected";
  if (existing && !canAdvanceEquipmentWorkflow(currentStatus, requestedStatus)) {
    return Response.json(
      { ok: false, code: "INVALID_TRANSITION", error: "Этапы проходят последовательно: обнаружено → назначено → в работе → исправлено → проверено" },
      { status: 409 },
    );
  }
  if (!existing && requestedStatus !== "detected") {
    return Response.json({ ok: false, code: "INVALID_TRANSITION", error: "Новая проблема начинается с этапа «Обнаружено»" }, { status: 409 });
  }

  const requestedResponsibleId = text(requested.responsibleEmployeeId, 100);
  const requestedEmployee = requestedResponsibleId
    ? employees.find((employee) => text(employee.id, 100) === requestedResponsibleId)
    : null;
  if (requestedResponsibleId && !requestedEmployee) {
    return Response.json({ ok: false, error: "Ответственный не найден в текущем заведении" }, { status: 422 });
  }
  const responsibleEmployeeId = requestedResponsibleId || text(existing?.responsibleEmployeeId, 100);
  const responsibleName = text(requestedEmployee?.name, 180)
    || text(requested.responsibleName, 180)
    || text(existing?.responsibleName, 180);
  if (requestedStatus === "assigned" && !responsibleEmployeeId && !responsibleName) {
    return Response.json({ ok: false, error: "Выберите ответственного перед назначением" }, { status: 422 });
  }
  const result = text(requested.result, 2_000);
  const verificationNote = text(requested.verificationNote, 2_000);
  if (requestedStatus === "fixed" && !result) {
    return Response.json({ ok: false, error: "Опишите результат выполненной работы" }, { status: 422 });
  }
  if (requestedStatus === "verified" && !verificationNote) {
    return Response.json({ ok: false, error: "Подтвердите результат после проверки оборудования" }, { status: 422 });
  }
  const problemStatus = text(requested.equipmentStatus, 40);
  if (!existing && kind !== "maintenance" && !PROBLEM_STATUSES.has(problemStatus)) {
    return Response.json({ ok: false, error: "Укажите состояние: требует внимания или неисправно" }, { status: 422 });
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const cost = optionalNumber(requested.cost);
  const costDate = date(requested.costDate, text(existing?.costDate, 10) || today);
  const previousCost = optionalNumber(existing?.cost);
  const previousCostDate = text(existing?.costDate, 10);
  const costChanged = previousCost !== cost || (cost !== undefined && previousCostDate !== costDate);
  const closedMonths = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY)));
  if (costChanged && (previousCost !== undefined || cost !== undefined)) {
    const affectedCostMonths = new Set([
      previousCost !== undefined ? previousCostDate.slice(0, 7) : "",
      cost !== undefined ? costDate.slice(0, 7) : "",
    ].filter(Boolean));
    const lockedMonth = [...affectedCostMonths].find((month) => closedMonths.has(month));
    if (lockedMonth) {
      return Response.json({
        ok: false,
        code: "MONTH_LOCKED",
        monthKey: lockedMonth,
        error: `Месяц ${lockedMonth} закрыт. Стоимость работы нельзя изменить через Equipment.`,
      }, { status: 423 });
    }
  }
  const statusChanged = !existing || currentStatus !== requestedStatus;
  const timeline = Array.isArray(existing?.timeline) ? [...existing.timeline] : [];
  if (statusChanged && !timeline.some((entry) => text(record(entry)?.id) === `${id}:${requestedStatus}`)) {
    timeline.push({
      id: `${id}:${requestedStatus}`,
      status: requestedStatus,
      label: workflowLabel(requestedStatus),
      at: now,
      responsibleName: responsibleName || undefined,
      note: requestedStatus === "fixed" ? result : requestedStatus === "verified" ? verificationNote : undefined,
    });
  }

  const workOrder: JsonRecord = {
    ...(existing ?? {}),
    id,
    equipmentId,
    kind,
    title,
    problem: title,
    description: text(requested.description, 3_000) || undefined,
    impact: text(requested.impact, 2_000) || undefined,
    priority,
    status: requestedStatus,
    equipmentStatus: problemStatus || existing?.equipmentStatus,
    dueDate: date(requested.dueDate, text(existing?.dueDate, 10) || today),
    responsibleEmployeeId: responsibleEmployeeId || undefined,
    responsibleName: responsibleName || undefined,
    serviceCompany: text(requested.serviceCompany, 240) || undefined,
    performer: text(requested.performer, 240) || undefined,
    notes: text(requested.notes, 3_000) || undefined,
    attachments: Array.isArray(requested.attachments) ? requested.attachments.slice(0, 6) : [],
    cost,
    costType: kind === "maintenance" ? "maintenance" : "repair",
    costDate,
    result: result || undefined,
    verificationNote: verificationNote || undefined,
    nextMaintenanceDate: date(requested.nextMaintenanceDate, "") || undefined,
    timeline,
    createdAt: text(existing?.createdAt, 40) || now,
    updatedAt: now,
    ...(requestedStatus === "detected" ? { detectedAt: text(existing?.detectedAt, 40) || now } : {}),
    ...(requestedStatus === "assigned" ? { assignedAt: now } : {}),
    ...(requestedStatus === "in_progress" ? { startedAt: now } : {}),
    ...(requestedStatus === "fixed" ? { fixedAt: now } : {}),
    ...(requestedStatus === "verified" ? { verifiedAt: now } : {}),
  };

  let expenseChanged = false;
  let expenseAction: "create" | "update" = "create";
  let beforeExpense: JsonRecord | null = null;
  if (body.syncExpense === true) {
    if (!cost || cost <= 0) {
      return Response.json({ ok: false, error: "Для связи с Финансами укажите стоимость" }, { status: 422 });
    }
    const expenseId = equipmentExpenseId(id);
    const expenseIndex = expenses.findIndex((item) => text(item.id, 120) === expenseId);
    beforeExpense = expenseIndex >= 0 ? expenses[expenseIndex] : null;
    expenseAction = beforeExpense ? "update" : "create";
    const expense = {
      ...(beforeExpense ?? {}),
      id: expenseId,
      date: costDate,
      accountingMonth: costDate.slice(0, 7),
      category: "repairs",
      amount: cost,
      description: `${kind === "maintenance" ? "ТО" : "Ремонт"}: ${text(equipmentItem.name, 180) || "оборудование"} — ${title}`,
      equipmentId,
      equipmentWorkOrderId: id,
      equipmentCostType: kind === "maintenance" ? "maintenance" : "repair",
      contractor: text(requested.serviceCompany, 240) || undefined,
      source: "equipment_work_order",
      createdAt: text(beforeExpense?.createdAt, 40) || now,
      updatedAt: now,
    };
    const materiallyChanged = JSON.stringify({
      date: beforeExpense?.date,
      amount: beforeExpense?.amount,
      description: beforeExpense?.description,
      contractor: beforeExpense?.contractor,
    }) !== JSON.stringify({
      date: expense.date,
      amount: expense.amount,
      description: expense.description,
      contractor: expense.contractor,
    });
    if (!beforeExpense && !hasPermission(account, "expenses.create") && !hasPermission(account, "finance.manage")) {
      return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права создавать расход в Финансах" }, { status: 403 });
    }
    if (beforeExpense && materiallyChanged && !hasPermission(account, "finance.manage")) {
      return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Изменить связанный расход может пользователь с правом управления финансами" }, { status: 403 });
    }
    const affectedMonths = new Set([
      costDate.slice(0, 7),
      text(beforeExpense?.date, 10).slice(0, 7),
    ].filter(Boolean));
    const lockedMonth = [...affectedMonths].find((month) => closedMonths.has(month));
    if (lockedMonth) {
      return Response.json({
        ok: false,
        code: "MONTH_LOCKED",
        monthKey: lockedMonth,
        error: `Месяц ${lockedMonth} закрыт. Откройте его в мастере закрытия месяца перед изменением расхода.`,
      }, { status: 423 });
    }
    if (expenseIndex >= 0) expenses[expenseIndex] = expense;
    else expenses.unshift(expense);
    workOrder.financeExpenseId = expenseId;
    expenseChanged = !beforeExpense || materiallyChanged;
  }

  const nextEquipment = { ...equipmentItem, updatedAt: now };
  if (requestedStatus === "detected" && kind !== "maintenance") nextEquipment.status = problemStatus;
  if (requestedStatus === "in_progress") {
    nextEquipment.status = kind === "maintenance" ? "needs_maintenance" : "under_repair";
  }
  if (requestedStatus === "fixed") {
    nextEquipment.status = kind === "maintenance" ? "needs_maintenance" : "under_repair";
  }
  if (requestedStatus === "verified") {
    const otherActiveWork = workOrders.find((item) => (
      text(item.id, 100) !== id
      && text(item.equipmentId, 100) === equipmentId
      && text(item.status, 30) !== "verified"
    ));
    if (otherActiveWork) {
      const otherStatus = text(otherActiveWork.status, 30);
      const otherProblemStatus = text(otherActiveWork.equipmentStatus, 40);
      nextEquipment.status = ["in_progress", "fixed"].includes(otherStatus)
        ? "under_repair"
        : otherProblemStatus === "broken" ? "broken" : "needs_maintenance";
    } else {
      nextEquipment.status = "working";
    }
    if (kind === "maintenance") nextEquipment.lastMaintenance = today;
    const requestedNext = text(workOrder.nextMaintenanceDate, 10);
    const calculatedNext = requestedNext || nextMaintenanceFromPolicy(nextEquipment.maintenancePolicy, today);
    if (calculatedNext) {
      nextEquipment.nextMaintenance = calculatedNext;
      nextEquipment.maintenancePolicy = {
        ...(record(nextEquipment.maintenancePolicy) ?? {}),
        nextDate: calculatedNext,
      };
      workOrder.nextMaintenanceDate = calculatedNext;
    } else if (kind === "maintenance") {
      delete nextEquipment.nextMaintenance;
      const policy = record(nextEquipment.maintenancePolicy);
      if (policy?.mode === "date") delete nextEquipment.maintenancePolicy;
    }
  }
  equipment[equipmentIndex] = nextEquipment;
  if (existingIndex >= 0) workOrders[existingIndex] = workOrder;
  else workOrders.unshift(workOrder);

  if (statusChanged) {
    const historyId = `${id}:${requestedStatus}`;
    const event = {
      id: historyId,
      equipmentId,
      workOrderId: id,
      type: historyType(kind, requestedStatus),
      workflowStatus: requestedStatus,
      date: today,
      problem: title,
      description: requestedStatus === "fixed" ? result : requestedStatus === "verified" ? verificationNote : text(requested.description, 3_000) || undefined,
      cost: requestedStatus === "fixed" ? cost : undefined,
      performedBy: responsibleName || undefined,
      serviceCompany: text(requested.serviceCompany, 240) || undefined,
      notes: text(requested.notes, 3_000) || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const historyIndex = history.findIndex((item) => text(item.id, 140) === historyId);
    if (historyIndex >= 0) history[historyIndex] = event;
    else history.unshift(event);
  }

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
  const statements: D1PreparedStatement[] = [
    upsertStore(database, account.id, EQUIPMENT_WORK_ORDER_STORE_KEY, workOrders, now),
    upsertStore(database, account.id, EQUIPMENT_STORE_KEY, equipment, now),
    upsertStore(database, account.id, EQUIPMENT_HISTORY_STORE_KEY, history, now),
  ];
  if (body.syncExpense === true) {
    statements.push(upsertStore(database, account.id, EQUIPMENT_EXPENSE_STORE_KEY, expenses, now));
  }
  statements.push(database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    account.id,
    EQUIPMENT_WORK_ORDER_STORE_KEY,
    existing ? "update" : "create",
    id,
    `${text(equipmentItem.name, 180) || "Оборудование"}: ${title}`,
    costDate.slice(0, 7),
    existing ? JSON.stringify(existing) : null,
    JSON.stringify(workOrder),
    JSON.stringify(Object.keys(requested)),
    actorName,
    account.role,
    `Этап обслуживания: ${workflowLabel(requestedStatus)}`,
    now,
  ));
  if (expenseChanged) {
    const expense = expenses.find((item) => text(item.id, 120) === equipmentExpenseId(id));
    statements.push(database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      EQUIPMENT_EXPENSE_STORE_KEY,
      expenseAction,
      equipmentExpenseId(id),
      `Расход по оборудованию: ${text(equipmentItem.name, 180)}`,
      costDate.slice(0, 7),
      beforeExpense ? JSON.stringify(beforeExpense) : null,
      JSON.stringify(expense),
      JSON.stringify(["date", "amount", "equipmentId", "equipmentWorkOrderId"]),
      actorName,
      account.role,
      "Расход синхронизирован с записью Equipment по стабильному идентификатору",
      now,
    ));
  }

  await database.batch(statements);
  return Response.json({
    ok: true,
    workOrder,
    workOrders,
    equipment,
    history,
    expenses,
    financeExpenseId: workOrder.financeExpenseId ?? null,
    expenseCreated: expenseChanged && expenseAction === "create",
    expenseUpdated: expenseChanged && expenseAction === "update",
  }, { status: existing ? 200 : 201 });
}
