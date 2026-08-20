import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  ASSORTMENT_STORE_KEY,
  removePurchaseFromInventory,
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
      { ok: false, code: "ACCESS_DENIED", error: "Нет права отменять проведение закупок" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 12_000) {
    return Response.json({ ok: false, error: "Слишком большой запрос" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }
  const documentId = text(body.documentId ?? body.purchaseId, "", 100);
  const reason = text(body.reason, "Проведение отменено пользователем", 500);
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
  const document = index >= 0 ? record(documents[index]) : null;
  if (!document || Number(document.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Закупочная накладная не найдена" }, { status: 404 });
  }
  if (document.status === "cancelled") {
    return Response.json({
      ok: true,
      duplicate: true,
      document,
      documents,
      expenses,
      assortment: json(stores.get(ASSORTMENT_STORE_KEY), {}),
      stockMovements: array(stores.get(STOCK_MOVEMENT_STORE_KEY)),
    });
  }
  if (document.status !== "confirmed") {
    return Response.json(
      { ok: false, code: "PURCHASE_NOT_POSTED", error: "Документ ещё не проведён" },
      { status: 409 },
    );
  }

  const linkedPayments = expenses.filter((expense) => isPurchasePayment(expense, documentId));
  if (linkedPayments.length && !hasPermission(account, "finance.manage")) {
    return Response.json(
      {
        ok: false,
        code: "FINANCE_PERMISSION_REQUIRED",
        error: "У накладной есть оплаты. Для отмены проведения требуется право управления финансами.",
      },
      { status: 403 },
    );
  }
  const monthKey = text(document.date, "", 10).slice(0, 7);
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
  const inventory = purchaseAffectsInventory(document)
    ? removePurchaseFromInventory({ assortment, document, stockMovements, now })
    : {
      ok: true as const,
      assortment,
      movements: stockMovements,
      summary: {
        postedLines: 0,
        movementCount: 0,
        linkedIngredients: 0,
        unresolvedLines: [],
        currencyConflicts: 0,
      },
    };
  if (!inventory.ok) {
    return Response.json(
      { ok: false, code: inventory.code, error: inventory.error },
      { status: 409 },
    );
  }

  if (linkedPayments.length) {
    expenses = expenses.map((expense) => isPurchasePayment(expense, documentId)
      ? {
        ...expense,
        purchaseLinkStatus: "cancelled_document",
        requiresReconciliation: true,
        updatedAt: now,
      }
      : expense);
  }
  const cancelledDocument = withPurchasePaymentSummary({
    ...document,
    status: "cancelled",
    cancelledAt: now,
    cancelledByAccountId: account.actorAccountId,
    cancellationReason: reason,
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
    inventoryReversedAt: now,
    linkedPaymentsRequireReconciliation: linkedPayments.length > 0,
  }, expenses);
  documents[index] = cancelledDocument;

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  const statements: D1PreparedStatement[] = [
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, inventory.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, inventory.movements, now),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      entityId: documentId,
      entityLabel: `Отмена: ${text(document.supplierName, "Поставщик", 180)}`,
      monthKey: monthKey || null,
      before: document,
      after: cancelledDocument,
      actorName,
      actorRole: account.role,
      reason,
      createdAt: now,
    }),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: STOCK_MOVEMENT_STORE_KEY,
      entityId: documentId,
      entityLabel: `Сторно прихода: ${text(document.supplierName, "Поставщик", 180)}`,
      monthKey: monthKey || null,
      before: { sourceDocumentId: documentId, movementCount: stockMovements.length },
      after: { sourceDocumentId: documentId, movementCount: inventory.movements.length },
      actorName,
      actorRole: account.role,
      reason: "Складское влияние закупки отменено",
      createdAt: now,
    }),
  ];
  if (linkedPayments.length || migrated.changed) {
    statements.push(upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now));
  }
  if (linkedPayments.length) {
    statements.push(auditUpdate(database, {
      accountId: account.id,
      storeKey: EXPENSE_STORE_KEY,
      entityId: documentId,
      entityLabel: `Оплаты сохранены: ${text(document.supplierName, "Поставщик", 180)}`,
      monthKey: null,
      before: linkedPayments,
      after: expenses.filter((expense) => isPurchasePayment(expense, documentId)),
      actorName,
      actorRole: account.role,
      reason: "Платежи не удалены; отмечены для финансовой сверки после отмены накладной",
      createdAt: now,
    }));
  }
  await database.batch(statements);

  return Response.json({
    ok: true,
    document: cancelledDocument,
    documents,
    expenses,
    assortment: inventory.assortment,
    stockMovements: inventory.movements,
    reversedStockLines: inventory.summary.postedLines,
    linkedPaymentCount: linkedPayments.length,
    paymentsPreserved: true,
  });
}
