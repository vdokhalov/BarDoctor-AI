import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import { ASSORTMENT_STORE_KEY, SALES_DOCUMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import {
  createOrUpdateSalesBatch,
  postSalesBatch,
  SALES_BATCH_STORE_KEY,
  SALES_MAPPING_STORE_KEY,
  SALES_WAREHOUSE_ROUTE_STORE_KEY,
  type SalesSource,
} from "../../../../lib/bardoctor/sales-consumption";
import { normalizeSalesDocument } from "../../../../lib/bardoctor/sales";
import { reconcileSalesRevenue, REVENUE_STORE_KEY } from "../../../../lib/bardoctor/sales-revenue";

const WAREHOUSE_STORE_KEY = "bd_warehouses";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
type StoreRow = { store_key: string; data_json: string };
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}
function array(value: string | undefined): unknown[] {
  const parsed = parse(value, []);
  return Array.isArray(parsed) ? parsed : [];
}
function upsertStore(database: D1Database, accountId: number, key: string, value: unknown, now: string) {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), now);
}
function batchSource(value: unknown): SalesSource {
  const type = String(value ?? "").toLowerCase();
  if (type === "manual") return "MANUAL_GRID";
  if (type === "scan") return "IMAGE_IMPORT";
  if (type === "file_import") return "FILE_IMPORT";
  if (type === "1c") return "ONE_C";
  if (type === "local_connector") return "LOCAL_CONNECTOR";
  if (["iiko", "poster", "rkeeper"].includes(type)) return "POS_API";
  return "OTHER_API";
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "sales.post")) return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права проводить продажи по складу" }, { status: 403 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 700_000) return Response.json({ ok: false, error: "В отчёте слишком много данных" }, { status: 413 });
  let body: JsonRecord;
  try { body = record(JSON.parse(raw) as unknown); } catch { return Response.json({ ok: false, error: "Некорректный отчёт" }, { status: 400 }); }
  const now = new Date().toISOString();
  const document = normalizeSalesDocument(body.document, crypto.randomUUID());
  if (!document.items.length) return Response.json({ ok: false, error: "В отчёте нет проданных позиций" }, { status: 422 });
  if (document.venueId && document.venueId !== account.venueId) return Response.json({ ok: false, code: "SALES_VENUE_MISMATCH", error: "Отчёт относится к другому заведению" }, { status: 403 });

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    account.id,
    SALES_DOCUMENT_STORE_KEY,
    SALES_BATCH_STORE_KEY,
    SALES_MAPPING_STORE_KEY,
    SALES_WAREHOUSE_ROUTE_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    WAREHOUSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    REVENUE_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const documents = array(stores.get(SALES_DOCUMENT_STORE_KEY));
  const batches = array(stores.get(SALES_BATCH_STORE_KEY));
  const mappings = array(stores.get(SALES_MAPPING_STORE_KEY));
  const routes = array(stores.get(SALES_WAREHOUSE_ROUTE_STORE_KEY));
  const assortment = parse(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const warehouses = array(stores.get(WAREHOUSE_STORE_KEY));
  const revenues = array(stores.get(REVENUE_STORE_KEY));
  const closed = closedMonthsFromStore(parse(stores.get(MONTH_CLOSING_STORE_KEY), null));
  if (closed.has(document.date.slice(0, 7))) return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${document.date.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
  const duplicateDocument = documents.find((value) => record(value).id === document.id);
  if (duplicateDocument) return Response.json({ ok: true, duplicate: true, document: duplicateDocument, documents, assortment, stockMovements });

  const actor = {
    accountId: account.actorAccountId,
    name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    role: account.role,
  };
  const saved = createOrUpdateSalesBatch({
    batches,
    draft: {
      source: batchSource(document.sourceType),
      sourceReference: document.sourceFileName ?? document.sourceLabel ?? document.sourceSystem,
      externalBatchId: document.externalId ?? document.reportNumber ?? document.id,
      businessDate: document.date,
      lines: document.items.map((item) => ({ id: item.id, externalLineId: item.id, rawName: item.name, menuItemId: item.menuItemId, quantity: item.quantity })),
      warnings: document.warnings,
    },
    assortment,
    mappings,
    warehouseRoutes: routes,
    warehouses,
    venueId: account.venueId,
    actor,
    now,
  });
  if (!saved.ok) return Response.json(saved, { status: 422 });
  if (saved.batch.blockedLineCount) return Response.json({
    ok: false,
    code: "SALES_REVIEW_REQUIRED",
    error: "Проверьте сопоставления, техкарты, единицы и склад до проведения.",
    salesBatch: saved.batch,
    unresolvedLines: saved.batch.lines.filter((line) => line.processingStatus === "BLOCKED").map((line) => ({ id: line.id, name: line.rawName, reason: line.errorMessage, code: line.errorCode })),
  }, { status: 422 });
  const posted = postSalesBatch({
    batches: saved.batches,
    batchId: saved.batch.id,
    assortment,
    mappings,
    warehouseRoutes: routes,
    warehouses,
    stockMovements,
    venueId: account.venueId,
    actor,
    now,
  });
  if (!posted.ok) return Response.json(posted, { status: 422 });
  const confirmedDocument = { ...document, internalId: document.id, status: "confirmed" as const, confirmedAt: now, createdAt: document.createdAt ?? now, updatedAt: now, salesBatchId: posted.batch.id };
  const revenue = reconcileSalesRevenue({ revenues, salesDocuments: documents, document: confirmedDocument, now });
  if (!revenue.ok) return Response.json({ ok: false, code: revenue.code, error: revenue.error }, { status: 409 });
  const nextDocuments = [confirmedDocument, ...documents];
  await database.batch([
    upsertStore(database, account.id, SALES_DOCUMENT_STORE_KEY, nextDocuments, now),
    upsertStore(database, account.id, SALES_BATCH_STORE_KEY, posted.batches, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, posted.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, posted.stockMovements, now),
    upsertStore(database, account.id, REVENUE_STORE_KEY, revenue.revenues, now),
    database.prepare(`
      INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, 'sales_batch.posted_from_legacy_adapter', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id, SALES_BATCH_STORE_KEY, posted.batch.id, `Продажи ${posted.batch.businessDate}`, posted.batch.businessDate.slice(0, 7),
      JSON.stringify(posted.batch), JSON.stringify(["status", "lines", "movementIds", "recipeSnapshot"]), actor.name, actor.role,
      "Legacy POS report normalized into canonical SalesBatch before stock posting", now,
    ),
  ]);
  return Response.json({
    ok: true,
    document: confirmedDocument,
    documents: nextDocuments,
    salesBatch: posted.batch,
    batches: posted.batches,
    assortment: posted.assortment,
    stockMovements: posted.stockMovements,
    revenues: revenue.revenues,
    revenueRecord: revenue.revenueRecord,
    inventorySummary: { postedLines: posted.batch.postedLineCount, movementCount: posted.batch.movementIds.length, unresolvedLines: [] },
  }, { status: 201 });
}
