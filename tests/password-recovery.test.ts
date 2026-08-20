import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canImportLegacyAccount,
  canResetAccountPassword,
} from "../lib/bardoctor/account-identity";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("password recovery only accepts the account's verified ChatGPT identity", () => {
  const account = {
    appEmail: "venue@example.com",
    chatgptEmail: "owner@example.com",
  };

  assert.equal(canResetAccountPassword("owner@example.com", account), true);
  assert.equal(canResetAccountPassword("venue@example.com", account), true);
  assert.equal(canResetAccountPassword("attacker@example.com", account), false);
});

test("legacy migration requires the same verified ChatGPT email", () => {
  assert.equal(
    canImportLegacyAccount(" Owner@Example.com ", "owner@example.com"),
    true,
  );
  assert.equal(
    canImportLegacyAccount("attacker@example.com", "owner@example.com"),
    false,
  );
});

test("password recovery is identity-gated and invalidates old sessions", async () => {
  const [page, route] = await Promise.all([
    read("app/forgot-password/page.tsx"),
    read("app/api/auth/reset-password/route.ts"),
  ]);

  assert.match(page, /getChatGPTUser\(\)/);
  assert.match(page, /chatGPTSignInPath\("\/forgot-password"\)/);
  assert.match(route, /getChatGPTEmail\(request\)/);
  assert.match(route, /canResetAccountPassword\(authenticatedEmail, account\)/);
  assert.match(route, /db\.delete\(sessions\)/);
  assert.match(route, /hashPassword\(body\.password\)/);
});

test("the SPA opens password recovery as a server-rendered page", async () => {
  const shell = await read("public/bardoctor-preview.js");

  assert.match(shell, /standaloneRoutes = \["\/forgot-password"\]/);
  assert.doesNotMatch(shell, /standaloneRoutes = \[[^\]]*"\/(?:integrations|reviews)"/);
  assert.match(shell, /window\.location\.assign/);
});
