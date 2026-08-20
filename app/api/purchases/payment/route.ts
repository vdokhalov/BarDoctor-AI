import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  EXPENSE_STORE_KEY,
  isPurchasePayment,
  migratePurchaseLedger,
  purchasePaymentSummary,
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

function number(value: unknown): number {
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

async function deterministicPaymentId(idempotencyKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(idempotencyKey),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `purchase-payment-${hex}`;
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

function audit(
  database: D1Database,
  input: {
    accountId: number;
    storeKey: string;
    action: "create" | "update";
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    input.storeKey,
    input.action,
    input.entityId,
    input.entityLabel,
    input.monthKey,
    input.before == null ? null : JSON.stringify(input.before),
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
  if (!hasPermission(account, "expenses.create") || !hasPermission(account, "inventory.view")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права проводить оплату поставщику" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 20_000) {
    return Response.json({ ok: false, error: "Слишком большой запрос" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const purchaseId = text(body.purchaseId ?? body.documentId, "", 100);
  const amount = Math.round(number(body.amount) * 100) / 100;
  const date = text(body.date, new Date().toISOString().slice(0, 10), 10);
  if (!purchaseId) {
    return Response.json({ ok: false, error: "Выберите закупочную накладную" }, { status: 422 });
  }
  if (amount <= 0) {
    return Response.json({ ok: false, error: "Укажите сумму оплаты больше нуля" }, { status: 422 });
  }
  if (!validDate(date)) {
    return Response.json({ ok: false, error: "Укажите корректную дату оплаты" }, { status: 422 });
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
  const migrated = migratePurchaseLedger({
    documents: array(stores.get(PURCHASE_STORE_KEY)),
    expenses: array(stores.get(EXPENSE_STORE_KEY)),
    venueId: account.venueId,
    now,
  });
  const documents = migrated.documents;
  const expenses = migrated.expenses;
  const purchaseIndex = documents.findIndex((value) => text(value.id, "", 100) === purchaseId);
  const purchase = purchaseIndex >= 0 ? record(documents[purchaseIndex]) : null;
  if (!purchase || Number(purchase.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Закупочная накладная не найдена" }, { status: 404 });
  }
  if (purchase.status !== "confirmed" || purchase.documentType === "price_list") {
    return Response.json(
      { ok: false, code: "PURCHASE_NOT_PAYABLE", error: "Оплату можно привязать только к проведённой закупке" },
      { status: 409 },
    );
  }

  const closed = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY)));
  const monthKey = date.slice(0, 7);
  if (closed.has(monthKey)) {
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

  const requestedId = text(body.paymentId ?? body.id, "", 100);
  const requestedIdempotencyKey = text(
    body.idempotencyKey ?? request.headers.get("idempotency-key"),
    "",
    240,
  );
  if (!requestedId && !requestedIdempotencyKey) {
    return Response.json(
      {
        ok: false,
        code: "IDEMPOTENCY_KEY_REQUIRED",
        error: "Передайте идентификатор операции или Idempotency-Key.",
      },
      { status: 422 },
    );
  }
  const idempotencyKey = requestedIdempotencyKey
    || `purchase-payment:${account.venueId}:${purchaseId}:${requestedId}`;
  const paymentId = requestedId || await deterministicPaymentId(idempotencyKey);
  const duplicate = expenses.find((value) =>
    text(value.idempotencyKey, "", 240) === idempotencyKey
    || text(value.id, "", 100) === paymentId
  );
  if (duplicate) {
    if (!isPurchasePayment(duplicate, purchaseId)) {
      return Response.json(
        {
          ok: false,
          code: "PAYMENT_ID_CONFLICT",
          error: "Идентификатор уже используется другой финансовой операцией.",
        },
        { status: 409 },
      );
    }
    return Response.json({
      ok: true,
      duplicate: true,
      payment: duplicate,
      document: purchase,
      documents,
      expenses,
    });
  }

  const beforeSummary = purchasePaymentSummary(purchase, expenses);
  if (amount > beforeSummary.balanceDue + 0.005) {
    return Response.json(
      {
        ok: false,
        code: "PAYMENT_EXCEEDS_BALANCE",
        balanceDue: beforeSummary.balanceDue,
        error: `Сумма оплаты больше остатка ${beforeSummary.balanceDue.toFixed(2)}.`,
      },
      { status: 409 },
    );
  }

  const method = text(body.paymentMethod, "unknown", 24);
  const normalizedMethod = ["cash", "card", "transfer"].includes(method) ? method : "unknown";
  const defaultMoneySource = {
    cash: "Наличные · касса",
    card: "Корпоративная карта",
    transfer: "Банковский счёт · перевод",
    unknown: "Источник не указан",
  }[normalizedMethod] ?? "Источник не указан";
  const moneySourceName = text(
    body.moneySourceName ?? body.cashboxName,
    defaultMoneySource,
    120,
  );
  const payment: JsonRecord = {
    id: paymentId,
    venueId: account.venueId,
    date,
    accountingMonth: monthKey,
    category: text(purchase.expenseCategory, "products", 32),
    amount,
    currency: text(purchase.currency, "RUB", 12),
    description: `Оплата поставщику · ${text(purchase.supplierName, "Поставщик", 180)}${purchase.documentNumber ? ` · №${text(purchase.documentNumber, "", 100)}` : ""}`,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    purchaseId,
    sourceDocumentId: purchaseId,
    source: "purchase_payment",
    paymentKind: "supplier_payment",
    paymentMethod: normalizedMethod,
    cashboxId: text(body.cashboxId, "", 100) || undefined,
    moneySourceName,
    note: text(body.note, "", 500) || undefined,
    status: "posted",
    idempotencyKey,
    ledgerVersion: 2,
    createdAt: now,
    updatedAt: now,
    createdByAccountId: account.actorAccountId,
    updatedByAccountId: account.actorAccountId,
  };
  expenses.unshift(payment);
  const updatedPurchase = withPurchasePaymentSummary({
    ...purchase,
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
  }, expenses);
  documents[purchaseIndex] = updatedPurchase;

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  await database.batch([
    upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    audit(database, {
      accountId: account.id,
      storeKey: EXPENSE_STORE_KEY,
      action: "create",
      entityId: String(payment.id),
      entityLabel: String(payment.description),
      monthKey,
      before: null,
      after: payment,
      actorName,
      actorRole: account.role,
      reason: "Платёж привязан к существующей закупочной накладной",
      createdAt: now,
    }),
    audit(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      action: "update",
      entityId: purchaseId,
      entityLabel: `Оплата: ${text(purchase.supplierName, "Поставщик", 180)}`,
      monthKey: text(purchase.date, date, 10).slice(0, 7),
      before: purchase,
      after: updatedPurchase,
      actorName,
      actorRole: account.role,
      reason: "Пересчитан статус оплаты закупки",
      createdAt: now,
    }),
  ]);

  return Response.json({
    ok: true,
    payment,
    document: updatedPurchase,
    documents,
    expenses,
  }, { status: 201 });
}
