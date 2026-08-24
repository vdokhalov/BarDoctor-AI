import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapUrl = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlUrl = new URL("../public/app.html", import.meta.url);
const responseUrl = new URL("../app/bar-doctor-response.ts", import.meta.url);

test("successful login reloads the authenticated venue route without exposing setup", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdAuthCompleteLoginV248");
  const end = bundle.indexOf("async function Rse", start);
  const helper = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(helper, /history\.replaceState/);
  assert.match(helper, /location\.reload/);
  assert.match(helper, /bd_venue_profile_recovery_v249/);
});

test("setup is reserved for authenticated accounts without venues", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /bdExistingVenueGateVersionV249="existing-venue-gate-v249"/);
  assert.match(bundle, /function bdVenueAccessV249/);
  assert.match(bundle, /bd_venue_context__/);
  assert.match(bundle, /function bdVenueConfiguredV251/);
  assert.match(bundle, /function oEe\(\{component:e\}\)\{return Ot\(\)\?bdVenueConfiguredV251\(\)\?/);
  assert.match(bundle, /bdVenueConfiguredV251\(\)\?i\.jsx\(bdVenueProfileRecoveryV249/);
  assert.match(bundle, /Fse\(\)\|\|bdVenueConfiguredV251\(\)\?bdVenueHomeV249\(\):"\/setup"/);
});

test("existing venue recovery is bounded and never offers to create a duplicate venue", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdVenueProfileRecoveryV249");
  const end = bundle.indexOf("const bdEmbeddedPagePaths", start);
  const recovery = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(bundle, /bdVenueProfileRecoveryKeyV249="bd_venue_profile_recovery_v249"/);
  assert.match(recovery, /Аккаунт и заведение найдены/);
  assert.match(recovery, /создавать новое заведение не нужно/);
  assert.match(recovery, /Повторить загрузку/);
  assert.doesNotMatch(recovery, /Создать заведение/);
});

test("venue gate release cache token is wired through every application shell", async () => {
  const sources = await Promise.all([
    readFile(bootstrapUrl, "utf8"),
    readFile(appHtmlUrl, "utf8"),
    readFile(responseUrl, "utf8"),
  ]);
  for (const source of sources) assert.match(source, /20260823-existing-venue-gate-v249/);
});
