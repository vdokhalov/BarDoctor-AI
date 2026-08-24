import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { EXPENSE_STORE_KEY } from "../../../../lib/bardoctor/purchases";
import { closeShiftWithCanonicalWriteOffs } from "../../../../lib/bardoctor/shift-close-write-offs";
import { WRITE_OFF_STORE_KEY, writeOffDisplayNumber, type WriteOffDocument } from "../../../../lib/bardoctor/write-offs";

const REVENUE_STORE_KEY = "bd_finance_revenue";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
const MAX_BODY_BYTES = 750_000;

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}

function upsertStore(database: D1Database, accountId: number, key: string, value: unknown, now: string) {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), now);
}

function auditStatement(input: {
  database: D1Database;
  accountId: number;
  action: string;
  entityId: string;
  entityLabel: string;
  monthKey: string;
  after: unknown;
  actorName: string;
  actorRole: string;
  reason: string;
  now: string;
}) {
  return input.database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    input.action === "shift.closed" ? REVENUE_STORE_KEY : WRITE_OFF_STORE_KEY,
    input.action,
    input.entityId,
    input.entityLabel,
    input.monthKey,
    null,
    JSON.stringify(input.after),
    JSON.stringify(input.action === "shift.closed"
      ? ["closingStatus", "writeOffDocumentIds", "writeOffTotalCost"]
      : ["status", "shiftId", "items", "movementIds", "totalCost"]),
    input.actorName,
    input.actorRole,
    input.reason,
    input.now,
  );
}

async function readStores(database: D1Database, accountId: number) {
  const result = await database.prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?, ?)
  `).bind(
    accountId,
    REVENUE_STORE_KEY,
    WRITE_OFF_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    revenues: array(parse(stores.get(REVENUE_STORE_KEY), [])),
    writeOffs: array(parse(stores.get(WRITE_OFF_STORE_KEY), [])),
    assortment: record(parse(stores.get(ASSORTMENT_STORE_KEY), {})),
    stockMovements: array(parse(stores.get(STOCK_MOVEMENT_STORE_KEY), [])),
    expenses: array(parse(stores.get(EXPENSE_STORE_KEY), [])),
    closedMonths: closedMonthsFromStore(parse(stores.get(MONTH_CLOSING_STORE_KEY), null)),
  };
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "shifts.manage") || !hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Для закрытия смены со списаниями нужны права на смены и склад" }, { status: 403 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return Response.json({ ok: false, error: "В закрытии смены слишком много данных" }, { status: 413 });
  let body: JsonRecord;
  try { body = record(JSON.parse(raw) as unknown); } catch { return Response.json({ ok: false, error: "Некорректные данные закрытия смены" }, { status: 400 }); }
  if (body.venueId != null && number(body.venueId) !== account.venueId) {
    return Response.json({ ok: false, code: "SHIFT_VENUE_MISMATCH", error: "Смена относится к другому заведению" }, { status: 403 });
  }
  const database = getD1();
  const stores = await readStores(database, account.id);
  const date = text(record(body.revenueRecord).date, "", 10);
  if (date && stores.closedMonths.has(date.slice(0, 7))) {
    return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${date.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
  }
  const now = new Date().toISOString();
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
  const result = closeShiftWithCanonicalWriteOffs({
    current: stores,
    request: {
      shiftCloseId: body.shiftCloseId ?? request.headers.get("idempotency-key"),
      shiftId: body.shiftId,
      venueId: body.venueId,
      revenueRecord: body.revenueRecord,
      writeOffItems: body.writeOffItems,
    },
    venueId: account.venueId,
    actor: { accountId: account.actorAccountId, name: actorName, role: account.role },
    allowNegativeStock: true,
    now,
  });
  if (!result.ok) {
    const status = result.code === "SHIFT_VENUE_MISMATCH" ? 403
      : result.code === "WRITE_OFF_INSUFFICIENT_STOCK" ? 409
      : 422;
    return Response.json(result, { status });
  }
  if (result.idempotent) {
    return Response.json({
      ok: true,
      idempotent: true,
      shiftId: result.shiftId,
      revenueRecord: result.revenueRecord,
      writeOffDocuments: result.writeOffDocuments,
      writeOffs: result.writeOffs,
      assortment: result.assortment,
      stockMovements: result.stockMovements,
      expenses: result.expenses,
      stockChanged: false,
    });
  }
  const statements: D1PreparedStatement[] = [
    upsertStore(database, account.id, REVENUE_STORE_KEY, result.revenues, now),
    upsertStore(database, account.id, WRITE_OFF_STORE_KEY, result.writeOffs, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, result.stockMovements, now),
    upsertStore(database, account.id, EXPENSE_STORE_KEY, result.expenses, now),
    auditStatement({
      database,
      accountId: account.id,
      action: "shift.closed",
      entityId: result.shiftId,
      entityLabel: `Смена ${result.revenueRecord.date}`,
      monthKey: String(result.revenueRecord.date).slice(0, 7),
      after: result.revenueRecord,
      actorName,
      actorRole: account.role,
      reason: `Смена закрыта атомарно; canonical write-off документов: ${result.writeOffDocuments.length}`,
      now,
    }),
  ];
  for (const document of result.writeOffDocuments as WriteOffDocument[]) {
    statements.push(auditStatement({
      database,
      accountId: account.id,
      action: "write_off.posted_from_shift",
      entityId: document.id,
      entityLabel: `Списание ${writeOffDisplayNumber(document)}`,
      monthKey: document.date.slice(0, 7),
      after: document,
      actorName,
      actorRole: account.role,
      reason: `Проведено вместе со сменой ${result.shiftId}; движений: ${document.movementIds.length}`,
      now,
    }));
  }
  await database.batch(statements);
  return Response.json({
    ok: true,
    idempotent: false,
    shiftId: result.shiftId,
    revenueRecord: result.revenueRecord,
    writeOffDocuments: result.writeOffDocuments,
    writeOffs: result.writeOffs,
    assortment: result.assortment,
    stockMovements: result.stockMovements,
    expenses: result.expenses,
    warnings: result.warnings,
    stockChanged: result.writeOffDocuments.length > 0,
  }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
