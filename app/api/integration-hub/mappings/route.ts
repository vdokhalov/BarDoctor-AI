import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY, inventoryProductKey } from "../../../../lib/bardoctor/inventory";
import { candidatesFromAssortment } from "../../../../lib/bardoctor/integrations/mapping";
import {
  confirmMapping,
  mappingById,
} from "../../../../lib/bardoctor/integrations/repository";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PUT(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage")) {
    return noStore(Response.json({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" }, { status: 403 }));
  }
  let body: JsonRecord;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 20_000) throw new Error("large");
    body = record(JSON.parse(raw));
  } catch {
    return noStore(Response.json({ ok: false, error: "Некорректный запрос" }, { status: 400 }));
  }
  const mappingId = typeof body.mappingId === "string" ? body.mappingId.trim() : "";
  const mapping = mappingId ? await mappingById(account, mappingId) : null;
  if (!mapping) return noStore(Response.json({ ok: false, error: "Сопоставление не найдено" }, { status: 404 }));

  const row = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
  `).bind(account.id, ASSORTMENT_STORE_KEY).first<{ data_json: string }>();
  let assortment: unknown = {};
  try { assortment = row ? JSON.parse(row.data_json) : {}; } catch { assortment = {}; }
  const type = mapping.entity_type === "menu_item" ? "menu_item" : "stock_product";
  const candidates = candidatesFromAssortment(assortment, type);
  const createNew = body.createNew === true;
  let internalId = typeof body.internalId === "string" ? body.internalId.trim() : "";
  let internalName = "";
  if (createNew) {
    if (type !== "stock_product") {
      return noStore(Response.json({ ok: false, error: "Позицию продажи нужно выбрать из действующего меню" }, { status: 422 }));
    }
    internalName = mapping.external_name;
    internalId = inventoryProductKey({ name: mapping.external_name, packageSize: mapping.external_unit });
  } else {
    const candidate = candidates.find((item) => item.id === internalId);
    if (!candidate) {
      return noStore(Response.json({ ok: false, error: "Выбранная позиция больше недоступна" }, { status: 422 }));
    }
    internalName = candidate.name;
  }
  const saved = await confirmMapping({
    tenant: account,
    mappingId,
    internalId,
    internalName,
    createNew,
  });
  return noStore(Response.json({
    ok: saved,
    message: saved
      ? "Соответствие сохранено. Повторите синхронизацию, чтобы провести документ."
      : "Сопоставление не изменено.",
  }, { status: saved ? 200 : 409 }));
}

