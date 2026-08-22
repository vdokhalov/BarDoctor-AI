import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLog, domainData } from "../../../db/schema";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { PURCHASE_STOCK_CATEGORIES } from "../../../lib/bardoctor/purchases";

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

export async function POST(request: Request): Promise<Response> {
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
    source: typeof entry.source === "string" && entry.source.trim() ? entry.source : "manual_expense",
    idempotencyKey: idempotencyKey ?? undefined,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
    updatedAt: now,
    createdByAccountId: account.actorAccountId,
  };
  const db = getDb();
  const storedRows = await db
    .select()
    .from(domainData)
    .where(
      and(
        eq(domainData.accountId, account.id),
        inArray(domainData.storeKey, [STORE_KEY, MONTH_CLOSING_STORE_KEY]),
      ),
    );
  const stored = storedRows.find((row) => row.storeKey === STORE_KEY);
  const closingStore = storedRows.find((row) => row.storeKey === MONTH_CLOSING_STORE_KEY);
  let expenses: unknown[] = [];
  try {
    const parsed = stored ? JSON.parse(stored.dataJson) as unknown : [];
    expenses = Array.isArray(parsed) ? parsed : [];
  } catch {
    expenses = [];
  }
  let closingData: unknown = null;
  try {
    closingData = closingStore ? JSON.parse(closingStore.dataJson) as unknown : null;
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
  if (duplicate) {
    return Response.json({ ok: true, duplicate: true, data: duplicate, updatedAt: stored?.updatedAt ?? now });
  }
  await db
    .insert(domainData)
    .values({
      accountId: account.id,
      storeKey: STORE_KEY,
      dataJson: JSON.stringify([nextEntry, ...expenses]),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [domainData.accountId, domainData.storeKey],
      set: { dataJson: JSON.stringify([nextEntry, ...expenses]), updatedAt: now },
    });
  await db.insert(auditLog).values({
    accountId: account.id,
    storeKey: STORE_KEY,
    action: "create",
    entityId: String(nextEntry.id),
    entityLabel: typeof nextEntry.description === "string"
      ? nextEntry.description.slice(0, 180)
      : typeof nextEntry.category === "string"
        ? nextEntry.category.slice(0, 180)
        : "Расход",
    monthKey,
    beforeJson: null,
    afterJson: JSON.stringify(nextEntry),
    changedFieldsJson: JSON.stringify(Object.keys(nextEntry)),
    actorName: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    actorRole: account.role,
    reason: "Расход добавлен пользователем с ограниченным финансовым доступом",
    createdAt: now,
  });
  return Response.json({ ok: true, data: nextEntry, updatedAt: now }, { status: 201 });
}
