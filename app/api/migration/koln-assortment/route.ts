import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { auditLog, venueMigrationExports, venueMigrationOperations } from "../../../../db/schema";
import { buildAssortmentMigrationPreview } from "../../../../lib/bardoctor/assortment-migration-preview";
import {
  authenticateIdentityRequest, findAccountByAppEmail, getChatGPTEmail, unauthorized, venueContextForAccount,
} from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { buildKolnAssortmentReconciliation } from "../../../../lib/bardoctor/koln-assortment-migration";
import { PURCHASE_STORE_KEY, SUPPLIER_STORE_KEY } from "../../../../lib/bardoctor/purchases";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";

type StoreRow = { store_key: string; data_json: string; updated_at: string };
type JsonRecord = Record<string, unknown>;
const VENUE_ID = 1;
const DATA_ACCOUNT_ID = 1;
const VERSION = "koln-canonical-assortment-reconciliation-v2";
const INVENTORY_SNAPSHOT_STORE_KEY = "bd_inventory_snapshots";
const EXPENSE_STORE_KEY = "bd_finance_expenses";
const REQUIRED = [ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, PURCHASE_STORE_KEY, INVENTORY_SNAPSHOT_STORE_KEY, SUPPLIER_STORE_KEY] as const;
const PROTECTED = [PURCHASE_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, SUPPLIER_STORE_KEY, INVENTORY_SNAPSHOT_STORE_KEY, EXPENSE_STORE_KEY] as const;

function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}
function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function count(value: unknown): number { return Array.isArray(value) ? value.length : 0; }
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function owner(request: Request) {
  const session = await authenticateIdentityRequest(request);
  const email = getChatGPTEmail(request);
  const chatgpt = email ? await findAccountByAppEmail(email) : null;
  const identities = [session, chatgpt].filter((identity, index, rows) =>
    Boolean(identity) && rows.findIndex((row) => row?.id === identity?.id) === index
  );
  for (const identity of identities) {
    const context = await venueContextForAccount(identity!, VENUE_ID);
    if (context?.role === "owner" && context.venue.id === VENUE_ID && context.dataAccount.id === DATA_ACCOUNT_ID) return identity!;
  }
  return null;
}
async function stores() {
  const keys = [...REQUIRED, EXPENSE_STORE_KEY];
  const placeholders = keys.map(() => "?").join(", ");
  const result = await getD1().prepare(`
    SELECT store_key, data_json, updated_at FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(DATA_ACCOUNT_ID, ...keys).all<StoreRow>();
  return new Map((result.results ?? []).map((row) => [row.store_key, row]));
}
function manifest(rows: Map<string, StoreRow>) {
  return Object.fromEntries(PROTECTED.map((key) => {
    const row = rows.get(key);
    return [key, row ? {
      exists: true, updatedAt: row.updated_at, bytes: row.data_json.length, records: count(parse(row.data_json, [])),
    } : { exists: false }];
  }));
}
function previewFrom(rows: Map<string, StoreRow>) {
  return buildAssortmentMigrationPreview({
    venueId: VENUE_ID,
    purchases: parse(rows.get(PURCHASE_STORE_KEY)?.data_json, []),
    suppliers: parse(rows.get(SUPPLIER_STORE_KEY)?.data_json, []),
    stockMovements: parse(rows.get(STOCK_MOVEMENT_STORE_KEY)?.data_json, []),
    serverAssortmentExists: rows.has(ASSORTMENT_STORE_KEY),
    sourceStorePresence: {
      purchases: rows.has(PURCHASE_STORE_KEY), suppliers: rows.has(SUPPLIER_STORE_KEY),
      stockMovements: rows.has(STOCK_MOVEMENT_STORE_KEY), assortment: rows.has(ASSORTMENT_STORE_KEY),
    },
  });
}
function publicResult(operation: typeof venueMigrationOperations.$inferSelect) {
  const plan = record(parse(operation.planJson, {}));
  return {
    ok: true, idempotent: true, operationId: operation.operationId, status: operation.status,
    result: record(plan.reconciliation), invariants: record(plan.invariants), featureFlag: "legacy",
  };
}

export async function GET(request: Request): Promise<Response> {
  if (!await owner(request)) return unauthorized();
  const rows = await stores();
  return Response.json({ ok: true, preview: previewFrom(rows) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const actor = await owner(request);
  if (!actor) return unauthorized();
  if (!sameOrigin(request) || request.headers.get("x-migration-intent") !== "apply-koln-safe-canonical-assortment") {
    return Response.json({ ok: false, code: "MIGRATION_INTENT_REQUIRED", error: "Запрос миграции отклонён" }, { status: 403 });
  }
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase") || "prepare";
  const requestedOperationId = url.searchParams.get("operationId") || "";

  if (phase === "prepare") {
    const beforeRows = await stores();
    const missing = [PURCHASE_STORE_KEY, SUPPLIER_STORE_KEY, STOCK_MOVEMENT_STORE_KEY].filter((key) => !beforeRows.has(key));
    if (missing.length) return Response.json({ ok: false, code: "SOURCE_STORE_MISSING", missing }, { status: 409 });
    const preview = previewFrom(beforeRows);
    if (!preview.proposal.safePositions || preview.duplicates.identifierConflicts.length) {
      return Response.json({ ok: false, code: "NO_SAFE_MIGRATION_SET", preview }, { status: 409 });
    }
    const beforeAssortmentJson = beforeRows.get(ASSORTMENT_STORE_KEY)?.data_json;
    const existingAssortment = parse(beforeAssortmentJson, {});
    const beforeChecksum = await sha256(beforeAssortmentJson ?? "__missing__");
    const sourceManifest = manifest(beforeRows);
    const backupCore = {
      schemaVersion: VERSION,
      venue: { id: VENUE_ID, name: "Кёльн", dataAccountId: DATA_ACCOUNT_ID },
      sourceCommit: BARDOCTOR_SOURCE_COMMIT,
      affectedStores: {
        [ASSORTMENT_STORE_KEY]: {
          exists: beforeAssortmentJson !== undefined,
          updatedAt: beforeRows.get(ASSORTMENT_STORE_KEY)?.updated_at ?? null,
          data: existingAssortment,
        },
      },
      protectedStoreManifest: sourceManifest,
    };
    const backupChecksum = await sha256(JSON.stringify(backupCore));
    const exportId = `bdx_koln_${backupChecksum.slice(0, 24)}`;
    const operationId = `bdm_koln_${(await sha256(JSON.stringify({ version: VERSION, backupChecksum, sourceManifest }))).slice(0, 24)}`;
    const [existingOperation] = await getDb().select().from(venueMigrationOperations)
      .where(eq(venueMigrationOperations.operationId, operationId)).limit(1);
    if (existingOperation?.status === "migrated") return Response.json(publicResult(existingOperation));
    const now = existingOperation?.createdAt ?? new Date().toISOString();
    const reconciliation = buildKolnAssortmentReconciliation({ venueId: VENUE_ID, existingAssortment, preview, operationId, now });
    const afterAssortmentJson = JSON.stringify(reconciliation.assortment);
    const afterChecksum = await sha256(afterAssortmentJson);
    const root = record(existingAssortment);
    const plan = {
      preview: {
        sources: preview.sources, coverage: preview.coverage,
        proposal: {
          totalPositions: preview.proposal.totalPositions, safePositions: preview.proposal.safePositions,
          reviewPositions: preview.proposal.reviewPositions, statusCounts: preview.proposal.statusCounts,
        },
        blockers: preview.blockers, verdict: preview.verdict,
      },
      reconciliation: reconciliation.summary,
      sourceManifest,
      invariants: {
        protectedPreserved: false, menuPreserved: false, recipesPreserved: false,
        menuChecksum: await sha256(JSON.stringify(root.menuItems ?? [])),
        recipesChecksum: await sha256(JSON.stringify(root.recipes ?? [])),
      },
      rollback: "Restore exact bd_assortment_v1 snapshot only when current checksum matches operation afterChecksum",
    };
    const backupPayload = JSON.stringify({ ...backupCore, exportId, checksum: backupChecksum, generatedAt: now });
    await getD1().batch([
      getD1().prepare(`INSERT OR IGNORE INTO venue_migration_exports
        (export_id, venue_id, data_account_id, source_commit, schema_version, checksum, payload_json, record_counts_json, generated_at, created_by_account_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          exportId, VENUE_ID, DATA_ACCOUNT_ID, BARDOCTOR_SOURCE_COMMIT, VERSION, backupChecksum, backupPayload,
          JSON.stringify({ affectedStores: 1, protectedStores: PROTECTED.length, canonicalPositions: count(root.nomenclature) }),
          now, actor.id, now,
        ),
      getD1().prepare(`INSERT OR IGNORE INTO venue_migration_operations
        (operation_id, venue_id, data_account_id, export_id, source_commit, status, plan_json, affected_store_keys_json, before_checksum, after_checksum, created_by_account_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?, ?, ?, ?, ?, ?)`).bind(
          operationId, VENUE_ID, DATA_ACCOUNT_ID, exportId, BARDOCTOR_SOURCE_COMMIT, JSON.stringify(plan),
          JSON.stringify([ASSORTMENT_STORE_KEY]), beforeChecksum, afterChecksum, actor.id, now, now,
        ),
    ]);
    return Response.json({ ok: true, operationId, status: "prepared", nextPhase: "apply" }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (!requestedOperationId) return Response.json({ ok: false, code: "OPERATION_ID_REQUIRED" }, { status: 400 });
  const [operation] = await getDb().select().from(venueMigrationOperations)
    .where(eq(venueMigrationOperations.operationId, requestedOperationId)).limit(1);
  if (!operation || operation.venueId !== VENUE_ID || operation.dataAccountId !== DATA_ACCOUNT_ID) {
    return Response.json({ ok: false, code: "MIGRATION_OPERATION_NOT_FOUND" }, { status: 404 });
  }
  if (operation.status === "migrated") return Response.json(publicResult(operation));

  if (phase === "apply") {
    const beforeRows = await stores();
    const plan = record(parse(operation.planJson, {}));
    if (JSON.stringify(manifest(beforeRows)) !== JSON.stringify(plan.sourceManifest)) {
      return Response.json({
        ok: false, code: "SOURCE_CHANGED_AFTER_PREPARE",
        error: "Источники изменились после snapshot; подготовку нужно повторить",
      }, { status: 409 });
    }
    const currentAssortmentJson = beforeRows.get(ASSORTMENT_STORE_KEY)?.data_json;
    const currentChecksum = await sha256(currentAssortmentJson ?? "__missing__");
    if (currentChecksum === operation.afterChecksum) {
      await getDb().update(venueMigrationOperations).set({ status: "applied", updatedAt: new Date().toISOString() })
        .where(eq(venueMigrationOperations.operationId, operation.operationId));
      return Response.json({
        ok: true, operationId: operation.operationId, status: "applied", idempotent: true, nextPhase: "validate",
      });
    }
    if (currentChecksum !== operation.beforeChecksum) {
      return Response.json({ ok: false, code: "ASSORTMENT_CHANGED_AFTER_PREPARE" }, { status: 409 });
    }
    const preview = previewFrom(beforeRows);
    const reconciliation = buildKolnAssortmentReconciliation({
      venueId: VENUE_ID, existingAssortment: parse(currentAssortmentJson, {}), preview,
      operationId: operation.operationId, now: operation.createdAt,
    });
    const afterAssortmentJson = JSON.stringify(reconciliation.assortment);
    if (await sha256(afterAssortmentJson) !== operation.afterChecksum) {
      return Response.json({ ok: false, code: "PREPARED_RESULT_DRIFT" }, { status: 409 });
    }
    let changed = 0;
    if (currentAssortmentJson !== undefined) {
      const result = await getD1().prepare(`UPDATE domain_data SET data_json = ?, updated_at = ?
        WHERE account_id = ? AND store_key = ? AND data_json = ?`).bind(
          afterAssortmentJson, new Date().toISOString(), DATA_ACCOUNT_ID, ASSORTMENT_STORE_KEY, currentAssortmentJson,
        ).run();
      changed = Number(result.meta.changes ?? 0);
    } else {
      const result = await getD1().prepare(`INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(account_id, store_key) DO NOTHING`).bind(
          DATA_ACCOUNT_ID, ASSORTMENT_STORE_KEY, afterAssortmentJson, new Date().toISOString(),
        ).run();
      changed = Number(result.meta.changes ?? 0);
    }
    if (changed !== 1) return Response.json({ ok: false, code: "OPTIMISTIC_WRITE_CONFLICT" }, { status: 409 });
    await getDb().update(venueMigrationOperations).set({ status: "applied", updatedAt: new Date().toISOString() })
      .where(eq(venueMigrationOperations.operationId, operation.operationId));
    return Response.json({
      ok: true, operationId: operation.operationId, status: "applied", changedRows: changed, nextPhase: "validate",
    });
  }

  if (phase === "validate") {
    const afterRows = await stores();
    const persistedAssortmentJson = afterRows.get(ASSORTMENT_STORE_KEY)?.data_json;
    const persistedChecksum = await sha256(persistedAssortmentJson ?? "__missing__");
    const plan = record(parse(operation.planJson, {}));
    const expectedInvariants = record(plan.invariants);
    const root = record(parse(persistedAssortmentJson, {}));
    const protectedPreserved = JSON.stringify(manifest(afterRows)) === JSON.stringify(plan.sourceManifest);
    const menuPreserved = await sha256(JSON.stringify(root.menuItems ?? [])) === expectedInvariants.menuChecksum;
    const recipesPreserved = await sha256(JSON.stringify(root.recipes ?? [])) === expectedInvariants.recipesChecksum;
    if (persistedChecksum !== operation.afterChecksum || !protectedPreserved || !menuPreserved || !recipesPreserved) {
      await getDb().update(venueMigrationOperations).set({
        status: "validation_failed", failureReason: "POST_MIGRATION_INVARIANT_FAILED", updatedAt: new Date().toISOString(),
      }).where(eq(venueMigrationOperations.operationId, operation.operationId));
      return Response.json({ ok: false, code: "POST_MIGRATION_INVARIANT_FAILED" }, { status: 500 });
    }
    const invariants = { protectedPreserved, menuPreserved, recipesPreserved };
    const finalizedPlan = { ...plan, invariants: { ...expectedInvariants, ...invariants } };
    const cutoverAt = new Date().toISOString();
    await getDb().update(venueMigrationOperations).set({
      status: "migrated", planJson: JSON.stringify(finalizedPlan), cutoverAt, updatedAt: cutoverAt,
    }).where(eq(venueMigrationOperations.operationId, operation.operationId));
    const result = record(plan.reconciliation);
    await getDb().insert(auditLog).values({
      accountId: DATA_ACCOUNT_ID, storeKey: ASSORTMENT_STORE_KEY, action: "controlled_canonical_migration",
      entityId: operation.operationId, entityLabel: "Кёльн · canonical assortment",
      beforeJson: JSON.stringify({ checksum: operation.beforeChecksum }),
      afterJson: JSON.stringify({ checksum: operation.afterChecksum, ...result, changedRows: 1 }),
      changedFieldsJson: JSON.stringify([
        "nomenclature", "stockBalances", "supplierProductMappings", "inventoryProductAliases",
        "migrationReviewQueue", "migrationHistory",
      ]),
      actorName: [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.appEmail,
      actorRole: actor.role,
      reason: "User-authorized additive canonical assortment migration; historical and financial stores preserved",
    });
    console.info("KOLN_ASSORTMENT_MIGRATION_RESULT", JSON.stringify({
      operationId: operation.operationId, summary: result, invariants, featureFlag: "legacy",
    }));
    return Response.json({
      ok: true, idempotent: false, operationId: operation.operationId, status: "migrated",
      result, invariants, featureFlag: "legacy",
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  return Response.json({ ok: false, code: "UNKNOWN_MIGRATION_PHASE" }, { status: 400 });
}
