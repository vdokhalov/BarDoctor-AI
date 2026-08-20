import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  ASSORTMENT_STORE_KEY,
  BaseInventoryUnit,
  repairInventoryBalanceMetadata,
  STOCK_MOVEMENT_STORE_KEY,
  updateInventoryProductDefinition,
} from "../../../../lib/bardoctor/inventory";

type StoreRow = { store_key: string; data_json: string };
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function json(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function array(value: string | undefined): unknown[] {
  const parsed = json(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function upsertStore(
  database: D1Database,
  accountId: number,
  value: unknown,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, ASSORTMENT_STORE_KEY, JSON.stringify(value), updatedAt);
}

function auditUpdate(
  database: D1Database,
  input: {
    accountId: number;
    entityId: string;
    entityLabel: string;
    before: unknown;
    after: unknown;
    actorName: string;
    actorRole: string;
    reason: string;
    createdAt: string;
  },
): D1PreparedStatement {
  const before = record(input.before);
  const after = record(input.after);
  const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
  return database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, 'update', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    ASSORTMENT_STORE_KEY,
    input.entityId,
    input.entityLabel,
    JSON.stringify(input.before),
    JSON.stringify(input.after),
    JSON.stringify(changedFields),
    input.actorName,
    input.actorRole,
    input.reason,
    input.createdAt,
  );
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права изменять номенклатуру склада" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 64_000) {
    return Response.json({ ok: false, error: "Слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректные данные товара" }, { status: 400 });
  }
  const action = text(body.action, "repair", 20);
  if (!new Set(["repair", "update"]).has(action)) {
    return Response.json({ ok: false, error: "Неизвестное действие" }, { status: 400 });
  }

  const database = getD1();
  const storesResult = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY).all<StoreRow>();
  const stores = new Map((storesResult.results ?? []).map((row) => [row.store_key, row.data_json]));
  const assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const now = new Date().toISOString();
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;

  if (action === "repair") {
    const repaired = repairInventoryBalanceMetadata({ assortment, stockMovements, now });
    if (repaired.summary.repaired || repaired.summary.removed) {
      await database.batch([
        upsertStore(database, account.id, repaired.assortment, now),
        auditUpdate(database, {
          accountId: account.id,
          entityId: "inventory-metadata",
          entityLabel: "Номенклатура склада",
          before: assortment,
          after: repaired.assortment,
          actorName,
          actorRole: account.role,
          reason: "Восстановление названий складских позиций из техкарт",
          createdAt: now,
        }),
      ]);
    }
    return Response.json({
      ok: true,
      assortment: repaired.assortment,
      repaired: repaired.summary.repaired,
      removed: repaired.summary.removed,
    });
  }

  const productKey = text(body.productKey, "", 300);
  const previousRoot = record(assortment);
  const previousProduct = (Array.isArray(previousRoot.stockBalances) ? previousRoot.stockBalances : [])
    .map(record)
    .find((value) => text(value.productKey ?? value.key, "", 300) === productKey) ?? null;
  const requestedUnit = text(body.unit, "", 20) as BaseInventoryUnit;
  const updated = updateInventoryProductDefinition({
    assortment,
    stockMovements,
    update: {
      productKey,
      name: text(body.name, "", 240),
      unit: requestedUnit,
      packageSize: text(body.packageSize, "", 120),
    },
    now,
  });
  if (!updated.ok) {
    const status = updated.code === "PRODUCT_NOT_FOUND"
      ? 404
      : updated.code === "UNIT_CHANGE_LOCKED"
        ? 409
        : 422;
    return Response.json(updated, { status });
  }
  await database.batch([
    upsertStore(database, account.id, updated.assortment, now),
    auditUpdate(database, {
      accountId: account.id,
      entityId: productKey,
      entityLabel: text(updated.product.name, "Складская позиция", 240),
      before: previousProduct,
      after: updated.product,
      actorName,
      actorRole: account.role,
      reason: "Изменение карточки складского товара",
      createdAt: now,
    }),
  ]);
  return Response.json({
    ok: true,
    assortment: updated.assortment,
    product: updated.product,
    linkedRecipes: updated.linkedRecipes,
  });
}
