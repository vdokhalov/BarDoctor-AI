import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runHeaderSystemAudit } from "../scripts/audit-header-system-v185.mjs";

test("all authenticated user routes share one canonical Header and Safe Area system", async () => {
  assert.deepEqual(await runHeaderSystemAudit(), {
    legacyTopLevelHeaderFamilies: 23,
    canonicalHeaderComponents: 1,
    variants: ["root", "module", "detail"],
    standaloneProductRoutesInSpaShell: 10,
  });
});

test("embedded modules bridge real detail history into the canonical Back contract", async () => {
  const [bundle, shell, css] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.css", import.meta.url), "utf8"),
  ]);

  assert.match(bundle, /bdOuterHistoryBound/);
  assert.match(bundle, /v\.pathname==="\/data-control"&&v\.searchParams\.has\("event"\)/);
  assert.match(bundle, /v\.pathname==="\/integrations"&&\(v\.searchParams\.has\("view"\)/);
  assert.match(bundle, /v\.searchParams\.has\("flow"\)&&v\.searchParams\.get\("flow"\)!=="overview"/);
  assert.match(bundle, /typeof window\.bdNavigate==="function"/);
  assert.match(bundle, /window\.history\.back\(\)/);
  assert.match(shell, /embeddedFrame && config\.parent && typeof window\.bdNavigate/);
  assert.match(shell, /window\.bdNavigate\(config\.parent, \{ replace: true \}\)/);
  assert.match(shell, /searchParams\(window\.location\.search\)\.get\("embedded"\) === "1"/i);
  assert.doesNotMatch(shell, /window\.top !== window\.self/);
  assert.match(shell, /window\.addEventListener\("bd:navigation-change", renderForNavigation\)/);
  assert.match(shell, /window\.addEventListener\("popstate", renderForNavigation\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.doesNotMatch(css, /grid-template-columns: auto minmax\(0, 1fr\) auto/);
});

test("cold Home launch paints the BarDoctor splash before the authenticated shell", async () => {
  const [response, appHtml, shell, css, bundle, bootstrap] = await Promise.all([
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.css", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  for (const document of [response, appHtml]) {
    assert.match(document, /document\.documentElement\.setAttribute\("data-bd-startup-pending", "v201"\)/);
    assert.match(document, /data-bd-static-startup="v201"/);
    assert.match(document, /bd-static-startup-brand-v201">Bar<span>Doctor<\/span>/);
    assert.match(document, /Заведение под контролем/);
    assert.match(document, /background: radial-gradient\(circle at 50% 42%/);
    assert.match(document, /bd-static-startup-content-v202/);
    assert.match(document, /font-size: 38px/);
    assert.match(document, /border-radius: 28px/);
    assert.match(document, /bd-static-startup-dots-v202/);
    assert.ok(
      document.indexOf("data-bd-startup-pending") < document.indexOf("bardoctor-preview.js"),
      "the dark first-paint contract must run before application bootstrap",
    );
    assert.doesNotMatch(document, />Главная</);
  }

  assert.match(shell, /function startupPending\(\)/);
  assert.match(shell, /existing\.hidden = true/);
  assert.match(shell, /data-bd-startup-suppressed/);
  assert.match(shell, /window\.addEventListener\("bd:startup-complete", renderForNavigation\)/);
  assert.match(css, /html\[data-bd-startup-pending="v201"\] body > bd-app-header/);
  assert.match(css, /body:has\(\[data-bd-root-splash\]\) > bd-app-header/);
  assert.match(bundle, /bdStartupFirstPaintVersion="startup-v201"/);
  assert.match(bundle, /bdSeamlessStartupVersion="seamless-v202"/);
  assert.match(bundle, /function bdStartupFirstPaintCompleteV201\(\)/);
  assert.match(bundle, /S\.useLayoutEffect\(\(\)=>\{\(!q\|\|B==="HOME"\)&&bdStartupFirstPaintCompleteV201\(\)\}/);
  assert.match(bundle, /new CustomEvent\("bd:startup-complete"/);
  assert.match(bundle, /initial:!1,animate:\{opacity:1,y:0,scale:1\},transition:\{duration:\.65/);
  assert.doesNotMatch(bundle, /initial:\{opacity:0,y:12,scale:\.97\},animate:\{opacity:1,y:0,scale:1\}/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260820-nomenclature-v211/);
});
