import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/nomenclature-v208.css", import.meta.url);
const appPath = new URL("../public/app.html", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);

test("tech-card picker renders canonical items and supplier evidence separately", async () => {
  const bundle = await readFile(bundlePath, "utf8");
  const start = bundle.indexOf("function bdCatIngredientMatchV368");
  const end = bundle.indexOf("const bdCatIngredientMatchV299=bdCatIngredientMatchV368", start);
  const matching = bundle.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(bundle, /supplierProductMappings/);
  assert.match(matching, /bdTechProductDocumentV368/);
  assert.match(matching, /supplierName/);
  assert.match(bundle, /Название, поставщик или фасовка…/);
  assert.match(bundle, /Поставщики: /);
  assert.match(bundle, /aria-label":"Поиск по всей номенклатуре/);
  assert.match(matching, /bdNomenclatureQuickCreateV336/);
});

test("v260 client assets use a fresh cache identity", async () => {
  const [app, bootstrap] = await Promise.all([
    readFile(appPath, "utf8"),
    readFile(bootstrapPath, "utf8"),
  ]);
  assert.match(app, /nomenclature-v208\.css\?v=[^"]*20260824-canonical-supplier-v260/);
  assert.match(app, /bardoctor-preview\.js\?v=[^"]*20260824-canonical-supplier-v260/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^"]*20260824-canonical-supplier-v260/);
});

test("nomenclature UI exposes supplier variants and manual duplicate warning", async () => {
  const [bundle, css] = await Promise.all([
    readFile(bundlePath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);
  assert.match(bundle, /Поставщики \/ варианты закупки/);
  assert.match(bundle, /Возможно, такой товар уже существует/);
  assert.match(bundle, /bd-canonical-duplicate-warning-v260/);
  assert.match(bundle, /bd-nomenclature-suppliers-v260/);
  assert.match(css, /\.bd-canonical-duplicate-warning-v260/);
  assert.match(css, /\.bd-nomenclature-suppliers-v260/);
});
