import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { defaultNomenclatureStructure } from "../../../../lib/bardoctor/nomenclature";
import {
  canonicalTaxonomyForAssortment,
  materializeMenuTaxonomy,
  mutateCanonicalTaxonomy,
  taxonomyUsage,
  type TaxonomyMutation,
} from "../../../../lib/bardoctor/nomenclature-taxonomy";

type JsonRecord = Record<string, unknown>;
type StoreRow = { data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = "", max = 200): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function parse(value: string | undefined): JsonRecord {
  if (!value) return {};
  try {
    return record(JSON.parse(value) as unknown);
  } catch {
    return {};
  }
}

function currentItems(assortment: JsonRecord): JsonRecord[] {
  const seen = new Set<string>();
  return [assortment.nomenclature, assortment.stockBalances, assortment.internalItems]
    .flatMap((value) => Array.isArray(value) ? value.map(record) : [])
    .flatMap((item) => {
      const productKey = text(item.productKey ?? item.key ?? item.id, "", 300);
      const name = text(item.name, "", 240);
      if (!productKey || !name || seen.has(productKey)) return [];
      seen.add(productKey);
      return [{
        productKey,
        name,
        itemType: text(item.itemType ?? item.kind, "other", 40),
        sectionId: text(item.sectionId, "", 120) || null,
        taxonomyCategoryId: text(item.taxonomyCategoryId, "", 120) || null,
        subcategoryId: text(item.subcategoryId, "", 120) || null,
        archived: item.archived === true || item.active === false,
      }];
    })
    .sort((left, right) => String(left.name).localeCompare(String(right.name), "ru"));
}

async function load(accountId: number): Promise<{ assortment: JsonRecord; updatedAt: string }> {
  const database = getD1();
  const row = await database.prepare(`
    SELECT data_json, updated_at
    FROM domain_data
    WHERE account_id = ? AND store_key = ?
    LIMIT 1
  `).bind(accountId, ASSORTMENT_STORE_KEY).first<StoreRow & { updated_at?: string }>();
  return { assortment: parse(row?.data_json), updatedAt: text(row?.updated_at) };
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Структура номенклатуры недоступна" }, { status: 403 });
  }
  const { assortment, updatedAt } = await load(account.id);
  const effective = canonicalTaxonomyForAssortment(assortment, defaultNomenclatureStructure());
  const taxonomy = effective.taxonomy;
  return Response.json({
    ok: true,
    venueId: account.venueId,
    taxonomy,
    legacyMenuPaths: effective.legacyMenuPaths,
    derivedFromMenu: effective.derivedFromMenu,
    usage: taxonomyUsage(assortment, taxonomy),
    items: currentItems(assortment),
    updatedAt,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права изменять структуру номенклатуры" }, { status: 403 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 32_000) {
    return Response.json({ ok: false, error: "Слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректная операция" }, { status: 400 });
  }
  const mutation = {
    action: text(body.action, "", 20),
    level: text(body.level, "", 20),
    id: text(body.id, "", 120) || undefined,
    name: text(body.name, "", 160) || undefined,
    parentId: text(body.parentId, "", 120) || undefined,
    direction: text(body.direction, "", 10) || undefined,
    strategy: text(body.strategy, "", 20) || undefined,
    targetId: text(body.targetId, "", 120) || undefined,
  } as TaxonomyMutation;
  if (!new Set(["create", "rename", "move", "reorder", "archive", "restore", "delete"]).has(mutation.action)
    || !new Set(["section", "category", "subcategory"]).has(mutation.level)) {
    return Response.json({ ok: false, error: "Неизвестная операция со структурой" }, { status: 400 });
  }

  const { assortment, updatedAt } = await load(account.id);
  const expectedUpdatedAt = text(body.expectedUpdatedAt, "", 80);
  if (expectedUpdatedAt && updatedAt && expectedUpdatedAt !== updatedAt) {
    return Response.json({
      ok: false,
      code: "DATA_STALE",
      error: "Структура изменилась в другой сессии. Данные обновлены — повторите действие.",
      updatedAt,
    }, { status: 409 });
  }
  const now = new Date().toISOString();
  const result = mutateCanonicalTaxonomy({
    assortment: materializeMenuTaxonomy(assortment, defaultNomenclatureStructure()),
    mutation,
    fallback: defaultNomenclatureStructure(),
    now,
  });
  if (!result.ok) {
    return Response.json(result, { status: result.code === "TAXONOMY_NOT_FOUND" ? 404 : 409 });
  }
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
  const database = getD1();
  await database.batch([
    database.prepare(`
      INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, store_key)
      DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(account.id, ASSORTMENT_STORE_KEY, JSON.stringify(result.assortment), now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      ASSORTMENT_STORE_KEY,
      `taxonomy_${mutation.action}`,
      mutation.id ?? result.node?.id ?? "taxonomy",
      result.node?.name ?? mutation.name ?? "Структура номенклатуры",
      JSON.stringify({ mutation, affectedItems: result.affectedItems }),
      JSON.stringify(["nomenclatureStructure"]),
      actorName,
      account.role,
      "Пользовательское изменение canonical taxonomy",
      now,
    ),
  ]);
  return Response.json({
    ok: true,
    venueId: account.venueId,
    taxonomy: result.taxonomy,
    usage: taxonomyUsage(result.assortment, result.taxonomy),
    assortment: result.assortment,
    affectedItems: result.affectedItems,
    node: result.node,
    updatedAt: now,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
