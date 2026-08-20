import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  deriveLocalConnectorStatus,
  LOCAL_CONNECTOR_ADAPTER,
  LOCAL_CONNECTOR_VERSION,
  normalizeLocalConnectorHeartbeat,
} from "../lib/bardoctor/integrations/local-connector";
import { UniversalFileAdapter } from "../lib/bardoctor/integrations/universal-file-adapter";
import { validateCanonicalEnvelope } from "../lib/bardoctor/integrations/validation";

const root = new URL("../", import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), "utf8");
}

async function migratedDatabase(): Promise<DatabaseSync> {
  const database = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    database.exec((await readFile(new URL(file, directory), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

function seedVenue(database: DatabaseSync, email: string): { accountId: number; venueId: number } {
  const account = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name)
    VALUES (?, ?, 'Owner') RETURNING id
  `).get(email, email) as { id: number };
  const workspace = database.prepare(`
    INSERT INTO workspaces (name, created_by_account_id) VALUES ('Local Connector', ?) RETURNING id
  `).get(account.id) as { id: number };
  const venue = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id)
    VALUES (?, ?, ?) RETURNING id
  `).get(workspace.id, account.id, account.id) as { id: number };
  return { accountId: account.id, venueId: venue.id };
}

function validHeartbeat(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    machineIdHash: "a".repeat(64),
    machineName: "BAR-PC-01",
    agentVersion: LOCAL_CONNECTOR_VERSION,
    adapterKey: LOCAL_CONNECTOR_ADAPTER,
    readOnly: true,
    status: "connected",
    autoSync: true,
    intervalMinutes: 5,
    importedCount: 437,
    metadata: { queueDepth: 2, architecture: "x86", nested: { rejected: true } },
    ...overrides,
  };
}

test("Local Connector heartbeat requires the reviewed read-only 1C adapter", () => {
  const heartbeat = normalizeLocalConnectorHeartbeat(validHeartbeat());
  assert.equal(heartbeat.machineName, "BAR-PC-01");
  assert.equal(heartbeat.adapterKey, "onec-common-catering-v1");
  assert.equal(heartbeat.readOnly, true);
  assert.equal(heartbeat.intervalMinutes, 15, "aggressive polling is clamped");
  assert.equal(heartbeat.importedCount, 437);
  assert.deepEqual(heartbeat.metadata, { queueDepth: 2, architecture: "x86" });

  assert.throws(
    () => normalizeLocalConnectorHeartbeat(validHeartbeat({ readOnly: false })),
    /READ_ONLY_REQUIRED/,
  );
  assert.throws(
    () => normalizeLocalConnectorHeartbeat(validHeartbeat({ machineIdHash: "not-a-hash" })),
    /MACHINE_ID_INVALID/,
  );
  assert.throws(
    () => normalizeLocalConnectorHeartbeat(validHeartbeat({ adapterKey: "unreviewed-adapter" })),
    /ADAPTER_NOT_SUPPORTED/,
  );
});

test("truthful Local Connector statuses cover install, reconnect, sync, attention and disable", () => {
  const recent = new Date("2026-08-13T10:00:00.000Z").toISOString();
  const now = new Date("2026-08-13T10:04:00.000Z").valueOf();
  assert.equal(deriveLocalConnectorStatus({ connection: { status: "requires_setup", syncEnabled: true }, now }), "awaiting_connection");
  assert.equal(deriveLocalConnectorStatus({
    connection: { status: "connected", syncEnabled: true },
    agent: { status: "connected", last_seen_at: recent, last_error: null }, now,
  }), "connected");
  assert.equal(deriveLocalConnectorStatus({
    connection: { status: "connected", syncEnabled: true },
    agent: { status: "syncing", last_seen_at: recent, last_error: null }, now,
  }), "syncing");
  assert.equal(deriveLocalConnectorStatus({
    connection: { status: "connected", syncEnabled: true },
    agent: { status: "working", last_seen_at: recent, last_error: null }, latestRun: { status: "success" }, now,
  }), "working");
  assert.equal(deriveLocalConnectorStatus({
    connection: { status: "connected", syncEnabled: true },
    agent: { status: "connected", last_seen_at: new Date(now - 11 * 60_000).toISOString(), last_error: null }, now,
  }), "attention");
  assert.equal(deriveLocalConnectorStatus({
    connection: { status: "connected", syncEnabled: true },
    agent: { status: "connected", last_seen_at: new Date(now - 25 * 60 * 60_000).toISOString(), last_error: null }, now,
  }), "error");
  assert.equal(deriveLocalConnectorStatus({ connection: { status: "paused", syncEnabled: false }, now }), "disabled");
});

test("warehouse records use canonical external IDs and validate without flattening names", async () => {
  const result = await new UniversalFileAdapter().normalize({
    entityType: "warehouse",
    json: [{ externalId: "42f90d", code: "MAIN", name: "Основной склад", active: true }],
  }, {
    venueId: 91,
    externalSystem: "1С · Кёльн",
    sourceType: "local_connector",
    now: "2026-08-13T10:00:00.000Z",
  });
  assert.equal(result.records[0].externalId, "42f90d");
  assert.equal(result.records[0].venueId, 91);
  assert.deepEqual(validateCanonicalEnvelope(result.records[0]), []);
});

test("agent, delivery and token persistence enforce source identity and venue isolation", async () => {
  const database = await migratedDatabase();
  const first = seedVenue(database, "connector-a@example.com");
  const second = seedVenue(database, "connector-b@example.com");
  const insertConnection = database.prepare(`
    INSERT INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, source_key,
      display_name, channel, status, sync_enabled, created_by_account_id
    ) VALUES (?, ?, ?, '1c', 'local-connector-v1', ?, ?, 'local_agent', 'requires_setup', 1, ?)
  `);
  insertConnection.run("conn-a", first.venueId, first.accountId, "onec-a", "1С A", first.accountId);
  insertConnection.run("conn-b", second.venueId, second.accountId, "onec-b", "1С B", second.accountId);

  const insertAgent = database.prepare(`
    INSERT INTO integration_connector_agents (
      id, venue_id, data_account_id, connection_id, machine_id_hash,
      machine_name, agent_version, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, 'BAR-PC', '1.0.0', ?)
  `);
  insertAgent.run("agent-a", first.venueId, first.accountId, "conn-a", "a".repeat(64), "2026-08-13T10:00:00Z");
  assert.throws(
    () => insertAgent.run("cross-tenant", second.venueId, second.accountId, "conn-a", "b".repeat(64), "2026-08-13T10:00:00Z"),
    /INTEGRATION_TENANT_MISMATCH/,
  );

  database.prepare(`
    INSERT INTO integration_ingress_tokens (
      id, venue_id, data_account_id, connection_id, label, token_prefix,
      token_hash, scopes_json, created_by_account_id
    ) VALUES ('token-a', ?, ?, 'conn-a', 'Main', 'bd_local_abcd', 'hash-a', '["product"]', ?)
  `).run(first.venueId, first.accountId, first.accountId);
  const valid = database.prepare(`
    SELECT token.id FROM integration_ingress_tokens token
    INNER JOIN integration_connections connection
      ON connection.id = token.connection_id
      AND connection.venue_id = token.venue_id
      AND connection.data_account_id = token.data_account_id
    WHERE token.token_hash = ? AND token.revoked_at IS NULL
      AND connection.status IN ('requires_setup', 'connected', 'error')
      AND connection.sync_enabled = 1
  `).get("hash-a") as { id: string };
  assert.equal(valid.id, "token-a");
  database.prepare("UPDATE integration_ingress_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = 'token-a'").run();
  assert.equal(database.prepare(`
    SELECT token.id FROM integration_ingress_tokens token
    INNER JOIN integration_connections connection ON connection.id = token.connection_id
    WHERE token.token_hash = ? AND token.revoked_at IS NULL
  `).get("hash-a"), undefined, "revoked key is rejected immediately");

  const delivery = database.prepare(`
    INSERT INTO integration_ingress_deliveries (
      id, venue_id, data_account_id, connection_id, delivery_id, payload_hash
    ) VALUES (?, ?, ?, 'conn-a', 'delivery-1', 'payload-hash')
  `);
  delivery.run("delivery-a", first.venueId, first.accountId);
  assert.throws(
    () => delivery.run("delivery-duplicate", first.venueId, first.accountId),
    /UNIQUE/,
    "the same delivery cannot create a duplicate document after retry",
  );
  database.close();
});

test("server ingress rejects malformed, cross-connection and oversized batches before Sync Engine", async () => {
  const ingest = await source("app/api/integration/v1/ingest/route.ts");
  const heartbeat = await source("app/api/integration/v1/heartbeat/route.ts");
  const auth = await source("lib/bardoctor/integrations/ingress-auth.ts");
  assert.match(ingest, /CONTRACT_INVALID/);
  assert.match(ingest, /RECORD_COUNT_INVALID/);
  assert.match(ingest, /CONNECTION_MISMATCH/);
  assert.match(ingest, /WAREHOUSE_SCOPE_DENIED/);
  assert.match(heartbeat, /READ_ONLY_REQUIRED/);
  assert.match(heartbeat, /authorization\.tenant/);
  assert.match(auth, /token\.revoked_at IS NULL/);
  assert.match(auth, /connection\.venue_id = token\.venue_id/);
  assert.match(auth, /attempt_count = attempt_count \+ 1/);
});

test("safe upsert updates an imported purchase instead of creating a second document", async () => {
  const connections = await source("app/api/integration-hub/connections/route.ts");
  const sync = await source("lib/bardoctor/integrations/sync-engine.ts");
  const writer = await source("app/api/integration-hub/business-writer.ts");
  const update = await source("app/api/purchases/update/route.ts");
  const repository = await source("lib/bardoctor/integrations/repository.ts");
  assert.match(connections, /updatePolicy: adapterKey === "local-connector-v1" \? "safe_upsert"/);
  assert.match(sync, /isUpdate: Boolean\(existingLink && existingLink\.payload_hash !== hash\)/);
  assert.match(writer, /input\.isUpdate \? updatePurchase : confirmPurchase/);
  assert.match(update, /revisePurchaseInInventory/);
  assert.match(update, /Подтверждённая накладная не найдена/);
  assert.match(repository, /restoreEntityLinkAfterFailedUpdate/);
  assert.match(repository, /sync_status = 'success'/,
    "a failed revision restores the previous successful hash so the next run retries as an update");
});

test("stock snapshots preserve warehouse IDs and aggregate venue inventory across warehouses", async () => {
  const writer = await source("lib/bardoctor/integrations/domain-writer.ts");
  const adapter = await source("local-connector/windows/src/04_OneCAdapter.cs");
  assert.match(writer, /warehouseBalances\[warehouseExternalId\]/);
  assert.match(writer, /aggregateAmount/);
  assert.match(writer, /warehouseExternalId: warehouseExternalId === "__venue__"/);
  assert.match(adapter, /externalId = "stock:" \+ warehouseId \+ ":" \+ productId/);
  assert.match(adapter, /BalanceResource\(quantity\)/);
  assert.match(adapter, /settings\.StockState/);
});

test("Windows agent implements encrypted secrets, durable retry, cursor resume and reconnect", async () => {
  const security = await source("local-connector/windows/src/02_SecurityQueue.cs");
  const sync = await source("local-connector/windows/src/05_SyncEngine.cs");
  const client = await source("local-connector/windows/src/03_BarDoctorClient.cs");
  const program = await source("local-connector/windows/src/01_Program.cs");
  assert.match(security, /ProtectedData\.Protect/);
  assert.match(security, /DataProtectionScope\.CurrentUser/);
  assert.match(security, /Math\.Pow\(2, exponent\)/);
  assert.match(security, /REDACTED_KEY/);
  assert.match(sync, /_queue\.Enqueue\(item\)/);
  assert.match(sync, /_queue\.Retry/);
  assert.match(sync, /Settings\.Cursors\[queued\.Item2\.EntityType\]/);
  assert.match(sync, /result\.Errors == 0[\s\S]*result\.RunStatus == "success"/);
  assert.match(sync, /BackgroundHeartbeat/);
  assert.match(sync, /DrainQueue\(client/);
  assert.match(client, /UriSchemeHttps/);
  assert.match(client, /TLS_REQUIRED/);
  assert.match(program, /SecurityProtocolType\)3072/);
});

test("partial, interrupted and repeated initial sync keep retryable records without duplicate delivery", async () => {
  const sync = await source("local-connector/windows/src/05_SyncEngine.cs");
  const queue = await source("local-connector/windows/src/02_SecurityQueue.cs");
  assert.match(sync, /_queue\.Enqueue\(item\);\s*DrainQueue\(client, summary, true\)/,
    "an interrupted send is durable before the network call");
  assert.match(sync, /if \(result\.Errors == 0[\s\S]*Settings\.Fingerprints/,
    "partial application failures do not advance local fingerprints");
  assert.match(sync, /!Settings\.Fingerprints\.TryGetValue\(key, out previous\)/,
    "a repeated initial scan sends only records whose content changed");
  assert.match(sync, /item\.DeliveryId = "lc-"/);
  assert.match(queue, /includeDelayed \|\| item\.NextAttemptUtc <= DateTime\.UtcNow/);
  assert.match(sync, /credentialsCanBeFixed[\s\S]*_queue\.Retry/,
    "key rotation preserves interrupted local data");
});

test("1C adapter has a hard query-only boundary and no write/post/delete COM calls", async () => {
  const adapter = await source("local-connector/windows/src/04_OneCAdapter.cs");
  const callLines = adapter.split("\n").filter((line) => line.includes("ComAccess.Call"));
  assert.ok(callLines.length > 8);
  assert.doesNotMatch(callLines.join("\n"), /["'](?:Write|Записать|Post|Провести|Delete|Удалить|BeginTransaction|НачатьТранзакцию)["']/i);
  assert.match(adapter, /EnsureSelectOnly\(queryText\)/);
  assert.match(adapter, /StartsWith\("ВЫБРАТЬ"/);
  assert.match(adapter, /V82\.COMConnector/);
  assert.match(adapter, /File=\\"/);
  assert.match(adapter, /UniqueIdentifier/);
  assert.match(adapter, /ibases\.v8i/);
  assert.match(adapter, /\.Остатки\(&Moment\)/);
  assert.match(adapter, /D\.Проведен = ИСТИНА/);
});

test("Windows distribution is complete, checksum-valid and requires no developer runtime", async () => {
  const zipUrl = new URL("public/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip", root);
  const checksumText = await readFile(new URL("public/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip.sha256", root), "utf8");
  const archive = await readFile(zipUrl);
  assert.equal(archive.subarray(0, 2).toString("ascii"), "PK");
  assert.equal(createHash("sha256").update(archive).digest("hex"), checksumText.trim().split(/\s+/)[0]);
  const installer = await source("local-connector/windows/install.ps1");
  const command = await source("local-connector/windows/Install-BarDoctor-Local-Connector.cmd");
  assert.match(installer, /Microsoft\\NET Framework/);
  assert.match(installer, /\/platform:x86/);
  assert.match(installer, /CurrentVersion\\Run/);
  assert.match(command, /ExecutionPolicy Bypass/);
  assert.doesNotMatch(installer + command, /python|npm|node\.exe/i);
});

test("BarDoctor UI never marks a key-only Local Connector as working", async () => {
  const ui = await source("public/integrations.js");
  const page = await source("app/integrations/route.ts");
  assert.match(ui, /awaiting_connection[\s\S]*Ожидает подключения/);
  assert.match(ui, /connection\.localStatus/);
  assert.match(ui, /Агент ещё не подключался/);
  assert.match(ui, /Отозвать ключ/);
  assert.match(ui, /Выпустить новый ключ/);
  assert.match(page, /Скачать Local Connector/);
  assert.match(page, /Install-BarDoctor-Local-Connector\.cmd/);
});
