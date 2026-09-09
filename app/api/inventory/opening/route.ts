import { getD1 } from "../../../../db";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { parseOnboardingCsv } from "../../../../lib/bardoctor/onboarding-csv";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { defaultNomenclatureStructure } from "../../../../lib/bardoctor/nomenclature";
import { canonicalTaxonomyForAssortment, materializeMenuTaxonomy } from "../../../../lib/bardoctor/nomenclature-taxonomy";
import { confirmOpeningStock, previewOpeningStock, OPENING_STOCK_STORE_KEY, type OpeningContext, type OpeningInput } from "../../../../lib/bardoctor/opening-stock";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries, type StoreSnapshot } from "../../../../lib/bardoctor/store-cas";

const keys = [ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, OPENING_STOCK_STORE_KEY, "bd_month_closings", "bd_purchase_documents", "bd_inventory_snapshots", "bd_sales_batches"];
function json(snapshots: StoreSnapshot[], key: string, fallback: unknown): unknown {
  const raw = snapshots.find(v => v.key === key)?.dataJson;
  return raw == null ? fallback : JSON.parse(raw);
}
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function load(account: { id: number; venueId: number; restaurantJson: string | null }) {
  const snapshots = await readStoreSnapshots(getD1(), account.id, keys);
  if (snapshots.find(v => v.key === ASSORTMENT_STORE_KEY)?.dataJson == null
    && keys.filter(v => v !== ASSORTMENT_STORE_KEY && v !== "bd_month_closings").some(v => {
      const value = json(snapshots, v, []);
      return !Array.isArray(value) || value.length > 0;
    })) throw new Error("OPENING_STORE_NEEDS_REVIEW");
  const original = json(snapshots, ASSORTMENT_STORE_KEY, {});
  if (!original || typeof original !== "object" || Array.isArray(original)) throw new Error("OPENING_STORE_NEEDS_REVIEW");
  for (const key of ["nomenclature", "stockBalances"]) {
    const value = (original as Record<string, unknown>)[key];
    if (value !== undefined && (!Array.isArray(value) || value.some(v => !v || typeof v !== "object" || Array.isArray(v)))) throw new Error("OPENING_STORE_NEEDS_REVIEW");
  }
  const assortment = materializeMenuTaxonomy(original, defaultNomenclatureStructure());
  const movements = json(snapshots, STOCK_MOVEMENT_STORE_KEY, []);
  const documents = json(snapshots, OPENING_STOCK_STORE_KEY, []);
  if (!Array.isArray(movements) || !Array.isArray(documents)) throw new Error("OPENING_STORE_NEEDS_REVIEW");
  if (movements.some(v => !v || typeof v !== "object" || Array.isArray(v))
    || documents.some(v => !v || typeof v !== "object" || !Array.isArray(v.items))) throw new Error("OPENING_STORE_NEEDS_REVIEW");
  const historicalProductKeys: string[] = [];
  for (const key of ["bd_purchase_documents", "bd_inventory_snapshots", "bd_sales_batches"]) {
    const history = json(snapshots, key, []);
    if (!Array.isArray(history)) throw new Error("OPENING_STORE_NEEDS_REVIEW");
    for (const document of history) {
      if (!document || typeof document !== "object") throw new Error("OPENING_STORE_NEEDS_REVIEW");
      if (document.venueId != null && document.venueId !== account.venueId) continue;
      if (["draft", "DRAFT", "review", "cancelled", "CANCELLED"].includes(document.status)) continue;
      const lines = document.items ?? document.lines ?? [];
      if (!Array.isArray(lines)) throw new Error("OPENING_STORE_NEEDS_REVIEW");
      for (const line of lines) {
        if (line && typeof line === "object") for (const field of ["purchaseProductKey", "productKey", "nomenclatureItemId"]) {
          if (typeof line[field] === "string") historicalProductKeys.push(line[field]);
        }
      }
    }
  }
  const context: OpeningContext = { venueId: account.venueId, assortment, movements, documents, historicalProductKeys,
    taxonomy: canonicalTaxonomyForAssortment(assortment, defaultNomenclatureStructure()).taxonomy,
    currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) || "", now: new Date().toISOString() };
  return { snapshots, context };
}
export async function GET(request: Request) {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  let context: OpeningContext;
  try { ({ context } = await load(account)); }
  catch (error) {
    if (error instanceof SyntaxError || error instanceof Error && error.message === "OPENING_STORE_NEEDS_REVIEW") return reply({ ok: false, code: "OPENING_STORE_NEEDS_REVIEW", error: "Складские данные требуют проверки. Ничего не изменено." }, 409);
    throw error;
  }
  const nomenclature = Array.isArray(context.assortment.nomenclature) ? context.assortment.nomenclature : [];
  return reply({ ok: true, venueId: account.venueId, currency: context.currency, taxonomy: context.taxonomy,
    nomenclature: nomenclature.filter(v => v && typeof v === "object" && (v.venueId == null || v.venueId === account.venueId) && v.kind === "stock" && v.active !== false)
      .map(v => ({ productKey: v.productKey ?? v.key ?? v.id, name: v.name, unit: v.unit })),
    documents: context.documents.filter(v => v.venueId === account.venueId), canManage: hasPermission(account, "inventory.manage"), canImport: hasPermission(account, "data.import") });
}
export async function POST(request: Request): Promise<Response> {
  return withStoreCasRetries(request, command);
}
async function command(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  const parsed = await readJsonRequest<{ action: string; venueId: number; id: string; inputs: OpeningInput[]; selectedRowIds: string[]; csv?: string }>(request, { maxBytes: 600_000 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.venueId !== account.venueId) return reply({ ok: false, code: "VENUE_CHANGED", error: "Заведение изменилось. Загрузите форму заново." }, 409);
  if (body.action === "parse_csv") {
    if (!hasPermission(account, "data.import")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
    try { return reply({ ok: true, ...parseOnboardingCsv(body.csv!) }); }
    catch { return reply({ ok: false, code: "OPENING_CSV_INVALID", error: "Проверьте CSV: до 500 строк, 20 столбцов, 512 КБ; уникальные заголовки, без формул." }, 422); }
  }
  if (!Array.isArray(body.inputs) || body.inputs.length > 500 || !body.inputs.every(v => v && typeof v === "object" && !Array.isArray(v))) return reply({ ok: false, code: "OPENING_ROW_LIMIT" }, 422);
  if (body.inputs.length > 1 && !hasPermission(account, "data.import")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  try {
    const { snapshots, context } = await load(account);
    if (body.action === "preview") return reply({ ok: true, rows: previewOpeningStock(body.inputs, context) });
    if (body.action !== "confirm") return reply({ ok: false, code: "OPENING_ACTION_INVALID" }, 422);
    const result = await confirmOpeningStock(body, context);
    if ("errors" in result) return reply({ ok: false, code: "OPENING_NEEDS_REVIEW", rows: result.errors, error: "Выбранные строки требуют исправления. Ничего не сохранено." }, 422);
    if (result.duplicate) return reply({ ok: true, duplicate: true, document: result.document });
    if (closedMonthsFromStore(json(snapshots, "bd_month_closings", null)).has(context.now.slice(0, 7))) return reply({ ok: false, code: "MONTH_LOCKED" }, 409);
    const db = getD1();
    const updates = [[ASSORTMENT_STORE_KEY, result.assortment], [STOCK_MOVEMENT_STORE_KEY, result.movements], [OPENING_STOCK_STORE_KEY, result.documents]] as const;
    const statements = updates.map(([key, value]) => db.prepare(`INSERT INTO domain_data (account_id, store_key, data_json, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, store_key) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`).bind(account.id, key, JSON.stringify(value), context.now));
    statements.push(db.prepare(`INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label, month_key, before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, 'create', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`).bind(account.id, OPENING_STOCK_STORE_KEY, body.id, "Начальные остатки / номенклатура", context.now.slice(0, 7), JSON.stringify(result.document), '["items"]', [account.firstName, account.lastName].filter(Boolean).join(" "), account.role, "Подтверждённый ввод начальных данных", context.now));
    await runStoreCasBatch(db, account.id, snapshots, statements, context.now);
    return reply({ ok: true, duplicate: false, document: result.document }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ ok: false, code: "OPENING_STORE_NEEDS_REVIEW", error: "Складские данные требуют проверки. Ничего не изменено." }, 409);
    if (error instanceof Error && /^OPENING_|^VENUE_REQUIRED$/.test(error.message)) return reply({ ok: false, code: error.message, error: "Начальные данные требуют проверки. Ничего не сохранено." }, 422);
    throw error;
  }
}
