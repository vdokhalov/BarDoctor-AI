import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
]);

test("v343 hydrates the cached profile without exposing incomplete cloud stores", () => {
  assert.match(bundle, /bdStartupPerformanceVersionV343="v343"/);
  assert.match(bundle, /S\.useState\(\(\)=>bz\(\)\),\[r,a\]=S\.useState\(\(\)=>bz\(\)!==null\)/);
  assert.match(bundle, /function Woe\(\{children:e\}\)\{const\{isReady:t,profile:n\}=Un\(\),\[r,a\]=S\.useState\(!1\),\[s,l\]=S\.useState\(!1\)/);
  assert.match(bundle, /const f=await Xse\(\)/);
  const cloudProvider = bundle.slice(bundle.indexOf("function Woe({children:e})"), bundle.indexOf("function Ai()"));
  assert.doesNotMatch(cloudProvider, /await pM\(PM\)/);
});

test("v343 startup groundwork is superseded by the authoritative v356 gate", () => {
  assert.match(bundle, /function bdHealthStartupGateV155\(\{children:e\}\)\{const\{profile:t,isReady:n\}=Un\(\);bdUseLiveBusinessHealthV335\(n&&!!t\)/);
  assert.doesNotMatch(bundle, /timeoutMs:5200/);
  assert.doesNotMatch(bundle, /data-bd-health-startup-state":"SPLASH_LOADING"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdHealthStartupGateV155"), bundle.indexOf("function cEe(){")), /data-bd-root-splash/);
  assert.match(bundle, /bdCanonicalSnapshot=g/);
  assert.match(bundle, /bdHealthLoading=!g&&bdLiveHealthStatus!=="error"/);
  assert.doesNotMatch(bundle, /bdCanonicalSnapshot=bdHomeCloudReady\?g:null/);
});

test("v343 lets the static startup screen paint before noncritical assets", () => {
  for (const source of [html, responseSource]) {
    assert.match(source, /name="bd-startup-performance" content="v343"/);
    assert.match(source, /rel="modulepreload" href="\/assets\/index-BQGspy0I\.js\?[^\"]*startup-performance-v343/);
    assert.match(source, /canonical-taxonomy-v336\.css[^>]*media="print" onload="this\.media='all'"/);
    assert.match(source, /monthly-report-qa-v165\.js[^>]*defer/);
    assert.match(source, /bardoctor-preview\.js[^>]*defer/);
  }
  assert.match(bootstrap, /startup-performance-v343/);
});
