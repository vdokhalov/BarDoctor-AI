import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  EXPENSE_STORE_KEY,
  hasMeaningfulPurchaseItems,
  isPurchasePayment,
  migratePurchaseLedger,
  normalizePurchaseDocument,
  purchaseAffectsInventory,
  purchasePaymentSummary,
  PURCHASE_STORE_KEY,
  SUPPLIER_STORE_KEY,
  withPurchasePaymentSummary,
} from "../../../../lib/bardoctor/purchases";
import {
  applyPurchaseToInventory,
  ASSORTMENT_STORE_KEY,
  inventoryProductKey,
  revisePurchaseInInventory,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

type StoreRow = { store_key: string; data_json: string };
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function array(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function json(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function supplierName(value: string): string {
  return value.trim().slice(0, 180) || "Новый поставщик";
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

function auditUpdate(
  database: D1Database,
  input: {
    accountId: number;
    storeKey: string;
    entityId: string;
    entityLabel: string;
    monthKey: string | null;
    before: unknown;
    after: unknown;
    actorName: string;
    actorRole: string;
    reason: string;
    createdAt: string;
  },
): D1PreparedStatement {
  const before = record(input.before) ?? {};
  const after = record(input.after) ?? {};
  const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
  return database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, 'update', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    input.storeKey,
    input.entityId,
    input.entityLabel,
    input.monthKey,
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
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права исправлять закупочные документы" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 400_000) {
    return Response.json({ ok: false, error: "В документе слишком много данных" }, { status: 413 });
  }
  let body: JsonRecord;
  try {
    body = record(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return Response.json({ ok: false, error: "Некорректный документ" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const updateReason = typeof body.updateReason === "string" && body.updateReason.trim()
    ? body.updateReason.trim().slice(0, 240)
    : "Подтверждённый закупочный документ исправлен пользователем";
  const document = normalizePurchaseDocument(body.document, "");
  if (!document.id) {
    return Response.json({ ok: false, error: "Не найден идентификатор накладной" }, { status: 422 });
  }
  if (document.documentType !== "price_list" && !hasMeaningfulPurchaseItems(body.document)) {
    return Response.json(
      { ok: false, error: "Заполните название, количество и стоимость каждой позиции" },
      { status: 422 },
    );
  }
  if (!document.items.length && document.documentType !== "price_list") {
    return Response.json({ ok: false, error: "Добавьте хотя бы одну позицию" }, { status: 422 });
  }
  if (document.documentType !== "price_list" && document.total <= 0) {
    return Response.json({ ok: false, error: "Укажите итоговую сумму закупки" }, { status: 422 });
  }
  if (document.documentType !== "price_list" && !hasPermission(account, "finance.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права изменять проведённую закупочную накладную" },
      { status: 403 },
    );
  }

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ?
      AND store_key IN (?, ?, ?, ?, ?, ?)
  `).bind(
    account.id,
    PURCHASE_STORE_KEY,
    SUPPLIER_STORE_KEY,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
  ).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  let documents = array(stores.get(PURCHASE_STORE_KEY));
  const suppliers = array(stores.get(SUPPLIER_STORE_KEY));
  let expenses = array(stores.get(EXPENSE_STORE_KEY));
  const assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const ledgerMigration = migratePurchaseLedger({
    documents,
    expenses,
    venueId: account.venueId,
    now,
  });
  documents = ledgerMigration.documents;
  expenses = ledgerMigration.expenses;
  const documentIndex = documents.findIndex((value) => record(value)?.id === document.id);
  const previousDocument = documentIndex >= 0 ? record(documents[documentIndex]) : null;
  if (!previousDocument || !["confirmed", "cancelled"].includes(String(previousDocument.status))) {
    return Response.json({ ok: false, error: "Закупочная накладная не найдена" }, { status: 404 });
  }
  if (previousDocument.venueId != null && Number(previousDocument.venueId) !== account.venueId) {
    return Response.json({ ok: false, error: "Подтверждённая накладная не найдена" }, { status: 404 });
  }
  if (previousDocument.documentType !== document.documentType) {
    return Response.json(
      { ok: false, error: "Тип подтверждённого документа менять нельзя" },
      { status: 409 },
    );
  }

  const linkedPayments = expenses.filter((value) => isPurchasePayment(value, document.id));
  const closed = closedMonthsFromStore(json(stores.get(MONTH_CLOSING_STORE_KEY), null));
  const affectedMonths = new Set([
    String(previousDocument.date ?? "").slice(0, 7),
    document.date.slice(0, 7),
    ...linkedPayments.map((payment) => String(record(payment)?.date ?? "").slice(0, 7)),
  ]);
  const lockedMonth = [...affectedMonths].find((monthKey) => monthKey && closed.has(monthKey));
  if (lockedMonth) {
    return Response.json(
      {
        ok: false,
        code: "MONTH_LOCKED",
        monthKey: lockedMonth,
        error: `Месяц ${lockedMonth} закрыт. Сначала откройте его в мастере закрытия месяца.`,
      },
      { status: 423 },
    );
  }

  let supplier = document.supplierId
    ? suppliers.map(record).find((value) => value?.id === document.supplierId) ?? null
    : null;
  if (!supplier) {
    const requested = supplierName(document.supplierName).toLocaleLowerCase("ru");
    supplier = suppliers.map(record).find((value) =>
      String(value?.name ?? "").trim().toLocaleLowerCase("ru") === requested
    ) ?? null;
  }
  if (!supplier) {
    supplier = {
      id: document.supplierId || crypto.randomUUID(),
      name: supplierName(document.supplierName),
      type: document.supplierType,
      categories: [...new Set(document.items.map((item) => item.category))],
      currency: document.currency,
      status: "active",
      source: "document",
      createdAt: now,
      updatedAt: now,
    };
    suppliers.unshift(supplier);
  } else {
    supplier.name = supplierName(document.supplierName || String(supplier.name ?? ""));
    supplier.type = document.supplierType;
    supplier.currency = document.currency;
    supplier.categories = [...new Set([
      ...(Array.isArray(supplier.categories) ? supplier.categories.map(String) : []),
      ...document.items.map((item) => item.category),
    ])];
    supplier.updatedAt = now;
  }

  const updatedDocument = withPurchasePaymentSummary({
    ...previousDocument,
    ...document,
    internalId: document.id,
    venueId: account.venueId,
    items: document.items.map((item) => ({
      ...item,
      purchaseProductKey: inventoryProductKey(item),
    })),
    supplierId: String(supplier.id),
    supplierName: String(supplier.name),
    status: previousDocument.status === "cancelled" ? "cancelled" : "confirmed",
    confirmedAt: String(previousDocument.confirmedAt ?? now),
    createdAt: String(previousDocument.createdAt ?? now),
    updatedAt: now,
    updatedByAccountId: account.actorAccountId,
    cancelledAt: previousDocument.cancelledAt,
    cancellationReason: previousDocument.cancellationReason,
    cancelledByAccountId: previousDocument.cancelledByAccountId,
  }, expenses);
  const paymentState = purchasePaymentSummary(updatedDocument, expenses);
  if (paymentState.overpaidAmount > 0) {
    return Response.json(
      {
        ok: false,
        code: "PURCHASE_TOTAL_BELOW_PAID",
        error: `Новая сумма меньше уже оплаченной на ${paymentState.overpaidAmount.toFixed(2)}. Сначала скорректируйте платёж.`,
      },
      { status: 409 },
    );
  }

  const previousAffectsInventory = purchaseAffectsInventory(previousDocument);
  const nextAffectsInventory = purchaseAffectsInventory(updatedDocument);
  const inventory = previousDocument.status === "cancelled"
    ? {
      ok: true as const,
      assortment,
      movements: stockMovements,
      summary: {
        postedLines: 0,
        movementCount: 0,
        linkedIngredients: 0,
        unresolvedLines: [],
        currencyConflicts: 0,
      },
    }
    : !previousAffectsInventory && !nextAffectsInventory
    ? (() => {
      const nomenclatureOnly = applyPurchaseToInventory({
        assortment,
        document: updatedDocument,
        now,
      });
      return {
        ok: true as const,
        assortment: nomenclatureOnly.assortment,
        movements: stockMovements,
        summary: nomenclatureOnly.summary,
      };
    })()
    : revisePurchaseInInventory({
      assortment,
      previousDocument: previousAffectsInventory
        ? previousDocument
        : { ...previousDocument, items: [] },
      nextDocument: nextAffectsInventory
        ? updatedDocument
        : { ...updatedDocument, items: [] },
      stockMovements,
      now,
    });
  if (!inventory.ok) {
    return Response.json(
      {
        ok: false,
        code: inventory.code,
        error: inventory.error,
        unresolvedLines: inventory.unresolvedLines,
      },
      { status: inventory.code === "INVENTORY_REVIEW_REQUIRED" ? 422 : 409 },
    );
  }

  documents[documentIndex] = updatedDocument;
  const payments = linkedPayments;

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  const statements = [
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    upsertStore(database, account.id, SUPPLIER_STORE_KEY, suppliers, now),
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, inventory.assortment, now),
    upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, inventory.movements, now),
    auditUpdate(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      entityId: document.id,
      entityLabel: `${document.documentType}: ${supplier.name}`,
      monthKey: document.date.slice(0, 7),
      before: previousDocument,
      after: updatedDocument,
      actorName,
      actorRole: account.role,
      reason: updateReason,
      createdAt: now,
    }),
  ];
  if (ledgerMigration.changed) {
    statements.push(
      upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
      auditUpdate(database, {
        accountId: account.id,
        storeKey: EXPENSE_STORE_KEY,
        entityId: `purchase-ledger-v2:${account.venueId}`,
        entityLabel: "Миграция оплат закупок",
        monthKey: null,
        before: null,
        after: ledgerMigration.summary,
        actorName,
        actorRole: account.role,
        reason: "Старые связанные расходы преобразованы в оплаты без удаления данных",
        createdAt: now,
      }),
    );
  }
  await database.batch(statements);

  return Response.json({
    ok: true,
    document: updatedDocument,
    payments,
    documents,
    suppliers,
    expenses,
    assortment: inventory.assortment,
    stockMovements: inventory.movements,
    inventorySummary: inventory.summary,
  });
}
