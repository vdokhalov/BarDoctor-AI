import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("taxonomy uses one Russian alphabetical comparator", () => {
  assert.match(bundle, /bd-alphabetical-taxonomy-v363/);
  assert.match(bundle, /function bdAlphabeticalV363/);
  assert.match(bundle, /function bdTaxOperationalV363/);
  assert.match(bundle, /localeCompare\(String\(n\?\.name\|\|""\),"ru",\{sensitivity:"base",numeric:!0\}\)/);
  assert.match(bundle, /function bdTaxActiveV336\(e\)\{return bdAlphabeticalV363/);
});

test("alphabetical display does not change existing default selections", () => {
  assert.match(bundle, /bdTaxOperationalV363\(O\.taxonomy\?\.sections\)\[0\]/);
  assert.match(bundle, /bdTaxOperationalV363\(T\.taxonomy\?\.sections\)\[0\]/);
  assert.match(bundle, /bdTaxOperationalV363\(bdMenuTaxInitial\.sections\)\[0\]/);
  assert.match(bundle, /bdTaxOperationalV363\(c\.taxonomy\?\.sections\)\[0\]/);
});

test("tree and manager are alphabetical at every taxonomy level", () => {
  for (const level of ["sections", "categories", "subcategories", "locations"]) {
    assert.match(bundle, new RegExp(`${level}:bdAlphabeticalV363`));
  }
  assert.match(bundle, /data-bd-taxonomy-order":"alphabetical-v363/);
  assert.match(bundle, /const T=bdAlphabeticalV363\(t\.sections\.filter\(bdIsInventoryTaxonomyNodeV373\)\),A=bdAlphabeticalV363\(t\.categories\.filter\(bdIsInventoryTaxonomyNodeV373\)\),k=bdAlphabeticalV363\(t\.subcategories\.filter\(bdIsInventoryTaxonomyNodeV373\)\)/);
  assert.match(bundle, /Раскрывайте только нужную ветку/);
});

test("item pickers and bulk lists use the same alphabetical order", () => {
  assert.match(bundle, /bdAlphabeticalV363\(r\.filter/);
  assert.match(bundle, /bdMenuVisibleProductsV350=bdAlphabeticalV363/);
  assert.match(bundle, /return\[\.\.\.a\.values\(\)\]\.sort\(\(l,u\)=>String\(l\.name/);
});

test("manual up and down actions do not contradict alphabetical order", () => {
  assert.doesNotMatch(bundle, /children:"Выше"/);
  assert.doesNotMatch(bundle, /children:"Ниже"/);
  assert.match(bundle, /children:"Переименовать"/);
});

test("application shells invalidate the old bundle", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-alphabetical-taxonomy-v363/);
});
