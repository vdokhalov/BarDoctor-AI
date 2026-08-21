import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("warehouse and nomenclature display stock in user-selected units without package-count noise", async () => {
  const [bundle, bootstrap, appHtml, response, route] = await Promise.all([
    readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8"),
    readFile(new URL("public/bardoctor-preview.js", root), "utf8"),
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/bar-doctor-response.ts", root), "utf8"),
    readFile(new URL("app/api/inventory/products/route.ts", root), "utf8"),
  ]);

  assert.match(bundle, /function bdWarehouseEffectiveDisplayUnit/);
  assert.match(bundle, /Показывать остаток/);
  assert.match(bundle, /В литрах/);
  assert.match(bundle, /Остаток хранится точно/);
  assert.doesNotMatch(bundle, /bdWarehouseDecimal\(r\/n,2\)\+" уп\. · "/);
  assert.match(bundle, /multiplePackageSizes&&/);
  assert.match(route, /normalizeInventoryDisplayUnit/);

  for (const source of [bootstrap, appHtml, response]) {
    assert.match(source, /20260821-inventory-reconciliation-v224/);
  }
});
