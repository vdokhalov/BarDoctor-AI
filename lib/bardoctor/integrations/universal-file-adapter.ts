import * as XLSX from "xlsx";
import { assertSpreadsheetInput } from "../spreadsheet-safety";
import { normalizePurchaseDocument } from "../purchases";
import { normalizeSalesDocument } from "../sales";
import {
  INTEGRATION_ENTITY_TYPES,
  type AdapterContext,
  type AdapterInput,
  type AdapterResult,
  type CanonicalEnvelope,
  type CanonicalPurchaseDocument,
  type CanonicalPurchaseItem,
  type CanonicalSale,
  type CanonicalSaleItem,
  type ExternalProductReference,
  type FieldMapping,
  type IntegrationAdapter,
  type IntegrationEntityType,
} from "./contracts";
import {
  applyFieldMapping,
  headerSignature,
  missingRequiredFields,
  suggestFieldMapping,
} from "./field-mapping";

type JsonRecord = Record<string, unknown>;

const MAX_RECORDS = 2_000;
const MAX_ITEMS_PER_DOCUMENT = 1_000;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, fallback = "", max = 320): string {
  if (value == null) return fallback;
  const result = String(value).trim();
  return result ? result.slice(0, max) : fallback;
}

function number(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value)
    .replace(/\s/g, "")
    .replace(/(?<=\d)[,.](?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLocaleLowerCase("ru");
  if (["0", "false", "no", "нет", "inactive", "уволен", "disabled"].includes(normalized)) return false;
  if (["1", "true", "yes", "да", "active", "активен", "enabled"].includes(normalized)) return true;
  return fallback;
}

function normalizeKey(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, "");
}

function rowLookup(value: unknown): Map<string, unknown> {
  return new Map(
    Object.entries(record(value)).map(([key, cell]) => [normalizeKey(key), cell]),
  );
}

function pick(row: Map<string, unknown>, ...aliases: string[]): unknown {
  for (const alias of aliases) {
    const value = row.get(normalizeKey(alias));
    if (value != null && text(value)) return value;
  }
  return undefined;
}

function normalizedDate(value: unknown, fallback: string): string {
  const candidate = text(value, "", 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  const dotted = candidate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotted) {
    return `${dotted[3]}-${dotted[2].padStart(2, "0")}-${dotted[1].padStart(2, "0")}`;
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed.toISOString().slice(0, 10);
}

function stableId(prefix: string, values: unknown[]): string {
  const source = values.map((value) => text(value).toLocaleLowerCase("ru")).join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const readable = source.replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${prefix}-${readable || "record"}-${(hash >>> 0).toString(16)}`.slice(0, 120);
}

function entityType(value: unknown): IntegrationEntityType | null {
  const normalized = text(value).toLocaleLowerCase("en").replace(/-/g, "_");
  const aliases: Record<string, IntegrationEntityType> = {
    products: "product",
    warehouses: "warehouse",
    warehouse: "warehouse",
    склады: "warehouse",
    purchase: "purchase_document",
    purchases: "purchase_document",
    purchase_documents: "purchase_document",
    sales: "sale",
    sales_document: "sale",
    sales_documents: "sale",
    stock: "stock_balance",
    balances: "stock_balance",
    writeoffs: "write_off",
    returns: "return",
    recipes: "recipe",
    techcards: "recipe",
    suppliers: "supplier",
    employees: "employee",
  };
  const candidate = aliases[normalized] ?? normalized;
  return INTEGRATION_ENTITY_TYPES.includes(candidate as IntegrationEntityType)
    ? candidate as IntegrationEntityType
    : null;
}

function operation(value: unknown): "upsert" | "cancel" | "delete" {
  const normalized = text(value).toLocaleLowerCase("ru");
  if (["cancel", "cancelled", "canceled", "отмена", "отменить"].includes(normalized)) return "cancel";
  if (["delete", "deleted", "remove", "удаление", "удалить"].includes(normalized)) return "delete";
  return "upsert";
}

function externalProduct(value: unknown, index: number): ExternalProductReference {
  const item = record(value);
  const name = text(item.name ?? item.productName ?? item.menuItem, `Позиция ${index + 1}`, 240);
  const unit = text(item.unit, "", 40) || undefined;
  const packageSize = text(item.packageSize ?? item.package, "", 100) || undefined;
  return {
    externalId: text(
      item.externalProductId ?? item.productExternalId ?? item.externalId ?? item.sku ?? item.barcode,
      stableId("product", [name, packageSize, unit]),
      180,
    ),
    name,
    unit,
    packageSize,
    barcode: text(item.barcode, "", 80) || undefined,
  };
}

function purchaseEnvelope(value: unknown, context: AdapterContext, index: number): CanonicalEnvelope<"purchase_document"> {
  const input = record(value);
  const externalId = text(
    input.externalId ?? input.documentExternalId ?? input.documentNumber ?? input.number,
    stableId("purchase", [input.date, input.supplierName, input.total, index]),
    180,
  );
  const rawItems = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS_PER_DOCUMENT) : [];
  const normalized = normalizePurchaseDocument({
    ...input,
    id: crypto.randomUUID(),
    source: "upload",
    status: "draft",
  });
  const items = normalized.items.map((item, itemIndex): CanonicalPurchaseItem => ({
    ...item,
    externalProduct: externalProduct(rawItems[itemIndex] ?? item, itemIndex),
  }));
  return {
    entityType: "purchase_document",
    externalId,
    externalSystem: context.externalSystem,
    venueId: context.venueId,
    sourceType: context.sourceType,
    operation: operation(input.operation),
    createdAt: text(input.createdAt, "", 40) || undefined,
    updatedAt: text(input.updatedAt, "", 40) || undefined,
    externalUpdatedAt: text(input.externalUpdatedAt ?? input.modifiedAt, "", 40) || undefined,
    syncStatus: "pending",
    data: { ...normalized, items } as CanonicalPurchaseDocument,
    raw: value,
  };
}

function saleEnvelope(value: unknown, context: AdapterContext, index: number): CanonicalEnvelope<"sale"> {
  const input = record(value);
  const externalId = text(
    input.externalId ?? input.saleExternalId ?? input.reportExternalId ?? input.reportNumber ?? input.number,
    stableId("sale", [input.date, input.sourceSystem, input.totalRevenue, index]),
    180,
  );
  const rawItems = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS_PER_DOCUMENT) : [];
  const normalized = normalizeSalesDocument({
    ...input,
    id: crypto.randomUUID(),
    status: "draft",
  });
  const items = normalized.items.map((item, itemIndex): CanonicalSaleItem => ({
    ...item,
    externalProduct: externalProduct(rawItems[itemIndex] ?? item, itemIndex),
  }));
  return {
    entityType: "sale",
    externalId,
    externalSystem: context.externalSystem,
    venueId: context.venueId,
    sourceType: context.sourceType,
    operation: operation(input.operation),
    createdAt: text(input.createdAt, "", 40) || undefined,
    updatedAt: text(input.updatedAt, "", 40) || undefined,
    externalUpdatedAt: text(input.externalUpdatedAt ?? input.modifiedAt, "", 40) || undefined,
    syncStatus: "pending",
    data: { ...normalized, items } as CanonicalSale,
    raw: value,
  };
}

function genericEnvelope(
  value: unknown,
  type: Exclude<IntegrationEntityType, "purchase_document" | "sale">,
  context: AdapterContext,
  index: number,
): CanonicalEnvelope {
  const input = record(value);
  const externalId = text(
    input.externalId ?? input.documentExternalId ?? input.recipeExternalId
      ?? input.productExternalId ?? input.id ?? input.sku ?? input.barcode,
    stableId(type, [input.name, input.date, input.unit, index]),
    180,
  );
  return {
    entityType: type,
    externalId,
    externalSystem: context.externalSystem,
    venueId: context.venueId,
    sourceType: context.sourceType,
    operation: operation(input.operation),
    createdAt: text(input.createdAt, "", 40) || undefined,
    updatedAt: text(input.updatedAt, "", 40) || undefined,
    externalUpdatedAt: text(input.externalUpdatedAt ?? input.modifiedAt, "", 40) || undefined,
    syncStatus: "pending",
    data: input as never,
    raw: value,
  };
}

function flatPurchaseRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  const groups = new Map<string, JsonRecord & { items: JsonRecord[]; _hasDocumentTotal?: boolean }>();
  rows.slice(0, MAX_RECORDS).forEach((rowValue, index) => {
    const row = rowLookup(rowValue);
    const date = normalizedDate(pick(row, "date", "documentDate", "дата"), context.now.slice(0, 10));
    const supplierName = text(pick(row, "supplierName", "supplier", "vendor", "поставщик"), "Новый поставщик");
    const documentNumber = text(pick(row, "documentNumber", "number", "номерДокумента", "номер"));
    const documentExternalId = text(
      pick(row, "documentExternalId", "purchaseExternalId", "externalDocumentId", "documentId"),
      stableId("purchase", [documentNumber, date, supplierName]),
    );
    const group = groups.get(documentExternalId) ?? {
      externalId: documentExternalId,
      documentNumber,
      date,
      supplierName,
      supplierType: text(pick(row, "supplierType", "типПоставщика"), "wholesale"),
      currency: text(pick(row, "currency", "валюта"), "MDL"),
      paymentMethod: text(pick(row, "paymentMethod", "оплата"), "unknown"),
      expenseCategory: text(pick(row, "expenseCategory", "категорияРасхода"), "products"),
      total: number(pick(row, "documentTotal", "total", "итого")),
      _hasDocumentTotal: number(pick(row, "documentTotal", "total", "итого")) > 0,
      externalUpdatedAt: text(pick(row, "externalUpdatedAt", "modifiedAt", "изменено")),
      operation: text(pick(row, "operation", "action", "операция")),
      items: [],
    };
    const name = text(pick(row, "productName", "itemName", "name", "товар", "наименование"), `Позиция ${index + 1}`);
    const quantity = number(pick(row, "quantity", "qty", "количество"), 1);
    const unitPrice = number(pick(row, "unitPrice", "price", "цена"));
    const lineTotal = number(pick(row, "lineTotal", "amount", "сумма"), quantity * unitPrice);
    group.items.push({
      id: stableId("line", [documentExternalId, index]),
      externalProductId: text(
        pick(row, "productExternalId", "itemExternalId", "sku", "кодТовара", "артикул", "штрихкод"),
        stableId("product", [name, pick(row, "packageSize", "package", "фасовка"), pick(row, "unit", "единица")]),
      ),
      name,
      brand: text(pick(row, "brand", "бренд")),
      quantity,
      unit: text(pick(row, "unit", "uom", "единица"), "шт."),
      packageSize: text(pick(row, "packageSize", "package", "фасовка")),
      unitPrice,
      lineTotal,
      category: text(pick(row, "category", "категория")),
      barcode: text(pick(row, "barcode", "штрихкод")),
    });
    if (!group._hasDocumentTotal) group.total = number(group.total) + lineTotal;
    groups.set(documentExternalId, group);
  });
  return [...groups.values()].map((value, index) => purchaseEnvelope(value, context, index));
}

function flatSaleRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  const groups = new Map<string, JsonRecord & { items: JsonRecord[]; _hasDocumentTotal?: boolean }>();
  rows.slice(0, MAX_RECORDS).forEach((rowValue, index) => {
    const row = rowLookup(rowValue);
    const date = normalizedDate(pick(row, "date", "reportDate", "дата"), context.now.slice(0, 10));
    const sourceSystem = text(pick(row, "sourceSystem", "posName", "касса", "система"), context.externalSystem);
    const reportNumber = text(pick(row, "reportNumber", "number", "номерОтчета", "номер"));
    const saleExternalId = text(
      pick(row, "saleExternalId", "reportExternalId", "externalDocumentId", "reportId"),
      stableId("sale", [reportNumber, date, sourceSystem]),
    );
    const group = groups.get(saleExternalId) ?? {
      externalId: saleExternalId,
      reportNumber,
      date,
      sourceSystem,
      currency: text(pick(row, "currency", "валюта"), "MDL"),
      totalRevenue: number(pick(row, "totalRevenue", "documentTotal", "выручка")),
      _hasDocumentTotal: number(pick(row, "totalRevenue", "documentTotal", "выручка")) > 0,
      checks: number(pick(row, "checks", "receipts", "чеки")),
      externalUpdatedAt: text(pick(row, "externalUpdatedAt", "modifiedAt", "изменено")),
      operation: text(pick(row, "operation", "action", "операция")),
      items: [],
    };
    const name = text(pick(row, "productName", "menuItemName", "itemName", "name", "позиция", "товар"), `Позиция ${index + 1}`);
    const quantity = number(pick(row, "quantity", "qty", "sold", "количество"));
    const grossSales = number(pick(row, "grossSales", "revenue", "amount", "сумма"));
    group.items.push({
      id: stableId("line", [saleExternalId, index]),
      externalProductId: text(
        pick(row, "productExternalId", "menuItemExternalId", "itemExternalId", "sku", "кодПозиции"),
        stableId("menu", [name]),
      ),
      name,
      quantity,
      grossSales,
    });
    if (!group._hasDocumentTotal) group.totalRevenue = number(group.totalRevenue) + grossSales;
    groups.set(saleExternalId, group);
  });
  return [...groups.values()].map((value, index) => saleEnvelope(value, context, index));
}

function flatProductRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  return rows.slice(0, MAX_RECORDS).map((rowValue, index) => {
    const row = rowLookup(rowValue);
    const value = {
      externalId: text(pick(row, "externalId", "productExternalId", "sku", "кодТовара", "артикул", "штрихкод")),
      code: text(pick(row, "code", "productCode", "код", "кодТовара")) || undefined,
      name: text(pick(row, "name", "productName", "наименование", "товар"), `Позиция ${index + 1}`),
      article: text(pick(row, "article", "vendorCode", "артикул")) || undefined,
      category: text(pick(row, "category", "groupName", "категория", "группа")) || undefined,
      groupExternalId: text(pick(row, "groupExternalId", "groupId", "кодГруппы")) || undefined,
      unit: text(pick(row, "unit", "uom", "единица")),
      packageSize: text(pick(row, "packageSize", "package", "фасовка")),
      barcode: text(pick(row, "barcode", "штрихкод")),
      sku: text(pick(row, "sku", "артикул")),
      externalUpdatedAt: text(pick(row, "externalUpdatedAt", "modifiedAt", "изменено")),
      operation: text(pick(row, "operation", "action", "операция")),
    };
    return genericEnvelope(value, "product", context, index);
  });
}

function flatWarehouseRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  return rows.slice(0, MAX_RECORDS).map((rowValue, index) => {
    const row = rowLookup(rowValue);
    const name = text(pick(row, "name", "warehouseName", "наименование", "склад"));
    return genericEnvelope({
      externalId: text(
        pick(row, "externalId", "warehouseExternalId", "warehouseId", "кодСклада", "код"),
        stableId("warehouse", [name, index]),
      ),
      code: text(pick(row, "code", "warehouseCode", "код", "кодСклада")) || undefined,
      name,
      active: boolean(pick(row, "active", "status", "активен", "статус"), true),
      externalUpdatedAt: text(pick(row, "externalUpdatedAt", "modifiedAt", "изменено")),
      operation: text(pick(row, "operation", "action", "операция")),
    }, "warehouse", context, index);
  });
}

function flatStockBalanceRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  return rows.slice(0, MAX_RECORDS).map((rowValue, index) => {
    const row = rowLookup(rowValue);
    const productName = text(pick(row, "productName", "name", "наименование", "товар"), `Позиция ${index + 1}`);
    const productExternalId = text(
      pick(row, "productExternalId", "externalProductId", "externalId", "sku", "кодТовара", "артикул"),
      stableId("product", [productName, pick(row, "packageSize", "unit")]),
    );
    const warehouseExternalId = text(pick(row, "warehouseExternalId", "warehouseId", "склад", "кодСклада"));
    const measuredAt = normalizedDate(pick(row, "measuredAt", "date", "snapshotDate", "дата"), context.now.slice(0, 10));
    return genericEnvelope({
      externalId: text(
        pick(row, "externalId", "balanceExternalId"),
        stableId("stock", [warehouseExternalId, productExternalId, measuredAt]),
      ),
      productExternalId,
      productName,
      warehouseExternalId: warehouseExternalId || undefined,
      quantity: number(pick(row, "quantity", "balance", "stock", "остаток", "количество")),
      unit: text(pick(row, "unit", "uom", "единица"), "шт."),
      measuredAt,
      totalValue: number(pick(row, "totalValue", "inventoryValue", "стоимостьОстатка")) || undefined,
      averageUnitCost: number(pick(row, "averageUnitCost", "cost", "себестоимость")) || undefined,
      externalUpdatedAt: text(pick(row, "externalUpdatedAt", "modifiedAt", "изменено")),
      operation: text(pick(row, "operation", "action", "операция")),
    }, "stock_balance", context, index);
  });
}

function flatWriteOffRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  const groups = new Map<string, JsonRecord & { items: JsonRecord[] }>();
  rows.slice(0, MAX_RECORDS).forEach((rowValue, index) => {
    const row = rowLookup(rowValue);
    const date = normalizedDate(pick(row, "date", "documentDate", "дата"), context.now.slice(0, 10));
    const documentExternalId = text(
      pick(row, "documentExternalId", "writeOffExternalId", "externalId", "idДокумента"),
      stableId("writeoff", [date, pick(row, "reason", "причина")]),
    );
    const group = groups.get(documentExternalId) ?? {
      externalId: documentExternalId,
      documentExternalId,
      date,
      reason: text(pick(row, "reason", "причина")),
      warehouseExternalId: text(pick(row, "warehouseExternalId", "warehouseId", "склад")),
      currency: text(pick(row, "currency", "валюта"), "MDL"),
      total: 0,
      operation: text(pick(row, "operation", "action", "операция")),
      items: [],
    };
    const name = text(pick(row, "productName", "itemName", "name", "товар", "наименование"), `Позиция ${index + 1}`);
    const amount = number(pick(row, "amount", "lineTotal", "сумма"));
    group.items.push({
      productExternalId: text(
        pick(row, "productExternalId", "externalProductId", "sku", "кодТовара", "артикул"),
        stableId("product", [name, pick(row, "unit", "единица")]),
      ),
      name,
      quantity: number(pick(row, "quantity", "qty", "количество")),
      unit: text(pick(row, "unit", "uom", "единица"), "шт."),
      amount: amount || undefined,
    });
    group.total = number(group.total) + amount;
    groups.set(documentExternalId, group);
  });
  return [...groups.values()].map((value, index) => genericEnvelope(value, "write_off", context, index));
}

function flatReturnRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  const groups = new Map<string, JsonRecord & { items: JsonRecord[] }>();
  rows.slice(0, MAX_RECORDS).forEach((rowValue, index) => {
    const row = rowLookup(rowValue);
    const date = normalizedDate(pick(row, "date", "documentDate", "дата"), context.now.slice(0, 10));
    const documentExternalId = text(
      pick(row, "documentExternalId", "returnExternalId", "externalId", "idДокумента"),
      stableId("return", [date, pick(row, "direction", "направление")]),
    );
    const directionValue = text(pick(row, "direction", "типВозврата", "направление"), "to_supplier").toLocaleLowerCase("ru");
    const direction = directionValue === "from_customer" || /клиент|гост|покупател/.test(directionValue)
      ? "from_customer"
      : "to_supplier";
    const group = groups.get(documentExternalId) ?? {
      externalId: documentExternalId,
      documentExternalId,
      date,
      direction,
      supplierExternalId: text(pick(row, "supplierExternalId", "supplierId", "кодПоставщика")),
      saleExternalId: text(pick(row, "saleExternalId", "saleId", "кодПродажи")),
      currency: text(pick(row, "currency", "валюта"), "MDL"),
      operation: text(pick(row, "operation", "action", "операция")),
      items: [],
    };
    const name = text(pick(row, "productName", "itemName", "name", "товар", "наименование"), `Позиция ${index + 1}`);
    group.items.push({
      productExternalId: text(
        pick(row, "productExternalId", "externalProductId", "sku", "кодТовара", "артикул"),
        stableId("product", [name, pick(row, "unit", "единица")]),
      ),
      name,
      quantity: number(pick(row, "quantity", "qty", "количество")),
      unit: text(pick(row, "unit", "uom", "единица"), "шт."),
      amount: number(pick(row, "amount", "lineTotal", "сумма")) || undefined,
    });
    groups.set(documentExternalId, group);
  });
  return [...groups.values()].map((value, index) => genericEnvelope(value, "return", context, index));
}

function flatRecipeRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  const groups = new Map<string, JsonRecord & { ingredients: JsonRecord[] }>();
  rows.slice(0, MAX_RECORDS).forEach((rowValue, index) => {
    const row = rowLookup(rowValue);
    const name = text(pick(row, "name", "menuItemName", "recipeName", "блюдо", "наименование"), `Техкарта ${index + 1}`);
    const menuItemExternalId = text(
      pick(row, "menuItemExternalId", "menuItemId", "dishId", "кодБлюда"),
      stableId("menu", [name]),
    );
    const recipeExternalId = text(
      pick(row, "recipeExternalId", "externalId", "recipeId", "idТехкарты"),
      stableId("recipe", [menuItemExternalId, name]),
    );
    const group = groups.get(recipeExternalId) ?? {
      externalId: recipeExternalId,
      recipeExternalId,
      menuItemExternalId,
      name,
      portions: Math.max(1, number(pick(row, "portions", "yield", "порций", "выход"), 1)),
      operation: text(pick(row, "operation", "action", "операция")),
      ingredients: [],
    };
    const ingredientName = text(pick(row, "ingredientName", "productName", "ingredient", "ингредиент"), `Ингредиент ${index + 1}`);
    group.ingredients.push({
      productExternalId: text(
        pick(row, "productExternalId", "ingredientExternalId", "ingredientId", "кодИнгредиента"),
        stableId("product", [ingredientName, pick(row, "unit", "единица")]),
      ),
      name: ingredientName,
      quantity: number(pick(row, "quantity", "qty", "количество")),
      unit: text(pick(row, "unit", "uom", "единица"), "г"),
    });
    groups.set(recipeExternalId, group);
  });
  return [...groups.values()].map((value, index) => genericEnvelope(value, "recipe", context, index));
}

function flatSupplierRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  return rows.slice(0, MAX_RECORDS).map((rowValue, index) => {
    const row = rowLookup(rowValue);
    // An invented display name turns a malformed row into a real supplier and
    // makes the source error hard to repair later. Keep required values empty
    // so canonical validation can reject the row with an actionable message.
    const name = text(pick(row, "name", "supplierName", "поставщик", "контрагент"));
    return genericEnvelope({
      externalId: text(
        pick(row, "externalId", "supplierExternalId", "id", "кодПоставщика", "код"),
        stableId("supplier", [name, pick(row, "taxId", "inn", "инн")]),
      ),
      code: text(pick(row, "code", "supplierCode", "код", "кодПоставщика")) || undefined,
      name,
      taxId: text(pick(row, "taxId", "inn", "vatNumber", "инн", "фискальныйКод")) || undefined,
      phone: text(pick(row, "phone", "телефон")) || undefined,
      email: text(pick(row, "email", "почта")) || undefined,
      active: boolean(pick(row, "active", "status", "активен", "статус"), true),
      operation: text(pick(row, "operation", "action", "операция")),
    }, "supplier", context, index);
  });
}

function flatEmployeeRows(rows: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  return rows.slice(0, MAX_RECORDS).map((rowValue, index) => {
    const row = rowLookup(rowValue);
    const name = text(pick(row, "name", "fullName", "employeeName", "фио", "сотрудник"));
    return genericEnvelope({
      externalId: text(
        pick(row, "externalId", "employeeExternalId", "id", "табельныйНомер", "код"),
        stableId("employee", [name, pick(row, "email", "phone")]),
      ),
      name,
      role: text(pick(row, "role", "position", "должность")) || undefined,
      phone: text(pick(row, "phone", "телефон")) || undefined,
      email: text(pick(row, "email", "почта")) || undefined,
      active: boolean(pick(row, "active", "status", "активен", "статус"), true),
      operation: text(pick(row, "operation", "action", "операция")),
    }, "employee", context, index);
  });
}

function xmlDecode(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlScalars(fragment: string): JsonRecord {
  const result: JsonRecord = {};
  const pattern = /<([A-Za-z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
  for (const match of fragment.matchAll(pattern)) {
    if (/<[A-Za-z_][\w.-]*\b/.test(match[2])) continue;
    result[match[1]] = xmlDecode(match[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
  }
  return result;
}

function parseXml(bytes: Uint8Array): { type: IntegrationEntityType | null; system?: string; records: unknown[] } {
  const xml = new TextDecoder().decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DOCTYPE и внешние XML-сущности запрещены");
  const root = xml.match(/<BarDoctorImport\b([^>]*)>/i);
  if (!root) throw new Error("Ожидается корневой элемент <BarDoctorImport>");
  const attr = (name: string) => root[1].match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const result: unknown[] = [];
  for (const match of xml.matchAll(/<Record\b[^>]*>([\s\S]*?)<\/Record>/gi)) {
    const body = match[1];
    const value = xmlScalars(body);
    const itemContainer = body.match(/<Items\b[^>]*>([\s\S]*?)<\/Items>/i)?.[1] ?? "";
    const items = [...itemContainer.matchAll(/<Item\b[^>]*>([\s\S]*?)<\/Item>/gi)]
      .map((item) => xmlScalars(item[1]));
    if (items.length) value.items = items;
    result.push(value);
  }
  return { type: entityType(attr("entityType")), system: attr("externalSystem"), records: result };
}

function spreadsheetRows(bytes: Uint8Array, csv = false): unknown[] {
  assertSpreadsheetInput(bytes);
  const workbook = csv
    // CSV calendar values are already text. Letting SheetJS infer Date objects
    // makes an ISO date drift to the previous day in negative UTC offsets.
    ? XLSX.read(new TextDecoder("utf-8").decode(bytes), { type: "string", cellDates: false, raw: true, sheetRows: MAX_RECORDS + 1 })
    : XLSX.read(bytes, { type: "array", cellDates: true, sheetRows: MAX_RECORDS + 1 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("В файле нет листов");
  return XLSX.utils.sheet_to_json<JsonRecord>(workbook.Sheets[sheetName], {
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });
}

function recordsFor(type: IntegrationEntityType, values: unknown[], context: AdapterContext): CanonicalEnvelope[] {
  if (type === "purchase_document") {
    const nested = values.some((value) => Array.isArray(record(value).items));
    return nested
      ? values.slice(0, MAX_RECORDS).map((value, index) => purchaseEnvelope(value, context, index))
      : flatPurchaseRows(values, context);
  }
  if (type === "sale") {
    const nested = values.some((value) => Array.isArray(record(value).items));
    return nested
      ? values.slice(0, MAX_RECORDS).map((value, index) => saleEnvelope(value, context, index))
      : flatSaleRows(values, context);
  }
  if (type === "product") return flatProductRows(values, context);
  if (type === "warehouse") return flatWarehouseRows(values, context);
  if (type === "stock_balance") return flatStockBalanceRows(values, context);
  if (type === "write_off") {
    const nested = values.some((value) => Array.isArray(record(value).items));
    return nested
      ? values.slice(0, MAX_RECORDS).map((value, index) => genericEnvelope(value, type, context, index))
      : flatWriteOffRows(values, context);
  }
  if (type === "return") {
    const nested = values.some((value) => Array.isArray(record(value).items));
    return nested
      ? values.slice(0, MAX_RECORDS).map((value, index) => genericEnvelope(value, type, context, index))
      : flatReturnRows(values, context);
  }
  if (type === "recipe") {
    const nested = values.some((value) => Array.isArray(record(value).ingredients));
    return nested
      ? values.slice(0, MAX_RECORDS).map((value, index) => genericEnvelope(value, type, context, index))
      : flatRecipeRows(values, context);
  }
  if (type === "supplier") return flatSupplierRows(values, context);
  return flatEmployeeRows(values, context);
}

export type UniversalFileInspection = {
  entityType: IntegrationEntityType | null;
  headers: string[];
  fileKind: "json" | "xml" | "spreadsheet";
  headerSignature: string;
  suggestedMapping: FieldMapping;
  missingRequired: Array<{ target: string; label: string }>;
  sample: Record<string, unknown>[];
  recordCount: number;
};

export type UniversalFileRows = {
  detectedType: IntegrationEntityType | null;
  externalSystem?: string;
  values: unknown[];
  fileKind: UniversalFileInspection["fileKind"];
};

export async function parseUniversalFileRows(input: AdapterInput): Promise<UniversalFileRows> {
  const extension = text(input.fileName).split(".").pop()?.toLocaleLowerCase("en") ?? "";
  const mediaType = text(input.mediaType, "", 160).toLocaleLowerCase("en");
  const xmlMediaType = /^(?:application|text)\/(?:[a-z0-9.+-]+\+)?xml(?:\s*;|$)/i.test(mediaType);
  if (input.json !== undefined || extension === "json" || input.mediaType?.includes("json")) {
    const parsed = input.json ?? JSON.parse(new TextDecoder().decode(input.bytes));
    const root = record(parsed);
    return {
      detectedType: input.entityType ?? entityType(root.entityType ?? root.type),
      externalSystem: text(root.externalSystem) || undefined,
      values: Array.isArray(parsed)
        ? parsed
        : Array.isArray(root.records)
          ? root.records
          : root.data && typeof root.data === "object"
            ? [root.data]
            : [],
      fileKind: "json",
    };
  }
  if (extension === "xml" || xmlMediaType) {
    if (!input.bytes) throw new Error("XML-файл пуст");
    const parsed = parseXml(input.bytes);
    return {
      detectedType: input.entityType ?? parsed.type,
      externalSystem: parsed.system,
      values: parsed.records,
      fileKind: "xml",
    };
  }
  if (!input.bytes) throw new Error("Файл пуст");
  return {
    detectedType: input.entityType ?? null,
    values: spreadsheetRows(input.bytes, extension === "csv"),
    fileKind: "spreadsheet",
  };
}

function mappedValues(values: unknown[], mapping?: FieldMapping): unknown[] {
  if (!mapping || !Object.keys(mapping).length) return values;
  return values.map((value) => applyFieldMapping(value, mapping));
}

export async function inspectUniversalFile(input: AdapterInput): Promise<UniversalFileInspection> {
  const parsed = await parseUniversalFileRows(input);
  const headers = [...new Set(parsed.values.slice(0, 50).flatMap((value) => Object.keys(record(value))))];
  const suggestedMapping = parsed.detectedType
    ? suggestFieldMapping(headers, parsed.detectedType)
    : {};
  const missing = parsed.detectedType
    ? missingRequiredFields(suggestedMapping, parsed.detectedType)
    : [];
  return {
    entityType: parsed.detectedType,
    headers,
    fileKind: parsed.fileKind,
    headerSignature: headerSignature(headers, parsed.fileKind),
    suggestedMapping,
    missingRequired: missing.map(({ target, label }) => ({ target, label })),
    sample: parsed.values.slice(0, 5).map(record),
    recordCount: parsed.values.length,
  };
}

export class UniversalFileAdapter implements IntegrationAdapter {
  readonly key = "universal-file-v1";
  readonly channels = ["file"] as const;
  readonly capabilities = INTEGRATION_ENTITY_TYPES;
  private lastCursor: Record<string, string | number | boolean | null> | null = null;

  async normalize(input: AdapterInput, originalContext: AdapterContext): Promise<AdapterResult> {
    const parsed = await parseUniversalFileRows(input);
    const values = mappedValues(parsed.values, input.fieldMapping);
    const detectedType = parsed.detectedType;
    let context = originalContext;
    const warnings: string[] = [];
    if (parsed.externalSystem) context = { ...context, externalSystem: parsed.externalSystem };

    if (!detectedType) throw new Error("Выберите тип данных в файле");
    if (!values.length) throw new Error("В файле нет записей");
    if (values.length > MAX_RECORDS) warnings.push(`Обработаны первые ${MAX_RECORDS} строк.`);
    if (input.fieldMapping) {
      const missing = missingRequiredFields(input.fieldMapping, detectedType);
      if (missing.length) {
        throw new Error(`Не сопоставлены обязательные поля: ${missing.map((item) => item.label).join(", ")}`);
      }
    }

    const records = recordsFor(detectedType, values, context);
    if (!records.length) throw new Error("Не удалось собрать записи из файла");
    this.lastCursor = { processed: records.length, importedAt: context.now };
    return { entityType: detectedType, records, warnings };
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true, message: "Универсальный файловый адаптер готов" };
  }

  getLastSyncCursor(): Record<string, string | number | boolean | null> | null {
    return this.lastCursor;
  }
}
