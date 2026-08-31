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
const cssShells = shells.slice(0, 2);
const pickerStart = bundle.indexOf("bd-tech-card-catalog-picker-v368");
const pickerEnd = bundle.indexOf("const bdCatIngredientMatchV259=", pickerStart);
const picker = bundle.slice(pickerStart, pickerEnd);

test("tech-card picker is valid and searches the complete local catalogue", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-tech-card-catalog-picker-v368/);
  assert.match(bundle, /products=bdCatArray\(t\).*\.sort\(/);
  assert.match(bundle, /tokens\.every\(token=>bdTechProductDocumentV368\(item,tree\)\.includes\(token\)\)/);
  assert.doesNotMatch(picker, /fetch\("\/api\/tech-cards\/nomenclature\?"/);
  assert.doesNotMatch(picker, /bd-selector-pagination-v299/);
});

test("tech-card picker exposes the full taxonomy hierarchy and grouped results", () => {
  for (const label of ["Раздел", "Категория", "Подкатегория", "Все разделы", "Все категории", "Все подкатегории", "Все активные складские позиции · по алфавиту"]) {
    assert.match(bundle, new RegExp(label));
  }
  assert.match(bundle, /bdTechTaxonomyPathV368/);
  assert.match(bundle, /bd-tech-card-groups-v368/);
  assert.match(css, /\.bd-tech-card-taxonomy-v368/);
  assert.match(css, /grid-template-columns:1fr/);
});

test("tech-card picker assets are invalidated in every application shell", () => {
  for (const shell of shells) {
    assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-tech-card-catalog-picker-v368/);
  }
  for (const shell of cssShells) assert.match(shell, /catalog\.css\?v=[^"']*bd-tech-card-catalog-picker-v368/);
});
