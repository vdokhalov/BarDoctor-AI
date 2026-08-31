import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const catalogCss = readFileSync(new URL("../public/catalog.css", import.meta.url), "utf8");
const assortmentCss = readFileSync(new URL("../public/assortment-command-v170.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../public/app.html", import.meta.url), "utf8");

test("v355 restores page scrolling after the final catalog dialog closes", () => {
  assert.match(bundle, /bdPublicationReadinessVersion="v355"/);
  assert.match(bundle, /document\.body\.style\.overflow==="hidden"\?"":document\.body\.style\.overflow/);
  assert.match(bundle, /window\.removeEventListener\("keydown",c\),document\.body\.style\.overflow=p/);
});

test("tech-card workspace fills the viewport and keeps actions at the bottom", () => {
  assert.match(catalogCss, /Publication readiness v355/);
  assert.match(catalogCss, /\.bd-tech-card-workspace-v354\s*\{[\s\S]*?padding:\s*0 !important/);
  assert.match(catalogCss, /\.bd-tech-card-editor-v354\s*\{[\s\S]*?height:\s*100dvh !important/);
  assert.match(catalogCss, /\.bd-tech-card-editor-v354 \.bd-catalog-sheet-actions\s*\{[\s\S]*?margin-top:\s*auto !important/);
});

test("mobile catalog editor reserves its own scrollable content area", () => {
  assert.match(catalogCss, /\.bd-catalog-sheet:not\(\.bd-tech-card-editor-v354\)\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(catalogCss, /> \.bd-catalog-form\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(catalogCss, /\.bd-catalog-sheet-actions\s*\{[\s\S]*?box-shadow:/);
});

test("mobile assortment content starts immediately after the canonical header", () => {
  assert.match(assortmentCss, /Publication header alignment v355/);
  assert.match(assortmentCss, /\.bd-assortment-command-v170\s*\{\s*padding-top:\s*0/);
  assert.match(assortmentCss, /bd-app-header \.bd-app-header-copy h1/);
});

test("empty tech cards show an actionable instruction", () => {
  assert.match(bundle, /Добавьте хотя бы один ингредиент/);
  assert.doesNotMatch(bundle, /children:\["Связано ",bdTechLinkedCount/);
  assert.match(shell, /publication-readiness-v355/);
});
