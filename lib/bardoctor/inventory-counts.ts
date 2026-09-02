import { escapeHtml } from "./html";

export const INVENTORY_COUNT_STORE_KEY = "bd_inventory_snapshots";

export type InventoryCountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";
export type InventoryCountScopeType = "all" | "section" | "category" | "subcategory" | "warehouse";

export type InventoryCountScope = {
  type: InventoryCountScopeType;
  id?: string;
  label: string;
  name?: string;
  parentId?: string;
  sectionId?: string;
  categoryId?: string;
  itemCount?: number;
};

export type InventoryCountLine = {
  id: string;
  productKey: string;
  productName: string;
  unit: "ml" | "g" | "pcs";
  entryUnit: string;
  entryFactor: number;
  packageSize?: string;
  packageOptions?: string[];
  multiplePackageSizes?: boolean;
  sectionId?: string;
  sectionName: string;
  categoryId?: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName: string;
  storageLocationId?: string;
  storageLocationName?: string;
  warehouseId?: string;
  expected: number;
  actual: number | null;
  note?: string;
  averageUnitCost: number | null;
  currency?: string;
  valuationKnown: boolean;
  valuationReason?: string;
  snapshotBalanceUpdatedAt?: string;
};

export type InventoryCountDocument = {
  id: string;
  internalId: string;
  venueId: number;
  number: number;
  date: string;
  source: "manual" | "scan" | "import";
  sourceLabel: string;
  status: InventoryCountStatus;
  scope: InventoryCountScope;
  accountingCurrency?: string;
  items: InventoryCountLine[];
  note?: string;
  creator: { accountId: number; name: string; role: string };
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  reviewStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  summary?: InventoryCountSummary;
  adjustmentMovementIds?: string[];
};

export type InventoryCountSummary = {
  totalLines: number;
  countedLines: number;
  uncountedLines: number;
  matchedLines: number;
  shortageLines: number;
  surplusLines: number;
  changedLines: number;
  shortageValue: number;
  surplusValue: number;
  calculatedDifferenceValue: number;
  netDifferenceValue: number | null;
  unvaluedDifferenceLines: number;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function numeric(value: unknown, fallback = Number.NaN): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function nextInventoryCountNumber(snapshots: unknown[], venueId: number): number {
  const highest = snapshots.reduce<number>((maximum, value) => {
    const item = record(value);
    const itemVenueId = numeric(item.venueId, venueId);
    const number = numeric(item.number, 0);
    if (itemVenueId !== venueId || !Number.isInteger(number) || number < 1) return maximum;
    return Math.max(maximum, number);
  }, 0);
  return highest + 1;
}

export function inventoryCountHasStockEffects(document: unknown, stockMovements: unknown[]): boolean {
  const item = record(document);
  if (array(item.adjustmentMovementIds).length > 0 || array(item.createdAdjustments).length > 0) return true;
  const inventoryId = text(item.id, "", 100);
  return Boolean(inventoryId) && stockMovements.some((movement) =>
    text(record(movement).sourceDocumentId, "", 100) === inventoryId
  );
}

export type InventoryCountDeleteResult =
  | { ok: true; deleted: boolean; idempotent: boolean; snapshots: unknown[]; document?: InventoryCountDocument }
  | { ok: false; code: "INVENTORY_NOT_FOUND" | "INVENTORY_DELETE_PROTECTED"; error: string; snapshots: unknown[] };

export function deleteInventoryCountDocument(input: {
  snapshots: unknown[];
  inventoryId: string;
  venueId: number;
  stockMovements?: unknown[];
}): InventoryCountDeleteResult {
  const index = input.snapshots.findIndex((value) => text(record(value).id, "", 100) === input.inventoryId);
  if (index < 0) {
    return { ok: true, deleted: false, idempotent: true, snapshots: [...input.snapshots] };
  }
  const raw = record(input.snapshots[index]);
  const documentVenueId = numeric(raw.venueId, input.venueId);
  if (documentVenueId !== input.venueId) {
    return {
      ok: false,
      code: "INVENTORY_NOT_FOUND",
      error: "Инвентаризация текущего заведения не найдена",
      snapshots: [...input.snapshots],
    };
  }
  const status = text(raw.status, "", 30);
  const safeStatus = !status || ["draft", "counting", "review"].includes(status);
  if (!safeStatus || inventoryCountHasStockEffects(raw, input.stockMovements ?? [])) {
    return {
      ok: false,
      code: "INVENTORY_DELETE_PROTECTED",
      error: "Инвентаризация уже завершена, отменена или повлияла на склад. Удаление запрещено.",
      snapshots: [...input.snapshots],
    };
  }
  const snapshots = [...input.snapshots];
  const [deleted] = snapshots.splice(index, 1);
  return {
    ok: true,
    deleted: true,
    idempotent: false,
    snapshots,
    document: deleted as InventoryCountDocument,
  };
}

function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function productKey(value: JsonRecord): string {
  return text(value.productKey ?? value.key, "", 300);
}

function activeStockBalances(assortment: unknown): JsonRecord[] {
  const root = record(assortment);
  const nomenclature = array(root.nomenclature).map(record);
  const nomenclatureByKey = new Map(nomenclature.map((item) => [productKey(item), item]));
  return array(root.stockBalances)
    .map(record)
    .map((balance) => ({ ...balance, ...(nomenclatureByKey.get(productKey(balance)) ?? {}) }))
    .filter((balance) =>
      Boolean(productKey(balance))
      && balance.archived !== true
      && balance.active !== false
      && text(balance.kind, "stock", 20) !== "service"
    );
}

type InventoryHierarchyNode = {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  active: boolean;
};

function inventoryHierarchyNodes(assortment: unknown) {
  const structure = record(record(assortment).nomenclatureStructure);
  const nodes = (key: string): InventoryHierarchyNode[] => array(structure[key])
    .map(record)
    .map((value, index) => ({
      id: text(value.id, "", 100),
      name: text(value.name, "Без названия", 120),
      parentId: text(value.parentId, "", 100) || undefined,
      order: numeric(value.order, index),
      active: value.active !== false
        && value.archived !== true
        && value.deleted !== true
        && !["archived", "inactive", "deleted"].includes(text(value.status, "", 30)),
    }))
    .filter((value) => Boolean(value.id))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "ru"));
  return {
    sections: nodes("sections"),
    categories: nodes("categories"),
    subcategories: nodes("subcategories"),
    locations: nodes("locations"),
  };
}

function inventoryEligibleBalances(assortment: unknown): JsonRecord[] {
  const hierarchy = inventoryHierarchyNodes(assortment);
  const sectionById = new Map(hierarchy.sections.map((value) => [value.id, value]));
  const categoryById = new Map(hierarchy.categories.map((value) => [value.id, value]));
  const subcategoryById = new Map(hierarchy.subcategories.map((value) => [value.id, value]));
  return activeStockBalances(assortment).filter((balance) => {
    if (!["ml", "g", "pcs"].includes(text(balance.unit, "", 20))) return false;
    const sectionId = text(balance.sectionId, "", 100);
    const categoryId = text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100);
    const subcategoryId = text(balance.subcategoryId, "", 100);
    const section = sectionById.get(sectionId);
    const category = categoryById.get(categoryId);
    const subcategory = subcategoryById.get(subcategoryId);
    if (section && !section.active) return false;
    if (category && !category.active) return false;
    if (subcategory && !subcategory.active) return false;
    if (category?.parentId && sectionId && category.parentId !== sectionId) return false;
    if (subcategory?.parentId && categoryId && subcategory.parentId !== categoryId) return false;
    return true;
  });
}

function structureIndex(assortment: unknown) {
  const structure = inventoryHierarchyNodes(assortment);
  const index = (values: InventoryHierarchyNode[]) => new Map(values.map((value) => [value.id, value.name]));
  return {
    sections: index(structure.sections),
    categories: index(structure.categories),
    subcategories: index(structure.subcategories),
    locations: index(structure.locations),
  };
}

function hierarchyFor(balance: JsonRecord, assortment: unknown) {
  const structure = structureIndex(assortment);
  const sectionId = text(balance.sectionId, "", 100) || undefined;
  const categoryId = text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100) || undefined;
  const subcategoryId = text(balance.subcategoryId, "", 100) || undefined;
  const storageLocationId = text(balance.storageLocationId, "", 100) || undefined;
  return {
    sectionId,
    sectionName: text(
      sectionId ? structure.sections.get(sectionId) : balance.section,
      "Без раздела",
      120,
    ),
    categoryId,
    categoryName: text(
      categoryId ? structure.categories.get(categoryId) : balance.categoryName,
      "Без категории",
      120,
    ),
    subcategoryId,
    subcategoryName: text(
      subcategoryId ? structure.subcategories.get(subcategoryId) : balance.subcategoryName,
      "Без подраздела",
      120,
    ),
    storageLocationId,
    storageLocationName: text(
      storageLocationId ? structure.locations.get(storageLocationId) : balance.storageLocationName,
      "",
      120,
    ) || undefined,
  };
}

function entryDefinition(balance: JsonRecord): { entryUnit: string; entryFactor: number } {
  const unit = text(balance.unit, "", 20);
  const packageAmount = Math.max(0, numeric(balance.displayPackageAmount ?? balance.packageAmount, 0));
  const hasSinglePackage = balance.multiplePackageSizes !== true
    && text(balance.packageSize, "") !== "Несколько фасовок"
    && packageAmount > 0;
  if (hasSinglePackage) {
    const packageSize = text(balance.packageSize, "уп.", 120).toLocaleLowerCase("ru");
    const entryUnit = /(?:л|мл)/.test(packageSize) ? "бут." : /(?:кг|г)/.test(packageSize) ? "уп." : "шт.";
    return { entryUnit, entryFactor: rounded(packageAmount, 6) };
  }
  if (unit === "ml") return { entryUnit: "л", entryFactor: 1_000 };
  if (unit === "g") return { entryUnit: "кг", entryFactor: 1_000 };
  return { entryUnit: "шт.", entryFactor: 1 };
}

function costBasis(balance: JsonRecord, accountingCurrency?: string) {
  const current = numeric(balance.current, 0);
  const inventoryValue = Math.max(0, numeric(balance.inventoryValue, 0));
  const storedAverage = Math.max(0, numeric(balance.averageUnitCost, 0));
  const averageUnitCost = storedAverage > 0
    ? storedAverage
    : current > 0 && inventoryValue > 0
      ? inventoryValue / current
      : 0;
  const currency = text(balance.currency, "", 12).toUpperCase() || undefined;
  const expectedCurrency = text(accountingCurrency, "", 12).toUpperCase() || undefined;
  if (expectedCurrency && currency && expectedCurrency !== currency) {
    return {
      averageUnitCost: null,
      currency: expectedCurrency,
      valuationKnown: false,
      valuationReason: "Стоимость позиции сохранена не в валюте учёта заведения",
    };
  }
  if (!(averageUnitCost > 0)) {
    return {
      averageUnitCost: null,
      currency: expectedCurrency ?? currency,
      valuationKnown: false,
      valuationReason: "Нет cost basis для денежной оценки расхождения",
    };
  }
  return {
    averageUnitCost: rounded(averageUnitCost, 6),
    currency: expectedCurrency ?? currency,
    valuationKnown: true,
    valuationReason: undefined,
  };
}

function sectionBranchIds(structure: ReturnType<typeof inventoryHierarchyNodes>, sectionId: string): Set<string> {
  const branch = new Set([sectionId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const section of structure.sections) {
      if (section.parentId && branch.has(section.parentId) && !branch.has(section.id)) {
        branch.add(section.id);
        changed = true;
      }
    }
  }
  return branch;
}

function sectionPathNames(structure: ReturnType<typeof inventoryHierarchyNodes>, sectionId: string): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = structure.sections.find((section) => section.id === sectionId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current.name);
    current = current.parentId ? structure.sections.find((section) => section.id === current?.parentId) : undefined;
  }
  return path;
}

function scopeMatches(balance: JsonRecord, scope: InventoryCountScope, assortment: unknown): boolean {
  if (scope.type === "all") return true;
  const id = text(scope.id, "", 100);
  if (!id) return false;
  if (scope.type === "section") {
    return sectionBranchIds(inventoryHierarchyNodes(assortment), id).has(text(balance.sectionId, "", 100));
  }
  if (scope.type === "category") {
    return text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100) === id;
  }
  if (scope.type === "subcategory") return text(balance.subcategoryId, "", 100) === id;
  return text(balance.warehouseId, "", 100) === id;
}

function scopeLabel(scope: InventoryCountScope, assortment: unknown): string {
  if (scope.type === "all") return "Весь активный склад";
  const structure = inventoryHierarchyNodes(assortment);
  const id = text(scope.id, "", 100);
  const categoryById = new Map(structure.categories.map((value) => [value.id, value]));
  if (scope.type === "section") {
    return sectionPathNames(structure, id).join(" → ") || text(scope.label, "Выбранный раздел", 120);
  }
  if (scope.type === "category") {
    const category = categoryById.get(id);
    const sectionPath = category?.parentId ? sectionPathNames(structure, category.parentId) : [];
    return [...sectionPath, category?.name].filter(Boolean).join(" → ") || text(scope.label, "Выбранная категория", 120);
  }
  if (scope.type === "subcategory") {
    const subcategory = structure.subcategories.find((value) => value.id === id);
    const category = subcategory?.parentId ? categoryById.get(subcategory.parentId) : undefined;
    const sectionPath = category?.parentId ? sectionPathNames(structure, category.parentId) : [];
    return [...sectionPath, category?.name, subcategory?.name].filter(Boolean).join(" → ")
      || text(scope.label, "Выбранный подраздел", 120);
  }
  return text(scope.label, "Склад / зона", 120);
}

export function inventoryCountScopes(assortment: unknown): InventoryCountScope[] {
  const balances = inventoryEligibleBalances(assortment);
  const structure = inventoryHierarchyNodes(assortment);
  const result: InventoryCountScope[] = [{
    type: "all",
    label: "Весь активный склад",
    name: "Весь активный склад",
    itemCount: balances.length,
  }];
  const count = (predicate: (balance: JsonRecord) => boolean) => balances.filter(predicate).length;
  for (const section of structure.sections.filter((value) => value.active)) {
    const branchIds = sectionBranchIds(structure, section.id);
    const itemCount = count((balance) => branchIds.has(text(balance.sectionId, "", 100)));
    if (!itemCount) continue;
    const label = sectionPathNames(structure, section.id).join(" → ") || section.name;
    result.push({ type: "section", id: section.id, label, name: section.name, itemCount });
  }
  for (const category of structure.categories.filter((value) => value.active && value.parentId)) {
    const itemCount = count((balance) =>
      text(balance.sectionId, "", 100) === category.parentId
      && text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100) === category.id
    );
    if (!itemCount) continue;
    result.push({
      type: "category",
      id: category.id,
      parentId: category.parentId,
      sectionId: category.parentId,
      name: category.name,
      label: scopeLabel({ type: "category", id: category.id, label: category.name }, assortment),
      itemCount,
    });
  }
  const categoryById = new Map(structure.categories.map((value) => [value.id, value]));
  for (const subcategory of structure.subcategories.filter((value) => value.active && value.parentId)) {
    const parentId = subcategory.parentId;
    if (!parentId) continue;
    const category = categoryById.get(parentId);
    if (!category?.active || !category.parentId) continue;
    const itemCount = count((balance) =>
      text(balance.sectionId, "", 100) === category.parentId
      && text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100) === category.id
      && text(balance.subcategoryId, "", 100) === subcategory.id
    );
    if (!itemCount) continue;
    result.push({
      type: "subcategory",
      id: subcategory.id,
      parentId: subcategory.parentId,
      sectionId: category.parentId,
      categoryId: category.id,
      name: subcategory.name,
      label: scopeLabel({ type: "subcategory", id: subcategory.id, label: subcategory.name }, assortment),
      itemCount,
    });
  }
  return result;
}

export function resolveInventoryCountScope(
  assortment: unknown,
  requested: Pick<InventoryCountScope, "type" | "id">,
): InventoryCountScope | null {
  return inventoryCountScopes(assortment).find((scope) =>
    scope.type === requested.type && String(scope.id ?? "") === String(requested.id ?? "")
  ) ?? null;
}

export function inventoryCountDocumentScope(document: InventoryCountDocument): InventoryCountScope {
  const raw = record((document as unknown as JsonRecord).scope);
  const type = text(raw.type, "", 30);
  const label = text(raw.label ?? (document as unknown as JsonRecord).scopeLabel, "", 180);
  if (["all", "section", "category", "subcategory", "warehouse"].includes(type) && label) {
    return {
      ...raw,
      type: type as InventoryCountScopeType,
      id: text(raw.id, "", 100) || undefined,
      label,
    } as InventoryCountScope;
  }
  return { type: "all", label: label || document.sourceLabel || "Весь активный склад" };
}

export function createInventoryCountDocument(input: {
  assortment: unknown;
  venueId: number;
  sequenceNumber: number;
  scope: InventoryCountScope;
  accountingCurrency?: string;
  creator: InventoryCountDocument["creator"];
  source?: InventoryCountDocument["source"];
  id?: string;
  date?: string;
  now?: string;
}): InventoryCountDocument {
  const now = input.now ?? new Date().toISOString();
  const id = text(input.id, crypto.randomUUID(), 100);
  const scope: InventoryCountScope = {
    type: input.scope.type,
    id: text(input.scope.id, "", 100) || undefined,
    label: scopeLabel(input.scope, input.assortment),
  };
  const source = input.source ?? "manual";
  const sourceLabel = source === "scan"
    ? "Сканирование инвентаризационной ведомости"
    : source === "import"
      ? "Импорт инвентаризационной ведомости"
      : "Вручную";
  const items = inventoryEligibleBalances(input.assortment)
    .filter((balance) => scopeMatches(balance, scope, input.assortment))
    .map((balance, index): InventoryCountLine | null => {
      const key = productKey(balance);
      const unit = text(balance.unit, "", 20);
      if (!key || !["ml", "g", "pcs"].includes(unit)) return null;
      const hierarchy = hierarchyFor(balance, input.assortment);
      const entry = entryDefinition(balance);
      const valuation = costBasis(balance, input.accountingCurrency);
      return {
        id: `count-line-${index + 1}`,
        productKey: key,
        productName: text(balance.name, `Позиция ${index + 1}`),
        unit: unit as InventoryCountLine["unit"],
        entryUnit: entry.entryUnit,
        entryFactor: entry.entryFactor,
        packageSize: text(balance.packageSize, "", 120) || undefined,
        packageOptions: array(balance.packageOptions).map((value) => text(record(value).label ?? value, "", 120)).filter(Boolean),
        multiplePackageSizes: balance.multiplePackageSizes === true,
        ...hierarchy,
        warehouseId: text(balance.warehouseId, "", 100) || undefined,
        expected: rounded(numeric(balance.current, 0)),
        actual: null,
        averageUnitCost: valuation.averageUnitCost,
        currency: valuation.currency,
        valuationKnown: valuation.valuationKnown,
        valuationReason: valuation.valuationReason,
        snapshotBalanceUpdatedAt: text(balance.updatedAt, "", 40) || undefined,
      };
    })
    .filter((value): value is InventoryCountLine => Boolean(value))
    .sort((left, right) => [left.sectionName, left.categoryName, left.subcategoryName, left.productName]
      .join("\u0000").localeCompare(
        [right.sectionName, right.categoryName, right.subcategoryName, right.productName].join("\u0000"),
        "ru",
      ));
  return {
    id,
    internalId: id,
    venueId: input.venueId,
    number: Math.max(1, Math.trunc(input.sequenceNumber)),
    date: /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "") ? input.date! : now.slice(0, 10),
    source,
    sourceLabel,
    status: "counting",
    scope,
    accountingCurrency: text(input.accountingCurrency, "", 12).toUpperCase() || undefined,
    items,
    creator: input.creator,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateInventoryCountDocument(input: {
  document: InventoryCountDocument;
  items?: unknown;
  note?: unknown;
  status?: "counting" | "review";
  now?: string;
}): InventoryCountDocument {
  const requestedItems = new Map(array(input.items).map((value) => {
    const item = record(value);
    return [text(item.productKey, "", 300), item];
  }));
  const items = input.document.items.map((line) => {
    const requested = requestedItems.get(line.productKey);
    if (!requested) return line;
    const rawActual = requested.actual;
    const actual = rawActual === null || rawActual === undefined || rawActual === ""
      ? null
      : numeric(rawActual);
    if (actual !== null && (!Number.isFinite(actual) || actual < 0 || actual > 1_000_000_000_000)) {
      throw new Error(`Некорректный факт для позиции «${line.productName}»`);
    }
    return {
      ...line,
      actual: actual === null ? null : rounded(actual),
      note: text(requested.note, "", 500) || undefined,
    };
  });
  const now = input.now ?? new Date().toISOString();
  return {
    ...input.document,
    status: input.status ?? (input.document.status === "review" ? "review" : "counting"),
    items,
    note: text(input.note, "", 1_000) || undefined,
    reviewStartedAt: input.status === "review" ? input.document.reviewStartedAt ?? now : input.document.reviewStartedAt,
    updatedAt: now,
  };
}

export function inventoryCountSummary(document: InventoryCountDocument): InventoryCountSummary {
  let countedLines = 0;
  let matchedLines = 0;
  let shortageLines = 0;
  let surplusLines = 0;
  let shortageValue = 0;
  let surplusValue = 0;
  let calculatedDifferenceValue = 0;
  let unvaluedDifferenceLines = 0;
  for (const line of document.items) {
    if (line.actual === null) continue;
    countedLines += 1;
    const difference = rounded(line.actual - line.expected);
    if (Math.abs(difference) <= 0.0001) {
      matchedLines += 1;
      continue;
    }
    if (difference < 0) shortageLines += 1;
    else surplusLines += 1;
    if (!line.valuationKnown || line.averageUnitCost === null) {
      unvaluedDifferenceLines += 1;
      continue;
    }
    const value = rounded(difference * line.averageUnitCost, 2);
    calculatedDifferenceValue = rounded(calculatedDifferenceValue + value, 2);
    if (value < 0) shortageValue = rounded(shortageValue + value, 2);
    else surplusValue = rounded(surplusValue + value, 2);
  }
  return {
    totalLines: document.items.length,
    countedLines,
    uncountedLines: document.items.length - countedLines,
    matchedLines,
    shortageLines,
    surplusLines,
    changedLines: shortageLines + surplusLines,
    shortageValue,
    surplusValue,
    calculatedDifferenceValue,
    netDifferenceValue: unvaluedDifferenceLines ? null : calculatedDifferenceValue,
    unvaluedDifferenceLines,
  };
}

export function inventoryCountLineDifference(line: InventoryCountLine): {
  difference: number | null;
  differenceValue: number | null;
} {
  if (line.actual === null) return { difference: null, differenceValue: null };
  const difference = rounded(line.actual - line.expected);
  return {
    difference,
    differenceValue: line.valuationKnown && line.averageUnitCost !== null
      ? rounded(difference * line.averageUnitCost, 2)
      : null,
  };
}

export function inventoryCountConflicts(input: {
  document: InventoryCountDocument;
  assortment: unknown;
}): Array<{ productKey: string; productName: string; reason: string; expected: number; current?: number }> {
  const currentByKey = new Map(activeStockBalances(input.assortment).map((value) => [productKey(value), value]));
  const conflicts: Array<{ productKey: string; productName: string; reason: string; expected: number; current?: number }> = [];
  for (const line of input.document.items) {
    const current = currentByKey.get(line.productKey);
    if (!current) {
      conflicts.push({
        productKey: line.productKey,
        productName: line.productName,
        reason: "Позиция была удалена или архивирована после начала подсчёта",
        expected: line.expected,
      });
      continue;
    }
    const currentAmount = rounded(numeric(current.current, 0));
    if (Math.abs(currentAmount - line.expected) > 0.0001) {
      conflicts.push({
        productKey: line.productKey,
        productName: line.productName,
        reason: "Учётный остаток изменился после начала подсчёта",
        expected: line.expected,
        current: currentAmount,
      });
      continue;
    }
    const currentCost = costBasis(current, input.document.accountingCurrency);
    const snapshotCost = line.averageUnitCost;
    if (
      currentCost.valuationKnown !== line.valuationKnown
      || (snapshotCost !== null && currentCost.averageUnitCost !== null
        && Math.abs(currentCost.averageUnitCost - snapshotCost) > 0.000001)
    ) {
      conflicts.push({
        productKey: line.productKey,
        productName: line.productName,
        reason: "Cost basis изменился после начала подсчёта",
        expected: line.expected,
        current: currentAmount,
      });
    }
  }
  return conflicts;
}

export function renderInventoryCountPrintSheet(input: {
  document: InventoryCountDocument;
  venueName: string;
  returnUrl?: string;
}): string {
  const printableScope = inventoryCountDocumentScope(input.document);
  const groups = new Map<string, { title: string; items: InventoryCountLine[] }>();
  for (const item of input.document.items) {
    const title = [item.sectionName, item.categoryName, item.subcategoryName].filter(Boolean).join(" · ");
    if (!groups.has(title)) groups.set(title, { title, items: [] });
    groups.get(title)!.items.push(item);
  }
  const tables = [...groups.values()].map((group) => `
    <section class="group">
      <h2>${escapeHtml(group.title)}</h2>
      <table>
        <thead><tr><th>Наименование</th><th class="unit">Ед.</th><th class="fact">Факт</th><th>Примечание</th></tr></thead>
        <tbody>${group.items.map((item) => `<tr><td>${escapeHtml(item.productName)}${item.packageSize ? `<small>${escapeHtml(item.packageSize)}</small>` : ""}</td><td class="unit">${escapeHtml(item.entryUnit)}</td><td class="fact"></td><td></td></tr>`).join("")}</tbody>
      </table>
    </section>`).join("");
  const returnUrl = input.returnUrl || `/warehouse?tab=counts&inventory=${encodeURIComponent(input.document.id)}`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>Инвентаризация № ${input.document.number}</title><style>
    @page{size:A4 portrait;margin:14mm 12mm 16mm}*{box-sizing:border-box}body{margin:0;padding:76px 12mm 16mm;color:#111;background:#f3f4f7;font-family:Arial,"DejaVu Sans",sans-serif;font-size:10pt;line-height:1.3}.document{width:min(100%,210mm);min-height:297mm;margin:0 auto;padding:14mm 12mm 16mm;background:#fff;box-shadow:0 16px 50px rgba(19,24,44,.12)}.document>header{border-bottom:2px solid #111;padding-bottom:5mm;margin-bottom:5mm}h1{font-size:16pt;letter-spacing:.035em;margin:0 0 4mm;text-align:center}dl{display:grid;grid-template-columns:32mm 1fr 37mm 1fr;gap:2.5mm 4mm;margin:0}dt{font-weight:700}dd{margin:0;border-bottom:1px solid #777;min-height:5mm}.group{break-inside:auto;margin:0 0 5mm}.group h2{font-size:10.5pt;margin:4mm 0 1.5mm;break-after:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #666;padding:2.2mm 2mm;vertical-align:top;overflow-wrap:anywhere;word-break:normal}th{background:#eee;text-align:left;font-size:9pt}.unit{width:15mm;text-align:center}.fact{width:24mm}td{height:10mm}td small{display:block;margin-top:1mm;color:#444;font-size:8pt}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:10mm;break-inside:avoid}.signature{border-bottom:1px solid #333;padding-top:8mm}.date{margin-top:7mm;border-bottom:1px solid #333;width:75mm}.document-toolbar{position:fixed;z-index:10;top:0;right:0;left:0;display:flex;min-height:64px;padding:max(8px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left));align-items:center;gap:10px;border-bottom:1px solid #dde0e8;background:rgba(255,255,255,.96);box-shadow:0 8px 28px rgba(19,24,44,.08);backdrop-filter:blur(16px)}.document-toolbar a,.document-toolbar button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid #dfe2ea;border-radius:13px;padding:0 14px;color:#242a3f;background:#fff;font:700 14px Arial,sans-serif;text-decoration:none;cursor:pointer}.document-toolbar a{margin-right:auto}.document-toolbar button{border-color:#25255f;color:#fff;background:#25255f}@media(max-width:600px){body{padding:72px 0 0}.document{min-height:calc(100dvh - 72px);padding:9mm 5mm;box-shadow:none}dl{grid-template-columns:28mm 1fr}.document-toolbar a,.document-toolbar button{padding-inline:11px;font-size:12px}}@media print{body{padding:0;background:#fff}.document{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.document-toolbar{display:none}}
  </style></head><body><nav class="document-toolbar" aria-label="Навигация документа"><a href="${escapeHtml(returnUrl)}" onclick="if(window.opener&&!window.opener.closed){event.preventDefault();window.opener.focus();window.close();setTimeout(()=>window.location.assign(this.href),120)}">← Назад к инвентаризации</a><button type="button" onclick="window.print()">Печать / PDF</button></nav><main class="document"><header><h1>ИНВЕНТАРИЗАЦИОННАЯ ВЕДОМОСТЬ</h1><dl><dt>Заведение:</dt><dd>${escapeHtml(input.venueName)}</dd><dt>Инвентаризация №:</dt><dd>${input.document.number}</dd><dt>Дата:</dt><dd></dd><dt>Ответственный:</dt><dd>${escapeHtml(input.document.creator.name)}</dd><dt>Начало подсчёта:</dt><dd>${escapeHtml(input.document.startedAt.slice(0, 16).replace("T", " "))}</dd><dt>Охват:</dt><dd>${escapeHtml(printableScope.label)}</dd></dl></header>${tables}<footer class="signatures"><div class="signature">Инвентаризацию провёл</div><div class="signature">Проверил</div></footer><div class="date">Дата</div></main><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script></body></html>`;
}
