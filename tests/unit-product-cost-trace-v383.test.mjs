import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/client-runtime-diagnostic/route.ts", import.meta.url), "utf8");
const patchScript = fs.readFileSync(new URL("../scripts/patch-unit-product-cost-trace-v383.mjs", import.meta.url), "utf8");

test("v383 production bundle is valid and contains the bounded Köln trace", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-cost-trace-v383/);
  assert.match(bundle, /String\(activeVenueId\)!=="1"/);
  assert.match(bundle, /records\.length<16/);
  assert.match(bundle, /unit_product_costing_trace_v383/);
  assert.match(bundle, /sessionStorage\.setItem\("bd-unit-product-cost-trace-v383-sent","1"\)/);
});

test("v383 only traces the named unit-product problem and never mutates business stores", () => {
  assert.match(patchScript, /sprite\|спрайт\|cola\|кола/);
  assert.match(patchScript, /\/api\/client-runtime-diagnostic/);
  assert.doesNotMatch(patchScript, /\/api\/store\/|Kse\(|qr\(|method:\s*"(?:PUT|PATCH|DELETE)"/);
});

test("v383 server diagnostic is authenticated, sanitized, bounded, and read-only", () => {
  assert.match(route, /authenticateRequest\(request\)/);
  assert.match(route, /trace\.records\.slice\(0, 16\)/);
  assert.match(route, /safeCostingRecord/);
  assert.match(route, /\[BarDoctor unit product costing v383\]/);
  assert.doesNotMatch(route, /prepare\(|INSERT|UPDATE|DELETE/);
});
