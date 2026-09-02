import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = Number(process.env.BD_QA_PORT || 5189);
const externalOrigin = process.env.BD_QA_BASE_URL?.replace(/\/$/, "") || "";
const origin = externalOrigin || `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const syntheticPassword = "Runtime-QA-2468";
let serverOutput = "";

const server = externalOrigin
  ? null
  : spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
server?.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });
server?.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });

function stopServer() {
  if (!server?.pid) return;
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
  const d1Directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const databases = (await readdir(d1Directory))
    .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  assert.equal(databases.length, 1, `Expected one local D1 database, found ${databases.length}`);
  const database = new DatabaseSync(path.join(d1Directory, databases[0]));
  try {
    const accountTable = database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'accounts'",
    ).get();
    if (accountTable) {
      const hasRateLimits = database.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'auth_rate_limits'",
      ).get();
      if (!hasRateLimits) {
        database.exec((await readFile(path.join(process.cwd(), "drizzle/0022_auth_rate_limits.sql"), "utf8"))
          .replaceAll("--> statement-breakpoint", ""));
      }
      const domainColumns = database.prepare("PRAGMA table_info(domain_data)").all();
      if (!domainColumns.some((column) => column.name === "revision")) {
        database.exec((await readFile(path.join(process.cwd(), "drizzle/0023_store_atomic_revision.sql"), "utf8"))
          .replaceAll("--> statement-breakpoint", ""));
      }
      return;
    }
    const migrations = (await readdir(path.join(process.cwd(), "drizzle")))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    database.exec("PRAGMA foreign_keys = ON");
    for (const migration of migrations) {
      database.exec(await readFile(path.join(process.cwd(), "drizzle", migration), "utf8"));
    }
  } finally {
    database.close();
  }
}

async function openLocalDatabase() {
  const d1Directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const databases = (await readdir(d1Directory))
    .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  assert.equal(databases.length, 1);
  return new DatabaseSync(path.join(d1Directory, databases[0]));
}

async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body, contentType };
}

function sessionHeaders(session, extra = {}) {
  return {
    "Content-Type": "application/json",
    Cookie: session.cookie,
    "X-Venue-Id": String(session.activeVenueId),
    "X-BarDoctor-Client-Contract": "1",
    ...extra,
  };
}

async function register(suffix, firstName, invitationCode) {
  const email = `trust-${suffix}-${runId}@example.test`;
  const payload = {
    email,
    password: syntheticPassword,
    firstName,
    ...(invitationCode
      ? { invitationCode, registrationMode: "join" }
      : { registrationMode: "owner" }),
  };
  const result = await request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": `198.51.100.${({ "owner-a": 51, "owner-b": 52, limited: 53, denied: 54 })[suffix] ?? 59}`,
    },
    body: JSON.stringify(payload),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.ok, true);
  const cookie = result.response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "registration must issue a server session cookie");
  return { ...result.body, cookie };
}

async function jsonRequest(session, path, method, data, extraHeaders) {
  return request(path, {
    method,
    headers: sessionHeaders(session, extraHeaders),
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

async function setProfile(session, name) {
  const result = await jsonRequest(session, "/api/restaurants", "POST", {
    name,
    businessType: "Бар",
    country: "DE",
    city: "Köln",
    currency: "EUR",
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
}

async function putStore(session, key, data, reason, baseData) {
  const result = await jsonRequest(session, `/api/store/${key}`, "PUT", {
    data,
    reason,
    ...(baseData === undefined ? {} : { baseData }),
  });
  return result;
}

async function getAudit(session, query = "") {
  return request(`/api/audit${query ? `?${query}` : ""}`, {
    headers: sessionHeaders(session),
  });
}

try {
  await waitForServer();
  await ensureLocalSchema();

  const readiness = await request("/api/healthz");
  assert.equal(readiness.response.status, 200, JSON.stringify(readiness.body));
  assert.equal(readiness.body.status, "ready");
  assert.equal(readiness.body.checks.database.ok, true);
  assert.match(readiness.response.headers.get("x-request-id") ?? "", /^[A-Za-z0-9._:-]{8,80}$/);

  const unauthenticated = await request("/api/audit");
  assert.equal(unauthenticated.response.status, 401);

  const ownerA = await register("owner-a", "Виталий");
  const ownerB = await register("owner-b", "Анна");
  await setProfile(ownerA, "Кёльн Runtime A");
  await setProfile(ownerB, "Кёльн Runtime B");
  const secondaryVenue = await jsonRequest(ownerA, "/api/venues", "POST", {
    name: "Кёльн Runtime A · Второй",
    businessType: "Бар",
    country: "DE",
    city: "Köln",
    currency: "EUR",
  });
  assert.equal(secondaryVenue.response.status, 201, JSON.stringify(secondaryVenue.body));

  const historySeed = Array.from({ length: 45 }, (_, index) => ({
    id: `history-${String(index + 1).padStart(2, "0")}`,
    title: `Проверка истории ${index + 1}`,
    status: "completed",
    date: "2026-08-01",
  }));
  let result = await putStore(ownerA, "bd_tasks", historySeed, "Runtime-проверка прогрессивной загрузки");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const repair1200 = { id: "shared-expense", date: "2026-07-15", name: "Ремонт", category: "other", amount: 1200 };
  const repair1500 = { ...repair1200, amount: 1500 };
  const temporary = { id: "temporary-expense", date: "2026-08-12", name: "Временный расход", category: "other", amount: 50 };
  result = await putStore(ownerA, "bd_finance_expenses", [repair1200, temporary], "Созданы расходы для runtime-проверки");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await putStore(ownerA, "bd_finance_expenses", [repair1500, temporary], "Исправлена сумма ремонта");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await putStore(ownerA, "bd_finance_expenses", [repair1500], "Удалён временный расход");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  result = await putStore(ownerA, "bd_purchase_documents", [{
    id: "onec-invoice-1245",
    title: "Накладная №1245",
    date: "2026-08-13",
    amount: 28430,
    source: "integration",
    sourceType: "local_connector",
    externalSystem: "1С:Общепит",
  }], "Local Connector применил изменение из 1С");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const diagnostic = await request("/api/admin/relationship-integrity", { headers: sessionHeaders(ownerA) });
  assert.equal(diagnostic.response.status, 403, JSON.stringify(diagnostic.body));
  assert.equal(diagnostic.body.code, "PLATFORM_ADMIN_REQUIRED");

  result = await putStore(ownerB, "bd_finance_expenses", [{
    id: "shared-expense",
    date: "2026-07-15",
    name: "Секрет venue B",
    amount: 999,
  }], "Событие только venue B");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const auditA = await getAudit(ownerA, "limit=40");
  assert.equal(auditA.response.status, 200, JSON.stringify(auditA.body));
  assert.equal(auditA.body.page.hasMore, true);
  assert.equal(auditA.body.rows.some((row) => row.action === "create"), true);
  assert.equal(auditA.body.rows.some((row) => row.action === "update" && row.summary.includes("1 200 ₽ → 1 500 ₽")), true);
  assert.equal(auditA.body.rows.some((row) => row.action === "delete"), true);
  assert.equal(
    auditA.body.rows.some((row) => row.source === "local_connector" && row.sourceLabel === "1С:Общепит"),
    true,
    JSON.stringify(auditA.body.rows.map((row) => ({ title: row.title, source: row.source, sourceLabel: row.sourceLabel }))),
  );
  assert.equal(JSON.stringify(auditA.body).includes("Секрет venue B"), false);

  const auditB = await getAudit(ownerB, "q=%D0%A1%D0%B5%D0%BA%D1%80%D0%B5%D1%82&limit=20");
  assert.equal(auditB.response.status, 200);
  assert.equal(auditB.body.rows.some((row) => row.objectLabel === "Секрет venue B"), true);

  const tampered = await request("/api/audit?limit=5", {
    headers: sessionHeaders(ownerA, { "X-Venue-Id": String(ownerB.activeVenueId) }),
  });
  assert.notEqual(tampered.response.status, 200);
  const secondaryAudit = await request("/api/audit?limit=5", {
    headers: sessionHeaders(ownerA, { "X-Venue-Id": String(secondaryVenue.body.activeVenueId) }),
  });
  assert.equal(secondaryAudit.response.status, 200);
  assert.equal(secondaryAudit.body.page.total, 0);

  const filtered = await getAudit(ownerA, "module=finance&q=%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82&monthKey=2026-07&limit=1");
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.rows.length, 1);
  assert.equal(filtered.body.rows[0].moduleKey, "finance");
  assert.equal(filtered.body.page.hasMore, true);

  const csv = await request("/api/audit?format=csv&module=finance", {
    headers: sessionHeaders(ownerA),
  });
  assert.equal(csv.response.status, 200);
  assert.match(csv.contentType, /text\/csv/);
  assert.match(csv.body, /Ремонт/);
  assert.doesNotMatch(csv.body, /Секрет venue B/);

  const closeRecord = [{
    id: "closing-2026-07",
    monthKey: "2026-07",
    status: "closed",
    closedAt: new Date().toISOString(),
    closedBy: "Виталий",
    reason: "Runtime acceptance",
    snapshot: { finalProfit: 1000 },
  }];
  result = await putStore(ownerA, "bd_month_closings", closeRecord, "Закрыт период 2026-07");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const blocked = await putStore(ownerA, "bd_finance_expenses", [{ ...repair1500, amount: 1700 }], "Попытка изменить закрытый период");
  assert.equal(blocked.response.status, 423, JSON.stringify(blocked.body));
  assert.equal(blocked.body.code, "MONTH_LOCKED");

  const lockedStoreKeys = [
    "bd_finance_revenue",
    "bd_finance_gap_reasons",
    "bd_inventory_snapshots",
    "bd_purchase_documents",
    "bd_sales_documents",
    "bd_payroll_entries",
  ];
  for (const key of lockedStoreKeys) {
    const lockedResult = await putStore(ownerA, key, [{
      id: `closed-${key}`,
      date: "2026-07-18",
      monthKey: "2026-07",
      name: `Runtime ${key}`,
      amount: 1,
    }], `Runtime-проверка MONTH_LOCKED для ${key}`);
    assert.equal(lockedResult.response.status, 423, `${key}: ${JSON.stringify(lockedResult.body)}`);
    assert.equal(lockedResult.body.code, "MONTH_LOCKED", key);
  }

  const immutableLedger = await putStore(ownerA, "bd_stock_movements", [{
    id: "closed-bd_stock_movements",
    date: "2026-07-18",
    amount: 1,
  }], "Runtime-проверка неизменяемого складского ledger");
  assert.equal(immutableLedger.response.status, 409, JSON.stringify(immutableLedger.body));
  assert.equal(immutableLedger.body.code, "IMMUTABLE_STOCK_LEDGER");

  result = await putStore(ownerA, "bd_equipment", [{
    id: "runtime-equipment",
    name: "Льдогенератор Runtime",
    status: "working",
  }], "Оборудование для runtime-проверки закрытого периода");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const lockedEquipment = await jsonRequest(ownerA, "/api/equipment/work-orders", "POST", {
    workOrder: {
      id: "runtime-closed-work-order",
      equipmentId: "runtime-equipment",
      kind: "repair",
      priority: "medium",
      title: "Ремонт в закрытом периоде",
      status: "detected",
      equipmentStatus: "needs_maintenance",
      cost: 100,
      costDate: "2026-07-19",
    },
    syncExpense: true,
  });
  assert.equal(lockedEquipment.response.status, 423, JSON.stringify(lockedEquipment.body));
  assert.equal(lockedEquipment.body.code, "MONTH_LOCKED");

  const localConnection = await jsonRequest(ownerA, "/api/integration-hub/connections", "POST", {
    adapterKey: "local-connector-v1",
    provider: "1С",
    displayName: "1С Runtime MONTH_LOCKED",
    sourceKey: `runtime-month-lock-${runId}`,
    enabledEntities: ["stock_balance"],
  });
  assert.equal(localConnection.response.status, 201, JSON.stringify(localConnection.body));
  const lockedIntegrationPayload = {
    protocolVersion: "1.0",
    connectionId: localConnection.body.connection.id,
    deliveryId: `runtime-closed-balance-${runId}`,
    entityType: "stock_balance",
    records: [{
      externalId: "closed-balance",
      productExternalId: "closed-product",
      productName: "Вода Runtime",
      warehouseExternalId: "main",
      quantity: 10,
      unit: "шт.",
      measuredAt: "2026-07-20",
    }],
    cursor: { updatedAt: "2026-07-20T12:00:00Z" },
  };
  const lockedIntegration = await request("/api/integration/v1/ingest", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localConnection.body.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lockedIntegrationPayload),
  });
  assert.equal(lockedIntegration.response.status, 202, JSON.stringify(lockedIntegration.body));
  assert.equal(lockedIntegration.body.run.status, "failed");
  assert.equal(lockedIntegration.body.run.errors.some((error) => error.code === "MONTH_LOCKED"), true);

  const storedAfterBlock = await jsonRequest(ownerA, "/api/store/bd_finance_expenses", "GET");
  assert.equal(storedAfterBlock.response.status, 200);
  assert.equal(storedAfterBlock.body.data[0].amount, 1500);

  const afterBlockAudit = await getAudit(ownerA, "limit=100");
  assert.equal(afterBlockAudit.body.overview.state.status, "attention");
  assert.equal(afterBlockAudit.body.rows.some((row) => row.action === "blocked" && row.integritySignal), true);
  assert.equal(afterBlockAudit.body.overview.periods.history.some((period) => period.monthKey === "2026-07" && period.status === "closed"), true);

  const reopened = [{
    ...closeRecord[0],
    status: "reopened",
    reopenedAt: new Date().toISOString(),
    reopenedBy: "Виталий",
    reopenReason: "Исправление runtime acceptance",
    reopenHistory: [{ reopenedAt: new Date().toISOString(), reopenedBy: "Виталий", reason: "Исправление runtime acceptance" }],
  }];
  result = await putStore(ownerA, "bd_month_closings", reopened, "Период 2026-07 открыт повторно");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await putStore(ownerA, "bd_finance_expenses", [{ ...repair1500, amount: 1600 }], "Исправление после открытия периода");
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const limitedInvite = await jsonRequest(ownerA, "/api/access", "POST", {
    role: "shift_manager",
    permissions: { allow: ["audit.view"], deny: [] },
  });
  assert.equal(limitedInvite.response.status, 201, JSON.stringify(limitedInvite.body));
  const limitedUser = await register("limited", "Менеджер", limitedInvite.body.invite.code);
  const limitedAudit = await getAudit(limitedUser, "module=finance&q=%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82&limit=20");
  assert.equal(limitedAudit.response.status, 200);
  assert.equal(limitedAudit.body.rows.some((row) => row.summary === "Значения скрыты согласно правам" && row.diffs.length === 0), true);

  const deniedInvite = await jsonRequest(ownerA, "/api/access", "POST", { role: "shift_manager" });
  assert.equal(deniedInvite.response.status, 201, JSON.stringify(deniedInvite.body));
  const deniedUser = await register("denied", "Сотрудник", deniedInvite.body.invite.code);
  const deniedAudit = await getAudit(deniedUser, "limit=5");
  assert.equal(deniedAudit.response.status, 403);

  const immutablePost = await jsonRequest(ownerA, "/api/audit", "POST", {});
  const immutablePatch = await jsonRequest(ownerA, "/api/audit", "PATCH", {});
  assert.equal(immutablePost.response.status, 405);
  assert.equal(immutablePatch.response.status, 405);

  const failureDatabase = await openLocalDatabase();
  let atomicFailureRolledBack = false;
  let concurrentConflictDetected = false;
  try {
    const beforeFailure = failureDatabase.prepare(`
      SELECT data_json, revision FROM domain_data
      WHERE account_id = ? AND store_key = 'bd_tasks'
    `).get(ownerA.userId);
    failureDatabase.exec("DROP TRIGGER IF EXISTS qa_step_1_4_fail_audit");
    failureDatabase.exec(`
      CREATE TRIGGER qa_step_1_4_fail_audit
      BEFORE INSERT ON audit_log
      WHEN NEW.reason = 'STEP_1_4_FAILURE_INJECTION'
      BEGIN
        SELECT RAISE(ABORT, 'intentional local audit failure');
      END
    `);
    const failedAtomicWrite = await putStore(
      ownerA,
      "bd_tasks",
      [...historySeed, { id: "must-rollback", title: "Не должно сохраниться" }],
      "STEP_1_4_FAILURE_INJECTION",
      historySeed,
    );
    assert.equal(failedAtomicWrite.response.status, 500);
    const afterFailure = failureDatabase.prepare(`
      SELECT data_json, revision FROM domain_data
      WHERE account_id = ? AND store_key = 'bd_tasks'
    `).get(ownerA.userId);
    assert.deepEqual(afterFailure, beforeFailure, "domain mutation survived a failed audit insert");
    atomicFailureRolledBack = true;
    failureDatabase.exec("DROP TRIGGER qa_step_1_4_fail_audit");

    const current = await jsonRequest(ownerA, "/api/store/bd_tasks", "GET");
    const writerA = [...current.body.data, { id: "parallel-shared", title: "Writer A" }];
    const writerB = [...current.body.data, { id: "parallel-shared", title: "Writer B" }];
    const [parallelA, parallelB] = await Promise.all([
      putStore(ownerA, "bd_tasks", writerA, "Parallel writer A", current.body.data),
      putStore(ownerA, "bd_tasks", writerB, "Parallel writer B", current.body.data),
    ]);
    assert.ok([200, 409].includes(parallelA.response.status), JSON.stringify(parallelA.body));
    assert.ok([200, 409].includes(parallelB.response.status), JSON.stringify(parallelB.body));
    assert.ok(parallelA.response.status === 200 || parallelB.response.status === 200);
    const afterParallel = await jsonRequest(ownerA, "/api/store/bd_tasks", "GET");
    const sharedRows = afterParallel.body.data.filter((item) => item.id === "parallel-shared");
    assert.equal(sharedRows.length, 1, "parallel writers duplicated the same business entity");
    if (parallelA.response.status === 200 && parallelB.response.status === 200) {
      concurrentConflictDetected = Number(parallelA.body.mergedConflicts || 0) > 0
        || Number(parallelB.body.mergedConflicts || 0) > 0;
    } else {
      const rejected = parallelA.response.status === 409 ? parallelA : parallelB;
      assert.equal(rejected.body.code, "STORE_CONCURRENT_MODIFICATION");
      concurrentConflictDetected = true;
    }
    assert.equal(concurrentConflictDetected, true, "parallel writers completed without a conflict signal");
  } finally {
    try { failureDatabase.exec("DROP TRIGGER IF EXISTS qa_step_1_4_fail_audit"); } catch {}
    failureDatabase.close();
  }

  const finalAudit = await getAudit(ownerA, "limit=100");
  assert.equal(finalAudit.response.status, 200);
  assert.equal(finalAudit.body.overview.periods.history.some((period) => period.monthKey === "2026-07" && period.status === "reopened"), true);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    readiness: { database: true, falsePositiveGreenPrevented: true, requestId: true },
    authentication: { unauthenticatedStatus: 401, auditPermissionDeniedStatus: 403 },
    journal: {
      create: true,
      update: true,
      delete: true,
      oldToNew: true,
      localConnectorSource: true,
      searchAndFilters: true,
      pagination: auditA.body.page.hasMore === true,
      csvExport: true,
    },
    periods: {
      close: true,
      monthLockedStatus: 423,
      blockedMutationPreservedData: true,
      protectedStoreKeys: ["bd_finance_expenses", ...lockedStoreKeys, "bd_stock_movements"],
      equipmentProtected: true,
      localConnectorProtected: true,
      reopen: true,
    },
    security: { auditImmutable: true, financialDiffRedacted: true, venueTamperingDenied: true },
    relationshipDiagnostic: { platformAdminOnly: true, venueUserStatus: diagnostic.response.status },
    multiVenue: { sameEntityIdIsolated: true, authorizedVenueSwitchIsolated: true, exportIsolated: true },
    atomicity: { auditFailureRolledBack: atomicFailureRolledBack },
    concurrency: { conflictDetected: concurrentConflictDetected },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${serverOutput}\n`);
  throw error;
} finally {
  stopServer();
}
