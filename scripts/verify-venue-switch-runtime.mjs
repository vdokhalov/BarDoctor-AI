import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = 5191;
const origin = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "Venue-QA-2468";
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
  throw new Error(`Runtime server did not start.\n${serverOutput}`);
}

async function ensureLocalSchema() {
  const directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const databases = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  assert.equal(databases.length, 1);
  const database = new DatabaseSync(path.join(directory, databases[0]));
  try {
    if (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'accounts'").get()) return;
    const migrations = (await readdir(path.join(process.cwd(), "drizzle")))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    database.exec("PRAGMA foreign_keys = ON");
    for (const migration of migrations) database.exec(await readFile(path.join(process.cwd(), "drizzle", migration), "utf8"));
  } finally {
    database.close();
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

function headers(session, venueId, extra = {}) {
  return {
    "Content-Type": "application/json",
    "X-Session-Email": session.email,
    "X-Session-Token": session.token,
    "X-Venue-Id": String(venueId),
    ...extra,
  };
}

async function json(session, venueId, pathname, method = "GET", data) {
  return request(pathname, {
    method,
    headers: headers(session, venueId),
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

async function register() {
  const result = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `venue-runtime-${runId}@example.test`,
      password,
      firstName: "Владелец",
      registrationMode: "owner",
    }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  return result.body;
}

async function putStore(session, venueId, key, data) {
  return json(session, venueId, `/api/store/${key}`, "PUT", { data, reason: `Venue runtime ${key}` });
}

try {
  await waitForServer();
  await ensureLocalSchema();

  const owner = await register();
  const venueA = owner.activeVenueId;
  const profileA = await json(owner, venueA, "/api/restaurants", "POST", {
    name: "Venue Runtime A",
    businessType: "Бар",
    country: "MD",
    city: "Бендеры",
    currency: "RUB",
  });
  assert.equal(profileA.response.status, 200, JSON.stringify(profileA.body));
  const created = await json(owner, venueA, "/api/venues", "POST", {
    name: "Venue Runtime B",
    businessType: "Бар",
    country: "MD",
    city: "Бендеры",
    currency: "MDL",
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const venueB = created.body.activeVenueId;
  const profileB = await json(owner, venueB, "/api/restaurants", "POST", {
    name: "Venue Runtime B",
    businessType: "Бар",
    country: "MD",
    city: "Бендеры",
    currency: "MDL",
  });
  assert.equal(profileB.response.status, 200, JSON.stringify(profileB.body));

  const invalidCurrency = await json(owner, venueB, "/api/restaurants", "POST", {
    name: "Venue Runtime B",
    businessType: "Бар",
    country: "MD",
    city: "Бендеры",
    currency: "BTC",
  });
  assert.equal(invalidCurrency.response.status, 400, JSON.stringify(invalidCurrency.body));
  assert.equal(invalidCurrency.body.code, "INVALID_ACCOUNTING_CURRENCY");

  const loadedProfileA = await json(owner, venueA, "/api/restaurants/me");
  const loadedProfileB = await json(owner, venueB, "/api/restaurants/me");
  assert.equal(loadedProfileA.body.restaurant.currency, "RUB");
  assert.equal(loadedProfileB.body.restaurant.currency, "MDL");

  const moduleStores = {
    health: "bd_finance_revenue",
    finance: "bd_finance_expenses",
    warehouse: "bd_inventory_snapshots",
    employees: "bd_employees",
    purchases: "bd_purchase_documents",
    equipment: "bd_equipment",
    audit: "bd_tasks",
    ai: "bd_ai_diagnosis_v9",
  };
  for (const [module, key] of Object.entries(moduleStores)) {
    const id = "same-entity-id";
    const a = await putStore(owner, venueA, key, [{ id, module, marker: `A:${module}` }]);
    const b = await putStore(owner, venueB, key, [{ id, module, marker: `B:${module}` }]);
    assert.equal(a.response.status, 200, `${module} A: ${JSON.stringify(a.body)}`);
    assert.equal(b.response.status, 200, `${module} B: ${JSON.stringify(b.body)}`);
  }

  for (const [module, key] of Object.entries(moduleStores)) {
    const a = await json(owner, venueA, `/api/store/${key}`);
    const b = await json(owner, venueB, `/api/store/${key}`);
    assert.equal(a.response.status, 200, module);
    assert.equal(b.response.status, 200, module);
    assert.equal(JSON.stringify(a.body).includes(`A:${module}`), true, module);
    assert.equal(JSON.stringify(a.body).includes(`B:${module}`), false, module);
    assert.equal(JSON.stringify(b.body).includes(`B:${module}`), true, module);
    assert.equal(JSON.stringify(b.body).includes(`A:${module}`), false, module);
  }

  const assortmentKey = "bd_assortment_v1";
  const assortmentA = { stockBalances: [{ id: "same-stock-id", name: "Venue A stock", quantity: 50 }] };
  const assortmentB = { stockBalances: [{ id: "same-stock-id", name: "Venue B stock", quantity: 10 }] };
  assert.equal((await putStore(owner, venueA, assortmentKey, assortmentA)).response.status, 200);
  assert.equal((await putStore(owner, venueB, assortmentKey, assortmentB)).response.status, 200);
  const loadedAssortmentA = await json(owner, venueA, `/api/store/${assortmentKey}`);
  const loadedAssortmentB = await json(owner, venueB, `/api/store/${assortmentKey}`);
  assert.match(JSON.stringify(loadedAssortmentA.body), /Venue A stock/);
  assert.doesNotMatch(JSON.stringify(loadedAssortmentA.body), /Venue B stock/);
  assert.match(JSON.stringify(loadedAssortmentB.body), /Venue B stock/);
  assert.doesNotMatch(JSON.stringify(loadedAssortmentB.body), /Venue A stock/);

  const activeB = await json(owner, venueA, "/api/access/active-venue", "POST", { venueId: venueB });
  assert.equal(activeB.response.status, 200, JSON.stringify(activeB.body));
  assert.equal(activeB.body.activeVenueId, venueB);
  const bootstrapB = await request("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      "X-Session-Email": owner.email,
      "X-Session-Token": owner.token,
    },
  });
  assert.equal(bootstrapB.body.activeVenueId, venueB);

  const activeA = await json(owner, venueB, "/api/access/active-venue", "POST", { venueId: venueA });
  assert.equal(activeA.response.status, 200, JSON.stringify(activeA.body));
  assert.equal(activeA.body.activeVenueId, venueA);
  const bootstrapA = await request("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      "X-Session-Email": owner.email,
      "X-Session-Token": owner.token,
    },
  });
  assert.equal(bootstrapA.body.activeVenueId, venueA);

  const switchRequests = [venueB, venueA, venueB, venueA].map((venueId) =>
    json(owner, venueA, "/api/access/active-venue", "POST", { venueId })
  );
  const switchResults = await Promise.all(switchRequests);
  assert.equal(switchResults.every((result) => result.response.status === 200), true);

  const outsider = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `venue-outsider-${runId}@example.test`,
      password,
      firstName: "Другой",
      registrationMode: "owner",
    }),
  });
  assert.equal(outsider.response.status, 201, JSON.stringify(outsider.body));
  const tampered = await request("/api/store/bd_employees", {
    headers: headers(owner, outsider.body.activeVenueId),
  });
  assert.notEqual(tampered.response.status, 200);

  const invalidHeader = await request("/api/store/bd_employees", {
    headers: headers(owner, "not-a-venue"),
  });
  assert.notEqual(invalidHeader.response.status, 200);

  const connectionA = await json(owner, venueA, "/api/integration-hub/connections", "POST", {
    adapterKey: "universal-api-v1",
    provider: "runtime-a",
    displayName: "Integration Venue A",
    sourceKey: `venue-runtime-a-${runId}`,
    enabledEntities: ["product"],
  });
  const connectionB = await json(owner, venueB, "/api/integration-hub/connections", "POST", {
    adapterKey: "universal-api-v1",
    provider: "runtime-b",
    displayName: "Integration Venue B",
    sourceKey: `venue-runtime-b-${runId}`,
    enabledEntities: ["product"],
  });
  assert.equal(connectionA.response.status, 201, JSON.stringify(connectionA.body));
  assert.equal(connectionB.response.status, 201, JSON.stringify(connectionB.body));
  const integrationsA = await json(owner, venueA, "/api/integration-hub");
  const integrationsB = await json(owner, venueB, "/api/integration-hub");
  assert.equal(integrationsA.response.status, 200, JSON.stringify(integrationsA.body));
  assert.equal(integrationsB.response.status, 200, JSON.stringify(integrationsB.body));
  assert.equal(JSON.stringify(integrationsA.body).includes("Integration Venue A"), true);
  assert.equal(JSON.stringify(integrationsA.body).includes("Integration Venue B"), false);
  assert.equal(JSON.stringify(integrationsB.body).includes("Integration Venue B"), true);
  assert.equal(JSON.stringify(integrationsB.body).includes("Integration Venue A"), false);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    context: { aToBToA: true, repeatedSwitchRequests: switchResults.length },
    isolation: {
      sameEntityIds: Object.keys(moduleStores),
      directForeignVenueDenied: tampered.response.status,
      invalidVenueHeaderDenied: invalidHeader.response.status,
      integrations: true,
    },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${serverOutput}\n`);
  throw error;
} finally {
  stopServer();
}
