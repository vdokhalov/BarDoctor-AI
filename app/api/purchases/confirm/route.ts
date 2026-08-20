import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { closedMonthsFromStore } from "../../../../lib/bardoctor/data-trust";
import {
  EXPENSE_STORE_KEY,
  findPurchaseExpense,
  migratePurchaseLedger,
  normalizePurchaseDocument,
  purchaseIdempotencyKey,
  purchaseAffectsInventory,
  PURCHASE_STORE_KEY,
  SUPPLIER_STORE_KEY,
  withPurchasePaymentSummary,
} from "../../../../lib/bardoctor/purchases";
import {
  applyPurchaseToInventory,
  ASSORTMENT_STORE_KEY,
  inventoryProductKey,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";

const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

type StoreRow = { store_key: string; data_json: string };

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

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function supplierName(value: string): string {
  return value.trim().slice(0, 180) || "Новый поставщик";
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
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

function audit(
  database: D1Database,
  input: {
    accountId: number;
    storeKey: string;
    entityId: string;
    entityLabel: string;
    monthKey: string | null;
    after: unknown;
    actorName: string;
    actorRole: string;
    reason: string;
    createdAt: string;
  },
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, 'create', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.accountId,
    input.storeKey,
    input.entityId,
    input.entityLabel,
    input.monthKey,
    JSON.stringify(input.after),
    JSON.stringify(Object.keys(record(input.after) ?? {})),
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
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права подтверждать закупки" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 400_000) {
    return Response.json({ ok: false, error: "В документе слишком много данных" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = record(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return Response.json({ ok: false, error: "Некорректный документ" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const requestedDocument = record(body.document) ?? {};
  const requestedIdempotencyKey = text(
    body.idempotencyKey ?? request.headers.get("idempotency-key"),
    "",
    240,
  );
  const hasStableIdentity = Boolean(
    text(requestedDocument.id, "", 100)
    || requestedIdempotencyKey
    || (text(requestedDocument.externalSystem, "", 80)
      && text(requestedDocument.externalId, "", 180))
    || text(requestedDocument.sourceFileId, "", 80)
    || (Array.isArray(requestedDocument.sourceFileIds)
      && requestedDocument.sourceFileIds.some((value) => text(value, "", 80))),
  );
  if (!hasStableIdentity) {
    return Response.json(
      {
        ok: false,
        code: "IDEMPOTENCY_KEY_REQUIRED",
        error: "Передайте идентификатор документа или Idempotency-Key, чтобы повторный запрос не создал дубль.",
      },
      { status: 422 },
    );
  }
  const document = normalizePurchaseDocument(body.document, crypto.randomUUID());
  if (!document.items.length && document.documentType !== "price_list") {
    return Response.json(
      { ok: false, error: "Добавьте хотя бы одну позицию перед сохранением" },
      { status: 422 },
    );
  }
  if (document.documentType !== "price_list" && document.total <= 0) {
    return Response.json(
      { ok: false, error: "Укажите итоговую сумму закупки" },
      { status: 422 },
    );
  }
  const idempotencyKey = purchaseIdempotencyKey({
    document,
    venueId: account.venueId,
    requestedKey: requestedIdempotencyKey,
  });

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

  const duplicateById = documents.find((item) => {
    const value = record(item);
    return value?.id === document.id || value?.idempotencyKey === idempotencyKey;
  });
  if (duplicateById) {
    return Response.json({
      ok: true,
      duplicate: true,
      document: duplicateById,
      payment: findPurchaseExpense(expenses, document.id),
      documents,
      suppliers,
      expenses,
      assortment,
      stockMovements,
    });
  }

  const requestedSourceFileIds = new Set(
    (document.sourceFileIds ?? [document.sourceFileId])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  );
  if (requestedSourceFileIds.size > 0) {
    const duplicateBySourceFile = documents.find((item) => {
      const value = record(item);
      if (!value || !["confirmed", "cancelled"].includes(String(value.status ?? ""))) {
        return false;
      }
      const existingSourceFileIds = (Array.isArray(value.sourceFileIds)
        ? value.sourceFileIds
        : value.sourceFileId
          ? [value.sourceFileId]
          : [])
        .map((sourceFileId) => String(sourceFileId ?? "").trim())
        .filter(Boolean);
      return existingSourceFileIds.some((sourceFileId) => requestedSourceFileIds.has(sourceFileId));
    });
    if (duplicateBySourceFile) {
      const duplicateId = String(record(duplicateBySourceFile)?.id ?? "");
      return Response.json({
        ok: true,
        duplicate: true,
        duplicateReason: "source_file",
        document: duplicateBySourceFile,
        payment: findPurchaseExpense(expenses, duplicateId),
        documents,
        suppliers,
        expenses,
        assortment,
        stockMovements,
      });
    }
  }

  if (document.documentNumber) {
    const requestedNumber = document.documentNumber.trim().toLocaleLowerCase("ru");
    const requestedSupplier = supplierName(document.supplierName).toLocaleLowerCase("ru");
    const duplicate = documents.find((item) => {
      const value = record(item);
      return value
        && ["confirmed", "cancelled"].includes(String(value.status ?? ""))
        && String(value.documentType ?? "") === document.documentType
        && String(value.date ?? "") === document.date
        && String(value.documentNumber ?? "").trim().toLocaleLowerCase("ru") === requestedNumber
        && String(value.supplierName ?? "").trim().toLocaleLowerCase("ru") === requestedSupplier;
    });
    if (duplicate) {
      const duplicateId = String(record(duplicate)?.id ?? "");
      return Response.json({
        ok: true,
        duplicate: true,
        document: duplicate,
        payment: findPurchaseExpense(expenses, duplicateId),
        documents,
        suppliers,
        expenses,
        assortment,
        stockMovements,
      });
    }
  }

  if (document.documentType !== "price_list") {
    const closed = closedMonthsFromStore(
      json(stores.get(MONTH_CLOSING_STORE_KEY), null),
    );
    const monthKey = document.date.slice(0, 7);
    if (closed.has(monthKey)) {
      return Response.json(
        {
          ok: false,
          code: "MONTH_LOCKED",
          monthKey,
          error: `Месяц ${monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
        },
        { status: 423 },
      );
    }
  }

  let supplier = document.supplierId
    ? suppliers.map(record).find((item) => item?.id === document.supplierId) ?? null
    : null;
  if (!supplier) {
    const requestedName = supplierName(document.supplierName).toLocaleLowerCase("ru");
    supplier = suppliers.map(record).find((item) =>
      String(item?.name ?? "").trim().toLocaleLowerCase("ru") === requestedName
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
      source: document.documentType === "receipt" ? "receipt" : "document",
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

  const confirmedDocument = withPurchasePaymentSummary({
    ...document,
    internalId: document.id,
    venueId: account.venueId,
    idempotencyKey,
    syncStatus: document.externalId ? "success" as const : document.syncStatus,
    items: document.items.map((item) => ({
      ...item,
      purchaseProductKey: inventoryProductKey(item),
    })),
    supplierId: String(supplier.id),
    supplierName: String(supplier.name),
    status: "confirmed",
    confirmedAt: now,
    createdAt: document.createdAt ?? now,
    updatedAt: now,
    createdByAccountId: document.createdByAccountId ?? account.actorAccountId,
    updatedByAccountId: account.actorAccountId,
  }, expenses);
  const inventory = purchaseAffectsInventory(confirmedDocument)
    ? applyPurchaseToInventory({ assortment, document: confirmedDocument, now })
    : null;
  if (inventory?.summary.unresolvedLines.length) {
    const details = inventory.summary.unresolvedLines
      .slice(0, 6)
      .map((item) => `${item.name}: ${item.reason}`)
      .join("; ");
    return Response.json(
      {
        ok: false,
        code: "INVENTORY_REVIEW_REQUIRED",
        error: `Исправьте количество или фасовку перед оприходованием. ${details}`,
        unresolvedLines: inventory.summary.unresolvedLines,
      },
      { status: 422 },
    );
  }
  const nextAssortment = inventory?.assortment ?? assortment;
  const nextStockMovements = inventory
    ? [...inventory.movements, ...stockMovements].slice(0, 20_000)
    : stockMovements;
  documents.unshift(confirmedDocument);

  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.appEmail;
  const statements = [
    upsertStore(database, account.id, PURCHASE_STORE_KEY, documents, now),
    upsertStore(database, account.id, SUPPLIER_STORE_KEY, suppliers, now),
    audit(database, {
      accountId: account.id,
      storeKey: PURCHASE_STORE_KEY,
      entityId: document.id,
      entityLabel: `${document.documentType}: ${supplier.name}`,
      monthKey: document.date.slice(0, 7),
      after: confirmedDocument,
      actorName,
      actorRole: account.role,
      reason: document.sourceLabel
        ? `Закупочный документ получен: ${document.sourceLabel}`
        : "Закупочный документ подтверждён после распознавания",
      createdAt: now,
    }),
  ];
  if (ledgerMigration.changed) {
    statements.push(
      upsertStore(database, account.id, EXPENSE_STORE_KEY, expenses, now),
      audit(database, {
        accountId: account.id,
        storeKey: EXPENSE_STORE_KEY,
        entityId: `purchase-ledger-v2:${account.venueId}`,
        entityLabel: "Миграция оплат закупок",
        monthKey: null,
        after: ledgerMigration.summary,
        actorName,
        actorRole: account.role,
        reason: "Старые связанные расходы преобразованы в оплаты без удаления данных",
        createdAt: now,
      }),
    );
  }
  if (inventory) {
    statements.push(
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, nextAssortment, now),
      upsertStore(database, account.id, STOCK_MOVEMENT_STORE_KEY, nextStockMovements, now),
      audit(database, {
        accountId: account.id,
        storeKey: STOCK_MOVEMENT_STORE_KEY,
        entityId: document.id,
        entityLabel: `Приход: ${supplier.name}`,
        monthKey: document.date.slice(0, 7),
        after: {
          sourceDocumentId: document.id,
          postedLines: inventory.summary.postedLines,
          movementIds: inventory.movements.map((movement) => movement.id),
        },
        actorName,
        actorRole: account.role,
        reason: "Позиции закупочного документа поставлены на приход",
        createdAt: now,
      }),
    );
  }
  await database.batch(statements);

  return Response.json({
    ok: true,
    document: confirmedDocument,
    supplier,
    payment: null,
    documents,
    suppliers,
    expenses,
    assortment: nextAssortment,
    stockMovements: nextStockMovements,
    inventorySummary: inventory?.summary ?? null,
  }, { status: 201 });
}
