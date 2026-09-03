import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, catalogCss, appHtml, responseShell, patchSource] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/catalog.css", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-mobile-menu-editor-v400.mjs", import.meta.url), "utf8"),
]);

test("menu position editor has a dedicated stable mobile surface", () => {
  assert.match(bundle, /bd-menu-position-backdrop-v400/);
  assert.match(bundle, /bd-catalog-sheet bd-menu-position-editor-v400/);
  assert.match(patchSource, /menu position editor expected once/);
});

test("menu position editor cannot pan horizontally", () => {
  assert.match(catalogCss, /\.bd-menu-position-backdrop-v400\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(catalogCss, /\.bd-menu-position-backdrop-v400\s*\{[\s\S]*?touch-action:\s*pan-y/);
  assert.match(catalogCss, /\.bd-menu-position-editor-v400\s*>\s*\.bd-catalog-form\s*\{[\s\S]*?overflow-x:\s*hidden/);
  assert.match(catalogCss, /overscroll-behavior-x:\s*none/);
  assert.match(catalogCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/);
});

test("menu position actions remain anchored on phone viewports", () => {
  assert.match(catalogCss, /\.bd-menu-position-editor-v400 \.bd-catalog-sheet-actions\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(catalogCss, /\.bd-menu-position-editor-v400 \.bd-catalog-sheet-actions\s*\{[\s\S]*?bottom:\s*0/);
  assert.match(catalogCss, /padding-bottom:\s*calc\(94px \+ env\(safe-area-inset-bottom\)\)\s*!important/);
});

test("version 400 cache key reaches every production shell", () => {
  for (const shell of [appHtml, responseShell]) {
    assert.match(shell, /catalog\.css\?v=[^"']*bd-mobile-menu-editor-v400/);
    assert.match(shell, /index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=[^"']*bd-mobile-menu-editor-v400/);
  }
});
