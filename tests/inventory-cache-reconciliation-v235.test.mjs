import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bootstrap = fs.readFileSync("public/bardoctor-preview.js", "utf8");
const storeRoute = fs.readFileSync("app/api/store/[key]/route.ts", "utf8");
const shell = fs.readFileSync("app/bar-doctor-response.ts", "utf8");

test("the repaired inventory cache refresh remains separate from bounded authentication recovery", () => {
  const refresh = bootstrap.indexOf("void refreshServerInventoryCacheV235()");
  const verified = bootstrap.lastIndexOf("rememberAccessContext(result)", refresh);
  assert.ok(refresh >= 0 && verified >= 0 && refresh > verified);
  assert.match(bootstrap, /async function bdRetryBootstrapV496/);
  assert.match(bootstrap, /fetch\("\/api\/store\/bd_assortment_v1"/);
  assert.match(bootstrap, /cacheServerStore\("bd_assortment_v1", assortment\)/);
  assert.match(shell, /inventory-cache-reconciliation-v235/);
});

test("ordinary assortment writes cannot silently repair or rewrite movement history", () => {
  assert.match(storeRoute, /if \(key === ASSORTMENT_STORE_KEY\)/);
  assert.doesNotMatch(storeRoute, /repairInventoryPurchaseAmounts\(\{/);
  assert.match(storeRoute, /purchaseDocuments,/);
  assert.doesNotMatch(storeRoute, /stockMovements: consolidated\.stockMovements/);
  assert.match(storeRoute, /IMMUTABLE_STOCK_LEDGER/);
  assert.match(storeRoute, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
});
