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
  assert.match(route, /resolveInventoryCountScope\(stores\.assortment/);
  assert.match(route, /INVALID_SCOPE/);
  assert.match(route, /INVENTORY_INCOMPLETE/);
  assert.match(route, /INVENTORY_STOCK_CHANGED/);
  assert.match(route, /INVENTORY_READ_ONLY/);
  assert.match(route, /action === "delete"/);
  assert.match(route, /deleteInventoryCountDocument/);
  assert.match(route, /inventory\.deleted/);
  assert.match(route, /deletionAuditStatement/);
  assert.match(route, /nextInventoryCountNumber/);
  assert.match(route, /idempotent: true/);
  assert.match(route, /stockChanged: false/);
  assert.match(route, /applyInventoryCount/);
  assert.ok(
    route.indexOf('action !== "finalize"') < route.indexOf("const result = applyInventoryCount"),
    "the existing adjustment engine must run only in finalization",
  );
  assert.ok(
    route.indexOf('action === "delete"') < route.indexOf("const result = applyInventoryCount"),
    "draft deletion must be handled without entering the stock reconciliation engine",
  );
});

test("inventory deletion persists only the snapshot store and records an audit event", async () => {
  const [route, engine] = await Promise.all([
    read("app/api/inventory/counts/route.ts"),
    read("lib/bardoctor/inventory-counts.ts"),
  ]);
  const branch = route.slice(route.indexOf('if (action === "delete")'), route.indexOf('if (!existing ||', route.indexOf('if (action === "delete")')));
  assert.match(branch, /conditionalInventoryUpdateStatement/);
  assert.match(branch, /deletionAuditStatement/);
  assert.doesNotMatch(branch, /ASSORTMENT_STORE_KEY|STOCK_MOVEMENT_STORE_KEY|applyInventoryCount/);
  assert.match(branch, /stockChanged: false/);
  assert.match(branch, /INVENTORY_CONCURRENT_MODIFICATION/);
  assert.match(engine, /INVENTORY_DELETE_PROTECTED/);
});

test("scope options and creation share one canonical venue validation contract", async () => {
  const [route, engine] = await Promise.all([
    read("app/api/inventory/counts/route.ts"),
    read("lib/bardoctor/inventory-counts.ts"),
  ]);
  assert.match(route, /scopes: inventoryCountScopes\(stores\.assortment\)/);
  assert.match(route, /resolveInventoryCountScope\(stores\.assortment/);
  assert.match(engine, /parentId: category\.parentId/);
  assert.match(engine, /itemCount/);
  assert.doesNotMatch(engine.slice(engine.indexOf("export function inventoryCountScopes"), engine.indexOf("export function resolveInventoryCountScope")), /Склад \/ зона/);
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
