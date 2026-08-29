import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  accountingMoneyFields,
  lockAccountingMoney,
  resolveAccountingMoney,
} from "../lib/bardoctor/accounting-money";
import { normalizePurchaseAccounting, purchasePaymentSummary, supplierDebtSummary } from "../lib/bardoctor/purchases";

test("same-currency money requires no FX and preserves the original trace", () => {
  const mdl = resolveAccountingMoney({ originalAmount: 100, originalCurrency: "MDL", accountingCurrency: "MDL" });
  const pmr = resolveAccountingMoney({ originalAmount: 100, originalCurrency: "PMR_RUB", accountingCurrency: "PMR_RUB" });
  assert.deepEqual(mdl, {
    originalAmount: 100, originalCurrency: "MDL", accountingAmount: 100,
    accountingCurrency: "MDL", status: "same_currency",
  });
  assert.equal(pmr?.accountingAmount, 100);
});

test("historical source-to-accounting FX is deterministic and locked", () => {
  const result = lockAccountingMoney({
    value: {
      amount: 100,
      currency: "PMR_RUB",
      fxRate: 1.1,
      fxRateDirection: "source_to_accounting",
      fxEffectiveDate: "2026-08-26",
      fxSource: "invoice",
    },
    accountingCurrency: "MDL",
    now: "2026-08-28T10:00:00.000Z",
  });
  assert.equal(result?.accountingAmount, 110);
  assert.equal(result?.fxLockedAt, "2026-08-28T10:00:00.000Z");
  assert.equal(accountingMoneyFields(result!).originalCurrency, "PMR_RUB");
});

test("FX supports fractional amounts and six-decimal rate precision with minor-unit rounding", () => {
  const result = resolveAccountingMoney({
    originalAmount: 0.15,
    originalCurrency: "MDL",
    accountingCurrency: "PMR_RUB",
    fxRate: 1.234567,
  });
  assert.equal(result?.accountingAmount, 0.19);
});

test("foreign money without historical FX remains unresolved; no implicit 1:1", () => {
  const result = resolveAccountingMoney({ originalAmount: 100, originalCurrency: "PMR_RUB", accountingCurrency: "MDL" });
  assert.equal(result?.accountingAmount, null);
  assert.equal(result?.reason, "missing_historical_fx");
});

test("posting normalization blocks unresolved FX but permits a draft upstream", () => {
  const base = {
    id: "p1", documentType: "invoice" as const, supplierName: "S", supplierType: "wholesale" as const,
    date: "2026-08-26", currency: "PMR_RUB", paymentMethod: "unknown" as const,
    expenseCategory: "food", total: 100, items: [{ id: "l1", name: "A", quantity: 1, unit: "шт.", unitPrice: 100, lineTotal: 100, category: "food", confidence: 1 }],
    confidence: 1, warnings: [], source: "manual" as const,
  };
  const blocked = normalizePurchaseAccounting({ document: base, accountingCurrency: "MDL", now: "2026-08-28T00:00:00Z" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "PURCHASE_ACCOUNTING_CONVERSION_REQUIRED");
  const converted = normalizePurchaseAccounting({
    document: { ...base, fxRate: 1.1, fxRateDirection: "source_to_accounting", fxEffectiveDate: "2026-08-26", fxSource: "invoice" },
    accountingCurrency: "MDL",
    now: "2026-08-28T00:00:00Z",
  });
  assert.equal(converted.ok, true);
  assert.equal(converted.document.accountingAmount, 110);
  assert.equal(converted.document.items[0].accountingLineTotal, 110);
});

test("historical accounting amount is immutable and does not use a later rate", () => {
  const result = resolveAccountingMoney({
    value: { amount: 100, currency: "PMR_RUB", accountingAmount: 110, accountingCurrency: "MDL", fxRate: 1.1, fxLockedAt: "2026-08-26T12:00:00Z" },
    accountingCurrency: "MDL",
    fxRate: 9,
  });
  assert.equal(result?.accountingAmount, 110);
});

test("line accounting amounts derive from a stored document accounting amount without implicit 1:1", () => {
  const document = {
    id: "p2", documentType: "invoice" as const, supplierName: "S", supplierType: "wholesale" as const,
    date: "2026-08-26", currency: "PMR_RUB", originalAmount: 100, originalCurrency: "PMR_RUB",
    accountingAmount: 110, accountingCurrency: "MDL", fxEffectiveDate: "2026-08-26", fxSource: "manual", fxLockedAt: "2026-08-26T00:00:00Z",
    paymentMethod: "unknown" as const, expenseCategory: "food", total: 100,
    items: [{ id: "l1", name: "A", quantity: 1, unit: "шт.", unitPrice: 100, lineTotal: 100, category: "food", confidence: 1 }],
    confidence: 1, warnings: [], source: "manual" as const,
  };
  const normalized = normalizePurchaseAccounting({ document, accountingCurrency: "MDL", now: "2026-08-28T00:00:00Z" });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.document.items[0].accountingLineTotal, 110);
});

test("supplier debt and payments aggregate accounting values only", () => {
  const purchase = { id: "p", venueId: 1, status: "confirmed", documentType: "invoice", supplierName: "S", date: "2026-08-01", total: 500, currency: "PMR_RUB", accountingAmount: 540, accountingCurrency: "MDL" };
  const payments = [{ id: "pay", venueId: 1, source: "purchase_payment", sourceDocumentId: "p", amount: 500, currency: "PMR_RUB", accountingAmount: 540, accountingCurrency: "MDL", status: "posted" }];
  assert.equal(purchasePaymentSummary(purchase, payments, "MDL").balanceDue, 0);
  assert.equal(supplierDebtSummary([purchase], payments, 1, "MDL").totalOutstanding, 0);
});

test("posting routes block unconverted purchases and payments before writes", async () => {
  const [confirm, update, repost, payment] = await Promise.all([
    readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/update/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/repost/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/payment/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(confirm, /normalizePurchaseAccounting/);
  assert.match(update, /normalizePurchaseAccounting/);
  assert.match(repost, /normalizePurchaseAccounting/);
  assert.match(payment, /PAYMENT_ACCOUNTING_CONVERSION_REQUIRED/);
});
