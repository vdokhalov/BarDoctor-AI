import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, html, responseSource, css] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/health-score-experience-v152.css", import.meta.url), "utf8"),
]);

test("v344 starts canonical Business Health before full store reconciliation", () => {
  assert.match(bundle, /bdAuthoritativeHomeStartupVersionV344="v344"/);
  assert.match(bundle, /bdUseLiveBusinessHealthV335\(n&&!!t\)/);
  assert.match(bundle, /bdLiveHealthStatus=bdUseLiveBusinessHealthV335\(!!e\)/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdHealthStartupGateV155"), bundle.indexOf("function cEe(){")), /financeReady/);
});

test("v344 replaces the oversized Health skeleton with a compact live status", () => {
  assert.match(bundle, /business-health-v344-loading/);
  assert.match(bundle, /Загружаем актуальное состояние/);
  assert.doesNotMatch(bundle, /className:"bd-health-skeleton-v332 score"/);
  assert.match(css, /authoritative-home-startup-v344/);
  assert.match(css, /is-compact-loading-v344 \{ min-height: 0/);
});

test("v344 never exposes cached Finance totals before authoritative sync", () => {
  assert.match(bundle, /cloudReady:bdHomeCloudReady/);
  assert.match(bundle, /data-bd-home-money":"authoritative-loading-v344/);
  assert.match(bundle, /Старые локальные суммы не показываются/);
  assert.match(bundle, /bdHomeCloudReady\?i\.jsx\(bdHomeMoneyCard/);
});

test("v344 is cache-busted through production shells", () => {
  assert.match(bootstrap, /20260829-authoritative-home-v344/);
  for (const source of [html, responseSource]) {
    assert.match(source, /name="bd-authoritative-home" content="v344"/);
    assert.match(source, /bardoctor-preview\.js\?v=[^"\n]*authoritative-home-v344/);
    assert.match(source, /health-score-experience-v152\.css\?v=[^"\n]*authoritative-home-v344/);
  }
});
