import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { progressiveBackoffSeconds } from "../lib/bardoctor/auth-rate-limit-policy";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authentication backoff is progressive, bounded and eventually resets by window", () => {
  assert.equal(progressiveBackoffSeconds(0, 900), 0);
  assert.equal(progressiveBackoffSeconds(1, 900), 5);
  assert.equal(progressiveBackoffSeconds(2, 900), 10);
  assert.equal(progressiveBackoffSeconds(7, 900), 320);
  assert.equal(progressiveBackoffSeconds(20, 120), 120);
});

test("public authentication routes consume durable server-side buckets", async () => {
  const routes = await Promise.all([
    source("app/api/auth/login/route.ts"),
    source("app/api/auth/register/route.ts"),
    source("app/api/auth/reset-password/route.ts"),
    source("app/api/auth/bootstrap/route.ts"),
    source("app/api/auth/server-session/route.ts"),
  ]);
  for (const route of routes) {
    assert.match(route, /consumeAuthRateLimit\(/);
    assert.match(route, /authRateLimitedResponse/);
  }
});

test("registration does not disclose whether an email already exists", async () => {
  const route = await source("app/api/auth/register/route.ts");
  assert.match(route, /REGISTRATION_UNAVAILABLE/);
  assert.doesNotMatch(route, /Аккаунт с таким email уже (?:есть|зарегистрирован)/);
  const accountExistenceBranch = route.match(
    /if \(await findAccountByAppEmail\(appEmail\)\) \{([\s\S]*?)\n    \}\n\n    const now/,
  )?.[1] ?? "";
  assert.match(accountExistenceBranch, /REGISTRATION_UNAVAILABLE/);
  assert.match(accountExistenceBranch, /status:\s*400/);
  assert.doesNotMatch(accountExistenceBranch, /status:\s*409/);
});

test("rate-limit persistence stores fingerprints, never raw identities or tokens", async () => {
  const [limiter, migration] = await Promise.all([
    source("lib/bardoctor/auth-rate-limit.ts"),
    source("drizzle/0022_auth_rate_limits.sql"),
  ]);
  assert.match(limiter, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(migration, /CREATE TABLE `auth_rate_limits`/);
  assert.doesNotMatch(migration, /email|ip_address|token/i);
});

test("registration UI and server enforce the same 15-character minimum", async () => {
  const asset = await source("public/assets/index-BQGspy0I.js");
  assert.match(asset, /password\.length<15\?"Минимум 15 символов"/);
  assert.match(asset, /placeholder:"Минимум 15 символов"/);
  assert.doesNotMatch(asset, /password\.length<6\?"Минимум 6 символов"/);
});
