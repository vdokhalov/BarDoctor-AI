import * as XLSX from "xlsx";
import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import {
  createOrUpdateSalesBatch,
  SALES_BATCH_STORE_KEY,
  SALES_MAPPING_STORE_KEY,
  SALES_WAREHOUSE_ROUTE_STORE_KEY,
  tabularSalesAdapter,
} from "../../../../lib/bardoctor/sales-consumption";

const WAREHOUSE_STORE_KEY = "bd_warehouses";
const MAX_FILE_BYTES = 12 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function numeric(value: unknown, fallback = Number.NaN): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}
function normalized(value: unknown): string {
  return text(value, "", 120).toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();
}
function upsertStore(database: D1Database, accountId: number, key: string, value: unknown, now: string) {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), now);
}

function detectColumns(rows: unknown[][]): { headerRow: number; nameColumn: number; quantityColumn: number; score: number } | null {
  const nameAliases = new Set(["позиция", "название", "наименование", "товар", "блюдо", "напиток", "menu item", "item", "product"]);
  const quantityAliases = new Set(["количество", "продано", "продажи", "порции", "qty", "quantity", "count", "sold"]);
  let best: { headerRow: number; nameColumn: number; quantityColumn: number; score: number } | null = null;
  const candidates = rows.slice(0, 20);
  for (let headerRow = 0; headerRow < candidates.length; headerRow += 1) {
    const row = candidates[headerRow];
    let nameColumn = -1;
    let quantityColumn = -1;
    row.slice(0, 50).forEach((cell, column) => {
      const label = normalized(cell);
      if (nameColumn < 0 && (nameAliases.has(label) || [...nameAliases].some((alias) => label.includes(alias)))) nameColumn = column;
      if (quantityColumn < 0 && (quantityAliases.has(label) || [...quantityAliases].some((alias) => label.includes(alias)))) quantityColumn = column;
    });
    const score = Number(nameColumn >= 0) + Number(quantityColumn >= 0);
    if (score && (!best || score > best.score)) best = { headerRow, nameColumn, quantityColumn, score };
  }
  return best?.score === 2 ? best : null;
}

async function readStores(database: D1Database, accountId: number) {
  const result = await database.prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?)
  `).bind(accountId, SALES_BATCH_STORE_KEY, SALES_MAPPING_STORE_KEY, SALES_WAREHOUSE_ROUTE_STORE_KEY, ASSORTMENT_STORE_KEY, WAREHOUSE_STORE_KEY).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    batches: array(parse(stores.get(SALES_BATCH_STORE_KEY), [])),
    mappings: array(parse(stores.get(SALES_MAPPING_STORE_KEY), [])),
    warehouseRoutes: array(parse(stores.get(SALES_WAREHOUSE_ROUTE_STORE_KEY), [])),
    assortment: record(parse(stores.get(ASSORTMENT_STORE_KEY), {})),
    warehouses: array(parse(stores.get(WAREHOUSE_STORE_KEY), [])),
  };
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "sales.create")) return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права импортировать продажи" }, { status: 403 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ ok: false, error: "Не удалось прочитать файл" }, { status: 400 }); }
  const value = form.get("file");
  if (!(value instanceof File)) return Response.json({ ok: false, error: "Выберите CSV или Excel" }, { status: 400 });
  if (value.size <= 0 || value.size > MAX_FILE_BYTES) return Response.json({ ok: false, error: "Файл должен быть не больше 12 МБ" }, { status: 413 });
  if (!/\.(csv|tsv|xls|xlsx)$/i.test(value.name)) return Response.json({ ok: false, code: "UNSUPPORTED_FILE", error: "Для структурированного импорта поддерживаются CSV, XLSX и XLS" }, { status: 415 });
  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(new Uint8Array(await value.arrayBuffer()), { type: "array", cellDates: true }); }
  catch { return Response.json({ ok: false, code: "FILE_PARSE_ERROR", error: "Не удалось открыть таблицу" }, { status: 422 }); }
  const sheetName = text(form.get("sheetName"), workbook.SheetNames[0], 160);
  const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "", blankrows: false }).slice(0, 5_100);
  const detected = detectColumns(rows);
  const explicitName = numeric(form.get("nameColumn"));
  const explicitQuantity = numeric(form.get("quantityColumn"));
  const explicitHeader = numeric(form.get("headerRow"));
  const nameColumn = Number.isInteger(explicitName) ? explicitName : detected?.nameColumn;
  const quantityColumn = Number.isInteger(explicitQuantity) ? explicitQuantity : detected?.quantityColumn;
  const headerRow = Number.isInteger(explicitHeader) ? explicitHeader : detected?.headerRow;
  if (nameColumn == null || quantityColumn == null || headerRow == null) {
    const width = Math.min(50, Math.max(0, ...rows.slice(0, 20).map((row) => row.length)));
    return Response.json({
      ok: true,
      columnMappingRequired: true,
      sheetNames: workbook.SheetNames,
      sheetName,
      columns: Array.from({ length: width }, (_, index) => ({ index, label: text(rows[0]?.[index], `Колонка ${index + 1}`, 120) })),
      previewRows: rows.slice(0, 12),
      error: "Выберите колонку названия и колонку количества",
    });
  }
  const draft = tabularSalesAdapter({
    rows,
    nameColumn,
    quantityColumn,
    headerRow,
    businessDate: text(form.get("businessDate"), "", 10) || undefined,
    sourceReference: value.name,
  });
  if (!draft.lines.length) return Response.json({ ok: false, code: "SALES_LINES_REQUIRED", error: "В выбранных колонках нет строк продаж" }, { status: 422 });
  const database = getD1();
  const stores = await readStores(database, account.id);
  const now = new Date().toISOString();
  const currentActor = {
    accountId: account.actorAccountId,
    name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    role: account.role,
  };
  const result = createOrUpdateSalesBatch({
    batches: stores.batches,
    draft,
    assortment: stores.assortment,
    mappings: stores.mappings,
    warehouseRoutes: stores.warehouseRoutes,
    warehouses: stores.warehouses,
    venueId: account.venueId,
    actor: currentActor,
    now,
  });
  if (!result.ok) return Response.json(result, { status: 422 });
  await database.batch([
    upsertStore(database, account.id, SALES_BATCH_STORE_KEY, result.batches, now),
    database.prepare(`
      INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, 'sales_batch.file_imported', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id, SALES_BATCH_STORE_KEY, result.batch.id, `Продажи ${result.batch.businessDate}`, result.batch.businessDate.slice(0, 7),
      JSON.stringify(result.batch), JSON.stringify(["source", "lines", "status"]), currentActor.name, currentActor.role,
      `Структурированный импорт ${value.name}; лист ${sheetName}; название col ${nameColumn}; количество col ${quantityColumn}`, now,
    ),
  ]);
  return Response.json({ ok: true, batch: result.batch, batches: result.batches, warnings: draft.warnings, columnMapping: { sheetName, headerRow, nameColumn, quantityColumn } }, { status: 201 });
}
