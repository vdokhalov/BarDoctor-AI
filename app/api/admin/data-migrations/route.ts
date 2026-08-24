import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import {
  domainData,
  venueMigrationExports,
  venueMigrationOperations,
} from "../../../../db/schema";
import {
  buildControlledPlatformDryRun,
  PHASE_B_CONFIRMATION,
  type VenueMigrationPlan,
} from "../../../../lib/bardoctor/controlled-server-migration";
import { stableJson } from "../../../../lib/bardoctor/authoritative-persistence";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  adminForbidden,
  adminJson,
  authenticatePlatformAdmin,
  recordPlatformAdminAudit,
} from "../../../../lib/bardoctor/platform-admin";
import {
  readPlatformPersistenceInventory,
  sanitizeLegacyCandidates,
} from "../../../../lib/bardoctor/platform-persistence-service";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";

type MigrationAction = "dry_run" | "persist_phase_a_backups" | "migrate_safe_venue" | "rollback_fixture_only";

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function summary(plan: VenueMigrationPlan) {
  return {
    ...plan,
    backup: {
      exportId: plan.backup.exportId,
      checksum: plan.backup.checksum,
      immutable: plan.backup.immutable,
      readOnly: plan.backup.readOnly,
      sourceCommit: plan.backup.sourceCommit,
    },
    writes: plan.writes.map((write) => ({
      storeKey: write.storeKey,
      strategy: write.strategy,
      records: write.records,
      lineage: write.lineage,
    })),
  };
}

async function dryRun(legacyCandidatesByVenue: unknown) {
  const inventory = await readPlatformPersistenceInventory(sanitizeLegacyCandidates(legacyCandidatesByVenue));
  const report = await buildControlledPlatformDryRun({
    venues: inventory.venues,
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
  });
  return { inventory, report };
}

async function persistBackup(plan: VenueMigrationPlan, adminAccountId: number): Promise<void> {
  await getDb().insert(venueMigrationExports).values({
    exportId: plan.backup.exportId,
    venueId: plan.venue.id,
    dataAccountId: plan.venue.dataAccountId,
    sourceCommit: plan.sourceCommit,
    schemaVersion: plan.backup.payload.schemaVersion,
    checksum: plan.backup.checksum.value,
    payloadJson: stableJson(plan.backup.payload),
    recordCountsJson: stableJson(plan.backup.payload.counts),
    generatedAt: plan.generatedAt,
    createdByAccountId: adminAccountId,
  }).onConflictDoNothing({ target: venueMigrationExports.exportId });
  const [persisted] = await getDb().select().from(venueMigrationExports)
    .where(eq(venueMigrationExports.exportId, plan.backup.exportId)).limit(1);
  if (!persisted || persisted.checksum !== plan.backup.checksum.value
    || persisted.venueId !== plan.venue.id || persisted.dataAccountId !== plan.venue.dataAccountId) {
    throw new Error("IMMUTABLE_BACKUP_VERIFICATION_FAILED");
  }
}

async function executeSafeVenueMigration(plan: VenueMigrationPlan, adminAccountId: number) {
  const db = getDb();
  const [existingOperation] = await db.select().from(venueMigrationOperations)
    .where(eq(venueMigrationOperations.operationId, plan.operationId)).limit(1);
  if (existingOperation?.status === "migrated") {
    return { idempotent: true, operationId: plan.operationId, status: existingOperation.status };
  }
  await persistBackup(plan, adminAccountId);
  const now = new Date().toISOString();
  const afterStoreChecksums = Object.fromEntries(await Promise.all(plan.writes.map(async (write) => [
    write.storeKey,
    await sha256(stableJson(write.data)),
  ])));
  const statements: D1PreparedStatement[] = [
    getD1().prepare(`
      INSERT INTO venue_migration_operations (
        operation_id, venue_id, data_account_id, export_id, source_commit, status,
        plan_json, affected_store_keys_json, before_checksum, created_by_account_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(operation_id) DO NOTHING
    `).bind(
      plan.operationId,
      plan.venue.id,
      plan.venue.dataAccountId,
      plan.backup.exportId,
      plan.sourceCommit,
      stableJson(summary(plan)),
      stableJson(plan.writes.map((write) => write.storeKey)),
      plan.backup.checksum.value,
      adminAccountId,
      now,
      now,
    ),
    ...plan.writes.map((write) => getD1().prepare(`
      INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, store_key) DO NOTHING
    `).bind(plan.venue.dataAccountId, write.storeKey, stableJson(write.data), now)),
  ];
  await getD1().batch(statements);

  const rows = await db.select({ storeKey: domainData.storeKey, dataJson: domainData.dataJson })
    .from(domainData).where(eq(domainData.accountId, plan.venue.dataAccountId));
  const byKey = new Map(rows.map((row) => [row.storeKey, row.dataJson]));
  const mismatches: string[] = [];
  for (const write of plan.writes) {
    const persisted = byKey.get(write.storeKey);
    if (!persisted || await sha256(stableJson(JSON.parse(persisted))) !== afterStoreChecksums[write.storeKey]) {
      mismatches.push(write.storeKey);
    }
  }
  if (mismatches.length) {
    await db.update(venueMigrationOperations).set({
      status: "validation_failed",
      failureReason: `STORE_CHECKSUM_MISMATCH:${mismatches.join(",")}`,
      updatedAt: new Date().toISOString(),
    }).where(eq(venueMigrationOperations.operationId, plan.operationId));
    throw new Error(`MIGRATION_VALIDATION_FAILED:${mismatches.join(",")}`);
  }
  const afterChecksum = await sha256(stableJson(afterStoreChecksums));
  const cutoverAt = new Date().toISOString();
  await db.update(venueMigrationOperations).set({
    status: "migrated",
    afterChecksum,
    cutoverAt,
    updatedAt: cutoverAt,
  }).where(eq(venueMigrationOperations.operationId, plan.operationId));
  return {
    idempotent: false,
    operationId: plan.operationId,
    status: "migrated",
    exportId: plan.backup.exportId,
    affectedStoreKeys: plan.writes.map((write) => write.storeKey),
    afterChecksum,
    cutoverAt,
  };
}

export async function GET(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  const { inventory, report } = await dryRun({});
  const url = new URL(request.url);
  const venueId = positiveInteger(url.searchParams.get("venueId"));
  if (url.searchParams.has("venueId") && !venueId) return adminJson({ ok: false, error: "Некорректный venue ID" }, 400);
  if (venueId) {
    const plan = report.venues.find((venue) => venue.venue.id === venueId);
    if (!plan) return adminJson({ ok: false, error: "Venue не найден" }, 404);
    return adminJson({ ok: true, phase: "A", plan: url.searchParams.get("mode") === "bundle" ? plan : summary(plan) });
  }
  return adminJson({
    ok: true,
    phase: "A",
    platform: {
      accounts: inventory.accountCount,
      users: inventory.userAccountCount,
      tenants: inventory.tenantCount,
      activeTenants: inventory.activeTenantCount,
      venues: inventory.venues.length,
      activeVenues: inventory.venues.filter((venue) => venue.status === "active").length,
      archivedVenues: inventory.venues.filter((venue) => venue.status !== "active").length,
    },
    report: { ...report, venues: report.venues.map(summary) },
  });
}

export async function POST(request: Request): Promise<Response> {
  const admin = await authenticatePlatformAdmin(request);
  if (!admin) return adminForbidden();
  const parsed = await readJsonRequest<{
    action?: MigrationAction;
    venueId?: number;
    legacyCandidatesByVenue?: unknown;
    operationId?: string;
    exportId?: string;
    backupChecksum?: string;
    confirmation?: string;
  }>(request, { maxBytes: 16 * 1024 * 1024 });
  if (!parsed.ok) return parsed.response;
  const action = parsed.data.action ?? "dry_run";
  const { inventory, report } = await dryRun(parsed.data.legacyCandidatesByVenue ?? {});
  if (action === "dry_run") return adminJson({ ok: true, phase: "A", report: {
    ...report,
    venues: report.venues.map(summary),
  } });
  if (action === "persist_phase_a_backups") {
    if (!sameOrigin(request) || request.headers.get("x-admin-intent") !== "persist-phase-a-backups") {
      return adminJson({ ok: false, code: "BACKUP_INTENT_REQUIRED", error: "Запрос резервного экспорта отклонён." }, 403);
    }
    const verifiedExports: Array<{ venueId: number; exportId: string; checksum: string }> = [];
    for (const plan of report.venues) {
      await persistBackup(plan, admin.account.id);
      verifiedExports.push({
        venueId: plan.venue.id,
        exportId: plan.backup.exportId,
        checksum: plan.backup.checksum.value,
      });
    }
    await recordPlatformAdminAudit({
      adminAccountId: admin.account.id,
      action: "venue_data_migration.phase_a_backups",
      targetType: "platform",
      targetId: "all-venues",
      after: { verifiedExports },
      result: "success",
      reason: "Immutable per-venue backups before controlled migration dry-run",
    });
    return adminJson({
      ok: true,
      phase: "A",
      backups: { requested: report.venues.length, verified: verifiedExports.length, exports: verifiedExports },
      platform: {
        accounts: inventory.accountCount,
        users: inventory.userAccountCount,
        tenants: inventory.tenantCount,
        venues: inventory.venues.length,
        activeVenues: inventory.venues.filter((venue) => venue.status === "active").length,
      },
      report: { ...report, venues: report.venues.map(summary) },
    });
  }
  if (action === "rollback_fixture_only") {
    return adminJson({ ok: false, code: "PRODUCTION_ROLLBACK_NOT_AUTHORIZED", error: "Production rollback требует отдельного явного разрешения." }, 409);
  }
  if (!sameOrigin(request) || request.headers.get("x-admin-intent") !== "migrate-safe-venue") {
    return adminJson({ ok: false, code: "MIGRATION_INTENT_REQUIRED", error: "Запрос миграции отклонён." }, 403);
  }
  const venueId = positiveInteger(parsed.data.venueId);
  const venue = venueId ? inventory.venues.find((item) => item.id === venueId) : null;
  const plan = venueId ? report.venues.find((item) => item.venue.id === venueId) : null;
  if (!venue || !plan) return adminJson({ ok: false, error: "Venue не найден" }, 404);
  const proofMatches = parsed.data.confirmation === PHASE_B_CONFIRMATION
    && parsed.data.operationId === plan.operationId
    && parsed.data.exportId === plan.backup.exportId
    && parsed.data.backupChecksum === plan.backup.checksum.value;
  if (!proofMatches) {
    return adminJson({ ok: false, code: "STALE_OR_UNAPPROVED_PLAN", error: "Dry-run proof не совпадает с текущим состоянием." }, 409);
  }
  if (plan.migrationClass !== "SAFE_AUTOMATABLE" || !plan.rollback.provable || plan.writes.length === 0) {
    return adminJson({ ok: false, code: "VENUE_NOT_SAFE_AUTOMATABLE", plan: summary(plan) }, 409);
  }
  try {
    const result = await executeSafeVenueMigration(plan, admin.account.id);
    await recordPlatformAdminAudit({
      adminAccountId: admin.account.id,
      action: "venue_data_migration.cutover",
      targetType: "venue",
      targetId: plan.venue.id,
      before: { exportId: plan.backup.exportId, checksum: plan.backup.checksum.value },
      after: result,
      result: "success",
      reason: "Controlled per-venue server-authoritative migration",
    });
    return adminJson({ ok: true, phase: "B", result });
  } catch (error) {
    await recordPlatformAdminAudit({
      adminAccountId: admin.account.id,
      action: "venue_data_migration.cutover",
      targetType: "venue",
      targetId: plan.venue.id,
      result: "failed",
      reason: error instanceof Error ? error.message : "Unknown migration failure",
    });
    return adminJson({ ok: false, code: "MIGRATION_FAILED", error: error instanceof Error ? error.message : "Migration failed" }, 500);
  }
}
