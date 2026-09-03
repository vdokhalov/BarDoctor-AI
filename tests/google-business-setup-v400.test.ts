import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Google Business credentials use the existing owner-only encrypted integration store", async () => {
  const [route, secrets, access] = await Promise.all([
    read("app/api/integrations/route.ts"),
    read("lib/bardoctor/integration-secrets.ts"),
    read("lib/bardoctor/access-control.ts"),
  ]);

  assert.match(route, /google_business: \["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"\]/);
  assert.match(route, /hasPermission\(account, "integrations\.manage"\)/);
  assert.match(route, /Boolean\(clientId\) !== Boolean\(clientSecret\)/);
  assert.match(route, /saveIntegrationValue\(account\.id, "GOOGLE_CLIENT_ID", clientId\)/);
  assert.match(route, /saveIntegrationValue\(account\.id, "GOOGLE_CLIENT_SECRET", clientSecret\)/);
  assert.match(route, /googleCallbackUrl: new URL\("\/api\/reviews\/sources\/google\/callback", request\.url\)\.toString\(\)/);
  assert.doesNotMatch(route, /clientSecret\s*[:,]\s*(clientSecret|current\.GOOGLE_CLIENT_SECRET)/);
  assert.match(secrets, /AES-GCM/);
  assert.match(secrets, /additionalData\(accountId, key\)/);
  assert.match(secrets, /encryptedValue/);
  assert.match(access, /\{ key: "integrations\.manage"[\s\S]*ownerOnly: true \}/);
});

test("Google Business setup UI keeps the secret ephemeral and exposes the backend callback", async () => {
  const [page, client, styles] = await Promise.all([
    read("app/reviews/route.ts"),
    read("public/reviews.js"),
    read("public/reviews.css"),
  ]);

  assert.match(page, /name="clientId" type="text"/);
  assert.match(page, /name="clientSecret" type="password"/);
  assert.doesNotMatch(page, /name="client(?:Id|Secret)"[^>]*required/);
  assert.match(page, /autocomplete="new-password"/);
  assert.match(page, /id="google-callback-url"[^>]*readonly/);
  assert.match(page, /Скопировать callback URL/);
  assert.doesNotMatch(page, /Place ID|name="placeId"/i);
  assert.match(client, /api\("\/api\/integrations", \{ method: "GET" \}\)/);
  assert.match(client, /service: "google_business", clientId: clientId, clientSecret: clientSecret/);
  assert.match(client, /googleForm\.reset\(\)/);
  assert.match(client, /state\.googleSettings = result\.data/);
  assert.match(client, /if \(!clientId\) return setGoogleSettingsError\("Введите Google Client ID\."\)/);
  assert.match(client, /if \(!clientSecret\) return setGoogleSettingsError\("Введите Google Client Secret\."\)/);
  assert.doesNotMatch(client, /(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:clientSecret|GOOGLE_CLIENT_SECRET)/);
  assert.doesNotMatch(client, /searchParams\.set\([^\n]*(?:clientSecret|GOOGLE_CLIENT_SECRET)/);
  assert.doesNotMatch(client, /console\.(?:log|info|debug|warn|error)\([^\n]*(?:clientSecret|GOOGLE_CLIENT_SECRET)/);
  assert.match(styles, /\.google-business-dialog \{ width: calc\(100vw - 18px\); max-height: calc\(100dvh - 18px\)/);
  assert.match(styles, /\.google-callback-field \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /@media \(max-width: 390px\)[\s\S]*\.google-secret-field \{ grid-template-columns: 1fr; \}/);
});

test("Google Business flow implements all connection states and first review sync", async () => {
  const [client, sources, google] = await Promise.all([
    read("public/reviews.js"),
    read("lib/bardoctor/review-sources.ts"),
    read("lib/bardoctor/google.ts"),
  ]);

  for (const state of ["NOT CONFIGURED", "READY TO CONNECT", "CONNECTING", "PENDING LOCATION", "CONNECTED", "SYNC ERROR"]) {
    assert.match(client, new RegExp(state.replace(" ", "\\s")));
  }
  assert.doesNotMatch(client, /label: "Недоступно"/);
  assert.match(client, /\/api\/reviews\/sources\/google\/connect/);
  assert.match(client, /\/api\/reviews\/sources\/google\/select-location/);
  assert.match(sources, /if \(locations\.length === 1\)/);
  assert.match(sources, /status: "pending_location"/);
  assert.match(sources, /const firstSync = await syncGoogleReviews\(oauthState\.accountId\)/);
  assert.match(sources, /const firstSync = await syncGoogleReviews\(account\.id\)/);
  assert.match(sources, /hasPermission\(account, "reviews\.manage"\)/);
  assert.match(google, /status === 401/);
  assert.match(google, /status === 403/);
  assert.match(google, /status === 429/);
  assert.match(google, /status >= 500/);
  assert.match(google, /TimeoutError/);
});

test("Google OAuth authorization always replaces the top-level browser context", async () => {
  const [page, client] = await Promise.all([
    read("app/reviews/route.ts"),
    read("public/reviews.js"),
  ]);

  const helper = client.match(/function navigateGoogleOAuth\(url\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(helper, "top-level Google OAuth navigation helper must exist");
  const makeNavigator = new Function("window", `${helper}; return navigateGoogleOAuth;`) as (
    window: { top: { location: { assign: (url: string) => void } } },
  ) => (url: URL) => void;
  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth?state=csrf-state");
  const embeddedAssignments: string[] = [];
  const frameAssignments: string[] = [];
  const embeddedWindow = {
    top: { location: { assign: (url: string) => embeddedAssignments.push(url) } },
    location: { assign: (url: string) => frameAssignments.push(url) },
  };
  makeNavigator(embeddedWindow)(oauthUrl);
  assert.deepEqual(embeddedAssignments, [oauthUrl.href]);
  assert.deepEqual(frameAssignments, []);

  const pwaAssignments: string[] = [];
  const pwaWindow: {
    top?: { location: { assign: (url: string) => void } };
    location: { assign: (url: string) => void };
  } = { location: { assign: (url: string) => { pwaAssignments.push(url); } } };
  pwaWindow.top = pwaWindow;
  makeNavigator(pwaWindow as { top: { location: { assign: (url: string) => void } } })(oauthUrl);
  assert.deepEqual(pwaAssignments, [oauthUrl.href]);

  assert.match(client, /navigateGoogleOAuth\(url\)/);
  assert.doesNotMatch(client, /(?:createElement\(["']iframe["']\)|<iframe)[^\n]*(?:google|oauth|url\.href)/i);
  assert.match(page, /reviews\.js\?v=20260903-google-oauth-source-errors-v406/);
});

test("account Google OAuth credentials override any environment fallback", async () => {
  const [secrets, google] = await Promise.all([
    read("lib/bardoctor/integration-secrets.ts"),
    read("lib/bardoctor/google.ts"),
  ]);
  const getter = secrets.match(/export async function getIntegrationValue\([\s\S]*?\n\}/)?.[0];
  const status = secrets.match(/export async function integrationStatus\([\s\S]*?\n\}/)?.[0];
  assert.ok(getter);
  assert.ok(status);
  assert.ok(getter.indexOf("if (row) return decryptValue") < getter.indexOf("return runtimeEnv(key)"));
  assert.match(
    status,
    /: stored\.has\(key\)\s+\? "secure_store"\s+: runtimeEnv\(key\)\s+\? "environment"/,
  );
  assert.match(google, /getIntegrationValue\(accountId, "GOOGLE_CLIENT_ID"\)/);
  assert.match(google, /const \{ clientId \} = await credentials\(accountId\)/);
  assert.match(google, /client_id: clientId/);
});

test("Google OAuth errors retain safe exact codes without raw response details", async () => {
  const {
    GoogleOAuthExchangeError,
    googleOAuthErrorCode,
    googleOAuthExchangeError,
    normalizeGoogleOAuthError,
  } = await import("../lib/bardoctor/google-oauth-error");

  assert.equal(normalizeGoogleOAuthError("invalid_client"), "invalid_client");
  assert.equal(normalizeGoogleOAuthError("invalid_request", "Bad redirect_uri"), "redirect_uri_mismatch");
  assert.equal(normalizeGoogleOAuthError("access_denied"), "access_denied");
  assert.equal(normalizeGoogleOAuthError("invalid_grant"), "invalid_grant");
  assert.equal(normalizeGoogleOAuthError("unexpected_google_detail"), "exchange_failed");

  const parsed = await googleOAuthExchangeError(new Response(JSON.stringify({
    error: "invalid_grant",
    error_description: "authorization code contains sensitive diagnostic detail",
  }), { status: 400, headers: { "Content-Type": "application/json" } }));
  assert.equal(parsed.code, "invalid_grant");
  assert.equal(parsed.status, 400);
  assert.doesNotMatch(parsed.message, /sensitive diagnostic detail/);
  assert.equal(googleOAuthErrorCode(parsed), "invalid_grant");
  assert.equal(googleOAuthErrorCode(new Error("raw failure")), "exchange_failed");
  assert.ok(parsed instanceof GoogleOAuthExchangeError);
});

test("Google callback validates state and records only normalized OAuth failure codes", async () => {
  const [sources, client] = await Promise.all([
    read("lib/bardoctor/review-sources.ts"),
    read("public/reviews.js"),
  ]);
  const callback = sources.match(/if \(action === "callback"\) \{[\s\S]*?\n  \}\n\n  if \(action !== "connect"\)/)?.[0];
  assert.ok(callback);
  assert.ok(callback.indexOf("consumeGoogleState(state)") < callback.indexOf("if (googleError)"));
  assert.match(callback, /normalizeGoogleOAuthError/);
  assert.match(callback, /recordGoogleOAuthFailure\(oauthState\.accountId, reason\)/);
  assert.doesNotMatch(callback, /encodeURIComponent\(googleError\)/);
  for (const code of ["invalid_client", "redirect_uri_mismatch", "access_denied", "invalid_grant", "exchange_failed"]) {
    assert.match(client, new RegExp(`${code}:`));
  }
});

test("Google Business patch depends only on tables already present in the v400 migration ledger", async () => {
  const [schema, googleMigration, secretMigration, journal] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0001_ambitious_klaw.sql"),
    read("drizzle/0002_tan_wendell_rand.sql"),
    read("drizzle/meta/_journal.json"),
  ]);

  for (const table of ["google_connections", "oauth_states", "review_source_events", "integration_secrets"]) {
    assert.match(schema, new RegExp(`"${table}"`));
  }
  assert.match(googleMigration, /CREATE TABLE `google_connections`/);
  assert.match(googleMigration, /CREATE TABLE `oauth_states`/);
  assert.match(googleMigration, /CREATE TABLE `review_source_events`/);
  assert.match(secretMigration, /CREATE TABLE `integration_secrets`/);
  const ledger = JSON.parse(journal) as { entries: Array<{ idx: number }> };
  assert.equal(ledger.entries.at(-1)?.idx, 20);
});
