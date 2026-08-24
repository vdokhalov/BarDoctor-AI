import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("browser bootstrap preserves loading, error and server-authoritative states", async () => {
  const source = await read("public/bardoctor-preview.js");
  assert.match(source, /__bdAuthBootstrapV274 = \{ state: "loading"/);
  assert.match(source, /result\.bootstrap && typeof result\.bootstrap\.state === "string"/);
  assert.match(source, /state: "error", reason: "bootstrap_request_failed"/);
  assert.match(source, /state: "error", reason: "bootstrap_response_failed"/);
  assert.match(source, /state: "unauthenticated", reason: "login_required"/);
});

test("route guards never interpret bootstrap error or recovery as onboarding", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf('const bdAuthBootstrapStateVersionV274');
  const end = bundle.indexOf('const bdEmbeddedPagePaths', start);
  const contract = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(contract, /state==="ready"\?bdVenueHomeV249\(\):e\.state==="onboarding_required"\?"\/setup":null/);
  assert.match(contract, /state!=="ready"/);
  assert.match(contract, /confirmed_owner_venue_inactive/);
  assert.match(contract, /Новое заведение создавать не нужно/);
  assert.doesNotMatch(contract, /state==="error"[^;]+"\/setup"/);
});

test("restaurant bootstrap does not auto-save a cached profile after a failed GET", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function Vse({children:e})");
  const end = bundle.indexOf("function Un()", start);
  const provider = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(provider, /qse\(\)/);
  assert.doesNotMatch(provider, /uM\(h\)/);
  assert.match(provider, /zse\(\)\.then/);
});

test("successful first profile save promotes bootstrap to ready without creating another venue", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf('const bdProfileBootstrapReadyV274');
  const end = bundle.indexOf("function qse()", start);
  const save = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(save, /state:"ready",reason:"active_venue_ready"/);
  assert.match(save, /hasProfile:!0/);
  assert.match(save, /fetch\(`\$\{vz\}\/`/);
  assert.doesNotMatch(save, /api\/venues/);
});

test("v274 cache key is wired through all shells", async () => {
  const sources = await Promise.all([
    read("public/bardoctor-preview.js"),
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
  ]);
  for (const source of sources) assert.match(source, /20260824-auth-bootstrap-state-v274/);
});
