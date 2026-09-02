import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new clients receive cookie-only auth while cached clients retain a bounded compatibility path", async () => {
  const auth = await read("lib/bardoctor/auth.ts");
  assert.match(auth, /x-bardoctor-auth-mode/);
  assert.match(auth, /exposeLegacyToken \? \{ token \} : \{\}/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.match(auth, /Secure/);
  assert.match(auth, /gt\(sessions\.expiresAt, now\)/);
});

test("the current primary client never reads, writes or transmits a bearer session", async () => {
  const paths = [
    "public/bardoctor-preview-v401.js",
    "public/assets/index-BQGspy0I.js",
    "public/notifications.js",
    "public/team-access.js",
    "public/venue-create.js",
    "public/market.js",
    "public/sales-import.js",
    "public/venue-switcher.js",
  ];
  const sources = await Promise.all(paths.map(read));
  for (let index = 0; index < sources.length; index += 1) {
    assert.doesNotMatch(sources[index], /X-Session-(?:Email|Token)/, paths[index]);
    assert.doesNotMatch(sources[index], /localStorage\.(?:getItem|setItem)\("bd_session_token"/, paths[index]);
  }
  assert.match(sources[0], /X-BarDoctor-Auth-Mode", "cookie-v1/);
  assert.match(sources[1], /bd-cookie-session-v403/);
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
