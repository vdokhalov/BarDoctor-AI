import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8"),
  readFile(new URL("public/bardoctor-preview.js", root), "utf8"),
  readFile(new URL("public/app.html", root), "utf8"),
  readFile(new URL("app/bar-doctor-response.ts", root), "utf8"),
]);

const shells = [html, responseSource];
const supersededBySingleSplash = bundle.includes('bdSingleSplashVersionV395="v395"');
const supersededByNativeContinuity = bundle.includes('bdNativeContinuityVersionV396="v396"');

test("v394 uses one immutable splash layout and one text color", () => {
  assert.match(bundle, /bdStableSplashVersionV394="v394"/);
  const splashStart = bundle.indexOf("function ble(){");
  const splashEnd = bundle.indexOf("\nconst j7=", splashStart);
  const splash = bundle.slice(splashStart, splashEnd);
  if (supersededBySingleSplash) assert.match(splash, /return null/);
  else {
    assert.match(splash, /data-bd-splash":"stable-v394"/);
    assert.match(splash, /children:"BarDoctor"/);
  }
  assert.doesNotMatch(splash, /children:"Bar"|children:"Doctor"|initial:|animate:|transition:|W\.div|W\.span/);
  for (const shell of shells) {
    assert.equal(shell.match(/data-bd-static-startup="v201"/g)?.length, 1);
    assert.match(shell, /bd-unified-splash-brand-v394">BarDoctor<\/h1>/);
    assert.match(shell, /color: #fff !important/);
    assert.match(shell, /-webkit-text-fill-color: #fff !important/);
    assert.doesNotMatch(shell, /Bar<span>|bd-static-startup-dots|bd-static-startup-status/);
  }
});

test("v394 makes static and React splash share one fixed container", () => {
  for (const shell of shells) {
    assert.match(shell, /\.bd-unified-splash-v394 \{[\s\S]*position: fixed;[\s\S]*place-items: center;/);
    assert.match(shell, /font-family: -apple-system, BlinkMacSystemFont/);
    assert.match(shell, /font-synthesis: none/);
    assert.match(shell, /bd-static-startup-v201 bd-unified-splash-v394/);
    assert.match(shell, /name="bd-stable-splash" content="v394"/);
  }
  if (supersededBySingleSplash) assert.match(bundle, /function ble\(\)\{return null\}/);
  else {
    assert.match(bundle, /className:"bd-unified-splash-v394"/);
    assert.match(bundle, /className:"bd-unified-splash-content-v394"/);
  }
});

test("v394 removes root delay and business-data startup gate", () => {
  const redirect = bundle.slice(bundle.indexOf("function _le(){"), bundle.indexOf("const Ele=", bundle.indexOf("function _le(){")));
  assert.match(redirect, /useLayoutEffect/);
  assert.doesNotMatch(redirect, /2700|setTimeout|animate:|onAnimationComplete|data-bd-root-splash/);
  const start = bundle.indexOf("function bdHealthStartupGateV155");
  const end = bundle.indexOf("function cEe(){", start);
  const coordinator = bundle.slice(start, end);
  assert.match(coordinator, /shell-ready/);
  if (supersededByNativeContinuity) assert.doesNotMatch(coordinator, /shell-timeout|setTimeout/);
  else {
    assert.match(coordinator, /shell-timeout/);
    assert.match(coordinator, supersededBySingleSplash ? /1500/ : /1800/);
  }
  assert.match(coordinator, /data-bd-home-page/);
  assert.doesNotMatch(coordinator, /business-health-v344-loading|authoritative-loading-v344|financeReady|SPLASH_LOADING/);
  assert.match(bootstrap, supersededByNativeContinuity ? /bdStartupRecoveryVersionV341 = "native-continuity-v396"/ : supersededBySingleSplash ? /bdStartupRecoveryVersionV341 = "single-splash-v395"/ : /bdStartupRecoveryVersionV341 = "stable-splash-v394"/);
});

test("v394 supplies matching launch screens for current iPhone families", async () => {
  const profiles = [
    [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3],
    [414, 896, 2], [414, 896, 3], [390, 844, 3], [428, 926, 3],
    [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
  ];
  for (const [width, height, ratio] of profiles) {
    const name = `bardoctor-launch-${width}x${height}-${ratio}x-v394.png`;
    const info = await stat(new URL(`public/icons/${name}`, root));
    assert.ok(info.size > 20_000, `${name} is unexpectedly empty`);
    for (const shell of shells) {
      assert.match(shell, new RegExp(`apple-touch-startup-image" href="/icons/${name}`));
      assert.match(shell, new RegExp(`background: #070911 url\\("/icons/${name}"\\)`));
    }
  }
});

test("v394 owns the only startup fade", () => {
  for (const shell of shells) {
    if (supersededBySingleSplash) {
      assert.doesNotMatch(shell, /bd-static-startup-leaving-v394|transition: opacity 160ms ease-out/);
      assert.match(shell, /transition: none !important/);
    } else {
      assert.match(shell, /bd-static-startup-leaving-v394/);
      assert.match(shell, /transition: opacity 160ms ease-out/);
    }
    assert.doesNotMatch(shell, /@keyframes bd-static-startup-dot|translateY\(-2px\)/);
  }
  const completion = bundle.slice(bundle.indexOf("function bdStartupFirstPaintCompleteV201"), bundle.indexOf("function bdHealthStartupGateV155"));
  if (supersededBySingleSplash) assert.doesNotMatch(completion, /bd-static-startup-leaving-v394|setTimeout\(n,160\)/);
  else {
    assert.match(completion, /bd-static-startup-leaving-v394/);
    assert.match(completion, /setTimeout\(n,160\)/);
  }
});
