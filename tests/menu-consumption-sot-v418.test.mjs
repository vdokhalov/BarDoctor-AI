import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const bundleUrl = new URL("public/assets/index-BQGspy0I.js", root);
const bundle = readFileSync(bundleUrl, "utf8");
const css = readFileSync(new URL("public/catalog.css", root), "utf8");
const menu = bundle.slice(bundle.indexOf("function bdCatMenuEditor"), bundle.indexOf("function bdCatStructureManager"));
const recipe = bundle.slice(bundle.indexOf("function bdCatRecipeEditor"), bundle.indexOf("function bdCatImportReview"));
const command = bundle.slice(bundle.indexOf("function bdAssortmentCommandPageV170"), bundle.indexOf("/* bd-assortment-command-v170:end */"));
const importReview = bundle.slice(bundle.indexOf("function bdAssortmentImportReviewV170"), bundle.indexOf("function bdAssortmentHomeSignalsV170"));
const fallbackRuntime = bundle.slice(bundle.indexOf("function bdTechCostUnitV376"), bundle.indexOf("function bdAssortmentHeaderV170"));

test("production recipe mount accepts an unambiguous legacy recipe without rewriting its menu", () => {
  const helperStart = bundle.indexOf("function bdLegacyRecipeCanOpenV418");
  const helperEnd = bundle.indexOf("function bdCatalogPage", helperStart);
  const gate = command.match(/((?:D\?\.consumptionMode==="RECIPE"|D&&\(!D\.venueId.*?))&&!O&&!B&&!L&&i.jsx\(bdCatRecipeEditor/);
  assert.ok(gate, "execute the actual production recipe mount condition");
  const menuItem = { id: "legacy-sprite", venueId: 1, type: "composite" };
  const activeRecipe = { id: "persisted-recipe", menuItemId: menuItem.id, venueId: 1, current: true, status: "confirmed" };
  const original = JSON.stringify({ menuItem, activeRecipe });
  const canMount = (item, recipes = [activeRecipe], overlays = {}) => runInNewContext(
    `${bundle.slice(helperStart, helperEnd)};Boolean(${gate[1]}&&!O&&!B&&!L)`,
    { D: item, E: { recipes }, s: { activeVenueId: 1 }, O: null, B: null, L: null,
      bdCatArray: (value) => Array.isArray(value) ? value : [], ...overlays },
  );
  assert.equal(canMount(menuItem), true, "a legacy persisted recipe must open from its detail");
  assert.equal(canMount({ ...menuItem, consumptionMode: "RECIPE" }), true);
  for (const consumptionMode of ["DIRECT_ITEM", "FIXED_QUANTITY", "NONE", "NEEDS_REVIEW"]) {
    assert.equal(canMount({ ...menuItem, consumptionMode }), false, consumptionMode);
  }
  assert.equal(canMount({ ...menuItem, readyProduct: { productKey: "stock:sprite" } }), false, "dual legacy link remains blocked");
  assert.equal(canMount(menuItem, [activeRecipe, { ...activeRecipe, id: "conflicting-recipe" }]), false);
  assert.equal(canMount(menuItem, [{ ...activeRecipe, current: false, lifecycleStatus: "inactive" }]), false);
  assert.equal(canMount({ ...menuItem, venueId: 2 }), false, "foreign venue cannot mount");
  for (const overlay of ["O", "B", "L"]) {
    assert.equal(canMount(menuItem, [activeRecipe], { [overlay]: {} }), false, `${overlay}: another editor remains exclusive`);
  }
  assert.equal(JSON.stringify({ menuItem, activeRecipe }), original, "opening must not migrate legacy data");
});

function runFallbackFixture(state, purchases) {
  const number = (value, fallback = 0) => {
    const parsed = typeof value === "string"
      ? Number(value.replace(/\s/g, "").replace(",", "."))
      : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const context = {
    bdCatArray: (value) => Array.isArray(value) ? value : [],
    bdCatState: (value) => ({
      groups: [],
      menuItems: [],
      recipes: [],
      priceHistory: [],
      canonicalProductAliases: [],
      inventoryProductAliases: [],
      supplierProductMappings: [],
      nomenclature: [],
      stockBalances: [],
      ...value,
    }),
    bdAssortmentNumberV170: number,
    bdCatToBase: (value, rawUnit) => {
      const amount = Math.max(0, number(value));
      const unit = String(rawUnit || "").toLocaleLowerCase("ru-RU");
      if (/^(л|l|литр)/.test(unit)) return { amount: amount * 1_000, unit: "ml" };
      if (/^(мл|ml)/.test(unit)) return { amount, unit: "ml" };
      if (/^(кг|kg)/.test(unit)) return { amount: amount * 1_000, unit: "g" };
      if (/^(г|гр|g)/.test(unit)) return { amount, unit: "g" };
      if (/^(шт|pcs|pc|piece)/.test(unit)) return { amount, unit: "pcs" };
      return { amount, unit: "unknown" };
    },
    bdMenuSaleSizeTextV298: () => "",
    bdMenuLegacySizeV298: () => null,
    bdAssortmentPluralV170: () => "",
    bdAssortmentNormV170: (value) => String(value || "").toLocaleLowerCase("ru-RU").trim(),
    bdAssortmentUnitLabelV293: (value) => value,
  };
  runInNewContext(`${fallbackRuntime}\n;globalThis.runFallbackV418=bdAssortmentFallbackAnalyticsV170`, context);
  return JSON.parse(JSON.stringify(context.runFallbackV418(state, purchases, "2026-09")));
}

test("menu save locks venue currency across modes and ignores stale item currency and venue", async () => {
  const start = menu.indexOf("const M=async()=>");
  const end = menu.indexOf("return i.jsx(\"div\"", start);
  assert.ok(start >= 0 && end > start, "production save handler must be executable");
  for (const mode of ["DIRECT_ITEM", "FIXED_QUANTITY", "RECIPE", "NONE"]) {
    for (const [venueId, currency] of [[1, "MDL"], [2, "PMR_RUB"]]) {
      const original = { id: "menu", name: "Item", sectionId: "section", taxonomyCategoryId: "category", groupId: "group", venueId: 99, currency: "USD", consumptionMode: mode, salePrice: 20, saleQuantityInput: 0.05, saleUnit: "l" };
      const before = JSON.stringify(original);
      let persisted;
      let closed = false;
      const context = {
        h: original, u: [{ id: "group" }], d: [],
        _: { id: "stock-id", key: "stock-key" },
        bdMenuModeConfiguredV418: true, bdMenuProductUnitV418: "pcs",
        bdMenuFixedCompatibleV418: true, bdMenuRecipeChoiceRequiredV418: false,
        bdMenuQuantityV418: 0.05, bdMenuVenueId: venueId, bdMenuVenueCurrency: currency,
        bdAccountingCurrencyV243: (value) => value,
        bdCatNumber: (value) => Number(value) || 0,
        bdSetMenuSavingV418: () => {}, j: (message) => assert.equal(message, ""),
        s: async (value) => { persisted = JSON.parse(JSON.stringify(value)); },
        a: () => { closed = true; },
      };
      await runInNewContext(`${menu.slice(start, end)};M()`, context);
      assert.equal(persisted.currency, currency);
      assert.equal(persisted.venueId, venueId);
      assert.equal(persisted.consumptionMode, mode);
      assert.equal(persisted.salePrice, 20);
      assert.equal(closed, true);
      assert.equal(JSON.stringify(original), before, "saved historical input is unchanged");
      if (mode === "DIRECT_ITEM" || mode === "FIXED_QUANTITY") assert.equal(persisted.readyProduct.nomenclatureItemId, "stock-id");
      else assert.equal(persisted.readyProduct, undefined);
      assert.equal(persisted.saleSize?.quantity, mode === "FIXED_QUANTITY" ? 0.05 : undefined);
    }
  }
});

test("v418 production bundle is valid and carries one release marker", () => {
  const checked = spawnSync(process.execPath, ["--check", fileURLToPath(bundleUrl)], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(bundle.split('const bdMenuConsumptionSotVersionV418="v418";').length - 1, 1);
});

test("taxonomy initialization resets only an untouched menu baseline and never erases user edits", () => {
  const start = menu.indexOf("S.useEffect(()=>{if(bdMenuTaxLoadingV350)return;");
  const end = menu.indexOf("const M=async()=>", start);
  assert.ok(start >= 0 && end > start);
  for (const loading of [true, false]) {
    for (const touched of [true, false]) {
      let frame;
      let marked = 0;
      const surface = {};
      const ref = { current: false };
      runInNewContext(menu.slice(start, end), {
        S: { useEffect: (effect) => effect() }, bdMenuTaxLoadingV350: loading,
        bdMenuInteractedRefV418: ref, bdMenuDialogRefV418: { current: surface },
        requestAnimationFrame: (callback) => { frame = callback; return 1; }, cancelAnimationFrame: () => {},
        window: { bdMarkNavigationClean: (target) => { assert.equal(target, surface); marked++; } },
      });
      ref.current = touched; // An edit arriving before the scheduled baseline is retained.
      frame?.();
      assert.equal(marked, !loading && !touched ? 1 : 0);
    }
  }
});

test("Menu asks one business question and conditionally configures one consumption source", () => {
  for (const phrase of [
    "Как списывать эту позицию со склада?",
    "Готовый товар",
    "Продаётся целиком и списывается как одна складская позиция",
    "Порция товара",
    "При продаже списывается указанное количество одного товара",
    "По техкарте",
    "При продаже списываются ингредиенты",
    "Без списания",
    "Складской расход не требуется",
  ]) assert.match(menu, new RegExp(phrase));
  assert.match(menu, /h\.consumptionMode==="DIRECT_ITEM"\|\|h\.consumptionMode==="FIXED_QUANTITY"/);
  assert.match(menu, /h\.consumptionMode==="FIXED_QUANTITY"&&i\.jsx\(bdMenuSaleSizeControlV298/);
  assert.match(menu, /h\.consumptionMode==="RECIPE"&&!bdMenuRecipeChoiceRequiredV418&&i\.jsx\("p"/);
  assert.match(menu, /h\.consumptionMode==="NONE"&&i\.jsx\("p"/);
  assert.match(menu, /При продаже 1 шт\. будет списана 1 шт\./);
  assert.doesNotMatch(menu, /bdMenuExactProductsV352/);
  assert.doesNotMatch(menu, /bdMenuExactProductV352/);
});

test("mode switching is controlled and preserves inactive legacy configuration", () => {
  assert.match(menu, /window\.confirm\("Изменить способ списания\?/);
  assert.match(menu, /Прежняя настройка сохранится для истории/);
  assert.match(menu, /bd-menu-consumption-review-v418/);
  assert.match(menu, /\.\.\.K/);
  assert.doesNotMatch(menu, /delete\s+.*readyProduct/);
  assert.doesNotMatch(command, /type==="service"\?R\.recipes\.filter/);
  assert.match(command, /w\.consumptionMode==="RECIPE"&&!ie\.length/);
  assert.match(command, /w\.consumptionMode==="RECIPE"&&\(f\("recipes"\),v\("all"\),z\(w\)\)/);
  assert.match(menu, /bdMenuOwnerRecipesV418\.length>1/);
  assert.match(menu, /bdMenuRecipeTokenV418=\(P,c\)=>String\(P\?\.id\|\|"legacy:"\+c\)/);
  assert.match(menu, /Какая техкарта будет активной\?/);
  assert.match(menu, /ингредиентов/);
  assert.match(command, /lifecycleStatus:"inactive",inactiveReason:"consumption_mode_switch"/);
  assert.match(menu, /bdMenuHasReadyV418&&Boolean\(e\?\.saleSize\?\.quantity\)/);
});

test("Menu and Tech Cards share one persisted recipe identity", () => {
  assert.match(command, /recipe:bdCatRecipeFor\(D,E\.recipes\)/);
  assert.match(command, /id:X\?\.id\|\|w\.id\|\|crypto\.randomUUID\(\)/);
  assert.match(command, /P\.recipes\.some\(p=>p\.id===Qe\.id\)\?P\.recipes\.map/);
  assert.doesNotMatch(command, /version:ce\+1/);
  assert.doesNotMatch(recipe, /ingredients:e\.type==="ready"/);
  assert.match(recipe, /current:!0,currentDraft:!0,source:"manual",ingredients:\[\]/);
  assert.match(recipe, /ownerId:e\.id,ownerType:"menu_item"/);
});

test("Tech Card editor uses authoritative current, line and total costs", () => {
  assert.match(recipe, /bdRecipeAuthoritativeCostByIdV418/);
  assert.match(recipe, /bdRecipeAuthoritativeCostByReferenceV418/);
  assert.match(recipe, /p\.nomenclatureItemId\|\|p\.purchaseProductKey/);
  assert.match(command, /he\.nomenclatureCosts\|\|\[\]/);
  assert.match(recipe, /costStatus:c\?\.costStatus\|\|\(W&&R===0\?"KNOWN_ZERO":"UNKNOWN"\)/);
  assert.match(recipe, /Текущая стоимость:/);
  assert.match(recipe, /Стоимость строки:/);
  assert.match(recipe, /Текущая себестоимость техкарты/);
  assert.doesNotMatch(recipe, /Складские параметры \(необязательно\)/);
});

test("explicit ID costing cannot be redirected by a legacy product-key alias", () => {
  const product = {
    id: "nom-target",
    nomenclatureItemId: "nom-target",
    productKey: "stock-target",
    key: "stock-target",
    name: "Explicit target",
    unit: "pcs",
    venueId: 1,
    active: true,
  };
  const decoy = {
    id: "nom-decoy",
    nomenclatureItemId: "nom-decoy",
    productKey: "stock-decoy",
    key: "stock-decoy",
    name: "Alias decoy",
    unit: "pcs",
    venueId: 1,
    active: true,
  };
  const readyProduct = {
    nomenclatureItemId: product.id,
    productKey: product.productKey,
    packagesPerSale: 1,
  };
  const state = {
    groups: [],
    canonicalProductAliases: [{ from: product.productKey, to: decoy.productKey }],
    nomenclature: [product, decoy],
    stockBalances: [],
    priceHistory: [],
    menuItems: [
      {
        id: "direct",
        name: "Direct",
        venueId: 1,
        active: true,
        type: "ready",
        consumptionMode: "DIRECT_ITEM",
        readyProduct,
        salePrice: 100,
        currency: "RUB",
      },
      {
        id: "fixed",
        name: "Fixed",
        venueId: 1,
        active: true,
        type: "ready",
        consumptionMode: "FIXED_QUANTITY",
        readyProduct,
        saleSize: { quantity: 2, unit: "pcs" },
        salePrice: 100,
        currency: "RUB",
      },
      {
        id: "recipe-menu",
        name: "Recipe",
        saleSize: { quantity: 50, unit: "l" }, // Inactive legacy portion must not override the ingredient quantity.
        venueId: 1,
        active: true,
        type: "composite",
        consumptionMode: "RECIPE",
        salePrice: 100,
        currency: "RUB",
      },
    ],
    recipes: [{
      id: "recipe",
      menuItemId: "recipe-menu",
      ownerId: "recipe-menu",
      venueId: 1,
      current: true,
      status: "confirmed",
      reviewStatus: "approved",
      ingredients: [{
        id: "line",
        nomenclatureItemId: product.id,
        purchaseProductKey: product.productKey,
        name: product.name,
        quantity: 1,
        unit: "pcs",
        venueId: 1,
      }],
    }],
  };
  const purchases = [
    {
      id: "target-purchase",
      status: "confirmed",
      date: "2026-09-01",
      currency: "RUB",
      items: [{
        id: "target-line",
        purchaseProductKey: product.productKey,
        name: product.name,
        quantity: 1,
        unit: "pcs",
        lineTotal: 10,
      }],
    },
    {
      id: "decoy-purchase",
      status: "confirmed",
      date: "2026-09-02",
      currency: "RUB",
      items: [{
        id: "decoy-line",
        purchaseProductKey: decoy.productKey,
        name: decoy.name,
        quantity: 1,
        unit: "pcs",
        lineTotal: 999,
      }],
    },
  ];

  const analytics = runFallbackFixture(state, purchases);
  const byId = new Map(analytics.menuItems.map((item) => [item.id, item]));
  assert.equal(byId.get("direct").consumptionMode, "DIRECT_ITEM");
  assert.equal(byId.get("direct").recipeCost, 10);
  assert.equal(byId.get("fixed").consumptionMode, "FIXED_QUANTITY");
  assert.equal(byId.get("fixed").recipeCost, 20);
  assert.equal(byId.get("recipe-menu").recipeCost, 10);
  assert.equal(byId.get("recipe-menu").ingredientRows[0].productKey, product.productKey);
  assert.notEqual(byId.get("recipe-menu").ingredientRows[0].productKey, decoy.productKey);
  assert.match(bundle, /bdExplicitCostMapsV418=bdTechCostMapsV376\(n,purchases,bdExplicitCostKeyV418\)/);
  assert.doesNotMatch(bundle, /expected=product\?canonical\(product\.productKey\|\|product\.key\|\|product\.id\)/);
});

test("read models never synthesize direct/fixed/none Tech Cards", () => {
  assert.match(bundle, /recipes:a\.filter\(m=>m\.consumptionMode==="RECIPE"\|\|m\.consumptionMode==="NEEDS_REVIEW"\)/);
  assert.match(bundle, /e\.consumptionMode==="RECIPE"\|\|e\.consumptionMode==="NEEDS_REVIEW"/);
  assert.match(bundle, /e\.consumptionSummary\|\|e\.portionSize/);
  assert.match(bundle, /menuUsage=.*consumptionMode==="DIRECT_ITEM".*consumptionMode==="FIXED_QUANTITY"/s);
  assert.match(bundle, /recipeUsage=.*z!=="RECIPE"/s);
  assert.match(bundle, /function bdAssortmentMatchesV171.*a=e\.consumptionMode==="RECIPE"/s);
  assert.match(bundle, /\["requires_review","needs_review"\]\.includes/);
  assert.match(bundle, /function bdAssortmentHomeSignalsV170.*v\.mode==="RECIPE"&&!v\.recipe/s);
  assert.match(bundle, /id:"assortment-consumption"/);
});

test("controlled server validation is surfaced instead of cached as an offline success", () => {
  assert.match(bundle, /error:s\.error\|\|"Сервер отклонил изменение"/);
  assert.match(bundle, /bdControlledStoreRejectionV418:!0/);
  assert.match(bundle, /if\(l\?\.bdControlledStoreRejectionV418\)\{Vm\(e,a\),jm\(\);throw l\}/);
  assert.match(command, /bdPhase3SaveRejectedV418=E/);
  assert.match(command, /catch\(c\)\{const p=bdCatState\(xr\(bdCatalogStoreKey\)\|\|bdPhase3SaveRejectedV418\)/);
});

test("OCR import requires one explicit, complete consumption mode before persistence", () => {
  assert.match(importReview, /products:bdImportProductsV418=\[\]/);
  assert.match(importReview, /Как списывать эту позицию со склада\?/);
  for (const mode of ["DIRECT_ITEM", "FIXED_QUANTITY", "RECIPE", "NONE"]) {
    assert.match(importReview, new RegExp(`value:"${mode}"`));
  }
  assert.match(importReview, /g==="DIRECT_ITEM"\)return Boolean\(j\)&&bdCatToBase\(1,j\.unit\)\.unit==="pcs"/);
  assert.match(importReview, /g==="FIXED_QUANTITY"\)\{const x=\{\.\.\.m\(h\),\.\.\.h\}/);
  assert.match(importReview, /bdMenuImportSizeValidV298\(x\)&&C\.unit!=="unknown"&&C\.unit===D\.unit/);
  assert.match(importReview, /g==="RECIPE"/);
  assert.match(importReview, /disabled:s\|\|!E/);
  assert.match(command, /bdExistingImportV418>=0\?p\[bdExistingImportV418\]=Qe:p\.push\(Qe\)/);
  assert.match(command, /inactiveReason:bdActivateImportedRecipeV418\?void 0:bdOtherActiveRecipesV418\.length\?"existing_recipe_requires_review":"menu_consumption_mode"/);
  assert.match(command, /существующие активные версии не заменены/);
  assert.match(command, /bdAssortmentImportReviewV170,\{draft:A,current:E,onChange:k,onCancel:xe,onConfirm:Te,saving:J,products:bdCatMatchingProductsV258/);
});

test("venue changes close stale editors and venue IDs travel with persisted objects", () => {
  assert.match(command, /bdPhase3VenueRefV418=S\.useRef\(s\.activeVenueId\)/);
  assert.match(command, /M\(null\),z\(null\),q\(null\),U\(null\),se\(null\)/);
  assert.match(command, /recipes:E\.recipes,venueId:s\.activeVenueId/);
  assert.match(command, /balances:E\.stockBalances,venueId:s\.activeVenueId,costRows:/);
  assert.match(recipe, /venueId:Number\(bdRecipeVenueId\)/);
});

test("v418 stays usable at 390px and desktop without horizontal overflow", () => {
  assert.match(css, /bd-menu-consumption-sot-v418/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.bd-menu-consumption-grid-v418\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /min-width:0/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(css, /\.bd-menu-position-editor-v400 \.bd-catalog-sheet-actions\{position:fixed\}/);
  assert.match(css, /\.bd-tech-card-editor-v354 textarea \{[\s\S]*?font-size: 16px;/);
});

test("source shells use the v418 cache identity", () => {
  for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
    const source = readFileSync(new URL(relativePath, root), "utf8");
    assert.match(source, /20260907-menu-consumption-sot-v418/, relativePath);
  }
});
