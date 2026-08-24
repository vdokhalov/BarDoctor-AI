import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import {
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../lib/bardoctor/inventory";
import { EXPENSE_STORE_KEY } from "../../../lib/bardoctor/purchases";
import {
  cancelPostedWriteOff,
  deleteWriteOffDraft,
  postWriteOffDocument,
  saveWriteOffDraft,
  WRITE_OFF_REASONS,
  WRITE_OFF_STORE_KEY,
  writeOffDisplayNumber,
  writeOffDocuments,
  type WriteOffDocument,
} from "../../../lib/bardoctor/write-offs";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
const MAX_BODY_BYTES = 500_000;

type StoreRow = { store_key: string; data_json: string };
type JsonRecord = Record<string, unknown>;

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

async function readStores(database: D1Database, accountId: number) {
  const result = await database.prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?)
  `).bind(
    accountId,
    WRITE_OFF_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    documents: array(parse(stores.get(WRITE_OFF_STORE_KEY), [])),
    assortment: record(parse(stores.get(ASSORTMENT_STORE_KEY), {})),
    movements: array(parse(stores.get(STOCK_MOVEMENT_STORE_KEY), [])),
    expenses: array(parse(stores.get(EXPENSE_STORE_KEY), [])),
    closedMonths: closedMonthsFromStore(parse(stores.get(MONTH_CLOSING_STORE_KEY), null)),
  };
}

function actor(account: { actorAccountId: number; firstName: string; lastName: string | null; appEmail: string; role: string }) {
  return {
    accountId: account.actorAccountId,
    name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    role: account.role,
  };
}

function auditStatement(input: {
  database: D1Database;
  accountId: number;
  action: string;
  document: WriteOffDocument;
  before?: unknown;
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
    WRITE_OFF_STORE_KEY,
    input.action,
    input.document.id,
    `Списание ${writeOffDisplayNumber(input.document)}`,
    input.document.date.slice(0, 7),
    input.before == null ? null : JSON.stringify(input.before),
    JSON.stringify(input.document),
    JSON.stringify(["status", "reasonCode", "location", "items", "totalCost", "movementIds"]),
    input.actorName,
    input.actorRole,
    input.reason,
    input.now,
  );
}

function catalog(assortment: JsonRecord, venueId: number) {
  const nomenclature = array(assortment.nomenclature).map(record);
  const canonicalByKey = new Map(nomenclature.map((item) => [text(item.productKey ?? item.key ?? item.id, "", 300), item]));
  return array(assortment.stockBalances).map(record).filter((balance) => {
    const rowVenueId = number(balance.venueId);
    return balance.archived !== true && balance.active !== false && (!rowVenueId || rowVenueId === venueId);
  }).map((balance) => {
    const key = text(balance.productKey ?? balance.key, "", 300);
    const canonical = canonicalByKey.get(key) ?? {};
    return {
      nomenclatureItemId: key,
      productKey: key,
      name: text(canonical.name ?? balance.name, "Товар"),
      aliases: [...new Set([
        ...array(canonical.aliases).map((value) => text(value, "", 120)),
        ...array(balance.aliases).map((value) => text(value, "", 120)),
      ].filter(Boolean))],
      category: text(canonical.categoryName ?? canonical.category ?? balance.category, "", 100),
      section: text(canonical.sectionName ?? balance.sectionName ?? balance.section, "", 100),
      current: number(balance.current),
      unit: text(balance.unit, "unknown", 20),
      displayUnit: text(balance.displayUnit, "auto", 20),
      packageOptions: [...new Set([
        ...array(balance.packageOptions).map((value) => text(record(value).label ?? value, "", 120)),
        text(balance.displayPackageSize, "", 120),
        text(balance.purchasePackageSize, "", 120),
        balance.multiplePackageSizes === true ? "" : text(balance.packageSize, "", 120),
      ].filter(Boolean))],
      averageUnitCost: balance.costNeedsReview === true ? null : number(balance.averageUnitCost) || null,
      costStatus: balance.costNeedsReview === true || !(number(balance.averageUnitCost) > 0) ? "unvalued" : "valued",
      currency: text(balance.currency, "", 12).toUpperCase() || null,
    };
  }).filter((item) => item.productKey);
}

function expenseFor(document: WriteOffDocument, previous?: JsonRecord): JsonRecord | null {
  if (document.totalCost === null || document.totalCost <= 0) return null;
  return {
    ...previous,
    id: `writeoff:${document.id}`,
    venueId: document.venueId,
    date: document.date,
    accountingMonth: document.date.slice(0, 7),
    category: "writeoff",
    amount: document.totalCost,
    area: document.location,
    description: `${document.reasonLabel} · ${document.itemCount} поз.`,
    source: "write_off_document",
    sourceDocumentId: document.id,
    currency: document.currency,
    status: document.status === "cancelled" ? "voided" : "posted",
    reversedAt: document.status === "cancelled" ? document.cancelledAt : undefined,
    unvaluedItemCount: document.unvaluedItemCount,
    createdAt: text(previous?.createdAt, document.createdAt, 40),
    updatedAt: document.updatedAt,
    createdByAccountId: document.createdBy.accountId,
  };
}

function withExpense(expenses: unknown[], document: WriteOffDocument): unknown[] {
  const values = expenses.map(record);
  const id = `writeoff:${document.id}`;
  const index = values.findIndex((item) => text(item.id, "", 140) === id || text(item.sourceDocumentId, "", 100) === document.id && item.source === "write_off_document");
  const next = expenseFor(document, index >= 0 ? values[index] : undefined);
  if (!next) return values;
  if (index >= 0) values[index] = next;
  else values.unshift(next);
  return values;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права просматривать списания" }, { status: 403 });
  const stores = await readStores(getD1(), account.id);
  const documents = writeOffDocuments(stores.documents, account.venueId).sort((left, right) => right.date.localeCompare(left.date) || right.number - left.number);
  const id = text(new URL(request.url).searchParams.get("id"), "", 100);
  if (id) {
    const found = documents.find((item) => item.id === id);
    if (!found) return Response.json({ ok: false, code: "WRITE_OFF_NOT_FOUND", error: "Списание не найдено или относится к другому заведению" }, { status: 404 });
    return Response.json({ ok: true, venueId: account.venueId, writeOff: found }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return Response.json({ ok: true, venueId: account.venueId, reasons: WRITE_OFF_REASONS, writeOffs: documents, catalog: catalog(stores.assortment, account.venueId) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права создавать и проводить списания" }, { status: 403 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return Response.json({ ok: false, error: "В списании слишком много данных" }, { status: 413 });
  let body: JsonRecord;
  try { body = record(JSON.parse(raw) as unknown); } catch { return Response.json({ ok: false, error: "Некорректное списание" }, { status: 400 }); }
  if (body.venueId != null && number(body.venueId) !== account.venueId) return Response.json({ ok: false, code: "WRITE_OFF_VENUE_MISMATCH", error: "Заведение в запросе не совпадает с авторизованным контекстом" }, { status: 403 });
  const action = text(body.action, "post", 30);
  const database = getD1();
  const stores = await readStores(database, account.id);
  const current = writeOffDocuments(stores.documents, account.venueId);
  const now = new Date().toISOString();
  const currentActor = actor(account);
  const draft: JsonRecord = { ...record(body.document ?? body.draft), idempotencyKey: text(body.idempotencyKey ?? request.headers.get("idempotency-key") ?? record(body.document).idempotencyKey, "", 240) || undefined };
  const before = current.find((item) => item.id === text(draft.id, "", 100));

  if (action === "delete_draft") {
    const result = deleteWriteOffDraft({ documents: current, venueId: account.venueId, id: text(body.id ?? draft.id, "", 100) });
    if (!result.ok) return Response.json(result, { status: 409 });
    if (!result.deleted || !result.document) return Response.json({ ok: true, idempotent: true, deleted: false, writeOffs: result.documents });
    await database.batch([
      upsertStore(database, account.id, WRITE_OFF_STORE_KEY, result.documents, now),
      auditStatement({ database, accountId: account.id, action: "write_off.deleted", document: result.document, before: result.document, actorName: currentActor.name, actorRole: currentActor.role, reason: "Удалён черновик списания; склад не изменён", now }),
    ]);
    return Response.json({ ok: true, deleted: true, writeOffs: result.documents, stockChanged: false });
  }

  if (action === "cancel") {
    const id = text(body.id ?? draft.id, "", 100);
    const existing = current.find((item) => item.id === id);
    if (existing && stores.closedMonths.has(existing.date.slice(0, 7))) return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${existing.date.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
    const result = cancelPostedWriteOff({ documents: current, assortment: stores.assortment, stockMovements: stores.movements, venueId: account.venueId, id, actor: currentActor, now });
    if (!result.ok) return Response.json(result, { status: result.code === "WRITE_OFF_NOT_FOUND" ? 404 : 409 });
    if (result.idempotent) return Response.json({ ok: true, idempotent: true, writeOff: result.document, writeOffs: result.documents, stockChanged: false });
    const expenses = withExpense(stores.expenses, result.document);
    await database.batch([
      upsertStore(database, account.id, WRITE_OFF_STORE_KEY, result.documents, now),
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
      upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, result.stockMovements, now),
      upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
      auditStatement({ database, accountId: account.id, action: "write_off.cancelled", document: result.document, before: existing, actorName: currentActor.name, actorRole: currentActor.role, reason: `Проведение отменено; создано обратных движений: ${result.document.reversalMovementIds?.length ?? 0}`, now }),
    ]);
    return Response.json({ ok: true, writeOff: result.document, writeOffs: result.documents, assortment: result.assortment, stockMovements: result.stockMovements, stockChanged: true });
  }

  if (!Array.isArray(draft.items) && action !== "save_draft") return Response.json({ ok: false, code: "WRITE_OFF_ITEMS_REQUIRED", error: "Добавьте хотя бы одну позицию" }, { status: 422 });
  if (action === "save_draft") {
    const result = saveWriteOffDraft({ documents: current, assortment: stores.assortment, venueId: account.venueId, draft, actor: currentActor, now });
    if (!result.ok) return Response.json(result, { status: 422 });
    await database.batch([
      upsertStore(database, account.id, WRITE_OFF_STORE_KEY, result.documents, now),
      auditStatement({ database, accountId: account.id, action: before ? "write_off.draft_updated" : "write_off.draft_created", document: result.document, before, actorName: currentActor.name, actorRole: currentActor.role, reason: "Черновик списания сохранён; склад не изменён", now }),
    ]);
    return Response.json({ ok: true, writeOff: result.document, writeOffs: result.documents, stockChanged: false }, { status: before ? 200 : 201 });
  }
  if (action !== "post") return Response.json({ ok: false, error: "Неизвестное действие списания" }, { status: 400 });
  const date = text(draft.date, now.slice(0, 10), 10);
  if (stores.closedMonths.has(date.slice(0, 7))) return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${date.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
  const result = postWriteOffDocument({ documents: current, assortment: stores.assortment, stockMovements: stores.movements, venueId: account.venueId, draft, actor: currentActor, allowNegativeStock: true, now });
  if (!result.ok) return Response.json(result, { status: result.code === "WRITE_OFF_INSUFFICIENT_STOCK" ? 409 : 422 });
  if (result.idempotent) return Response.json({ ok: true, idempotent: true, writeOff: result.document, writeOffs: result.documents, assortment: result.assortment, stockMovements: result.stockMovements, stockChanged: false });
  const expenses = withExpense(stores.expenses, result.document);
  await database.batch([
    upsertStore(database, account.id, WRITE_OFF_STORE_KEY, result.documents, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, result.stockMovements, now),
    upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
    auditStatement({ database, accountId: account.id, action: "write_off.posted", document: result.document, before, actorName: currentActor.name, actorRole: currentActor.role, reason: `Списание проведено атомарно; движений: ${result.document.movementIds.length}; причина: ${result.document.reasonCode}`, now }),
  ]);
  return Response.json({ ok: true, writeOff: result.document, writeOffs: result.documents, assortment: result.assortment, stockMovements: result.stockMovements, warnings: result.warnings, stockChanged: true }, { status: 201 });
}
