import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  applyPurchaseToInventory,
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";
import {
  EXPENSE_STORE_KEY,
  isPurchasePayment,
  migratePurchaseLedger,
  purchaseAffectsInventory,
  PURCHASE_STORE_KEY,
  withPurchasePaymentSummary,
} from "../../../../lib/bardoctor/purchases";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function json(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function text(value: unknown, fallback = "", max = 500): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
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

function auditUpdate(
  database: D1Database,
  input: {
    accountId: number;
    storeKey: string;
    entityId: string;
    entityLabel: string;
    monthKey: string | null;
    before: unknown;
    after: unknown;
    actorName: string;
    actorRole: string;
    reason: string;
    createdAt: string;
  },
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, 'update', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    input.storeKey,
    input.entityId,
    input.entityLabel,
    input.monthKey,
    JSON.stringify(input.before),
    JSON.stringify(input.after),
    JSON.stringify(Object.keys(record(input.after))),
    input.actorName,
    input.actorRole,
    input.reason,
    input.createdAt,
  );
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права повторно проводить закупки" },
      { status: 403 },
    );
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(await request.text()) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }
  const documentId = text(body.documentId ?? body.purchaseId, "", 100);
  if (!documentId) {
    return Response.json({ ok: false, error: "Не указана закупочная накладная" }, { status: 422 });
  }

  const now = new Date().toISOString();
  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?)
  `).bind(
    account.id,
    PURCHASE_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const migrated = migratePurchaseLedger({
    documents: array(stores.get(PURCHASE_STORE_KEY)),
    expenses: array(stores.get(EXPENSE_STORE_KEY)),
    venueId: account.venueId,
    now,
  });
  const documents = migrated.documents;
  let expenses = migrated.expenses;
  const index = documents.findIndex((document) => text(document.id, "", 100) === documentId);
  const previous = index >= 0 ? record(documents[index]) : null;
  if (!previous || Number(previous.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Закупочная накладная не найдена" }, { status: 404 });
  }
  if (previous.status === "confirmed") {
    return Response.json({ ok: true, duplicate: true, document: previous, documents, expenses });
  }
  if (previous.status !== "cancelled") {
    return Response.json(
      { ok: false, code: "PURCHASE_NOT_CANCELLED", error: "Повторное проведение доступно только для отменённого документа" },
      { status: 409 },
    );
  }

  const linkedPayments = expenses.filter((expense) => isPurchasePayment(expense, documentId));
  if (linkedPayments.length && !hasPermission(account, "finance.manage")) {
    return Response.json(
      {
        ok: false,
        code: "FINANCE_PERMISSION_REQUIRED",
        error: "У накладной есть оплаты. Для повторного проведения требуется право управления финансами.",
      },
      { status: 403 },
    );
  }
  const monthKey = text(previous.date, "", 10).slice(0, 7);
  const closed = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY), null));
  const lockedMonth = [
    monthKey,
    ...linkedPayments.map((payment) => text(payment.date, "", 10).slice(0, 7)),
  ].find((candidate) => candidate && closed.has(candidate));
  if (lockedMonth) {
    return Response.json(
      {
        ok: false,
        code: "MONTH_LOCKED",
        monthKey: lockedMonth,
        error: `Месяц ${lockedMonth} закрыт. Сначала откройте его в мастере закрытия месяца.`,
      },
      { status: 423 },
    );
  }

  const assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const inventory = purchaseAffectsInventory(previous)
    ? applyPurchaseToInventory({ assortment, document: previous, now })
    : null;
  if (inventory?.summary.unresolvedLines.length) {
    return Response.json(
      {
        ok: false,
        code: "INVENTORY_REVIEW_REQUIRED",
        error: "Исправьте количество или фасовку перед повторным проведением.",
        unresolvedLines: inventory.summary.unresolvedLines,
      },
      { status: 422 },
    );
  }
  const nextAssortment = inventory?.assortment ?? assortment;
  const nextMovements = inventory
    ? [...inventory.movements, ...stockMovements].slice(0, 20_000)
    : stockMovements;
  expenses = expenses.map((expense) => isPurchasePayment(expense, documentId)
    ? {
      ...expense,
      purchaseLinkStatus: "active",
      requiresReconciliation: false,
      updatedAt: now,
    }
    : expense);
  const reposted = withPurchasePaymentSummary({
    ...previous,
    status: "confirmed",
    cancelledAt: undefined,
    cancellationReason: undefined,
    cancelledByAccountId: undefined,
    inventoryReversedAt: undefined,
    linkedPaymentsRequireReconciliation: false,
    repostedAt: now,
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
  }, expenses);
  documents[index] = reposted;
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  await database.batch([
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, nextAssortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, nextMovements, now),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      entityId: documentId,
      entityLabel: `Повторное проведение: ${text(previous.supplierName, "Поставщик", 180)}`,
      monthKey: monthKey || null,
      before: previous,
      after: reposted,
      actorName,
      actorRole: account.role,
      reason: text(body.reason, "Закупочная накладная проведена повторно", 500),
      createdAt: now,
    }),
  ]);

  return Response.json({
    ok: true,
    document: reposted,
    documents,
    expenses,
    assortment: nextAssortment,
    stockMovements: nextMovements,
    inventorySummary: inventory?.summary ?? null,
  });
}
