import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("warehouse v240 renders a collapsed venue-isolated compact hierarchy", async () => {
  const [bundle, css, inventory, preview] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
    read("docs/warehouse-feature-inventory-v240.md"),
    read("public/bardoctor-preview.js"),
  ]);

  const start = bundle.indexOf("function bdWarehouseDisclosureSeedV240");
  const end = bundle.indexOf("function bdNomenclatureInitialFormV237", start);
  assert.ok(start >= 0 && end > start);
  const implementation = bundle.slice(start, end);

  assert.match(bundle, /data-bd-warehouse-version":"compact-tree-v240/);
  assert.match(implementation, /function bdWarehouseDisclosureSeedV240\(\)\{return\{sections:\{\},categories:\{\},subcategories:\{\}\}\}/);
  assert.match(implementation, /bd:venue-will-change/);
  assert.match(implementation, /\[venueKey,n\]/);
  assert.match(implementation, /bd-warehouse-section-toggle-v240/);
  assert.match(implementation, /bd-warehouse-category-toggle-v240/);
  assert.match(implementation, /bd-warehouse-subcategory-toggle-v240/);
  assert.match(implementation, /"aria-expanded"/);
  assert.match(implementation, /"aria-controls"/);
  assert.match(implementation, /bd-warehouse-stock-row-v240/);
  assert.match(implementation, /bdWarehouseDisplayAmount/);
  assert.match(implementation, /bdWarehouseMoney/);
  assert.match(implementation, /bdTaxonomyName\(t,"locations"/);
  assert.match(implementation, /searchActive/);
  assert.doesNotMatch(implementation, /<details|open:/);

  assert.match(css, /\.bd-warehouse-stock-row-v240 \{[\s\S]*?min-height: 76px/);
  assert.match(css, /\.bd-warehouse-stock-title-v240 \{[\s\S]*?-webkit-line-clamp: 2/);
  assert.match(css, /word-break: normal/);
  assert.match(css, /\.bd-warehouse-disclosure-count-v240 \{[\s\S]*?white-space: nowrap/);
  assert.match(css, /body:has\(\[data-bd-warehouse-version="compact-tree-v240"\]\) \.bd-scroll-top/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(min-width: 960px\)/);

  assert.match(inventory, /Every section, category and subcategory starts collapsed/);
  assert.match(inventory, /A venue change resets all disclosure state/);
  assert.match(inventory, /No database schema, API contract, stock engine/);
  assert.match(preview, /data-bd-warehouse-version="compact-tree-v240"/);
  assert.match(preview, /reference && reference\.parentNode === main/);
});

test("warehouse v240 keeps all existing actions, tabs and product flows", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  assert.ok(start >= 0 && end > start);
  const implementation = bundle.slice(start, end);

  for (const label of [
    "Провести инвентаризацию",
    "Сканировать ведомость",
    "Импортировать продажи",
    "Добавить покупку",
    "Остатки",
    "Движения",
    "Инвентаризации",
    "Списания",
    "Номенклатура",
  ]) assert.match(implementation, new RegExp(label));

  assert.match(implementation, /\/sales-import/);
  assert.match(implementation, /\/suppliers\?create=1&returnTo=warehouse/);
  assert.match(implementation, /\/api\/inventory\/scan/);
  assert.match(implementation, /bdInventoryCountSheet/);
  assert.match(implementation, /bdWarehouseProductSheet/);
  assert.match(implementation, /searchActive:!!v,venueKey:localStorage\.getItem\("bd_active_venue_id"\)\|\|"default"/);
});
