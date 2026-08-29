import assert from "node:assert/strict";
import test from "node:test";

import { resolveAccountingMoney } from "../lib/bardoctor/accounting-money";
import { revisePurchaseInInventory } from "../lib/bardoctor/inventory";
import {
  normalizePurchaseAccounting,
  purchasePaymentSummary,
  type PurchaseDocument,
} from "../lib/bardoctor/purchases";

const documentId = "b54e2f38-a4df-49b0-8510-12904fbe183e";
const paymentId = `purchase-payment:${documentId}`;
const productKey = "stock:коньяк белый аист|ml";
const now = "2026-08-28T00:00:00.000Z";

function whiteStorkDocument(currency: string): PurchaseDocument {
  return {
    id: documentId,
    internalId: documentId,
    venueId: 1,
    sourceType: "manual",
    source: "manual",
    sourceLabel: "Ручной ввод",
    documentType: "receipt",
    supplierId: "806ed11a-ea40-448c-8828-bcbb208bb17a",
    supplierName: "Розничный магазин",
    supplierType: "wholesale",
    date: "2026-08-26",
    currency,
    paymentMethod: "cash",
    expenseCategory: "alcohol",
    total: 361,
    items: [{
      id: "47d633d5-4b03-442c-833a-c598ac7f57cc",
      purchaseProductKey: productKey,
      name: "Коньяк Белый Аист",
      quantity: 3,
      unit: "л",
      quantityMode: "measure",
      packageSize: "500 мл",
      unitPrice: 120.33,
      lineTotal: 361,
      category: "alcohol",
      confidence: 1,
      requiresReview: false,
    }],
    confidence: 1,
    warnings: [],
    sourceFileIds: [],
    sourceFileNames: [],
    sourceFileTypes: [],
    pageCount: 1,
    status: "confirmed",
    paymentStatus: "paid",
    paidAmount: 361,
    balanceDue: 0,
    paymentIds: [paymentId],
    overpaidAmount: 0,
    ledgerVersion: 2,
    createdAt: "2026-08-26T09:12:30.965Z",
    updatedAt: "2026-08-26T12:20:17.056Z",
    confirmedAt: "2026-08-26T09:14:48.467Z",
  } as PurchaseDocument;
}

function payment(currency: string) {
  return {
    id: paymentId,
    venueId: 1,
    date: "2026-08-26",
    amount: 361,
    currency,
    purchaseId: documentId,
    sourceDocumentId: documentId,
    source: "purchase_payment",
    paymentKind: "supplier_payment",
    status: "posted",
    ledgerVersion: 2,
  };
}

test("legacy ISO RUB is not an alias for PMR_RUB", () => {
  const money = resolveAccountingMoney({
    value: { total: 550, currency: "RUB" },
    accountingCurrency: "PMR_RUB",
  });
  assert.equal(money?.status, "unresolved");
  assert.equal(money?.reason, "missing_historical_fx");
});

test("White Stork label correction preserves 361 and requires the linked payment relabel", () => {
  const normalized = normalizePurchaseAccounting({
    document: whiteStorkDocument("PMR_RUB"),
    accountingCurrency: "PMR_RUB",
    now,
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.document.total, 361);
  assert.equal(normalized.document.accountingAmount, 361);
  assert.equal(normalized.document.fxRate, undefined);

  const documentOnly = purchasePaymentSummary(
    normalized.document,
    [payment("MDL")],
    "PMR_RUB",
  );
  assert.equal(documentOnly.paidAmount, 0);
  assert.equal(documentOnly.balanceDue, 361);
  assert.deepEqual(documentOnly.unconvertedPaymentIds, [paymentId]);

  const completeRelabel = purchasePaymentSummary(
    normalized.document,
    [payment("PMR_RUB")],
    "PMR_RUB",
  );
  assert.equal(completeRelabel.paidAmount, 361);
  assert.equal(completeRelabel.balanceDue, 0);
  assert.equal(completeRelabel.conversionComplete, true);
});

test("White Stork stock valuation becomes 361 PMR_RUB without FX", () => {
  const previousDocument = whiteStorkDocument("MDL");
  const normalized = normalizePurchaseAccounting({
    document: whiteStorkDocument("PMR_RUB"),
    accountingCurrency: "PMR_RUB",
    now,
  });
  assert.equal(normalized.ok, true);

  const result = revisePurchaseInInventory({
    assortment: {
      stockBalances: [{
        key: productKey,
        productKey,
        name: "Коньяк Белый Аист",
        category: "alcohol",
        packageSize: "500 мл",
        packageOptions: ["500 мл"],
        unit: "ml",
        current: 3_000,
        averageUnitCost: 0,
        inventoryValue: 0,
        currency: "RUB",
        accountingCurrency: "RUB",
        lastTransactionCurrency: "MDL",
        lastDocumentId: documentId,
        costNeedsReview: true,
        costReviewReason: "missing_fx",
      }],
      nomenclature: [],
      recipes: [],
      supplierProductMappings: [],
    },
    previousDocument,
    nextDocument: normalized.document,
    stockMovements: [{
      id: "1b8c1746-35de-4729-a5c5-dac69c0b1d0d",
      type: "receipt",
      date: "2026-08-26",
      productKey,
      productName: "Коньяк Белый Аист",
      amount: 3_000,
      unit: "ml",
      transactionCostAmount: 361,
      transactionCurrency: "MDL",
      sourceDocumentId: documentId,
      sourceLineId: "47d633d5-4b03-442c-833a-c598ac7f57cc",
      createdAt: "2026-08-26T12:20:17.056Z",
      status: "active",
    }],
    accountingCurrency: "PMR_RUB",
    now,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>)
    .find((value) => value.productKey === productKey);
  assert.equal(balance?.current, 3_000);
  assert.equal(balance?.inventoryValue, 361);
  assert.equal(balance?.averageUnitCost, 0.120333);
  assert.equal(balance?.currency, "PMR_RUB");
  assert.equal(balance?.costNeedsReview, undefined);
  const active = result.movements.find((value) =>
    value.sourceDocumentId === documentId && value.status === "active"
  );
  assert.equal(active?.costAmount, 361);
  assert.equal(active?.currency, "PMR_RUB");
  assert.equal(active?.transactionCostAmount, 361);
  assert.equal(active?.transactionCurrency, "PMR_RUB");
  assert.equal(active?.exchangeRateToAccounting, undefined);
});
