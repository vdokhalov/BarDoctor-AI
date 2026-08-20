import assert from "node:assert/strict";
import test from "node:test";
import {
  findPurchaseExpense,
  inferPurchaseCategory,
  migratePurchaseLedger,
  normalizePurchaseDocument,
  purchaseAffectsInventory,
  purchasePaymentSummary,
  supplierDebtSummary,
  withPurchasePaymentSummary,
} from "../lib/bardoctor/purchases";

test("purchase expense lookup preserves idempotency on a repeated confirmation", () => {
  const linked = findPurchaseExpense([
    { id: "manual", amount: 10, source: "manual" },
    {
      id: "expense-1",
      amount: 428.5,
      source: "purchase_document",
      sourceDocumentId: "invoice-1",
    },
  ], "invoice-1");

  assert.equal(linked?.id, "expense-1");
  assert.equal(linked?.amount, 428.5);
  assert.equal(findPurchaseExpense([], "invoice-1"), null);
  assert.equal(findPurchaseExpense([{ sourceDocumentId: "invoice-1" }], "invoice-1"), null);
});

test("receipt normalization keeps line prices and derives a safe total", () => {
  const document = normalizePurchaseDocument({
    documentType: "receipt",
    supplierName: "Обычный магазин",
    date: "2026-07-29",
    currency: "RUB",
    items: [
      {
        name: "Coca-Cola 1 л",
        quantity: "3",
        unitPrice: "24,50",
        packageSize: "1 л",
        confidence: 0.94,
      },
      {
        name: "Салфетки",
        quantity: 2,
        lineTotal: 30,
      },
    ],
    source: "gallery",
    sourceFileIds: ["receipt-page-1", "receipt-page-2"],
    sourceFileNames: ["front.jpg", "back.jpg"],
    sourceFileTypes: ["image/jpeg", "image/jpeg"],
    pageCount: 2,
  }, "receipt-1");

  assert.equal(document.id, "receipt-1");
  assert.equal(document.total, 103.5);
  assert.equal(document.items[0].unitPrice, 24.5);
  assert.equal(document.items[0].lineTotal, 73.5);
  assert.equal(document.items[1].unitPrice, 15);
  assert.equal(document.items[1].category, "household");
  assert.equal(document.source, "gallery");
  assert.deepEqual(document.sourceFileIds, ["receipt-page-1", "receipt-page-2"]);
  assert.equal(document.pageCount, 2);
});

test("price list may be saved without a document total", () => {
  const document = normalizePurchaseDocument({
    documentType: "price_list",
    supplierName: "Оптовик",
    items: [{ name: "Виски 0.7 л", quantity: 1, unitPrice: 250 }],
  }, "price-list-1", "2026-07-29");

  assert.equal(document.documentType, "price_list");
  assert.equal(document.total, 250);
  assert.equal(document.supplierType, "wholesale");
  assert.equal(document.items[0].category, "alcohol");
});

test("purchase category inference separates common procurement groups", () => {
  assert.equal(inferPurchaseCategory("Табак для кальяна"), "hookah");
  assert.equal(inferPurchaseCategory("Средство моющее"), "household");
  assert.equal(inferPurchaseCategory("Вино красное"), "alcohol");
  assert.equal(inferPurchaseCategory("Сливки 10%"), "food");
  assert.equal(inferPurchaseCategory("Реклама в Instagram"), "marketing");
});

test("service documents become expenses without creating warehouse stock", () => {
  const marketingDocument = normalizePurchaseDocument({
    documentType: "invoice",
    supplierName: "Инстаграм",
    expenseCategory: "products",
    total: 1200,
    items: [{ name: "Реклама", quantity: 1, unit: "лит", lineTotal: 1200, category: "products" }],
  });
  assert.equal(marketingDocument.expenseCategory, "marketing");
  assert.equal(marketingDocument.items[0].category, "marketing");
  assert.equal(purchaseAffectsInventory(marketingDocument), false);
  assert.equal(purchaseAffectsInventory({
    documentType: "invoice",
    expenseCategory: "marketing",
    items: [{ name: "Реклама", quantity: 1, unit: "лит" }],
  }), false);
  assert.equal(purchaseAffectsInventory({
    documentType: "invoice",
    expenseCategory: "other",
    items: [{ name: "Услуга", quantity: 1, unit: "шт." }],
  }), false);
  assert.equal(purchaseAffectsInventory({
    documentType: "invoice",
    expenseCategory: "alcohol",
    items: [{ name: "Вино", quantity: 6, unit: "шт." }],
  }), true);
});

test("purchase payment summary supports unpaid, partial and fully paid documents", () => {
  const purchase = { id: "invoice-1", venueId: 10, documentType: "invoice", total: 10_291.8 };
  assert.deepEqual(purchasePaymentSummary(purchase, []), {
    paymentStatus: "unpaid",
    paidAmount: 0,
    balanceDue: 10_291.8,
    paymentIds: [],
    overpaidAmount: 0,
  });

  const partial = withPurchasePaymentSummary(purchase, [
    {
      id: "payment-1",
      venueId: 10,
      purchaseId: "invoice-1",
      source: "purchase_payment",
      status: "posted",
      amount: 6_000,
    },
    {
      id: "wrong-venue",
      venueId: 11,
      purchaseId: "invoice-1",
      source: "purchase_payment",
      status: "posted",
      amount: 2_000,
    },
    {
      id: "voided",
      venueId: 10,
      purchaseId: "invoice-1",
      source: "purchase_payment",
      status: "voided",
      amount: 2_000,
    },
  ]);
  assert.equal(partial.paymentStatus, "partial");
  assert.equal(partial.paidAmount, 6_000);
  assert.equal(partial.balanceDue, 4_291.8);
  assert.deepEqual(partial.paymentIds, ["payment-1"]);

  const paid = purchasePaymentSummary(purchase, [
    { id: "payment-1", venueId: 10, purchaseId: "invoice-1", source: "purchase_payment", amount: 6_000 },
    { id: "payment-2", venueId: 10, sourceDocumentId: "invoice-1", paymentKind: "supplier_payment", amount: 4_291.8 },
  ]);
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.paidAmount, 10_291.8);
  assert.equal(paid.balanceDue, 0);

  assert.equal(
    purchasePaymentSummary({ ...purchase, documentType: "price_list" }, []).paymentStatus,
    "not_applicable",
  );
});

test("supplier debt is derived only from confirmed venue-scoped purchases and linked payments", () => {
  const documents = [
    { id: "vprok-1", venueId: 10, status: "confirmed", documentType: "invoice", supplierId: "vprok", supplierName: "ВПРОК", documentNumber: "1", date: "2026-08-07", currency: "RUB", total: 10_291.8 },
    { id: "vprok-2", venueId: 10, status: "confirmed", documentType: "invoice", supplierId: "vprok", supplierName: "ВПРОК", documentNumber: "8", date: "2026-08-10", currency: "RUB", total: 12_400 },
    { id: "sherif-paid", venueId: 10, status: "confirmed", documentType: "invoice", supplierId: "sherif", supplierName: "Шериф", date: "2026-08-11", currency: "RUB", total: 2_000 },
    { id: "draft", venueId: 10, status: "draft", documentType: "invoice", supplierId: "vprok", supplierName: "ВПРОК", date: "2026-08-12", currency: "RUB", total: 99_999 },
    { id: "other-venue", venueId: 11, status: "confirmed", documentType: "invoice", supplierId: "vprok", supplierName: "ВПРОК", date: "2026-08-12", currency: "RUB", total: 88_888 },
  ];
  const expenses = [
    { id: "pay-1", venueId: 10, source: "purchase_payment", sourceDocumentId: "vprok-1", amount: 5_000 },
    { id: "pay-2", venueId: 10, paymentKind: "supplier_payment", sourceDocumentId: "sherif-paid", amount: 2_000 },
    { id: "legacy-unlinked", venueId: 10, source: "legacy_expense", supplierName: "ВПРОК", amount: 12_400 },
  ];

  const debt = supplierDebtSummary(documents, expenses, 10);
  assert.equal(debt.totalOutstanding, 17_691.8);
  assert.equal(debt.openDocumentCount, 2);
  const vprok = debt.suppliers.find((supplier) => supplier.supplierId === "vprok");
  assert.equal(vprok?.purchaseAmount, 22_691.8);
  assert.equal(vprok?.paidAmount, 5_000);
  assert.equal(vprok?.balanceDue, 17_691.8);
  assert.deepEqual(vprok?.documents.map((document) => document.documentNumber), ["8", "1"]);
  const sherif = debt.suppliers.find((supplier) => supplier.supplierId === "sherif");
  assert.equal(sherif?.balanceDue, 0);
  assert.equal(sherif?.openDocumentCount, 0);
});

test("legacy migration links only explicit purchase references and preserves uncertain expenses", () => {
  const migration = migratePurchaseLedger({
    venueId: 10,
    now: "2026-08-14T12:00:00.000Z",
    documents: [{
      id: "invoice-1",
      venueId: 10,
      status: "confirmed",
      documentType: "invoice",
      total: 1_200,
      date: "2026-08-10",
    }],
    expenses: [
      {
        id: "linked",
        source: "purchase_document",
        sourceDocumentId: "invoice-1",
        category: "products",
        amount: 500,
        date: "2026-08-10",
      },
      {
        id: "same-amount-and-date-but-unlinked",
        source: "manual",
        category: "products",
        supplierName: "Поставщик",
        amount: 1_200,
        date: "2026-08-10",
      },
    ],
  });

  const linked = migration.expenses.find((expense) => expense.id === "linked");
  const uncertain = migration.expenses.find((expense) => expense.id === "same-amount-and-date-but-unlinked");
  assert.equal(linked?.source, "purchase_payment");
  assert.equal(linked?.paymentKind, "supplier_payment");
  assert.equal(linked?.purchaseId, "invoice-1");
  assert.equal(linked?.migratedFrom, "purchase_document");
  assert.equal(uncertain?.purchaseId, undefined);
  assert.equal(uncertain?.legacy, true);
  assert.equal(uncertain?.legacyKind, "unlinked_purchase_expense");
  assert.equal(migration.documents[0].paidAmount, 500);
  assert.equal(migration.documents[0].paymentStatus, "partial");
  assert.equal(migration.summary.exactLinkedPayments, 1);
  assert.equal(migration.summary.legacyUnlinkedExpenses, 1);
});
