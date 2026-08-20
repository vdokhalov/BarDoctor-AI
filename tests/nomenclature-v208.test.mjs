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
  assert.match(bootstrap, /nomenclature-v208\.css\?v=20260820-nomenclature-v211/);
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

test("warehouse reads canonical names from nomenclature and remains operational", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");

  assert.match(bundle, /function bdWarehouseCanonicalBalances/);
  assert.match(bundle, /\[N,E\]=S\.useState\(\(\)=>bdWarehouseCanonicalBalances\(xr\("bd_assortment_v1"\)\)\)/);
  assert.match(bundle, /const Se=\{stock:"Остатки",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"\}/);
  assert.match(bundle, /children:"Товары на складе"/);
  assert.match(bundle, /onClick:\(\)=>e\("\/nomenclature"\),children:"Номенклатура"/);
  assert.match(bundle, /function bdWarehouseGroupedStock/);
  assert.match(bundle, /value:"sections",children:"По разделам"/);
  assert.match(bundle, /value:"categories",children:"По категориям"/);
  assert.match(bundle, /bdInventoryCountSheet/);
  assert.match(bundle, /bdWriteoffSheet/);
  assert.match(bundle, /data-bd-warehouse-sales-entry/);
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
});
