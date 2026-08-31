import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const css = fs.readFileSync("public/canonical-taxonomy-v336.css", "utf8");

test("category creation remains visible inside every section", () => {
  assert.match(bundle, /bd-nomenclature-uat-v369/);
  assert.match(bundle, /\+ Добавить категорию в «/);
  const manager = bundle.slice(bundle.indexOf("function bdTaxonomyManagerV336"), bundle.indexOf("function bdTaxonomyManagerV336") + 12000);
  const addCategory = manager.indexOf('className:"bd-tax-add-child-v336 bd-tax-add-primary-v360"');
  const categoryList = manager.indexOf('...A.filter(K=>K.parentId===C.id).map');
  assert.ok(addCategory > categoryList, "category action must follow the category list in the compact manager");
});

test("subcategory creation remains visible inside every category", () => {
  assert.match(bundle, /\+ Добавить подкатегорию/);
  const manager = bundle.slice(bundle.indexOf("function bdTaxonomyManagerV336"), bundle.indexOf("function bdTaxonomyManagerV336") + 12000);
  const addSubcategory = manager.indexOf('className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360"');
  const subcategoryList = manager.indexOf('k.filter(J=>J.parentId===C.id');
  assert.ok(addSubcategory > subcategoryList, "subcategory action must follow the subcategory list in the compact manager");
});

test("taxonomy actions are touch-sized and cache-busted", () => {
  assert.match(css, /bd-taxonomy-manager-ux-v360/);
  assert.match(css, /\.bd-tax-add-primary-v360[\s\S]*?min-height: 42px/);
  for (const file of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
    assert.match(fs.readFileSync(file, "utf8"), /bd-taxonomy-manager-ux-v360/, file);
  }
});
