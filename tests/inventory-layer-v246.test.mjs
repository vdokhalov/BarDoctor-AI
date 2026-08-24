import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/warehouse.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
const response = fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");
const bootstrap = fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
const print = fs.readFileSync(new URL("../lib/bardoctor/inventory-counts.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/inventory/counts/route.ts", import.meta.url), "utf8");

test("inventory is portalled into one viewport-owned layer", () => {
  assert.match(bundle, /ug\.createPortal\(i\.jsxs\("div",\{className:"bd-inventory-layer-v246"/);
  assert.match(bundle, /document\.body\);/);
  assert.match(bundle, /"aria-modal":"true"/);
  assert.match(bundle, /bd-inventory-overlay-open-v246/);
  assert.match(bundle, /o\.style\.overflow="hidden"/);
  assert.match(bundle, /l\.style\.overflow="hidden"/);
});

test("inventory owns its header, scroll body and non-overlapping footer", () => {
  assert.match(css, /Inventory layer v246/);
  assert.match(css, /\.bd-inventory-layer-v246\s*\{[^}]*position: fixed;/s);
  assert.match(css, /\.bd-inventory-sheet-v246\s*\{[^}]*isolation: isolate;/s);
  assert.match(css, /\.bd-inventory-sheet-v246 \.bd-inventory-body-v245\s*\{[^}]*overflow-y: auto;/s);
  assert.match(css, /\.bd-inventory-footer-v246 \.bd-inventory-actions-v245\s*\{[^}]*position: static;/s);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /body\.bd-inventory-overlay-open-v246 \.bd-scroll-top/);
  assert.match(bundle, /className:"bd-inventory-footer-v246"/);
});

test("print and close actions remain in the active inventory header", () => {
  assert.match(bundle, /"aria-label":"Печатная ведомость"/);
  assert.match(bundle, /children:"Печать"/);
  assert.match(bundle, /"aria-label":"Закрыть"/);
  assert.match(bundle, /children:"×"/);
  assert.match(bundle, /window\.open\("\/api\/inventory\/counts\?id="/);
  assert.doesNotMatch(bundle, /noopener,noreferrer/);
  assert.match(print, /Назад к инвентаризации/);
  assert.match(print, /window\.opener/);
  assert.match(route, /inventoryPrintUnavailable/);
  assert.match(route, /inventoryReturnUrl\(account\.venueId, document\.id\)/);
  assert.match(route, /\/warehouse\?venue=\$\{encodeURIComponent\(String\(venueId\)\)\}&tab=counts/);
});

test("created inventory replaces the transient new URL with its durable deep link", () => {
  assert.match(
    bundle,
    /l\.inventory\?\.id&&window\.bdSyncNavigationQuery\(\{inventory:l\.inventory\.id,tab:"counts",add:null\}\)/,
  );
});

test("v247 navigation cache markers are wired through every app shell", () => {
  for (const source of [html, response]) assert.match(source, /20260822-navigation-v247/);
  assert.match(bootstrap, /canonical-navigation-v247/);
});