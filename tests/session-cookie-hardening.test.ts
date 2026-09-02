import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all BarDoctor sessions are cookie-only with absolute and inactivity expiry", async () => {
  const auth = await read("lib/bardoctor/auth.ts");
  assert.doesNotMatch(auth, /exposeLegacyToken/);
  assert.doesNotMatch(auth, /request\.headers\.get\("x-session-token"\)/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.match(auth, /Secure/);
  assert.match(auth, /gt\(sessions\.expiresAt, now\)/);
  assert.match(auth, /SESSION_INACTIVITY_MS/);
  assert.match(auth, /coalesce\(\$\{sessions\.lastSeenAt\}, \$\{sessions\.createdAt\}\)/);
});

test("every current first-party client removes or ignores the legacy bearer", async () => {
  const paths = [
    "public/bardoctor-preview-v401.js",
    "public/assets/index-BQGspy0I.js",
    "public/notifications.js",
    "public/team-access.js",
    "public/venue-create.js",
    "public/market.js",
    "public/sales-import.js",
    "public/venue-switcher.js",
    "public/integrations.js",
    "public/reviews.js",
    "public/opportunities.js",
    "public/supplier-alternatives.js",
    "public/data-control.js",
    "public/admin-v175.js",
    "public/admin-session-bridge-v176.js",
  ];
  const sources = await Promise.all(paths.map(read));
  for (let index = 0; index < sources.length; index += 1) {
    assert.doesNotMatch(sources[index], /X-Session-(?:Email|Token)/, paths[index]);
    assert.doesNotMatch(sources[index], /localStorage\.(?:getItem|setItem)\("bd_session_token"/, paths[index]);
  }
  assert.match(sources[0], /X-BarDoctor-Auth-Mode", "cookie-v1/);
  assert.match(sources[1], /bd-cookie-session-v403/);
});

test("legacy D1 bearer exchange is retired while legacy account import remains isolated", async () => {
  const [route, bootstrap, legacyImport] = await Promise.all([
    read("app/api/auth/server-session/route.ts"),
    read("app/api/auth/bootstrap/route.ts"),
    read("lib/bardoctor/legacy-import.ts"),
  ]);
  assert.match(route, /LEGACY_SESSION_EXCHANGE_REMOVED/);
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /sessionResponse|synchronizeServerSession/);
  assert.match(bootstrap, /importLegacyAccount/);
  assert.match(legacyImport, /LEGACY_REPLIT_ORIGIN/);
  assert.match(legacyImport, /function legacyAuthHeaders/);
});

test("platform-admin cookie sessions require recent authentication", async () => {
  const admin = await read("lib/bardoctor/platform-admin.ts");
  assert.match(admin, /PLATFORM_ADMIN_SESSION_MAX_AGE_MS = 8 \* 60 \* 60 \* 1000/);
  assert.match(admin, /authenticateIdentitySessionDetails/);
  assert.match(admin, /sessionIsRecent/);
});

test("logout clears the HttpOnly cookie and revokes the exact server session", async () => {
  const [auth, logout] = await Promise.all([
    read("lib/bardoctor/auth.ts"),
    read("app/api/auth/logout/route.ts"),
  ]);
  assert.match(logout, /revokeAuthenticatedSession\(request, account\.id\)/);
  assert.match(logout, /clearSessionCookie\(request\)/);
  assert.match(auth, /delete\(sessions\)/);
  assert.match(auth, /Max-Age=\$\{Math\.floor\(maxAge\)\}/);
});
