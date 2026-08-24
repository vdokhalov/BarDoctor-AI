import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  createInventoryCountDocument,
  deleteInventoryCountDocument,
  INVENTORY_COUNT_STORE_KEY,
  type InventoryCountDocument,
  type InventoryCountScope,
  inventoryCountDocumentScope,
  inventoryCountConflicts,
  inventoryCountLineDifference,
  inventoryCountScopes,
  inventoryCountSummary,
  nextInventoryCountNumber,
  renderInventoryCountPrintSheet,
  resolveInventoryCountScope,
  updateInventoryCountDocument,
} from "../../../../lib/bardoctor/inventory-counts";
import {
  applyInventoryCount,
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";
const MAX_BODY_BYTES = 1_200_000;

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

function isDocument(value: unknown): value is InventoryCountDocument {
  const item = record(value);
  return Boolean(text(item.id, "", 100) && Array.isArray(item.items));
}

function isCompleted(document: InventoryCountDocument): boolean {
  return document.status === "completed" || String(document.status) === "confirmed";
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

function actorName(account: { firstName: string; lastName: string | null; appEmail: string }): string {
  return [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
}

function auditStatement(input: {
  database: D1Database;
  accountId: number;
  action: string;
  document: InventoryCountDocument;
  before?: unknown;
  actorName: string;
  actorRole: string;
  reason: string;
  now: string;
}): D1PreparedStatement {
  return input.database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    INVENTORY_COUNT_STORE_KEY,
    input.action,
    input.document.id,
    `Инвентаризация № ${input.document.number}`,
    input.document.date.slice(0, 7),
    input.before == null ? null : JSON.stringify(input.before),
    JSON.stringify(input.document),
    JSON.stringify(["status", "scope", "items", "summary", "adjustmentMovementIds"]),
    input.actorName,
    input.actorRole,
    input.reason,
    input.now,
  );
}

function inventoryLabel(document: InventoryCountDocument): string {
  const number = Number(document.number);
  if (Number.isInteger(number) && number > 0) return `Инвентаризация № ${number}`;
  return `Инвентаризация ${document.date || document.id.slice(-8)}`;
}

function deletionAuditStatement(input: {
  database: D1Database;
  accountId: number;
  venueId: number;
  document: InventoryCountDocument;
  actorName: string;
  actorRole: string;
  expectedInventoryJson: string;
  now: string;
}): D1PreparedStatement {
  return input.database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM domain_data
      WHERE account_id = ? AND store_key = ? AND data_json = ?
    )
  `).bind(
    input.accountId,
    INVENTORY_COUNT_STORE_KEY,
    "inventory.deleted",
    input.document.id,
    inventoryLabel(input.document),
    input.document.date?.slice(0, 7) || null,
    JSON.stringify(input.document),
    null,
    JSON.stringify(["inventory", "countItems"]),
    input.actorName,
    input.actorRole,
    `Удалена незавершённая инвентаризация; venue=${input.venueId}; status=${String(input.document.status || "legacy")}; склад не изменён`,
    input.now,
    input.accountId,
    INVENTORY_COUNT_STORE_KEY,
    input.expectedInventoryJson,
  );
}

function conditionalInventoryUpdateStatement(input: {
  database: D1Database;
  accountId: number;
  snapshots: unknown[];
  expectedInventoryJson: string;
  now: string;
}): D1PreparedStatement {
  return input.database.prepare(`
    UPDATE domain_data
    SET data_json = ?, updated_at = ?
    WHERE account_id = ? AND store_key = ? AND data_json = ?
  `).bind(
    JSON.stringify(input.snapshots),
    input.now,
    input.accountId,
    INVENTORY_COUNT_STORE_KEY,
    input.expectedInventoryJson,
  );
}

async function readStores(database: D1Database, accountId: number) {
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?)
  `).bind(
    accountId,
    INVENTORY_COUNT_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    snapshots: array(stores.get(INVENTORY_COUNT_STORE_KEY)),
    inventoryJson: stores.get(INVENTORY_COUNT_STORE_KEY),
    assortment: json(stores.get(ASSORTMENT_STORE_KEY), {}),
    assortmentExists: stores.has(ASSORTMENT_STORE_KEY),
    movements: array(stores.get(STOCK_MOVEMENT_STORE_KEY)),
    closedMonths: closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY), null)),
  };
}

function presentDocument(document: InventoryCountDocument) {
  return {
    ...document,
    scope: inventoryCountDocumentScope(document),
    summary: document.summary ?? inventoryCountSummary(document),
    items: document.items.map((line) => ({ ...line, ...inventoryCountLineDifference(line) })),
  };
}

function presentSnapshots(snapshots: unknown[]) {
  return snapshots.map((value) => isDocument(value) ? presentDocument(value) : value);
}

function venueName(restaurantJson: string | null): string {
  const profile = record(json(restaurantJson ?? undefined, {}));
  return text(profile.name ?? profile.venueName ?? profile.restaurantName, "Заведение", 180);
}

function inventoryReturnUrl(venueId: number, inventoryId?: string): string {
  return `/warehouse?venue=${encodeURIComponent(String(venueId))}&tab=counts${
    inventoryId ? `&inventory=${encodeURIComponent(inventoryId)}` : ""
  }`;
}

function inventoryPrintUnavailable(title: string, message: string, status = 404, destination = "/warehouse?tab=counts"): Response {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
  const safeDestination = destination.startsWith("/") && !destination.startsWith("//") ? destination : "/home";
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escape(title)} · BarDoctor</title><style>:root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171925;background:#f6f7fb}*{box-sizing:border-box}body{margin:0;min-height:100dvh}.bar{position:sticky;z-index:10;top:0;display:flex;min-height:60px;padding:calc(8px + env(safe-area-inset-top,0px)) 16px 8px;align-items:center;gap:12px;border-bottom:1px solid #e5e7ef;background:rgba(255,255,255,.96);backdrop-filter:blur(14px)}a{display:inline-flex;min-width:44px;min-height:44px;padding:0 14px;align-items:center;justify-content:center;border-radius:12px;color:#3936c9;font-weight:750;text-decoration:none}.card{width:min(560px,calc(100% - 32px));margin:clamp(44px,12vh,120px) auto;padding:28px;border:1px solid #e5e7ef;border-radius:22px;background:#fff;box-shadow:0 16px 50px rgba(20,24,45,.08)}h1{margin:0 0 10px;font-size:24px}p{margin:0 0 22px;color:#666b7c;line-height:1.5}</style></head><body><header class="bar"><a href="${escape(safeDestination)}">← Назад</a><strong>${escape(title)}</strong></header><main class="card"><h1>${escape(title)}</h1><p>${escape(message)}</p><a href="${escape(safeDestination)}">Перейти к инвентаризациям</a></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const printView = url.searchParams.get("format") === "print";
  const account = await authenticateRequest(request);
  if (!account) return printView
    ? inventoryPrintUnavailable("Сессия завершена", "Войдите снова, чтобы открыть печатную ведомость.", 401, "/login")
    : unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    if (printView) return inventoryPrintUnavailable("Нет доступа", "У вас нет права просматривать эту инвентаризацию.", 403, inventoryReturnUrl(account.venueId));
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права просматривать инвентаризации" },
      { status: 403 },
    );
  }
  const stores = await readStores(getD1(), account.id);
  const documents = stores.snapshots.filter(isDocument).filter((document) =>
    !document.venueId || Number(document.venueId) === account.venueId
  );
  const id = text(url.searchParams.get("id"), "", 100);
  if (id) {
    const document = documents.find((value) => value.id === id);
    if (!document) {
      if (printView) return inventoryPrintUnavailable("Инвентаризация не найдена", "Документ удалён, недоступен или относится к другому заведению.", 404, inventoryReturnUrl(account.venueId));
      return Response.json({ ok: false, code: "INVENTORY_NOT_FOUND", error: "Инвентаризация не найдена" }, { status: 404 });
    }
    if (printView) {
      if (document.status === "cancelled") {
        return inventoryPrintUnavailable("Печать недоступна", "Отменённую инвентаризацию нельзя печатать.", 409, inventoryReturnUrl(account.venueId, document.id));
      }
      return new Response(renderInventoryCountPrintSheet({
        document,
        venueName: venueName(account.restaurantJson),
        returnUrl: inventoryReturnUrl(account.venueId, document.id),
      }), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="inventory-${document.number}.html"`,
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }
    return Response.json(
      { ok: true, venueId: account.venueId, inventory: presentDocument(document) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return Response.json({
    ok: true,
    venueId: account.venueId,
    accountingCurrency: accountingCurrencyFromRestaurantJson(account.restaurantJson),
    scopes: inventoryCountScopes(stores.assortment),
    inventories: documents.map(presentDocument),
  }, { headers: { "Cache-Control": "private, no-store" } });
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
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: "В инвентаризации слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    return Response.json({ ok: false, error: "Некорректная инвентаризация" }, { status: 400 });
  }

  const database = getD1();
  const stores = await readStores(database, account.id);
  const snapshots = [...stores.snapshots];
  const requestedSnapshot = record(body.snapshot);
  let action = text(body.action, "", 30);
  const legacyFinalize = !action && Array.isArray(requestedSnapshot.items);
  if (!action) action = legacyFinalize ? "legacy_finalize" : "create";
  const now = new Date().toISOString();
  const name = actorName(account);
  const accountingCurrency = accountingCurrencyFromRestaurantJson(account.restaurantJson) ?? undefined;

  if (action === "create" || action === "legacy_finalize") {
    const requestedScope = record(body.scope);
    const scope = legacyFinalize
      ? { type: "all", label: "Весь активный склад" }
      : {
        type: text(requestedScope.type, "all", 30),
        id: text(requestedScope.id, "", 100) || undefined,
        label: text(requestedScope.label, "", 120),
      };
    const allowedScope = resolveInventoryCountScope(stores.assortment, scope as Pick<InventoryCountScope, "type" | "id">);
    if (!allowedScope) {
      return Response.json({ ok: false, code: "INVALID_SCOPE", error: "Выбранный охват недоступен для текущего заведения" }, { status: 422 });
    }
    let document = createInventoryCountDocument({
      assortment: stores.assortment,
      venueId: account.venueId,
      sequenceNumber: nextInventoryCountNumber(snapshots, account.venueId),
      scope: allowedScope as InventoryCountScope,
      accountingCurrency,
      creator: { accountId: account.actorAccountId, name, role: account.role },
      source: ["scan", "import"].includes(text(body.source ?? requestedSnapshot.source, "", 20))
        ? text(body.source ?? requestedSnapshot.source, "manual", 20) as "scan" | "import"
        : "manual",
      id: text(requestedSnapshot.id, "", 100) || undefined,
      date: text(body.date ?? requestedSnapshot.date, "", 10) || undefined,
      now,
    });
    const prefill = body.items ?? requestedSnapshot.items;
    if (Array.isArray(prefill)) {
      try {
        document = updateInventoryCountDocument({
          document,
          items: prefill,
          note: body.note ?? requestedSnapshot.note,
          now,
        });
      } catch (error) {
        return Response.json({ ok: false, error: error instanceof Error ? error.message : "Некорректный факт" }, { status: 422 });
      }
    }
    document = { ...document, summary: inventoryCountSummary(document) };
    if (!document.items.length) {
      return Response.json({ ok: false, code: "EMPTY_SCOPE", error: "В выбранном охвате нет активных складских позиций" }, { status: 422 });
    }
    if (document.items.length > 2_000) {
      return Response.json({ ok: false, error: "За один раз можно пересчитать до 2000 позиций" }, { status: 413 });
    }
    snapshots.unshift(document);
    await database.batch([
      upsertStore(database, account.id, INVENTORY_COUNT_STORE_KEY, snapshots, now),
      auditStatement({
        database,
        accountId: account.id,
        action: "create",
        document,
        actorName: name,
        actorRole: account.role,
        reason: `Создан snapshot инвентаризации; охват: ${document.scope.label}; склад не изменён`,
        now,
      }),
    ]);
    if (!legacyFinalize) {
      return Response.json({
        ok: true,
        venueId: account.venueId,
        inventory: presentDocument(document),
        snapshots: presentSnapshots(snapshots),
        stockChanged: false,
      }, { status: 201 });
    }
    body = { ...body, action: "finalize", id: document.id };
    action = "finalize";
  }

  const id = text(body.id ?? requestedSnapshot.id, "", 100);
  const index = snapshots.findIndex((value) => text(record(value).id, "", 100) === id);
  const existing = index >= 0 && isDocument(snapshots[index]) ? snapshots[index] : null;
  if (action === "delete") {
    const deletion = deleteInventoryCountDocument({
      snapshots,
      inventoryId: id,
      venueId: account.venueId,
      stockMovements: stores.movements,
    });
    if (!deletion.ok) {
      return Response.json({ ok: false, code: deletion.code, error: deletion.error }, {
        status: deletion.code === "INVENTORY_NOT_FOUND" ? 404 : 409,
      });
    }
    if (!deletion.deleted || !deletion.document) {
      return Response.json({
        ok: true,
        deleted: false,
        idempotent: true,
        venueId: account.venueId,
        snapshots: presentSnapshots(deletion.snapshots),
        stockChanged: false,
      });
    }
    const expectedInventoryJson = stores.inventoryJson;
    if (!expectedInventoryJson) {
      return Response.json({ ok: false, code: "INVENTORY_NOT_FOUND", error: "Инвентаризация текущего заведения не найдена" }, { status: 404 });
    }
    const deletionBatch = await database.batch([
      deletionAuditStatement({
        database,
        accountId: account.id,
        venueId: account.venueId,
        document: deletion.document,
        actorName: name,
        actorRole: account.role,
        expectedInventoryJson,
        now,
      }),
      conditionalInventoryUpdateStatement({
        database,
        accountId: account.id,
        snapshots: deletion.snapshots,
        expectedInventoryJson,
        now,
      }),
    ]);
    if (Number(deletionBatch[1]?.meta?.changes ?? 0) !== 1) {
      return Response.json({
        ok: false,
        code: "INVENTORY_CONCURRENT_MODIFICATION",
        error: "Инвентаризация изменилась в другой вкладке. Список обновлён — проверьте её актуальный статус.",
      }, { status: 409 });
    }
    return Response.json({
      ok: true,
      deleted: true,
      deletedInventoryId: deletion.document.id,
      venueId: account.venueId,
      snapshots: presentSnapshots(deletion.snapshots),
      stockChanged: false,
    });
  }
  if (!existing || (existing.venueId && existing.venueId !== account.venueId)) {
    return Response.json({ ok: false, code: "INVENTORY_NOT_FOUND", error: "Инвентаризация текущего заведения не найдена" }, { status: 404 });
  }
  if (isCompleted(existing) && action === "finalize") {
    return Response.json({
      ok: true,
      idempotent: true,
      venueId: account.venueId,
      inventory: presentDocument(existing),
      snapshots: presentSnapshots(snapshots),
      assortment: stores.assortment,
      stockMovements: stores.movements,
      stockChanged: false,
    });
  }
  if (isCompleted(existing) || existing.status === "cancelled") {
    return Response.json({ ok: false, code: "INVENTORY_READ_ONLY", error: "Завершённую или отменённую инвентаризацию нельзя изменять" }, { status: 409 });
  }

  if (["save", "review"].includes(action)) {
    let document: InventoryCountDocument;
    try {
      document = updateInventoryCountDocument({
        document: existing,
        items: body.items ?? requestedSnapshot.items,
        note: body.note ?? requestedSnapshot.note,
        status: action === "review" ? "review" : "counting",
        now,
      });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : "Некорректный факт" }, { status: 422 });
    }
    document = { ...document, summary: inventoryCountSummary(document) };
    snapshots[index] = document;
    await database.batch([
      upsertStore(database, account.id, INVENTORY_COUNT_STORE_KEY, snapshots, now),
      auditStatement({
        database,
        accountId: account.id,
        action: "update",
        document,
        before: existing,
        actorName: name,
        actorRole: account.role,
        reason: action === "review" ? "Инвентаризация переведена на проверку; склад не изменён" : "Черновик подсчёта сохранён; склад не изменён",
        now,
      }),
    ]);
    return Response.json({
      ok: true,
      venueId: account.venueId,
      inventory: presentDocument(document),
      snapshots: presentSnapshots(snapshots),
      stockChanged: false,
    });
  }

  if (action === "cancel") {
    const document: InventoryCountDocument = { ...existing, status: "cancelled", cancelledAt: now, updatedAt: now };
    snapshots[index] = document;
    await database.batch([
      upsertStore(database, account.id, INVENTORY_COUNT_STORE_KEY, snapshots, now),
      auditStatement({
        database,
        accountId: account.id,
        action: "cancel",
        document,
        before: existing,
        actorName: name,
        actorRole: account.role,
        reason: "Инвентаризация отменена без изменения складских остатков",
        now,
      }),
    ]);
    return Response.json({ ok: true, inventory: presentDocument(document), snapshots: presentSnapshots(snapshots), stockChanged: false });
  }

  if (action !== "finalize") {
    return Response.json({ ok: false, error: "Неизвестное действие инвентаризации" }, { status: 400 });
  }
  if (!stores.assortmentExists) {
    return Response.json({
      ok: false,
      code: "AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED",
      error: "Инвентаризация не проведена: authoritative номенклатура отсутствует. Требуется immutable export и отдельное разрешение на import/reconciliation.",
    }, { status: 409 });
  }
  const summary = inventoryCountSummary(existing);
  if (summary.uncountedLines > 0) {
    return Response.json({
      ok: false,
      code: "INVENTORY_INCOMPLETE",
      error: `Не посчитано: ${summary.uncountedLines} поз. Пустые значения не являются нулём.`,
      summary,
    }, { status: 422 });
  }
  const monthKey = existing.date.slice(0, 7);
  if (stores.closedMonths.has(monthKey)) {
    return Response.json({
      ok: false,
      code: "MONTH_LOCKED",
      monthKey,
      error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
    }, { status: 423 });
  }
  const conflicts = inventoryCountConflicts({ document: existing, assortment: stores.assortment });
  if (conflicts.length) {
    return Response.json({
      ok: false,
      code: "INVENTORY_STOCK_CHANGED",
      error: "После начала подсчёта склад изменился. Завершение заблокировано, чтобы не потерять покупки, продажи или списания.",
      conflicts: conflicts.slice(0, 100),
    }, { status: 409 });
  }

  const result = applyInventoryCount({
    assortment: stores.assortment,
    snapshot: {
      id: existing.id,
      date: existing.date,
      items: existing.items.map((item) => ({
        id: item.id,
        productKey: item.productKey,
        productName: item.productName,
        actual: item.actual,
        section: item.sectionName,
      })),
    },
    now,
  });
  if (result.summary.unresolvedLines.length) {
    return Response.json({
      ok: false,
      code: "INVENTORY_REVIEW_REQUIRED",
      error: "Проверьте позиции и единицы перед завершением.",
      unresolvedLines: result.summary.unresolvedLines,
    }, { status: 422 });
  }
  for (const movement of result.movements) {
    const line = existing.items.find((item) => item.productKey === movement.productKey);
    if (line?.valuationKnown === false) {
      delete movement.costAmount;
      Object.assign(movement, {
        valuationStatus: "unvalued",
        valuationReason: line.valuationReason ?? "Нет cost basis для денежной оценки",
      });
    }
  }
  const completed: InventoryCountDocument & JsonRecord = {
    ...existing,
    status: "completed",
    completedAt: now,
    updatedAt: now,
    summary,
    adjustmentMovementIds: result.movements.map((movement) => movement.id),
    createdAdjustments: result.movements.map((movement) => ({
      id: movement.id,
      productKey: movement.productKey,
      amount: movement.amount,
      unit: movement.unit,
      costAmount: movement.costAmount,
      currency: movement.currency,
    })),
    total: result.summary.actualValue,
    expectedTotal: result.summary.expectedValue,
    differenceTotal: summary.calculatedDifferenceValue,
  };
  snapshots[index] = completed;
  const nextMovements = [...result.movements, ...stores.movements].slice(0, 20_000);
  await database.batch([
    upsertStore(database, account.id, INVENTORY_COUNT_STORE_KEY, snapshots, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, nextMovements, now),
    auditStatement({
      database,
      accountId: account.id,
      action: "complete",
      document: completed,
      before: existing,
      actorName: name,
      actorRole: account.role,
      reason: `Инвентаризация завершена; создано корректировок: ${result.movements.length}`,
      now,
    }),
  ]);

  return Response.json({
    ok: true,
    venueId: account.venueId,
    inventory: presentDocument(completed),
    snapshots: presentSnapshots(snapshots),
    assortment: result.assortment,
    stockMovements: nextMovements,
    summary,
    stockChanged: result.movements.length > 0,
  });
}
