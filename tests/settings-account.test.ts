import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personal export is identity-scoped and excludes operational venue data", async () => {
  const route = await read("app/api/users/export/route.ts");
  assert.match(route, /authenticateIdentityRequest\(request\)/);
  assert.match(route, /membershipsForAccount\(account\)/);
  assert.match(route, /Content-Disposition/);
  assert.doesNotMatch(route, /authenticateRequest|x-venue-id|domainData|auditLog/);
});

test("session management keeps the current session and never returns token hashes", async () => {
  const [route, auth] = await Promise.all([
    read("app/api/users/sessions/route.ts"),
    read("lib/bardoctor/auth.ts"),
  ]);
  assert.match(route, /authenticateIdentityRequest\(request\)/);
  assert.doesNotMatch(route, /tokenHash/);
  assert.match(auth, /current: row\.tokenHash === currentTokenHash/);
  assert.match(auth, /ne\(sessions\.tokenHash, currentTokenHash\)/);
  assert.match(auth, /gt\(sessions\.expiresAt, new Date\(\)\.toISOString\(\)\)/);
});
