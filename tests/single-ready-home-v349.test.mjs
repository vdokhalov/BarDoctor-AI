import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("v349 warms critical Home reads before React routing completes", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  assert.match(bundle, /bdSingleReadyHomeVersionV349="v349"/);
  assert.match(bundle, /function bdWarmCriticalHomeV349\(\)/);
  assert.match(bundle, /__bdStartupBusinessHealthWarmV349=bdFetchBusinessHealthV377\(e\)/);
  assert.match(bundle, /fetch\("\/api\/business-health",\{headers:ca\(session\),cache:"no-store",signal:controller\.signal\}/);
  assert.match(bundle, /__bdStartupFinanceWarmV349=Promise\.all\(\["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"\]/);
});

test("v349 data warmup is retained while v356 owns the only visible launch surface", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  assert.match(bundle, /financeReady:bdHomeFinanceReady/);
  assert.doesNotMatch(bundle, /data-bd-root-splash":"single-ready-home-v349/);
  assert.doesNotMatch(bundle, /if\(!g\|\|!bdHomeFinanceReady\)return/);
  assert.match(bundle, /i\.jsx\(bdHomeDaily,\{cloudReady:!0/);
  assert.doesNotMatch(bundle, /data-bd-home-startup-recovery":"v349/);
  assert.match(bundle, /bdBoundedStartupHandoffVersionV357="v357"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdHealthStartupGateV155"), bundle.indexOf("function cEe(){")), /data-bd-root-splash/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function Woe({children:e})"), bundle.indexOf("\nfunction Ai()")), /await pM\(PM\)/);
});

test("v349 cache-busts the production application bundle", async () => {
  for (const file of ["public/app.html", "app/bar-doctor-response.ts"]) {
    const html = await readFile(new URL(file, root), "utf8");
    assert.match(html, /name="bd-single-ready-home" content="v349"/);
    assert.match(html, /index-BQGspy0I\.js\?v=[^"\n]*single-ready-home-v349/);
  }
});
