import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapUrl = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlUrl = new URL("../public/app.html", import.meta.url);
const responseUrl = new URL("../app/bar-doctor-response.ts", import.meta.url);

test("login has a bounded request and always releases its loading state", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /bdAuthLoginVersionV248="auth-login-v248"/);
  assert.match(bundle, /new AbortController/);
  assert.match(bundle, /setTimeout\(\(\)=>n\.abort\(\),15e3\)/);
  assert.match(bundle, /credentials:"include",cache:"no-store"/);
  assert.match(bundle, /finally\{clearTimeout\(r\)\}/);

  const loginStart = bundle.indexOf("function kle()");
  const loginEnd = bundle.indexOf("function Gd(", loginStart);
  const login = bundle.slice(loginStart, loginEnd);
  assert.match(login, /finally\{d\(!1\)\}/);
  assert.match(login, /bdAuthCompleteLoginV248\(\)/);
  assert.doesNotMatch(login, /window\.location\.replace/);
});

test("successful login preserves venue and starts a fresh authenticated home load", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /function bdAuthHomeTargetV248/);
  assert.match(bundle, /"\/home\?venue="\+encodeURIComponent\(e\)/);
  assert.match(bundle, /window\.history\.replaceState\(window\.history\.state,"",e\)/);
  assert.match(bundle, /window\.location\.reload\(\)/);
});

test("auth responses are consumed once and the release cache token is wired everywhere", async () => {
  const [bootstrap, appHtml, response] = await Promise.all([
    readFile(bootstrapUrl, "utf8"),
    readFile(appHtmlUrl, "utf8"),
    readFile(responseUrl, "utf8"),
  ]);
  assert.match(bootstrap, /bd-auth-single-read-v248/);
  const authInterceptorStart = bootstrap.indexOf("bd-auth-single-read-v248");
  const authInterceptorEnd = bootstrap.indexOf('if (["POST", "PUT", "PATCH", "DELETE"]', authInterceptorStart);
  const authInterceptor = bootstrap.slice(authInterceptorStart, authInterceptorEnd);
  assert.ok(authInterceptorStart >= 0 && authInterceptorEnd > authInterceptorStart);
  assert.doesNotMatch(authInterceptor, /response\.clone\(\)\.json\(\)/);
  assert.match(authInterceptor, /return response\.text\(\)\.then/);
  assert.match(authInterceptor, /return new Response\(body/);
  for (const source of [bootstrap, appHtml, response]) {
    assert.match(source, /20260823-auth-login-v248/);
  }
});
