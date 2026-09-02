import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const productionSource = process.env.BD_V400_SOURCE;
assert.ok(productionSource, "BD_V400_SOURCE must point to the exact Sites v400 source checkout");

const port = Number(process.env.BD_ZERO_MIGRATION_PORT || 5197);
const externalOrigin = process.env.BD_ZERO_MIGRATION_BASE_URL?.replace(/\/$/, "") || "";
const origin = externalOrigin || `http://127.0.0.1:${port}`;
let serverOutput = "";

const server = externalOrigin ? null : spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    detached: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server?.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-16_000); });
server?.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-16_000); });

function stopServer() {
  if (!server?.pid) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
process.once("exit", stopServer);
process.once("SIGINT", () => { stopServer(); process.exit(130); });

async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, body, headers: Object.fromEntries(response.headers) };
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/healthz`);
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`RC server did not start.\n${serverOutput}`);
}

async function localDatabase() {
  const directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const deadline = Date.now() + 10_000;
  let probed = false;
  while (Date.now() < deadline) {
    try {
      const files = (await readdir(directory))
        .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
      if (files.length === 1) return new DatabaseSync(path.join(directory, files[0]));
    } catch {}
    if (!probed) {
      probed = true;
      await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "schema-probe@example.test", password: "schema probe" }),
      }).catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Expected one local D1 database after readiness probe");
}

async function applyHistoricalV400Schema(database) {
  const drizzleDirectory = path.join(productionSource, "drizzle");
  const migrations = (await readdir(drizzleDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && Number(name.slice(0, 4)) <= 20)
    .sort();
  assert.equal(migrations.at(-1)?.slice(0, 4), "0020");
  database.exec("PRAGMA foreign_keys = OFF");
  for (const migration of migrations) {
    database.exec((await readFile(path.join(drizzleDirectory, migration), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }

  // Model the most permissive schema v400 could have produced: replay its
  // request-path auth repair and both known unledgered schema files. If RC
  // still fails on this superset, a narrower v400 state cannot make it safe.
  database.exec("ALTER TABLE accounts ADD COLUMN avatar_id text");
  database.exec("DROP INDEX IF EXISTS accounts_chatgpt_email_uq");
  database.exec((await readFile(path.join(drizzleDirectory, "0025_hybrid_invoice_matching_jobs.sql"), "utf8"))
    .replaceAll("--> statement-breakpoint", ""));

  database.prepare(`
    INSERT INTO accounts (
      chatgpt_email, app_email, first_name, role, restaurant_json,
      migration_status, owns_venue, account_kind
    ) VALUES (?, ?, 'V400 QA', 'owner', ?, 'local', 1, 'user')
  `).run("v400@example.test", "v400@example.test", JSON.stringify({ name: "V400 QA", currency: "PMR_RUB" }));
  const accountId = Number(database.prepare("SELECT id FROM accounts WHERE app_email = ?").get("v400@example.test").id);
  database.prepare("INSERT INTO workspaces (name, status, created_by_account_id) VALUES ('V400 QA', 'active', ?)").run(accountId);
  const workspaceId = Number(database.prepare("SELECT id FROM workspaces WHERE created_by_account_id = ?").get(accountId).id);
  database.prepare(`
    INSERT INTO venues (data_account_id, workspace_id, status, created_by_account_id)
    VALUES (?, ?, 'active', ?)
  `).run(accountId, workspaceId, accountId);
  const venueId = Number(database.prepare("SELECT id FROM venues WHERE data_account_id = ?").get(accountId).id);
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role, status)
    VALUES (?, ?, 'owner', 'active')
  `).run(venueId, accountId);
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (?, ?, 'owner', 'active')
  `).run(workspaceId, accountId);
  const token = "v400-existing-session";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  database.prepare(`
    INSERT INTO sessions (token_hash, account_id, active_venue_id, expires_at)
    VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z')
  `).run(tokenHash, accountId, venueId);
  return { accountId, venueId, token };
}

function schemaSurface(database) {
  const columns = (table) => database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  return {
    accounts: columns("accounts"),
    sessions: columns("sessions"),
    domainData: columns("domain_data"),
    authRateLimits: database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_rate_limits'",
    ).get() ? columns("auth_rate_limits") : [],
  };
}

let database;
try {
  await waitForServer();
  database = await localDatabase();
  assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'").get(), undefined,
    "Local D1 is not empty; refuse to contaminate zero-migration evidence");
  const identity = await applyHistoricalV400Schema(database);
  const historicalSurface = schemaSurface(database);

  const startup = await request("/");
  const home = await request("/home");
  const health = await request("/api/healthz");
  assert.equal(startup.status, 200);
  assert.equal(home.status, 200);
  assert.equal(health.status, 200);

  const staleMutation = await request("/api/store/bd_tasks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Email": "v400@example.test",
      "X-Session-Token": identity.token,
    },
    body: JSON.stringify({ data: [] }),
  });
  assert.equal(staleMutation.status, 426);
  assert.equal(staleMutation.body.code, "CLIENT_UPDATE_REQUIRED");

  const loginWithoutMigrations = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": "192.0.2.16" },
    body: JSON.stringify({ email: "v400@example.test", password: "irrelevant" }),
  });
  assert.equal(loginWithoutMigrations.status, 500);

  // Diagnostic overlay only: expose the next mandatory dependency after the
  // first zero-migration failure. This does not change the test verdict.
  database.exec((await readFile("drizzle/0022_auth_rate_limits.sql", "utf8"))
    .replaceAll("--> statement-breakpoint", ""));
  const bootstrapWithoutSessionColumn = await request("/api/auth/bootstrap", {
    method: "POST",
    headers: { Cookie: `bd_server_session=${identity.token}`, "cf-connecting-ip": "192.0.2.17" },
  });
  assert.equal(bootstrapWithoutSessionColumn.status, 500);

  database.exec((await readFile("drizzle/0024_closed_mongu.sql", "utf8"))
    .replaceAll("--> statement-breakpoint", ""));
  const moduleKeys = {
    nomenclature: "bd_assortment_v1",
    suppliers: "bd_suppliers",
    purchases: "bd_purchase_documents",
    warehouse: "bd_stock_movements",
    finance: "bd_finance_expenses",
    employees: "bd_employees",
  };
  const moduleReads = {};
  for (const [name, key] of Object.entries(moduleKeys)) {
    moduleReads[name] = await request(`/api/store/${key}`, {
      headers: {
        Cookie: `bd_server_session=${identity.token}`,
        "X-Venue-Id": String(identity.venueId),
      },
    });
    assert.equal(moduleReads[name].status, 200, `${name} read failed on the historical schema`);
  }

  const genericStoreWrite = await request("/api/store/bd_tasks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `bd_server_session=${identity.token}`,
      "X-Venue-Id": String(identity.venueId),
      "X-BarDoctor-Client-Contract": "1",
    },
    body: JSON.stringify({ data: [{ id: "step-1.6", title: "zero migration", status: "open" }] }),
  });
  assert.equal(genericStoreWrite.status, 500);

  const writeOffRead = await request("/api/write-offs", {
    headers: {
      Cookie: `bd_server_session=${identity.token}`,
      "X-Venue-Id": String(identity.venueId),
    },
  });
  assert.equal(writeOffRead.status, 200);

  console.log(JSON.stringify({
    ok: false,
    verdict: "ZERO_MIGRATION_INCOMPATIBLE",
    productionSourceSha: "6cc90fc91e9d7df28947c1ddc920733d767e08b4",
    releaseCandidateSha: "a6e570db48450215a1431e7d2d8bc61cfd603ba5",
    historicalModel: "v400 journal 0000-0020 plus v400 runtime auth repair and unledgered invoice schema",
    historicalSurface,
    startup: { root: startup.status, home: home.status, health: health.status },
    staleV400Mutation: { status: staleMutation.status, code: staleMutation.body.code },
    blockers: {
      login: { status: loginWithoutMigrations.status, missing: "auth_rate_limits" },
      existingSession: { status: bootstrapWithoutSessionColumn.status, missing: "sessions.last_seen_at" },
      genericStoreWrite: {
        status: genericStoreWrite.status,
        missing: "domain_data.revision / domain_data.mutation_id",
      },
    },
    unaffectedRepresentative: {
      moduleReads: Object.fromEntries(Object.entries(moduleReads).map(([name, result]) => [name, result.status])),
      writeOffRead: writeOffRead.status,
    },
  }, null, 2));
} catch (error) {
  console.error(error);
  console.error(serverOutput);
  process.exitCode = 1;
} finally {
  database?.close();
  stopServer();
}
