import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const catalogCss = readFileSync(new URL("../public/catalog.css", import.meta.url), "utf8");
const nomenclatureCss = readFileSync(new URL("../public/nomenclature-v208.css", import.meta.url), "utf8");
const assortmentCss = readFileSync(new URL("../public/assortment-command-v170.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../public/app.html", import.meta.url), "utf8");

test("catalog workflow v353 exposes the three connected domains", () => {
  assert.match(bundle, /bdCatalogWorkflowUxVersion="v353"/);
  assert.match(bundle, /id:"nomenclature",label:"Номенклатура"/);
  assert.match(bundle, /\/catalog\?tab=menu&returnTo=nomenclature/);
  assert.match(bundle, /\/catalog\?tab=recipes&returnTo=nomenclature/);
  assert.match(bundle, /returnTo.*assortment/);
});

test("ready menu products cannot be saved without nomenclature", () => {
  assert.match(bundle, /h\.type==="ready"\?Boolean\(_&&k\):Boolean\(k\)/);
  assert.match(bundle, /Выберите товар из номенклатуры или создайте его здесь/);
  assert.match(bundle, /Готовый товар · продаётся без приготовления/);
  assert.match(bundle, /onNomenclatureCreated:P=>/);
  assert.match(bundle, /bdCatState\(xr\(bdCatalogStoreKey\)\|\|E\)/);
});

test("prepared menu products continue directly to their recipe", () => {
  assert.match(bundle, /!P&&w\.type==="composite"&&\(f\("recipes"\),v\("all"\),z\(w\)\)/);
  assert.match(bundle, /После сохранения сразу откроется техкарта этой позиции/);
  assert.match(bundle, /Выбрать позицию без техкарты/);
  assert.doesNotMatch(bundle, /De=\(\)=>\{const w=he\.recipes\?\.find/);
});

test("recipe confirmation is gated by canonical links", () => {
  assert.match(bundle, /bdTechInvalidCount=/);
  assert.match(bundle, /disabled:!bdTechCanConfirm/);
  assert.match(bundle, /Завершите обязательные связи/);
  assert.match(bundle, /Складские параметры \(необязательно\)/);
  assert.match(bundle, /версия /);
});

test("nomenclature explains role and downstream usage", () => {
  assert.match(bundle, /children:"Роль в системе"/);
  assert.match(bundle, /children:"Использование"/);
  assert.match(bundle, /"Меню: ",menuUsage/);
  assert.match(bundle, /"Техкарты: ",recipeUsage/);
});

test("v353 styles and cache identity are shipped", () => {
  assert.match(catalogCss, /bd-catalog-workflow-status-v353/);
  assert.match(nomenclatureCss, /bd-nomenclature-usage-v353/);
  assert.match(assortmentCss, /repeat\(5/);
  assert.match(shell, /catalog-workflow-v353/);
});
