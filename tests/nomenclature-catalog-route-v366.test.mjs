import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const redirect = fs.readFileSync(new URL("../app/assortment/route.ts", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("nomenclature menu and tech-card buttons use the registered catalog route", () => {
  assert.match(bundle, /\/catalog\?tab=menu&returnTo=nomenclature/);
  assert.match(bundle, /\/catalog\?tab=recipes&returnTo=nomenclature/);
  assert.doesNotMatch(bundle, /e\("\/assortment\?tab=(?:menu|recipes)"\)/);
});

test("catalog returns to nomenclature when it was opened from nomenclature", () => {
  assert.match(bundle, /function bdNomenclatureReturnUrlV369/);
  assert.match(bundle, /bdNomenclatureReturnUrlV369\(\):"\/more"/);
  assert.match(bundle, /Назад в карточку номенклатуры/);
});

test("legacy assortment links remain compatible and preserve their query", () => {
  assert.match(redirect, /url\.pathname = "\/catalog"/);
  assert.match(redirect, /Response\.redirect\(url, 307\)/);
});

test("all shells invalidate the broken-route bundle", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-nomenclature-catalog-route-v366/);
});
