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
  assert.match(shell, /typeof embeddedFrame\.contentWindow\.bdHandleEmbeddedBack === "function"/);
  assert.match(shell, /embeddedFrame\.contentWindow\.bdHandleEmbeddedBack\(\)/);
  assert.match(shell, /window\.bdNavigate\(config\.parent, \{ replace: true \}\)/);
  assert.match(shell, /searchParams\(window\.location\.search\)\.get\("embedded"\) === "1"/i);
  assert.doesNotMatch(shell, /window\.top !== window\.self/);
  assert.match(shell, /window\.addEventListener\("bd:navigation-change", renderForNavigation\)/);
  assert.match(shell, /window\.addEventListener\("popstate", renderForNavigation\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.doesNotMatch(css, /grid-template-columns: auto minmax\(0, 1fr\) auto/);
});

test("cold Home launch keeps one splash until authoritative Home is ready", async () => {
  const [response, appHtml, shell, css, bundle, bootstrap] = await Promise.all([
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app-shell-v185.css", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  if (bundle.includes('bdStableSplashVersionV394="v394"')) {
    for (const document of [response, appHtml]) {
      assert.match(document, /data-bd-static-startup="v201"/);
      assert.match(document, /bd-static-startup-v201 bd-unified-splash-v394/);
      assert.match(document, /bd-unified-splash-brand-v394">BarDoctor<\/h1>/);
      assert.match(document, /name="bd-stable-splash" content="v394"/);
      assert.doesNotMatch(document, /Bar<span>|bd-static-startup-dots|bd-static-startup-status/);
      assert.ok(document.indexOf("data-bd-startup-pending") < document.indexOf("bardoctor-preview.js"));
    }
    const coordinator = bundle.slice(
      bundle.indexOf("function bdHealthStartupGateV155"),
      bundle.indexOf("function cEe(){"),
    );
    if (bundle.includes('bdSingleSplashVersionV395="v395"')) {
      assert.match(bundle, /function ble\(\)\{return null\}/);
      assert.doesNotMatch(bundle.slice(bundle.indexOf("function ble(){"), bundle.indexOf("\nconst j7=")), /data-bd-splash/);
      assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdStartupFirstPaintCompleteV201"), bundle.indexOf("function bdHealthStartupGateV155")), /bd-static-startup-leaving-v394|setTimeout\(n,160\)/);
    } else {
      assert.match(bundle, /"data-bd-splash":"stable-v394"/);
      assert.match(bundle, /bd-static-startup-leaving-v394/);
      assert.match(bundle, /window\.setTimeout\(n,160\)/);
    }
    assert.match(coordinator, /shell-ready/);
    if (bundle.includes('bdNativeContinuityVersionV396="v396"')) assert.doesNotMatch(coordinator, /shell-timeout|setTimeout/);
    else assert.match(coordinator, /shell-timeout/);
    assert.doesNotMatch(coordinator, /business-health-v344-loading|authoritative-loading-v344|financeReady|SPLASH_LOADING/);
    assert.match(bootstrap, /(?:stable-splash-v394|single-splash-v395|native-continuity-v396)/);
    assert.match(shell, /window\.addEventListener\("bd:startup-complete", renderForNavigation\)/);
    assert.match(css, /html\[data-bd-startup-pending="v201"\] body > bd-app-header/);
    return;
  }

  for (const document of [response, appHtml]) {
    assert.match(document, /document\.documentElement\.setAttribute\("data-bd-startup-pending", "v201"\)/);
    assert.match(document, /data-bd-static-startup="v201"/);
    assert.match(document, /bd-static-startup-brand-v201">Bar<span>Doctor<\/span>/);
    assert.match(document, /AI-управляющий для вашего заведения/);
    assert.match(document, /background: #070911/);
    assert.match(document, /bd-static-startup-leaving-v356/);
    assert.match(document, /bd-static-startup-content-v202/);
    assert.match(document, /font-size: 38px/);
    assert.match(document, /border-radius: 25px/);
    assert.match(document, /bd-static-startup-dots-v202/);
    assert.ok(
      document.indexOf("data-bd-startup-pending") < document.indexOf("bardoctor-preview.js"),
      "the dark first-paint contract must run before application bootstrap",
    );
    assert.doesNotMatch(document, /data-bd-authenticated-home-shell="v345"/);
    assert.ok(
      document.indexOf('data-bd-static-startup="v201"') < document.indexOf('<div id="root"></div>'),
      "React cannot remove the launch surface before Home is ready",
    );
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
  assert.match(bundle, /function bdHealthStartupGateV155\(\{children:e\}\).*bounded-home-handoff.*return e/s);
  assert.match(bundle, /new CustomEvent\("bd:startup-complete"/);
  assert.match(bundle, /window\.setTimeout\(n,180\)/);
  assert.doesNotMatch(
    bundle.slice(bundle.indexOf("function bdHealthStartupGateV155"), bundle.indexOf("function cEe(){")),
    /5200|server-bootstrap-timeout|children:i\.jsx\(ble|data-bd-root-splash/,
  );
  assert.match(bundle, /"data-bd-splash":"brand-loading-v347"/);
  assert.match(bundle, /initial:\{opacity:0,y:8\},animate:\{opacity:1,y:0\},transition:\{duration:\.42/);
  assert.doesNotMatch(bundle, /initial:\{opacity:0,y:12,scale:\.97\},animate:\{opacity:1,y:0,scale:1\}/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
  assert.match(bootstrap, /startup-performance-v343/);
  for (const document of [response, appHtml]) {
    assert.match(document, /rel="modulepreload" href="\/assets\/index-BQGspy0I\.js\?[^\"]*startup-performance-v343/);
    assert.match(document, /bardoctor-preview\.js[^>]*defer/);
  }
});
