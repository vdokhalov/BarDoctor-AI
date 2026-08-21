import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("valuation diagnostics are read-only, venue-scoped and never cached", async () => {
  const route = await read("app/api/inventory/valuation/route.ts");
  assert.match(route, /authenticateRequest\(request\)/);
  assert.match(route, /account_id = \?/);
  assert.match(route, /bind\(account\.id, ASSORTMENT_STORE_KEY\)/);
  assert.match(route, /venueId: account\.venueId/);
  assert.match(route, /accountingCurrencyFromProfile\(profile\)/);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /INSERT|UPDATE|DELETE|upsertStore|database\.batch/);
});

test("purchase posting reads accounting currency from the authenticated venue profile", async () => {
  const [confirm, update, repost] = await Promise.all([
    read("app/api/purchases/confirm/route.ts"),
    read("app/api/purchases/update/route.ts"),
    read("app/api/purchases/repost/route.ts"),
  ]);
  for (const route of [confirm, update, repost]) {
    assert.match(route, /accountingCurrencyFromRestaurantJson\(account\.restaurantJson\)/);
  }
});

test("valuation fix does not add a persistent migration or historical backfill", async () => {
  const valuation = await read("lib/bardoctor/valuation.ts");
  assert.doesNotMatch(valuation, /\b(?:INSERT|UPDATE|DELETE)\b|live exchange|fetch\(/i);
});
