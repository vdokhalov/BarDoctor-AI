import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  applyInventoryCount,
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";

const INVENTORY_SNAPSHOT_STORE_KEY = "bd_inventory_snapshots";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

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

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function upsertStore(
  database: D1Database,
  accountId: number,
  key: string,
  value: unknown,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), updatedAt);
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права проводить инвентаризацию" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 1_200_000) {
    return Response.json({ ok: false, error: "В инвентаризации слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректная инвентаризация" }, { status: 400 });
  }
  const requested = record(body.snapshot);
  const requestedItems = Array.isArray(requested.items) ? requested.items : [];
  if (!requestedItems.length) {
    return Response.json(
      { ok: false, error: "Укажите фактическое количество хотя бы одной складской позиции" },
      { status: 422 },
    );
  }
  if (requestedItems.length > 2_000) {
    return Response.json({ ok: false, error: "За один раз можно пересчитать до 2000 позиций" }, { status: 413 });
  }

  const now = new Date().toISOString();
  const id = text(requested.id, crypto.randomUUID(), 100);
  const date = text(requested.date, now.slice(0, 10), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, error: "Укажите дату инвентаризации" }, { status: 422 });
  }

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?)
  `).bind(
    account.id,
    INVENTORY_SNAPSHOT_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const snapshots = array(stores.get(INVENTORY_SNAPSHOT_STORE_KEY));
  let assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  let movements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const closedMonths = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY), null));
  const monthKey = date.slice(0, 7);
  if (closedMonths.has(monthKey)) {
    return Response.json({
      ok: false,
      code: "MONTH_LOCKED",
      monthKey,
      error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
    }, { status: 423 });
  }

  const existingIndex = snapshots.findIndex((value) => text(record(value).id, "", 100) === id);
  const existing = existingIndex >= 0 ? record(snapshots[existingIndex]) : null;
  const existingMonthKey = existing ? text(existing.date, "", 10).slice(0, 7) : "";
  if (existingMonthKey && closedMonths.has(existingMonthKey)) {
    return Response.json({
      ok: false,
      code: "MONTH_LOCKED",
      monthKey: existingMonthKey,
      error: `Месяц ${existingMonthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
    }, { status: 423 });
  }
  if (existing && !Array.isArray(existing.items)) {
    return Response.json({
      ok: false,
      code: "LEGACY_SNAPSHOT",
      error: "Старая запись содержит только денежные итоги. Создайте новую предметную инвентаризацию.",
    }, { status: 409 });
  }

  if (existing) {
    const existingUpdatedAt = text(existing.updatedAt ?? existing.createdAt, "", 40);
    const affectedKeys = new Set(
      (Array.isArray(existing.items) ? existing.items : [])
        .map((value) => text(record(value).productKey, "", 300))
        .filter(Boolean),
    );
    const laterMovement = movements.map(record).find((movement) =>
      text(movement.sourceDocumentId, "", 100) !== id
      && affectedKeys.has(text(movement.productKey, "", 300))
      && (
        Boolean(existingUpdatedAt && text(movement.createdAt, "", 40) > existingUpdatedAt)
        || Boolean(!text(movement.createdAt, "", 40) && text(movement.date, "", 10) >= text(existing.date, "", 10))
      )
    );
    if (laterMovement) {
      return Response.json({
        ok: false,
        code: "INVENTORY_HAS_LATER_MOVEMENTS",
        error: "После этой инвентаризации уже были движения товара. Создайте корректирующую инвентаризацию текущей датой.",
      }, { status: 409 });
    }

    const root = record(assortment);
    const balances = (Array.isArray(root.stockBalances) ? root.stockBalances : []).map(record);
    const byKey = new Map(balances.map((balance) => [text(balance.productKey ?? balance.key, "", 300), balance]));
    for (const movement of movements.map(record).filter((movement) =>
      text(movement.type, "", 40) === "inventory_adjustment"
      && text(movement.sourceDocumentId, "", 100) === id
    )) {
      const balance = byKey.get(text(movement.productKey, "", 300));
      if (!balance) continue;
      const restored = number(balance.current) - number(movement.amount);
      const averageCost = Math.max(0, number(balance.averageUnitCost));
      balance.current = Math.round(restored * 1000) / 1000;
      balance.inventoryValue = Math.round(Math.max(0, restored) * averageCost * 100) / 100;
      balance.updatedAt = now;
    }
    root.stockBalances = balances;
    root.updatedAt = now;
    assortment = root;
    movements = movements.filter((value) => {
      const movement = record(value);
      return !(
        text(movement.type, "", 40) === "inventory_adjustment"
        && text(movement.sourceDocumentId, "", 100) === id
      );
    });
  }

  const source = ["manual", "scan", "import"].includes(text(requested.source, "manual", 20))
    ? text(requested.source, "manual", 20)
    : "manual";
  const inventory = applyInventoryCount({
    assortment,
    snapshot: { id, date, items: requestedItems },
    now,
  });
  if (inventory.summary.unresolvedLines.length) {
    return Response.json({
      ok: false,
      code: "INVENTORY_REVIEW_REQUIRED",
      error: "Проверьте позиции и фактические количества перед сохранением.",
      unresolvedLines: inventory.summary.unresolvedLines,
    }, { status: 422 });
  }

  const snapshot = {
    ...(existing ?? {}),
    id,
    internalId: id,
    venueId: account.venueId,
    date,
    source,
    sourceLabel: source === "scan"
      ? "Сканирование инвентаризационной ведомости"
      : source === "import"
        ? "Импорт инвентаризационной ведомости"
        : "Вручную",
    status: "confirmed",
    items: inventory.items,
    sections: inventory.sections,
    total: inventory.summary.actualValue,
    expectedTotal: inventory.summary.expectedValue,
    differenceTotal: inventory.summary.differenceValue,
    note: text(requested.note, "", 1_000) || undefined,
    createdAt: text(existing?.createdAt, now, 40),
    updatedAt: now,
  };
  if (existingIndex >= 0) snapshots[existingIndex] = snapshot;
  else snapshots.unshift(snapshot);
  const nextMovements = [...inventory.movements, ...movements].slice(0, 20_000);
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  const action = existing ? "update" : "create";
  await database.batch([
    upsertStore(database, account.id, INVENTORY_SNAPSHOT_STORE_KEY, snapshots, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, inventory.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, nextMovements, now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      INVENTORY_SNAPSHOT_STORE_KEY,
      action,
      id,
      `Инвентаризация: ${date}`,
      monthKey,
      existing ? JSON.stringify(existing) : null,
      JSON.stringify(snapshot),
      JSON.stringify(["items", "sections", "total", "differenceTotal"]),
      actorName,
      account.role,
      `Фактический остаток подтверждён; скорректировано позиций: ${inventory.summary.changedLines}`,
      now,
    ),
  ]);

  return Response.json({
    ok: true,
    snapshot,
    snapshots,
    assortment: inventory.assortment,
    stockMovements: nextMovements,
    summary: inventory.summary,
  }, { status: existing ? 200 : 201 });
}
