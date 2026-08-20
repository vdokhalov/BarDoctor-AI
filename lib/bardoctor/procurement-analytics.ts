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
  options: { venueId?: number; includePriceLists?: boolean } = {},
): ProcurementPricePoint[] {
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
      const productKey = text(item.purchaseProductKey ?? item.productKey, "", 300);
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

export function procurementPriceChanges(values: unknown[], venueId?: number) {
  const actual = procurementPricePoints(values, { venueId, includePriceLists: false });
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
  options: { venueId?: number; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const all = procurementPricePoints(values, { venueId: options.venueId, includePriceLists: true });
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
  const currentIsPartial = monthKey === currentMonth;
  const previousKey = previousMonthKey(monthKey);
  const endDay = currentIsPartial ? now.getUTCDate() : 31;
  return { previousKey, endDay, comparisonBasis: currentIsPartial ? "same_elapsed_days" : "full_months" as const };
}

export function buildProcurementAnalytics(input: {
  documents?: unknown[];
  suppliers?: unknown[];
  expenses?: unknown[];
  stockMovements?: unknown[];
  supplierAlternatives?: unknown;
  period?: string;
  venueId?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const monthKey = /^\d{4}-\d{2}$/.test(input.period ?? "")
    ? input.period as string
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const allDocuments = deduplicatedDocuments(input.documents ?? [], input.venueId);
  const confirmed = confirmedProcurementDocuments(allDocuments, input.venueId);
  const purchases = confirmed.filter((document) => text(document.documentType) !== "price_list");
  const priceLists = confirmed.filter((document) => text(document.documentType) === "price_list");
  const periodPurchases = purchases.filter((document) => isoDate(document.date).startsWith(monthKey));
  const comparisonPeriod = comparablePeriodDates(monthKey, now);
  const currentComparable = periodPurchases.filter((document) =>
    number(isoDate(document.date).slice(8, 10), 99) <= comparisonPeriod.endDay
  );
  const previousComparable = purchases.filter((document) => {
    const date = isoDate(document.date);
    return date.startsWith(comparisonPeriod.previousKey)
      && number(date.slice(8, 10), 99) <= comparisonPeriod.endDay;
  });
  const currentTotal = rounded(periodPurchases.reduce((sum, document) => sum + number(document.total), 0), 2);
  const currentComparableTotal = rounded(currentComparable.reduce((sum, document) => sum + number(document.total), 0), 2);
  const previousTotal = rounded(previousComparable.reduce((sum, document) => sum + number(document.total), 0), 2);
  const activeSuppliers = (input.suppliers ?? []).map(record).filter((supplier) =>
    text(supplier.status, "active") !== "archived"
  );

  const priceChanges = procurementPriceChanges(allDocuments, input.venueId);
  const comparisons = procurementComparisons(allDocuments, input.suppliers ?? [], {
    venueId: input.venueId,
    now,
  });
  const points = procurementPricePoints(allDocuments, { venueId: input.venueId });
  const actualPoints = points.filter((point) => point.sourceKind === "purchase");
  const expenses = (input.expenses ?? []).map(record).filter((expense) => {
    const expenseVenueId = number(expense.venueId, 0);
    return !input.venueId || !expenseVenueId || expenseVenueId === input.venueId;
  });
  const liabilities = supplierDebtSummary(purchases, expenses, input.venueId);
  const movementDocumentIds = new Set((input.stockMovements ?? []).map(record)
    .filter((movement) =>
      text(movement.type) === "receipt"
      && text(movement.status, "active") !== "cancelled"
      && !movement.reversedAt
    )
    .map((movement) => text(movement.sourceDocumentId, "", 100))
    .filter(Boolean));
  const paymentMismatch = purchases.filter((document) => {
    const documentId = text(document.id, "", 100);
    const summary = purchasePaymentSummary(document, expenses.filter((expense) =>
      isPurchasePayment(expense, documentId)
    ));
    const storedPaid = document.paidAmount == null ? null : rounded(number(document.paidAmount), 2);
    const storedBalance = document.balanceDue == null ? null : rounded(number(document.balanceDue), 2);
    const storedStatus = text(document.paymentStatus, "", 30);
    return summary.overpaidAmount > 0
      || (storedPaid !== null && Math.abs(storedPaid - summary.paidAmount) > 0.01)
      || (storedBalance !== null && Math.abs(storedBalance - summary.balanceDue) > 0.01)
      || (Boolean(storedStatus) && storedStatus !== summary.paymentStatus);
  });
  const stockMissing = purchases.filter((document) =>
    purchaseAffectsInventory(document)
    && !movementDocumentIds.has(text(document.id, "", 100))
  );
  const unmappedItems = confirmed.flatMap((document) => array(document.items).map(record).map((item) => {
    const packageInfo = inventoryPackageAmount(item.packageSize, item.unit);
    const productKey = text(item.purchaseProductKey ?? item.productKey, "", 300);
    return productKey && packageInfo.unit !== "unknown"
      ? null
      : {
          documentId: text(document.id, "", 100),
          itemId: text(item.id, "", 100),
          name: text(item.name, "Позиция", 240),
          reason: productKey ? "unit_not_normalized" as const : "mapping_unconfirmed" as const,
        };
  })).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const reviewDocuments = allDocuments.filter((document) =>
    ["review", "error"].includes(procurementDocumentState(document))
  );
  const periodPurchaseIds = new Set(
    periodPurchases.map((document) => text(document.id, "", 100)).filter(Boolean),
  );
  const periodReviewDocuments = reviewDocuments.filter((document) =>
    isoDate(document.date).startsWith(monthKey)
  );
  const periodPriceRises = priceChanges.filter((change) =>
    change.direction === "up" && periodPurchaseIds.has(change.currentDocumentId)
  );
  const periodUnmappedItems = unmappedItems.filter((item) =>
    periodPurchaseIds.has(item.documentId)
  );
  const integrationIssues = [...new Map(
    [...paymentMismatch, ...stockMissing].map((document) => [text(document.id), document]),
  ).values()];
  const periodIntegrationIssues = integrationIssues.filter((document) =>
    periodPurchaseIds.has(text(document.id, "", 100))
  );
  const periodReviewPurchaseIds = new Set(
    periodReviewDocuments
      .map((document) => text(document.id, "", 100))
      .filter((id) => periodPurchaseIds.has(id)),
  );
  const attentionPurchaseIds = new Set([
    ...periodPriceRises.map((change) => change.currentDocumentId),
    ...periodUnmappedItems.map((item) => item.documentId),
    ...periodIntegrationIssues.map((document) => text(document.id, "", 100)),
  ].filter((id) => id && !periodReviewPurchaseIds.has(id)));
  const normalPurchases = Math.max(
    0,
    periodPurchases.length - attentionPurchaseIds.size - periodReviewPurchaseIds.size,
  );

  const signals: Array<{
    id: string;
    type: "price_change" | "document_review" | "mapping" | "integration";
    tone: "orange" | "red";
    title: string;
    detail: string;
    documentId?: string;
  }> = [];
  if (periodPriceRises.length) {
    signals.push({
      id: "price-rise",
      type: "price_change",
      tone: "orange",
      title: `${periodPriceRises.length} ${plural(periodPriceRises.length, "товар подорожал", "товара подорожали", "товаров подорожали")}`,
      detail: `Максимальное подтверждённое изменение +${decimalLabel(periodPriceRises[0].percent)}%`,
      documentId: periodPriceRises[0].currentDocumentId,
    });
  }
  if (periodReviewDocuments.length) {
    signals.push({
      id: "document-review",
      type: "document_review",
      tone: periodReviewDocuments.some((document) => procurementDocumentState(document) === "error") ? "red" : "orange",
      title: `${periodReviewDocuments.length} ${plural(periodReviewDocuments.length, "документ требует", "документа требуют", "документов требуют")} проверки`,
      detail: "Откройте конкретные поля и позиции, которые нужно сверить",
      documentId: text(periodReviewDocuments[0].id, "", 100) || undefined,
    });
  }
  if (periodUnmappedItems.length) {
    signals.push({
      id: "unmapped-items",
      type: "mapping",
      tone: "orange",
      title: `${periodUnmappedItems.length} ${plural(periodUnmappedItems.length, "позиция не участвует", "позиции не участвуют", "позиций не участвуют")} в сравнении`,
      detail: "Нужно подтвердить товар и нормализованную единицу",
      documentId: periodUnmappedItems[0].documentId,
    });
  }
  if (periodIntegrationIssues.length) {
    signals.push({
      id: "integration-result",
      type: "integration",
      tone: "red",
      title: `${periodIntegrationIssues.length} ${plural(periodIntegrationIssues.length, "закупка требует", "закупки требуют", "закупок требуют")} проверки проведения`,
      detail: "Проверьте складской приход и сверку связанных платежей",
      documentId: text(periodIntegrationIssues[0].id, "", 100) || undefined,
    });
  }

  const chartMap = new Map<string, number>();
  for (const document of purchases) {
    const key = isoDate(document.date).slice(0, 7);
    if (key) chartMap.set(key, rounded((chartMap.get(key) ?? 0) + number(document.total), 2));
  }
  const chart = [...chartMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-12)
    .map(([period, total]) => ({ period, total }));

  const supplierMetrics = activeSuppliers.map((supplier) => {
    const id = text(supplier.id, "", 100);
    const name = text(supplier.name, "Поставщик", 180);
    const nameKey = normalizedName(name);
    const matchingDocuments = purchases.filter((document) =>
      text(document.supplierId) === id
      || normalizedName(document.supplierName) === nameKey
    );
    const periodDocuments = matchingDocuments.filter((document) => isoDate(document.date).startsWith(monthKey));
    const periodTotal = rounded(periodDocuments.reduce((sum, document) => sum + number(document.total), 0), 2);
    const linkedProducts = new Set(actualPoints.filter((point) =>
      point.supplierId === id || normalizedName(point.supplierName) === nameKey
    ).map((point) => point.productKey));
    const supplierChanges = priceChanges.filter((change) =>
      change.supplierId === id || normalizedName(change.supplierName) === nameKey
    );
    const sortedChanges = supplierChanges.map((change) => change.percent).sort((left, right) => left - right);
    const medianChange = sortedChanges.length
      ? sortedChanges[Math.floor(sortedChanges.length / 2)]
      : null;
    const debt = liabilities.suppliers.find((value) =>
      value.supplierId === id
      || normalizedName(value.supplierName) === nameKey
    );
    return {
      id,
      name,
      categories: array(supplier.categories).map((value) => text(value)).filter(Boolean),
      linkedProducts: linkedProducts.size,
      periodTotal,
      sharePercent: currentTotal > 0 ? rounded(periodTotal / currentTotal * 100, 1) : null,
      lastPurchaseDate: matchingDocuments.map((document) => isoDate(document.date)).sort().at(-1) ?? null,
      medianPriceChangePercent: medianChange,
      conditions: supplierConditions(supplier),
      contacts: {
        contactPerson: text(supplier.contactPerson, "", 120) || null,
        phone: text(supplier.phone, "", 80) || null,
        email: text(supplier.email, "", 160) || null,
        address: text(supplier.address, "", 240) || null,
      },
      notes: text(supplier.notes, "", 500) || null,
      purchaseDocuments: matchingDocuments.length,
      paidAmount: debt?.paidAmount ?? 0,
      outstandingAmount: debt?.balanceDue ?? 0,
      openDocumentCount: debt?.openDocumentCount ?? 0,
    };
  }).sort((left, right) => right.periodTotal - left.periodTotal || left.name.localeCompare(right.name, "ru"));

  const externalRoot = record(input.supplierAlternatives);
  const externalAlternatives = array(externalRoot.alternatives).map(record)
    .filter((alternative) => text(alternative.decision, "new") !== "dismissed")
    .slice(0, 40)
    .map((alternative) => ({
      id: text(alternative.id, "", 600),
      supplierName: text(alternative.supplierName, "Поставщик", 160),
      product: text(alternative.product, "Товар", 180),
      matchedTo: text(alternative.matchedTo, "", 180),
      candidatePrice: number(alternative.candidatePrice) || null,
      currency: text(alternative.currency, "", 12) || null,
      unit: text(alternative.unit, "", 50) || null,
      packageSize: text(alternative.packageSize, "", 80) || null,
      verifiedAt: isoDate(alternative.verifiedAt) || null,
      decision: text(alternative.decision, "new", 40),
      sourceUrls: array(alternative.sourceUrls).map((value) => text(value, "", 1_500)).filter(Boolean).slice(0, 5),
      note: "Опубликованное предложение; не считается фактической закупочной ценой",
    }));

  return {
    version: "procurement-analytics-v1" as const,
    period: {
      key: monthKey,
      previousKey: comparisonPeriod.previousKey,
      comparisonBasis: comparisonPeriod.comparisonBasis,
    },
    kpi: {
      purchaseTotal: currentTotal,
      purchaseCount: periodPurchases.length,
      activeSupplierCount: activeSuppliers.length,
      comparableCurrentTotal: currentComparableTotal,
      comparablePreviousTotal: previousTotal,
      changePercent: previousTotal > 0
        ? rounded((currentComparableTotal / previousTotal - 1) * 100, 1)
        : null,
    },
    counts: {
      allDocuments: allDocuments.length,
      confirmedPurchases: purchases.length,
      confirmedPriceLists: priceLists.length,
      reviewDocuments: reviewDocuments.length,
      periodReviewDocuments: periodReviewDocuments.length,
      normalPurchases,
      attentionPurchases: attentionPurchaseIds.size,
      unmappedItems: unmappedItems.length,
      financeMissing: paymentMismatch.length,
      paymentMismatch: paymentMismatch.length,
      stockMissing: stockMissing.length,
    },
    signals,
    priceChanges,
    comparisons,
    opportunities: comparisons.filter((comparison) => comparison.opportunity && comparison.alternative),
    chart,
    liabilities,
    supplierMetrics,
    unmappedItems,
    integrity: {
      financeMissingDocumentIds: paymentMismatch.map((document) => text(document.id)).filter(Boolean),
      paymentMismatchDocumentIds: paymentMismatch.map((document) => text(document.id)).filter(Boolean),
      stockMissingDocumentIds: stockMissing.map((document) => text(document.id)).filter(Boolean),
    },
    externalAlternatives,
    aiContext: {
      confirmedPurchases: actualPoints.slice(0, 120),
      supplierConditions: supplierMetrics.slice(0, 40).map((supplier) => ({
        supplierId: supplier.id,
        supplierName: supplier.name,
        conditions: supplier.conditions,
      })),
      priceChanges: priceChanges.slice(0, 40),
      comparableOffers: comparisons.slice(0, 40),
      supplierLiabilities: liabilities,
      mappingStatus: {
        comparableItems: new Set(points.map((point) => point.productKey)).size,
        unconfirmedItems: unmappedItems.length,
      },
      externalAlternatives,
      freshness: {
        latestConfirmedPurchaseAt: purchases.map((document) => isoDate(document.date)).sort().at(-1) ?? null,
        generatedAt: now.toISOString(),
      },
      guardrails: [
        "Неподтверждённый OCR не является фактом закупки",
        "Неподтверждённое сопоставление не используется для сравнения цен",
        "Прайс-лист является предложением, но не фактической закупочной ценой",
        "Разные валюты и ненормализованные единицы не сравниваются",
      ],
    },
  };
}
