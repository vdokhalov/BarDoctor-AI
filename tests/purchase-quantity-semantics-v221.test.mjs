import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const css = fs.readFileSync("public/suppliers.css", "utf8");

test("purchase review separates quantity unit from package and previews warehouse amount", () => {
  assert.match(bundle, /Единица количества/);
  assert.match(bundle, /На склад поступит/);
  assert.match(bundle, /bdProcStockPreviewV221/);
  assert.match(bundle, /function bdProcPackageUpdateV209\(e\)\{return\{packageSize:e\}\}/);
  assert.match(css, /bd-procurement-stock-preview-v221/);
});

test("purchase document details explain count times package but do not multiply measured totals", () => {
  assert.match(bundle, /bdProcPurchaseLineLabelV221/);
  assert.match(bundle, /quantityMode:bdProcQuantityModeV221/);
  assert.doesNotMatch(bundle, /Number\(o\.quantity\)\|\|0," × ",o\.packageSize/);
});
