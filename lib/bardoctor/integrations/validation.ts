import {
  INTEGRATION_SOURCE_TYPES,
  type CanonicalEnvelope,
  type CanonicalPurchaseDocument,
  type CanonicalSale,
  type Employee,
  type Product,
  type Recipe,
  type Return,
  type StockBalance,
  type Supplier,
  type Warehouse,
  type WriteOff,
} from "./contracts";

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

function isoDate(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function positive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function nonNegative(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function present(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function validateItems(
  issues: ValidationIssue[],
  items: Array<{ productExternalId?: unknown; name?: unknown; quantity?: unknown; unit?: unknown }>,
  prefix: string,
): void {
  if (!items.length) {
    issues.push({ path: prefix, code: "ITEMS_REQUIRED", message: "В документе нет позиций" });
    return;
  }
  items.forEach((item, index) => {
    if (!present(item.productExternalId)) {
      issues.push({ path: `${prefix}.${index}.productExternalId`, code: "PRODUCT_EXTERNAL_ID_REQUIRED", message: `У позиции ${index + 1} нет внешнего кода товара` });
    }
    if (!positive(item.quantity)) {
      issues.push({ path: `${prefix}.${index}.quantity`, code: "QUANTITY_INVALID", message: `У позиции ${index + 1} некорректное количество` });
    }
    if (!present(item.unit)) {
      issues.push({ path: `${prefix}.${index}.unit`, code: "UNIT_REQUIRED", message: `У позиции ${index + 1} нет единицы измерения` });
    }
  });
}

export function validateCanonicalEnvelope(envelope: CanonicalEnvelope): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!present(envelope.externalId)) {
    issues.push({ path: "externalId", code: "EXTERNAL_ID_REQUIRED", message: "У записи нет внешнего идентификатора" });
  }
  if (!present(envelope.externalSystem)) {
    issues.push({ path: "externalSystem", code: "EXTERNAL_SYSTEM_REQUIRED", message: "Не указан источник данных" });
  }
  if (!Number.isInteger(envelope.venueId) || envelope.venueId <= 0) {
    issues.push({ path: "venueId", code: "VENUE_REQUIRED", message: "Не указано заведение" });
  }
  if (!INTEGRATION_SOURCE_TYPES.includes(envelope.sourceType)) {
    issues.push({ path: "sourceType", code: "SOURCE_TYPE_INVALID", message: "Неизвестный тип источника" });
  }
  if (envelope.operation === "cancel" || envelope.operation === "delete") return issues;
  if (envelope.entityType === "purchase_document") {
    const document = envelope.data as CanonicalPurchaseDocument;
    if (!isoDate(document.date)) issues.push({ path: "date", code: "DATE_INVALID", message: "Некорректная дата накладной" });
    if (!present(document.supplierName)) issues.push({ path: "supplierName", code: "SUPPLIER_REQUIRED", message: "Не указан поставщик" });
    if (!document.items.length) issues.push({ path: "items", code: "ITEMS_REQUIRED", message: "В накладной нет позиций" });
    if (document.documentType !== "price_list" && !positive(document.total)) {
      issues.push({ path: "total", code: "TOTAL_INVALID", message: "Сумма накладной должна быть больше нуля" });
    }
    document.items.forEach((item, index) => {
      if (!present(item.externalProduct?.externalId)) {
        issues.push({ path: `items.${index}.externalProduct.externalId`, code: "PRODUCT_EXTERNAL_ID_REQUIRED", message: `У позиции ${index + 1} нет внешнего кода` });
      }
      if (!present(item.name)) issues.push({ path: `items.${index}.name`, code: "PRODUCT_NAME_REQUIRED", message: `У позиции ${index + 1} нет названия` });
      if (!positive(item.quantity)) issues.push({ path: `items.${index}.quantity`, code: "QUANTITY_INVALID", message: `У позиции «${item.name}» некорректное количество` });
      if (document.documentType !== "price_list" && !positive(item.lineTotal)) {
        issues.push({ path: `items.${index}.lineTotal`, code: "LINE_TOTAL_INVALID", message: `У позиции «${item.name}» нет суммы` });
      }
    });
  }
  if (envelope.entityType === "sale") {
    const document = envelope.data as CanonicalSale;
    if (!isoDate(document.date)) issues.push({ path: "date", code: "DATE_INVALID", message: "Некорректная дата продаж" });
    if (!document.items.length) issues.push({ path: "items", code: "ITEMS_REQUIRED", message: "В отчёте нет проданных позиций" });
    document.items.forEach((item, index) => {
      if (!present(item.externalProduct?.externalId)) {
        issues.push({ path: `items.${index}.externalProduct.externalId`, code: "PRODUCT_EXTERNAL_ID_REQUIRED", message: `У позиции ${index + 1} нет внешнего кода` });
      }
      if (!positive(item.quantity)) issues.push({ path: `items.${index}.quantity`, code: "QUANTITY_INVALID", message: `У позиции «${item.name}» некорректное количество` });
    });
  }
  if (envelope.entityType === "product") {
    const value = envelope.data as Product;
    if (!present(value.name)) {
      issues.push({ path: "name", code: "PRODUCT_NAME_REQUIRED", message: "У товара нет названия" });
    }
  }
  if (envelope.entityType === "warehouse") {
    const value = envelope.data as Warehouse;
    if (!present(value.name)) {
      issues.push({ path: "name", code: "WAREHOUSE_NAME_REQUIRED", message: "У склада нет названия" });
    }
  }
  if (envelope.entityType === "stock_balance") {
    const value = envelope.data as StockBalance;
    if (!present(value.productExternalId)) issues.push({ path: "productExternalId", code: "PRODUCT_EXTERNAL_ID_REQUIRED", message: "Не указан внешний код товара" });
    if (!nonNegative(value.quantity)) issues.push({ path: "quantity", code: "QUANTITY_INVALID", message: "Остаток должен быть неотрицательным числом" });
    if (!present(value.unit)) issues.push({ path: "unit", code: "UNIT_REQUIRED", message: "Не указана единица остатка" });
    if (!isoDate(value.measuredAt)) issues.push({ path: "measuredAt", code: "DATE_INVALID", message: "Некорректная дата остатка" });
  }
  if (envelope.entityType === "write_off") {
    const value = envelope.data as WriteOff;
    if (!isoDate(value.date)) issues.push({ path: "date", code: "DATE_INVALID", message: "Некорректная дата списания" });
    validateItems(issues, Array.isArray(value.items) ? value.items : [], "items");
  }
  if (envelope.entityType === "return") {
    const value = envelope.data as Return;
    if (!isoDate(value.date)) issues.push({ path: "date", code: "DATE_INVALID", message: "Некорректная дата возврата" });
    if (value.direction !== "to_supplier" && value.direction !== "from_customer") {
      issues.push({ path: "direction", code: "RETURN_DIRECTION_INVALID", message: "Неизвестное направление возврата" });
    }
    validateItems(issues, Array.isArray(value.items) ? value.items : [], "items");
  }
  if (envelope.entityType === "recipe") {
    const value = envelope.data as Recipe;
    if (!present(value.menuItemExternalId)) issues.push({ path: "menuItemExternalId", code: "MENU_ITEM_EXTERNAL_ID_REQUIRED", message: "Не указан внешний код блюда" });
    if (!present(value.name)) issues.push({ path: "name", code: "RECIPE_NAME_REQUIRED", message: "Не указано название техкарты" });
    validateItems(issues, Array.isArray(value.ingredients) ? value.ingredients : [], "ingredients");
    if (value.portions !== undefined && !positive(value.portions)) issues.push({ path: "portions", code: "PORTIONS_INVALID", message: "Количество порций должно быть больше нуля" });
  }
  if (envelope.entityType === "supplier") {
    const value = envelope.data as Supplier;
    if (!present(value.name)) issues.push({ path: "name", code: "SUPPLIER_REQUIRED", message: "Не указано название поставщика" });
  }
  if (envelope.entityType === "employee") {
    const value = envelope.data as Employee;
    if (!present(value.name)) issues.push({ path: "name", code: "EMPLOYEE_NAME_REQUIRED", message: "Не указано имя сотрудника" });
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
      issues.push({ path: "email", code: "EMAIL_INVALID", message: "Некорректный email сотрудника" });
    }
  }
  return issues;
}
