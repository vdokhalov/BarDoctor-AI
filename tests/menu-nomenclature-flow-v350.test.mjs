import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("menu editor loads canonical taxonomy instead of trusting an empty local cache", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdCatMenuEditor");
  const end = bundle.indexOf("function bdCatStructureManager", start);
  const editor = bundle.slice(start, end);
  assert.match(bundle, /bdMenuNomenclatureFlowVersion="v350"/);
  assert.match(editor, /\/api\/nomenclature\/taxonomy/);
  assert.match(editor, /legacyMenuPaths/);
  assert.match(editor, /Загружаем разделы меню/);
  assert.match(editor, /bdMenuSetTaxonomyV350/);
});

test("legacy menu groups remain visible before the canonical tree is materialized", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdCatMenuGroups");
  const end = bundle.indexOf("function bdCatReadiness", start);
  const grouping = bundle.slice(start, end);
  assert.match(grouping, /bdLegacyMenuSectionsV350/);
  assert.match(grouping, /bdLegacySubgroupV350/);
});

test("a ready menu item can create, select and link canonical nomenclature in place", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdCatMenuEditor");
  const end = bundle.indexOf("function bdCatStructureManager", start);
  const editor = bundle.slice(start, end);
  assert.match(editor, /Найти товар, например Спрайт/);
  assert.match(editor, /Создать «/);
  assert.match(editor, /в номенклатуре/);
  assert.match(editor, /context:"menu"/);
  assert.match(editor, /bdNomenclatureQuickCreateV336/);
  assert.match(editor, /readyProduct/);
  assert.match(bundle, /Создать и связать/);
  assert.match(bundle, /itemType:a==="menu"\?"product":"ingredient"/);
});

test("menu nomenclature creation stays visible before the existing-product list", async () => {
  const css = await read("public/canonical-taxonomy-v336.css");
  const html = await read("public/app.html");
  const response = await read("app/bar-doctor-response.ts");
  assert.match(css, /\.bd-menu-nomenclature-picker-v350 \.bd-menu-create-nomenclature-v350\s*\{\s*order:\s*2;/);
  assert.match(css, /\.bd-menu-nomenclature-picker-v350 select\s*\{\s*order:\s*3;/);
  assert.match(css, /\.bd-menu-create-nomenclature-v350\s*\{[^}]*background:\s*#5b5ceb;/s);
  assert.match(html, /canonical-taxonomy-v336\.css\?v=20260829-menu-nomenclature-action-v351/);
  assert.match(response, /canonical-taxonomy-v336\.css\?v=20260829-menu-nomenclature-action-v351/);
  assert.match(html, /index-BQGspy0I\.js\?v=[^"\n]*menu-nomenclature-action-v351/);
  assert.match(response, /index-BQGspy0I\.js\?v=[^"\n]*menu-nomenclature-action-v351/);
});

test("menu quick create keeps the authoritative product and link after save", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdMenuNomenclatureLinkVersion="v352"/);
  assert.match(bundle, /M\(L\.product,L\.assortment\)/);
  assert.match(bundle, /onCreated:\(P,c,bdMenuAssortmentV352\)/);
  assert.match(bundle, /bdMenuOnNomenclatureCreatedV352\?\.\(bdMenuAssortmentV352,I\)/);
  assert.match(bundle, /bdCatMatchingProductsV258\(s,bdCatPurchaseProducts\(u\)\),\[s,u\]/);
  assert.match(bundle, /ie=async p=>\{const c=bdCatState\(xr\(bdCatalogStoreKey\)\|\|s\)/);
  assert.match(bundle, /bdMenuExactProductsV352/);
  assert.match(bundle, /!_&&i\.jsx\("button",\{type:"button",className:"bd-menu-create-nomenclature-v350"/);
  const html = await read("public/app.html");
  const response = await read("app/bar-doctor-response.ts");
  assert.match(html, /menu-nomenclature-action-v351-menu-link-v352/);
  assert.match(response, /menu-nomenclature-action-v351-menu-link-v352/);
});
