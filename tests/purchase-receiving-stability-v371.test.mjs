import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, scanRoute, patchSource, appHtml, responseShell, bootstrap] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../app/api/purchases/scan/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-purchase-review-ux-v356.mjs", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
]);

test("global add purchase opens the source chooser on first render", () => {
  assert.match(bundle, /bdPurchaseReceivingStabilityV371="v371"/);
  assert.match(bundle, /S\.useState\(\(\)=>\{const w=new URLSearchParams\(window\.location\.search\);return w\.get\("create"\)==="1"\|\|w\.get\("scan"\)==="1"\}\)/);
});

test("receiving keeps source order while matching and advances intentionally", () => {
  assert.match(bundle, /const\[bdLineViewV357,bdSetLineViewV357\]=S\.useState\("all"\)/);
  assert.match(bundle, /currentIndex=e\.items\.findIndex/);
  assert.match(bundle, /bdSetLineViewV357\("all"\)/);
  assert.match(bundle, /Порядок строк сохранён как в документе/);
  assert.doesNotMatch(bundle, /S\.useState\(\(\)=>e\.items\.some\([^;]+\?"attention":"all"\)/);
});

test("legacy production recognition uses canonical matching without replacing commercial data", () => {
  assert.match(scanRoute, /async function matchLegacyRecognition/);
  assert.match(scanRoute, /applyDeterministicMappings\(\{/);
  assert.match(scanRoute, /mergeShadowMappingMetadata\(input\.legacy, matched\)/);
  assert.match(scanRoute, /legacy_authoritative_canonical_matching/);
  assert.match(scanRoute, /await matchLegacyRecognition\(\{/);
});

test("artifact regeneration and every shell preserve the stability patch", () => {
  assert.match(patchSource, /bdPurchaseReceivingStabilityV371/);
  for (const shell of [appHtml, responseShell, bootstrap]) {
    assert.match(shell, /purchase-receiving-stability-v371/);
  }
});
