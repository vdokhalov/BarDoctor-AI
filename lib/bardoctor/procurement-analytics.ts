import {
  inventoryPackageAmount,
  purchaseLineBaseAmount,
} from "./inventory";
import {
  isPurchasePayment,
  purchaseAffectsInventory,
  purchasePaymentSummary,
  supplierDebtSummary,
} from "./purchases";
import { resolveAccountingMoney } from "./accounting-money";

type JsonRecord = Record<string, unknown>;

export type ProcurementDocumentState =
  | "conducted"
  | "verified"
  | "review"
  | "draft"
  | "cancelled"
  | "error";

export type ProcurementPricePoint = {
  id: string;
  documentId: string;
  itemId: string;
  sourceKind: "purchase" | "price_list";
  productKey: string;
  productName: string;
  category: string;
  packageSize: string;
  mappingStatus: "confirmed" | "unconfirmed";
  quantity: number;
  baseAmount: number;
  baseUnit: "ml" | "g" | "pcs";
  normalizedUnitPrice: number;
  normalizedDisplayPrice: number;
  normalizedDisplayUnit: "л" | "кг" | "шт.";
  lineTotal: number;
  supplierId: string;
  supplierName: string;
  currency: string;
  date: string;
  confirmedAt: string | null;
};

export const PROCUREMENT_PRICE_CHANGE_THRESHOLD_PERCENT = 5;
export const PROCUREMENT_OPPORTUNITY_FRESH_DAYS = 90;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function decimalLabel(value: number): string {
  return String(value).replace(".", ",");
}

function plural(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function isoDate(value: unknown): string {
  const candidate = text(value, "", 40);
  return /^\d{4}-\d{2}-\d{2}/.test(candidate) ? candidate.slice(0, 10) : "";
}

function normalizedName(value: unknown): string {
  return text(value, "", 300)
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

function latestStamp(value: JsonRecord): string {
  return text(value.updatedAt ?? value.confirmedAt ?? value.createdAt ?? value.date, "", 50);
}

function deduplicatedDocuments(values: unknown[], venueId?: number): JsonRecord[] {
  const byId = new Map<string, JsonRecord>();
  values.map(record).forEach((document, index) => {
    if (venueId && document.venueId != null && number(document.venueId) !== venueId) return;
    const id = text(document.id, `legacy-${index}`, 100);
    const existing = byId.get(id);
    if (!existing || latestStamp(document) >= latestStamp(existing)) byId.set(id, document);
  });
  return [...byId.values()];
}

function baseDisplay(unit: "ml" | "g" | "pcs", unitPrice: number) {
  if (unit === "ml") return { price: rounded(unitPrice * 1_000, 2), unit: "л" as const };
  if (unit === "g") return { price: rounded(unitPrice * 1_000, 2), unit: "кг" as const };
  return { price: rounded(unitPrice, 2), unit: "шт." as const };
}

export function procurementDocumentState(value: unknown): ProcurementDocumentState {
  const document = record(value);
  if (text(document.syncStatus) === "failed") return "error";
  if (text(document.status) === "cancelled") return "cancelled";
  if (text(document.status) === "confirmed") {
    if (text(document.syncStatus) === "partial") return "review";
    return text(document.documentType) === "price_list" ? "verified" : "conducted";
  }
  const warnings = array(document.warnings).filter((item) => text(item)).length;
  const itemConfidence = array(document.items).map(record).some((item) =>
    item.confidence != null && number(item.confidence, 1) < 0.8
  );
  if (warnings > 0 || itemConfidence || number(document.confidence, 1) < 0.8) return "review";
  return "draft";
}

export function confirmedProcurementDocuments(
  values: unknown[],
  venueId?: number,
): JsonRecord[] {
  return deduplicatedDocuments(values, venueId)
    .filter((document) => text(document.status) === "confirmed")
    .sort((left, right) =>
      isoDate(right.date).localeCompare(isoDate(left.date))
      || latestStamp(right).localeCompare(latestStamp(left))
    );
}

export function procurementPricePoints(
  values: unknown[],
  options: { venueId?: number; includePriceLists?: boolean; productAliases?: unknown } = {},
): ProcurementPricePoint[] {
  const aliases = new Map(array(options.productAliases).map(record)
    .map((alias) => [text(alias.from, "", 300), text(alias.to, "", 300)] as const)
    .filter(([from, to]) => Boolean(from && to && from !== to)));
  const canonicalKey = (initial: string): string => {
    let current = initial;
    const seen = new Set<string>();
    while (aliases.has(current) && !seen.has(current)) {
      seen.add(current);
      current = aliases.get(current)!;
    }
    return current;
  };
  const includePriceLists = options.includePriceLists !== false;
  const points: ProcurementPricePoint[] = [];
  for (const document of confirmedProcurementDocuments(values, options.venueId)) {
    const sourceKind = text(document.documentType) === "price_list" ? "price_list" : "purchase";
    if (sourceKind === "price_list" && !includePriceLists) continue;
    const documentId = text(document.id, "", 100);
    const supplierName = text(document.supplierName, "Поставщик", 180);
    const supplierId = text(document.supplierId, normalizedName(supplierName), 100);
    const currency = text(document.currency, "RUB", 12).toUpperCase();
    const date = isoDate(document.date);
    array(document.items).map(record).forEach((item, index) => {
      const itemId = text(item.id, `line-${index + 1}`, 100);
      const productKey = canonicalKey(text(item.purchaseProductKey ?? item.productKey, "", 300));
      const mappingStatus = productKey ? "confirmed" as const : "unconfirmed" as const;
      const received = purchaseLineBaseAmount(item);
      if (!productKey || received.amount <= 0 || received.unit === "unknown") return;
      const lineTotal = Math.max(
        0,
        number(item.lineTotal) || number(item.unitPrice) * Math.max(0, number(item.quantity)),
      );
      if (!(lineTotal > 0)) return;
      const normalizedUnitPrice = lineTotal / received.amount;
      const display = baseDisplay(received.unit, normalizedUnitPrice);
      points.push({
        id: `${documentId}:${itemId}`,
        documentId,
        itemId,
        sourceKind,
        productKey,
        productName: text(item.name, "Позиция", 240),
        category: text(item.category, text(document.expenseCategory, "other", 50), 50),
        packageSize: text(item.packageSize ?? item.unit, "", 120),
        mappingStatus,
        quantity: rounded(number(item.quantity), 3),
        baseAmount: rounded(received.amount, 3),
        baseUnit: received.unit,
        normalizedUnitPrice: rounded(normalizedUnitPrice, 6),
        normalizedDisplayPrice: display.price,
        normalizedDisplayUnit: display.unit,
        lineTotal: rounded(lineTotal, 2),
        supplierId,
        supplierName,
        currency,
        date,
        confirmedAt: text(document.confirmedAt, "", 40) || null,
      });
    });
  }
  return points.sort((left, right) =>
    right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
  );
}

function groupingKey(point: ProcurementPricePoint): string {
  return [point.productKey, point.currency, point.baseUnit].join("|");
}

function supplierGroupingKey(point: ProcurementPricePoint): string {
  return [groupingKey(point), point.supplierId].join("|");
}

export function procurementPriceChanges(values: unknown[], venueId?: number, productAliases?: unknown) {
  const actual = procurementPricePoints(values, { venueId, includePriceLists: false, productAliases });
  const groups = new Map<string, ProcurementPricePoint[]>();
  for (const point of actual) {
    const key = supplierGroupingKey(point);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  const changes: Array<{
    productKey: string;
    productName: string;
    supplierId: string;
    supplierName: string;
    currency: string;
    unit: ProcurementPricePoint["normalizedDisplayUnit"];
    currentPrice: number;
    previousPrice: number;
    percent: number;
    direction: "up" | "down";
    currentDocumentId: string;
    previousDocumentId: string;
    date: string;
  }> = [];
  for (const points of groups.values()) {
    const ordered = points.slice().sort((left, right) =>
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
    );
    const current = ordered[0];
    const previous = ordered.find((point) => point.documentId !== current.documentId);
    if (!previous || previous.normalizedUnitPrice <= 0) continue;
    const percent = rounded(
      (current.normalizedUnitPrice / previous.normalizedUnitPrice - 1) * 100,
      1,
    );
    if (Math.abs(percent) < PROCUREMENT_PRICE_CHANGE_THRESHOLD_PERCENT) continue;
    changes.push({
      productKey: current.productKey,
      productName: current.productName,
      supplierId: current.supplierId,
      supplierName: current.supplierName,
      currency: current.currency,
      unit: current.normalizedDisplayUnit,
      currentPrice: current.normalizedDisplayPrice,
      previousPrice: previous.normalizedDisplayPrice,
      percent,
      direction: percent > 0 ? "up" : "down",
      currentDocumentId: current.documentId,
      previousDocumentId: previous.documentId,
      date: current.date,
    });
  }
  return changes.sort((left, right) => Math.abs(right.percent) - Math.abs(left.percent));
}

function supplierConditions(value: JsonRecord) {
  const fields = {
    minimumOrder: text(value.minimumOrder, "", 160) || null,
    delivery: text(value.deliveryTerms ?? value.delivery, "", 240) || null,
    payment: text(value.paymentTerms, "", 240) || null,
    leadTime: text(value.leadTime ?? value.deliveryTime, "", 160) || null,
    availability: text(value.availability, "", 160) || null,
    discounts: text(value.discounts ?? value.discountTerms, "", 240) || null,
  };
  return {
    ...fields,
    known: Object.values(fields).some(Boolean),
  };
}

function daysBetween(left: string, right: Date): number {
  const parsed = Date.parse(`${left}T12:00:00Z`);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.floor((right.getTime() - parsed) / 86_400_000))
    : Number.POSITIVE_INFINITY;
}

export function procurementComparisons(
  values: unknown[],
  suppliers: unknown[] = [],
  options: { venueId?: number; now?: Date; productAliases?: unknown } = {},
) {
  const now = options.now ?? new Date();
  const all = procurementPricePoints(values, { venueId: options.venueId, includePriceLists: true, productAliases: options.productAliases });
  const actual = all.filter((point) => point.sourceKind === "purchase");
  const supplierMap = new Map<string, JsonRecord>();
  suppliers.map(record).forEach((supplier) => {
    const id = text(supplier.id, "", 100);
    const name = normalizedName(supplier.name);
    if (id) supplierMap.set(id, supplier);
    if (name) supplierMap.set(name, supplier);
  });
  const groups = new Map<string, ProcurementPricePoint[]>();
  for (const point of all) {
    const key = groupingKey(point);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }

  return [...groups.values()].flatMap((points) => {
    const latestActual = points
      .filter((point) => point.sourceKind === "purchase")
      .sort((left, right) => right.date.localeCompare(left.date))[0];
    if (!latestActual) return [];
    const latestBySupplier = new Map<string, ProcurementPricePoint>();
    for (const point of points) {
      const existing = latestBySupplier.get(point.supplierId);
      if (!existing || point.date > existing.date) latestBySupplier.set(point.supplierId, point);
    }
    // A current supplier's newer price list remains an offer elsewhere in the
    // module, but it must not replace the factual purchase baseline here.
    latestBySupplier.set(latestActual.supplierId, latestActual);
    const offers = [...latestBySupplier.values()]
      .sort((left, right) => left.normalizedUnitPrice - right.normalizedUnitPrice)
      .map((point) => {
        const supplier = supplierMap.get(point.supplierId)
          ?? supplierMap.get(normalizedName(point.supplierName))
          ?? {};
        return {
          ...point,
          conditions: supplierConditions(supplier),
          ageDays: daysBetween(point.date, now),
        };
      });
    if (offers.length < 2) return [];
    // The baseline is always the last confirmed purchase. A newer price list is
    // an offer, not proof that the venue actually bought at that price.
    const current = offers.find((point) => point.supplierId === latestActual.supplierId)!;
    const alternative = offers.find((point) =>
      point.supplierId !== current.supplierId
      && point.normalizedUnitPrice < current.normalizedUnitPrice
    ) ?? null;
    const comparableActual = actual.filter((point) => groupingKey(point) === groupingKey(current));
    const purchaseDocuments = new Set(comparableActual.map((point) => point.documentId));
    const purchaseMonths = new Set(comparableActual.map((point) => point.date.slice(0, 7)).filter(Boolean));
    const observedBaseAmount = comparableActual.reduce((sum, point) => sum + point.baseAmount, 0);
    const enoughVolumeHistory = purchaseDocuments.size >= 3 && purchaseMonths.size >= 2;
    const difference = alternative
      ? Math.max(0, current.normalizedUnitPrice - alternative.normalizedUnitPrice)
      : 0;
    const displayMultiplier = current.baseUnit === "pcs" ? 1 : 1_000;
    const estimatedMonthlySaving = alternative && enoughVolumeHistory
      ? rounded(difference * observedBaseAmount / purchaseMonths.size, 2)
      : null;
    const currentConditions = current.conditions;
    const alternativeConditions = alternative?.conditions ?? null;
    return [{
      productKey: current.productKey,
      productName: current.productName,
      baseUnit: current.baseUnit,
      unit: current.normalizedDisplayUnit,
      currency: current.currency,
      current,
      alternative,
      offers,
      priceDifference: alternative ? rounded(difference * displayMultiplier, 2) : null,
      priceDifferencePercent: alternative && current.normalizedUnitPrice > 0
        ? rounded(difference / current.normalizedUnitPrice * 100, 1)
        : null,
      comparisonScope: currentConditions.known && Boolean(alternativeConditions?.known)
        ? "price_and_conditions" as const
        : "price_only" as const,
      opportunity: Boolean(
        alternative
        && current.ageDays <= PROCUREMENT_OPPORTUNITY_FRESH_DAYS
        && alternative.ageDays <= PROCUREMENT_OPPORTUNITY_FRESH_DAYS
      ),
      estimatedMonthlySaving,
      estimateBasis: estimatedMonthlySaving === null
        ? null
        : {
            actualPurchaseDocuments: purchaseDocuments.size,
            actualMonths: purchaseMonths.size,
            observedBaseAmount: rounded(observedBaseAmount, 3),
          },
      freshnessDate: offers.map((offer) => offer.date).sort().at(0) ?? null,
    }];
  }).sort((left, right) =>
    Number(right.opportunity) - Number(left.opportunity)
    || (right.priceDifferencePercent ?? 0) - (left.priceDifferencePercent ?? 0)
  );
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function comparablePeriodDates(monthKey: string, now: Date) {
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const currentIsPartial = monthKey === currentM