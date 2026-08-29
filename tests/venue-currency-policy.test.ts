import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVenueCurrencyArrayUpdates,
  VENUE_CURRENCY_ARRAY_STORE_KEYS,
} from "../lib/bardoctor/venue-currency-policy";

test("new operational records use the active venue accounting currency", () => {
  const result = normalizeVenueCurrencyArrayUpdates({
    before: [],
    after: [
      { id: "supplier", currency: "USD" },
      { id: "purchase" },
      { id: "revenue", currency: "BTC" },
    ],
    accountingCurrency: "PMR_RUB",
  });

  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    (result.data as Array<{ currency: string }>).map((record) => record.currency),
    ["PMR_RUB", "PMR_RUB", "PMR_RUB"],
  );
});

test("unrelated writes preserve historical source currencies", () => {
  const before = [
    { id: "rub-history", amount: 10, currency: "RUB" },
    { id: "usd-history", amount: 20, currency: "USD" },
  ];
  const result = normalizeVenueCurrencyArrayUpdates({
    before,
    after: [
      { ...before[0], amount: 11 },
      { id: "usd-history", amount: 21 },
    ],
    accountingCurrency: "PMR_RUB",
  });

  assert.deepEqual(result.data, [
    { id: "rub-history", amount: 11, currency: "RUB" },
    { id: "usd-history", amount: 21, currency: "USD" },
  ]);
});

test("client attempts to select a different currency are normalized", () => {
  const result = normalizeVenueCurrencyArrayUpdates({
    before: [{ id: "record", amount: 10, currency: "RUB" }],
    after: [{ id: "record", amount: 10, currency: "EUR" }],
    accountingCurrency: "PMR_RUB",
  });

  assert.equal((result.data as Array<{ currency: string }>)[0].currency, "PMR_RUB");
});

test("currency-controlled stores cover finance, suppliers, purchases, and sales", () => {
  for (const key of [
    "bd_finance_revenue",
    "bd_finance_expenses",
    "bd_suppliers",
    "bd_purchase_documents",
    "bd_sales_documents",
    "bd_sales_batches",
  ]) {
    assert.equal(VENUE_CURRENCY_ARRAY_STORE_KEYS.has(key), true, key);
  }
});

test("writes fail safely when the venue profile has no accounting currency", () => {
  const result = normalizeVenueCurrencyArrayUpdates({
    before: [],
    after: [{ id: "new" }],
    accountingCurrency: null,
  });
  assert.equal(result.issues[0]?.code, "ACCOUNTING_CURRENCY_REQUIRED");
});
