import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProcurementAnalytics,
  procurementComparisons,
  procurementDocumentState,
  procurementPriceChanges,
  procurementPricePoints,
} from "../lib/bardoctor/procurement-analytics";

function document(input: Record<string, unknown>) {
  return {
    id: "document-1",
    venueId: 10,
    status: "confirmed",
    documentType: "invoice",
    supplierId: "supplier-a",
    supplierName: "Поставщик A",
    date: "2026-08-07",
    currency: "RUB",
    expenseCategory: "alcohol",
    total: 120,
    confirmedAt: "2026-08-07T12:00:00.000Z",
    updatedAt: "2026-08-07T12:00:00.000Z",
    items: [{
      id: "line-1",
      purchaseProductKey: "vodka-x",
      name: "Vodka X",
      quantity: 1,
      unit: "шт.",
      packageSize: "0,5 л",
      unitPrice: 120,
      lineTotal: 120,
      category: "alcohol",
      confidence: 0.91,
    }],
    ...input,
  };
}

test("operational document state never treats OCR confidence as user confirmation", () => {
  assert.equal(procurementDocumentState({ status: "draft", confidence: 0.99, items: [] }), "draft");
  assert.equal(procurementDocumentState({ status: "draft", confidence: 0.65, items: [] }), "review");
  assert.equal(procurementDocumentState({ status: "confirmed", confidence: 0.2 }), "conducted");
  assert.equal(procurementDocumentState({ status: "confirmed", documentType: "price_list" }), "verified");
  assert.equal(procurementDocumentState({ status: "cancelled", confidence: 0.99 }), "cancelled");
  assert.equal(procurementDocumentState({ status: "confirmed", syncStatus: "failed" }), "error");
});

test("price history uses only confirmed, mapped and normalized lines", () => {
  const points = procurementPricePoints([
    document({ id: "confirmed" }),
    document({ id: "draft", status: "draft" }),
    document({
      id: "unmapped",
      items: [{ id: "line-u", name: "Без mapping", quantity: 1, unit: "шт.", lineTotal: 10 }],
    }),
    document({
      id: "unknown-unit",
      items: [{ id: "line-x", purchaseProductKey: "x", name: "X", quantity: 1, unit: "ведро", lineTotal: 10 }],
    }),
  ]);

  assert.deepEqual(points.map((point) => point.documentId), ["confirmed"]);
  assert.equal(points[0].normalizedDisplayPrice, 240);
  assert.equal(points[0].normalizedDisplayUnit, "л");
});

test("historical price points resolve canonical supersession aliases", () => {
  const points = procurementPricePoints([
    document({ id: "old-document" }),
  ], {
    productAliases: [{ from: "vodka-x", to: "canonical-vodka" }],
  });
  assert.equal(points[0].productKey, "canonical-vodka");
});

test("document revisions replace a price point instead of creating false history", () => {
  const points = procurementPricePoints([
    document({ id: "same", updatedAt: "2026-08-07T10:00:00.000Z", total: 120 }),
    document({
      id: "same",
      updatedAt: "2026-08-07T14:00:00.000Z",
      total: 109,
      items: [{
        id: "line-1",
        purchaseProductKey: "vodka-x",
        name: "Vodka X",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 109,
        lineTotal: 109,
      }],
    }),
  ]);

  assert.equal(points.length, 1);
  assert.equal(points[0].lineTotal, 109);
  assert.equal(procurementPriceChanges([
    document({ id: "same", updatedAt: "2026-08-07T10:00:00.000Z" }),
    document({ id: "same", updatedAt: "2026-08-07T14:00:00.000Z", total: 109 }),
  ]).length, 0);
});

test("price changes are calculated per normalized unit from actual purchases only", () => {
  const changes = procurementPriceChanges([
    document({ id: "old", date: "2026-07-01" }),
    document({
      id: "new",
      date: "2026-08-01",
      total: 138,
      items: [{
        id: "line-new",
        purchaseProductKey: "vodka-x",
        name: "Vodka X",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 138,
        lineTotal: 138,
      }],
    }),
    document({
      id: "price-list",
      documentType: "price_list",
      date: "2026-08-02",
      total: 80,
      items: [{
        id: "line-price",
        purchaseProductKey: "vodka-x",
        name: "Vodka X",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 80,
        lineTotal: 80,
      }],
    }),
  ]);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].percent, 15);
  assert.equal(changes[0].currentDocumentId, "new");
});

test("comparison normalizes packaging but never crosses product key, base unit or currency", () => {
  const inputs = [
    document({ id: "a", supplierId: "a", supplierName: "A", date: "2026-08-10", total: 120 }),
    document({
      id: "a-newer-price-list",
      documentType: "price_list",
      supplierId: "a",
      supplierName: "A",
      date: "2026-08-11",
      total: 50,
      items: [{
        id: "line-a-price-list",
        purchaseProductKey: "vodka-x",
        name: "Vodka X",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 50,
        lineTotal: 50,
      }],
    }),
    document({
      id: "b",
      supplierId: "b",
      supplierName: "B",
      date: "2026-08-07",
      total: 200,
      items: [{
        id: "line-b",
        purchaseProductKey: "vodka-x",
        name: "Vodka X 1 л",
        quantity: 2,
        unit: "шт.",
        packageSize: "1 л",
        unitPrice: 100,
        lineTotal: 200,
      }],
    }),
    document({ id: "eur", supplierId: "c", supplierName: "C", currency: "EUR" }),
    document({
      id: "other-product",
      supplierId: "d",
      supplierName: "D",
      items: [{
        id: "line-d",
        purchaseProductKey: "vodka-y",
        name: "Vodka Y",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        lineTotal: 40,
      }],
    }),
  ];
  const comparisons = procurementComparisons(inputs, [], { now: new Date("2026-08-12T12:00:00Z") });

  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].offers.length, 2);
  assert.equal(comparisons[0].current.documentId, "a");
  assert.equal(comparisons[0].current.sourceKind, "purchase");
  assert.equal(comparisons[0].priceDifference, 140);
  assert.equal(comparisons[0].unit, "л");
  assert.equal(comparisons[0].comparisonScope, "price_only");
});

test("opportunity estimates require enough real volume history and known comparable conditions stay explicit", () => {
  const inputs = [
    document({ id: "a-1", supplierId: "a", supplierName: "A", date: "2026-06-10" }),
    document({ id: "a-2", supplierId: "a", supplierName: "A", date: "2026-07-10" }),
    document({ id: "a-3", supplierId: "a", supplierName: "A", date: "2026-08-10" }),
    document({
      id: "b-price",
      documentType: "price_list",
      supplierId: "b",
      supplierName: "B",
      date: "2026-08-11",
      total: 109,
      items: [{
        id: "line-b",
        purchaseProductKey: "vodka-x",
        name: "Vodka X",
        quantity: 1,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 109,
        lineTotal: 109,
      }],
    }),
  ];
  const [comparison] = procurementComparisons(inputs, [
    { id: "a", name: "A", paymentTerms: "Отсрочка 7 дней" },
    { id: "b", name: "B", minimumOrder: "10 000 ₽", deliveryTerms: "Доставка 2 дня" },
  ], { now: new Date("2026-08-12T12:00:00Z") });

  assert.equal(comparison.opportunity, true);
  assert.equal(comparison.comparisonScope, "price_and_conditions");
  assert.ok(comparison.estimatedMonthlySaving !== null);
  assert.equal(comparison.estimateBasis?.actualPurchaseDocuments, 3);
});

test("period comparison uses equal elapsed days and integrity checks exclude price lists", () => {
  const purchaseAugust = document({ id: "aug", date: "2026-08-10", total: 100 });
  const purchaseJulyComparable = document({ id: "jul-early", date: "2026-07-10", total: 80 });
  const purchaseJulyLate = document({ id: "jul-late", date: "2026-07-25", total: 1_000 });
  const priceList = document({ id: "price-list", documentType: "price_list", date: "2026-08-08", total: 500 });
  const analytics = buildProcurementAnalytics({
    documents: [purchaseAugust, purchaseJulyComparable, purchaseJulyLate, priceList],
    suppliers: [{ id: "supplier-a", name: "Поставщик A", status: "active" }],
    expenses: [{ id: "expense-aug", sourceDocumentId: "aug" }],
    stockMovements: [{ id: "stock-aug", type: "receipt", sourceDocumentId: "aug" }],
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.kpi.purchaseTotal, 100);
  assert.equal(analytics.kpi.comparablePreviousTotal, 80);
  assert.equal(analytics.kpi.changePercent, 25);
  assert.equal(analytics.period.comparisonBasis, "same_elapsed_days");
  assert.equal(analytics.counts.confirmedPriceLists, 1);
  assert.equal(analytics.counts.periodReviewDocuments, 0);
  assert.equal(analytics.counts.attentionPurchases, 0);
  assert.equal(analytics.counts.normalPurchases, 1);
  assert.deepEqual(analytics.integrity.financeMissingDocumentIds, []);
  assert.deepEqual(analytics.integrity.paymentMismatchDocumentIds, []);
  assert.deepEqual(analytics.integrity.stockMissingDocumentIds.sort(), ["jul-early", "jul-late"]);
});

test("payment integrity reports stored ledger mismatches but not ordinary unpaid purchases", () => {
  const unpaid = document({
    id: "unpaid",
    paidAmount: 0,
    balanceDue: 120,
    paymentStatus: "unpaid",
  });
  const stale = document({
    id: "stale",
    paidAmount: 120,
    balanceDue: 0,
    paymentStatus: "paid",
  });
  const analytics = buildProcurementAnalytics({
    documents: [unpaid, stale],
    suppliers: [],
    expenses: [],
    stockMovements: [
      { id: "stock-unpaid", type: "receipt", sourceDocumentId: "unpaid" },
      { id: "stock-stale", type: "receipt", sourceDocumentId: "stale" },
    ],
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.deepEqual(analytics.integrity.paymentMismatchDocumentIds, ["stale"]);
  assert.deepEqual(analytics.integrity.financeMissingDocumentIds, ["stale"]);
});

test("period status counts are derived from real price, mapping and review evidence", () => {
  const oldPurchase = document({ id: "old", date: "2026-07-01", total: 120 });
  const priceRise = document({
    id: "price-rise",
    date: "2026-08-01",
    total: 138,
    items: [{
      id: "line-rise",
      purchaseProductKey: "vodka-x",
      name: "Vodka X",
      quantity: 1,
      unit: "шт.",
      packageSize: "0,5 л",
      unitPrice: 138,
      lineTotal: 138,
    }],
  });
  const unmapped = document({
    id: "unmapped-current",
    date: "2026-08-02",
    total: 20,
    items: [{
      id: "line-unmapped",
      name: "Не сопоставлено",
      quantity: 1,
      unit: "шт.",
      packageSize: "1 шт.",
      unitPrice: 20,
      lineTotal: 20,
    }],
  });
  const allIds = ["old", "price-rise", "unmapped-current"];
  const analytics = buildProcurementAnalytics({
    documents: [oldPurchase, priceRise, unmapped],
    suppliers: [{ id: "supplier-a", name: "Поставщик A", status: "active" }],
    expenses: allIds.map((id) => ({ id: `expense-${id}`, sourceDocumentId: id })),
    stockMovements: allIds.map((id) => ({ id: `stock-${id}`, type: "receipt", sourceDocumentId: id })),
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.kpi.purchaseCount, 2);
  assert.equal(analytics.counts.normalPurchases, 0);
  assert.equal(analytics.counts.attentionPurchases, 2);
  assert.equal(analytics.counts.periodReviewDocuments, 0);
  assert.deepEqual(analytics.signals.map((signal) => signal.type).sort(), ["mapping", "price_change"]);
});

test("venue filtering prevents mixed-store data from leaking into analytics", () => {
  const analytics = buildProcurementAnalytics({
    documents: [
      document({ id: "venue-a", venueId: 10, total: 100 }),
      document({ id: "venue-b", venueId: 11, total: 9_999 }),
    ],
    suppliers: [],
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.kpi.purchaseTotal, 100);
  assert.equal(analytics.counts.confirmedPurchases, 1);
});

test("accounting totals exclude unconverted foreign-currency purchases instead of adding currencies", () => {
  const analytics = buildProcurementAnalytics({
    documents: [
      document({ id: "rub", currency: "RUB", total: 100 }),
      document({ id: "mdl", currency: "MDL", total: 361 }),
    ],
    suppliers: [],
    period: "2026-08",
    venueId: 10,
    accountingCurrency: "RUB",
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.kpi.purchaseTotal, 100);
  assert.equal(analytics.counts.excludedForeignCurrencyPurchases, 1);
  assert.deepEqual(analytics.integrity.excludedForeignCurrencyDocumentIds, ["mdl"]);
  assert.deepEqual(analytics.integrity.excludedForeignCurrencyTotals, { MDL: 361 });
});

test("legacy purchase documents without supplier ids remain attached by exact supplier name", () => {
  const legacy = document({ id: "legacy", supplierId: undefined, supplierName: "Поставщик A" });
  const analytics = buildProcurementAnalytics({
    documents: [legacy],
    suppliers: [{ id: "supplier-a", name: "Поставщик A", status: "active" }],
    expenses: [{ id: "expense-legacy", sourceDocumentId: "legacy" }],
    stockMovements: [{ id: "stock-legacy", type: "receipt", sourceDocumentId: "legacy" }],
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.supplierMetrics[0].periodTotal, 120);
  assert.equal(analytics.supplierMetrics[0].linkedProducts, 1);
  assert.equal(analytics.supplierMetrics[0].purchaseDocuments, 1);
});

test("analytics exposes supplier liabilities without double-counting the purchase as cash outflow", () => {
  const analytics = buildProcurementAnalytics({
    documents: [
      document({ id: "invoice-1", total: 10_291.8 }),
      document({ id: "invoice-2", date: "2026-08-10", total: 12_400 }),
    ],
    suppliers: [{ id: "supplier-a", name: "Поставщик A", status: "active" }],
    expenses: [{
      id: "payment-1",
      venueId: 10,
      source: "purchase_payment",
      paymentKind: "supplier_payment",
      sourceDocumentId: "invoice-1",
      amount: 5_000,
    }],
    stockMovements: [
      { id: "stock-1", type: "receipt", sourceDocumentId: "invoice-1" },
      { id: "stock-2", type: "receipt", sourceDocumentId: "invoice-2" },
    ],
    period: "2026-08",
    venueId: 10,
    now: new Date("2026-08-12T12:00:00Z"),
  });

  assert.equal(analytics.liabilities.totalOutstanding, 17_691.8);
  assert.equal(analytics.liabilities.openDocumentCount, 2);
  assert.equal(analytics.supplierMetrics[0].paidAmount, 5_000);
  assert.equal(analytics.supplierMetrics[0].outstandingAmount, 17_691.8);
  assert.equal(analytics.supplierMetrics[0].openDocumentCount, 2);
  assert.equal(analytics.aiContext.supplierLiabilities.totalOutstanding, 17_691.8);
});
