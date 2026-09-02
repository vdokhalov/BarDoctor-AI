import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, suppliersCss, warehouseCss, receivingPatch, taxonomyPatch, appHtml, responseShell, bootstrap] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/suppliers.css", import.meta.url), "utf8"),
  readFile(new URL("../public/warehouse.css", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-purchase-review-ux-v356.mjs", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-receiving-warehouse-ux-v373.mjs", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
]);

test("receiving actions are a non-scrolling dialog footer with an iOS safe area", () => {
  assert.match(receivingPatch, /i\.jsxs\("footer",\{className:"bd-procurement-sheet-actions bd-receiving-actions-v357"/);
  assert.match(bundle, /i\.jsxs\("footer",\{className:"bd-procurement-sheet-actions bd-receiving-actions-v357"/);
  assert.match(suppliersCss, /\.bd-receiving-workspace-v357 > \.bd-procurement-form[\s\S]*overflow-y: auto/);
  assert.match(suppliersCss, /\.bd-receiving-workspace-v357 > \.bd-receiving-actions-v357[\s\S]*flex: 0 0 auto/);
  assert.match(suppliersCss, /padding: 10px 14px calc\(10px \+ env\(safe-area-inset-bottom\)\)/);
});

test("warehouse uses only inventory taxonomy nodes and never renders empty branches", () => {
  assert.match(bundle, /bdReceivingWarehouseUxVersionV373="v373"/);
  assert.match(bundle, /function bdIsInventoryTaxonomyNodeV373/);
  assert.match(bundle, /\^menu-\(\?:section\|category\|subcategory\):/);
  assert.match(bundle, /const tree=bdWarehouseInventoryTreeV373\(t\)/);
  assert.match(bundle, /A\.filter\(w=>w\.synthetic\?P\.length:c\.some\(C=>C\.subcategoryId===w\.id\)\)/);
  assert.match(bundle, /tree\.sections\.filter\(o=>o\.id!=="unassigned"\?e\.some/);
  assert.doesNotMatch(bundle, /A\.filter\(w=>!a\|\|\(w\.synthetic/);
});

test("warehouse exposes direct category management without mutating stored data", () => {
  assert.match(bundle, /\/nomenclature\?view=taxonomy&returnTo=warehouse/);
  assert.match(bundle, /"aria-label":"Настроить структуру склада"/);
  assert.match(bundle, /children:"Номенклатура \/ категории"/);
  assert.match(bundle, /t\.sections\.filter\(bdIsInventoryTaxonomyNodeV373\)/);
  assert.doesNotMatch(taxonomyPatch, /fetch\(|\/api\/store|localStorage\.setItem/);
  assert.match(warehouseCss, /Warehouse inventory taxonomy entry v373/);
});

test("every application shell invalidates the repaired JS and CSS artifacts", () => {
  for (const shell of [appHtml, responseShell]) {
    assert.match(shell, /bd-receiving-warehouse-ux-v373/);
    assert.match(shell, /suppliers\.css\?v=[^"']*bd-receiving-warehouse-ux-v373/);
    assert.match(shell, /warehouse\.css\?v=[^"']*bd-receiving-warehouse-ux-v373/);
  }
  assert.match(bootstrap, /bd-receiving-warehouse-ux-v373/);
});
