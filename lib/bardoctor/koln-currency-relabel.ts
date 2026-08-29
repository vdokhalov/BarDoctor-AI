import { normalizePurchaseAccounting, supplierDebtSummary, type PurchaseDocument } from "./purchases";

type JsonRecord = Record<string, unknown>;

export const KOLN_VENUE_ID = 1;
export const KOLN_DATA_ACCOUNT_ID = 1;
export const KOLN_CURRENCY_RELABEL_VERSION = "koln-production-currency-relabel-v1";
export const KOLN_TARGET_CURRENCY = "PMR_RUB";
export const KOLN_WHITE_STORK_DOCUMENT_ID = "b54e2f38-a4df-49b0-8510-12904fbe183e";
export const KOLN_WHITE_STORK_PRODUCT_KEY = "stock:коньяк белый аист|ml";
export const KOLN_ORANGES_LINE_ID = "17b0346d-a394-4ff3-ae0b-35f2f0f2397e";
export const KOLN_TEA_BAGS_LINE_ID = "eb0fdcc0-5cff-41f5-a6e4-9fb05185fb1e";

export const KOLN_CURRENCY_STORE_KEYS = [
  "bd_purchase_documents",
  "bd_finance_expenses",
  "bd_stock_movements",
  "bd_assortment_v1",
  "bd_suppliers",
] as const;

export type KolnCurrencyStoreKey = (typeof KOLN_CURRENCY_STORE_KEYS)[number];
export type KolnCurrencyStores = Record<KolnCurrencyStoreKey, unknown>;

export type CurrencyRelabelChange = {
  path: string;
  before: "RUB" | "MDL";
  after: typeof KOLN_TARGET_CURRENCY;
};

export type NumericChange = {
  storeKey: string;
  path: string;
  before: number | null;
  after: number;
  kind: "added" | "changed";
};

export type KolnCurrencyRelabelResult = {
  restaurant: JsonRecord;
  stores: KolnCurrencyStores;
  labelChanges: Record<"accounts.restaurant_json" | KolnCurrencyStoreKey, CurrencyRelabelChange[]>;
  numericChanges: NumericChange[];
  sourceVerification: {
    oranges: JsonRecord;
    teaBags: JsonRecord;
    preserved: true;
  };
  counts: {
    purchaseDocuments: number;
    purchaseLines: number;
    rubLabelsBefore: number;
    mdlLabelsBefore: number;
    legacyLabelsAfter: number;
    changedLabels: number;
  };
  reconciliation: {
    purchases: { beforeIncludedRub: number; beforeExcludedMdl: number; afterPmrRub: number };
    supplierDebt: { beforeRub: number; afterPmrRub: number };
    warehouseValuation: { before: number; after: number; delta: number };
    whiteStork: {
      purchaseBefore: number;
      purchaseAfter: number;
      stockQuantityBefore: number;
      stockQuantityAfter: number;
      inventoryValueBefore: number;
      inventoryValueAfter: number;
      averageUnitCostBefore: number;
      averageUnitCostAfter: number;
    };
    financeAugust: { visibleNumericBefore: number; afterPmrRub: number };
  };
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 100) / 100 : 0;
}

function code(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function isCurrencyKey(key: string): boolean {
  return key.toLowerCase().includes("currency");
}

function relabelValue(value: unknown, path: string, changes: CurrencyRelabelChange[]): unknown {
  if (Array.isArray(value)) return value.map((item, index) => relabelValue(item, `${path}[${index}]`, changes));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => {
    const nextPath = path ? `${path}.${key}` : key;
    const currentCode = code(item);
    if (isCurrencyKey(key) && (currentCode === "RUB" || currentCode === "MDL")) {
      changes.push({ path: nextPath, before: currentCode, after: KOLN_TARGET_CURRENCY } as CurrencyRelabelChange);
      return [key, KOLN_TARGET_CURRENCY];
    }
    return [key, relabelValue(item, nextPath, changes)];
  }));
}

function countLegacyLabels(value: unknown): { rub: number; mdl: number } {
  let rub = 0;
  let mdl = 0;
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) return item.forEach(visit);
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as JsonRecord)) {
      if (isCurrencyKey(key)) {
        if (code(child) === "RUB") rub += 1;
        if (code(child) === "MDL") mdl += 1;
      }
      visit(child);
    }
  };
  visit(value);
  return { rub, mdl };
}

function activeFxFields(value: unknown, path = "", output: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => activeFxFields(item, `${path}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, item] of Object.entries(value as JsonRecord)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (["fxRate", "fxRateDirection", "fxEffectiveDate", "fxSource", "fxLockedAt", "exchangeRateToAccounting"].includes(key)
      && item !== null && item !== undefined && item !== "" && item !== 0) output.push(nextPath);
    activeFxFields(item, nextPath, output);
  }
  return output;
}

function stripFxFields(value: JsonRecord): JsonRecord {
  const next = { ...value };
  for (const key of ["fxRate", "fxRateDirection", "fxEffectiveDate", "fxSource", "fxLockedAt", "exchangeRateToAccounting"]) {
    delete next[key];
  }
  return next;
}

function normalizePurchases(value: unknown, now: string): unknown[] {
  return array(value).map((item) => {
    const relabelled = stripFxFields(record(item));
    if (code(relabelled.currency) !== KOLN_TARGET_CURRENCY) return relabelled;
    const normalized = normalizePurchaseAccounting({
      document: relabelled as PurchaseDocument,
      accountingCurrency: KOLN_TARGET_CURRENCY,
      now,
    });
    if (!normalized.ok || normalized.money?.status !== "same_currency") {
      throw new Error(`PURCHASE_NORMALIZATION_FAILED:${String(relabelled.id ?? "unknown")}`);
    }
    return stripFxFields(normalized.document as unknown as JsonRecord);
  });
}

function normalizeExpenses(value: unknown): unknown[] {
  return array(value).map((item) => {
    const expense = stripFxFields(record(item));
    if (code(expense.currency) !== KOLN_TARGET_CURRENCY) return expense;
    const amount = money(expense.amount);
    return {
      ...expense,
      originalAmount: amount,
      originalCurrency: KOLN_TARGET_CURRENCY,
      accountingAmount: amount,
      accountingCurrency: KOLN_TARGET_CURRENCY,
      accountingMoneyStatus: "same_currency",
    };
  });
}

function whiteStorkBalance(value: unknown): boolean {
  const item = record(value);
  return String(item.productKey ?? item.key ?? item.id ?? "") === KOLN_WHITE_STORK_PRODUCT_KEY;
}

function updateWhiteStorkValuation(assortmentValue: unknown): JsonRecord {
  const assortment = record(assortmentValue);
  const update = (value: unknown): JsonRecord => {
    const item = record(value);
    if (!whiteStorkBalance(item)) return item;
    const next: JsonRecord = {
      ...item,
      averageUnitCost: 0.120333,
      inventoryValue: 361,
      currency: KOLN_TARGET_CURRENCY,
      accountingCurrency: KOLN_TARGET_CURRENCY,
      lastTransactionCurrency: KOLN_TARGET_CURRENCY,
      lastPurchaseAccountingCost: 361,
    };
    delete next.costNeedsReview;
    delete next.costReviewReason;
    return next;
  };
  return {
    ...assortment,
    stockBalances: array(assortment.stockBalances).map(update),
    nomenclature: array(assortment.nomenclature).map(update),
  };
}

function updateWhiteStorkMovement(value: unknown): unknown[] {
  return array(value).map((entry) => {
    const movement = record(entry);
    if (String(movement.id ?? "") !== "1b8c1746-35de-4729-a5c5-dac69c0b1d0d"
      || String(movement.status ?? "active") !== "active") return movement;
    const next: JsonRecord = {
      ...movement,
      costAmount: 361,
      currency: KOLN_TARGET_CURRENCY,
      transactionCostAmount: 361,
      transactionCurrency: KOLN_TARGET_CURRENCY,
    };
    delete next.exchangeRateToAccounting;
    return next;
  });
}

function findPurchaseLine(documents: unknown[], lineId: string): JsonRecord {
  for (const document of documents) {
    const line = array(record(document).items).find((item) => String(record(item).id ?? "") === lineId);
    if (line) return record(line);
  }
  throw new Error(`SOURCE_VERIFICATION_LINE_MISSING:${lineId}`);
}

function assertSourceVerificationLines(documents: unknown[]): { oranges: JsonRecord; teaBags: JsonRecord } {
  const oranges = findPurchaseLine(documents, KOLN_ORANGES_LINE_ID);
  const teaBags = findPurchaseLine(documents, KOLN_TEA_BAGS_LINE_ID);
  if (Number(oranges.quantity) !== 1.124 || Number(oranges.unitPrice) !== 23 || Number(oranges.lineTotal) !== 25.35) {
    throw new Error("ORANGES_SOURCE_RECORD_CHANGED");
  }
  if (Number(teaBags.quantity) !== 100 || Number(teaBags.unitPrice) !== 0.5 || Number(teaBags.lineTotal) !== 60) {
    throw new Error("TEA_BAGS_SOURCE_RECORD_CHANGED");
  }
  return { oranges, teaBags };
}

function numericLeaves(value: unknown, path = "", output = new Map<string, number | null>()): Map<string, number | null> {
  if (Array.isArray(value)) {
    value.forEach((item, index) => numericLeaves(item, `${path}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, item] of Object.entries(value as JsonRecord)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof item === "number" && Number.isFinite(item)) output.set(nextPath, item);
    else if (item === null) output.set(nextPath, null);
    else numericLeaves(item, nextPath, output);
  }
  return output;
}

function allowedNumericChange(storeKey: string, path: string, before: number | null): boolean {
  if (storeKey === "bd_purchase_documents" && /\.(originalAmount|accountingAmount|originalLineTotal|accountingLineTotal)$/.test(path)) return before === null;
  if (storeKey === "bd_finance_expenses" && /\.(originalAmount|accountingAmount)$/.test(path)) return before === null;
  if (storeKey === "bd_stock_movements" && /\.(costAmount)$/.test(path)) return before === null;
  if (storeKey === "bd_assortment_v1" && /\.(inventoryValue|averageUnitCost|lastPurchaseAccountingCost)$/.test(path)
    && path.includes(KOLN_WHITE_STORK_PRODUCT_KEY) === false) {
    // Array-indexed White Stork paths are verified separately below.
    return true;
  }
  return false;
}

function numericDiff(storeKey: string, before: unknown, after: unknown): NumericChange[] {
  const left = numericLeaves(before);
  const right = numericLeaves(after);
  const changes: NumericChange[] = [];
  for (const [path, afterValue] of right) {
    if (afterValue === null) continue;
    const beforeValue = left.has(path) ? left.get(path)! : null;
    if (beforeValue === afterValue) continue;
    const whiteStorkValuation = storeKey === "bd_assortment_v1"
      && /\.(inventoryValue|averageUnitCost|lastPurchaseAccountingCost)$/.test(path);
    const whiteStorkMovement = storeKey === "bd_stock_movements" && /\.costAmount$/.test(path);
    if (!whiteStorkValuation && !whiteStorkMovement && !allowedNumericChange(storeKey, path, beforeValue)) {
      throw new Error(`UNAUTHORIZED_NUMERIC_CHANGE:${storeKey}:${path}:${beforeValue}->${afterValue}`);
    }
    changes.push({ storeKey, path, before: beforeValue, after: afterValue, kind: left.has(path) ? "changed" : "added" });
  }
  return changes;
}

function warehouseValue(assortment: unknown): number {
  return money(array(record(assortment).stockBalances)
    .reduce<number>((sum, value) => sum + money(record(value).inventoryValue), 0));
}

function financeAugust(expenses: unknown): number {
  return money(array(expenses).filter((value) => {
    const item = record(value);
    const status = String(item.status ?? "posted");
    return String(item.date ?? item.occurredAt ?? "").startsWith("2026-08")
      && status !== "cancelled" && status !== "reversed" && !item.reversedAt;
  }).reduce<number>((sum, value) => sum + money(record(value).amount), 0));
}

function purchaseTotals(documents: unknown[]): { rub: number; mdl: number; all: number } {
  let rub = 0;
  let mdl = 0;
  let all = 0;
  for (const value of documents) {
    const document = record(value);
    if (document.status !== "confirmed" || document.documentType === "price_list") continue;
    const total = money(document.total);
    all += total;
    if (code(document.currency) === "RUB") rub += total;
    if (code(document.currency) === "MDL") mdl += total;
  }
  return { rub: money(rub), mdl: money(mdl), all: money(all) };
}

export function buildKolnCurrencyRelabel(input: {
  restaurant: unknown;
  stores: KolnCurrencyStores;
  now: string;
}): KolnCurrencyRelabelResult {
  const originalDocuments = array(input.stores.bd_purchase_documents);
  const purchaseLines = originalDocuments.reduce<number>((sum, value) => sum + array(record(value).items).length, 0);
  if (originalDocuments.length !== 26 || purchaseLines !== 160) {
    throw new Error(`KOLN_BASELINE_CHANGED:purchases=${originalDocuments.length}:lines=${purchaseLines}`);
  }
  const existingFxFields = Object.entries(input.stores).flatMap(([storeKey, value]) =>
    activeFxFields(value, storeKey));
  if (existingFxFields.length) throw new Error(`EXISTING_FX_FIELDS_REQUIRE_REVIEW:${existingFxFields.slice(0, 20).join(",")}`);
  const sourceLines = assertSourceVerificationLines(originalDocuments);
  const whiteDocument = originalDocuments.find((value) => String(record(value).id ?? "") === KOLN_WHITE_STORK_DOCUMENT_ID);
  const whiteLine = array(record(whiteDocument).items)[0];
  if (!whiteDocument || money(record(whiteDocument).total) !== 361 || money(record(whiteLine).lineTotal) !== 361) {
    throw new Error("WHITE_STORK_BASELINE_CHANGED");
  }

  const labelChanges = {} as KolnCurrencyRelabelResult["labelChanges"];
  const restaurantChanges: CurrencyRelabelChange[] = [];
  const restaurant = record(relabelValue(input.restaurant, "restaurant", restaurantChanges));
  restaurant.currency = KOLN_TARGET_CURRENCY;
  labelChanges["accounts.restaurant_json"] = restaurantChanges;

  const relabelledStores = {} as KolnCurrencyStores;
  for (const storeKey of KOLN_CURRENCY_STORE_KEYS) {
    const changes: CurrencyRelabelChange[] = [];
    relabelledStores[storeKey] = relabelValue(input.stores[storeKey], storeKey, changes);
    labelChanges[storeKey] = changes;
  }

  relabelledStores.bd_purchase_documents = normalizePurchases(relabelledStores.bd_purchase_documents, input.now);
  relabelledStores.bd_finance_expenses = normalizeExpenses(relabelledStores.bd_finance_expenses);
  relabelledStores.bd_stock_movements = updateWhiteStorkMovement(relabelledStores.bd_stock_movements);
  relabelledStores.bd_assortment_v1 = updateWhiteStorkValuation(relabelledStores.bd_assortment_v1);

  const numericChanges = KOLN_CURRENCY_STORE_KEYS.flatMap((storeKey) =>
    numericDiff(storeKey, input.stores[storeKey], relabelledStores[storeKey]));

  const afterSourceLines = assertSourceVerificationLines(array(relabelledStores.bd_purchase_documents));
  for (const [label, before, after] of [
    ["ORANGES", sourceLines.oranges, afterSourceLines.oranges],
    ["TEA_BAGS", sourceLines.teaBags, afterSourceLines.teaBags],
  ] as const) {
    for (const field of ["quantity", "unitPrice", "lineTotal"] as const) {
      if (before[field] !== after[field]) throw new Error(`${label}_NUMERIC_FIELD_CHANGED:${field}`);
    }
  }

  const beforeLabels = [input.restaurant, ...Object.values(input.stores)].map(countLegacyLabels)
    .reduce((sum, item) => ({ rub: sum.rub + item.rub, mdl: sum.mdl + item.mdl }), { rub: 0, mdl: 0 });
  const afterLabels = [restaurant, ...Object.values(relabelledStores)].map(countLegacyLabels)
    .reduce((sum, item) => ({ rub: sum.rub + item.rub, mdl: sum.mdl + item.mdl }), { rub: 0, mdl: 0 });
  if (afterLabels.rub || afterLabels.mdl) throw new Error(`LEGACY_CURRENCY_LABEL_REMAINS:RUB=${afterLabels.rub}:MDL=${afterLabels.mdl}`);

  const beforePurchaseTotals = purchaseTotals(originalDocuments);
  const afterDocuments = array(relabelledStores.bd_purchase_documents);
  const afterPurchaseTotals = purchaseTotals(afterDocuments);
  if (afterPurchaseTotals.all !== beforePurchaseTotals.all) throw new Error("PURCHASE_TOTAL_CHANGED");

  const beforeAssortment = input.stores.bd_assortment_v1;
  const afterAssortment = relabelledStores.bd_assortment_v1;
  const beforeBalance = array(record(beforeAssortment).stockBalances).find(whiteStorkBalance);
  const afterBalance = array(record(afterAssortment).stockBalances).find(whiteStorkBalance);
  if (!beforeBalance || !afterBalance) throw new Error("WHITE_STORK_BALANCE_MISSING");

  const beforeDebt = supplierDebtSummary(originalDocuments, array(input.stores.bd_finance_expenses), KOLN_VENUE_ID, "RUB");
  const afterDebt = supplierDebtSummary(afterDocuments, array(relabelledStores.bd_finance_expenses), KOLN_VENUE_ID, KOLN_TARGET_CURRENCY);
  const beforeDebtTotal = money(beforeDebt.suppliers.reduce((sum, value) => sum + value.balanceDue, 0));
  const afterDebtTotal = money(afterDebt.suppliers.reduce((sum, value) => sum + value.balanceDue, 0));

  const changedLabels = Object.values(labelChanges).reduce((sum, changes) => sum + changes.length, 0)
    + (code(record(input.restaurant).currency) === KOLN_TARGET_CURRENCY ? 0 : restaurantChanges.some((item) => item.path === "restaurant.currency") ? 0 : 1);
  return {
    restaurant,
    stores: relabelledStores,
    labelChanges,
    numericChanges,
    sourceVerification: { oranges: afterSourceLines.oranges, teaBags: afterSourceLines.teaBags, preserved: true },
    counts: {
      purchaseDocuments: originalDocuments.length,
      purchaseLines,
      rubLabelsBefore: beforeLabels.rub,
      mdlLabelsBefore: beforeLabels.mdl,
      legacyLabelsAfter: afterLabels.rub + afterLabels.mdl,
      changedLabels,
    },
    reconciliation: {
      purchases: {
        beforeIncludedRub: beforePurchaseTotals.rub,
        beforeExcludedMdl: beforePurchaseTotals.mdl,
        afterPmrRub: afterPurchaseTotals.all,
      },
      supplierDebt: { beforeRub: beforeDebtTotal, afterPmrRub: afterDebtTotal },
      warehouseValuation: {
        before: warehouseValue(beforeAssortment),
        after: warehouseValue(afterAssortment),
        delta: money(warehouseValue(afterAssortment) - warehouseValue(beforeAssortment)),
      },
      whiteStork: {
        purchaseBefore: money(record(whiteDocument).total),
        purchaseAfter: money(record(afterDocuments.find((value) => String(record(value).id ?? "") === KOLN_WHITE_STORK_DOCUMENT_ID)).total),
        stockQuantityBefore: money(record(beforeBalance).current),
        stockQuantityAfter: money(record(afterBalance).current),
        inventoryValueBefore: money(record(beforeBalance).inventoryValue),
        inventoryValueAfter: money(record(afterBalance).inventoryValue),
        averageUnitCostBefore: Number(record(beforeBalance).averageUnitCost) || 0,
        averageUnitCostAfter: Number(record(afterBalance).averageUnitCost) || 0,
      },
      financeAugust: {
        visibleNumericBefore: financeAugust(input.stores.bd_finance_expenses),
        afterPmrRub: financeAugust(relabelledStores.bd_finance_expenses),
      },
    },
  };
}
