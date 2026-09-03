import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");

test("v395 leaves exactly one visual splash owner", () => {
  assert.match(bundle, /function ble\(\)\{return null\}/);
  assert.doesNotMatch(bundle, /data-bd-splash":"/);
  assert.equal((html.match(/data-bd-static-startup="v201"/g) || []).length, 1);
  assert.match(html, /data-bd-single-splash="v395"/);
});

test("v395 never animates or dims the splash container", () => {
  const completion = bundle.slice(bundle.indexOf("function bdStartupFirstPaintCompleteV201"), bundle.indexOf("function bdHealthStartupGateV155"));
  assert.match(html, /opacity: 1 !important;/);
  assert.match(html, /transform: none !important;/);
  assert.match(html, /transition: none !important;/);
  assert.doesNotMatch(html, /bd-static-startup-leaving-v394|transition: opacity|prefers-reduced-motion/);
  assert.doesNotMatch(completion, /bd-static-startup-leaving-v394|classList\.add\(/);
});

test("v395 root and route guards never mount a second splash", () => {
  const root = bundle.slice(bundle.indexOf("function _le(){"), bundle.indexOf("const Ele="));
  const guard = bundle.slice(bundle.indexOf("function pt({component:e})"), bundle.indexOf("const bdEmbeddedPagePaths"));
  assert.doesNotMatch(root, /ble|data-bd-root-splash|opacity|animate/);
  assert.doesNotMatch(guard, /ble/);
  assert.match(guard, /bdAuthenticatedHomeBootV345/);
});

test("v395 releases once on the Home shell without waiting for business data", () => {
  const coordinator = bundle.slice(bundle.indexOf("function bdStartupFirstPaintCompleteV201"), bundle.indexOf("function cEe(){"));
  assert.match(coordinator, /window\.__bdSplashReleasedV(?:395|396)/);
  assert.match(coordinator, /data-bd-authenticated-home-shell/);
  if (bundle.includes('bdNativeContinuityVersionV396="v396"')) assert.doesNotMatch(coordinator, /setTimeout|shell-timeout/);
  else assert.match(coordinator, /setTimeout\(\(\)=>f\("shell-timeout"\),1500\)/);
  assert.doesNotMatch(coordinator, /cloudReady|finance|business-health-v335|minimumSplashElapsed/);
  assert.doesNotMatch(bootstrap, /\[data-bd-root-splash\], \[data-bd-splash\]/);
});

test("v395 is cache-busted through every startup entrypoint", () => {
  assert.match(bundle, /bdSingleSplashVersionV395="v395"/);
  assert.match(html, /name="bd-single-splash" content="v395"/);
  if (bundle.includes('bdNativeContinuityVersionV396="v396"')) {
    assert.match(html, /bardoctor-preview-v396\.js/);
    assert.match(bootstrap, /native-continuity-v396/);
    assert.match(html, /bd-startup-frame-trace-v396/);
    assert.match(html, /data-bd-startup-frame-result-v396/);
  } else {
    assert.match(html, /20260901-single-splash-v395/);
    assert.match(bootstrap, /single-splash-v395/);
    assert.match(html, /bd-startup-frame-trace-v395/);
    assert.match(html, /__bdStartupFrameTraceV395Complete/);
    assert.match(html, /data-bd-startup-frame-result-v395/);
  }
});
