import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/menu-sale-size-v298.css", import.meta.url);
const storeRouteUrl = new URL("../app/api/store/[key]/route.ts", import.meta.url);

test("menu create and edit use controlled numeric quantity plus canonical unit picker", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /menu-sale-size-patch-v298/);
  assert.match(bundle, /aria-label":"Количество продажи"/);
  assert.match(bundle, /aria-label":"Единица продажи"/);
  assert.ok(bundle.includes('pattern:"[0-9]+([,.][0-9]+)?"'));
  assert.match(bundle, /baseQuantity:/);
  assert.match(bundle, /baseUnit:/);
  assert.doesNotMatch(
    bundle,
    /label:"Порция \/ объём",children:i\.jsx\("input",\{value:[a-z]\.portionSize/,
  );
});

test("ready product editor links canonical nomenclature packaging", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /label:"Номенклатура"/);
  assert.match(bundle, /Найти товар, например Спрайт/);
  assert.match(bundle, /label:"Упаковка продажи"/);
  assert.match(bundle, /packagesPerSale:1/);
  assert.match(bundle, /bdMenuStructuredSizeV298\(n\.quantity,n\.unit,"packaging"/);
  assert.match(bundle, /return e&&\(t\?\.unit==="pcs"\|\|t\?\.baseUnit==="pcs"\)/);
  assert.match(bundle, /Одна продажа спишет одну связанную складскую упаковку/);
});

test("legacy menu portion is preserved for review and never guessed", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /status:"needs_review",legacyValue:/);
  assert.match(bundle, /Прежнее значение/);
  assert.match(bundle, /legacyPortionSize/);
  assert.match(bundle, /bdMenuCleanItemV298/);
  assert.equal(bundle.match(/menuItems\.every\(bdMenuImportSizeValidV298\)/g)?.length, 2);
});

test("authoritative assortment persistence normalizes changed items and rejects invalid DTOs", async () => {
  const route = await readFile(storeRouteUrl, "utf8");
  assert.match(route, /normalizeMenuItemSaleSizeRecord/);
  assert.match(route, /validateMenuItemSaleSize/);
  assert.match(route, /MENU_SALE_SIZE_INVALID/);
  assert.match(route, /status: 422/);
});

test("sale size layout stays usable on mobile and desktop", async () => {
  const css = await readFile(cssUrl, "utf8");
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(108px, 0\.55fr\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
});
