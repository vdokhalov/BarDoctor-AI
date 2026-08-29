import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLog, domainData } from "../../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { isAllowedStoreKey } from "../../../../lib/bardoctor/constants";
import {
  canReadStore,
  canWriteStore,
  closedMonthsFromStore,
  compareStoreData,
  mergeConcurrentStoreData,
  MONTH_LOCKED_STORE_KEYS,
} from "../../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  ASSORTMENT_STORE_KEY,
  STOCK_MOVEMENT_STORE_KEY,
} from "../../../../lib/bardoctor/inventory";
import { INVENTORY_SNAPSHOT_STORE_KEY } from "../../../../lib/bardoctor/authoritative-persistence";
import {
  EXPENSE_STORE_KEY,
  isPurchasePayment,
  PURCHASE_STOCK_CATEGORIES,
  PURCHASE_STORE_KEY,
} from "../../../../lib/bardoctor/purchases";
import {
  reconcileTechCards,
  validateTechCardVenueIsolation,
} from "../../../../lib/bardoctor/tech-card-reconciliation";
import {
  auditCanonicalNomenclature,
  enrichCanonicalSupplierSummary,
} from "../../../../lib/bardoctor/nomenclature-identity";
import {
  normalizeMenuItemSaleSizeRecord,
  validateMenuItemSaleSize,
} from "../../../../lib/bardoctor/menu-sale-size";
import { normalizeAssortmentMenuCurrencyUpdates } from "../../../../lib/bardoctor/assortment-currency";
import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";
import {
  normalizeVenueCurrencyArrayUpdates,
  VENUE_CURRENCY_ARRAY_STORE_KEYS,
} from "../../../../lib/bardoctor/venue-currency-policy";

type RouteContext = { params: Promise<{ key: string }> };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasPurchaseLink(value: unknown): boolean {
  const item = record(value);
  return isPurchasePayment(item)
    || Boolean(item.sourceDocumentId || item.purchaseId)
    || item.paymentKind === "supplier_payment";
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const { key } = await context.params;
  if (!isAllowedStoreKey(key)) {
    return Response.json({ ok: false, error: "Неизвестный ключ хранилища" }, { status: 400 });
  }
  if (!canReadStore(account, key)) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет доступа к этому разделу" },
      { status: 403 },
    );
  }
  const [row] = await getDb()
    .select()
    .from(domainData)
    .where(and(eq(domainData.accountId, account.id), eq(domainData.storeKey, key)))
    .limit(1);

  const data = row ? JSON.parse(row.dataJson) : null;
  return Response.json({
    ok: true,
    data,
    updatedAt: row?.updatedAt ?? null,
    source: row ? "server_d1" : "missing",
    authoritative: Boolean(row),
    legacyImportRequired: !row && [ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY].includes(key),
  });
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const { key } = await context.params;
  if (!isAllowedStoreKey(key)) {
    return Response.json({ ok: false, error: "Неизвестный ключ хранилища" }, { status: 400 });
  }
  const parsed = await readJsonRequest<{
    data?: unknown;
    baseData?: unknown;
    reason?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!("data" in body)) {
    return Response.json({ ok: false, error: "Отсутствуют данные" }, { status: 400 });
  }
  if (!account.restaurantJson) {
    return Response.json(
      { ok: false, error: "Сначала заполните профиль заведения" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(domainData)
    .where(and(eq(domainData.accountId, account.id), eq(domainData.storeKey, key)))
    .limit(1);
  const before = existing ? JSON.parse(existing.dataJson) : null;
  if (key === STOCK_MOVEMENT_STORE_KEY) {
    return Response.json(
      {
        ok: false,
        code: "IMMUTABLE_STOCK_LEDGER",
        error: "Складские движения создаются и сторнируются только lifecycle-операциями.",
      },
      { status: 409 },
    );
  }
  if (key === ASSORTMENT_STORE_KEY && before == null) {
    const dependent = await db
      .select()
      .from(domainData)
      .where(and(
        eq(domainData.accountId, account.id),
        inArray(domainData.storeKey, [STOCK_MOVEMENT_STORE_KEY, PURCHASE_STORE_KEY, INVENTORY_SNAPSHOT_STORE_KEY]),
      ));
    const hasDependentHistory = dependent.some((row) => {
      const value = JSON.parse(row.dataJson) as unknown;
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
    if (hasDependentHistory) {
      return Response.json(
        {
          ok: false,
          code: "AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED",
          error: "Нельзя автоматически объявить client cache авторитетным при существующей истории. Сначала выполните immutable export и import dry-run.",
        },
        { status: 409 },
      );
    }
  }
  const merge = Object.prototype.hasOwnProperty.call(body, "baseData")
    ? mergeConcurrentStoreData(body.baseData ?? null, body.data ?? null, before)
    : { data: body.data ?? null, conflicts: 0 };
  let after = merge.data;
  const accountingCurrency = accountingCurrencyFromRestaurantJson(account.restaurantJson);
  if (VENUE_CURRENCY_ARRAY_STORE_KEYS.has(key)) {
    const currencyNormalization = normalizeVenueCurrencyArrayUpdates({
      before,
      after,
      accountingCurrency,
    });
    if (currencyNormalization.issues.length) {
      return Response.json(
        {
          ok: false,
          code: "ACCOUNTING_CURRENCY_REQUIRED",
          error: "Сначала выберите валюту учёта в профиле заведения.",
        },
        { status: 422 },
      );
    }
    after = currencyNormalization.data;
  }
  let techCardReconciliation = null as ReturnType<typeof reconcileTechCards>["report"] | null;
  if (key === ASSORTMENT_STORE_KEY) {
    const currencyNormalization = normalizeAssortmentMenuCurrencyUpdates(
      before,
      after,
      accountingCurrency,
    );
    if (currencyNormalization.issues.length) {
      return Response.json(
        {
          ok: false,
          code: "ACCOUNTING_CURRENCY_REQUIRED",
          error: "Сначала выберите валюту учёта в профиле заведения.",
          issues: currencyNormalization.issues.slice(0, 50),
        },
        { status: 422 },
      );
    }
    after = currencyNormalization.data;
    if (before != null) {
      const beforeRoot = record(before);
      const afterRoot = { ...record(after) };
      const beforeItems = new Map(array(beforeRoot.menuItems).map((value) => {
        const item = record(value);
        return [String(item.id ?? ""), item] as const;
      }));
      const issues: Array<{ id: string; name: string; code?: string; error?: string }> = [];
      afterRoot.menuItems = array(afterRoot.menuItems).map((value) => {
        const item = record(value);
        const id = String(item.id ?? "");
        const previous = beforeItems.get(id);
        const changed = !previous || JSON.stringify(previous) !== JSON.stringify(item);
        if (!changed) return item;
        const normalized = normalizeMenuItemSaleSizeRecord(item, afterRoot);
        const validation = validateMenuItemSaleSize(normalized, {
          ...afterRoot,
          menuItems: array(afterRoot.menuItems).map((candidate) =>
            String(record(candidate).id ?? "") === id ? normalized : candidate
          ),
        });
        if (!validation.ok) {
          issues.push({
            id,
            name: String(item.name ?? "Позиция меню"),
            code: validation.code,
            error: validation.error,
          });
        }
        return normalized;
      });
      if (issues.length) {
        return Response.json(
          {
            ok: false,
            code: "MENU_SALE_SIZE_INVALID",
            error: "Для изменённых позиций укажите корректное количество и canonical единицу продажи.",
            issues: issues.slice(0, 50),
          },
          { status: 422 },
        );
      }
      after = afterRoot;
    }
    const venueIssues = validateTechCardVenueIsolation(after, account.venueId);
    if (venueIssues.length) {
      return Response.json(
        {
          ok: false,
          code: "TECH_CARD_VENUE_ISOLATION",
          error: "Техкарта или ингредиент ссылается на данные другого заведения.",
          issues: venueIssues.slice(0, 50),
        },
        { status: 409 },
      );
    }
    const related = await db
      .select()
      .from(domainData)
      .where(and(
        eq(domainData.accountId, account.id),
        eq(domainData.storeKey, PURCHASE_STORE_KEY),
      ));
    const relatedStores = new Map(related.map((row) => [row.storeKey, row.dataJson]));
    const parsedPurchaseDocuments = JSON.parse(
      relatedStores.get(PURCHASE_STORE_KEY) ?? "[]",
    ) as unknown;
    const purchaseDocuments = Array.isArray(parsedPurchaseDocuments) ? parsedPurchaseDocuments : [];
    const now = new Date().toISOString();
    const techCards = reconcileTechCards({
      assortment: after,
      purchaseDocuments,
      venueId: account.venueId,
      now: new Date(now),
    });
    after = enrichCanonicalSupplierSummary(techCards.assortment);
    record(after).nomenclatureIdentityReport = auditCanonicalNomenclature({
      assortment: after,
      purchaseDocuments,
      venueId: account.venueId,
    });
    techCardReconciliation = techCards.report;
  }
  const auditBefore = before == null && Array.isArray(after) ? [] : before;
  const auditAfter = after == null && Array.isArray(before) ? [] : after;
  const mutations = compareStoreData(auditBefore, auditAfter);
  if (!canWriteStore(account, key, mutations)) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав для этого изменения" },
      { status: 403 },
    );
  }

  if (key === PURCHASE_STORE_KEY) {
    const protectedMutation = mutations.find((mutation) => {
      const beforeStatus = String(record(mutation.before).status ?? "");
      const afterStatus = String(record(mutation.after).status ?? "");
      return [beforeStatus, afterStatus].some((status) =>
        status === "confirmed" || status === "cancelled"
      );
    });
    if (protectedMutation) {
      return Response.json(
        {
          ok: false,
          code: "USE_PURCHASE_LIFECYCLE_API",
          error: "Проведённые и отменённые закупки изменяются только через безопасные действия документа.",
        },
        { status: 409 },
      );
    }
  }

  if (key === EXPENSE_STORE_KEY) {
    const protectedMutation = mutations.find((mutation) =>
      hasPurchaseLink(mutation.before) || hasPurchaseLink(mutation.after)
    );
    if (protectedMutation) {
      return Response.json(
        {
          ok: false,
          code: "USE_PURCHASE_PAYMENT_API",
          error: "Связанный платёж нельзя изменить или удалить как обычный расход. Используйте действия оплаты закупки.",
        },
        { status: 409 },
      );
    }
    const amountOnlyPurchaseMutation = mutations.find((mutation) => {
      const beforeCategory = String(record(mutation.before).category ?? "");
      const after = record(mutation.after);
      const afterCategory = String(after.category ?? "");
      return PURCHASE_STOCK_CATEGORIES.has(afterCategory)
        && !hasPurchaseLink(after)
        && !PURCHASE_STOCK_CATEGORIES.has(beforeCategory);
    });
    if (amountOnlyPurchaseMutation) {
      return Response.json(
        {
          ok: false,
          code: "PURCHASE_DOCUMENT_REQUIRED",
          action: "/suppliers?tab=purchases&returnTo=finance",
          error: "Закупка товаров создаётся как накладная с позициями; в финансах к ней добавляется отдельная оплата.",
        },
        { status: 422 },
      );
    }
  }

  if (MONTH_LOCKED_STORE_KEYS.has(key) && mutations.length > 0) {
    const [closingRow] = await db
      .select()
      .from(domainData)
      .where(
        and(
          eq(domainData.accountId, account.id),
          eq(domainData.storeKey, "bd_month_closings"),
        ),
      )
      .limit(1);
    const closedMonths = closedMonthsFromStore(
      closingRow ? JSON.parse(closingRow.dataJson) : null,
    );
    const lockedMutation = mutations.find(
      (mutation) => mutation.monthKey && closedMonths.has(mutation.monthKey),
    );
    if (lockedMutation?.monthKey) {
      const attemptedAt = new Date().toISOString();
      await db.insert(auditLog).values({
        accountId: account.id,
        storeKey: key,
        action: "blocked",
        entityId: lockedMutation.entityId,
        entityLabel: lockedMutation.entityLabel ?? `Изменение за ${lockedMutation.monthKey}`,
        monthKey: lockedMutation.monthKey,
        beforeJson: lockedMutation.before == null ? null : JSON.stringify(lockedMutation.before),
        afterJson: null,
        changedFieldsJson: JSON.stringify(lockedMutation.changedFields),
        actorName: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
        actorRole: account.role,
        reason: `MONTH_LOCKED: сервер отклонил изменение закрытого периода ${lockedMutation.monthKey}`,
        createdAt: attemptedAt,
      });
      return Response.json(
        {
          ok: false,
          code: "MONTH_LOCKED",
          monthKey: lockedMutation.monthKey,
          error: `Месяц ${lockedMutation.monthKey} закрыт. Сначала откройте его в мастере закрытия месяца.`,
        },
        { status: 423 },
      );
    }
  }

  const updatedAt = new Date().toISOString();
  await db
    .insert(domainData)
    .values({
      accountId: account.id,
      storeKey: key,
      dataJson: JSON.stringify(after),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [domainData.accountId, domainData.storeKey],
      set: { dataJson: JSON.stringify(after), updatedAt },
    });

  if (mutations.length > 0) {
    const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
    for (const mutation of mutations.slice(0, 250)) {
      await db.insert(auditLog).values({
        accountId: account.id,
        storeKey: key,
        action: mutation.action,
        entityId: mutation.entityId,
        entityLabel: mutation.entityLabel,
        monthKey: mutation.monthKey,
        beforeJson: mutation.before == null ? null : JSON.stringify(mutation.before),
        afterJson: mutation.after == null ? null : JSON.stringify(mutation.after),
        changedFieldsJson: JSON.stringify(mutation.changedFields),
        actorName,
        actorRole: account.role,
        reason: body.reason?.trim().slice(0, 500) || null,
        createdAt: updatedAt,
      });
    }
  }

  if (merge.conflicts > 0) {
    await db.insert(auditLog).values({
      accountId: account.id,
      storeKey: key,
      action: "conflict",
      entityId: null,
      entityLabel: `Параллельное изменение · ${merge.conflicts}`,
      monthKey: null,
      beforeJson: null,
      afterJson: null,
      changedFieldsJson: "[]",
      actorName: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
      actorRole: account.role,
      reason: `Обнаружено параллельных изменений: ${merge.conflicts}. Применено безопасное трёхстороннее объединение.`,
      createdAt: updatedAt,
    });
  }

  return Response.json({
    ok: true,
    updatedAt,
    auditedChanges: mutations.length,
    mergedConflicts: merge.conflicts,
    data: after,
    techCardReconciliation,
  });
}
