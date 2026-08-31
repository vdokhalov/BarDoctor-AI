import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const catalogCss = readFileSync(new URL("../public/catalog.css", import.meta.url), "utf8");
const suppliersCss = readFileSync(new URL("../public/suppliers.css", import.meta.url), "utf8");
const appHtml = readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
const responseShell = readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
const confirmRoute = readFileSync(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8");

function between(start, end) {
  const startIndex = bundle.indexOf(start);
  const endIndex = bundle.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing start marker: ${start}`);
  assert.ok(endIndex > startIndex, `missing end marker: ${end}`);
  return bundle.slice(startIndex, endIndex);
}

test("nomenclature lookup stays collapsed, query-driven, and bounded", () => {
  const mapping = between("function bdInvoiceLineMappingV356(", "function bdInvoiceReviewPriorityV4(");

  assert.match(bundle, /const bdPurchaseReviewUxVersion="v356"/);
  assert.match(mapping, /S\.useState\(!1\)/);
  assert.match(mapping, /if\(!s\|\|k\.length<2\)/);
  assert.match(mapping, /new URLSearchParams\(\{q:k,limit:"12"\}\)/);
  assert.match(mapping, /C\.slice\(0,2\)/);
  assert.match(mapping, /Создать «/);
  assert.doesNotMatch(mapping, /limit:"50"/);
});

test("receiving is exception-driven and expands only the active line", () => {
  const review = between('const bdReceivingWorkspaceVersion="v357";', "const bdImageUploadVersion=");

  assert.match(review, /bdLineViewV357/);
  assert.match(review, /bdActiveLineV357/);
  assert.match(review, /bdAttentionLinesV357/);
  assert.match(review, /bdShownLinesV357/);
  assert.match(review, /label:"Требуют внимания"/);
  assert.match(review, /className:"bd-receiving-line-summary-v357"/);
  assert.match(review, /"aria-expanded":isOpen/);
  assert.match(review, /isOpen&&i\.jsxs\("div",\{className:"bd-receiving-line-editor-v357"/);
  assert.match(review, /children:"Следующая проблема"/);
});

test("receiving clearly separates draft review, posting, inventory, and payment", () => {
  const review = between('const bdReceivingWorkspaceVersion="v357";', "const bdImageUploadVersion=");

  assert.match(review, /Черновик · склад не изменён/);
  assert.match(review, /После проведения товарные позиции увеличат остатки и обновят себестоимость/);
  assert.match(review, /оплату добавьте отдельной операцией/);
  assert.match(review, /"Провести приход"/);
  assert.match(review, /bdCanPostV357/);
  assert.match(review, /bdTotalMismatchV357/);
  assert.doesNotMatch(review, /label:"Оплата"/);
  assert.doesNotMatch(review, /Добавить покупку/);
});

test("supplier is selected from the master data and never auto-created by confirmation", () => {
  const review = between('const bdReceivingWorkspaceVersion="v357";', "const bdImageUploadVersion=");

  assert.match(review, /placeholder:"Найти существующего поставщика…"/);
  assert.match(review, /children:"\+ Создать карточку поставщика"/);
  assert.match(review, /bdSupplierReady=e\.status==="confirmed"\|\|Boolean\(e\.supplierId\)/);
  assert.doesNotMatch(review, /Создать из документа/);
  assert.match(bundle, /onAddSupplier:\(\)=>U\(\{\}\)/);
  assert.match(bundle, /A&&k\(\{\.\.\.A,supplierId:w\.id,supplierName:w\.name/);

  assert.match(confirmRoute, /code: "SUPPLIER_SELECTION_REQUIRED"/);
  assert.match(confirmRoute, /code: "SUPPLIER_NOT_FOUND"/);
  assert.match(confirmRoute, /item\?\.id === document\.supplierId/);
  assert.doesNotMatch(confirmRoute, /suppliers\.unshift\(supplier\)/);
});

test("mobile receiving is a full-height workspace with reachable actions", () => {
  assert.match(suppliersCss, /Purchase review workspace v356/);
  assert.match(suppliersCss, /Receiving workspace v357/);
  assert.match(suppliersCss, /height:100dvh;max-height:100dvh/);
  assert.match(suppliersCss, /\.bd-procurement-form\{min-height:0;flex:1 1 auto;overflow-y:auto/);
  assert.match(suppliersCss, /\.bd-receiving-line-summary-v357\{display:grid;width:100%/);
  assert.match(suppliersCss, /\.bd-receiving-actions-v357/);
  assert.match(suppliersCss, /env\(safe-area-inset-top\)/);
  assert.match(catalogCss, /Purchase review mapping v356/);
});

test("all application shells invalidate the receiving workspace assets", () => {
  for (const shell of [appHtml, responseShell, bootstrap]) {
    assert.match(shell, /purchase-receiving-v357/);
  }
  assert.match(appHtml, /suppliers\.css\?v=[^"']*purchase-receiving-v357/);
  assert.match(responseShell, /catalog\.css\?v=[^"']*purchase-receiving-v357/);
});
