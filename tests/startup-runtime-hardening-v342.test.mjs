import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, diagnosticRoute, taxonomyStyles] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../app/api/client-runtime-diagnostic/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/canonical-taxonomy-v336.css", import.meta.url), "utf8"),
]);

test("v342 restores every catalog helper referenced by the canonical taxonomy bundle", () => {
  const helpers = [
    "bdCatIsOpen",
    "bdCatUnitLabel",
    "bdCatToBase",
    "bdCatPackage",
    "bdCatPurchaseProducts",
    "bdCatMatchingProductsV258",
    "bdCatRecipePriorityV257",
    "bdCatRecipesForV257",
    "bdCatRecipeFor",
    "bdCatTechCardStateV257",
    "bdCatTechCardMetaV257",
    "bdCatBalanceKey",
  ];

  for (const helper of helpers) {
    assert.equal(
      bundle.split(`function ${helper}(`).length - 1,
      1,
      `${helper} must have exactly one declaration`,
    );
  }
});

test("v342 keeps the write-off create action clear of selectable mobile rows", () => {
  assert.match(bundle, /i\.jsxs\("section",\{className:"bd-writeoff-picker-results-v271",children:\[[\s\S]*bd-ingredient-create-v336/);
  assert.match(taxonomyStyles, /\.bd-writeoff-picker-results-v271 > \.bd-ingredient-create-v336/);
  assert.match(taxonomyStyles, /padding-bottom: calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
});

test("v342 contains safe Home and cached Business Health fallbacks", () => {
  assert.match(bundle, /bdStartupRuntimeHardeningVersionV342="v342"/);
  assert.match(bundle, /function bdHealthSafeComputeV342/);
  assert.match(bundle, /e=Array\.isArray\(e\)\?e:\[\],t=Array\.isArray\(t\)\?t:\[\]/);
  assert.match(bundle, /function bdBusinessHealthSafeSnapshotV342\(e\)\{try\{return bdBusinessHealthSnapshotFromEnvelopeV334\(e\)\}catch\{return null\}\}/);
  assert.match(bundle, /S\.useMemo\(\(\)=>bdHealthSafeComputeV342/);
});

test("v342 reports a sanitized authenticated diagnostic and delays fatal recovery", () => {
  assert.match(bootstrap, /startup-runtime-v342/);
  assert.match(bootstrap, /\/api\/client-runtime-diagnostic/);
  assert.match(bootstrap, /bdSanitizeStartupDetailV342/);
  assert.match(bootstrap, /data-bd-home-page/);
  assert.match(bootstrap, /\}, 900\)/);

  assert.match(diagnosticRoute, /authenticateRequest\(request\)/);
  assert.match(diagnosticRoute, /MAX_TEXT_LENGTH = 180/);
  assert.match(diagnosticRoute, /console\.error\(`\[BarDoctor client runtime\]/);
  assert.doesNotMatch(diagnosticRoute, /prepare\(|INSERT|UPDATE|DELETE/);
});
