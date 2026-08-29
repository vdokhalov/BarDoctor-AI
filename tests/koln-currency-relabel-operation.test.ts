import assert from "node:assert/strict";
import test from "node:test";

import {
  KOLN_ORANGES_LINE_ID,
  KOLN_TEA_BAGS_LINE_ID,
  KOLN_WHITE_STORK_DOCUMENT_ID,
  KOLN_WHITE_STORK_PRODUCT_KEY,
  buildKolnCurrencyRelabel,
  type KolnCurrencyStores,
} from "../lib/bardoctor/koln-currency-relabel";

function fixture() {
  const documents: Array<Record<string, unknown>> = [
    {
      id: KOLN_WHITE_STORK_DOCUMENT_ID,
      venueId: 1,
      documentType: "receipt",
      status: "confirmed",
      supplierId: "white-supplier",
      supplierName: "Розничный магазин",
      date: "2026-08-26",
      currency: "MDL",
      total: 361,
      items: [{
        id: "white-line",
        name: "Коньяк Белый Аист",
        purchaseProductKey: KOLN_WHITE_STORK_PRODUCT_KEY,
        quantity: 3,
        unit: "л",
        unitPrice: 120.33,
        lineTotal: 361,
      }],
    },
    {
      id: "oranges-document",
      venueId: 1,
      documentType: "receipt",
      status: "confirmed",
      supplierId: "market",
      supplierName: "Рынок",
      date: "2026-08-17",
      currency: "RUB",
      total: 25.35,
      items: [{ id: KOLN_ORANGES_LINE_ID, name: "Апельсины", quantity: 1.124, unit: "кг", unitPrice: 23, lineTotal: 25.35 }],
    },
    {
      id: "tea-document",
      venueId: 1,
      documentType: "receipt",
      status: "confirmed",
      supplierId: "sheriff",
      supplierName: "Шериф",
      date: "2026-08-01",
      currency: "RUB",
      total: 60,
      items: [{ id: KOLN_TEA_BAGS_LINE_ID, name: "Пакетики для чая", quantity: 100, unit: "шт", unitPrice: 0.5, lineTotal: 60 }],
    },
  ];
  for (let index = 3; index < 26; index += 1) {
    documents.push({
      id: `document-${index}`,
      venueId: 1,
      documentType: "receipt",
      status: "confirmed",
      supplierId: `supplier-${index % 3}`,
      supplierName: `Supplier ${index % 3}`,
      date: "2026-08-10",
      currency: "RUB",
      total: 0,
      items: [],
    });
  }
  let lineIndex = 0;
  while (documents.reduce((sum, document) => sum + (document.items as unknown[]).length, 0) < 160) {
    const document = documents[3 + (lineIndex % 23)];
    const items = document.items as Array<Record<string, unknown>>;
    items.push({
      id: `filler-line-${lineIndex}`,
      name: `Filler ${lineIndex}`,
      quantity: 1,
      unit: "шт",
      unitPrice: 1,
      lineTotal: 1,
    });
    document.total = Number(document.total) + 1;
    lineIndex += 1;
  }
  const expenses = documents.map((document) => ({
    id: `purchase-payment:${document.id}`,
    venueId: 1,
    date: document.date,
    amount: document.total,
    currency: document.currency,
    sourceDocumentId: document.id,
    purchaseId: document.id,
    paymentKind: "supplier_payment",
    status: "posted",
  }));
  const stores: KolnCurrencyStores = {
    bd_purchase_documents: documents,
    bd_finance_expenses: expenses,
    bd_stock_movements: [{
      id: "1b8c1746-35de-4729-a5c5-dac69c0b1d0d",
      type: "receipt",
      status: "active",
      amount: 3000,
      productKey: KOLN_WHITE_STORK_PRODUCT_KEY,
      sourceDocumentId: KOLN_WHITE_STORK_DOCUMENT_ID,
      transactionCostAmount: 361,
      transactionCurrency: "MDL",
    }],
    bd_assortment_v1: {
      venueId: 1,
      menuItems: [{ id: "menu", salePrice: 95, currency: "MDL" }],
      priceHistory: [{ id: "history", oldPrice: 45, newPrice: 95, currency: "MDL" }],
      supplierProductMappings: [{ id: "mapping", lastPrice: 120.33, currency: "MDL" }],
      stockBalances: [{
        id: KOLN_WHITE_STORK_PRODUCT_KEY,
        key: KOLN_WHITE_STORK_PRODUCT_KEY,
        productKey: KOLN_WHITE_STORK_PRODUCT_KEY,
        current: 3000,
        averageUnitCost: 0,
        inventoryValue: 0,
        currency: "RUB",
        accountingCurrency: "RUB",
        lastTransactionCurrency: "MDL",
        costNeedsReview: true,
        costReviewReason: "missing_fx",
      }],
      nomenclature: [{
        id: KOLN_WHITE_STORK_PRODUCT_KEY,
        key: KOLN_WHITE_STORK_PRODUCT_KEY,
        productKey: KOLN_WHITE_STORK_PRODUCT_KEY,
        current: 3000,
        averageUnitCost: 0,
        inventoryValue: 0,
        currency: "RUB",
        accountingCurrency: "RUB",
        lastTransactionCurrency: "MDL",
        costNeedsReview: true,
        costReviewReason: "missing_fx",
      }],
    },
    bd_suppliers: [{ id: "white-supplier", currency: "MDL" }, { id: "market", currency: "RUB" }],
  };
  return { documents, stores };
}

test("controlled Köln relabel changes labels, not source arithmetic", () => {
  const { stores } = fixture();
  const result = buildKolnCurrencyRelabel({
    restaurant: { name: "Кёльн", currency: "RUB" },
    stores,
    now: "2026-08-28T08:00:00.000Z",
  });
  assert.equal(result.restaurant.currency, "PMR_RUB");
  assert.equal(result.counts.purchaseDocuments, 26);
  assert.equal(result.counts.purchaseLines, 160);
  assert.equal(result.counts.legacyLabelsAfter, 0);
  assert.equal(result.sourceVerification.oranges.quantity, 1.124);
  assert.equal(result.sourceVerification.oranges.unitPrice, 23);
  assert.equal(result.sourceVerification.oranges.lineTotal, 25.35);
  assert.equal(result.sourceVerification.teaBags.quantity, 100);
  assert.equal(result.sourceVerification.teaBags.unitPrice, 0.5);
  assert.equal(result.sourceVerification.teaBags.lineTotal, 60);
  assert.equal(result.reconciliation.whiteStork.purchaseBefore, 361);
  assert.equal(result.reconciliation.whiteStork.purchaseAfter, 361);
  assert.equal(result.reconciliation.whiteStork.stockQuantityBefore, 3000);
  assert.equal(result.reconciliation.whiteStork.stockQuantityAfter, 3000);
  assert.equal(result.reconciliation.whiteStork.inventoryValueBefore, 0);
  assert.equal(result.reconciliation.whiteStork.inventoryValueAfter, 361);
  assert.equal(result.reconciliation.whiteStork.averageUnitCostAfter, 0.120333);
  assert.equal(result.reconciliation.supplierDebt.afterPmrRub, 0);
});

test("controlled Köln relabel creates no FX fields", () => {
  const { stores } = fixture();
  const result = buildKolnCurrencyRelabel({
    restaurant: { name: "Кёльн", currency: "RUB" },
    stores,
    now: "2026-08-28T08:00:00.000Z",
  });
  const json = JSON.stringify(result.stores);
  for (const field of ["fxRate", "fxEffectiveDate", "fxSource", "fxLockedAt", "exchangeRateToAccounting"]) {
    assert.equal(json.includes(`\"${field}\"`), false, field);
  }
});

test("controlled Köln relabel stops when a protected source line changed", () => {
  const { stores } = fixture();
  const documents = stores.bd_purchase_documents as Array<Record<string, unknown>>;
  const oranges = (documents[1].items as Array<Record<string, unknown>>)[0];
  oranges.lineTotal = 25.85;
  assert.throws(() => buildKolnCurrencyRelabel({
    restaurant: { name: "Кёльн", currency: "RUB" },
    stores,
    now: "2026-08-28T08:00:00.000Z",
  }), /ORANGES_SOURCE_RECORD_CHANGED/);
});
