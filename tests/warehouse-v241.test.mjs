import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("warehouse v241 separates allocation quality status from the stock hierarchy", async () => {
  const [bundle, css] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
  ]);
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  assert.ok(start >= 0 && end > start);
  const warehouse = bundle.slice(start, end);

  assert.match(warehouse, /bdWarehouseNeedsDistribution=q\.filter\(bdNomenclatureNeedsAttention\)/);
  assert.match(warehouse, /bdWarehouseVisibleStock=F\.filter\(B=>B\.sectionId&&B\.sectionId!=="unassigned"\)/);
  assert.match(warehouse, /className:"bd-warehouse-distribution-row-v241"/);
  assert.match(warehouse, /onClick:\(\)=>e\("\/nomenclature\?view=attention"\)/);
  assert.match(warehouse, /items:bdWarehouseVisibleStock/);
  assert.ok(warehouse.indexOf("bd-warehouse-distribution-row-v241") < warehouse.indexOf("items:bdWarehouseVisibleStock"));
  assert.match(css, /\.bd-warehouse-distribution-row-v241 \{[\s\S]*?min-height: 44px/);
  assert.match(css, /\.bd-warehouse-distribution-row-v241 strong \{[\s\S]*?white-space: nowrap/);
});

test("warehouse v241 keeps controls compact, complete and fully actionable", async () => {
  const [bundle, css, html, response, preview] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
    read("public/bardoctor-preview.js"),
  ]);
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  const warehouse = bundle.slice(start, end);

  assert.match(warehouse, /value:"sections",children:"Структура"/);
  assert.doesNotMatch(warehouse, /value:"sections",children:"Разделы и подразделы"/);
  assert.match(warehouse, /className:"bd-warehouse-nomenclature-link-v241"/);
  assert.match(warehouse, /onClick:\(\)=>e\("\/nomenclature"\)/);
  assert.match(css, /\.bd-warehouse-nomenclature-tools-v207 \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 148px/);
  assert.match(css, /\.bd-warehouse-search::placeholder \{[\s\S]*?font-size: 10\.5px/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 128px/);
  assert.match(html, /accounting-currency-v243/);
  assert.match(response, /accounting-currency-v243/);
  assert.match(preview, /accounting-currency-v243/);

  for (const label of [
    "Провести инвентаризацию",
    "Сканировать ведомость",
    "Импортировать продажи",
    "Добавить покупку",
    "Остатки",
    "Движения",
    "Инвентаризации",
    "Списания",
  ]) assert.match(warehouse, new RegExp(label));
});

test("warehouse allocation row deep-links to the existing Nomenclature review workflow", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdNomenclaturePageV238");
  const end = bundle.indexOf("function bdInventoryCountSheet", start);
  assert.ok(start >= 0 && end > start);
  const nomenclature = bundle.slice(start, end);

  assert.match(nomenclature, /\["structure","all","attention"\]\.includes\(window\.bdReadNavigationQuery\("view","structure"\)\)/);
  assert.match(nomenclature, /window\.bdSyncNavigationQuery\(\{view:l==="structure"\?null:l\}\)/);
  assert.match(nomenclature, /\[\["structure","Структура"\],\["all","Все позиции"\],\["attention","На проверке"\]\]/);
});
