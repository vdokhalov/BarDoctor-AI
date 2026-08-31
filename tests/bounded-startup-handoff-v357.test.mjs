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

test("v357 renders Home behind the one native-aligned launch surface", () => {
  const start = bundle.indexOf("function bdHealthStartupGateV155");
  const end = bundle.indexOf("function cEe(){", start);
  const coordinator = bundle.slice(start, end);
  assert.match(bundle, /bdBoundedStartupHandoffVersionV357="v357"/);
  assert.match(coordinator, /return e/);
  assert.match(coordinator, /data-bd-home-page/);
  assert.match(coordinator, /business-health-v344-loading/);
  assert.match(coordinator, /authoritative-loading-v344/);
  assert.doesNotMatch(coordinator, /financeReady|data-bd-root-splash|SPLASH_LOADING|children:i\.jsx\(ble/);
});

test("v357 has a short bounded handoff and cannot trap the user", () => {
  const start = bundle.indexOf("function bdHealthStartupGateV155");
  const end = bundle.indexOf("function cEe(){", start);
  const coordinator = bundle.slice(start, end);
  assert.match(coordinator, /y>=650&&j&&!v&&f\("home-ready"\)/);
  assert.match(coordinator, /window\.setTimeout\(\(\)=>f\("bounded-home-handoff"\),3500\)/);
  assert.match(coordinator, /window\.setInterval\(m,80\)/);
  assert.doesNotMatch(coordinator, /5200|12e3|15e3|server-bootstrap-timeout/);
});

test("v357 reports a real failure directly without an automatic reload loop", () => {
  const start = bootstrap.indexOf("function bdRecoverStartupV341");
  const end = bootstrap.indexOf('window.addEventListener("bd:startup-complete"', start);
  const recovery = bootstrap.slice(start, end);
  assert.match(bootstrap, /bdStartupRecoveryVersionV341 = "bounded-startup-v357"/);
  assert.match(recovery, /bdRenderStartupRecoveryV341/);
  assert.doesNotMatch(recovery, /window\.location\.replace|bd_startup_retry_v341|sessionStorage\.setItem/);
});

test("v357 cache-busts every startup entrypoint", () => {
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^"\n]*bounded-startup-v357/);
  for (const shell of [html, responseSource]) {
    assert.match(shell, /name="bd-bounded-startup-handoff" content="v357"/);
    assert.match(shell, /index-BQGspy0I\.js\?v=[^"\n]*bounded-startup-v357/);
    assert.match(shell, /bardoctor-preview\.js\?v=[^"\n]*bounded-startup-v357/);
    for (const url of [
      shell.match(/index-BQGspy0I\.js\?v=[^"\n]*/)?.[0],
      shell.match(/bardoctor-preview\.js\?v=[^"\n]*/)?.[0],
    ]) {
      assert.ok(url);
      assert.equal((url.match(/seamless-startup-v356/g) || []).length, 1);
      assert.equal((url.match(/bounded-startup-v357/g) || []).length, 1);
    }
  }
});
