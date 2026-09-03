import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("nomenclature exposes one editable canonical taxonomy without an automatic production rewrite", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdNomenclaturePageV238");
  const end = bundle.indexOf("bdNomenclaturePage=bdNomenclaturePageV238", start);
  assert.ok(start >= 0 && end > start);
  const implementation = bundle.slice(start, end);
  assert.match(bundle, /bdCanonicalTaxonomyWorkflowVersion="v336"/);
  assert.match(bundle, /bdCanonicalTaxonomyIntegrationsVersion="v337"/);
  assert.match(bundle, /bdCanonicalTaxonomyReuseVersion="v338"/);
  assert.match(bundle, /bdCanonicalTaxonomyFreshnessVersion="v339"/);
  assert.match(bundle, /bdCanonicalTaxonomyPostbuildVersion="v340"/);
  assert.match(implementation, /\[\["structure","Структура"\],\["taxonomy","Категории"\]/);
  assert.match(implementation, /bdTaxonomyManagerV336/);
  assert.doesNotMatch(implementation, /action:"classify"/);
  assert.match(bundle, /function bdBulkClassificationV337/);
  assert.match(bundle, /\/api\/nomenclature\/bulk-classification/);
});

test("tech cards, receipts and write-offs share quick create and preserve their active workflow", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const ingredientStart = bundle.indexOf("function bdCatIngredientMatchV375");
  const ingredientEnd = bundle.indexOf("const bdCatIngredientMatchV368=bdCatIngredientMatchV375", ingredientStart);
  const receiptStart = bundle.indexOf("function bdInvoiceLineMappingV3");
  const receiptEnd = bundle.indexOf("function bdPurchaseReview", receiptStart);
  const writeoffStart = bundle.indexOf("function bdWriteoffPickerV271");
  const writeoffEnd = bundle.indexOf("function bdWriteoffPickerRowV271", writeoffStart);
  assert.match(bundle.slice(ingredientStart, ingredientEnd), /bdNomenclatureQuickCreateV336/);
  assert.match(bundle.slice(ingredientStart, ingredientEnd), /context:"tech-card"/);
  assert.match(bundle.slice(receiptStart, receiptEnd), /bdNomenclatureQuickCreateV336/);
  assert.match(bundle.slice(receiptStart, receiptEnd), /context:"receipt"/);
  assert.match(bundle.slice(writeoffStart, writeoffEnd), /bdNomenclatureQuickCreateV336/);
  assert.match(bundle, /Создать и добавить/);
  assert.match(bundle, /PRODUCT_SIMILAR/);
  assert.match(bundle, /action:"restore"/);
});

test("menu and purchase lines consume taxonomy IDs instead of a separate business-category selector", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const menuStart = bundle.indexOf("function bdCatMenuGroups");
  const menuEnd = bundle.indexOf("function bdCatReadiness", menuStart);
  const editorStart = bundle.indexOf("function bdCatMenuEditor");
  const editorEnd = bundle.indexOf("function bdCatInternalEditor", editorStart);
  const purchaseStart = bundle.indexOf("function bdPurchaseReview");
  const purchaseEnd = bundle.indexOf("const bdImageUploadVersion", purchaseStart);
  assert.match(bundle.slice(menuStart, menuEnd), /nomenclatureStructure/);
  assert.match(bundle.slice(menuStart, menuEnd), /taxonomyCategoryId/);
  assert.match(bundle.slice(editorStart, editorEnd), /bdTaxonomySelectorsV336/);
  assert.match(bundle.slice(editorStart, editorEnd), /Управление общей структурой/);
  assert.match(bundle.slice(purchaseStart, purchaseEnd), /line\.purchaseProductKey\|\|line\.nomenclatureId/);
  assert.doesNotMatch(bundle.slice(purchaseStart, purchaseEnd), /label:"Категория",children:i\.jsx\("select",\{value:[a-z]\.category/);
});

test("taxonomy APIs are venue-scoped, additive and keep accounting currency authoritative", async () => {
  const [taxonomyRoute, quickRoute, bulkRoute, productRoute, css] = await Promise.all([
    read("app/api/nomenclature/taxonomy/route.ts"),
    read("app/api/nomenclature/quick-create/route.ts"),
    read("app/api/nomenclature/bulk-classification/route.ts"),
    read("app/api/inventory/products/route.ts"),
    read("public/canonical-taxonomy-v336.css"),
  ]);
  for (const route of [taxonomyRoute, quickRoute, bulkRoute]) {
    assert.match(route, /authenticateRequest\(request\)/);
    assert.match(route, /account\.id/);
  }
  assert.match(taxonomyRoute, /mutateCanonicalTaxonomy/);
  assert.match(taxonomyRoute, /DATA_STALE/);
  assert.match(taxonomyRoute, /taxonomyUsage/);
  assert.match(bulkRoute, /DATA_STALE/);
  assert.match(quickRoute, /accountingCurrencyFromRestaurantJson/);
  assert.match(productRoute, /purchasePrice/);
  assert.match(productRoute, /PRODUCT_SIMILAR/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /bd-bulk-taxonomy-v337/);
});
