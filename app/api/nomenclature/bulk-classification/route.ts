import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { defaultNomenclatureStructure } from "../../../../lib/bardoctor/nomenclature";
import { normalizeCanonicalTaxonomy } from "../../../../lib/bardoctor/nomenclature-taxonomy";

type JsonRecord = Record<string, unknown>;
type StoreRow = { data_json: string; updated_at?: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 300): string {
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

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права изменять номенклатуру" }, { status: 403 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 96_000) {
    return Response.json({ ok: false, error: "Слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректные данные" }, { status: 400 });
  }
  const productKeys = [...new Set(array(body.productKeys).map((value) => text(value)).filter(Boolean))].slice(0, 500);
  const sectionId = text(body.sectionId, "", 120);
  const taxonomyCategoryId = text(body.taxonomyCategoryId, "", 120);
  const subcategoryId = text(body.subcategoryId, "", 120);
  if (!productKeys.length || !sectionId || !taxonomyCategoryId || !subcategoryId) {
    return Response.json({ ok: false, error: "Выберите позиции и полный путь классификации" }, { status: 422 });
  }

  const database = getD1();
  const row = await database.prepare(`
    SELECT data_json, updated_at
    FROM domain_data
    WHERE account_id = ? AND store_key = ?
    LIMIT 1
  `).bind(account.id, ASSORTMENT_STORE_KEY).first<StoreRow>();
  const expectedUpdatedAt = text(body.expectedUpdatedAt, "", 80);
  if (expectedUpdatedAt && row?.updated_at && expectedUpdatedAt !== row.updated_at) {
    return Response.json({
      ok: false,
      code: "DATA_STALE",
      error: "Номенклатура изменилась в другой сессии. Обновите данные и повторите операцию.",
      updatedAt: row.updated_at,
    }, { status: 409 });
  }
  const assortment = parse(row?.data_json);
  const taxonomy = normalizeCanonicalTaxonomy(assortment.nomenclatureStructure, defaultNomenclatureStructure());
  const section = taxonomy.sections.find((node) => node.id === sectionId && node.active);
  const category = taxonomy.categories.find((node) => node.id === taxonomyCategoryId && node.active && node.parentId === sectionId);
  const subcategory = taxonomy.subcategories.find((node) => node.id === subcategoryId && node.active && node.parentId === taxonomyCategoryId);
  if (!section || !category || !subcategory) {
    return Response.json({ ok: false, code: "TAXONOMY_PATH_INVALID", error: "Выбранный путь классификации больше недоступен" }, { status: 409 });
  }
  const selected = new Set(productKeys);
  const touched = new Set<string>();
  const classify = (value: unknown): JsonRecord[] => array(value).map(record).map((item) => {
    const productKey = text(item.productKey ?? item.key ?? item.id);
    if (!selected.has(productKey)) return item;
    touched.add(productKey);
    return {
      ...item,
      sectionId,
      taxonomyCategoryId,
      subcategoryId,
      classificationStatus: "classified",
      classificationConfidence: 1,
      classificationSource: "manual",
    };
  });
  const now = new Date().toISOString();
  const next = {
    ...assortment,
    nomenclatureStructure: taxonomy,
    nomenclature: classify(assortment.nomenclature),
    stockBalances: classify(assortment.stockBalances),
    menuItems: classify(assortment.menuItems),
    updatedAt: now,
  };
  if (!touched.size) {
    return Response.json({ ok: false, code: "PRODUCTS_NOT_FOUND", error: "Выбранные позиции не найдены" }, { status: 404 });
  }
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
  await database.batch([
    database.prepare(`
      INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, store_key)
      DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(account.id, ASSORTMENT_STORE_KEY, JSON.stringify(next), now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, 'bulk_classify', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      ASSORTMENT_STORE_KEY,
      `bulk:${now}`,
      `Массовая классификация: ${touched.size}`,
      JSON.stringify({ productKeys: [...touched], sectionId, taxonomyCategoryId, subcategoryId }),
      JSON.stringify(["sectionId", "taxonomyCategoryId", "subcategoryId"]),
      actorName,
      account.role,
      "Пользовательская массовая классификация без изменения истории",
      now,
    ),
  ]);
  return Response.json({
    ok: true,
    venueId: account.venueId,
    affectedItems: touched.size,
    assortment: next,
    updatedAt: now,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
