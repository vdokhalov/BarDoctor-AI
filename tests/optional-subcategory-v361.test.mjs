import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");

test("nomenclature can be saved at category level", () => {
  assert.match(bundle, /bd-optional-subcategory-v361/);
  assert.doesNotMatch(bundle, /\|\|!u\.subcategoryId/);
  assert.match(bundle, /Подкатегория \(необязательно\)/);
  assert.match(bundle, /Без подкатегории/);
});

test("optional subcategory is consistent in quick create, menu, and bulk classification", () => {
  assert.doesNotMatch(bundle, /h\.taxonomyCategoryId&&h\.subcategoryId&&h\.unit/);
  assert.doesNotMatch(bundle, /f\.taxonomyCategoryId&&f\.subcategoryId&&u\.size/);
  assert.doesNotMatch(bundle, /Выберите раздел, категорию и подкатегорию/);
});

test("missing optional subcategory is not classified as an attention defect", () => {
  const start = bundle.indexOf("function bdNomenclatureNeedsAttention");
  const end = bundle.indexOf("function bdNomenclaturePathParts", start);
  const implementation = bundle.slice(start, end);
  assert.doesNotMatch(implementation, /!e\?\.subcategoryId/);
  assert.match(implementation, /subcategoryId==="unassigned-subcategory"/);
});
