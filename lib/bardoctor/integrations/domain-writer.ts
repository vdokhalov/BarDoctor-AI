import { getD1 } from "../../../db";
import type { AuthenticatedAccount } from "../access-control";
import { closedMonthsFromStore } from "../data-trust";
import {
  applyInventoryCount,
  ASSORTMENT_STORE_KEY,
  inventoryPackageAmount,
  resolveInventoryProductKey,
  STOCK_MOVEMENT_STORE_KEY,
  toInventoryBaseAmount,
  type BaseInventoryUnit,
  type StockMovement,
} from "../inventory";
import { EXPENSE_STORE_KEY, SUPPLIER_STORE_KEY } from "../purchases";
import type {
  CanonicalEnvelope,
  CanonicalEntityMap,
  IntegrationEntityType,
} from "./contracts";
import type { BusinessWriteResult } from "./sync-engine";

const EMPLOYEE_STORE_KEY = "bd_employees";
export const WAREHOUSE_STORE_KEY = "bd_warehouses";
const INVENTORY_SNAPSHOT_STORE_KEY = "bd_inventory_snapshots";
const WRITE_OFF_STORE_KEY = "bd_inventory_writeoffs";
const RETURN_STORE_KEY = "bd_inventory_returns";
const MONTH_CLOSING_STORE_KEY = "bd_month_closings";

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "", max = 300): string {
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

function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function upsertStore(
  database: D1Database,
  accountId: number,
  key: string,
  value: unknown,
  now: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), now);
}

type AuditInput = {
  account: AuthenticatedAccount;
  storeKey: string;
  action: "create" | "update";
  entityId: string;
  label: string;
  monthKey?: string;
  before?: unknown;
  after: unknown;
  reason: string;
  now: string;
};

function auditValues(input: AuditInput): unknown[] {
  const actorName = [input.account.firstName, input.account.lastName].filter(Boolean).join(" ")
    || input.account.appEmail;
  return [
    input.account.id,
    input.storeKey,
    input.action,
    input.entityId,
    input.label,
    input.monthKey ?? null,
    input.before === undefined ? null : JSON.stringify(input.before),
    JSON.stringify(input.after),
    JSON.stringify(Object.keys(record(input.after))),
    actorName,
    input.account.role,
    input.reason,
    input.now,
  ];
}

function auditStatement(database: D1Database, input: AuditInput): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO audit_log (
      account_id, store_key, action, entity_id, entity_label, month_key,
      before_json, after_json, changed_fields_json, actor_name, actor_role,
      reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(...auditValues(input));
}

function batchedAuditStatements(
  database: D1Database,
  inputs: AuditInput[],
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  // D1 deliberately keeps SQLite's bound-variable ceiling low. Seven audit
  // rows use 91 variables and stay below that limit on local and hosted D1.
  for (let start = 0; start < inputs.length; start += 7) {
    const chunk = inputs.slice(start, start + 7);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    statements.push(database.prepare(`
      INSERT INTO audit_log (
        account_id, store_key, action, entity_id, entity_label, month_key,
        before_json, after_json, changed_fields_json, actor_name, actor_role,
        reason, created_at
      ) VALUES ${placeholders}
    `).bind(...chunk.flatMap(auditValues)));
  }
  return statements;
}

async function stores(accountId: number, keys: readonly string[]): Promise<Map<string, string>> {
  const placeholders = keys.map(() => "?").join(", ");
  const result = await getD1().prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(accountId, ...keys).all<StoreRow>();
  return new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
}

function sourceMetadata(envelope: CanonicalEnvelope): JsonRecord {
  return {
    source: "integration",
    sourceType: envelope.sourceType,
    externalSystem: envelope.externalSystem,
    externalId: envelope.externalId,
    externalUpdatedAt: envelope.externalUpdatedAt,
    venueId: envelope.venueId,
    syncStatus: "success",
    sourcePriority: inputPriority(envelope),
  };
}

function inputPriority(envelope: CanonicalEnvelope): number {
  const value = Number(envelope.sourcePriority);
  return Number.isFinite(value) ? Math.max(-100, Math.min(100, Math.round(value))) : 0;
}

function closedMonthFailure(store: Map<string, string>, date: string): BusinessWriteResult | null {
  const monthKey = date.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const closed = closedMonthsFromStore(parse(store.get(MONTH_CLOSING_STORE_KEY), null));
  return closed.has(monthKey)
    ? { ok: false, code: "MONTH_LOCKED", error: `Месяц ${monthKey} закрыт. Синхронизация не меняет закрытый период.` }
    : null;
}

async function writeProduct(input: WriterInput): Promise<BusinessWriteResult> {
  const database = getD1();
  const now = new Date().toISOString();
  const loaded = await stores(input.account.id, [ASSORTMENT_STORE_KEY]);
  const assortment = record(parse(loaded.get(ASSORTMENT_STORE_KEY), {}));
  const balances = array(assortment.stockBalances);
  const value = record(input.data);
  const requestedProductKey = input.internalId;
  const productKey = resolveInventoryProductKey(assortment, requestedProductKey) || requestedProductKey;
  const index = balances.findIndex((item) => text(item.productKey ?? item.key) === productKey);
  const before = index >= 0 ? { ...balances[index] } : undefined;
  const previous = index >= 0 ? balances[index] : {};
  if (index >= 0 && number(previous.sourcePriority) > inputPriority(input.envelope)) {
    return { ok: true, internalId: productKey, duplicate: true };
  }
  const packageDetails = inventoryPackageAmount(value.packageSize, value.unit);
  const created = index < 0;
  const next: JsonRecord = {
    ...previous,
    key: productKey,
    productKey,
    name: created ? text(value.name, "Товар") : text(previous.name, text(value.name, "Товар")),
    externalName: text(value.name, "Товар"),
    aliases: [...new Set([
      ...(Array.isArray(previous.aliases) ? previous.aliases.map(String) : []),
      text(value.name),
    ].filter(Boolean))].slice(0, 30),
    externalProductKeys: [...new Set([
      ...(Array.isArray(previous.externalProductKeys) ? previous.externalProductKeys.map(String) : []),
      requestedProductKey,
    ].filter((key) => key && key !== productKey))].slice(0, 100),
    unit: packageDetails.unit === "unknown" ? text(previous.unit, "unknown") : packageDetails.unit,
    packageSize: text(value.packageSize, text(previous.packageSize)),
    packageAmount: packageDetails.amount || number(previous.packageAmount),
    barcode: text(value.barcode, text(previous.barcode)) || undefined,
    sku: text(value.sku, text(previous.sku)) || undefined,
    code: text(value.code, text(previous.code)) || undefined,
    article: text(value.article, text(previous.article ?? previous.sku)) || undefined,
    category: text(value.category, text(previous.category)) || undefined,
    groupExternalId: text(value.groupExternalId, text(previous.groupExternalId)) || undefined,
    active: value.active !== false,
    current: number(previous.current),
    averageUnitCost: Math.max(0, number(previous.averageUnitCost)),
    inventoryValue: Math.max(0, number(previous.inventoryValue)),
    ...sourceMetadata(input.envelope),
    createdAt: text(previous.createdAt, now, 40),
    updatedAt: now,
  };
  if (index >= 0) balances[index] = next;
  else balances.unshift(next);
  assortment.stockBalances = balances;
  assortment.updatedAt = now;
  await database.batch([
    upsertStore(database, input.account.id, ASSORTMENT_STORE_KEY, assortment, now),
    auditStatement(database, {
      account: input.account,
      storeKey: ASSORTMENT_STORE_KEY,
      action: created ? "create" : "update",
      entityId: productKey,
      label: `Номенклатура: ${text(value.name, "Товар")}`,
      before,
      after: next,
      reason: `Номенклатура синхронизирована из ${input.envelope.externalSystem}`,
      now,
    }),
  ]);
  return { ok: true, internalId: productKey };
}

async function writeStockBalance(input: WriterInput): Promise<BusinessWriteResult> {
  const database = getD1();
  const now = new Date().toISOString();
  const loaded = await stores(input.account.id, [
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    INVENTORY_SNAPSHOT_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ]);
  const assortment = record(parse(loaded.get(ASSORTMENT_STORE_KEY), {}));
  const value = record(input.data);
  const date = text(value.measuredAt, now.slice(0, 10), 10);
  const locked = closedMonthFailure(loaded, date);
  if (locked) return locked;
  const requestedProductKey = text(value.productKey);
  const productKey = resolveInventoryProductKey(assortment, requestedProductKey) || requestedProductKey;
  const warehouseExternalId = text(value.warehouseExternalId, "__venue__", 180);
  const balances = array(assortment.stockBalances);
  let balance = balances.find((item) => text(item.productKey ?? item.key) === productKey);
  const actual = toInventoryBaseAmount(value.quantity, value.unit);
  if (actual.unit === "unknown" || actual.amount < 0) {
    return { ok: false, code: "INVENTORY_UNIT_INVALID", error: "Не удалось привести остаток к складской единице" };
  }
  if (!balance) {
    balance = {
      key: productKey,
      productKey,
      name: text(value.productName, "Товар"),
      unit: actual.unit,
      current: 0,
      averageUnitCost: Math.max(0, number(value.averageUnitCost)),
      inventoryValue: 0,
      metadataSource: "integration",
      createdAt: now,
      updatedAt: now,
    };
    balances.unshift(balance);
    assortment.stockBalances = balances;
  } else if (number(balance.stockSourcePriority) > inputPriority(input.envelope)) {
    return { ok: true, internalId: input.internalId, duplicate: true };
  }
  const balanceUnit = text(balance.unit) as BaseInventoryUnit;
  if (balanceUnit !== "unknown" && balanceUnit !== actual.unit) {
    return { ok: false, code: "INVENTORY_UNIT_CONFLICT", error: "Единица внешнего остатка не совпадает со складской единицей" };
  }
  const warehouseBalances = record(balance.warehouseBalances);
  warehouseBalances[warehouseExternalId] = {
    quantity: actual.amount,
    unit: actual.unit,
    measuredAt: date,
    externalSystem: input.envelope.externalSystem,
    externalId: input.envelope.externalId,
  };
  const aggregateAmount = rounded(Object.values(warehouseBalances).reduce<number>(
    (sum, item) => sum + Math.max(0, number(record(item).quantity)),
    0,
  ));
  balance.warehouseBalances = warehouseBalances;
  balance.stockSourcePriority = inputPriority(input.envelope);
  balance.stockExternalSystem = input.envelope.externalSystem;
  balance.stockExternalId = input.envelope.externalId;
  balance.stockMeasuredAt = date;
  const inventory = applyInventoryCount({
    assortment,
    snapshot: {
      id: input.internalId,
      date,
      items: [{ id: `${input.internalId}:1`, productKey, actual: aggregateAmount }],
    },
    now,
  });
  if (inventory.summary.unresolvedLines.length) {
    return { ok: false, code: "INVENTORY_REVIEW_REQUIRED", error: inventory.summary.unresolvedLines[0].reason };
  }
  const snapshots = array(parse(loaded.get(INVENTORY_SNAPSHOT_STORE_KEY), []));
  const existingIndex = snapshots.findIndex((item) => text(item.id) === input.internalId);
  const before = existingIndex >= 0 ? { ...snapshots[existingIndex] } : undefined;
  const snapshot = {
    id: input.internalId,
    internalId: input.internalId,
    date,
    status: "confirmed",
    items: inventory.items,
    warehouseExternalId: warehouseExternalId === "__venue__" ? undefined : warehouseExternalId,
    sections: inventory.sections,
    total: inventory.summary.actualValue,
    expectedTotal: inventory.summary.expectedValue,
    differenceTotal: inventory.summary.differenceValue,
    ...sourceMetadata(input.envelope),
    createdAt: existingIndex >= 0 ? text(snapshots[existingIndex].createdAt, now, 40) : now,
    updatedAt: now,
  };
  if (existingIndex >= 0) snapshots[existingIndex] = snapshot;
  else snapshots.unshift(snapshot);
  const movements = [
    ...inventory.movements,
    ...array(parse(loaded.get(STOCK_MOVEMENT_STORE_KEY), [])),
  ].slice(0, 20_000);
  await database.batch([
    upsertStore(database, input.account.id, ASSORTMENT_STORE_KEY, inventory.assortment, now),
    upsertStore(database, input.account.id, STOCK_MOVEMENT_STORE_KEY, movements, now),
    upsertStore(database, input.account.id, INVENTORY_SNAPSHOT_STORE_KEY, snapshots, now),
    auditStatement(database, {
      account: input.account,
      storeKey: INVENTORY_SNAPSHOT_STORE_KEY,
      action: existingIndex >= 0 ? "update" : "create",
      entityId: input.internalId,
      label: `Остаток: ${text(balance.name, "Товар")}`,
      before,
      after: snapshot,
      monthKey: date.slice(0, 7),
      reason: `Остаток синхронизирован из ${input.envelope.externalSystem}`,
      now,
    }),
  ]);
  return { ok: true, internalId: input.internalId };
}

async function writeInventoryDocument(input: WriterInput & { kind: "write_off" | "return" }): Promise<BusinessWriteResult> {
  const database = getD1();
  const now = new Date().toISOString();
  const documentStoreKey = input.kind === "write_off" ? WRITE_OFF_STORE_KEY : RETURN_STORE_KEY;
  const loaded = await stores(input.account.id, [
    ASSORTMENT_STORE_KEY,
    STOCK_MOVEMENT_STORE_KEY,
    documentStoreKey,
    EXPENSE_STORE_KEY,
    MONTH_CLOSING_STORE_KEY,
  ]);
  const value = record(input.data);
  const date = text(value.date, now.slice(0, 10), 10);
  const locked = closedMonthFailure(loaded, date);
  if (locked) return locked;
  const assortment = record(parse(loaded.get(ASSORTMENT_STORE_KEY), {}));
  const balances = array(assortment.stockBalances);
  const byKey = new Map(balances.map((balance) => [text(balance.productKey ?? balance.key), balance]));
  const prepared: Array<{ item: JsonRecord; balance: JsonRecord; amount: number; unit: BaseInventoryUnit; cost: number }> = [];
  for (const original of array(value.items)) {
    const requestedProductKey = text(original.productKey);
    const productKey = resolveInventoryProductKey(assortment, requestedProductKey) || requestedProductKey;
    const balance = byKey.get(productKey);
    if (!balance) return { ok: false, code: "MAPPING_TARGET_NOT_FOUND", error: `Складская позиция «${text(original.name, "Товар") }» не найдена` };
    const base = toInventoryBaseAmount(original.quantity, original.unit);
    if (base.unit === "unknown" || base.amount <= 0 || text(balance.unit) !== base.unit) {
      return { ok: false, code: "INVENTORY_UNIT_CONFLICT", error: `Проверьте единицу позиции «${text(original.name, text(balance.name, "Товар"))}»` };
    }
    const direction = input.kind === "return" && value.direction === "from_customer" ? 1 : -1;
    if (direction < 0 && number(balance.current) + 0.0001 < base.amount) {
      return { ok: false, code: "INSUFFICIENT_STOCK", error: `Недостаточно остатка для «${text(balance.name, "Товар") }»` };
    }
    prepared.push({
      item: { ...original, productKey },
      balance,
      amount: direction * base.amount,
      unit: base.unit,
      cost: Math.abs(number(original.amount) || base.amount * Math.max(0, number(balance.averageUnitCost))),
    });
  }
  const movements: StockMovement[] = [];
  prepared.forEach(({ item, balance, amount, unit, cost }, index) => {
    const nextCurrent = rounded(number(balance.current) + amount);
    balance.current = nextCurrent;
    balance.inventoryValue = rounded(Math.max(0, nextCurrent) * Math.max(0, number(balance.averageUnitCost)), 2);
    balance.updatedAt = now;
    if (input.kind === "write_off") balance.lastWriteOffAt = date;
    else balance.lastReturnAt = date;
    movements.push({
      id: crypto.randomUUID(),
      type: input.kind === "write_off" ? "writeoff" : "return",
      date,
      productKey: text(item.productKey),
      productName: text(balance.name, text(item.name, "Товар")),
      amount,
      unit,
      costAmount: amount < 0 ? -cost : cost,
      currency: text(value.currency, text(balance.currency)) || undefined,
      sourceDocumentId: input.internalId,
      sourceLineId: text(item.id, `${input.internalId}:${index + 1}`),
      createdAt: now,
    });
  });
  assortment.stockBalances = balances;
  assortment.updatedAt = now;
  const documents = array(parse(loaded.get(documentStoreKey), []));
  const existingIndex = documents.findIndex((item) => text(item.id) === input.internalId);
  const before = existingIndex >= 0 ? { ...documents[existingIndex] } : undefined;
  const total = rounded(prepared.reduce((sum, item) => sum + item.cost, 0), 2);
  const document = {
    ...value,
    id: input.internalId,
    internalId: input.internalId,
    items: prepared.map((item) => item.item),
    total: number(value.total, total) || total,
    status: "confirmed",
    ...sourceMetadata(input.envelope),
    createdAt: text(before?.createdAt, now, 40),
    updatedAt: now,
  };
  if (existingIndex >= 0) documents[existingIndex] = document;
  else documents.unshift(document);
  const oldMovements = array(parse(loaded.get(STOCK_MOVEMENT_STORE_KEY), []));
  const nextMovements = [...movements, ...oldMovements].slice(0, 20_000);
  const statements = [
    upsertStore(database, input.account.id, ASSORTMENT_STORE_KEY, assortment, now),
    upsertStore(database, input.account.id, STOCK_MOVEMENT_STORE_KEY, nextMovements, now),
    upsertStore(database, input.account.id, documentStoreKey, documents, now),
    auditStatement(database, {
      account: input.account,
      storeKey: documentStoreKey,
      action: existingIndex >= 0 ? "update" : "create",
      entityId: input.internalId,
      label: input.kind === "write_off" ? `Списание: ${date}` : `Возврат: ${date}`,
      monthKey: date.slice(0, 7),
      before,
      after: document,
      reason: `${input.kind === "write_off" ? "Списание" : "Возврат"} синхронизировано из ${input.envelope.externalSystem}`,
      now,
    }),
  ];
  if (total > 0) {
    const expenses = array(parse(loaded.get(EXPENSE_STORE_KEY), []));
    const expenseId = `integration:${input.internalId}`;
    const expenseIndex = expenses.findIndex((item) => text(item.id) === expenseId);
    const expense = {
      id: expenseId,
      date,
      accountingMonth: date.slice(0, 7),
      category: input.kind === "write_off" ? "writeoff" : "returns",
      amount: input.kind === "return" && value.direction === "to_supplier" ? -total : total,
      description: input.kind === "write_off" ? "Списание запасов" : "Возврат",
      sourceDocumentId: input.internalId,
      source: "integration",
      externalSystem: input.envelope.externalSystem,
      createdAt: expenseIndex >= 0 ? text(expenses[expenseIndex].createdAt, now, 40) : now,
      updatedAt: now,
      createdByAccountId: input.account.actorAccountId,
    };
    if (expenseIndex >= 0) expenses[expenseIndex] = expense;
    else expenses.unshift(expense);
    statements.push(upsertStore(database, input.account.id, EXPENSE_STORE_KEY, expenses, now));
  }
  await database.batch(statements);
  return { ok: true, internalId: input.internalId };
}

async function writeRecipe(input: WriterInput): Promise<BusinessWriteResult> {
  const database = getD1();
  const now = new Date().toISOString();
  const loaded = await stores(input.account.id, [ASSORTMENT_STORE_KEY]);
  const assortment = record(parse(loaded.get(ASSORTMENT_STORE_KEY), {}));
  const recipes = array(assortment.recipes);
  const balances = array(assortment.stockBalances);
  const value = record(input.data);
  const menuItemId = text(value.menuItemId);
  const existingIndex = recipes.findIndex((item) => text(item.menuItemId) === menuItemId);
  const before = existingIndex >= 0 ? { ...recipes[existingIndex] } : undefined;
  if (before && number(before.sourcePriority) > inputPriority(input.envelope)) {
    return { ok: true, internalId: text(before.id, input.internalId), duplicate: true };
  }
  if (before && before.source !== "integration" && text(before.externalId) !== input.envelope.externalId) {
    return { ok: false, code: "MANUAL_RECIPE_PROTECTED", error: "У позиции уже есть ручная техкарта. Она не перезаписана; сравните версии вручную." };
  }
  const resolvedIngredients = array(value.ingredients).map((ingredient) => {
    const requested = text(ingredient.purchaseProductKey);
    const resolved = resolveInventoryProductKey(assortment, requested) || requested;
    return requested && resolved !== requested
      ? { ...ingredient, purchaseProductKey: resolved }
      : ingredient;
  });
  const recipe = {
    ...before,
    ...value,
    id: existingIndex >= 0 ? text(before?.id, input.internalId) : input.internalId,
    menuItemId,
    status: "confirmed",
    confidence: 1,
    warnings: [],
    ingredients: resolvedIngredients,
    ...sourceMetadata(input.envelope),
    createdAt: text(before?.createdAt, now, 40),
    updatedAt: now,
  };
  if (existingIndex >= 0) recipes[existingIndex] = recipe;
  else recipes.unshift(recipe);
  for (const ingredient of resolvedIngredients) {
    const productKey = text(ingredient.purchaseProductKey);
    if (!productKey || balances.some((item) => text(item.productKey ?? item.key) === productKey)) continue;
    const base = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
    if (base.unit === "unknown") continue;
    balances.unshift({
      key: productKey,
      productKey,
      name: text(ingredient.name, "Ингредиент"),
      unit: base.unit,
      current: 0,
      averageUnitCost: 0,
      inventoryValue: 0,
      metadataSource: "integration_recipe",
      createdAt: now,
      updatedAt: now,
    });
  }
  assortment.recipes = recipes;
  assortment.stockBalances = balances;
  assortment.updatedAt = now;
  await database.batch([
    upsertStore(database, input.account.id, ASSORTMENT_STORE_KEY, assortment, now),
    auditStatement(database, {
      account: input.account,
      storeKey: ASSORTMENT_STORE_KEY,
      action: existingIndex >= 0 ? "update" : "create",
      entityId: text(recipe.id),
      label: `Техкарта: ${text(value.name, "Позиция меню")}`,
      before,
      after: recipe,
      reason: `Техкарта синхронизирована из ${input.envelope.externalSystem}`,
      now,
    }),
  ]);
  return { ok: true, internalId: text(recipe.id) };
}

function applySimpleListMutation(input: WriterInput & {
  storeKey: string;
  label: string;
  values: JsonRecord[];
  now: string;
}): { result: BusinessWriteResult; audit?: AuditInput } {
  const { values, now } = input;
  const source = record(input.data);
  const taxId = text(source.taxId);
  const email = text(source.email).toLocaleLowerCase("en");
  const phone = text(source.phone).replace(/\D/g, "");
  const strongMatches = values.map((item, index) => ({ item, index })).filter(({ item }) =>
    (taxId && text(item.taxId) === taxId)
    || (email && text(item.email).toLocaleLowerCase("en") === email)
    || (phone.length >= 7 && text(item.phone).replace(/\D/g, "") === phone)
  );
  const sourceMatches = values.map((item, index) => ({ item, index })).filter(({ item }) =>
    text(item.externalId) === input.envelope.externalId
      && text(item.externalSystem) === input.envelope.externalSystem
  );
  // External identity is authoritative. A matching display name alone must
  // never merge two source records into one BarDoctor object.
  const identityIndex = sourceMatches.length === 1
    ? sourceMatches[0].index
    : strongMatches.length === 1 ? strongMatches[0].index : -1;
  const existingIndex = values.findIndex((item) => text(item.id) === input.internalId);
  const targetIndex = existingIndex >= 0 ? existingIndex : identityIndex;
  const before = targetIndex >= 0 ? { ...values[targetIndex] } : undefined;
  const targetId = text(before?.id, input.internalId);
  if (before && number(before.sourcePriority) > inputPriority(input.envelope)) {
    return { result: { ok: true, internalId: targetId, duplicate: true } };
  }
  const status = source.active === false ? "inactive" : "active";
  const next = {
    ...before,
    ...source,
    id: targetId,
    status,
    active: source.active !== false,
    ...sourceMetadata(input.envelope),
    createdAt: text(before?.createdAt, now, 40),
    updatedAt: now,
  };
  if (targetIndex >= 0) values[targetIndex] = next;
  else values.unshift(next);
  return {
    result: { ok: true, internalId: targetId },
    audit: {
      account: input.account,
      storeKey: input.storeKey,
      action: targetIndex >= 0 ? "update" : "create",
      entityId: targetId,
      label: `${input.label}: ${text(source.name, "Без названия")}`,
      before,
      after: next,
      reason: `${input.label} синхронизирован из ${input.envelope.externalSystem}`,
      now,
    },
  };
}

async function writeSimpleList(input: WriterInput & { storeKey: string; label: string }): Promise<BusinessWriteResult> {
  const database = getD1();
  const now = new Date().toISOString();
  const loaded = await stores(input.account.id, [input.storeKey]);
  const values = array(parse(loaded.get(input.storeKey), []));
  const mutation = applySimpleListMutation({ ...input, values, now });
  if (!mutation.audit) return mutation.result;
  await database.batch([
    upsertStore(database, input.account.id, input.storeKey, values, now),
    auditStatement(database, mutation.audit),
  ]);
  return mutation.result;
}

export type WriterInput = {
  account: AuthenticatedAccount;
  entityType: IntegrationEntityType;
  data: CanonicalEntityMap[IntegrationEntityType];
  envelope: CanonicalEnvelope;
  internalId: string;
};

export async function writeCanonicalSimpleListBatch(
  inputs: WriterInput[],
): Promise<BusinessWriteResult[]> {
  if (!inputs.length) return [];
  const first = inputs[0];
  const definition = first.entityType === "supplier"
    ? { storeKey: SUPPLIER_STORE_KEY, label: "Поставщик" }
    : first.entityType === "employee"
      ? { storeKey: EMPLOYEE_STORE_KEY, label: "Сотрудник" }
      : first.entityType === "warehouse"
        ? { storeKey: WAREHOUSE_STORE_KEY, label: "Склад" }
      : null;
  if (!definition) {
    return inputs.map(() => ({
      ok: false,
      code: "BATCH_WRITER_NOT_SUPPORTED",
      error: "Пакетная запись поддерживается только для поставщиков, складов и сотрудников",
    }));
  }
  const database = getD1();
  const now = new Date().toISOString();
  const loaded = await stores(first.account.id, [definition.storeKey]);
  const values = array(parse(loaded.get(definition.storeKey), []));
  const audits: AuditInput[] = [];
  const results = inputs.map((item) => {
    if (
      item.account.id !== first.account.id
      || item.account.venueId !== first.account.venueId
      || item.entityType !== first.entityType
      || item.envelope.venueId !== item.account.venueId
    ) {
      return {
        ok: false,
        code: "TENANT_MISMATCH",
        error: "Пакет содержит данные другого заведения",
      };
    }
    const mutation = applySimpleListMutation({
      ...item,
      ...definition,
      values,
      now,
    });
    if (mutation.audit) audits.push(mutation.audit);
    return mutation.result;
  });
  if (audits.length) {
    await database.batch([
      upsertStore(database, first.account.id, definition.storeKey, values, now),
      ...batchedAuditStatements(database, audits),
    ]);
  }
  return results;
}

/** Writes canonical entities into the same domain stores used by BarDoctor UI and analytics. */
export async function writeCanonicalDomainEntity(input: WriterInput): Promise<BusinessWriteResult> {
  if (input.envelope.venueId !== input.account.venueId) {
    return { ok: false, code: "TENANT_MISMATCH", error: "Запись относится к другому заведению" };
  }
  if (input.entityType === "product") return writeProduct(input);
  if (input.entityType === "warehouse") {
    return writeSimpleList({ ...input, storeKey: WAREHOUSE_STORE_KEY, label: "Склад" });
  }
  if (input.entityType === "stock_balance") return writeStockBalance(input);
  if (input.entityType === "write_off") return writeInventoryDocument({ ...input, kind: "write_off" });
  if (input.entityType === "return") return writeInventoryDocument({ ...input, kind: "return" });
  if (input.entityType === "recipe") return writeRecipe(input);
  if (input.entityType === "supplier") {
    return writeSimpleList({ ...input, storeKey: SUPPLIER_STORE_KEY, label: "Поставщик" });
  }
  if (input.entityType === "employee") {
    return writeSimpleList({ ...input, storeKey: EMPLOYEE_STORE_KEY, label: "Сотрудник" });
  }
  return { ok: false, code: "WRITER_NOT_SUPPORTED", error: "Для типа данных не найден доменный write-path" };
}
