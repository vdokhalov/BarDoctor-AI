import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("purchase category selector renders unique accounting choices", () => {
  assert.match(bundle, /bd-purchase-category-options-v367/);
  assert.match(bundle, /function bdProcUniqueCategoryOptionsV367\(current\)/);
  assert.match(bundle, /bdProcUniqueCategoryOptionsV367\(e\.expenseCategory\)\.map/);
  assert.doesNotMatch(bundle, /Object\.entries\(bdProcCategoryLabels\)\.map/);
  assert.match(bundle, /return\[\[stockValue,"Складские запасы"\],\["equipment","Оборудование и инвентарь"\],\["repairs","Ремонт и обслуживание"\],\["marketing","Маркетинг и реклама"\],\["other","Прочее"\]\]/);
});

test("legacy stock category remains selected without duplicate visible rows", () => {
  assert.match(bundle, /bdProcLegacyStockCategoryKeysV367\.has\(value\)\?value:"products"/);
  assert.match(bundle, /new Set\(\["products","alcohol","food","consumables","hookah","household"\]\)/);
  assert.equal((bundle.match(/bdProcUniqueCategoryOptionsV367\(e\.expenseCategory\)/g) || []).length, 1);
});

test("every application shell invalidates the duplicate-category bundle", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-purchase-category-options-v367/);
});
