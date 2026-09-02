import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
]);

test("v345 fallback component remains safe but is superseded by coherent startup v347", () => {
  assert.match(bundle, /bdAuthenticatedHomeShellVersionV345="v345"/);
  assert.match(bundle, /function bdAuthenticatedHomeBootV345/);
  assert.match(bundle, /data-bd-authenticated-home-shell":"v345"/);
  assert.match(bundle, /Загружаем актуальное состояние/);
  assert.match(bundle, /Сверяем данные с сервером/);
});

test("v345 keeps the public brand splash and does not invent financial values", () => {
  if (bundle.includes('bdSingleSplashVersionV395="v395"')) assert.match(bundle, /function ble\(\)\{return null\}/);
  else assert.match(bundle, /data-bd-splash":"(?:brand-loading-v347|stable-v394)"/);
  const component = bundle.slice(bundle.indexOf("function bdAuthenticatedHomeBootV345"), bundle.indexOf("function ble(){", bundle.indexOf("function bdAuthenticatedHomeBootV345")));
  assert.doesNotMatch(component, /43 500|3 101|82 166/);
});

test("v345 markup is removed by the seamless v356 handoff while history stays cache-busted", () => {
  for (const source of [html, responseSource]) {
    assert.doesNotMatch(source.slice(source.indexOf("var bdSessionV345"), source.indexOf("} catch (error)")), /data-bd-authenticated-startup/);
    assert.doesNotMatch(source, /data-bd-authenticated-home-shell="v345"/);
    assert.match(source, /name="bd-authenticated-home-shell" content="v345"/);
    assert.match(source, /(?:bardoctor-preview\.js\?v=[^"\n]*authenticated-home-v345|bardoctor-preview-v396\.js)/);
    assert.match(source, /name="bd-seamless-startup" content="v356"/);
  }
  assert.match(bootstrap, /20260829-authenticated-home-v345/);
});
