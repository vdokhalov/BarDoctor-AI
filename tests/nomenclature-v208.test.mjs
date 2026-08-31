import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("nomenclature is a first-class visible module under More", async () => {
  const [bundle, shell, bootstrap, css] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/app-shell-v185.js"),
    read("app/bar-doctor-response.ts"),
    read("public/nomenclature-v208.css"),
  ]);

  assert.match(bundle, /path:"\/nomenclature",component:\(\)=>i\.jsx\(pt,\{component:bdNomenclaturePage\}\)/);
  assert.match(bundle, /key:"nomenclature",icon:kX,title:"Номенклатура",description:"Товары, расходники и услуги"/);
  assert.match(shell, /window\.bdNavigationContract/);
  assert.match(bootstrap, /nomenclature-v208\.css\?v=20260821-warehouse-v214/);
  assert.match(css, /\.bd-nomenclature-main-v208/);
  assert.match(css, /@media \(max-width: 390px\)/);
});

test("nomenclature exposes one explicit hierarchy, a consistent attention queue and creation", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");

  assert.match(bundle, /\[\["structure","Структура"\],\["all","Все позиции"\],\["attention","На проверке"\]\]/);
  assert.match(bundle, /children:"Добавить позицию"/);
  assert.match(bundle, /function bdNomenclatureItems/);
  assert.match(bundle, /function bdNomenclatureSheet/);
  assert.match(bundle, /role:"dialog","aria-modal":!0/);
  assert.match(bundle, /function bdNomenclatureStructureView/);
  assert.match(bundle, /bd-taxonomy-section-toggle-v213/);
  assert.match(bundle, /bd-taxonomy-category-toggle-v213/);
  assert.match(bundle, /bd-taxonomy-subcategory-v213/);
  assert.match(bundle, /"aria-expanded"/);
  assert.match(bundle, /bdNomenclaturePanelBoundaryV213/);
  assert.match(bundle, /bd-nomenclature-panel-v213/);
  assert.match(bundle, /data-bd-nomenclature-version":"v213"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdNomenclatureStructureView"), bundle.indexOf("function bdWarehouseStockCard")), /i\.jsxs\("details"/);
  assert.match(bundle, /action:[a-z]\?"update":"create"/);
  assert.match(bundle, /Без склада — услуга или имущество/);
  assert.match(bundle, /Товар — поступает на склад/);
  assert.match(bundle, /returnTo=nomenclature/);
  assert.match(bundle, /function bdNomenclatureDefaultStructure/);
  assert.match(bundle, /function bdNomenclatureStructureView/);
  assert.match(bundle, /function bdNomenclatureNeedsAttention/);
  assert.doesNotMatch(bundle, /action:"classify"/);
  assert.match(bundle, /headers:\{"Content-Type":"application\/json",\.\.\.ca\(Ot\(\)\)\}/);
  assert.match(bundle, /classificationStatus/);
  assert.match(bundle, /Место хранения/);
  assert.match(bundle, /Раздел → категория → подкатегория → позиция/);
});

test("nomenclature offers separate purchase, storage and display units without an overlapping footer", async () => {
  const [bundle, css, route] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/nomenclature-v208.css"),
    read("app/api/inventory/products/route.ts"),
  ]);

  assert.match(bundle, /data-bd-nomenclature-editor":"purchase-units-v237/);
  assert.match(bundle, /children:"Приходовать в"/);
  assert.match(bundle, /children:"В бутылках \/ штуках"/);
  assert.match(bundle, /Одна бутылка равна/);
  assert.match(bundle, /children:"Фасовки из документов"/);
  assert.match(bundle, /purchasePackageSize/);
  assert.match(route, /usesPackageAsPurchaseUnit/);
  assert.match(css, /\.bd-nomenclature-unit-card-v237/);
  assert.match(css, /\.bd-nomenclature-panel-actions-v213 \{[\s\S]*position: relative/);
  assert.doesNotMatch(css, /\.bd-nomenclature-panel-actions-v213 \{[\s\S]{0,120}position: sticky/);
});

test("nomenclature v239 starts collapsed and preserves the compact accessible hierarchy", async () => {
  const [bundle, css, inventory] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/nomenclature-v208.css"),
    read("docs/nomenclature-feature-inventory-v238.md"),
  ]);

  const start = bundle.indexOf("function bdNomenclatureRowV238");
  const end = bundle.indexOf("function bdInventoryCountSheet", start);
  assert.ok(start >= 0 && end > start);
  const implementation = bundle.slice(start, end);

  assert.match(implementation, /data-bd-nomenclature-version":"v239/);
  assert.match(implementation, /bdNomenclaturePage=bdNomenclaturePageV238/);
  assert.match(implementation, /data-bd-canonical-venue-host":"nomenclature-v238/);
  assert.match(implementation, /bd-taxonomy-section-toggle-v238/);
  assert.match(implementation, /bd-taxonomy-category-toggle-v238/);
  assert.match(implementation, /bd-taxonomy-subcategory-toggle-v238/);
  assert.match(implementation, /"aria-expanded"/);
  assert.match(implementation, /"aria-controls"/);
  assert.match(implementation, /function bdNomenclatureDisclosureSeedV238\(\)\{return\{sections:\{\},categories:\{\},subcategories:\{\}\}\}/);
  assert.match(implementation, /searchActive:!!a,searchKey:a,venueKey:localStorage\.getItem\("bd_active_venue_id"\)\|\|"default"/);
  assert.match(implementation, /S\.useEffect\(\(\)=>\{setSectionState\(\{\}\),setCategoryState\(\{\}\),setSubcategoryState\(\{\}\),setSearchSectionState\(\{\}\),setSearchCategoryState\(\{\}\),setSearchSubcategoryState\(\{\}\)\},\[l\]\)/);
  assert.match(implementation, /searchSectionState\[[A-Za-z]+\.id\]\?\?!0/);
  assert.match(implementation, /searchCategoryState\[[A-Za-z]+\.id\]\?\?!0/);
  assert.match(implementation, /searchSubcategoryState\[[A-Za-z]+\.id\]\?\?!0/);
  assert.match(implementation, /bd-nomenclature-row-amount-v238/);
  assert.match(implementation, /bdWarehouseDisplayAmount/);
  assert.match(implementation, /bdTaxonomyName\(t,"locations"/);
  assert.match(implementation, /\/suppliers\?create=1&returnTo=nomenclature/);
  assert.match(implementation, /e\("\/warehouse"\)/);
  assert.match(implementation, /bdNomenclatureSheet/);
  assert.doesNotMatch(implementation, /bd-nomenclature-hero-v208/);
  assert.doesNotMatch(implementation, /bd-nomenclature-summary-v208/);
  assert.doesNotMatch(implementation, /bd-nomenclature-card-v208/);

  assert.match(css, /\.bd-taxonomy-tree-v238/);
  assert.match(css, /\.bd-nomenclature-row-v238 \{[\s\S]*?min-height: 54px/);
  assert.match(css, /\.bd-taxonomy-category-toggle-v238 \.bd-taxonomy-node-title-v238 > i \{[\s\S]*?display: none/);
  assert.match(css, /\.bd-taxonomy-items-v238 \{[\s\S]*?border-left: 0/);
  assert.match(css, /\.bd-nomenclature-row-copy-v238 small \{[\s\S]*?font-size: 9\.75px/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(min-width: 960px\)/);
  assert.match(css, /body:has\(\.bd-nomenclature-main-v238\) \.bd-scroll-top/);
  assert.match(inventory, /Search matches item names and the full section\/category\/subcategory path/);
  assert.match(inventory, /Change receipt mode, display unit, package size/);
  assert.match(inventory, /No database schema, API contract, integration, stock posting/);
});

test("warehouse reads canonical names from nomenclature and remains operational", async () => {
  const [bundle, bootstrap] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/bardoctor-preview.js"),
  ]);

  assert.match(bundle, /function bdWarehouseCanonicalBalances/);
  assert.match(bundle, /\[N,E\]=S\.useState\(\(\)=>bdWarehouseCanonicalBalances\(xr\("bd_assortment_v1"\)\)\)/);
  assert.match(bundle, /const Se=\{stock:"Остатки",movements:"Движения",sales:"Продажи",counts:"Инвентаризации",writeoffs:"Списания"\}/);
  assert.match(bundle, /children:"Товары на складе"/);
  assert.match(bundle, /className:"bd-warehouse-nomenclature-link-v241",onClick:\(\)=>e\("\/nomenclature\?returnTo=warehouse"\)/);
  assert.match(bundle, /function bdWarehouseGroupedStock/);
  assert.match(bundle, /value:"sections",children:"Структура"/);
  assert.match(bundle, /value:"categories",children:"Категории"/);
  assert.match(bundle, /value:"subcategories",children:"Подразделы"/);
  assert.match(bundle, /bd-warehouse-section-v214/);
  assert.match(bundle, /bd-warehouse-category-v214/);
  assert.match(bundle, /bd-warehouse-subcategory-v214/);
  assert.match(bundle, /bdInventoryCountSheet/);
  assert.match(bundle, /bdWriteoffSheet/);
  assert.match(bundle, /data-bd-warehouse-sales-entry/);
  assert.match(bundle, /async function bdWarehouseRepairProducts\(\)\{try\{const [A-Za-z]+=await fetch\("\/api\/inventory\/products",\{method:"POST",credentials:"include",headers:\{"Content-Type":"application\/json",\.\.\.ca\(Ot\(\)\)\},body:JSON\.stringify\(\{action:"repair"\}\)\}\)/);
  assert.match(bundle, /title:"Очистка дублей не выполнена"/);
  assert.match(bundle, /title:"Дубли объединены"/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
});

test("API keeps services out of balances and propagates stock metadata", async () => {
  const route = await read("app/api/inventory/products/route.ts");

  assert.match(route, /kind === "stock" \? \[product, \.\.\.balances\] : balances/);
  assert.match(route, /previousKind === "service"/);
  assert.match(route, /root\.nomenclature = nomenclature/);
  assert.match(route, /Object\.assign\(updatedBalance, \{ category: requestedCategory, active: requestedActive, \.\.\.requestedClassification \}\)/);
  assert.match(route, /assortment: updatedRoot/);
  assert.match(route, /action === "classify"/);
  assert.match(route, /ensureNomenclatureHierarchy/);
  assert.match(route, /function upsertStore\([\s\S]*storeKey: string,[\s\S]*\.bind\(accountId, storeKey, JSON\.stringify\(value\), updatedAt\)/);
  assert.match(route, /upsertStore\(database, account\.id, ASSORTMENT_STORE_KEY, repaired\.assortment, now\)/);
  assert.match(route, /STOCK_MOVEMENT_STORE_KEY,[\s\S]*consolidated\.stockMovements,[\s\S]*now/);
});
