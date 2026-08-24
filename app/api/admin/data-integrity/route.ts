import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  buildPlatformPersistenceAudit,
  type PlatformPersistenceAudit,
} from "../../../../lib/bardoctor/platform-persistence-audit";
import {
  readPlatformPersistenceInventory,
  sanitizeLegacyCandidates,
  type LegacyCandidatesByVenue,
} from "../../../../lib/bardoctor/platform-persistence-service";
import {
  adminForbidden,
  authenticatePlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";

type ExportMode = "summary" | "bundle";

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function platformReport(legacyCandidatesByVenue: LegacyCandidatesByVenue = {}) {
  const inventory = await readPlatformPersistenceInventory(legacyCandidatesByVenue);
  return buildPlatformPersistenceAudit({
    venues: inventory.venues,
    accountCount: inventory.accountCount,
    userAccountCount: inventory.userAccountCount,
    tenantCount: inventory.tenantCount,
    membershipCount: inventory.membershipCount,
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
