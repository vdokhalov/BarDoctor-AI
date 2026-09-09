import { canonicalStockUnit, convertStockQuantity, physicalUnit, type CanonicalStockUnit, type PhysicalUnit } from "./stock-units";
import { inventoryProductKey, type StockMovement } from "./inventory";
import type { CanonicalTaxonomy } from "./nomenclature-taxonomy";

export const OPENING_STOCK_STORE_KEY = "bd_opening_stock_v1";
type Row = Record<string, unknown>;
export type OpeningInput = {
  rowId: string;
  productKey?: string;
  name?: string;
  stockUnit?: string;
  sectionId?: string;
  taxonomyCategoryId?: string;
  subcategoryId?: string;
  quantity?: unknown;
  unit?: string;
  packageContent?: { quantity: unknown; unit: string };
  openingUnitCost?: unknown;
  costSource?: string;
};
export type OpeningDocument = {
  id: string; venueId: number; version: 1; status: "confirmed";
  fingerprint: string; createdAt: string; currency: string;
  selectedRowIds: string[]; skippedRowIds: string[]; items: OpeningPreviewRow[];
};
export type OpeningContext = {
  venueId: number; assortment: Row; movements: StockMovement[];
  documents: OpeningDocument[]; taxonomy: CanonicalTaxonomy; currency: string; now: string;
  historicalProductKeys?: string[];
};
export type OpeningPreviewRow = {
  rowId: string; productKey: string; name: string; isNew: boolean;
  stockUnit: CanonicalStockUnit | null; errors: string[];
  sectionId: string; taxonomyCategoryId: string; subcategoryId: string;
  quantity: number | null; unitCost: number | null; costSource: string;
  packageDefinition: { quantity: number; unit: PhysicalUnit; canonicalQuantity: number } | null;
  conversion: { input: OpeningInput; factor: number; canonicalUnit: CanonicalStockUnit; canonicalQuantity: number } | null;
};
const record = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(record) : [];
const text = (v: unknown): string => typeof v === "string" ? v.trim() : "";
const key = (v: Row) => text(v.productKey ?? v.key ?? v.id);
const local = (v: Row, venue: number) => v.venueId == null || v.venueId === venue;
function numeric(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string" && typeof v !== "number") return null;
  if (typeof v === "string" && !/^\s*\d+(?:[.,]\d+)?\s*$/.test(v)) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const supplied = (v: unknown) => v !== undefined && v !== null && v !== "";

/** Pure preview: no seed receipt, stock mutation, fuzzy link, or current-template lookup. */
export function previewOpeningStock(inputs: OpeningInput[], context: OpeningContext): OpeningPreviewRow[] {
  if (!Number.isSafeInteger(context.venueId) || context.venueId <= 0) throw new Error("VENUE_REQUIRED");
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 500) throw new Error("OPENING_ROW_LIMIT");
  const catalog = rows(context.assortment.nomenclature).filter(v => local(v, context.venueId));
  const balances = rows(context.assortment.stockBalances).filter(v => local(v, context.venueId));
  const result = inputs.map((input): OpeningPreviewRow => {
    const errors: string[] = [];
    if (!input || typeof input !== "object") throw new Error("OPENING_ROW_INVALID");
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(text(input.rowId))) errors.push("Укажите уникальный ID строки.");
    const matches = input.productKey ? catalog.filter(v => key(v) === input.productKey || v.id === input.productKey) : [];
    if (input.productKey && (matches.length !== 1 || matches[0]?.kind !== "stock" || matches[0]?.active === false)) errors.push("Складской товар недоступен или неоднозначен в этом заведении.");
    const existing = matches.length === 1 ? matches[0] : {};
    const isNew = !input.productKey;
    const name = isNew ? text(input.name) : text(existing.name);
    const unit = canonicalStockUnit(isNew ? input.stockUnit : existing.unit);
    if (!name || name.length > 240) errors.push("Укажите название до 240 символов.");
    if (!unit) errors.push("Выберите складскую единицу: штуки, литры или килограммы.");
    // Opening never silently migrates a historical ml/g balance.
    if (!isNew && existing.unit !== unit) errors.push("Единица существующего товара требует проверки до ввода начального остатка.");
    const productKey = isNew && unit ? inventoryProductKey({ name, unit }) : key(existing) || text(input.productKey);
    if (isNew && [...catalog, ...balances].some(v => key(v) === productKey || text(v.name).toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) errors.push("Товар уже существует. Выберите существующую позицию или пропустите строку.");
    let sectionId = text(isNew ? input.sectionId : existing.sectionId);
    let taxonomyCategoryId = text(isNew ? input.taxonomyCategoryId : existing.taxonomyCategoryId);
    let subcategoryId = text(isNew ? input.subcategoryId : existing.subcategoryId);
    if (isNew) {
      const resolve = (value: string, nodes: { id: string; name: string; active: boolean }[]) => {
        const exact = nodes.filter(v => v.active && v.id === value);
        const matches = exact.length ? exact : nodes.filter(v => v.active && v.name.trim().toLocaleLowerCase("ru") === value.toLocaleLowerCase("ru"));
        return matches.length === 1 ? matches[0].id : "";
      };
      sectionId = resolve(sectionId, context.taxonomy.sections);
      taxonomyCategoryId = resolve(taxonomyCategoryId, context.taxonomy.categories.filter(v => v.parentId === sectionId));
      const requestedSubcategory = subcategoryId;
      subcategoryId = subcategoryId ? resolve(subcategoryId, context.taxonomy.subcategories.filter(v => v.parentId === taxonomyCategoryId)) : "";
      if (requestedSubcategory && !subcategoryId) errors.push("Подкатегория не найдена или неоднозначна.");
      const section = context.taxonomy.sections.find(v => v.id === sectionId && v.active);
      const category = context.taxonomy.categories.find(v => v.id === taxonomyCategoryId && v.active && v.parentId === section?.id);
      if (!section || !category || subcategoryId && !context.taxonomy.subcategories.some(v => v.id === subcategoryId && v.active && v.parentId === category.id)) errors.push("Выберите действующие раздел, категорию и подкатегорию, если она указана.");
    }
    let quantity: number | null = null;
    let conversion: OpeningPreviewRow["conversion"] = null;
    let packageDefinition: OpeningPreviewRow["packageDefinition"] = null;
    if (input.packageContent) {
      const size = numeric(input.packageContent.quantity), packageUnit = physicalUnit(input.packageContent.unit);
      const canonical = size !== null && size > 0 && packageUnit && unit ? convertStockQuantity(size, packageUnit, unit) : null;
      if (canonical === null || canonical <= 0 || !packageUnit || size === null) errors.push("Укажите совместимое со складской единицей содержимое упаковки.");
      else packageDefinition = { quantity: size, unit: packageUnit, canonicalQuantity: canonical };
    }
    if (supplied(input.quantity)) {
      const count = numeric(input.quantity);
      const size = input.packageContent ? numeric(input.packageContent.quantity) : 1;
      const sourceUnit = physicalUnit(input.packageContent?.unit ?? input.unit);
      const factor = unit && sourceUnit && size !== null && size > 0 ? convertStockQuantity(size, sourceUnit, unit) : null;
      if (count === null || factor === null || factor <= 0 || !unit) errors.push("Проверьте количество и совместимость единиц; для упаковки укажите её содержимое.");
      else {
        quantity = Math.round(count * factor * 1e12) / 1e12;
        if (!Number.isFinite(quantity) || quantity > 1e12 || count > 0 && quantity <= 0) errors.push("Количество вне допустимого диапазона.");
        else conversion = { input: structuredClone(input), factor, canonicalUnit: unit, canonicalQuantity: quantity };
      }
      const sameBalances = balances.filter(v => key(v) === productKey);
      const history = context.movements.some(v => local(v as unknown as Row, context.venueId) && v.productKey === productKey)
        || context.historicalProductKeys?.includes(productKey)
        || context.documents.some(v => v.venueId === context.venueId && v.items.some(i => i.productKey === productKey));
      if (history || sameBalances.length > 1 || sameBalances.some(v => Number(v.current) !== 0 || v.openingDocumentId || v.lastPurchaseDate || v.lastPurchaseAt || Object.keys(record(v.warehouseBalances)).length > 0)) errors.push("У товара уже есть остаток или история. Используйте инвентаризацию, не начальный остаток.");
    } else if (!isNew) errors.push("Для существующего товара укажите начальное количество.");
    const unitCost = supplied(input.openingUnitCost) ? numeric(input.openingUnitCost) : null;
    const costSource = text(input.costSource);
    if (supplied(input.openingUnitCost) && (unitCost === null || quantity === null || !costSource || costSource.length > 240 || !context.currency)) errors.push("Для известной начальной стоимости укажите количество и источник стоимости.");
    if (unitCost !== null && quantity !== null && (!Number.isFinite(unitCost * quantity) || unitCost * quantity > 1e12)) errors.push("Начальная стоимость вне допустимого диапазона.");
    return { rowId: text(input.rowId), productKey, name, isNew, stockUnit: unit, errors, sectionId, taxonomyCategoryId, subcategoryId, quantity, unitCost, costSource, conversion, packageDefinition };
  });
  for (const row of result) {
    if (result.filter(v => v.rowId === row.rowId).length > 1 || result.filter(v => v.productKey && v.productKey === row.productKey).length > 1) row.errors.push("Повтор товара или ID строки в выбранном наборе.");
  }
  return result;
}

export type OpeningResult = { duplicate: false; errors: OpeningPreviewRow[] }
  | { duplicate: boolean; document: OpeningDocument; assortment: Row; movements: StockMovement[]; documents: OpeningDocument[] };
/** All selected rows or none. Caller persists all returned stores in one CAS transaction. */
export async function confirmOpeningStock(command: { id: string; inputs: OpeningInput[]; selectedRowIds: string[] }, context: OpeningContext): Promise<OpeningResult> {
  if (!Number.isSafeInteger(context.venueId) || context.venueId <= 0) throw new Error("VENUE_REQUIRED");
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(command.id)) throw new Error("OPENING_ID_REQUIRED");
  if (!Array.isArray(command.inputs) || command.inputs.length > 500 || !Array.isArray(command.selectedRowIds)
    || !command.selectedRowIds.length || new Set(command.selectedRowIds).size !== command.selectedRowIds.length) throw new Error("OPENING_SELECTION_REQUIRED");
  const selected = command.inputs.filter(v => command.selectedRowIds.includes(v.rowId));
  if (selected.length !== command.selectedRowIds.length || new Set(command.inputs.map(v => v.rowId)).size !== command.inputs.length) throw new Error("OPENING_SELECTION_INVALID");
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(command)))), v => v.toString(16).padStart(2, "0")).join("");
  const previous = context.documents.filter(v => v.id === command.id && v.venueId === context.venueId);
  if (previous.length) {
    if (previous.length !== 1 || previous[0].fingerprint !== fingerprint) throw new Error("OPENING_ID_CONFLICT");
    return { duplicate: true, document: previous[0], assortment: context.assortment, movements: context.movements, documents: context.documents };
  }
  const items = previewOpeningStock(selected, context);
  if (items.some(v => v.errors.length)) return { duplicate: false, errors: items };
  const assortment = structuredClone(context.assortment);
  const catalog = rows(assortment.nomenclature);
  const balances = rows(assortment.stockBalances);
  const movements = structuredClone(context.movements);
  const document: OpeningDocument = { id: command.id, version: 1, venueId: context.venueId, fingerprint, status: "confirmed", createdAt: context.now, currency: context.currency,
    selectedRowIds: [...command.selectedRowIds], skippedRowIds: command.inputs.filter(v => !command.selectedRowIds.includes(v.rowId)).map(v => v.rowId), items };
  for (const row of items) {
    const product: Row = { id: row.productKey, key: row.productKey, productKey: row.productKey, venueId: context.venueId,
      name: row.name, kind: "stock", active: true, category: "products", unit: row.stockUnit, displayUnit: row.stockUnit, unitModelVersion: 4,
      ...(row.packageDefinition ? { packageSize: `${row.packageDefinition.quantity} ${row.packageDefinition.unit}`, packageAmount: row.packageDefinition.canonicalQuantity } : {}),
      sectionId: row.sectionId, taxonomyCategoryId: row.taxonomyCategoryId, subcategoryId: row.subcategoryId,
      classificationStatus: "confirmed", classificationSource: "manual", source: "onboarding", current: 0,
      costStatus: "UNKNOWN", costReviewReason: "Нет подтверждённой закупки", createdAt: context.now, updatedAt: context.now };
    if (row.isNew) { catalog.push({ ...product }); balances.push({ ...product }); }
    if (row.quantity !== null) {
      let balance = balances.find(v => local(v, context.venueId) && key(v) === row.productKey);
      if (!balance) { balance = { ...catalog.find(v => local(v, context.venueId) && key(v) === row.productKey), current: 0 }; balances.push(balance); }
      balance.current = row.quantity;
      balance.openingDocumentId = command.id;
      balance.openingValuation = { unitCost: row.unitCost, currency: context.currency, source: row.costSource || null,
        totalCost: row.unitCost === null ? null : row.unitCost * row.quantity, status: row.unitCost === null ? "UNKNOWN" : row.unitCost === 0 ? "KNOWN_ZERO" : "KNOWN", capturedAt: context.now };
      balance.updatedAt = context.now;
      if (row.quantity > 0) movements.push({ id: `opening:${context.venueId}:${command.id}:${row.rowId}`, venueId: context.venueId,
        type: "opening_balance", date: context.now.slice(0, 10), productKey: row.productKey, productName: row.name,
        amount: row.quantity, unit: row.stockUnit!, sourceDocumentId: command.id, sourceLineId: row.rowId,
        source: "opening_balance", costStatus: "UNKNOWN", costReviewReason: "Начальный остаток не является закупкой",
        openingValuation: structuredClone(balance.openingValuation), openingConversion: row.conversion,
        createdAt: context.now });
    }
  }
  assortment.nomenclature = catalog;
  assortment.stockBalances = balances;
  assortment.updatedAt = context.now;
  // Do not discard idempotency/history to make room. Keep the Worker workload bounded.
  if (new TextEncoder().encode(JSON.stringify([...context.documents, document])).length > 4_000_000) throw new Error("OPENING_CAPACITY_REVIEW");
  return { duplicate: false, document, assortment, movements, documents: [...context.documents, document] };
}
