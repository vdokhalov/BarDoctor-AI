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
  assert.match(shell, /"\/nomenclature": \["Номенклатура", "\/more"\]/);
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
  assert.match(bundle, /Услуга — без склада/);
  assert.match(bundle, /Товар — учитывать на складе/);
  assert.match(bundle, /returnTo=nomenclature/);
  assert.match(bundle, /function bdNomenclatureDefaultStructure/);
  assert.match(bundle, /function bdNomenclatureStructureView/);
  assert.match(bundle, /function bdNomenclatureNeedsAttention/);
  assert.match(bundle, /action:"classify"/);
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

test("warehouse reads canonical names from nomenclature and remains operational", async () => {
  const [bundle, bootstrap] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/bardoctor-preview.js"),
  ]);

  assert.match(bundle, /function bdWarehouseCanonicalBalances/);
  assert.match(bundle, /\[N,E\]=S\.useState\(\(\)=>bdWarehouseCanonicalBalances\(xr\("bd_assortment_v1"\)\)\)/);
  assert.match(bundle, /const Se=\{stock:"Остатки",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"\}/);
  assert.match(bundle, /children:"Товары на складе"/);
  assert.match(bundle, /onClick:\(\)=>e\("\/nomenclature"\),children:"Номенклатура"/);
  assert.match(bundle, /function bdWarehouseGroupedStock/);
  assert.match(bundle, /value:"sections",children:"Разделы и подразделы"/);
  assert.match(bundle, /value:"categories",children:"По категориям"/);
  assert.match(bundle, /value:"subcategories",children:"По подразделам"/);
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
