import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  accounts,
  domainData,
  venueMemberships,
  venues,
  workspaces,
} from "../../../../db/schema";
import {
  AUTHORITATIVE_STORE_KEYS,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "../../../../lib/bardoctor/authoritative-persistence";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  buildPlatformPersistenceAudit,
  type PlatformPersistenceAudit,
  type PlatformVenueInput,
} from "../../../../lib/bardoctor/platform-persistence-audit";
import {
  adminForbidden,
  authenticatePlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";

type LegacyCandidatesByVenue = Record<string, Partial<Record<AuthoritativeStoreKey, unknown>>>;
type ExportMode = "summary" | "bundle";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function venueName(value: string | null): string | null {
  if (!value) return null;
  try {
    const name = record(JSON.parse(value)).name;
    return typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null;
  } catch {
    return null;
  }
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeLegacyCandidates(value: unknown): LegacyCandidatesByVenue {
  const root = record(value);
  return Object.fromEntries(Object.entries(root).flatMap(([venueId, candidate]) => {
    if (!positiveInteger(venueId)) return [];
    const allowed = Object.fromEntries(Object.entries(record(candidate)).filter(([key]) =>
      AUTHORITATIVE_STORE_KEYS.includes(key as AuthoritativeStoreKey))) as Partial<Record<AuthoritativeStoreKey, unknown>>;
    return Object.keys(allowed).length ? [[venueId, allowed]] : [];
  }));
}

async function platformReport(legacyCandidatesByVenue: LegacyCandidatesByVenue = {}) {
  const db = getDb();
  const [venueRows, accountRows, workspaceRows, membershipRows, storeRows] = await Promise.all([
    db.select({ venue: venues, dataAccount: accounts })
      .from(venues)
      .innerJoin(accounts, eq(venues.dataAccountId, accounts.id)),
    db.select({ id: accounts.id, accountKind: accounts.accountKind }).from(accounts),
    db.select({ id: workspaces.id, status: workspaces.status }).from(workspaces),
    db.select({ id: venueMemberships.id }).from(venueMemberships),
    db.select({
      accountId: domainData.accountId,
      storeKey: domainData.storeKey,
      dataJson: domainData.dataJson,
      updatedAt: domainData.updatedAt,
    }).from(domainData).where(inArray(domainData.storeKey, [...AUTHORITATIVE_STORE_KEYS])),
  ]);
  const storesByAccount = new Map<number, Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>>();
  for (const row of storeRows) {
    if (!AUTHORITATIVE_STORE_KEYS.includes(row.storeKey as AuthoritativeStoreKey)) continue;
    let data: unknown;
    let parseError = false;
    try {
      data = JSON.parse(row.dataJson);
    } catch {
      data = null;
      parseError = true;
    }
    const stores = storesByAccount.get(row.accountId) ?? {};
    stores[row.storeKey as AuthoritativeStoreKey] = {
      exists: true,
      data,
      updatedAt: row.updatedAt,
      parseError,
    };
    storesByAccount.set(row.accountId, stores);
  }
  const venueInputs: PlatformVenueInput[] = venueRows.map(({ venue, dataAccount }) => ({
    id: venue.id,
    dataAccountId: venue.dataAccountId,
    workspaceId: venue.workspaceId,
    name: venueName(dataAccount.restaurantJson),
    status: venue.status,
    migrationStatus: dataAccount.migrationStatus,
    serverStores: storesByAccount.get(venue.dataAccountId) ?? {},
    legacyCandidates: legacyCandidatesByVenue[String(venue.id)],
  }));
  return buildPlatformPersistenceAudit({
    venues: venueInputs,
    accountCount: accountRows.length,
    userAccountCount: accountRows.filter((account) => account.accountKind === "user").length,
    tenantCount: workspaceRows.length,
    membershipCount: membershipRows.length,
    sourceCommit: BARDOCTOR_SOURCE_COMMIT,
  });
}

function venueSummary(venue: PlatformPersistenceAudit["venueReports"][number]) {
  return {
    tenant: venue.tenant,
    venue: venue.venue,
    persistenceStatus: venue.persistenceStatus,
    migrationCandidate: venue.migrationCandidate,
    domainMatrix: venue.domainMatrix,
    export: {
      exportId: venue.export.exportId,
      checksum: venue.export.checksum,
      complete: venue.export.complete,
      reconciliationAllowed: venue.export.reconciliationAllowed,
      counts: venue.export.counts,
      invariants: venue.export.invariants,
      audit: venue.export.audit,
      dryRun: venue.export.dryRun,
      rollback: venue.export.rollback,
    },
  };
}

function responseFor(report: PlatformPersistenceAudit, mode: ExportMode, venueId: number | null) {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-BarDoctor-Data-Mode": "read-only-dry-run",
  };
  if (venueId) {
    const venue = report.venueReports.find((item) => item.venue.id === venueId);
    if (!venue) return Response.json({ ok: false, error: "Venue не найден" }, { status: 404, headers });
    headers["Content-Disposition"] = `attachment; filename="bardoctor-venue-${venueId}-${venue.export.exportId}.json"`;
    return Response.json({ ok: true, mode: "venue_immutable_export", writesPerformed: 0, report: {
      version: report.version,
      sourceCommit: report.sourceCommit,
      generatedAt: report.generatedAt,
      venueReport: venue,
    } }, { headers });
  }
  if (mode === "bundle") {
    headers["Content-Disposition"] = `attachment; filename="bardoctor-platform-${report.sourceCommit.slice(0, 12)}.json"`;
    return Response.json({ ok: true, mode: "platform_immutable_export_bundle", writesPerformed: 0, report }, { headers });
  }
  return Response.json({
    ok: true,
    mode: "platform_read_only_summary",
    writesPerformed: 0,
    report: {
      version: report.version,
      sourceCommit: report.sourceCommit,
      generatedAt: report.generatedAt,
      mode: report.mode,
      productionWritesPerformed: report.productionWritesPerformed,
      platform: report.platform,
      persistenceStatuses: report.persistenceStatuses,
      domainAuthoritativeVenueCounts: report.domainAuthoritativeVenueCounts,
      exports: report.exports,
      auditCounts: report.auditCounts,
      migrationCandidates: report.migrationCandidates,
      crossVenueOrAccountViolations: report.crossVenueOrAccountViolations,
      venues: report.venueReports.map(venueSummary),
    },
  }, { headers });
}

export async function GET(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  const url = new URL(request.url);
  const requestedVenueId = url.searchParams.has("venueId")
    ? positiveInteger(url.searchParams.get("venueId"))
    : null;
  if (url.searchParams.has("venueId") && !requestedVenueId) {
    return Response.json({ ok: false, error: "Некорректный venue ID" }, { status: 400 });
  }
  const mode: ExportMode = url.searchParams.get("mode") === "bundle" ? "bundle" : "summary";
  return responseFor(await platformReport(), mode, requestedVenueId);
}

/** Read-only legacy discovery. Candidate payloads are audited in memory and never persisted. */
export async function POST(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();
  const parsed = await readJsonRequest<{
    legacyCandidatesByVenue?: unknown;
    mode?: ExportMode;
    venueId?: number;
  }>(request, { maxBytes: 16 * 1024 * 1024 });
  if (!parsed.ok) return parsed.response;
  const venueId = parsed.data.venueId == null ? null : positiveInteger(String(parsed.data.venueId));
  if (parsed.data.venueId != null && !venueId) {
    return Response.json({ ok: false, error: "Некорректный venue ID" }, { status: 400 });
  }
  const report = await platformReport(sanitizeLegacyCandidates(parsed.data.legacyCandidatesByVenue));
  return responseFor(report, parsed.data.mode === "bundle" ? "bundle" : "summary", venueId);
}
