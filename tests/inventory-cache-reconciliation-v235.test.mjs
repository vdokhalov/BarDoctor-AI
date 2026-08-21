import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bootstrap = fs.readFileSync("public/bardoctor-preview.js", "utf8");
const storeRoute = fs.readFileSync("app/api/store/[key]/route.ts", "utf8");
const shell = fs.readFileSync("app/bar-doctor-response.ts", "utf8");

test("the repaired inventory cache is refreshed before the application starts", () => {
  const refresh = bootstrap.indexOf("await refreshServerInventoryCacheV235()");
  const start = bootstrap.lastIndexOf("loadApplication()");
  assert.ok(refresh >= 0 && start > refresh);
  assert.match(bootstrap, /fetch\("\/api\/store\/bd_assortment_v1"/);
  assert.match(bootstrap, /cacheServerStore\("bd_assortment_v1", assortment\)/);
  assert.match(shell, /inventory-cache-reconciliation-v235/);
});

test("every assortment write is rechecked against purchase and movement evidence", () => {
  assert.match(storeRoute, /if \(key === ASSORTMENT_STORE_KEY\)/);
  assert.match(storeRoute, /repairInventoryPurchaseAmounts\(\{/);
  assert.match(storeRoute, /purchaseDocuments,/);
  assert.match(storeRoute, /stockMovements: consolidated\.stockMovements/);
  assert.match(storeRoute, /after = metadataRepair\.assortment/);
});
