import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("stock nomenclature has no duplicate purchase article selector", () => {
  assert.match(bundle, /bd-purchase-accounting-v359/);
  assert.equal((bundle.match(/children:"Тип закупки"/g) || []).length, 2);
  assert.doesNotMatch(bundle, /children:"Что покупаем"/);
  assert.match(bundle, /u\.kind==="service"&&i\.jsxs\("label"/);
  assert.doesNotMatch(bundle, /children:"Статья покупки"|children:"Учет покупки"/);
  assert.doesNotMatch(bundle, /children:"Кухня и напитки"/);
});

test("non-stock nomenclature keeps only meaningful expense purposes", () => {
  for (const label of [
    "Оборудование и инвентарь",
    "Ремонт и обслуживание",
    "Маркетинг и реклама",
    "Прочая услуга",
  ]) assert.match(bundle, new RegExp(label));
  assert.match(bundle, /Без склада — услуга или имущество/);
  assert.match(bundle, /C==="service"\?\{\.\.\.D,kind:C/);
});

test("purchase review derives accounting from canonical line items", () => {
  assert.match(bundle, /function bdProcAccountingSummaryV359/);
  assert.match(bundle, /data-bd-purchase-accounting":"automatic-v359/);
  assert.match(bundle, /category:k\.category\|\|e\.category\|\|"products"/);
  assert.match(bundle, /data-bd-line-accounting/);
  assert.doesNotMatch(bundle, /bdProcCategoryOptionsV358\(e\.expenseCategory\)/);
  assert.equal((bundle.match(/data-bd-purchase-accounting":"automatic-v359/g) || []).length, 1);
});

test("document labels describe stock, non-stock and mixed purchases", () => {
  assert.match(bundle, /Складской приход/);
  assert.match(bundle, /Смешанная закупка/);
  assert.match(bundle, /bdProcDocumentAccountingLabelV359\(n\.items\)/);
  assert.match(bundle, /bdProcDocumentAccountingLabelV359\(p\.items\)/);
});

test("every application shell invalidates the old purchase accounting bundle", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-purchase-accounting-v359/);
});
