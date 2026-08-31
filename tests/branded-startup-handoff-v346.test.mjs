import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
]);

test("v346 is retained in release history and superseded by coherent startup v347", () => {
  assert.match(bundle, /bdBrandedStartupHandoffVersionV346="v346"/);
  assert.match(bundle, /bdCoherentStartupVersionV347="v347"/);
  assert.match(bundle, /data-bd-splash":"brand-loading-v347"/);
});

test("v347 disables the v346 artificial Home handoff", () => {
  for (const source of [html, responseSource]) {
    const probe = source.slice(source.indexOf("var bdSessionV345"), source.indexOf("} catch (error)"));
    assert.doesNotMatch(probe, /setTimeout|data-bd-authenticated-startup/);
    assert.match(source, /name="bd-branded-startup-handoff" content="v346"/);
    assert.match(source, /bardoctor-preview\.js\?v=[^"\n]*branded-startup-v346/);
  }
  assert.match(bootstrap, /20260829-branded-startup-v346/);
});
