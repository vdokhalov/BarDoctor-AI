import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { PURCHASE_STOCK_CATEGORIES } from "../../../lib/bardoctor/purchases";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";

const STORE_KEY = "bd_finance_expenses";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

async function postOnce(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "expenses.create")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Добавлять расходы вам не разрешено" },
      { status: 403 },
    );
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 20_000) {
    return Response.json({ ok: false, error: "Слишком большой запрос" }, { status: 413 });
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }
  const entry = record(body?.entry);
  const amount = Number(entry?.amount);
  if (!entry || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ ok: false, error: "Укажите корректную сумму расхода" }, { status: 400 });
  }
  if (!validIsoDate(entry.date)) {
    return Response.json({ ok: false, error: "Укажите корректную дату расхода" }, { status: 400 });
  }
  const category = typeof entry.category === "string" ? entry.category.trim() : "other";
  if (PURCHASE_STOCK_CATEGORIES.has(category)) {
    return Response.json(
      {
        ok: false,
        code: "PURCHASE_DOCUMENT_REQUIRED",
        action: "/suppliers?tab=purchases&returnTo=finance",
        error: "Закупка товаров создаётся только как накладная с позициями. В финансах затем привяжите к ней оплату.",
      },
      { status: 422 },
    );
  }
  if (entry.equipmentWorkOrderId || entry.source === "equipment_work_order") {
    return Response.json({ ok: false, code: "USE_EQUIPMENT_WORK_ORDER_API", error: "Связанный расход изменяется через обслуживание оборудования." }, { status: 409 });
  }
  if (entry.sourceDocumentId || entry.purchaseId || entry.source === "purchase_payment") {
    return Response.json(
      {
        ok: false,
        code: "USE_PURCHASE_PAYMENT_ENDPOINT",
        error: "Оплата закупки создаётся через выбор существующей накладной.",
      },
      { status: 422 },
    );
  }
  const now = new Date().toISOString();
  const accountingCurrency = accountingCurrencyFromRestaurantJson(account.restaurantJson);
  if (!accountingCurrency) {
    return Response.json(
      {
        ok: false,
        code: "ACCOUNTING_CURRENCY_REQUIRED",
        error: "Сначала выберите валюту учёта в профиле заведения.",
      },
      { status: 422 },
    );
  }
  const idempotencyKey = typeof entry.idempotencyKey === "string" && entry.idempotencyKey.trim()
    ? entry.idempotencyKey.trim().slice(0, 240)
    : request.headers.get("idempotency-key")?.trim().slice(0, 240) || null;
  const nextEntry: Record<string, unknown> & { date: string; category: string; id: string } = {
    ...entry,
    venueId: account.venueId,
    date: entry.date,
    category,
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : crypto.randomUUID(),
    amount,
    currency: accountingCurrency,
    source: typeof entry.source === "string" && entry.source.trim() ? entry.source : "manual_expense",
    idempotencyKey: idempotencyKey ?? undefined,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
    updatedAt: now,
    createdByAccountId: account.actorAccountId,
  };
  const database = getD1();
  const snapshots = await readStoreSnapshots(database, account.id, [STORE_KEY, MONTH_CLOSING_STORE_KEY]);
  const stored = snapshots.find(row => row.key === STORE_KEY);
  const closingStore = snapshots.find(row => row.key === MONTH_CLOSING_STORE_KEY);
  let expenses: unknown[] = [];
  try {
    const parsed = stored?.dataJson ? JSON.parse(stored.dataJson) as unknown : [];
    if (!Array.isArray(parsed)) throw new Error("Invalid expense store");
    expenses = parsed;
  } catch {
    return Response.json({ ok: false, code: "EXPENSE_STORE_NEEDS_REVIEW", error: "Существующие расходы требуют проверки; данные не изменены." }, { status: 409 });
  }
  let closingData: unknown = null;
  try {
    closingData = closingStore?.dataJson ? JSON.parse(closingStore.dataJson) as unknown : null;
  } catch {
    closingData = null;
  }
  const closedMonths = closedMonthsFromStore(closingData);
  const monthKey = nextEntry.date.slice(0, 7);
  if (closedMonths.has(monthKey)) {
    return Response.json({
      ok: false,
      code: "MONTH_LOCKED",
      monthKey,
      error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
    }, { status: 423 });
  }
  const duplicate = expenses.find((item) => {
    const value = record(item);
    return value?.id === nextEntry.id
      || Boolean(idempotencyKey && value?.idempotencyKey === idempotencyKey);
  });
  if (record(duplicate)?.equipmentWorkOrderId || record(duplicate)?.source === "equipment_work_order") {
    return Response.json({ ok: false, code: "USE_EQUIPMENT_WORK_ORDER_API", error: "Связанный расход изменяется через обслуживание оборудования." }, { status: 409 });
  }
  if (duplicate) {
    return Response.json({ ok: true, duplicate: true, data: duplicate, updatedAt: stored?.updatedAt ?? now });
  }
  await runStoreCasBatch(database, account.id, snapshots, [
    database.prepare(`INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(account_id, store_key)
      DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
      .bind(account.id, STORE_KEY, JSON.stringify([nextEntry, ...expenses]), now),
    database.prepare(`INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, 'create', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`)
      .bind(account.id, STORE_KEY, String(nextEntry.id),
        typeof nextEntry.description === "string" ? nextEntry.description.slice(0, 180) : category,
        monthKey, JSON.stringify(nextEntry), JSON.stringify(Object.keys(nextEntry)),
        [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
        account.role, "Расход добавлен пользователем с ограниченным финансовым доступом", now),
  ], now);
  return Response.json({ ok: true, data: nextEntry, updatedAt: now }, { status: 201 });
}

export async function POST(request: Request): Promise<Response> {
  return withStoreCasRetries(request, postOnce);
}
