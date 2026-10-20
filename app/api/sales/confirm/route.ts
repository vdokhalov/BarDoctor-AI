import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";
import { posMembershipGuard } from "../../../../lib/bardoctor/pos-auth-guard";
import { SALES_ACCOUNTING_KEY, SalesAccountingError, parseSalesAccounting, assertSalesSource, manualImportReplacement, accountingRows } from "../../../../lib/bardoctor/sales-accounting";
import {readStockHistory,readSaleStock,stockStoreStatements,stockMovementResponse} from "../../../../lib/bardoctor/stock-storage";
import { venueTimeFromJson, venueDate } from "../../../../lib/bardoctor/venue-time";
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
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../../lib/bardoctor/store-cas";

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

async function postOnce(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "sales.post")) return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права проводить продажи по складу" }, { status: 403 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 700_000) return Response.json({ ok: false, error: "В отчёте слишком много данных" }, { status: 413 });
  let body: JsonRecord;
  try { body = record(JSON.parse(raw) as unknown); } catch { return Response.json({ ok: false, error: "Некорректный отчёт" }, { status: 400 }); }
  const now = new Date().toISOString();
  const document = normalizeSalesDocument({ ...record(body.document), date: record(body.document).date || venueDate(now, venueTimeFromJson(account.restaurantJson).timezone) }, crypto.randomUUID());
  if (!document.items.length) return Response.json({ ok: false, error: "В отчёте нет проданных позиций" }, { status: 422 });
  if (document.venueId && document.venueId !== account.venueId) return Response.json({ ok: false, code: "SALES_VENUE_MISMATCH", error: "Отчёт относится к другому заведению" }, { status: 403 });

  document.venueId = account.venueId;

  const database = getD1();
  const casSnapshots = await readStoreSnapshots(database, account.id, [
    SALES_DOCUMENT_STORE_KEY,
    SALES_BATCH_STORE_KEY,
    SALES_MAPPING_STORE_KEY,
    SALES_WAREHOUSE_ROUTE_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    WAREHOUSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    REVENUE_STORE_KEY, SALES_ACCOUNTING_KEY, "bd_sales_import_review_v1",
  ]);
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
  const stockMovements = (await readSaleStock(database,account.id,stores.get(STOCK_MOVEMENT_STORE_KEY),record(assortment),document.date,[],now)).movements;
  const warehouses = array(stores.get(WAREHOUSE_STORE_KEY));
  const revenues = array(stores.get(REVENUE_STORE_KEY));
  const closed = closedMonthsFromStore(parse(stores.get(MONTH_CLOSING_STORE_KEY), null));
  const setting=parseSalesAccounting(JSON.parse(casSnapshots.find(s=>s.key===SALES_ACCOUNTING_KEY)?.dataJson??"null"),account.venueId);
  const duplicateDocument = documents.find((value) => record(value).id === document.id);
  if (duplicateDocument) return Response.json({ ok: true, duplicate: true, document: duplicateDocument, documents, assortment, ...stockMovementResponse(stockMovements,stockMovements,false) });
  const pending=accountingRows(JSON.parse(casSnapshots.find(s=>s.key==="bd_sales_import_review_v1")?.dataJson??"[]"));
  let replacement: ReturnType<typeof manualImportReplacement> = null;
  try { replacement=manualImportReplacement({revenues:revenues.map(record),venueId:account.venueId,date:document.date,role:account.role,request:body.replacement,stagedDocument:pending.find(x=>x.id===document.id&&x.status==="AWAITING_RECONCILIATION")?.document,document}); }
  catch(error){if(error instanceof SalesAccountingError)return Response.json({ok:false,code:error.code,error:error.message},{status:error.code==="ACCESS_DENIED"?403:409});throw error;}
  try { if(document.currency!==accountingCurrencyFromRestaurantJson(account.restaurantJson))throw new SalesAccountingError("IMPORT_CURRENCY_CONFLICT","Валюта импорта отличается от валюты заведения. Требуется сверка."); if(closed.has(document.date.slice(0,7)))throw new SalesAccountingError("MONTH_LOCKED","Месяц закрыт. Импорт сохранён для сверки после открытия периода."); if(!replacement){assertSalesSource(setting,revenues.map(record),account.venueId,document.date,"IMPORT");
    if(revenues.some(x=>record(x).date===document.date&&record(x).revenueSource==="sales_documents"))throw new SalesAccountingError("ACCOUNTING_SOURCE_CONFLICT","За день уже есть импортный отчёт. Требуется сверка покрытия.");
  } } catch(error) {
    if(!(error instanceof SalesAccountingError))throw error;
    const existing=pending.find(x=>x.id===document.id);
    if(existing && JSON.stringify(existing.document)!==JSON.stringify(document))return Response.json({ok:false,code:"IMPORT_REVISION_CONFLICT",error:"Этот импорт уже ожидает сверки с другим содержимым."},{status:409});
    if(!existing){const staged={id:document.id,venueId:account.venueId,date:document.date,status:"AWAITING_RECONCILIATION",document,conflict:error.code,createdAt:now};
      await runStoreCasBatch(database,account.id,casSnapshots,[posMembershipGuard(database,account,now),upsertStore(database,account.id,"bd_sales_import_review_v1",[...pending,staged],now),database.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(account.id,"bd_sales_import_review_v1","sales_import.staged",document.id,"Импорт для сверки",document.date.slice(0,7),null,JSON.stringify(staged),'["status"]',account.firstName,account.role,"Конфликт источников выручки",now)],now);}
    return Response.json({ok:false,staged:true,stagedId:document.id,code:error.code,error:"Импорт сохранён для сверки. Выручка и склад не изменены."},{status:409});
  }

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
    stockMovements,
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
  const revenue = reconcileSalesRevenue({ revenues:replacement?.revenues??revenues, salesDocuments: documents, document: confirmedDocument, now });
  if (!revenue.ok) return Response.json({ ok: false, code: revenue.code, error: revenue.error }, { status: 409 });
  if(replacement)Object.assign(revenue.revenueRecord,{venueId:account.venueId,sourceReplacementVersion:1,sourceHistory:[{source:"MANUAL_SUMMARY",snapshot:replacement.previous,replacedAt:now,actorId:account.actorAccountId,reason:replacement.reason}]});
  const nextDocuments = [confirmedDocument, ...documents];
  await runStoreCasBatch(database, account.id, casSnapshots, [
    posMembershipGuard(database,account,now),
    ...(replacement?[upsertStore(database,account.id,"bd_sales_import_review_v1",pending.map(x=>x.id===document.id?{...x,status:"RECONCILED",resolvedAt:now,resolvedBy:account.actorAccountId}:x),now),
      database.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(account.id,REVENUE_STORE_KEY,"sales_source.replaced",String(replacement.previous.id),"Замена ручных итогов импортом",document.date.slice(0,7),JSON.stringify(replacement.previous),JSON.stringify(revenue.revenueRecord),'["revenueSource","revenue"]',actor.name,actor.role,replacement.reason,now)]:[]),
    upsertStore(database, account.id, SALES_DOCUMENT_STORE_KEY, nextDocuments, now),
    upsertStore(database, account.id, SALES_BATCH_STORE_KEY, posted.batches, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, posted.assortment, now),
    ...await stockStoreStatements(database, account.id, STOCK_MOVEMENT_STORE_KEY, posted.stockMovements, now),
    upsertStore(database, account.id, REVENUE_STORE_KEY, revenue.revenues, now),
    database.prepare(`
      INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, 'sales_batch.posted_from_legacy_adapter', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id, SALES_BATCH_STORE_KEY, posted.batch.id, `Продажи ${posted.batch.businessDate}`, posted.batch.businessDate.slice(0, 7),
      JSON.stringify(posted.batch), JSON.stringify(["status", "lines", "movementIds", "recipeSnapshot"]), actor.name, actor.role,
      "Legacy POS report normalized into canonical SalesBatch before stock posting", now,
    ),
  ], now);
  return Response.json({
    ok: true,
    document: confirmedDocument,
    documents: nextDocuments,
    salesBatch: posted.batch,
    batches: posted.batches,
    assortment: posted.assortment,
    ...stockMovementResponse(stockMovements,posted.stockMovements),
    revenues: revenue.revenues,
    revenueRecord: revenue.revenueRecord,
    inventorySummary: { postedLines: posted.batch.postedLineCount, movementCount: posted.batch.movementIds.length, unresolvedLines: [] },
  }, { status: 201 });
}

export async function POST(request: Request): Promise<Response> {
  return withStoreCasRetries(request, postOnce);
}
