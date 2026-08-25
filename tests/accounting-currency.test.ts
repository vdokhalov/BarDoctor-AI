import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACCOUNTING_CURRENCIES,
  accountingCurrencyFromProfile,
  accountingCurrencyFromRestaurantJson,
  normalizeAccountingCurrency,
} from "../lib/bardoctor/currency";
import { venueProfileFromInput } from "../lib/bardoctor/venue-profile";
import {
  buildVenueAIContextFromSources,
  venueAIContextForPrompt,
} from "../lib/bardoctor/venue-ai-context";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("accounting currency uses the existing venue profile field as its canonical source", () => {
  assert.deepEqual([...ACCOUNTING_CURRENCIES], ["MDL", "RUB", "EUR", "USD", "UAH", "RON"]);
  assert.equal(normalizeAccountingCurrency(" rub "), "RUB");
  assert.equal(normalizeAccountingCurrency("btc"), null);
  assert.equal(accountingCurrencyFromProfile({ currency: "mdl" }), "MDL");
  assert.equal(accountingCurrencyFromProfile({ accountingCurrency: "USD" }), null);
  assert.equal(accountingCurrencyFromRestaurantJson('{"currency":"rub"}'), "RUB");
  assert.equal(accountingCurrencyFromRestaurantJson("invalid"), null);

  const profile = venueProfileFromInput({
    name: "Venue A",
    businessType: "Бар",
    country: "Молдова",
    city: "Бендеры",
    currency: "eur",
  });
  assert.equal(profile.currency, "EUR");
  assert.equal(venueProfileFromInput({ currency: "unsupported" }).currency, "");
});

test("venue profile keeps only a valid tracking start date", () => {
  assert.equal(
    venueProfileFromInput({ name: "Venue A", trackingStartDate: "2026-08-26" }).trackingStartDate,
    "2026-08-26",
  );
  assert.equal(venueProfileFromInput({ trackingStartDate: "2026-02-30" }).trackingStartDate, undefined);
  assert.equal(venueProfileFromInput({ trackingStartDate: "26.08.2026" }).trackingStartDate, undefined);
});

test("venue API preserves an existing accounting currency for legacy clients and validates explicit changes", async () => {
  const [profileRoute, venuesRoute, profileModel] = await Promise.all([
    read("app/api/restaurants/route.ts"),
    read("app/api/venues/route.ts"),
    read("lib/bardoctor/venue-profile.ts"),
  ]);

  assert.match(profileRoute, /body\.currency === undefined/);
  assert.match(profileRoute, /previousCurrency/);
  assert.match(profileRoute, /INVALID_ACCOUNTING_CURRENCY/);
  assert.match(profileRoute, /hasPermission\(account, "settings\.manage"\)/);
  assert.match(profileRoute, /where\(eq\(accounts\.id, account\.id\)\)/);
  assert.match(profileRoute, /Response\.json\(\{ ok: true, restaurant \}\)/);
  assert.match(profileRoute, /before\?\.trackingStartDate/);
  assert.match(venuesRoute, /trackingStartDate/);
  assert.match(venuesRoute, /currency: venueCurrency\(item\.dataAccount\.restaurantJson\)/);
  assert.match(profileModel, /normalizeAccountingCurrency\(body\.currency\)/);
});

test("AI monetary context includes the active venue accounting currency", () => {
  const context = buildVenueAIContextFromSources("diagnosis", {
    accountProfile: {
      name: "Venue A",
      businessType: "Бар",
      currency: "MDL",
    },
    now: new Date("2026-08-21T12:00:00.000Z"),
  });
  const prompt = venueAIContextForPrompt(context);
  assert.equal(context.accountingCurrency, "MDL");
  assert.equal(prompt.accountingCurrency, "MDL");
  assert.equal(context.promptData.format.accountingCurrency, "MDL");
});

test("new venue creation requires an explicit accounting currency without a silent geographic default", async () => {
  const [page, client, route] = await Promise.all([
    read("app/venues/new/route.ts"),
    read("public/venue-create.js"),
    read("app/api/venues/route.ts"),
  ]);
  assert.match(page, /Валюта учёта \*/);
  assert.match(page, /<option value="">Выберите валюту<\/option>/);
  assert.match(page, /value="RON"/);
  assert.match(client, /currency: String\(data\.get\("currency"\) \|\| ""\)/);
  assert.doesNotMatch(client, /data\.get\("currency"\) \|\| "MDL"/);
  assert.match(route, /Укажите валюту учёта/);
});
