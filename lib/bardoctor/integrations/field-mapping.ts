import type { FieldMapping, IntegrationEntityType } from "./contracts";

export type FieldDefinition = {
  target: string;
  label: string;
  required: boolean;
  aliases: string[];
};

const commonProduct = [
  { target: "productExternalId", label: "Внешний код товара", required: true, aliases: ["productExternalId", "externalProductId", "itemExternalId", "sku", "код товара", "код", "артикул", "штрихкод"] },
  { target: "productName", label: "Наименование товара", required: true, aliases: ["productName", "itemName", "menuItemName", "name", "наименование", "товар", "позиция"] },
  { target: "unit", label: "Единица", required: false, aliases: ["unit", "uom", "ед", "единица", "единица измерения"] },
  { target: "packageSize", label: "Фасовка", required: false, aliases: ["packageSize", "package", "фасовка", "упаковка"] },
] satisfies FieldDefinition[];

const operation = {
  target: "operation",
  label: "Операция (upsert/cancel/delete)",
  required: false,
  aliases: ["operation", "action", "операция", "действие"],
} satisfies FieldDefinition;

export const FIELD_DEFINITIONS: Record<IntegrationEntityType, FieldDefinition[]> = {
  product: [
    { target: "externalId", label: "Внешний код", required: true, aliases: ["externalId", "productExternalId", "id", "sku", "код товара", "код", "артикул", "штрихкод"] },
    { target: "name", label: "Наименование", required: true, aliases: ["name", "productName", "наименование", "товар"] },
    { target: "unit", label: "Единица", required: false, aliases: ["unit", "uom", "ед", "единица", "единица измерения"] },
    { target: "packageSize", label: "Фасовка", required: false, aliases: ["packageSize", "package", "фасовка", "упаковка"] },
    { target: "barcode", label: "Штрихкод", required: false, aliases: ["barcode", "штрихкод", "ean"] },
    { target: "sku", label: "Артикул", required: false, aliases: ["sku", "артикул"] },
    { target: "externalUpdatedAt", label: "Изменено во внешней системе", required: false, aliases: ["externalUpdatedAt", "modifiedAt", "updatedAt", "изменено"] },
    operation,
  ],
  warehouse: [
    { target: "externalId", label: "Внешний код склада", required: true, aliases: ["externalId", "warehouseExternalId", "warehouseId", "код склада", "код"] },
    { target: "code", label: "Код", required: false, aliases: ["code", "warehouseCode", "код", "код склада"] },
    { target: "name", label: "Название склада", required: true, aliases: ["name", "warehouseName", "наименование", "склад"] },
    { target: "active", label: "Активен", required: false, aliases: ["active", "status", "активен", "статус"] },
    { target: "externalUpdatedAt", label: "Изменено во внешней системе", required: false, aliases: ["externalUpdatedAt", "modifiedAt", "updatedAt", "изменено"] },
    operation,
  ],
  purchase_document: [
    { target: "documentExternalId", label: "Внешний код документа", required: true, aliases: ["documentExternalId", "purchaseExternalId", "externalDocumentId", "documentId", "id документа"] },
    { target: "documentNumber", label: "Номер документа", required: false, aliases: ["documentNumber", "number", "номер документа", "номер"] },
    { target: "date", label: "Дата", required: true, aliases: ["date", "documentDate", "дата"] },
    { target: "supplierName", label: "Поставщик", required: true, aliases: ["supplierName", "supplier", "vendor", "поставщик", "контрагент"] },
    { target: "currency", label: "Валюта", required: false, aliases: ["currency", "валюта"] },
    { target: "documentTotal", label: "Итого документа", required: false, aliases: ["documentTotal", "total", "итого"] },
    ...commonProduct,
    { target: "quantity", label: "Количество", required: true, aliases: ["quantity", "qty", "количество", "кол-во"] },
    { target: "unitPrice", label: "Цена закупки", required: false, aliases: ["unitPrice", "price", "цена закупки", "цена"] },
    { target: "lineTotal", label: "Сумма строки", required: false, aliases: ["lineTotal", "amount", "сумма строки", "сумма"] },
    operation,
  ],
  sale: [
    { target: "saleExternalId", label: "Внешний код продажи/отчёта", required: true, aliases: ["saleExternalId", "reportExternalId", "externalDocumentId", "reportId", "id отчета"] },
    { target: "date", label: "Дата", required: true, aliases: ["date", "reportDate", "дата"] },
    { target: "sourceSystem", label: "Касса/POS", required: false, aliases: ["sourceSystem", "posName", "касса", "система"] },
    { target: "reportNumber", label: "Номер отчёта", required: false, aliases: ["reportNumber", "number", "номер отчета", "номер"] },
    ...commonProduct,
    { target: "quantity", label: "Количество", required: true, aliases: ["quantity", "qty", "sold", "количество"] },
    { target: "grossSales", label: "Сумма продажи", required: false, aliases: ["grossSales", "revenue", "amount", "сумма"] },
    operation,
  ],
  stock_balance: [
    ...commonProduct,
    { target: "warehouseExternalId", label: "Код склада", required: false, aliases: ["warehouseExternalId", "warehouseId", "склад", "код склада"] },
    { target: "quantity", label: "Остаток", required: true, aliases: ["quantity", "balance", "stock", "остаток", "количество"] },
    { target: "measuredAt", label: "Дата остатка", required: true, aliases: ["measuredAt", "date", "snapshotDate", "дата"] },
    { target: "totalValue", label: "Стоимость остатка", required: false, aliases: ["totalValue", "inventoryValue", "стоимость остатка"] },
    { target: "averageUnitCost", label: "Средняя закупочная цена", required: false, aliases: ["averageUnitCost", "cost", "средняя цена", "себестоимость"] },
    operation,
  ],
  write_off: [
    { target: "documentExternalId", label: "Внешний код списания", required: true, aliases: ["documentExternalId", "writeOffExternalId", "externalId", "id документа"] },
    { target: "date", label: "Дата", required: true, aliases: ["date", "documentDate", "дата"] },
    { target: "reason", label: "Причина", required: false, aliases: ["reason", "причина"] },
    ...commonProduct,
    { target: "quantity", label: "Количество", required: true, aliases: ["quantity", "qty", "количество"] },
    { target: "amount", label: "Сумма", required: false, aliases: ["amount", "lineTotal", "сумма"] },
    operation,
  ],
  return: [
    { target: "documentExternalId", label: "Внешний код возврата", required: true, aliases: ["documentExternalId", "returnExternalId", "externalId", "id документа"] },
    { target: "date", label: "Дата", required: true, aliases: ["date", "documentDate", "дата"] },
    { target: "direction", label: "Направление возврата", required: true, aliases: ["direction", "тип возврата", "направление"] },
    ...commonProduct,
    { target: "quantity", label: "Количество", required: true, aliases: ["quantity", "qty", "количество"] },
    { target: "amount", label: "Сумма", required: false, aliases: ["amount", "lineTotal", "сумма"] },
    operation,
  ],
  recipe: [
    { target: "recipeExternalId", label: "Внешний код техкарты", required: true, aliases: ["recipeExternalId", "externalId", "recipeId", "id техкарты"] },
    { target: "menuItemExternalId", label: "Код блюда/позиции", required: true, aliases: ["menuItemExternalId", "menuItemId", "dishId", "код блюда"] },
    { target: "name", label: "Название блюда/техкарты", required: true, aliases: ["name", "menuItemName", "recipeName", "наименование", "блюдо"] },
    { target: "productExternalId", label: "Код ингредиента", required: true, aliases: ["productExternalId", "ingredientExternalId", "ingredientId", "код ингредиента"] },
    { target: "ingredientName", label: "Ингредиент", required: true, aliases: ["ingredientName", "productName", "ingredient", "ингредиент"] },
    { target: "quantity", label: "Количество", required: true, aliases: ["quantity", "qty", "количество"] },
    { target: "unit", label: "Единица", required: true, aliases: ["unit", "uom", "единица"] },
    { target: "portions", label: "Количество порций", required: false, aliases: ["portions", "yield", "порций", "выход"] },
    operation,
  ],
  supplier: [
    { target: "externalId", label: "Внешний код", required: true, aliases: ["externalId", "supplierExternalId", "id", "код поставщика", "код"] },
    { target: "name", label: "Поставщик", required: true, aliases: ["name", "supplierName", "поставщик", "контрагент"] },
    { target: "taxId", label: "ИНН/фискальный код", required: false, aliases: ["taxId", "inn", "vatNumber", "инн", "фискальный код"] },
    { target: "phone", label: "Телефон", required: false, aliases: ["phone", "телефон"] },
    { target: "email", label: "Email", required: false, aliases: ["email", "почта"] },
    operation,
  ],
  employee: [
    { target: "externalId", label: "Внешний код", required: true, aliases: ["externalId", "employeeExternalId", "id", "табельный номер", "код"] },
    { target: "name", label: "ФИО", required: true, aliases: ["name", "fullName", "employeeName", "фио", "сотрудник"] },
    { target: "role", label: "Должность", required: false, aliases: ["role", "position", "должность"] },
    { target: "phone", label: "Телефон", required: false, aliases: ["phone", "телефон"] },
    { target: "email", label: "Email", required: false, aliases: ["email", "почта"] },
    { target: "active", label: "Активен", required: false, aliases: ["active", "status", "активен", "статус"] },
    operation,
  ],
};

export function normalizeFieldName(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, "");
}

export function suggestFieldMapping(
  headers: readonly string[],
  entityType: IntegrationEntityType,
): FieldMapping {
  const byNormalized = new Map(headers.map((header) => [normalizeFieldName(header), header]));
  const result: FieldMapping = {};
  for (const definition of FIELD_DEFINITIONS[entityType]) {
    const source = definition.aliases
      .map(normalizeFieldName)
      .map((alias) => byNormalized.get(alias))
      .find(Boolean);
    if (source) result[definition.target] = source;
  }
  return result;
}

export function missingRequiredFields(
  mapping: FieldMapping,
  entityType: IntegrationEntityType,
): FieldDefinition[] {
  return FIELD_DEFINITIONS[entityType].filter((definition) =>
    definition.required && !String(mapping[definition.target] ?? "").trim()
  );
}

export function applyFieldMapping(
  value: unknown,
  mapping: FieldMapping,
  defaults: Record<string, unknown> = {},
): Record<string, unknown> {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const mapped: Record<string, unknown> = { ...defaults };
  for (const [target, source] of Object.entries(mapping)) {
    if (!target.trim() || !source.trim()) continue;
    const value = row[source];
    if (value !== undefined && value !== null && String(value).trim() !== "") mapped[target] = value;
  }
  return mapped;
}

export function headerSignature(headers: readonly string[], fileKind: string): string {
  const source = `${fileKind}:${headers.map(normalizeFieldName).sort().join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
