import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  ASSORTMENT_STORE_KEY,
  archiveInventoryProduct,
  BaseInventoryUnit,
  consolidateInventoryDuplicates,
  inventoryPackageAmount,
  inventoryProductKey,
  type InventoryDisplayUnit,
  normalizeInventoryDisplayUnit,
  repairInventoryBalanceMetadata,
  repairInventoryPurchaseAmounts,
  STOCK_MOVEMENT_STORE_KEY,
  updateInventoryProductDefinition,
} from "../../../../lib/bardoctor/inventory";
import { PURCHASE_STORE_KEY } from "../../../../lib/bardoctor/purchases";
import {
  classifyNomenclatureItem,
  defaultNomenclatureStructure,
  ensureNomenclatureHierarchy,
  manualClassification,
  rememberNomenclatureCorrection,
} from "../../../../lib/bardoctor/nomenclature";

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
  storeKey: string,
  value: unknown,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, storeKey, JSON.stringify(value), updatedAt);
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
  if (!new Set(["repair", "classify", "create", "update", "archive"]).has(action)) {
    return Response.json({ ok: false, error: "Неизвестное действие" }, { status: 400 });
  }

  const database = getD1();
  const storesResult = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, PURCHASE_STORE_KEY).all<StoreRow>();
  const stores = new Map((storesResult.results ?? []).map((row) => [row.store_key, row.data_json]));
  const assortment = json(stores.get(ASSORTMENT_STORE_KEY), {});
  const stockMovements = array(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const purchaseDocuments = array(stores.get(PURCHASE_STORE_KEY));
  const now = new Date().toISOString();
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;

  if (action === "archive") {
    const productKey = text(body.productKey, "", 300);
    const archived = archiveInventoryProduct({ assortment, productKey, now });
    if (!archived.ok) {
      const status = archived.code === "PRODUCT_NOT_FOUND" ? 404 : 409;
      return Response.json(archived, { status });
    }
    await database.batch([
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, archived.assortment, now),
      auditUpdate(database, {
        accountId: account.id,
        entityId: productKey,
        entityLabel: text(archived.product?.name, "Складская позиция", 240),
        before: (Array.isArray(record(assortment).stockBalances) ? record(assortment).stockBalances as unknown[] : [])
          .map(record)
          .find((value) => text(value.productKey ?? value.key, "", 300) === productKey) ?? null,
        after: archived.product,
        actorName,
        actorRole: account.role,
        reason: "Удаление ошибочной нулевой позиции из активной номенклатуры",
        createdAt: now,
      }),
    ]);
    return Response.json({ ok: true, assortment: archived.assortment, product: archived.product, archived: true });
  }

  if (action === "classify") {
    const consolidated = consolidateInventoryDuplicates({ assortment, stockMovements, now });
    const result = ensureNomenclatureHierarchy(consolidated.assortment, now);
    const statements = [
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, result.assortment, now),
      auditUpdate(database, {
        accountId: account.id,
        entityId: "nomenclature-hierarchy-v209",
        entityLabel: "Структура номенклатуры",
        before: {
          structureVersion: text(record(record(assortment).nomenclatureStructure).version, "legacy", 20),
          itemCount: Array.isArray(record(assortment).nomenclature)
            ? (record(assortment).nomenclature as unknown[]).length
            : 0,
        },
        after: {
          structureVersion: "v209",
          classified: result.classified,
          suggested: result.suggested,
          unassigned: result.unassigned,
          duplicateRepair: consolidated.summary,
        },
        actorName,
        actorRole: account.role,
        reason: "Автоматическое распределение номенклатуры по разделам",
        createdAt: now,
      }),
    ];
    if (consolidated.summary.changed) {
      statements.push(upsertStore(
        database,
        account.id,
        STOCK_MOVEMENT_STORE_KEY,
        consolidated.stockMovements,
        now,
      ));
    }
    await database.batch(statements);
    return Response.json({ ok: true, ...result, duplicateRepair: consolidated.summary });
  }

  if (action === "repair") {
    const consolidated = consolidateInventoryDuplicates({ assortment, stockMovements, now });
    const amountRepair = repairInventoryPurchaseAmounts({
      assortment: consolidated.assortment,
      purchaseDocuments,
      stockMovements: consolidated.stockMovements,
      now,
    });
    const reconciled = consolidateInventoryDuplicates({
      assortment: amountRepair.assortment,
      stockMovements: amountRepair.stockMovements,
      now,
    });
    const repaired = repairInventoryBalanceMetadata({
      assortment: reconciled.assortment,
      stockMovements: reconciled.stockMovements,
      now,
    });
    if (
      repaired.summary.repaired
      || repaired.summary.removed
      || consolidated.summary.changed
      || reconciled.summary.changed
      || amountRepair.summary.changed
    ) {
      const statements = [
        upsertStore(database, account.id, ASSORTMENT_STORE_KEY, repaired.assortment, now),
        auditUpdate(database, {
          accountId: account.id,
          entityId: "inventory-metadata",
          entityLabel: "Номенклатура склада",
          before: assortment,
          after: repaired.assortment,
          actorName,
          actorRole: account.role,
          reason: amountRepair.summary.changed
            ? "Исправление двойного умножения количества и фасовки в приходах"
            : consolidated.summary.changed
            ? "Объединение дублей склада и восстановление карточек без потери движений"
            : "Восстановление названий складских позиций из техкарт",
          createdAt: now,
        }),
      ];
      if (consolidated.summary.changed || reconciled.summary.changed || amountRepair.summary.changed) {
        statements.push(upsertStore(
          database,
          account.id,
          STOCK_MOVEMENT_STORE_KEY,
          reconciled.stockMovements,
          now,
        ));
      }
      await database.batch(statements);
    }
    return Response.json({
      ok: true,
      assortment: repaired.assortment,
      repaired: repaired.summary.repaired,
      removed: repaired.summary.removed,
      duplicateRepair: consolidated.summary,
      reconciliationDuplicateRepair: reconciled.summary,
      amountRepair: amountRepair.summary,
    });
  }

  if (action === "create") {
    const name = text(body.name, "", 240);
    const kind = text(body.kind, "stock", 20) === "service" ? "service" : "stock";
    const unit = text(body.unit, kind === "service" ? "service" : "pcs", 20) as BaseInventoryUnit;
    const packageSize = text(
      body.packageSize,
      kind === "service" ? "1 усл." : unit === "ml" ? "1 л" : unit === "g" ? "1 кг" : "1 шт.",
      120,
    );
    const displayUnit = kind === "stock"
      ? normalizeInventoryDisplayUnit(body.displayUnit, unit)
      : null;
    if (!name || (kind === "stock" && (!["ml", "g", "pcs"].includes(unit) || !displayUnit))) {
      return Response.json(
        { ok: false, error: "Укажите название и единицу учёта" },
        { status: 422 },
      );
    }
    const root = record(assortment);
    if (!record(root.nomenclatureStructure).version) {
      root.nomenclatureStructure = defaultNomenclatureStructure();
    }
    const balances = Array.isArray(root.stockBalances) ? root.stockBalances.map(record) : [];
    const nomenclature = Array.isArray(root.nomenclature) ? root.nomenclature.map(record) : [];
    const productKey = inventoryProductKey({ name, unit, packageSize });
    const duplicate = [...balances, ...nomenclature].find((value) =>
      inventoryProductKey(value) === productKey
    );
    if (duplicate) {
      return Response.json(
        { ok: false, code: "PRODUCT_EXISTS", error: "Такая позиция уже есть в номенклатуре" },
        { status: 409 },
      );
    }
    const packageDetails = kind === "stock"
      ? inventoryPackageAmount(packageSize, unit)
      : { amount: 1, unit: "unknown" as BaseInventoryUnit };
    if (kind === "stock" && (packageDetails.amount <= 0 || packageDetails.unit !== unit)) {
      return Response.json(
        { ok: false, error: "Укажите корректную фасовку для выбранной единицы" },
        { status: 422 },
      );
    }
    const usesPackageAsDisplayUnit = kind === "stock"
      && displayUnit === "pcs"
      && unit !== "pcs";
    const displayPackageSize = usesPackageAsDisplayUnit
      ? text(body.displayPackageSize, packageSize, 120)
      : "";
    const displayPackageDetails = usesPackageAsDisplayUnit
      ? inventoryPackageAmount(displayPackageSize, unit)
      : { amount: 0, unit };
    if (
      usesPackageAsDisplayUnit
      && (displayPackageDetails.amount <= 0 || displayPackageDetails.unit !== unit)
    ) {
      return Response.json(
        { ok: false, error: "Чтобы показывать остаток в штуках, укажите объём или вес одной единицы" },
        { status: 422 },
      );
    }
    const purchaseMode = ["document", "measure", "package"].includes(text(body.purchaseMode, "document", 20))
      ? text(body.purchaseMode, "document", 20) as "document" | "measure" | "package"
      : "document";
    const usesPackageAsPurchaseUnit = kind === "stock"
      && purchaseMode === "package"
      && unit !== "pcs";
    const purchasePackageSize = usesPackageAsPurchaseUnit
      ? text(body.purchasePackageSize, displayPackageSize || packageSize, 120)
      : "";
    const purchasePackageDetails = usesPackageAsPurchaseUnit
      ? inventoryPackageAmount(purchasePackageSize, unit)
      : { amount: 0, unit };
    if (
      usesPackageAsPurchaseUnit
      && (purchasePackageDetails.amount <= 0 || purchasePackageDetails.unit !== unit)
    ) {
      return Response.json(
        { ok: false, error: "Чтобы приходовать товар в бутылках или упаковках, укажите объём или вес одной единицы" },
        { status: 422 },
      );
    }
    const manual = manualClassification(body);
    const classification = Object.keys(manual).length
      ? manual
      : classifyNomenclatureItem({ name, category: body.category, kind });
    const product: JsonRecord = {
      id: productKey,
      key: productKey,
      productKey,
      name,
      preferredDisplayName: name,
      preferredDisplayNameSource: "manual_create",
      preferredDisplayNameUpdatedAt: now,
      category: text(body.category, kind === "service" ? "other" : "products", 80),
      kind,
      unit,
      ...(displayUnit ? { displayUnit } : {}),
      ...(usesPackageAsDisplayUnit
        ? {
          displayPackageSize,
          displayPackageAmount: displayPackageDetails.amount,
        }
        : {}),
      ...(kind === "stock" ? { purchaseMode } : {}),
      ...(usesPackageAsPurchaseUnit
        ? {
          purchasePackageSize,
          purchasePackageAmount: purchasePackageDetails.amount,
        }
        : {}),
      packageSize,
      packageAmount: packageDetails.amount,
      current: 0,
      onOrder: 0,
      averageUnitCost: 0,
      inventoryValue: 0,
      active: true,
      metadataSource: "manual",
      ...classification,
      classifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    root.stockBalances = kind === "stock" ? [product, ...balances] : balances;
    root.nomenclature = [{ ...product, source: "manual" }, ...nomenclature];
    if (Object.keys(manual).length) {
      root.nomenclatureRules = rememberNomenclatureCorrection(root.nomenclatureRules, product, manual, now);
    }
    root.updatedAt = now;
    await database.batch([
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, root, now),
      auditUpdate(database, {
        accountId: account.id,
        entityId: productKey,
        entityLabel: name,
        before: null,
        after: product,
        actorName,
        actorRole: account.role,
        reason: "Ручное добавление позиции в номенклатуру",
        createdAt: now,
      }),
    ]);
    return Response.json({ ok: true, assortment: root, product, created: true });
  }

  const productKey = text(body.productKey, "", 300);
  const previousRoot = record(assortment);
  const previousNomenclature = (Array.isArray(previousRoot.nomenclature) ? previousRoot.nomenclature : [])
    .map(record)
    .find((value) => text(value.productKey ?? value.key, "", 300) === productKey) ?? null;
  const previousProduct = previousNomenclature ?? (Array.isArray(previousRoot.stockBalances) ? previousRoot.stockBalances : [])
    .map(record)
    .find((value) => text(value.productKey ?? value.key, "", 300) === productKey) ?? null;
  const requestedName = text(body.name, "", 240);
  const requestedCategory = text(body.category, text(previousProduct?.category, "products", 80), 80);
  const requestedClassification = manualClassification(body);
  const requestedActive = body.active !== false;
  const previousKind = text(previousProduct?.kind, "stock", 20) === "service" ? "service" : "stock";
  if (previousKind === "service") {
    if (!previousProduct || !requestedName) {
      return Response.json({ ok: false, error: "Укажите название услуги" }, { status: 422 });
    }
    const root = record(assortment);
    const nomenclature = Array.isArray(root.nomenclature) ? root.nomenclature.map(record) : [];
    const item = nomenclature.find((value) => text(value.productKey ?? value.key, "", 300) === productKey);
    if (!item) {
      return Response.json({ ok: false, code: "PRODUCT_NOT_FOUND", error: "Позиция номенклатуры не найдена" }, { status: 404 });
    }
    Object.assign(item, {
      name: requestedName,
      preferredDisplayName: requestedName,
      preferredDisplayNameSource: "manual_edit",
      preferredDisplayNameUpdatedAt: now,
      category: requestedCategory,
      active: requestedActive,
      packageSize: text(body.packageSize, text(item.packageSize, "1 усл.", 120), 120),
      updatedAt: now,
      ...requestedClassification,
    });
    root.nomenclature = nomenclature;
    if (Object.keys(requestedClassification).length) {
      root.nomenclatureRules = rememberNomenclatureCorrection(
        root.nomenclatureRules,
        { name: requestedName },
        requestedClassification,
        now,
      );
    }
    root.updatedAt = now;
    await database.batch([
      upsertStore(database, account.id, ASSORTMENT_STORE_KEY, root, now),
      auditUpdate(database, {
        accountId: account.id,
        entityId: productKey,
        entityLabel: requestedName,
        before: previousProduct,
        after: item,
        actorName,
        actorRole: account.role,
        reason: "Изменение услуги в номенклатуре",
        createdAt: now,
      }),
    ]);
    return Response.json({ ok: true, assortment: root, product: item, linkedRecipes: 0 });
  }
  const requestedUnit = text(body.unit, "", 20) as BaseInventoryUnit;
  const updated = updateInventoryProductDefinition({
    assortment,
    stockMovements,
    update: {
      productKey,
      name: requestedName,
      unit: requestedUnit,
      packageSize: text(body.packageSize, "", 120),
      displayUnit: text(
        body.displayUnit,
        text(previousProduct?.displayUnit, "auto", 20),
        20,
      ) as InventoryDisplayUnit,
      displayPackageSize: text(
        body.displayPackageSize,
        text(previousProduct?.displayPackageSize, "", 120),
        120,
      ),
      purchaseMode: text(
        body.purchaseMode,
        text(previousProduct?.purchaseMode, "document", 20),
        20,
      ) as "document" | "measure" | "package",
      purchasePackageSize: text(
        body.purchasePackageSize,
        text(previousProduct?.purchasePackageSize, "", 120),
        120,
      ),
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
  const updatedRoot = record(updated.assortment);
  const updatedNomenclature = Array.isArray(updatedRoot.nomenclature)
    ? updatedRoot.nomenclature.map(record)
    : [];
  const updatedItem = updatedNomenclature.find((value) =>
    text(value.productKey ?? value.key, "", 300) === productKey
  );
  if (updatedItem) Object.assign(updatedItem, { category: requestedCategory, active: requestedActive, ...requestedClassification });
  const updatedBalances = Array.isArray(updatedRoot.stockBalances)
    ? updatedRoot.stockBalances.map(record)
    : [];
  const updatedBalance = updatedBalances.find((value) =>
    text(value.productKey ?? value.key, "", 300) === productKey
  );
  if (updatedBalance) Object.assign(updatedBalance, { category: requestedCategory, active: requestedActive, ...requestedClassification });
  updatedRoot.nomenclature = updatedNomenclature;
  updatedRoot.stockBalances = updatedBalances;
  if (Object.keys(requestedClassification).length) {
    updatedRoot.nomenclatureRules = rememberNomenclatureCorrection(
      updatedRoot.nomenclatureRules,
      { name: requestedName },
      requestedClassification,
      now,
    );
  }
  await database.batch([
    upsertStore(database, account.id, ASSORTMENT_STORE_KEY, updatedRoot, now),
    auditUpdate(database, {
      accountId: account.id,
      entityId: productKey,
      entityLabel: text(updated.product.name, "Складская позиция", 240),
      before: previousProduct,
      after: updatedItem ?? updated.product,
      actorName,
      actorRole: account.role,
      reason: "Изменение карточки складского товара",
      createdAt: now,
    }),
  ]);
  return Response.json({
    ok: true,
    assortment: updatedRoot,
    product: updatedItem ?? updated.product,
    linkedRecipes: updated.linkedRecipes,
  });
}
