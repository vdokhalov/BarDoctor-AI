import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../lib/bardoctor/inventory";
import {
  cancelSalesDraft,
  createOrUpdateSalesBatch,
  manualSalesAdapter,
  postSalesBatch,
  reverseSalesBatch,
  revokeSalesMapping,
  SALES_BATCH_STORE_KEY,
  SALES_MAPPING_STORE_KEY,
  SALES_SOURCES,
  SALES_WAREHOUSE_ROUTE_STORE_KEY,
  salesBatchKpis,
  salesBatches,
  salesDataQuality,
  textSalesAdapter,
  upsertSalesMapping,
  type NormalizedSalesDraft,
  type SalesBatch,
  type SalesSource,
} from "../../../lib/bardoctor/sales-consumption";

const WAREHOUSE_STORE_KEY = "bd_warehouses";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
const MAX_BODY_BYTES = 1_000_000;

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function numeric(value: unknown, fallback = 0): number {
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
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    accountId,
    SALES_BATCH_STORE_KEY,
    SALES_MAPPING_STORE_KEY,
    SALES_WAREHOUSE_ROUTE_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    WAREHOUSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    batches: array(parse(stores.get(SALES_BATCH_STORE_KEY), [])),
    mappings: array(parse(stores.get(SALES_MAPPING_STORE_KEY), [])),
    warehouseRoutes: array(parse(stores.get(SALES_WAREHOUSE_ROUTE_STORE_KEY), [])),
    assortment: record(parse(stores.get(ASSORTMENT_STORE_KEY), {})),
    stockMovements: array(parse(stores.get(STOCK_MOVEMENT_STORE_KEY), [])),
    warehouses: array(parse(stores.get(WAREHOUSE_STORE_KEY), [])),
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
  batch: SalesBatch;
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
    SALES_BATCH_STORE_KEY,
    input.action,
    input.batch.id,
    `Продажи ${input.batch.businessDate}`,
    input.batch.businessDate.slice(0, 7),
    input.before == null ? null : JSON.stringify(input.before),
    JSON.stringify(input.batch),
    JSON.stringify(["status", "source", "shiftId", "lines", "movementIds", "totalTheoreticalCost"]),
    input.actorName,
    input.actorRole,
    input.reason,
    input.now,
  );
}

function activeMenu(assortment: JsonRecord, venueId: number) {
  return array(assortment.menuItems).map(record).filter((item) => {
    const rowVenueId = numeric(item.venueId);
    return item.active !== false && item.type !== "service" && (!rowVenueId || rowVenueId === venueId);
  }).map((item) => ({
    id: text(item.id, "", 160),
    name: text(item.name, "Позиция меню"),
    department: text(item.department, "other", 100),
    category: text(item.category, "Без категории", 120),
    salePrice: numeric(item.salePrice),
    currency: text(item.currency, "", 12).toUpperCase(),
  }));
}

function latestTemplate(batches: SalesBatch[]) {
  const previous = batches.filter((batch) => batch.lines.length && batch.status !== "CANCELLED")
    .sort((left, right) => right.businessDate.localeCompare(left.businessDate) || right.createdAt.localeCompare(left.createdAt))[0];
  return previous ? {
    batchId: previous.id,
    businessDate: previous.businessDate,
    items: previous.lines.filter((line) => line.menuItemId).map((line) => ({
      menuItemId: line.menuItemId,
      rawName: line.recipeSnapshot?.menuItem.name ?? line.rawName,
      quantity: 0,
    })),
  } : null;
}

function responsePayload(stores: Awaited<ReturnType<typeof readStores>>, venueId: number, permissions: string[]) {
  const batches = salesBatches(stores.batches, venueId).sort((left, right) =>
    right.businessDate.localeCompare(left.businessDate) || right.createdAt.localeCompare(left.createdAt)
  );
  return {
    ok: true,
    venueId,
    batches,
    menu: activeMenu(stores.assortment, venueId),
    mappings: stores.mappings.filter((value) => numeric(record(value).venueId) === venueId),
    warehouseRoutes: stores.warehouseRoutes.filter((value) => numeric(record(value).venueId) === venueId),
    warehouses: stores.warehouses.filter((value) => {
      const rowVenueId = numeric(record(value).venueId);
      return !rowVenueId || rowVenueId === venueId;
    }),
    kpis: salesBatchKpis(batches, venueId),
    dataQuality: salesDataQuality(batches, venueId),
    latestTemplate: latestTemplate(batches),
    capabilities: {
      create: permissions.includes("sales.create"),
      post: permissions.includes("sales.post"),
      reverse: permissions.includes("sales.reverse"),
      manageMapping: permissions.includes("sales.manage_mapping"),
      imageImport: true,
      voiceImport: false,
    },
  };
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "sales.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права просматривать продажи" }, { status: 403 });
  }
  const stores = await readStores(getD1(), account.id);
  const id = text(new URL(request.url).searchParams.get("id"), "", 160);
  if (id) {
    const batch = salesBatches(stores.batches, account.venueId).find((item) => item.id === id);
    if (!batch) return Response.json({ ok: false, code: "SALES_BATCH_NOT_FOUND", error: "Документ не найден или относится к другому заведению" }, { status: 404 });
    return Response.json({ ok: true, batch, venueId: account.venueId }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return Response.json(responsePayload(stores, account.venueId, account.permissions), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return Response.json({ ok: false, error: "В документе слишком много данных" }, { status: 413 });
  let body: JsonRecord;
  try { body = record(JSON.parse(raw) as unknown); } catch { return Response.json({ ok: false, error: "Некорректные данные продаж" }, { status: 400 }); }
  if (body.venueId != null && numeric(body.venueId) !== account.venueId) {
    return Response.json({ ok: false, code: "SALES_VENUE_MISMATCH", error: "Заведение в запросе не совпадает с авторизованным контекстом" }, { status: 403 });
  }
  const action = text(body.action, "save_draft", 40);
  const permission = action === "post" ? "sales.post"
    : action === "reverse" ? "sales.reverse"
    : ["map", "revoke_mapping", "save_warehouse_route"].includes(action) ? "sales.manage_mapping"
    : "sales.create";
  if (!hasPermission(account, permission)) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав для этого действия" }, { status: 403 });
  }
  const database = getD1();
  const stores = await readStores(database, account.id);
  const now = new Date().toISOString();
  const currentActor = actor(account);

  if (action === "map") {
    const source = text(body.source, "MANUAL_GRID", 40) as SalesSource;
    const rawName = text(body.rawName, "", 300);
    const menuItemId = text(body.menuItemId, "", 160);
    if (!(SALES_SOURCES as readonly string[]).includes(source)) {
      return Response.json({ ok: false, code: "INVALID_SALES_SOURCE", error: "Неизвестный источник продаж" }, { status: 422 });
    }
    if (!rawName || !activeMenu(stores.assortment, account.venueId).some((item) => item.id === menuItemId)) {
      return Response.json({ ok: false, code: "INVALID_SALES_MAPPING", error: "Выберите существующую позицию меню этого заведения" }, { status: 422 });
    }
    const mapped = upsertSalesMapping({
      mappings: stores.mappings,
      venueId: account.venueId,
      source,
      rawName,
      menuItemId,
      actorAccountId: account.actorAccountId,
      now,
    });
    const batchId = text(body.batchId, "", 160);
    const lineId = text(body.lineId, "", 160);
    const batch = salesBatches(stores.batches, account.venueId).find((item) => item.id === batchId);
    let nextBatches = stores.batches;
    let nextBatch = batch;
    if (batch && lineId) {
      const update = createOrUpdateSalesBatch({
        batches: stores.batches,
        batchId: batch.id,
        draft: {
          source: batch.source,
          businessDate: batch.businessDate,
          shiftId: batch.shiftId,
          sourceReference: batch.sourceReference,
          notes: batch.notes,
          warnings: [],
          lines: batch.lines.map((line) => ({
            id: line.id,
            externalLineId: line.externalLineId,
            rawName: line.rawName,
            menuItemId: line.id === lineId ? mapped.mapping.menuItemId : line.menuItemId,
            quantity: line.quantity,
            modifiers: line.modifiers,
          })),
        },
        assortment: stores.assortment,
        mappings: mapped.mappings,
        warehouseRoutes: stores.warehouseRoutes,
        warehouses: stores.warehouses,
        venueId: account.venueId,
        actor: currentActor,
        now,
      });
      if (update.ok) { nextBatches = update.batches; nextBatch = update.batch; }
    }
    const statements = [
      upsertStore(database, account.id, SALES_MAPPING_STORE_KEY, mapped.mappings, now),
      database.prepare(`
        INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
        VALUES (?, ?, 'sales.mapping.updated', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        account.id, SALES_MAPPING_STORE_KEY, mapped.mapping.id, mapped.mapping.rawName,
        mapped.before ? JSON.stringify(mapped.before) : null, JSON.stringify(mapped.mapping), JSON.stringify(["menuItemId", "status"]),
        currentActor.name, currentActor.role, `Venue-scoped mapping ${mapped.mapping.source}`, now,
      ),
    ];
    if (nextBatch) statements.unshift(upsertStore(database, account.id, SALES_BATCH_STORE_KEY, nextBatches, now));
    await database.batch(statements);
    return Response.json({ ok: true, mapping: mapped.mapping, batch: nextBatch, mappings: mapped.mappings });
  }

  if (action === "revoke_mapping") {
    const revoked = revokeSalesMapping({ mappings: stores.mappings, venueId: account.venueId, id: text(body.id, "", 160), now });
    if (!revoked.ok) return Response.json(revoked, { status: 404 });
    await database.batch([
      upsertStore(database, account.id, SALES_MAPPING_STORE_KEY, revoked.mappings, now),
      database.prepare(`
        INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
        VALUES (?, ?, 'sales.mapping.revoked', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
      `).bind(account.id, SALES_MAPPING_STORE_KEY, revoked.mapping.id, revoked.mapping.rawName, JSON.stringify(revoked.mapping), JSON.stringify(["status"]), currentActor.name, currentActor.role, "Сопоставление отозвано без удаления истории", now),
    ]);
    return Response.json({ ok: true, mapping: revoked.mapping, mappings: revoked.mappings });
  }

  if (action === "save_warehouse_route") {
    const route = {
      id: text(record(body.route).id, crypto.randomUUID(), 160),
      venueId: account.venueId,
      department: text(record(body.route).department, "other", 100),
      salesLocation: text(record(body.route).salesLocation, "", 120) || undefined,
      warehouseId: text(record(body.route).warehouseId, "", 160),
      warehouseName: text(record(body.route).warehouseName, "", 160) || undefined,
      active: record(body.route).active !== false,
      createdAt: text(record(body.route).createdAt, now, 40),
      updatedAt: now,
    };
    if (!route.warehouseId) return Response.json({ ok: false, code: "WAREHOUSE_MAPPING_REQUIRED", error: "Выберите склад" }, { status: 422 });
    const routes = [route, ...stores.warehouseRoutes.filter((value) => text(record(value).id, "", 160) !== route.id)];
    await database.batch([
      upsertStore(database, account.id, SALES_WAREHOUSE_ROUTE_STORE_KEY, routes, now),
      database.prepare(`
        INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
        VALUES (?, ?, 'sales.warehouse_route.updated', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
      `).bind(account.id, SALES_WAREHOUSE_ROUTE_STORE_KEY, route.id, route.department, JSON.stringify(route), JSON.stringify(["department", "warehouseId", "active"]), currentActor.name, currentActor.role, "Настроена явная маршрутизация расхода продаж", now),
    ]);
    return Response.json({ ok: true, route, warehouseRoutes: routes });
  }

  const batchId = text(body.id ?? body.batchId, "", 160);
  const before = salesBatches(stores.batches, account.venueId).find((item) => item.id === batchId);

  if (action === "post") {
    if (before && stores.closedMonths.has(before.businessDate.slice(0, 7))) {
      return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${before.businessDate.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
    }
    const result = postSalesBatch({
      batches: stores.batches, batchId, assortment: stores.assortment, mappings: stores.mappings,
      warehouseRoutes: stores.warehouseRoutes, warehouses: stores.warehouses, stockMovements: stores.stockMovements,
      venueId: account.venueId, actor: currentActor, now,
    });
    if (!result.ok) return Response.json(result, { status: result.code === "SALES_BATCH_NOT_FOUND" ? 404 : 422 });
    if (result.idempotent) return Response.json({ ok: true, idempotent: true, batch: result.batch, postedNow: 0, stockChanged: false });
    await database.batch([
      upsertStore(database, account.id, SALES_BATCH_STORE_KEY, result.batches, now),
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
      upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, result.stockMovements, now),
      auditStatement({ database, accountId: account.id, action: result.batch.status === "POSTED" ? "sales_batch.posted" : "sales_batch.partially_posted", batch: result.batch, before, actorName: currentActor.name, actorRole: currentActor.role, reason: `Создано immutable SALE_CONSUMPTION движений: ${result.batch.movementIds.length}; отражено строк: ${result.batch.postedLineCount}/${result.batch.lines.length}`, now }),
    ]);
    return Response.json({ ok: true, idempotent: false, batch: result.batch, batches: result.batches, assortment: result.assortment, stockMovements: result.stockMovements, postedNow: result.postedNow, stockChanged: true }, { status: 201 });
  }

  if (action === "reverse") {
    if (before && stores.closedMonths.has(before.businessDate.slice(0, 7))) {
      return Response.json({ ok: false, code: "MONTH_LOCKED", error: `Месяц ${before.businessDate.slice(0, 7)} закрыт. Сначала откройте его в мастере закрытия месяца.` }, { status: 423 });
    }
    const result = reverseSalesBatch({ batches: stores.batches, batchId, assortment: stores.assortment, stockMovements: stores.stockMovements, venueId: account.venueId, actor: currentActor, now });
    if (!result.ok) return Response.json(result, { status: result.code === "SALES_BATCH_NOT_FOUND" ? 404 : 409 });
    if (result.idempotent) return Response.json({ ok: true, idempotent: true, batch: result.batch, stockChanged: false });
    await database.batch([
      upsertStore(database, account.id, SALES_BATCH_STORE_KEY, result.batches, now),
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
      upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, result.stockMovements, now),
      auditStatement({ database, accountId: account.id, action: "sales_batch.reversed", batch: result.batch, before, actorName: currentActor.name, actorRole: currentActor.role, reason: `Создано SALE_REVERSAL движений: ${result.batch.reversalMovementIds.length}; исходные движения не удалены`, now }),
    ]);
    return Response.json({ ok: true, batch: result.batch, batches: result.batches, assortment: result.assortment, stockMovements: result.stockMovements, stockChanged: true });
  }

  if (action === "cancel") {
    const result = cancelSalesDraft({ batches: stores.batches, batchId, venueId: account.venueId, now });
    if (!result.ok) return Response.json(result, { status: result.code === "SALES_BATCH_NOT_FOUND" ? 404 : 409 });
    await database.batch([
      upsertStore(database, account.id, SALES_BATCH_STORE_KEY, result.batches, now),
      auditStatement({ database, accountId: account.id, action: "sales_batch.cancelled", batch: result.batch, before, actorName: currentActor.name, actorRole: currentActor.role, reason: "Черновик отменён; склад не изменён", now }),
    ]);
    return Response.json({ ok: true, batch: result.batch, batches: result.batches, stockChanged: false });
  }

  let draft: NormalizedSalesDraft;
  if (action === "import_text" || action === "import_voice") {
    draft = textSalesAdapter.parse({ text: text(body.text, "", 200_000), businessDate: text(body.businessDate, "", 10) || undefined, shiftId: text(body.shiftId, "", 160) || undefined });
    if (action === "import_voice") draft.source = "VOICE_IMPORT";
  } else {
    const requested = record(body.draft ?? body.document);
    draft = manualSalesAdapter.parse({
      lines: array(requested.lines ?? body.lines).map((value) => record(value)) as never,
      businessDate: text(requested.businessDate ?? body.businessDate, "", 10) || undefined,
      shiftId: text(requested.shiftId ?? body.shiftId, "", 160) || undefined,
      notes: text(requested.notes ?? body.notes, "", 1_000) || undefined,
    });
    draft.source = text(requested.source ?? body.source, "MANUAL_GRID", 40) as SalesSource;
    draft.sourceReference = text(requested.sourceReference ?? body.sourceReference, "", 240) || undefined;
    draft.externalBatchId = text(requested.externalBatchId ?? body.externalBatchId, "", 180) || undefined;
  }
  if (!draft.lines.length) return Response.json({ ok: false, code: "SALES_LINES_REQUIRED", error: "Добавьте хотя бы одну проданную позицию" }, { status: 422 });
  if (!batchId && draft.externalBatchId) {
    const duplicate = salesBatches(stores.batches, account.venueId).find((batch) => batch.source === draft.source && batch.externalBatchId === draft.externalBatchId && batch.status !== "CANCELLED");
    if (duplicate) return Response.json({ ok: true, idempotent: true, batch: duplicate, stockChanged: false });
  }
  const result = createOrUpdateSalesBatch({
    batches: stores.batches,
    batchId: batchId || undefined,
    draft,
    assortment: stores.assortment,
    mappings: stores.mappings,
    warehouseRoutes: stores.warehouseRoutes,
    warehouses: stores.warehouses,
    venueId: account.venueId,
    actor: currentActor,
    now,
  });
  if (!result.ok) return Response.json(result, { status: result.code === "SALES_BATCH_READ_ONLY" ? 409 : 422 });
  await database.batch([
    upsertStore(database, account.id, SALES_BATCH_STORE_KEY, result.batches, now),
    auditStatement({ database, accountId: account.id, action: before ? "sales_batch.draft_updated" : "sales_batch.draft_created", batch: result.batch, before, actorName: currentActor.name, actorRole: currentActor.role, reason: `Черновик сохранён server-side; источник ${result.batch.source}; склад не изменён`, now }),
  ]);
  return Response.json({ ok: true, batch: result.batch, batches: result.batches, warnings: draft.warnings, stockChanged: false }, { status: before ? 200 : 201 });
}
