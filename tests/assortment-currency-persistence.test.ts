import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAssortmentMenuCurrencyUpdates } from "../lib/bardoctor/assortment-currency";
import { accountingCurrencyLabel, normalizeAccountingCurrency } from "../lib/bardoctor/currency";

const fixture = {
  venueId: 1,
  menuItems: [{
    id: "safe-pmr-fixture",
    name: "Безопасная тестовая позиция",
    type: "service",
    salePrice: 10,
    currency: "PMR_RUB",
  }],
  recipes: [],
  nomenclature: [],
  stockBalances: [],
};

test("new PMR_RUB assortment item survives API-style server persistence and reload", () => {
  const requestPayload = JSON.parse(JSON.stringify({ data: fixture, baseData: { menuItems: [] } }));
  const normalized = normalizeAssortmentMenuCurrencyUpdates(
    requestPayload.baseData,
    requestPayload.data,
    "PMR_RUB",
  );

  assert.deepEqual(normalized.issues, []);
  const serverDataJson = JSON.stringify(normalized.data);
  const reloaded = JSON.parse(serverDataJson);
  const editFormItem = reloaded.menuItems.find((item: { id: string }) => item.id === "safe-pmr-fixture");

  assert.equal(editFormItem.currency, "PMR_RUB");
  assert.equal(normalizeAccountingCurrency(editFormItem.currency), "PMR_RUB");
  assert.equal(accountingCurrencyLabel(editFormItem.currency), "руб. ПМР");
});

test("new assortment records always use the profile accounting currency", () => {
  const currencies = ["MDL", "PMR_RUB", "RUB", "EUR", "USD", "UAH", "RON"];
  const data = {
    menuItems: currencies.map((currency) => ({ id: currency, name: currency, currency })),
  };
  const normalized = normalizeAssortmentMenuCurrencyUpdates({ menuItems: [] }, data, "PMR_RUB");
  const reloaded = JSON.parse(JSON.stringify(normalized.data));

  assert.deepEqual(normalized.issues, []);
  assert.deepEqual(
    reloaded.menuItems.map((item: { currency: string }) => item.currency),
    currencies.map(() => "PMR_RUB"),
  );
});

test("unchanged legacy RUB records are not relabelled as PMR_RUB", () => {
  const before = { menuItems: [{ id: "legacy-rub", name: "Legacy", currency: "RUB" }] };
  const normalized = normalizeAssortmentMenuCurrencyUpdates(before, structuredClone(before), "PMR_RUB");
  const item = (normalized.data as { menuItems: Array<{ currency: string }> }).menuItems[0];

  assert.deepEqual(normalized.issues, []);
  assert.equal(item.currency, "RUB");
});

test("API ignores a client currency override on a new menu item", () => {
  const normalized = normalizeAssortmentMenuCurrencyUpdates(
    { menuItems: [] },
    { menuItems: [{ id: "bad", name: "Bad", currency: "BTC" }] },
    "PMR_RUB",
  );

  assert.deepEqual(normalized.issues, []);
  assert.equal(
    (normalized.data as { menuItems: Array<{ currency: string }> }).menuItems[0].currency,
    "PMR_RUB",
  );
});

test("assortment write requires an accounting currency in the venue profile", () => {
  const normalized = normalizeAssortmentMenuCurrencyUpdates(
    { menuItems: [] },
    { menuItems: [{ id: "new", name: "New" }] },
    null,
  );

  assert.equal(normalized.issues[0]?.code, "ACCOUNTING_CURRENCY_REQUIRED");
});
