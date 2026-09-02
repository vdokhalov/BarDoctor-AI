import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import {
  KOLN_CURRENCY_RELABEL_VERSION,
  KOLN_CURRENCY_STORE_KEYS,
  KOLN_DATA_ACCOUNT_ID,
  KOLN_VENUE_ID,
  buildKolnCurrencyRelabel,
  type KolnCurrencyStores,
} from "../../../../lib/bardoctor/koln-currency-relabel";
import { stableJson } from "../../../../lib/bardoctor/authoritative-persistence";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";
import {
  migrationIntentAccepted,
  migrationOperationsEnabled,
  migrationOperationsUnavailable,
} from "../../../../lib/bardoctor/migration-guard";
import { adminForbidden, authenticatePlatformAdmin } from "../../../../lib/bardoctor/platform-admin";

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string; updated_at: string };
type AccountRow = {
  id: number;
  restaurant_json: string | null;
  updated_at: string;
  first_name: string;
  last_name: string | null;
  app_email: string;
  role: string;
};
type OperationRow = {
  operation_id: string;
  export_id: string;
  status: string;
  plan_json: string;
  before_checksum: string;
  after_checksum: string | null;
};
type ExportRow = { payload_json: string; checksum: string };
type RawState = {
  account: AccountRow;
  stores: Record<string, StoreRow>;
  untouchedManifest: Record<string, { checksum: string; updatedAt: string }>;
};

const INTENT = "apply-koln-production-currency-relabel";

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function parse(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function tokenAuthorized(request: Request): Promise<boolean> {
  const configured = String((env as unknown as Record<string, unknown>).KOLN_CURRENCY_RELABEL_TOKEN ?? "");
  const supplied = request.headers.get("x-koln-currency-relabel-token") ?? "";
  if (configured.length < 32 || supplied.length < 32) return false;
  const [left, right] = await Promise.all([sha256(configured), sha256(supplied)]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function authorized(request: Request): Promise<boolean> {
  return migrationIntentAccepted(request, INTENT)
    && await tokenAuthorized(request);
}

async function readState(): Promise<RawState> {
  const accountResult = await getD1().prepare(`
    SELECT id, restaurant_json, updated_at, first_name, last_name, app_email, role
    FROM accounts WHERE id = ? LIMIT 1
  `).bind(KOLN_DATA_ACCOUNT_ID).all<AccountRow>();
  const account = accountResult.results?.[0];
  if (!account) throw new Error("KOLN_ACCOUNT_NOT_FOUND");
  const storesResult = await getD1().prepare(`
    SELECT store_key, data_json, updated_at FROM domain_data WHERE account_id = ? ORDER BY store_key
  `).bind(KOLN_DATA_ACCOUNT_ID).all<StoreRow>();
  const rows = storesResult.results ?? [];
  const stores = Object.fromEntries(rows.map((row) => [row.store_key, row]));
  const missing = KOLN_CURRENCY_STORE_KEYS.filter((key) => !stores[key]);
  if (missing.length) throw new Error(`KOLN_STORE_MISSING:${missing.join(",")}`);
  const untouchedManifest = Object.fromEntries(await Promise.all(rows
    .filter((row) => !KOLN_CURRENCY_STORE_KEYS.includes(row.store_key as (typeof KOLN_CURRENCY_STORE_KEYS)[number]))
    .map(async (row) => [row.store_key, { checksum: await sha256(row.data_json), updatedAt: row.updated_at }])));
  return { account, stores, untouchedManifest };
}

function statePayload(state: RawState) {
  return {
    account: {
      id: state.account.id,
      restaurantJson: state.account.restaurant_json,
      updatedAt: state.account.updated_at,
    },
    stores: Object.fromEntries(KOLN_CURRENCY_STORE_KEYS.map((key) => [key, {
      dataJson: state.stores[key].data_json,
      updatedAt: state.stores[key].updated_at,
    }])),
    untouchedManifest: state.untouchedManifest,
  };
}

async function stateChecksum(state: RawState): Promise<string> {
  return sha256(stableJson(statePayload(state)));
}

function parsedStores(state: RawState): KolnCurrencyStores {
  return Object.fromEntries(KOLN_CURRENCY_STORE_KEYS.map((key) => [
    key,
    parse(state.stores[key].data_json, key === "bd_assortment_v1" ? {} : []),
  ])) as KolnCurrencyStores;
}

async function transformedState(state: RawState, now: string) {
  const result = buildKolnCurrencyRelabel({
    restaurant: parse(state.account.restaurant_json, {}),
    stores: parsedStores(state),
    now,
  });
  const restaurantJson = stableJson(result.restaurant);
  const storeJson = Object.fromEntries(KOLN_CURRENCY_STORE_KEYS.map((key) => [key, stableJson(result.stores[key])]));
  const checksum = await sha256(stableJson({ restaurantJson, storeJson, untouchedManifest: state.untouchedManifest }));
  return { result, restaurantJson, storeJson, checksum };
}

async function insertImmutableExport(input: {
  exportId: string;
  checksum: string;
  payload: unknown;
  counts: unknown;
  now: string;
}): Promise<D1PreparedStatement> {
  return getD1().prepare(`
    INSERT OR IGNORE INTO venue_migration_exports
      (export_id, venue_id, data_account_id, source_commit, schema_version, checksum,
       payload_json, record_counts_json, generated_at, created_by_account_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.exportId,
    KOLN_VENUE_ID,
    KOLN_DATA_ACCOUNT_ID,
    BARDOCTOR_SOURCE_COMMIT,
    KOLN_CURRENCY_RELABEL_VERSION,
    input.checksum,
    stableJson(input.payload),
    stableJson(input.counts),
    input.now,
    KOLN_DATA_ACCOUNT_ID,
    input.now,
  );
}

async function operation(operationId: string): Promise<OperationRow | null> {
  const result = await getD1().prepare(`
    SELECT operation_id, export_id, status, plan_json, before_checksum, after_checksum
    FROM venue_migration_operations WHERE operation_id = ? LIMIT 1
  `).bind(operationId).all<OperationRow>();
  return result.results?.[0] ?? null;
}

async function beforeExport(exportId: string): Promise<ExportRow | null> {
  const result = await getD1().prepare(`
    SELECT payload_json, checksum FROM venue_migration_exports WHERE export_id = ? LIMIT 1
  `).bind(exportId).all<ExportRow>();
  return result.results?.[0] ?? null;
}

async function rollbackFromBefore(input: {
  operation: OperationRow;
  expectedAfter: Awaited<ReturnType<typeof transformedState>>;
  reason: string;
}): Promise<{ rolledBack: boolean; changes: number[] }> {
  const exported = await beforeExport(input.operation.export_id);
  if (!exported) return { rolledBack: false, changes: [] };
  const payload = record(parse(exported.payload_json, {}));
  const state = record(payload.state);
  const account = record(state.account);
  const stores = record(state.stores);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    getD1().prepare(`
      UPDATE accounts SET restaurant_json = ?, updated_at = ?
      WHERE id = ? AND restaurant_json = ?
    `).bind(
      account.restaurantJson ?? null,
      String(account.updatedAt ?? now),
      KOLN_DATA_ACCOUNT_ID,
      input.expectedAfter.restaurantJson,
    ),
    ...KOLN_CURRENCY_STORE_KEYS.map((key) => {
      const beforeRow = record(stores[key]);
      return getD1().prepare(`
        UPDATE domain_data SET data_json = ?, updated_at = ?
        WHERE account_id = ? AND store_key = ? AND data_json = ?
      `).bind(
        String(beforeRow.dataJson ?? ""),
        String(beforeRow.updatedAt ?? now),
        KOLN_DATA_ACCOUNT_ID,
        key,
        input.expectedAfter.storeJson[key],
      );
    }),
  ];
  const results = await getD1().batch(statements);
  const changes = results.map((result) => Number(result.meta.changes ?? 0));
  const rolledBack = changes.every((value) => value === 1);
  await getD1().prepare(`
    UPDATE venue_migration_operations
    SET status = ?, rollback_at = ?, failure_reason = ?, updated_at = ?
    WHERE operation_id = ?
  `).bind(
    rolledBack ? "rolled_back" : "rollback_failed",
    now,
    input.reason,
    now,
    input.operation.operation_id,
  ).run();
  return { rolledBack, changes };
}

function publicSummary(result: ReturnType<typeof buildKolnCurrencyRelabel>) {
  return {
    counts: result.counts,
    reconciliation: result.reconciliation,
    numericChanges: result.numericChanges,
    sourceVerification: {
      preserved: result.sourceVerification.preserved,
      oranges: {
        id: result.sourceVerification.oranges.id,
        quantity: result.sourceVerification.oranges.quantity,
        unitPrice: result.sourceVerification.oranges.unitPrice,
        lineTotal: result.sourceVerification.oranges.lineTotal,
      },
      teaBags: {
        id: result.sourceVerification.teaBags.id,
        quantity: result.sourceVerification.teaBags.quantity,
        unitPrice: result.sourceVerification.teaBags.unitPrice,
        lineTotal: result.sourceVerification.teaBags.lineTotal,
      },
    },
  };
}

async function prepare(): Promise<Response> {
  const state = await readState();
  const now = new Date().toISOString();
  const beforeChecksum = await stateChecksum(state);
  const transformed = await transformedState(state, now);
  const beforeCore = {
    schemaVersion: KOLN_CURRENCY_RELABEL_VERSION,
    phase: "before",
    venue: { id: KOLN_VENUE_ID, name: "Кёльн", dataAccountId: KOLN_DATA_ACCOUNT_ID },
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
    generatedAt: now,
    state: statePayload(state),
    stateChecksum: beforeChecksum,
  };
  const beforeExportChecksum = await sha256(stableJson(beforeCore));
  const exportId = `bdx_koln_currency_before_${beforeExportChecksum.slice(0, 24)}`;
  const operationId = `bdm_koln_currency_${(await sha256(stableJson({ beforeChecksum, afterChecksum: transformed.checksum }))).slice(0, 24)}`;
  const existing = await operation(operationId);
  if (existing) {
    return Response.json({
      ok: true,
      idempotent: true,
      operationId,
      status: existing.status,
      beforeExportId: existing.export_id,
      summary: publicSummary(transformed.result),
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const plan = {
    version: KOLN_CURRENCY_RELABEL_VERSION,
    beforeChecksum,
    afterChecksum: transformed.checksum,
    preparedAt: now,
    beforeExportId: exportId,
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
    sourceManifest: statePayload(state),
    summary: publicSummary(transformed.result),
    rollback: "Restore exact raw restaurant_json and five domain_data rows from immutable before export.",
  };
  const exportStatement = await insertImmutableExport({
    exportId,
    checksum: beforeExportChecksum,
    payload: beforeCore,
    counts: transformed.result.counts,
    now,
  });
  await getD1().batch([
    exportStatement,
    getD1().prepare(`
      INSERT INTO venue_migration_operations
        (operation_id, venue_id, data_account_id, export_id, source_commit, status, plan_json,
         affected_store_keys_json, before_checksum, after_checksum, created_by_account_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      operationId,
      KOLN_VENUE_ID,
      KOLN_DATA_ACCOUNT_ID,
      exportId,
      BARDOCTOR_SOURCE_COMMIT,
      stableJson(plan),
      stableJson(["accounts.restaurant_json", ...KOLN_CURRENCY_STORE_KEYS]),
      beforeChecksum,
      transformed.checksum,
      KOLN_DATA_ACCOUNT_ID,
      now,
      now,
    ),
  ]);
  return Response.json({
    ok: true,
    idempotent: false,
    operationId,
    status: "prepared",
    nextPhase: "apply",
    beforeExportId: exportId,
    beforeChecksum,
    expectedAfterChecksum: transformed.checksum,
    summary: publicSummary(transformed.result),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

async function apply(operationId: string): Promise<Response> {
  const currentOperation = await operation(operationId);
  if (!currentOperation) return Response.json({ ok: false, code: "OPERATION_NOT_FOUND" }, { status: 404 });
  if (currentOperation.status === "migrated") {
    return Response.json({ ok: true, idempotent: true, operationId, status: "migrated" });
  }
  if (currentOperation.status !== "prepared") {
    return Response.json({ ok: false, code: "OPERATION_NOT_PREPARED", status: currentOperation.status }, { status: 409 });
  }
  const plan = record(parse(currentOperation.plan_json, {}));
  const state = await readState();
  const currentChecksum = await stateChecksum(state);
  if (currentChecksum !== currentOperation.before_checksum) {
    return Response.json({ ok: false, code: "SOURCE_CHANGED_AFTER_PREPARE" }, { status: 409 });
  }
  const transformed = await transformedState(state, String(plan.preparedAt ?? new Date().toISOString()));
  if (transformed.checksum !== currentOperation.after_checksum) {
    return Response.json({ ok: false, code: "PREPARED_RESULT_DRIFT" }, { status: 409 });
  }
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    getD1().prepare(`
      UPDATE accounts SET restaurant_json = ?, updated_at = ?
      WHERE id = ? AND restaurant_json = ? AND updated_at = ?
    `).bind(
      transformed.restaurantJson,
      now,
      KOLN_DATA_ACCOUNT_ID,
      state.account.restaurant_json,
      state.account.updated_at,
    ),
    ...KOLN_CURRENCY_STORE_KEYS.map((key) => getD1().prepare(`
      UPDATE domain_data SET data_json = ?, updated_at = ?
      WHERE account_id = ? AND store_key = ? AND data_json = ? AND updated_at = ?
    `).bind(
      transformed.storeJson[key],
      now,
      KOLN_DATA_ACCOUNT_ID,
      key,
      state.stores[key].data_json,
      state.stores[key].updated_at,
    )),
    getD1().prepare(`
      UPDATE venue_migration_operations SET status = 'applied', updated_at = ?
      WHERE operation_id = ? AND status = 'prepared'
    `).bind(now, operationId),
  ];
  const results = await getD1().batch(statements);
  const changes = results.map((result) => Number(result.meta.changes ?? 0));
  if (!changes.every((value) => value === 1)) {
    const rollback = await rollbackFromBefore({ operation: currentOperation, expectedAfter: transformed, reason: `ATOMIC_WRITE_CONFLICT:${changes.join(",")}` });
    return Response.json({ ok: false, code: "ATOMIC_WRITE_CONFLICT", changes, rollback }, { status: 409 });
  }
  return Response.json({
    ok: true,
    operationId,
    status: "applied",
    changedRows: 6,
    nextPhase: "validate",
    expectedAfterChecksum: transformed.checksum,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

async function validate(operationId: string): Promise<Response> {
  const currentOperation = await operation(operationId);
  if (!currentOperation) return Response.json({ ok: false, code: "OPERATION_NOT_FOUND" }, { status: 404 });
  if (currentOperation.status === "migrated") {
    const plan = record(parse(currentOperation.plan_json, {}));
    return Response.json({ ok: true, idempotent: true, operationId, status: "migrated", summary: plan.summary });
  }
  if (currentOperation.status !== "applied") {
    return Response.json({ ok: false, code: "OPERATION_NOT_APPLIED", status: currentOperation.status }, { status: 409 });
  }
  const exported = await beforeExport(currentOperation.export_id);
  if (!exported) return Response.json({ ok: false, code: "BEFORE_EXPORT_MISSING" }, { status: 500 });
  const beforePayload = record(parse(exported.payload_json, {}));
  const beforeStatePayload = record(beforePayload.state);
  const syntheticBeforeState = {
    account: {
      id: KOLN_DATA_ACCOUNT_ID,
      restaurant_json: record(beforeStatePayload.account).restaurantJson as string | null,
      updated_at: String(record(beforeStatePayload.account).updatedAt ?? ""),
      first_name: "",
      last_name: null,
      app_email: "",
      role: "owner",
    },
    stores: Object.fromEntries(KOLN_CURRENCY_STORE_KEYS.map((key) => {
      const row = record(record(beforeStatePayload.stores)[key]);
      return [key, { store_key: key, data_json: String(row.dataJson ?? ""), updated_at: String(row.updatedAt ?? "") }];
    })),
    untouchedManifest: record(beforeStatePayload.untouchedManifest) as RawState["untouchedManifest"],
  } as RawState;
  const plan = record(parse(currentOperation.plan_json, {}));
  const expectedAfter = await transformedState(syntheticBeforeState, String(plan.preparedAt ?? ""));
  const state = await readState();
  const actualAfter = await transformedState(syntheticBeforeState, String(plan.preparedAt ?? ""));
  const currentRawChecksum = await sha256(stableJson({
    restaurantJson: state.account.restaurant_json,
    storeJson: Object.fromEntries(KOLN_CURRENCY_STORE_KEYS.map((key) => [key, state.stores[key].data_json])),
    untouchedManifest: state.untouchedManifest,
  }));
  const untouchedPreserved = stableJson(state.untouchedManifest) === stableJson(syntheticBeforeState.untouchedManifest);
  if (currentRawChecksum !== currentOperation.after_checksum || actualAfter.checksum !== currentOperation.after_checksum || !untouchedPreserved) {
    const rollback = await rollbackFromBefore({
      operation: currentOperation,
      expectedAfter,
      reason: `POST_MIGRATION_INVARIANT_FAILED:checksum=${currentRawChecksum}:untouched=${untouchedPreserved}`,
    });
    return Response.json({ ok: false, code: "POST_MIGRATION_INVARIANT_FAILED", rollback }, { status: 500 });
  }
  const now = new Date().toISOString();
  const afterCore = {
    schemaVersion: KOLN_CURRENCY_RELABEL_VERSION,
    phase: "after",
    venue: { id: KOLN_VENUE_ID, name: "Кёльн", dataAccountId: KOLN_DATA_ACCOUNT_ID },
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
    generatedAt: now,
    state: statePayload(state),
    stateChecksum: currentRawChecksum,
    reconciliation: publicSummary(expectedAfter.result),
    beforeExportId: currentOperation.export_id,
  };
  const afterExportChecksum = await sha256(stableJson(afterCore));
  const afterExportId = `bdx_koln_currency_after_${afterExportChecksum.slice(0, 24)}`;
  const afterExportStatement = await insertImmutableExport({
    exportId: afterExportId,
    checksum: afterExportChecksum,
    payload: afterCore,
    counts: expectedAfter.result.counts,
    now,
  });
  const actorName = [state.account.first_name, state.account.last_name].filter(Boolean).join(" ") || state.account.app_email;
  await getD1().batch([
    afterExportStatement,
    getD1().prepare(`
      UPDATE venue_migration_operations
      SET status = 'migrated', cutover_at = ?, updated_at = ?, plan_json = ?
      WHERE operation_id = ? AND status = 'applied'
    `).bind(
      now,
      now,
      stableJson({ ...plan, afterExportId, validatedAt: now, summary: publicSummary(expectedAfter.result) }),
      operationId,
    ),
    getD1().prepare(`
      INSERT INTO audit_log
        (account_id, store_key, action, entity_id, entity_label, before_json, after_json,
         changed_fields_json, actor_name, actor_role, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      KOLN_DATA_ACCOUNT_ID,
      "koln_currency_relabel",
      "controlled_currency_relabel",
      operationId,
      "Кёльн · RUB/MDL → PMR_RUB",
      stableJson({ exportId: currentOperation.export_id, checksum: currentOperation.before_checksum }),
      stableJson({ exportId: afterExportId, checksum: currentRawChecksum, summary: publicSummary(expectedAfter.result) }),
      stableJson(["currency_labels", "accounting_money_fields", "white_stork_valuation"]),
      actorName,
      state.account.role,
      "User-authorized label correction only; all historical RUB/MDL mean PMR_RUB; no FX and no source amount changes",
      now,
    ),
  ]);
  return Response.json({
    ok: true,
    operationId,
    status: "migrated",
    beforeExportId: currentOperation.export_id,
    afterExportId,
    beforeChecksum: currentOperation.before_checksum,
    afterChecksum: currentRawChecksum,
    afterExportChecksum,
    untouchedStoresPreserved: untouchedPreserved,
    summary: publicSummary(expectedAfter.result),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!migrationOperationsEnabled()) return migrationOperationsUnavailable();
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  if (!await authorized(request)) {
    return Response.json({ ok: false, code: "MIGRATION_AUTHORIZATION_REQUIRED" }, { status: 403 });
  }
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase") || "prepare";
  const operationId = url.searchParams.get("operationId") || "";
  try {
    if (phase === "prepare") return await prepare();
    if (!operationId) return Response.json({ ok: false, code: "OPERATION_ID_REQUIRED" }, { status: 400 });
    if (phase === "apply") return await apply(operationId);
    if (phase === "validate") return await validate(operationId);
    return Response.json({ ok: false, code: "UNKNOWN_PHASE" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_MIGRATION_ERROR";
    return Response.json({ ok: false, code: message.split(":")[0], error: message }, { status: 409 });
  }
}
