import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("user avatar is an account-scoped server-authoritative field", () => {
  const schema = fs.readFileSync("db/schema.ts", "utf8");
  const auth = fs.readFileSync("lib/bardoctor/auth.ts", "utf8");
  const me = fs.readFileSync("app/api/users/me/route.ts", "utf8");
  const migration = fs.readFileSync("drizzle/0024_add_user_avatar.sql", "utf8");

  assert.match(schema, /avatarId:\s*text\("avatar_id"\)/);
  assert.match(auth, /ALTER TABLE accounts ADD COLUMN avatar_id text/);
  assert.match(auth, /avatarId:\s*account\.avatarId/);
  assert.match(me, /avatarId:\s*account\.avatarId/);
  assert.match(migration, /ALTER TABLE `accounts` ADD `avatar_id` text/);
});

test("avatar upload, read and delete remain authenticated and account scoped", () => {
  const upload = fs.readFileSync("app/api/users/avatar/route.ts", "utf8");
  const item = fs.readFileSync("app/api/users/avatar/[id]/route.ts", "utf8");

  assert.match(upload, /authenticateIdentityRequest\(request\)/);
  assert.match(upload, /users\/\$\{account\.id\}\/avatars\/\$\{id\}/);
  assert.match(upload, /update\(accounts\)\.set\(\{ avatarId: id/);
  assert.match(upload, /MAX_AVATAR_BYTES/);
  assert.match(item, /authenticateIdentityRequest\(request\)/);
  assert.match(item, /account\.avatarId !== id/);
  assert.match(item, /avatarId: null/);
  assert.match(item, /bucket\(\)\?\.delete/);
});
