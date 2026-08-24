import { inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { venues } from "../../../../../db/schema";
import {
  CONFIRMED_ARCHIVE_PHRASE,
  CONFIRMED_ARCHIVE_VENUE_IDS,
  isExactConfirmedArchiveSet,
  PROTECTED_ACTIVE_VENUE_IDS,
} from "../../../../../lib/bardoctor/confirmed-venue-archive";
import { readJsonRequest } from "../../../../../lib/bardoctor/http";
import {
  adminForbidden,
  adminJson,
  authenticatePlatformAdmin,
  recordPlatformAdminAudit,
} from "../../../../../lib/bardoctor/platform-admin";
import { readPlatformPersistenceInventory } from "../../../../../lib/bardoctor/platform-persistence-service";

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function POST(request: Request): Promise<Response> {
  const admin = await authenticatePlatformAdmin(request);
  if (!admin) return adminForbidden();
  if (!sameOrigin(request) || request.headers.get("x-admin-intent") !== "archive-confirmed-venues") {
    return adminJson({ ok: false, code: "ARCHIVE_INTENT_REQUIRED", error: "Запрос архивации отклонён." }, 403);
  }
  const parsed = await readJsonRequest<{ venueIds?: unknown; confirmation?: unknown }>(request, {
    maxBytes: 16 * 1024,
  });
  if (!parsed.ok) return parsed.response;
  if (parsed.data.confirmation !== CONFIRMED_ARCHIVE_PHRASE
    || !isExactConfirmedArchiveSet(parsed.data.venueIds)) {
    return adminJson({
      ok: false,
      code: "EXACT_ARCHIVE_SET_REQUIRED",
      error: "Список заведений не совпадает с подтверждённым планом.",
    }, 409);
  }

  const inventoryBefore = await readPlatformPersistenceInventory();
  const byIdBefore = new Map(inventoryBefore.venues.map((venue) => [venue.id, venue]));
  const missingTargets = CONFIRMED_ARCHIVE_VENUE_IDS.filter((id) => !byIdBefore.has(id));
  const protectedBefore = PROTECTED_ACTIVE_VENUE_IDS.map((id) => byIdBefore.get(id));
  if (missingTargets.length || protectedBefore.some((venue) => !venue || venue.status !== "active")) {
    await recordPlatformAdminAudit({
      adminAccountId: admin.account.id,
      action: "venue.archive_confirmed_set",
      targetType: "venue_set",
      targetId: CONFIRMED_ARCHIVE_VENUE_IDS.join(","),
      before: {
        missingTargets,
        protected: protectedBefore.map((venue) => venue && ({ id: venue.id, name: venue.name, status: venue.status })),
      },
      result: "denied",
      reason: "Precondition failed: exact targets must exist and protected venues must be active",
    });
    return adminJson({
      ok: false,
      code: "ARCHIVE_PRECONDITION_FAILED",
      error: "Состояние заведений изменилось; архивация остановлена без записи.",
      missingTargets,
    }, 409);
  }

  const before = CONFIRMED_ARCHIVE_VENUE_IDS.map((id) => {
    const venue = byIdBefore.get(id)!;
    return { id, name: venue.name, status: venue.status };
  });
  const now = new Date().toISOString();
  await getDb().update(venues).set({ status: "archived", updatedAt: now })
    .where(inArray(venues.id, [...CONFIRMED_ARCHIVE_VENUE_IDS]));

  const inventoryAfter = await readPlatformPersistenceInventory();
  const byIdAfter = new Map(inventoryAfter.venues.map((venue) => [venue.id, venue]));
  const archived = CONFIRMED_ARCHIVE_VENUE_IDS.map((id) => byIdAfter.get(id));
  const keptActive = PROTECTED_ACTIVE_VENUE_IDS.map((id) => byIdAfter.get(id));
  const verified = archived.every((venue) => venue?.status === "archived")
    && keptActive.every((venue) => venue?.status === "active");
  if (!verified) {
    await recordPlatformAdminAudit({
      adminAccountId: admin.account.id,
      action: "venue.archive_confirmed_set",
      targetType: "venue_set",
      targetId: CONFIRMED_ARCHIVE_VENUE_IDS.join(","),
      before,
      after: { archived, keptActive },
      result: "failed",
      reason: "Post-write verification failed",
    });
    return adminJson({ ok: false, code: "ARCHIVE_VERIFICATION_FAILED", error: "Проверка архивации не пройдена." }, 500);
  }

  const after = archived.map((venue) => ({ id: venue!.id, name: venue!.name, status: venue!.status }));
  const protectedAfter = keptActive.map((venue) => ({ id: venue!.id, name: venue!.name, status: venue!.status }));
  await recordPlatformAdminAudit({
    adminAccountId: admin.account.id,
    action: "venue.archive_confirmed_set",
    targetType: "venue_set",
    targetId: CONFIRMED_ARCHIVE_VENUE_IDS.join(","),
    before,
    after: { archived: after, keptActive: protectedAfter, deleted: false },
    result: "success",
    reason: "User-confirmed reversible archival; accounts, memberships, history and domain data preserved",
  });
  return adminJson({
    ok: true,
    archived: after,
    keptActive: protectedAfter,
    deleted: false,
    preserved: ["accounts", "memberships", "history", "domain_data", "migration_backups"],
  });
}
