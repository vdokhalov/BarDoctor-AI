import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLog, venueMigrationExports } from "../../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { buildControlledPlatformDryRun } from "../../../../lib/bardoctor/controlled-server-migration";
import { stableJson } from "../../../../lib/bardoctor/authoritative-persistence";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { readPlatformPersistenceInventory } from "../../../../lib/bardoctor/platform-persistence-service";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";
import {
  CAPTURE_ENABLED_VENUE_IDS,
  validateCapturedCandidates,
} from "../../../../lib/bardoctor/venue-migration-capture";
import {
  migrationIntentAccepted,
  migrationOperationsEnabled,
  migrationOperationsUnavailable,
} from "../../../../lib/bardoctor/migration-guard";
import { adminForbidden, authenticatePlatformAdmin } from "../../../../lib/bardoctor/platform-admin";

function enabledVenue(venueId: number): boolean {
  return CAPTURE_ENABLED_VENUE_IDS.includes(venueId as (typeof CAPTURE_ENABLED_VENUE_IDS)[number]);
}

async function currentVenuePlan(account: Awaited<ReturnType<typeof authenticateRequest>>, candidates: unknown = {}) {
  if (!account) return null;
  const inventory = await readPlatformPersistenceInventory({ [String(account.venueId)]: candidates as never });
  const venue = inventory.venues.find((item) => item.id === account.venueId);
  if (!venue) return null;
  const report = await buildControlledPlatformDryRun({
    venues: [venue],
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
  });
  return { venue, plan: report.venues[0] };
}

function planSummary(plan: NonNullable<Awaited<ReturnType<typeof currentVenuePlan>>>["plan"]) {
  return {
    venue: plan.venue,
    migrationClass: plan.migrationClass,
    persistenceStatus: plan.persistenceStatus,
    records: plan.records,
    findings: plan.findings,
    invariants: plan.invariants,
    writes: plan.writes.map((write) => ({
      storeKey: write.storeKey,
      records: write.records,
      strategy: write.strategy,
      lineage: write.lineage,
    })),
    proof: {
      operationId: plan.operationId,
      exportId: plan.backup.exportId,
      checksum: plan.backup.checksum.value,
    },
  };
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const result = await currentVenuePlan(account);
  if (!result) return Response.json({ ok: false, error: "Заведение не найдено" }, { status: 404 });
  return Response.json({
    ok: true,
    captureEnabled: enabledVenue(account.venueId),
    actorEmail: account.appEmail,
    venueId: account.venueId,
    venueName: result.venue.name,
    primaryVenue: account.id === account.actorAccountId,
    serverStores: Object.fromEntries(Object.entries(result.venue.serverStores).map(([key, value]) => [key, {
      exists: Boolean(value?.exists),
      updatedAt: value?.updatedAt ?? null,
    }])),
    plan: planSummary(result.plan),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!migrationOperationsEnabled()) return migrationOperationsUnavailable();
  const admin = await authenticatePlatformAdmin(request);
  if (!admin) return adminForbidden();
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (admin.account.id !== account.actorAccountId) return adminForbidden();
  if (!enabledVenue(account.venueId)) {
    return Response.json({ ok: false, code: "VENUE_CAPTURE_NOT_ENABLED", error: "Для этого заведения перенос не запланирован" }, { status: 403 });
  }
  if (!migrationIntentAccepted(request, "capture-current-venue-legacy-data")) {
    return Response.json({ ok: false, code: "CAPTURE_INTENT_REQUIRED", error: "Запрос захвата отклонён" }, { status: 403 });
  }
  const parsed = await readJsonRequest<{ venueId?: unknown; candidates?: unknown }>(request, { maxBytes: 16 * 1024 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (Number(parsed.data.venueId) !== account.venueId) {
    return Response.json({ ok: false, code: "VENUE_MISMATCH", error: "Активное заведение изменилось. Повторите сбор данных" }, { status: 409 });
  }
  const primaryVenue = account.id === account.actorAccountId;
  const validated = validateCapturedCandidates({
    value: parsed.data.candidates,
    email: account.appEmail,
    venueId: account.venueId,
    primaryVenue,
  });
  if (!validated.ok) return Response.json({ ok: false, code: "INVALID_CAPTURE", error: validated.error }, { status: 400 });

  const result = await currentVenuePlan(account, validated.candidates);
  if (!result) return Response.json({ ok: false, error: "Заведение не найдено" }, { status: 404 });
  const plan = result.plan;
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
    createdByAccountId: account.actorAccountId,
  }).onConflictDoNothing({ target: venueMigrationExports.exportId });
  const [persisted] = await getDb().select().from(venueMigrationExports)
    .where(eq(venueMigrationExports.exportId, plan.backup.exportId)).limit(1);
  if (!persisted || persisted.checksum !== plan.backup.checksum.value
    || persisted.venueId !== account.venueId || persisted.dataAccountId !== account.id) {
    return Response.json({ ok: false, code: "CAPTURE_BACKUP_VERIFICATION_FAILED", error: "Сервер не подтвердил резервную копию" }, { status: 500 });
  }

  const summary = planSummary(plan);
  await getDb().insert(auditLog).values({
    accountId: account.id,
    storeKey: "venue_migration_capture",
    action: "legacy_capture",
    entityId: String(account.venueId),
    entityLabel: result.venue.name ?? `Venue #${account.venueId}`,
    beforeJson: JSON.stringify({ serverStoreKeys: Object.keys(result.venue.serverStores) }),
    afterJson: JSON.stringify({
      capturedStoreKeys: Object.keys(validated.candidates),
      exportId: plan.backup.exportId,
      checksum: plan.backup.checksum.value,
      migrationClass: plan.migrationClass,
      writesPerformed: 0,
    }),
    changedFieldsJson: JSON.stringify([]),
    actorName: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    actorRole: account.role,
    reason: "User-authorized read-only legacy capture before controlled server migration",
  });
  return Response.json({
    ok: true,
    capturedStoreKeys: Object.keys(validated.candidates),
    backup: { exportId: plan.backup.exportId, checksum: plan.backup.checksum.value, verified: true },
    writesPerformed: 0,
    plan: summary,
  }, { headers: { "Cache-Control": "no-store" } });
}
