import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/warehouse.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
const response = fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");
const bootstrap = fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");

test("inventory scope UI is a progressive canonical hierarchy instead of one flat select", () => {
  parse(bundle, { ecmaVersion: "latest", sourceType: "script" });
  assert.match(bundle, /bdInventoryScopeHierarchyVersion="scope-hierarchy-v256"/);
  assert.match(bundle, /topScopes=scopes\.filter\(o=>o\.type==="all"\|\|o\.type==="section"\)/);
  assert.match(bundle, /categoryScopes=.*o\.parentId===selectedSectionId/);
  assert.match(bundle, /subcategoryScopes=.*o\.parentId===selectedCategoryId/);
  assert.match(bundle, /Уточнить охват раздела/);
  assert.match(bundle, /Уточнить категорию/);
  assert.match(bundle, /Весь раздел/);
  assert.match(bundle, /Вся категория/);
  assert.match(bundle, /role:"listbox"/);
  assert.match(bundle, /role:"option"/);
  assert.match(bundle, /setScopes\(Array\.isArray\(u\.scopes\)\?u\.scopes:\[\]\);const d=Array\.isArray\(u\.scopes\)&&u\.scopes\[0\];d&&setScopeKey/);
  assert.doesNotMatch(bundle, /Весь складВесь активный склад/);
  assert.doesNotMatch(bundle, /o\.type==="all"\?"Весь склад"/);
});

test("scope picker has touch, wrapping, selected and responsive contracts", () => {
  assert.match(css, /\.bd-inventory-scope-row-v256\s*\{[^}]*min-height: 54px;/s);
  assert.match(css, /\.bd-inventory-scope-row-v256 strong,[\s\S]*overflow-wrap: anywhere;/);
  assert.match(css, /\.bd-inventory-scope-row-v256\.selected/);
  assert.match(css, /\.bd-inventory-scope-level-v256\.nested/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.bd-inventory-scope-level-v256/);
  assert.match(bundle, /"aria-selected":d/);
});

test("scope hierarchy cache marker is wired through both application shells", () => {
  for (const source of [html, response]) assert.match(source, /20260823-inventory-scope-hierarchy-v256/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^"\n]*inventory-scope-hierarchy-v256/);
});
