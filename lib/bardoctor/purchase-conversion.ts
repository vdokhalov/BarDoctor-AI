import { canonicalStockUnit, normalizePurchaseQuantity, physicalUnit, validatePurchaseConversionSnapshot, type PurchasePackagingTemplate } from "./stock-units";
import { PURCHASE_STOCK_CATEGORIES, type PurchaseDocument } from "./purchases";
import { stockPurchaseCategory } from "./purchase-stock-contract";

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];

/** Called on new confirmation with original user input, before any name inference. */
export function preparePurchaseConversions(document: PurchaseDocument, rawDocument: unknown, assortment: unknown, preserveSnapshots = false) {
  const source = rows(row(rawDocument).items);
  const root = row(assortment);
  const products = [...rows(root.nomenclature), ...rows(root.stockBalances)];
  const issues: { id: string; error: string }[] = [];
  const items = document.items.map((originalItem, index) => {
    let item = originalItem;
    const raw = source[index] ?? {};
    // A valid historical conversion is self-contained; current templates or
    // removed nomenclature must not reinterpret its captured quantity/cost.
    if (preserveSnapshots && raw.purchaseConversion != null) {
      const snapshot = validatePurchaseConversionSnapshot(raw.purchaseConversion);
      if (!snapshot || !PURCHASE_STOCK_CATEGORIES.has(item.category)) {
        issues.push({ id: item.id, error: "Историческая конверсия требует проверки." });
        return item;
      }
      return { ...item, purchaseConversion: snapshot };
    }
    const reference = String(raw.purchaseProductKey ?? raw.nomenclatureId ?? raw.nomenclatureItemId ?? "");
    const candidates = products.filter((product) => [product.key, product.productKey, product.id].includes(reference)
      && (product.venueId == null || product.venueId === document.venueId));
    const kinds = new Set(candidates.map((product) => product.kind).filter(Boolean));
    if (reference && (!candidates.length || kinds.size > 1)) {
      issues.push({ id: item.id, error: "Не удалось подтвердить тип выбранной номенклатуры в этом заведении." });
      return item;
    }
    if (kinds.has("stock")) {
      const category = stockPurchaseCategory("stock", item.category);
      if (preserveSnapshots && category !== item.category) {
        issues.push({ id: item.id, error: "Историческая закупка связана со складом, но проведена как нескладская. Требуется проверка без изменения истории." });
        return item;
      }
      item = { ...item, category };
    } else if (kinds.has("service") && PURCHASE_STOCK_CATEGORIES.has(item.category)) {
      issues.push({ id: item.id, error: "Выбранная номенклатура не является складским товаром." });
      return item;
    }
    if (!PURCHASE_STOCK_CATEGORIES.has(item.category)) return item;
    const bases = new Set(candidates.map((product) => canonicalStockUnit(product.unit)));
    if ((reference && !candidates.length) || bases.size > 1 || bases.has(null)) {
      issues.push({ id: item.id, error: "Не удалось подтвердить складскую единицу выбранного товара." });
      return item;
    }
    let content: { quantity: unknown; unit: unknown } | undefined;
    if (raw.packageContent != null) {
      content = { quantity: row(raw.packageContent).quantity, unit: row(raw.packageContent).unit };
    } else if (!raw.packagingTemplateId && (!physicalUnit(raw.unit) || physicalUnit(raw.unit) === "pcs")) {
      const label = String(raw.packageSize ?? "").trim();
      if (label) {
        const match = label.match(/^(?:(\d+(?:[.,]\d+)?)\s*[xх×*]\s*)?(\d+(?:[.,]\d+)?)\s*(.+)$/i);
        if (!match || !physicalUnit(match[3])) {
          issues.push({ id: item.id, error: "Укажите проверенное количество и единицу внутри упаковки." });
          return item;
        }
        content = { quantity: Number((match[1] ?? "1").replace(",", ".")) * Number(match[2].replace(",", ".")), unit: match[3] };
      }
    }
    const stockUnit = [...bases][0] ?? canonicalStockUnit(content?.unit ?? raw.unit);
    const conversion = normalizePurchaseQuantity({
      quantity: raw.quantity, unit: raw.unit, price: raw.unitPrice ?? raw.price
        ?? (raw.lineTotal != null && item.quantity > 0 ? Number(raw.lineTotal) / item.quantity : undefined),
      totalCost: raw.lineTotal ?? raw.total, stockUnit, packageContent: content,
      templateId: typeof raw.packagingTemplateId === "string" ? raw.packagingTemplateId : undefined,
      nomenclatureId: String(candidates.find((product) => product.id)?.id ?? reference) || undefined, venueId: document.venueId,
    }, rows(root.packagingTemplates) as PurchasePackagingTemplate[]);
    if (!conversion.ok) {
      issues.push({ id: item.id, error: conversion.error });
      return item;
    }
    return { ...item, purchaseConversion: conversion.snapshot };
  });
  return issues.length
    ? { ok: false as const, code: "PURCHASE_CONVERSION_NEEDS_REVIEW", issues,
      error: "Проверьте единицы и содержимое упаковок перед проведением." }
    : { ok: true as const, document: { ...document, items } };
}
