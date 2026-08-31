import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const taxonomyCss = fs.readFileSync("public/canonical-taxonomy-v336.css", "utf8");
const nomenclatureCss = fs.readFileSync("public/nomenclature-v208.css", "utf8");

test("nomenclature UAT fixes normalize search and explain empty results", () => {
  assert.match(bundle, /bd-nomenclature-uat-v369/);
  assert.match(bundle, /function bdNormalizeNomenclatureSearchV369/);
  assert.match(bundle, /Поиск по названию, объёму или разделу/);
  assert.match(bundle, /Ничего не найдено/);
});

test("taxonomy manager uses progressive disclosure and duplicate diagnostics", () => {
  assert.match(bundle, /bd-tax-manager-v369/);
  assert.match(bundle, /bdOpenSectionsV369/);
  assert.match(bundle, /bdOpenCategoriesV369/);
  assert.match(bundle, /Возможные дубли разделов/);
  assert.match(bundle, /BarDoctor не объединяет разделы автоматически/);
  assert.match(taxonomyCss, /contain: layout style/);
  assert.match(taxonomyCss, /bd-tax-breadcrumb-v369/);
});

test("counts, orphan zero, action names and stock metric are unambiguous", () => {
  assert.doesNotMatch(bundle, /Q\.length&&i\.jsxs\("section",\{className:"bd-taxonomy-subcategory-v238/);
  assert.match(bundle, /Действия: /);
  assert.match(bundle, /Родитель раздела:/);
  assert.match(bundle, /активных складских позиций/);
  assert.match(bundle, /активных поз\./);
});

test("relation chips drill down and preserve the originating card", () => {
  assert.match(bundle, /function bdNomenclatureRelationUrlV369/);
  assert.match(bundle, /returnItem=/);
  assert.match(bundle, /Назад в карточку номенклатуры/);
  assert.match(bundle, /Открыть связанные позиции меню/);
  assert.match(bundle, /Открыть связанные техкарты/);
  assert.match(bundle, /Открыть связи с поставщиками/);
  assert.match(nomenclatureCss, /\.bd-nomenclature-usage-v353 button/);
});

test("toolbar labels remain whole at mobile widths and assets are cache-busted", () => {
  assert.match(nomenclatureCss, /white-space: nowrap/);
  assert.match(nomenclatureCss, /overflow-x: auto/);
  for (const file of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
    assert.match(fs.readFileSync(file, "utf8"), /bd-nomenclature-uat-v369/, file);
  }
});
