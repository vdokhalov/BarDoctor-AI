import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("the production SPA bundle remains complete and parseable", async () => {
  const bundle = await source("public/assets/index-BQGspy0I.js");
  assert.ok(bundle.length > 2_000_000, `production bundle is unexpectedly small: ${bundle.length} characters`);
  assert.equal(bundle.includes("\uFFFD"), false, "production bundle contains Unicode replacement characters");
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "module" }));
  assert.match(bundle, /const bdEmbeddedPagePaths=/);
});

test("secondary navigation uses one safe-area-aware sticky offset contract", async () => {
  const [shellCss, dataControlCss, route, bundle] = await Promise.all([
    source("public/app-shell-v185.css"),
    source("public/data-control.css"),
    source("app/data-control/route.ts"),
    source("public/assets/index-BQGspy0I.js"),
  ]);

  assert.match(route, /data-bd-secondary-navigation="true"/);
  assert.match(route, /data-control\.css\?v=20260825-layout-v279/);
  assert.match(shellCss, /html\[data-bd-embedded="true"\]\s*\{\s*--bd-page-header-height:\s*0px;/s);
  assert.match(shellCss, /html\[data-bd-secondary-navigation="true"\][^{]*\{[^}]*scroll-padding-top:\s*var\(--bd-page-scroll-padding-top/s);
  assert.match(dataControlCss, /--bd-page-header-height:\s*max\(76px,\s*calc\(53px \+ env\(safe-area-inset-top\)\)\)/);
  assert.match(dataControlCss, /\.trust-tabs\s*\{[^}]*top:\s*var\(--bd-page-header-height\)/s);
  assert.match(dataControlCss, /\.trust-notice\s*\{[^}]*top:\s*calc\(var\(--bd-page-header-height\) \+ var\(--bd-secondary-navigation-height\) \+ 10px\)/s);
  assert.doesNotMatch(dataControlCss, /\.trust-tabs\s*\{[^}]*top:\s*(?:70|76)px/s);
  assert.match(bundle, /embedded-shell-v269\.css\?v=20260825-layout-v279/);
});

test("mobile content and overlays retain bottom-safe-area clearance", async () => {
  const [shellCss, dataControlCss, modernCss, venueCss] = await Promise.all([
    source("public/app-shell-v185.css"),
    source("public/data-control.css"),
    source("public/modern-polish.css"),
    source("public/venue-switcher.css"),
  ]);

  assert.match(shellCss, /height:\s*calc\(100dvh - var\(--bd-header-total\) - 84px - var\(--bd-safe-bottom\)\) !important/);
  assert.match(dataControlCss, /\.trust-main\s*\{[^}]*env\(safe-area-inset-bottom\)/s);
  assert.match(dataControlCss, /\.detail-content\s*\{[^}]*overflow-y:\s*auto[^}]*env\(safe-area-inset-bottom\)/s);
  assert.match(modernCss, /\.bd-scroll-top\s*\{[^}]*bottom:\s*max\(var\(--bd-scroll-top-offset\),\s*calc\(16px \+ env\(safe-area-inset-bottom\)\)\)/s);
  assert.match(venueCss, /\.bd-venue-sheet-panel\{[^}]*max-height:min\(88dvh,760px\)/s);
  assert.match(venueCss, /\.bd-venue-sheet-panel\{[^}]*overflow:auto/s);
  assert.match(venueCss, /\.bd-venue-sheet-panel\{[^}]*env\(safe-area-inset-bottom\)/s);
});
