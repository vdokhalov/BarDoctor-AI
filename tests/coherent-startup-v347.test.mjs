import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, bootstrap, html, responseSource] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
]);

test("v347 keeps one branded startup surface until the real route is ready", () => {
  assert.match(bundle, /bdCoherentStartupVersionV347="v347"/);
  assert.match(bundle, /function ble\(\)\{return i\.jsx\("div",\{"data-bd-splash":"brand-loading-v347"/);
  const splash = bundle.slice(bundle.indexOf("function ble(){"), bundle.indexOf("\nconst j7=", bundle.indexOf("function ble(){")));
  assert.doesNotMatch(splash, /bdAuthenticatedHomeBootV345|setTimeout|useState/);
  assert.match(splash, /Bar.*Doctor.*AI-управляющий/s);
});

test("v347 never activates the artificial static Home during bootstrap", () => {
  for (const source of [html, responseSource]) {
    const probe = source.slice(source.indexOf("var bdSessionV345"), source.indexOf("} catch (error)"));
    assert.doesNotMatch(probe, /data-bd-authenticated-startup|setTimeout/);
    assert.match(source, /name="bd-coherent-startup" content="v347"/);
    assert.match(source, /bardoctor-preview\.js\?v=[^"\n]*coherent-startup-v347/);
  }
  assert.match(bootstrap, /20260829-coherent-startup-v347/);
});
