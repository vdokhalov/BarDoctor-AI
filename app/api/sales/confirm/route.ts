import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  applySalesToInventory,
  ASSORTMENT_STORE_KEY,
  SALES_DOCUMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";
import { normalizeSalesDocument } from "../../../../lib/bardoctor/sales";
import {
  reconcileSalesRevenue,
  REVENUE_STORE_KEY,
} from "../../../../lib/bardoctor/sales-revenue";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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
  if (!hasPermission(account, "shifts.manage") || !hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права проводить продажи по складу" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 700_000) {
    return Response.json({ ok: false, error: "В отчёте слишком много данных" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = record(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return Response.json({ ok: false, error: "Некорректный отчёт" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const document = normalizeSalesDocument(body.document, crypto.randomUUID());
  if (!document.items.length) {
    return Response.json({ ok: false, error: "В отчёте нет проданных позиций" }, { status: 422 });
  }

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?, ?)
  `).bind(
    account.id,
    SALES_DOCUMENT_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    REVENUE_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const documents = array(stores.get(SALES_DOCUMENT_STORE_KEY));
  const assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const revenues = array(stores.get(REVENUE_STORE_KEY));

  const duplicateById = documents.find((value) => record(value)?.id === document.id);
  if (duplicateById) {
    return Response.json({
      ok: true,
      duplicate: true,
      document: duplicateById,
      documents,
      assortment,
      stockMovements,
    });
  }
  if (document.reportNumber) {
    const reportNumber = document.reportNumber.toLocaleLowerCase("ru");
    const sourceSystem = document.sourceSystem.toLocaleLowerCase("ru");
    const duplicate = documents.find((value) => {
      const item = record(value);
      return item
        && String(item.status ?? "") === "confirmed"
        && String(item.date ?? "") === document.date
        && String(item.reportNumber ?? "").toLocaleLowerCase("ru") === reportNumber
        && String(item.sourceSystem ?? "").toLocaleLowerCase("ru") === sourceSystem;
    });
    if (duplicate) {
      return Response.json({
        ok: true,
        duplicate: true,
        document: duplicate,
        documents,
        assortment,
        stockMovements,
      });
    }
  }

  const closed = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY), null));
  const monthKey = document.date.slice(0, 7);
  if (closed.has(monthKey)) {
    return Response.json({
      ok: false,
      code: "MONTH_LOCKED",
      monthKey,
      error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
    }, { status: 423 });
  }

  const confirmedDocument = {
    ...document,
    internalId: document.id,
    syncStatus: document.externalId ? "success" as const : document.syncStatus,
    status: "confirmed" as const,
    confirmedAt: now,
    createdAt: document.createdAt ?? now,
    updatedAt: now,
  };
  const inventory = applySalesToInventory({ assortment, salesDocument: confirmedDocument, now });
  if (inventory.summary.unresolvedLines.length) {
    return Response.json({
      ok: false,
      code: "SALES_REVIEW_REQUIRED",
      error: "Сопоставьте все продажи с меню и подтвердите техкарты перед списанием.",
      unresolvedLines: inventory.summary.unresolvedLines,
    }, { status: 422 });
  }
  const revenue = reconcileSalesRevenue({
    revenues,
    salesDocuments: documents,
    document: confirmedDocument,
    now,
  });
  if (!revenue.ok) {
    return Response.json({
      ok: false,
      code: revenue.code,
      error: revenue.error,
    }, { status: 409 });
  }

  documents.unshift(confirmedDocument);
  const nextMovements = [...inventory.movements, ...stockMovements].slice(0, 20_000);
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  await database.batch([
    upsertStore(database, account.id, SALES_DOCUMENT_STORE_KEY, documents, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, inventory.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, nextMovements, now),
    upsertStore(database, account.id, REVENUE_STORE_KEY, revenue.revenues, now),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, 'create', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      SALES_DOCUMENT_STORE_KEY,
      document.id,
      `Отчёт продаж: ${document.date}`,
      monthKey,
      JSON.stringify(confirmedDocument),
      JSON.stringify(Object.keys(confirmedDocument)),
      actorName,
      account.role,
      document.sourceLabel
        ? `Продажи получены: ${document.sourceLabel}; склад списан по подтверждённым техкартам`
        : "Продажи импортированы и списаны по подтверждённым техкартам",
      now,
    ),
    database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      account.id,
      REVENUE_STORE_KEY,
      revenue.action,
      String(revenue.revenueRecord.id),
      `Выручка по POS: ${document.date}`,
      monthKey,
      revenue.before ? JSON.stringify(revenue.before) : null,
      JSON.stringify(revenue.revenueRecord),
      JSON.stringify(["revenue", "receipts", "salesDocumentIds", "salesSourceSystems"]),
      actorName,
      account.role,
      "Выручка синхронизирована с подтверждёнными отчётами продаж без отдельной дублирующей смены",
      now,
    ),
  ]);

  return Response.json({
    ok: true,
    document: confirmedDocument,
    documents,
    assortment: inventory.assortment,
    stockMovements: nextMovements,
    revenues: revenue.revenues,
    revenueRecord: revenue.revenueRecord,
    inventorySummary: inventory.summary,
  }, { status: 201 });
}
