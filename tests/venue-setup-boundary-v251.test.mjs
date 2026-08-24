import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const authUrl = new URL("../lib/bardoctor/auth.ts", import.meta.url);
const bootstrapUrl = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlUrl = new URL("../public/app.html", import.meta.url);
const responseUrl = new URL("../app/bar-doctor-response.ts", import.meta.url);

test("auth context distinguishes a placeholder venue from a configured venue", async () => {
  const auth = await readFile(authUrl, "utf8");
  assert.match(auth, /hasProfile: Boolean\(item\.dataAccount\.restaurantJson\)/);
});

test("setup is shown only when the authoritative bootstrap requires onboarding", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /bdVenueSetupBoundaryVersionV251="venue-setup-boundary-v251"/);
  assert.match(bundle, /hasProfile:r\.hasProfile!==!1/);
  assert.match(bundle, /function bdVenueConfiguredV251\(\)\{return bdVenueAccessV249\(\)\?\.hasProfile===!0\}/);
  assert.match(bundle, /bdAuthBootstrapV274/);
  assert.match(bundle, /t\.state==="onboarding_required"\?i\.jsx\(e,\{\}\)/);
  assert.doesNotMatch(bundle, /bdVenueConfiguredV251\(\)\?i\.jsx\(bdVenueProfileRecoveryV249/);
});

test("venue setup boundary release token is wired through every application shell", async () => {
  const sources = await Promise.all([
    readFile(bootstrapUrl, "utf8"),
    readFile(appHtmlUrl, "utf8"),
    readFile(responseUrl, "utf8"),
  ]);
  for (const source of sources) {
    assert.match(source, /20260824-auth-bootstrap-state-v274/);
  }
});
