export const INVENTORY_COUNT_STORE_KEY = "bd_inventory_snapshots";

export type InventoryCountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";
export type InventoryCountScopeType = "all" | "section" | "category" | "subcategory" | "warehouse";

export type InventoryCountScope = {
  type: InventoryCountScopeType;
  id?: string;
  label: string;
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

function structureIndex(assortment: unknown) {
  const structure = record(record(assortment).nomenclatureStructure);
  const index = (key: string) => new Map(
    array(structure[key]).map(record).map((value) => [text(value.id, "", 100), text(value.name, "", 120)]),
  );
  return {
    sections: index("sections"),
    categories: index("categories"),
    subcategories: index("subcategories"),
    locations: index("locations"),
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

function scopeMatches(balance: JsonRecord, scope: InventoryCountScope): boolean {
  if (scope.type === "all") return true;
  const id = text(scope.id, "", 100);
  if (!id) return false;
  if (scope.type === "section") return text(balance.sectionId, "", 100) === id;
  if (scope.type === "category") {
    return text(balance.taxonomyCategoryId ?? balance.categoryId, "", 100) === id;
  }
  if (scope.type === "subcategory") return text(balance.subcategoryId, "", 100) === id;
  return text(balance.warehouseId, "", 100) === id;
}

function scopeLabel(scope: InventoryCountScope, assortment: unknown): string {
  if (scope.type === "all") return "Весь активный склад";
  const structure = structureIndex(assortment);
  const id = text(scope.id, "", 100);
  const source = scope.type === "section"
    ? structure.sections
    : scope.type === "category"
      ? structure.categories
      : scope.type === "subcategory"
        ? structure.subcategories
        : null;
  return text(scope.label, source?.get(id) ?? (scope.type === "warehouse" ? "Склад / зона" : "Выбранный охват"), 120);
}

export function inventoryCountScopes(assortment: unknown): InventoryCountScope[] {
  const balances = activeStockBalances(assortment);
  const structure = structureIndex(assortment);
  const result: InventoryCountScope[] = [{ type: "all", label: "Весь активный склад" }];
  const append = (
    type: InventoryCountScopeType,
    field: string,
    names: Map<string, string>,
  ) => {
    const ids = new Set(balances.map((value) => text(value[field], "", 100)).filter(Boolean));
    for (const id of ids) result.push({ type, id, label: names.get(id) ?? "Без названия" });
  };
  append("section", "sectionId", structure.sections);
  const categoryBalances = balances.map((value) => ({
    ...value,
    inventoryCountCategoryId: value.taxonomyCategoryId ?? value.categoryId,
  }));
  const categoryIds = new Set(categoryBalances.map((value) => text(value.inventoryCountCategoryId, "", 100)).filter(Boolean));
  for (const id of categoryIds) result.push({ type: "category", id, label: structure.categories.get(id) ?? "Без названия" });
  append("subcategory", "subcategoryId", structure.subcategories);
  const warehouseIds = new Set(balances.map((value) => text(value.warehouseId, "", 100)).filter(Boolean));
  for (const id of warehouseIds) result.push({ type: "warehouse", id, label: `Склад / зона: ${id}` });
  return result;
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
  const items = activeStockBalances(input.assortment)
    .filter((balance) => scopeMatches(balance, scope))
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderInventoryCountPrintSheet(input: {
  document: InventoryCountDocument;
  venueName: string;
}): string {
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
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Инвентаризация № ${input.document.number}</title><style>
    @page{size:A4 portrait;margin:14mm 12mm 16mm}*{box-sizing:border-box}body{margin:0;color:#111;background:#fff;font-family:Arial,"DejaVu Sans",sans-serif;font-size:10pt;line-height:1.3}header{border-bottom:2px solid #111;padding-bottom:5mm;margin-bottom:5mm}h1{font-size:16pt;letter-spacing:.035em;margin:0 0 4mm;text-align:center}dl{display:grid;grid-template-columns:32mm 1fr 37mm 1fr;gap:2.5mm 4mm;margin:0}dt{font-weight:700}dd{margin:0;border-bottom:1px solid #777;min-height:5mm}.group{break-inside:auto;margin:0 0 5mm}.group h2{font-size:10.5pt;margin:4mm 0 1.5mm;break-after:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #666;padding:2.2mm 2mm;vertical-align:top;overflow-wrap:anywhere;word-break:normal}th{background:#eee;text-align:left;font-size:9pt}.unit{width:15mm;text-align:center}.fact{width:24mm}td{height:10mm}td small{display:block;margin-top:1mm;color:#444;font-size:8pt}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:10mm;break-inside:avoid}.signature{border-bottom:1px solid #333;padding-top:8mm}.date{margin-top:7mm;border-bottom:1px solid #333;width:75mm}.print-button{position:fixed;right:16px;bottom:16px;border:0;border-radius:12px;padding:12px 18px;color:#fff;background:#25255f;font-weight:700}@media print{.print-button{display:none}}
  </style></head><body><header><h1>ИНВЕНТАРИЗАЦИОННАЯ ВЕДОМОСТЬ</h1><dl><dt>Заведение:</dt><dd>${escapeHtml(input.venueName)}</dd><dt>Инвентаризация №:</dt><dd>${input.document.number}</dd><dt>Дата:</dt><dd></dd><dt>Ответственный:</dt><dd>${escapeHtml(input.document.creator.name)}</dd><dt>Начало подсчёта:</dt><dd>${escapeHtml(input.document.startedAt.slice(0, 16).replace("T", " "))}</dd><dt>Охват:</dt><dd>${escapeHtml(input.document.scope.label)}</dd></dl></header>${tables}<footer class="signatures"><div class="signature">Инвентаризацию провёл</div><div class="signature">Проверил</div></footer><div class="date">Дата</div><button class="print-button" onclick="window.print()">Печать / сохранить PDF</button><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script></body></html>`;
}
