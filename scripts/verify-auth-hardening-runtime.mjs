import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = Number(process.env.BD_AUTH_QA_PORT || 5196);
const origin = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "Auth hardening runtime passphrase";
let serverOutput = "";

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  detached: true,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });
server.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });

function stopServer() {
  if (!server.pid) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
process.once("exit", stopServer);
process.once("SIGINT", () => { stopServer(); process.exit(130); });

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Auth runtime server did not start.\n${serverOutput}`);
}

async function localDatabase() {
  const directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let files = [];
  try {
    files = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  } catch {}
  if (files.length === 0) {
    await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "schema-probe@example.test", password }),
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 250));
    files = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  }
  assert.equal(files.length, 1, `Expected one local D1 database, found ${files.length}`);
  const database = new DatabaseSync(path.join(directory, files[0]));
  const hasAccounts = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'",
  ).get();
  if (!hasAccounts) {
    const migrations = (await readdir(path.join(process.cwd(), "drizzle")))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    database.exec("PRAGMA foreign_keys = ON");
    for (const migration of migrations) {
      database.exec((await readFile(path.join(process.cwd(), "drizzle", migration), "utf8"))
        .replaceAll("--> statement-breakpoint", ""));
    }
  } else if (!database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_rate_limits'",
  ).get()) {
    database.exec((await readFile(path.join(process.cwd(), "drizzle/0022_auth_rate_limits.sql"), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
  const sessionColumns = database.prepare("PRAGMA table_info(sessions)").all();
  if (!sessionColumns.some((column) => column.name === "last_seen_at")) {
    database.exec((await readFile(path.join(process.cwd(), "drizzle/0024_closed_mongu.sql"), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

async function json(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

function authHeaders(source) {
  return { "Content-Type": "application/json", "X-Real-IP": source };
}

let database;
try {
  await waitForServer();
  database = await localDatabase();

  const email = `auth-limit-${runId}@example.test`;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = await json("/api/auth/login", {
      method: "POST",
      headers: authHeaders("192.0.2.10"),
      body: JSON.stringify({ email, password: "definitely incorrect password" }),
    });
    assert.equal(result.response.status, 401, `attempt ${attempt}: ${JSON.stringify(result.body)}`);
  }
  const blocked = await json("/api/auth/login", {
    method: "POST",
    headers: authHeaders("192.0.2.10"),
    body: JSON.stringify({ email, password: "definitely incorrect password" }),
  });
  assert.equal(blocked.response.status, 429, JSON.stringify(blocked.body));
  assert.equal(blocked.body.code, "AUTH_RATE_LIMITED");
  assert.ok(Number(blocked.response.headers.get("retry-after")) >= 1);

  const rotatedSource = await json("/api/auth/login", {
    method: "POST",
    headers: authHeaders("198.51.100.20"),
    body: JSON.stringify({ email, password: "definitely incorrect password" }),
  });
  assert.equal(rotatedSource.response.status, 429, "identity bucket must survive source rotation");

  const guessedInvite = "BD-2222-2222-2222-2222";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = await json("/api/auth/register", {
      method: "POST",
      headers: authHeaders(`198.51.100.${30 + attempt}`),
      body: JSON.stringify({
        email: `invite-guess-${attempt}-${runId}@example.test`,
        password,
        firstName: "Invite QA",
        registrationMode: "join",
        invitationCode: guessedInvite,
      }),
    });
    assert.equal(result.response.status, 400, `invite attempt ${attempt}: ${JSON.stringify(result.body)}`);
  }
  const inviteBlockedAcrossIdentityAndSourceRotation = await json("/api/auth/register", {
    method: "POST",
    headers: authHeaders("203.0.113.199"),
    body: JSON.stringify({
      email: `invite-guess-blocked-${runId}@example.test`,
      password,
      firstName: "Invite QA",
      registrationMode: "join",
      invitationCode: guessedInvite,
    }),
  });
  assert.equal(inviteBlockedAcrossIdentityAndSourceRotation.response.status, 429);

  const registeredEmail = `auth-register-${runId}@example.test`;
  const registration = await json("/api/auth/register", {
    method: "POST",
    headers: {
      ...authHeaders("203.0.113.30"),
    },
    body: JSON.stringify({
      email: registeredEmail,
      password,
      firstName: "Auth QA",
      registrationMode: "owner",
    }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));
  assert.equal(Object.hasOwn(registration.body, "token"), false);
  assert.match(registration.response.headers.get("set-cookie") ?? "", /HttpOnly/);
  assert.match(registration.response.headers.get("set-cookie") ?? "", /SameSite=Strict/);
  const sessionCookie = (registration.response.headers.get("set-cookie") ?? "").split(";", 1)[0];
  assert.match(sessionCookie, /^bd_server_session=/);

  const bootstrapHeaders = {
    Cookie: sessionCookie,
  };
  const firstTab = await json("/api/auth/bootstrap", { method: "POST", headers: bootstrapHeaders });
  const secondTab = await json("/api/auth/bootstrap", { method: "POST", headers: bootstrapHeaders });
  assert.equal(firstTab.response.status, 200, JSON.stringify(firstTab.body));
  assert.equal(secondTab.response.status, 200, JSON.stringify(secondTab.body));
  assert.equal(Object.hasOwn(firstTab.body, "token"), false);

  const forged = await json("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      Cookie: "bd_server_session=forged-session-token",
    },
  });
  assert.equal(forged.response.status, 401, JSON.stringify(forged.body));

  const rawToken = decodeURIComponent(sessionCookie.slice("bd_server_session=".length));
  const bearerReplay = await json("/api/auth/bootstrap", {
    method: "POST",
    headers: { "X-Session-Email": registeredEmail, "X-Session-Token": rawToken },
  });
  assert.equal(bearerReplay.response.status, 401, JSON.stringify(bearerReplay.body));
  const retiredExchange = await json("/api/auth/server-session", {
    method: "POST",
    headers: { "X-Session-Email": registeredEmail, "X-Session-Token": rawToken },
  });
  assert.equal(retiredExchange.response.status, 410, JSON.stringify(retiredExchange.body));

  const duplicate = await json("/api/auth/register", {
    method: "POST",
    headers: authHeaders("203.0.113.30"),
    body: JSON.stringify({
      email: registeredEmail,
      password,
      firstName: "Auth QA",
      registrationMode: "owner",
    }),
  });
  assert.equal(duplicate.response.status, 400, JSON.stringify(duplicate.body));
  assert.equal(duplicate.body.code, "REGISTRATION_UNAVAILABLE");
  assert.equal(JSON.stringify(duplicate.body).includes(registeredEmail), false);

  const logout = await json("/api/auth/logout", {
    method: "POST",
    headers: bootstrapHeaders,
  });
  assert.equal(logout.response.status, 200, JSON.stringify(logout.body));
  const staleAfterLogout = await json("/api/auth/bootstrap", {
    method: "POST",
    headers: bootstrapHeaders,
  });
  assert.equal(staleAfterLogout.response.status, 401, JSON.stringify(staleAfterLogout.body));

  const expiredToken = `expired-${runId}`;
  const expiredHash = createHash("sha256").update(expiredToken).digest("hex");
  database.prepare(`
    INSERT INTO sessions (token_hash, account_id, expires_at)
    VALUES (?, ?, ?)
  `).run(expiredHash, registration.body.userId, "2020-01-01T00:00:00.000Z");
  const expired = await json("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      Cookie: `bd_server_session=${expiredToken}`,
    },
  });
  assert.equal(expired.response.status, 401, JSON.stringify(expired.body));

  const inactiveToken = `inactive-${runId}`;
  const inactiveHash = createHash("sha256").update(inactiveToken).digest("hex");
  database.prepare(`
    INSERT INTO sessions (token_hash, account_id, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?)
  `).run(inactiveHash, registration.body.userId, "2099-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z");
  const inactive = await json("/api/auth/bootstrap", {
    method: "POST",
    headers: { Cookie: `bd_server_session=${inactiveToken}` },
  });
  assert.equal(inactive.response.status, 401, JSON.stringify(inactive.body));

  const rawIdentityRows = database.prepare(`
    SELECT COUNT(*) AS count FROM auth_rate_limits
    WHERE key LIKE ? OR action LIKE ? OR scope LIKE ?
  `).get(`%${registeredEmail}%`, `%${registeredEmail}%`, `%${registeredEmail}%`);
  assert.equal(rawIdentityRows.count, 0);

  console.log(JSON.stringify({
    ok: true,
    loginAttemptsBeforeBlock: 8,
    identitySurvivedSourceRotation: true,
    inviteCodeSurvivedIdentityAndSourceRotation: true,
    registrationEnumerationProtected: true,
    rawIdentityStored: false,
    cookiePrimary: true,
    bearerReturnedToNewClient: false,
    bearerHeaderReplayRejected: true,
    legacySessionExchangeRetired: true,
    forgedRejected: true,
    expiredRejected: true,
    inactiveRejected: true,
    logoutRevokedAcrossTabs: true,
  }, null, 2));
} catch (error) {
  console.error(error);
  console.error(serverOutput);
  process.exitCode = 1;
} finally {
  database?.close();
  stopServer();
}
