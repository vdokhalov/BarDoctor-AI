import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

async function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  const migrationRoot = new URL("../drizzle/", import.meta.url);
  const migrations = (await readdir(migrationRoot))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(new URL(migration, migrationRoot), "utf8");
    database.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("a synthetic principal cannot resolve or read a foreign venue namespace", async () => {
  const database = await migratedDatabase();
  const insertAccount = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name, account_kind)
    VALUES (?, ?, ?, ?) RETURNING id
  `);
  const principalA = insertAccount.get("a@step13.test", "a@step13.test", "A", "user");
  const principalB = insertAccount.get("b@step13.test", "b@step13.test", "B", "user");
  const workspaceA = database.prepare(
    "INSERT INTO workspaces (name, created_by_account_id) VALUES ('A', ?) RETURNING id",
  ).get(principalA.id);
  const workspaceB = database.prepare(
    "INSERT INTO workspaces (name, created_by_account_id) VALUES ('B', ?) RETURNING id",
  ).get(principalB.id);
  const venueA = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id)
    VALUES (?, ?, ?) RETURNING id
  `).get(workspaceA.id, principalA.id, principalA.id);
  const venueB = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id)
    VALUES (?, ?, ?) RETURNING id
  `).get(workspaceB.id, principalB.id, principalB.id);
  database.prepare(
    "INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'owner')",
  ).run(venueA.id, principalA.id);
  database.prepare(
    "INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'owner')",
  ).run(venueB.id, principalB.id);
  database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json) VALUES (?, ?, ?)
  `).run(principalA.id, "bd_assortment_v1", JSON.stringify({ marker: "venue-a" }));
  database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json) VALUES (?, ?, ?)
  `).run(principalB.id, "bd_assortment_v1", JSON.stringify({ marker: "venue-b" }));

  const resolveVenue = database.prepare(`
    SELECT v.data_account_id AS dataAccountId
    FROM venues v
    JOIN venue_memberships vm ON vm.venue_id = v.id
    WHERE v.id = ? AND vm.account_id = ? AND vm.status = 'active' AND v.status = 'active'
  `);
  assert.equal(resolveVenue.get(venueB.id, principalA.id), undefined);
  const resolvedA = resolveVenue.get(venueA.id, principalA.id);
  const visible = database.prepare(`
    SELECT data_json AS dataJson FROM domain_data
    WHERE account_id = ? AND store_key = 'bd_assortment_v1'
  `).get(resolvedA.dataAccountId);
  assert.deepEqual(JSON.parse(visible.dataJson), { marker: "venue-a" });
  assert.doesNotMatch(visible.dataJson, /venue-b/);
  database.close();
});

test("server authorization keeps venue roles separate from platform admin", async () => {
  const [auth, memberRoute, platformAdmin] = await Promise.all([
    source("lib/bardoctor/auth.ts"),
    source("app/api/access/members/[id]/route.ts"),
    source("lib/bardoctor/platform-admin.ts"),
  ]);
  assert.match(auth, /eq\(venueMemberships\.accountId, account\.id\)/);
  assert.match(auth, /requestedHeader\s*!=\s*null/);
  assert.match(memberRoute, /eq\(venueMemberships\.venueId, actor\.venueId\)/);
  assert.match(memberRoute, /nextRole === "owner"/);
  assert.match(platformAdmin, /PLATFORM_ADMIN_PERMISSION = "platform\.admin"/);
  assert.match(platformAdmin, /eq\(platformAdmins\.status, "active"\)/);
});

test("session revocation and password reset invalidate server-side session rows", async () => {
  const [auth, logout, reset] = await Promise.all([
    source("lib/bardoctor/auth.ts"),
    source("app/api/auth/logout/route.ts"),
    source("app/api/auth/reset-password/route.ts"),
  ]);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Strict/);
  assert.match(auth, /eq\(sessions\.tokenHash, tokenHash\)/);
  assert.match(logout, /revokeAuthenticatedSession\(request, account\.id\)/);
  assert.match(reset, /await db\.batch\(\[/);
  assert.match(reset, /db\.delete\(sessions\)\.where\(eq\(sessions\.accountId, account\.id\)\)/);
});

test("first-party TypeScript has no direct dynamic HTML or code-evaluation sink", async () => {
  const roots = [new URL("../app/", import.meta.url), new URL("../lib/", import.meta.url)];
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) await walk(url);
      else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(url);
    }
  }
  for (const directory of roots) await walk(directory);
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /dangerouslySetInnerHTML|\beval\s*\(|new Function\s*\(/, file.pathname);
  }
});

test("representative uploads are authenticated, bounded and account-scoped", async () => {
  const [purchaseScan, integrationImport, avatar, venueLogo] = await Promise.all([
    source("app/api/purchases/scan/route.ts"),
    source("app/api/integration-hub/import/route.ts"),
    source("app/api/users/avatar/route.ts"),
    source("app/api/venues/logo/route.ts"),
  ]);
  for (const route of [purchaseScan, integrationImport, avatar, venueLogo]) {
    assert.match(route, /authenticate(?:Identity)?Request\(request\)/);
  }
  assert.match(purchaseScan, /MAX_(?:IMAGE|PDF)_BYTES|MAX_UPLOAD_BYTES/);
  assert.match(purchaseScan, /purchases\/\$\{account\.id\}/);
  assert.match(integrationImport, /MAX_(?:FILE|UPLOAD)_BYTES|content-length/i);
  assert.match(integrationImport, /venueId: account\.venueId/);
  assert.match(integrationImport, /runIntegrationSync\(\{\s*account,/);
  assert.match(avatar, /users\/\$\{account\.id\}\/avatars/);
  assert.match(venueLogo, /venues\/\$\{account\.id\}\/logos/);
});
