import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/catalog.css", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("tech-card search bundle remains valid and uses complete authoritative catalogue", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-tech-card-search-ux-v375/);
  assert.match(bundle, /complete=bdCatMatchingProductsV258\(record,\[\]\)/);
  assert.match(bundle, /\[\.\.\.complete,\.\.\.bdCatArray\(input\)\]/);
});

test("search is result-first and communicates every state", () => {
  for (const label of [
    "Найдено: ",
    "ничего не найдено",
    "Доступно позиций: ",
    "Поиск по всему справочнику",
    "Фильтры по разделам",
    "Найти в номенклатуре",
    "Закрыть поиск",
  ]) assert.match(bundle, new RegExp(label));
  const inputIndex = bundle.indexOf("result-first-v375");
  const resultsIndex = bundle.indexOf("bd-tech-card-groups-v375", inputIndex);
  const filtersIndex = bundle.indexOf("bd-tech-card-filter-toggle-v375", inputIndex);
  assert.ok(inputIndex >= 0 && resultsIndex > inputIndex && filtersIndex > resultsIndex);
  assert.match(bundle, /onChoose:\(G,H\)=>\{N\(p,G,H\),h\(J=>\(\{\.\.\.J,\[p\.id\]:!1\}\)\)\}/);
});

test("search normalizes decimal separators and equivalent units", () => {
  assert.match(bundle, /\(\\d\)\[,\.\]\(\\d\)/);
  for (const unit of ["миллилитр", "литр", "килограмм", "грамм", "штук"]) assert.match(bundle, new RegExp(unit));
});

test("mobile search keeps results visible and removes the obscuring action bar while typing", () => {
  assert.match(css, /\.bd-tech-card-picker-v375\.is-searching \.bd-tech-card-groups-v375/);
  assert.match(css, /:has\(\.bd-tech-card-picker-v375 input\[type=search\]:focus\) \.bd-catalog-sheet-actions\{display:none\}/);
  assert.match(css, /max-height:min\(30dvh,270px\)/);
});

test("search assets are invalidated in every application shell", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-tech-card-search-ux-v375/);
  for (const shell of shells.slice(0, 2)) assert.match(shell, /catalog\.css\?v=[^"']*bd-tech-card-search-ux-v375/);
});
