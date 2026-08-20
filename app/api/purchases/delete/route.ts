import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import { STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import {
  EXPENSE_STORE_KEY,
  isPurchasePayment,
  migratePurchaseLedger,
  PURCHASE_STORE_KEY,
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

function json(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function text(value: unknown, fallback = "", max = 240): string {
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

function sourceFileIds(document: JsonRecord): string[] {
  const values = Array.isArray(document.sourceFileIds)
    ? document.sourceFileIds
    : document.sourceFileId
      ? [document.sourceFileId]
      : [];
  return [...new Set(values
    .map((value) => text(value, "", 80))
    .filter((value) => /^[a-zA-Z0-9-]{20,80}$/.test(value)))]
    .slice(0, 12);
}

function fileKey(accountId: number, id: string): string {
  return `purchases/${accountId}/${id}`;
}

export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права удалять закупочные документы" },
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
    return Response.json({ ok: false, error: "Не указан идентификатор накладной" }, { status: 422 });
  }

  const now = new Date().toISOString();
  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?)
  `).bind(
    account.id,
    PURCHASE_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
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
  const expenses = migrated.expenses;
  const index = documents.findIndex((document) => text(document.id, "", 100) === documentId);
  const document = index >= 0 ? record(documents[index]) : null;
  if (!document || Number(document.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Закупочный документ не найден" }, { status: 404 });
  }

  const isPriceList = document.documentType === "price_list";
  if (document.status === "confirmed" && !isPriceList) {
    return Response.json(
      {
        ok: false,
        code: "PURCHASE_MUST_BE_CANCELLED",
        error: "Проведённую накладную нельзя удалить. Сначала отмените проведение — склад и расчёты будут сторнированы с сохранением истории.",
      },
      { status: 409 },
    );
  }
  const linkedPayments = expenses.filter((expense) => isPurchasePayment(expense, documentId));
  if (linkedPayments.length) {
    return Response.json(
      {
        ok: false,
        code: "PURCHASE_HAS_PAYMENTS",
        linkedPaymentCount: linkedPayments.length,
        error: "Документ нельзя удалить: связанные платежи сохранены в финансах. Сначала выполните финансовую сверку.",
      },
      { status: 409 },
    );
  }
  const activeStockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY)).filter((movement) => {
    const value = record(movement);
    return value.sourceDocumentId === documentId
      && value.type === "receipt"
      && value.status !== "cancelled"
      && !value.reversedAt;
  });
  if (activeStockMovements.length) {
    return Response.json(
      {
        ok: false,
        code: "PURCHASE_HAS_STOCK_MOVEMENTS",
        error: "Документ ещё влияет на склад. Сначала корректно отмените проведение.",
      },
      { status: 409 },
    );
  }
  const monthKey = text(document.date, "", 10).slice(0, 7);
  const closed = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY)));
  if (!isPriceList && monthKey && closed.has(monthKey)) {
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

  documents.splice(index, 1);
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  const statements: D1PreparedStatement[] = [
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, 'delete', ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      PURCHASE_STORE_KEY,
      documentId,
      `${isPriceList ? "Прайс" : "Безопасное удаление"}: ${text(document.supplierName, "Поставщик", 180)}`,
      monthKey || null,
      JSON.stringify(document),
      JSON.stringify(Object.keys(document)),
      actorName,
      account.role,
      document.status === "draft"
        ? "Черновик удалён пользователем"
        : isPriceList
          ? "Прайс-лист удалён пользователем"
          : "Отменённый документ без зависимостей удалён пользователем",
      now,
    ),
  ];
  if (migrated.changed) {
    statements.push(upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now));
  }
  await database.batch(statements);

  const ids = sourceFileIds(document);
  let sourceFilesDeleted = true;
  try {
    const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
    if (bucket && ids.length) await bucket.delete(ids.map((id) => fileKey(account.id, id)));
  } catch {
    sourceFilesDeleted = false;
  }

  return Response.json({
    ok: true,
    documentId,
    documents,
    expenses,
    sourceFilesDeleted,
  });
}
