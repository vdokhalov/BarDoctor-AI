import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("inventory lifecycle API is venue-scoped, permission-checked and draft-safe", async () => {
  const route = await read("app/api/inventory/counts/route.ts");
  assert.match(route, /authenticateRequest\(request\)/);
  assert.match(route, /hasPermission\(account, "inventory\.manage"\)/);
  assert.match(route, /account_id = \?/);
  assert.match(route, /account\.id/);
  assert.match(route, /venueId: account\.venueId/);
  assert.match(route, /INVENTORY_INCOMPLETE/);
  assert.match(route, /INVENTORY_STOCK_CHANGED/);
  assert.match(route, /INVENTORY_READ_ONLY/);
  assert.match(route, /idempotent: true/);
  assert.match(route, /stockChanged: false/);
  assert.match(route, /applyInventoryCount/);
  assert.ok(
    route.indexOf('action !== "finalize"') < route.indexOf("const result = applyInventoryCount"),
    "the existing adjustment engine must run only in finalization",
  );
});

test("print action is read-only and serves a blind, no-store sheet", async () => {
  const [route, engine] = await Promise.all([
    read("app/api/inventory/counts/route.ts"),
    read("lib/bardoctor/inventory-counts.ts"),
  ]);
  assert.match(route, /format"\) === "print"/);
  assert.match(route, /renderInventoryCountPrintSheet/);
  assert.match(route, /private, no-store/);
  assert.match(engine, /Наименование<\/th>/);
  assert.match(engine, /Факт<\/th>/);
  assert.doesNotMatch(engine.slice(engine.indexOf("renderInventoryCountPrintSheet")), /line\.expected/);
});
