import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, patchSource, appHtml, responseShell, bootstrap] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-quick-add-purchase-v372.mjs", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
]);

test("global Add purchase opens immediately when Suppliers is already active", () => {
  assert.match(bundle, /bdQuickAddPurchaseVersionV372="v372"/);
  assert.match(
    bundle,
    /startsWith\("\/suppliers\?create=1"\)&&window\.location\.pathname\.startsWith\("\/suppliers"\)/,
  );
  assert.match(bundle, /dispatchEvent\(new CustomEvent\("bd:open-purchase-entry-v372"\)\)/);
  assert.match(bundle, /addEventListener\("bd:open-purchase-entry-v372",w\)/);
  assert.match(bundle, /removeEventListener\("bd:open-purchase-entry-v372",w\)/);
});

test("global Add purchase keeps URL navigation as the cross-page fallback", () => {
  assert.match(
    bundle,
    /function f\(m\)\{a\(!1\);if\([\s\S]*?dispatchEvent[\s\S]*?return\}t\(m\)\}/,
  );
  assert.match(bundle, /href:"\/suppliers\?create=1"/);
});

test("the production build preserves the quick-add repair in every shell", () => {
  assert.match(patchSource, /bd:open-purchase-entry-v372/);
  for (const shell of [appHtml, responseShell, bootstrap]) {
    assert.match(shell, /bd-quick-add-purchase-v372/);
  }
});
