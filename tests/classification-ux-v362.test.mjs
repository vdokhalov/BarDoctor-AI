import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const nomenclatureCss = fs.readFileSync("public/nomenclature-v208.css", "utf8");
const taxonomyCss = fs.readFileSync("public/canonical-taxonomy-v336.css", "utf8");

test("item editor uses one compact classification path", () => {
  assert.match(bundle, /bd-classification-ux-v362/);
  assert.equal(bundle.split('data-bd-classification":"compact-path-v362').length - 1, 2);
  assert.doesNotMatch(bundle, /className:"bd-nomenclature-path-editor-v209"/);
  assert.match(bundle, /Раздел не выбран/);
  assert.match(bundle, /Путь задан/);
  assert.match(nomenclatureCss, /\.bd-nomenclature-classification-v362/);
});

test("subcategory is hidden when a category has no children", () => {
  assert.match(bundle, /v\.length>0\?i\.jsxs\("label"/);
  assert.match(bundle, /l\.length>0&&i\.jsxs\("label"/);
  assert.match(bundle, /У этой категории нет подкатегорий/);
  assert.match(bundle, /Без подкатегории/);
  assert.doesNotMatch(bundle, /subcategoryId:[A-Za-z]\.subcategoryId\|\|L\?\.id/);
});

test("category-level positions remain visible in the structure", () => {
  assert.match(bundle, /bd-direct-category-items-v362/);
  assert.match(bundle, /Q=V\.filter\(Y=>!G\.some\(ne=>ne\.id===Y\.subcategoryId\)\)/);
  assert.match(bundle, /bd-taxonomy-direct-v362/);
  assert.match(bundle, /children:"Без подкатегории"/);
  assert.match(nomenclatureCss, /\.bd-taxonomy-direct-head-v362/);
});

test("changing a parent clears dependent taxonomy choices", () => {
  assert.match(bundle, /sectionId:C,taxonomyCategoryId:"",subcategoryId:""/);
  assert.match(bundle, /taxonomyCategoryId:C,subcategoryId:""/);
  assert.doesNotMatch(bundle, /String\(e\.sectionId\):"kitchen"/);
  assert.doesNotMatch(bundle, /taxonomyCategoryId\)\?String\(e\.taxonomyCategoryId\):a\[0\]/);
  assert.doesNotMatch(bundle, /subcategoryId\)\?String\(e\.subcategoryId\):l\[0\]/);
});

test("category can be created in the selected section without leaving the item", () => {
  assert.match(bundle, /Создать категорию в/);
  assert.match(bundle, /function bdCreateCategoryV362/);
  assert.match(bundle, /level:"category",name:P\.trim\(\),parentId:u\.sectionId/);
  assert.match(bundle, /bdSetLocalAssortmentV362/);
});

test("save blocking state explains the first missing field", () => {
  assert.match(bundle, /function bdNomenclatureSaveHintV362/);
  assert.match(bundle, /bd-save-hint-v362/);
  assert.equal(bundle.split('className:"bd-nomenclature-save-hint-v362"').length - 1, 2);
  assert.match(nomenclatureCss, /\.bd-nomenclature-save-hint-v362/);
});

test("purchase type is automatic and uses business-facing labels", () => {
  assert.match(bundle, /function bdPurchaseTypeLabelV362/);
  assert.match(bundle, /Тип закупки:/);
  assert.match(bundle, /Товар и ингредиенты/);
  assert.match(bundle, /Расходные материалы/);
  assert.match(bundle, /Хозяйственные расходы/);
  assert.match(bundle, /Маркетинговые расходы/);
  assert.doesNotMatch(bundle, /children:"Что покупаем"/);
});

test("taxonomy manager keeps routine rows compact", () => {
  assert.match(bundle, /bd-tax-node-menu-v362/);
  assert.match(bundle, /children:"Действия"/);
  assert.match(bundle, /Родитель категории/);
  assert.match(bundle, /Родитель подкатегории/);
  assert.match(bundle, /children:"Разделы и категории"/);
  assert.match(taxonomyCss, /> \.bd-tax-move-v336 \{ display: none; \}/);
  assert.match(taxonomyCss, /\.bd-tax-node-v336\.level-category,[\s\S]*border-top: 1px solid/);
});
