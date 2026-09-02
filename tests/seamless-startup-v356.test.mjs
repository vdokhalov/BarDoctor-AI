import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8"),
  readFile(new URL("public/bardoctor-preview.js", root), "utf8"),
  readFile(new URL("public/app.html", root), "utf8"),
  readFile(new URL("app/bar-doctor-response.ts", root), "utf8"),
]);

test("v356 keeps one immutable launch surface outside React", () => {
  for (const shell of [html, responseSource]) {
    const overlay = shell.indexOf('data-bd-static-startup="v201"');
    const rootNode = shell.indexOf('<div id="root"></div>');
    assert.ok(overlay >= 0 && rootNode > overlay);
    assert.equal(shell.match(/data-bd-static-startup="v201"/g)?.length, 1);
    assert.match(shell, /bd-(?:seamless-startup-v356|stable-splash-v394)/);
    assert.match(shell, /background: #070911/);
    assert.doesNotMatch(shell, /background: radial-gradient\(circle at 50% 42%/);
    assert.doesNotMatch(shell, /bd-static-auth-home-v345/);
  }
});

test("v356 exactly bridges the iPhone launch image into the web splash", () => {
  for (const shell of [html, responseSource]) {
    assert.match(shell, /rel="apple-touch-startup-image" href="\/icons\/bardoctor-launch-390x844-(?:3x-v394|v348)\.png"/);
    assert.match(shell, /background: #070911 url\("\/icons\/bardoctor-launch-390x844-(?:3x-v394|v348)\.png"\) center \/ 100% 100% no-repeat/);
    assert.match(shell, /device-width: 390px[\s\S]*device-height: 844px[\s\S]*-webkit-device-pixel-ratio: 3/);
  }
});

test("v356 owns the immutable visual surface while v357 owns the bounded handoff", () => {
  const completionStart = bundle.indexOf("function bdStartupFirstPaintCompleteV201");
  const start = bundle.indexOf("function bdHealthStartupGateV155", completionStart);
  const end = bundle.indexOf("function cEe(){", start);
  const startup = bundle.slice(completionStart, end);
  const coordinator = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(bundle, /bdSeamlessStartupVersionV356="v356"/);
  assert.match(bundle, /bdBoundedStartupHandoffVersionV357="v357"/);
  assert.match(coordinator, /return e/);
  assert.doesNotMatch(coordinator, /financeReady|data-bd-root-splash|SPLASH_LOADING/);
  if (bundle.includes('bdNativeContinuityVersionV396="v396"')) {
    assert.doesNotMatch(startup, /bd-static-startup-leaving|window\.setTimeout/);
    assert.match(startup, /window\.__bdSplashReleasedV396/);
  } else if (bundle.includes('bdSingleSplashVersionV395="v395"')) {
    assert.doesNotMatch(startup, /bd-static-startup-leaving-v(?:356|394)|window\.setTimeout\(n,(?:180|160)\)/);
    assert.match(startup, /window\.__bdSplashReleasedV395/);
  } else {
    assert.match(startup, /bd-static-startup-leaving-v(?:356|394)/);
    assert.match(startup, /window\.setTimeout\(n,(?:180|160)\)/);
  }
  assert.doesNotMatch(coordinator, /5200|server-bootstrap-timeout|children:i\.jsx\(ble/);
});

test("v356 removes the second splash and white Home recovery stage", () => {
  const start = bundle.indexOf("function Dce(){");
  const end = bundle.indexOf("const q7=", start);
  const home = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(home, /bdHomeStartupTimedOutV349|single-ready-home-v349|children:i\.jsx\(ble/);
  assert.doesNotMatch(bundle, /function bdHomeStartupRecoveryV349/);
  assert.match(bootstrap, /bdStartupRecoveryVersionV341 = "(?:bounded-startup-v357|stable-splash-v394|single-splash-v395|native-continuity-v396)"/);
  assert.match(bootstrap, /background:#070911;color:#fff/);
});

test("v356 cache-busts the full startup chain", () => {
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^"\n]*seamless-startup-v356/);
  for (const shell of [html, responseSource]) {
    assert.match(shell, /name="bd-seamless-startup" content="v356"/);
    assert.match(shell, /index-BQGspy0I\.js\?v=[^"\n]*seamless-startup-v356/);
    assert.match(shell, /bardoctor-preview\.js\?v=[^"\n]*seamless-startup-v356/);
  }
});
