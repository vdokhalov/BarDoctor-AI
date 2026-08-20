import { getD1 } from "../../../../../db";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../../lib/bardoctor/data-trust";
import {
  EXPENSE_STORE_KEY,
  migratePurchaseLedger,
  PURCHASE_STORE_KEY,
  withPurchasePaymentSummary,
} from "../../../../../lib/bardoctor/purchases";

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

function json(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
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
  if (!hasPermission(account, "finance.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права отменять финансовые операции" },
      { status: 403 },
    );
  }

  let body: JsonRecord;
  try {
    body = record(JSON.parse(await request.text()) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }
  const paymentId = text(body.paymentId ?? body.id, "", 100);
  if (!paymentId) {
    return Response.json({ ok: false, error: "Не указан платёж" }, { status: 422 });
  }

  const now = new Date().toISOString();
  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?)
  `).bind(
    account.id,
    PURCHASE_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const ledger = migratePurchaseLedger({
    documents: array(stores.get(PURCHASE_STORE_KEY)),
    expenses: array(stores.get(EXPENSE_STORE_KEY)),
    venueId: account.venueId,
    now,
  });
  const documents = ledger.documents;
  const expenses = ledger.expenses;
  const paymentIndex = expenses.findIndex((value) => text(value.id, "", 100) === paymentId);
  const payment = paymentIndex >= 0 ? record(expenses[paymentIndex]) : null;
  if (!payment || Number(payment.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Платёж не найден" }, { status: 404 });
  }
  const purchaseId = text(payment.sourceDocumentId ?? payment.purchaseId, "", 100);
  const purchaseIndex = documents.findIndex((value) => text(value.id, "", 100) === purchaseId);
  const purchase = purchaseIndex >= 0 ? record(documents[purchaseIndex]) : null;
  if (!purchase || Number(purchase.venueId) !== account.venueId) {
    return Response.json(
      { ok: false, code: "PURCHASE_LINK_BROKEN", error: "Связанная закупочная накладная не найдена" },
      { status: 409 },
    );
  }
  if (payment.status === "voided" || payment.reversedAt) {
    return Response.json({
      ok: true,
      duplicate: true,
      payment,
      document: purchase,
      documents,
      expenses,
    });
  }
  if (payment.source !== "purchase_payment" && payment.paymentKind !== "supplier_payment") {
    return Response.json(
      { ok: false, code: "NOT_PURCHASE_PAYMENT", error: "Операция не является оплатой закупки" },
      { status: 409 },
    );
  }

  const monthKey = text(payment.date, "", 10).slice(0, 7);
  if (monthKey && closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY))).has(monthKey)) {
    return Response.json(
      {
        ok: false,
        code: "MONTH_LOCKED",
        monthKey,
        error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
      },
      { status: 423 },
    );
  }

  const reason = text(body.reason, "Платёж отменён пользователем", 500);
  const reversedPayment = {
    ...payment,
    status: "voided",
    reversedAt: now,
    reversedByAccountId: account.actorAccountId,
    reversalReason: reason,
    requiresReconciliation: false,
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
  };
  expenses[paymentIndex] = reversedPayment;
  const updatedPurchase = withPurchasePaymentSummary({
    ...purchase,
    linkedPaymentsRequireReconciliation: purchase.status === "cancelled"
      ? expenses.some((value) => {
        const item = record(value);
        return text(item.sourceDocumentId ?? item.purchaseId, "", 100) === purchaseId
          && item.status !== "voided"
          && !item.reversedAt;
      })
      : false,
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
  }, expenses);
  documents[purchaseIndex] = updatedPurchase;

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  await database.batch([
    upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: EXPENSE_STORE_KEY,
      entityId: paymentId,
      entityLabel: `Отмена оплаты: ${text(payment.supplierName, "Поставщик", 180)}`,
      monthKey: monthKey || null,
      before: payment,
      after: reversedPayment,
      actorName,
      actorRole: account.role,
      reason,
      createdAt: now,
    }),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      entityId: purchaseId,
      entityLabel: `Пересчёт оплаты: ${text(purchase.supplierName, "Поставщик", 180)}`,
      monthKey: text(purchase.date, "", 10).slice(0, 7) || null,
      before: purchase,
      after: updatedPurchase,
      actorName,
      actorRole: account.role,
      reason: "Статус оплаты пересчитан после сторно финансовой операции",
      createdAt: now,
    }),
  ]);

  return Response.json({
    ok: true,
    payment: reversedPayment,
    document: updatedPurchase,
    documents,
    expenses,
  });
}
