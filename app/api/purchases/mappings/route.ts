import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { nomenclatureCandidates } from "../../../../lib/bardoctor/invoice-recognition-v2";
import {
  resolveCanonicalPurchaseItem,
  upsertSupplierProductMapping,
} from "../../../../lib/bardoctor/nomenclature-identity";
import { SUPPLIER_STORE_KEY } from "../../../../lib/bardoctor/purchases";

type StoreRow = { store_key: string; data_json: string };
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function parsed(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права сопоставлять номенклатуру" }, { status: 403 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 20_000) {
    return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Данные сопоставления слишком большие" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw));
  } catch {
    return Response.json({ ok: false, code: "INVALID_JSON", error: "Не удалось прочитать сопоставление" }, { status: 400 });
  }
  const supplierId = text(body.supplierId, "", 160);
  const rawName = text(body.rawName, "", 300);
  const requestedKey = text(body.purchaseProductKey ?? body.nomenclatureId, "", 300);
  if (!supplierId || !rawName || !requestedKey) {
    return Response.json({ ok: false, code: "MAPPING_FIELDS_REQUIRED", error: "Выберите поставщика и позицию номенклатуры" }, { status: 400 });
  }

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, SUPPLIER_STORE_KEY).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const assortment = record(parsed(stores.get(ASSORTMENT_STORE_KEY), {}));
  const suppliers = array(parsed(stores.get(SUPPLIER_STORE_KEY), [])).map(record);
  const supplier = suppliers.find((value) => text(value.id, "", 160) === supplierId);
  if (!supplier || text(supplier.status, "active", 30) === "archived") {
    return Response.json({ ok: false, code: "SUPPLIER_NOT_FOUND", error: "Поставщик недоступен в текущем заведении" }, { status: 404 });
  }
  const candidates = nomenclatureCandidates(assortment, account.venueId);
  const candidate = candidates.find((value) => value.key === requestedKey || value.id === requestedKey);
  if (!candidate) {
    return Response.json({ ok: false, code: "NOMENCLATURE_NOT_FOUND", error: "Позиция недоступна в текущем заведении" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const resolution = resolveCanonicalPurchaseItem({
    assortment,
    document: {
      id: text(body.documentId, "", 120),
      venueId: account.venueId,
      supplierId,
      supplierName: text(supplier.name, "Поставщик", 180),
      currency: text(body.currency, "", 12),
    },
    item: {
      id: text(body.lineId, "", 120),
      name: rawName,
      purchaseProductKey: candidate.key,
      unit: text(body.unit, candidate.unit, 30),
      packageSize: text(body.packageSize, candidate.packageSize, 120),
    },
    canonicalItems: candidates,
    now,
  });
  const previousMappings = array(assortment.supplierProductMappings);
  const existed = previousMappings.map(record).some((value) => text(value.sourceItemKey, "", 500) === resolution.sourceMapping.sourceItemKey);
  if (body.action === "remove") {
    assortment.supplierProductMappings = previousMappings.filter((value) =>
      text(record(value).sourceItemKey, "", 500) !== resolution.sourceMapping.sourceItemKey
    );
    assortment.updatedAt = now;
    await database.batch([
      database.prepare(`
        INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(account_id, store_key)
        DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
      `).bind(account.id, ASSORTMENT_STORE_KEY, JSON.stringify(assortment), now),
      database.prepare(`
        INSERT INTO audit_log (
          account_id, store_key, action, entity_id, entity_label, month_key,
          before_json, after_json, changed_fields_json, actor_name, actor_role,
          reason, created_at
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?)
      `).bind(
        account.id,
        ASSORTMENT_STORE_KEY,
        "delete",
        resolution.sourceMapping.id,
        `Сопоставление поставщика: ${rawName}`,
        JSON.stringify({
          venueId: account.venueId,
          supplierId,
          canonicalProductKey: candidate.key,
          sourceItemKey: resolution.sourceMapping.sourceItemKey,
        }),
        JSON.stringify(["supplierProductMappings"]),
        [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
        account.role,
        "Пользователь отменил ошибочное соответствие строки накладной",
        now,
      ),
    ]);
    console.info("INVOICE_RECOGNITION_V2_MAPPING_REMOVED", {
      accountId: account.id,
      venueId: account.venueId,
      supplierId,
      removed: existed,
    });
    return Response.json({ ok: true, removed: existed }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const confirmedMapping = {
    ...resolution.sourceMapping,
    canonicalProductKey: candidate.key,
    status: "confirmed" as const,
    confidence: 1,
    confirmedByAccountId: account.actorAccountId,
    confirmedAt: now,
  };
  assortment.supplierProductMappings = upsertSupplierProductMapping(previousMappings, confirmedMapping);
  assortment.updatedAt = now;
  await database.batch([
    database.prepare(`
      INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, store_key)
      DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(account.id, ASSORTMENT_STORE_KEY, JSON.stringify(assortment), now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      ASSORTMENT_STORE_KEY,
      existed ? "update" : "create",
      confirmedMapping.id,
      `Сопоставление поставщика: ${rawName}`,
      JSON.stringify({
        venueId: account.venueId,
        supplierId,
        canonicalProductKey: candidate.key,
        sourceItemKey: confirmedMapping.sourceItemKey,
      }),
      JSON.stringify(["supplierProductMappings"]),
      [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
      account.role,
      "Пользователь подтвердил соответствие строки накладной канонической номенклатуре",
      now,
    ),
  ]);
  console.info("INVOICE_RECOGNITION_V2_MAPPING_CONFIRMED", {
    accountId: account.id,
    venueId: account.venueId,
    supplierId,
    mappingId: confirmedMapping.id,
    created: !existed,
  });
  return Response.json({
    ok: true,
    venueId: account.venueId,
    mapping: {
      id: confirmedMapping.id,
      nomenclatureId: candidate.id,
      purchaseProductKey: candidate.key,
      created: !existed,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
