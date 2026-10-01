import { getD1 } from "../../../../db";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../../lib/bardoctor/store-cas";
import { MENU_INGESTION_STORE_KEY, MENU_SOURCES, menuDraft, editMenuDraft, validateMenuDraft, fingerprint, object, menuInput, type MenuDraft, type MenuSource } from "../../../../lib/bardoctor/menu-ingestion";
import { withInfrastructureErrorBoundary } from "../../../../lib/bardoctor/request-observability";

const ASSORTMENT = "bd_assortment_v1";
const fail = (code: string, error: string, status = 409) => Response.json({ ok: false, code, error }, { status });
export async function POST(request: Request): Promise<Response> {
  return withInfrastructureErrorBoundary(request, () => withStoreCasRetries(request, command));
}
async function command(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) return fail("ACCESS_DENIED", "Нет права изменять меню.", 403);
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 1024 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (Number(body.venueId) !== account.venueId) return fail("VENUE_CHANGED", "Заведение изменилось. Начните сверку заново.", 403);
  const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, [ASSORTMENT, MENU_INGESTION_STORE_KEY]);
  let assortment: Record<string, unknown>, drafts: MenuDraft[];
  try {
    const raw = JSON.parse(snapshots[0].dataJson ?? "null");
    if (raw !== null && (!raw || typeof raw !== "object" || Array.isArray(raw) || "menuItems" in raw && (!Array.isArray(raw.menuItems) || raw.menuItems.some((row: unknown) => !row || typeof row !== "object" || Array.isArray(row))))) throw Error("assortment");
    // Do not backfill an absent canonical store in the presence of history.
    if (raw === null) {
      const dependent = await readStoreSnapshots(db, account.id, ["bd_stock_movements", "bd_purchase_documents", "bd_inventory_snapshots"]);
      if (dependent.some(row => row.dataJson !== null && row.dataJson !== "[]" && row.dataJson !== "null")) return fail("AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED", "Существующая история требует отдельной сверки canonical каталога.");
      snapshots.push(...dependent);
    }
    assortment = raw ?? { menuItems: [], recipes: [], stockBalances: [], nomenclature: [] };
    // The existing empty authoritative assortment is stock-first and has no
    // menuItems property. Project it for draft validation; persist only on confirm.
    if (!("menuItems" in assortment)) assortment = { ...assortment, menuItems: [] };
    const staging = JSON.parse(snapshots[1].dataJson ?? "[]");
    if (!Array.isArray(staging) || staging.some(row => !row || row.version !== 1 || !Array.isArray(row.rows) || !MENU_SOURCES.includes(row.source) || row.venueId !== account.venueId)) throw Error("drafts");
    drafts = staging;
  } catch { return fail("MENU_STORE_NEEDS_REVIEW", "Данные меню или черновиков требуют проверки. Изменения не применены."); }
  const now = new Date().toISOString(), currency = accountingCurrencyFromRestaurantJson(account.restaurantJson);
  let draft = drafts.find(row => row.id === body.draftId);
  const write = async (next: MenuDraft, canonical?: Record<string, unknown>) => {
    const nextDrafts = draft ? drafts.map(row => row.id === next.id ? next : row) : [...drafts, next];
    const dataJson = JSON.stringify(nextDrafts);
    if (dataJson.length > 3_500_000) return fail("DRAFT_CAPACITY", "Лимит черновиков достигнут. Требуется обслуживание staging metadata.", 422);
    const statements = [db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(account.id, MENU_INGESTION_STORE_KEY, dataJson, now)];
    if (canonical) {
      const canonicalJson = JSON.stringify(canonical);
      if (canonicalJson.length > 4_000_000) return fail("MENU_CAPACITY", "Размер каталога превышает допустимый лимит.", 422);
      statements.push(db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(account.id, ASSORTMENT, canonicalJson, now));
      statements.push(db.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(account.id, ASSORTMENT, "update", next.id, "Подтверждение меню", JSON.stringify(assortment.menuItems), JSON.stringify(canonical.menuItems), '["menuItems"]', [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail, account.role, `menu ingestion ${next.source}`, now));
    }
    await runStoreCasBatch(db, account.id, snapshots, statements, now);
    return null;
  };
  const preview = (value: MenuDraft) => { const result = validateMenuDraft(value, assortment, currency, now); return { ok: result.ok, diff: result.diff, untouched: result.untouched, duplicateIds: result.duplicateIds, taxonomy: result.taxonomy }; };
  if (body.action === "create") {
    if (!MENU_SOURCES.includes(body.source as MenuSource) || !Array.isArray(body.items) || !body.items.length || body.items.length > 350 || body.items.some(row => !row || typeof row !== "object" || Array.isArray(row))) return fail("DRAFT_INPUT_INVALID", "Выберите источник и передайте от 1 до 350 позиций.", 422);
    const id = typeof body.draftId === "string" && /^[a-zA-Z0-9:_-]{8,100}$/.test(body.draftId) ? body.draftId : null;
    if (!id) return fail("DRAFT_ID_REQUIRED", "Нужен устойчивый идентификатор операции.", 422);
    const next = menuDraft({ id, source: body.source as MenuSource, venueId: account.venueId, items: body.items, assortment, now });
    if (draft) {
      // Identical create retry returns its current revision, never overwrites later edits.
      const createHash = await fingerprint({ source: body.source, items: body.items.map(menuInput) });
      if (object(draft).createHash !== createHash) return fail("IDEMPOTENCY_CONFLICT", "Идентификатор черновика использован для других данных.", 422);
      return Response.json({ ok: true, draft, preview: preview(draft), idempotent: true });
    }
    const metadata = object(body.provenance);
    const sourceFileIds = Array.isArray(metadata.sourceFileIds) ? metadata.sourceFileIds.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9-]{20,80}$/.test(id)).slice(0, 12) : [];
    if (sourceFileIds.length) next.provenance = { sourceFileIds, ...(typeof metadata.sourceUrl === "string" && /^(https?:\/\/|\/api\/catalog\/files\/)/.test(metadata.sourceUrl) ? { sourceUrl: metadata.sourceUrl.slice(0, 2000) } : {}), name: typeof metadata.name === "string" ? metadata.name.slice(0, 240) : "Меню" };
    Object.assign(next, { createHash: await fingerprint({ source: body.source, items: body.items.map(menuInput) }) });
    const error = await write(next); if (error) return error;
    return Response.json({ ok: true, draft: next, preview: preview(next) }, { status: 201 });
  }
  if (!draft) return fail("DRAFT_NOT_FOUND", "Черновик не найден.", 404);
  if (body.action === "get") return Response.json({ ok: true, draft, preview: preview(draft) });
  if (body.action === "confirm" && draft.status === "CONFIRMED") {
    if (body.validationHash !== draft.validationHash || body.revision !== draft.revision) return fail("IDEMPOTENCY_CONFLICT", "Повторное подтверждение содержит другие данные.", 422);
    return Response.json({ ok: true, draft, data: assortment, idempotent: true });
  }
  if (body.action === "cancel" && draft.status === "CANCELLED") return Response.json({ ok: true, draft, idempotent: true });
  if (["CONFIRMED", "CANCELLED"].includes(draft.status)) return fail("DRAFT_CLOSED", "Черновик уже завершён.");
  if (body.revision !== draft.revision) return fail("DRAFT_REVISION_CONFLICT", "Черновик изменился. Обновите сверку.");
  if (body.action === "update") {
    if (!Array.isArray(body.rows)) return fail("DRAFT_ROWS_REQUIRED", "Передайте строки черновика.", 422);
    let next: MenuDraft;
    try { next = editMenuDraft(draft, body.rows, now); } catch (error) { return fail(String(error instanceof Error ? error.message : error), "Некорректное изменение черновика.", 422); }
    const error = await write(next); if (error) return error;
    return Response.json({ ok: true, draft: next, preview: preview(next) });
  }
  if (body.action === "cancel") {
    const next: MenuDraft = { ...draft, status: "CANCELLED", validationHash: undefined, updatedAt: now };
    const error = await write(next); if (error) return error;
    return Response.json({ ok: true, draft: next });
  }
  if (!["validate", "confirm"].includes(String(body.action))) return fail("ACTION_INVALID", "Неизвестное действие.", 422);
  const validation = validateMenuDraft(draft, assortment, currency, now);
  if (!validation.ok) return Response.json({ ok: false, code: "MENU_VALIDATION_FAILED", error: "Проверьте строки с ошибками и конфликтами.", draft, preview: preview(draft) }, { status: 422 });
  const hash = await fingerprint({ draftId: draft.id, source: draft.source, revision: draft.revision, rows: draft.rows, assortment, currency });
  if (body.action === "validate") {
    draft = { ...draft, status: "VALIDATED", validationHash: hash, updatedAt: now };
    const error = await write(draft); if (error) return error;
    return Response.json({ ok: true, draft, preview: preview(draft) });
  }
  if (draft.status !== "VALIDATED" || body.validationHash !== draft.validationHash || hash !== draft.validationHash) return fail("VALIDATION_STALE", "Меню изменилось или сверка не завершена. Повторите проверку перед подтверждением.");
  const next: MenuDraft = { ...draft, status: "CONFIRMED", confirmedAt: now, updatedAt: now, resultIds: validation.diff.filter(row => row.decision === "apply").map(row => String(row.after.id)) };
  if (next.provenance && validation.diff.some(row => row.status === "ADDED" || row.status === "CHANGED")) validation.after.sources = [...(Array.isArray(assortment.sources) ? assortment.sources : []), { id: next.id, venueId: account.venueId, source: next.source, ...next.provenance, status: "confirmed", importedAt: now }];
  const error = await write(next, validation.after); if (error) return error;
  return Response.json({ ok: true, draft: next, data: validation.after, preview: preview(draft), idempotent: false }, { status: 201 });
}
