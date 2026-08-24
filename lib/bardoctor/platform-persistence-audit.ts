import {
  AUTHORITATIVE_ENTITY_SOURCES,
  AUTHORITATIVE_STORE_KEYS,
  buildImmutableVenueExport,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "./authoritative-persistence";

export const PLATFORM_PERSISTENCE_AUDIT_VERSION = "platform-persistence-v2";

export const PERSISTENCE_STATUSES = [
  "FULLY_SERVER_AUTHORITATIVE",
  "PARTIALLY_SERVER_AUTHORITATIVE",
  "LEGACY_CLIENT_HELD",
  "MIXED_SPLIT_BRAIN",
  "INCOMPLETE_UNKNOWN",
] as const;

export type PersistenceStatus = (typeof PERSISTENCE_STATUSES)[number];
export type MigrationCandidateClass = "NOT_REQUIRED" | "SAFE_AUTOMATABLE" | "REQUIRES_REVIEW" | "BLOCKED";

export type PlatformVenueInput = {
  id: number;
  dataAccountId: number;
  workspaceId: number | null;
  name?: string | null;
  status: string;
  migrationStatus?: string | null;
  serverStores: Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>;
  legacyCandidates?: Partial<Record<AuthoritativeStoreKey, unknown>>;
};

const DOMAIN_CONTRACT = [
  ["assortment", "canonical assortment / nomenclature", AUTHORITATIVE_ENTITY_SOURCES.canonicalAssortment],
  ["stockBalances", "stock balances", AUTHORITATIVE_ENTITY_SOURCES.stockBalances],
  ["stockMovements", "immutable stock ledger", AUTHORITATIVE_ENTITY_SOURCES.stockMovements],
  ["purchases", "purchase documents and lines", AUTHORITATIVE_ENTITY_SOURCES.purchaseDocuments],
  ["supplierItems", "supplier/source items", AUTHORITATIVE_ENTITY_SOURCES.supplierSourceItems],
  ["supplierMappings", "supplier mappings", AUTHORITATIVE_ENTITY_SOURCES.supplierMappings],
  ["packaging", "packaging and conversions", AUTHORITATIVE_ENTITY_SOURCES.nomenclature],
  ["snapshots", "inventory snapshots and adjustments", AUTHORITATIVE_ENTITY_SOURCES.inventorySnapshots],
  ["cost", "cost basis and valuation", AUTHORITATIVE_ENTITY_SOURCES.costBasis],
  ["techCards", "tech cards and ingredient mappings", AUTHORITATIVE_ENTITY_SOURCES.techCards],
  ["aliases", "aliases and supersessions", AUTHORITATIVE_ENTITY_SOURCES.aliasesAndSupersessions],
  ["suppliers", "supplier directory", AUTHORITATIVE_ENTITY_SOURCES.suppliers],
] as const satisfies ReadonlyArray<readonly [string, string, AuthoritativeStoreKey]>;

function storeExists(input: PlatformVenueInput, key: AuthoritativeStoreKey): boolean {
  return input.serverStores[key]?.exists === true;
}

function hasLegacyCandidate(input: PlatformVenueInput, key: AuthoritativeStoreKey): boolean {
  return Object.prototype.hasOwnProperty.call(input.legacyCandidates ?? {}, key);
}

function historicalServerStore(input: PlatformVenueInput): boolean {
  return storeExists(input, "bd_purchase_documents")
    || storeExists(input, "bd_inventory_snapshots")
    || storeExists(input, "bd_stock_movements");
}

export function classifyVenuePersistence(input: PlatformVenueInput): PersistenceStatus {
  const serverCount = AUTHORITATIVE_STORE_KEYS.filter((key) => storeExists(input, key)).length;
  const legacyCount = AUTHORITATIVE_STORE_KEYS.filter((key) => hasLegacyCandidate(input, key)).length;
  if (serverCount === AUTHORITATIVE_STORE_KEYS.length) return "FULLY_SERVER_AUTHORITATIVE";
  if (legacyCount > 0 && serverCount === 0) return "LEGACY_CLIENT_HELD";
  if (legacyCount > 0 || (historicalServerStore(input)
    && (!storeExists(input, "bd_assortment_v1") || !storeExists(input, "bd_stock_movements")))) {
    return "MIXED_SPLIT_BRAIN";
  }
  if (serverCount > 0) return "PARTIALLY_SERVER_AUTHORITATIVE";
  return "INCOMPLETE_UNKNOWN";
}

function migrationClass(input: PlatformVenueInput, persistenceStatus: PersistenceStatus, snapshot: Awaited<ReturnType<typeof buildImmutableVenueExport>>): MigrationCandidateClass {
  if (persistenceStatus === "FULLY_SERVER_AUTHORITATIVE") return "NOT_REQUIRED";
  if (persistenceStatus === "INCOMPLETE_UNKNOWN" || snapshot.counts.blockingInvariants > 0) return "BLOCKED";
  if (snapshot.dryRun.ambiguous > 0 || persistenceStatus === "MIXED_SPLIT_BRAIN") return "REQUIRES_REVIEW";
  if (snapshot.dryRun.highConfidenceAutomatic > 0 && snapshot.dryRun.valuationRecordsPotentiallyAffected === 0) {
    return "SAFE_AUTOMATABLE";
  }
  return input.legacyCandidates && Object.keys(input.legacyCandidates).length > 0
    ? "REQUIRES_REVIEW"
    : "BLOCKED";
}

function domainMatrix(input: PlatformVenueInput) {
  return DOMAIN_CONTRACT.map(([domain, label, storeKey]) => {
    const server = storeExists(input, storeKey);
    const legacy = hasLegacyCandidate(input, storeKey);
    const source = server ? "server_d1" : legacy ? "legacy_client_candidate" : "missing_unknown";
    return {
      domain,
      label,
      storeKey,
      currentReadSource: source,
      currentWriteSource: server ? "server_d1" : "blocked_pending_export_review",
      serverStore: server,
      clientOrLegacyStore: legacy ? "candidate_supplied_read_only" : "not_observable_server_side",
      authoritative: server,
      migrationStatus: server ? "SERVER_AUTHORITATIVE" : legacy ? "LEGACY_DISCOVERED" : "INCOMPLETE_UNKNOWN",
      completeness: server ? "present" : legacy ? "candidate_only" : "missing",
    };
  });
}

function sumCounts(reports: Array<Record<string, number>>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const counts of reports) {
    for (const [key, value] of Object.entries(counts)) result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

export async function buildPlatformPersistenceAudit(input: {
  venues: PlatformVenueInput[];
  accountCount: number;
  userAccountCount: number;
  tenantCount: number;
  membershipCount: number;
  generatedAt?: string;
  sourceCommit: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const venueReports = await Promise.all(input.venues.map(async (venue) => {
    const persistenceStatus = classifyVenuePersistence(venue);
    const snapshot = await buildImmutableVenueExport({
      venue: {
        id: venue.id,
        name: venue.name ?? null,
        workspaceId: venue.workspaceId,
        dataAccountId: venue.dataAccountId,
      },
      serverStores: venue.serverStores,
      legacyCandidates: venue.legacyCandidates,
      exportedAt: generatedAt,
      sourceVersion: PLATFORM_PERSISTENCE_AUDIT_VERSION,
      sourceCommit: input.sourceCommit,
    });
    return {
      tenant: { workspaceId: venue.workspaceId },
      venue: {
        id: venue.id,
        dataAccountId: venue.dataAccountId,
        name: venue.name ?? null,
        status: venue.status,
        legacyMigrationStatus: venue.migrationStatus ?? null,
      },
      persistenceStatus,
      migrationCandidate: migrationClass(venue, persistenceStatus, snapshot),
      domainMatrix: domainMatrix(venue),
      export: snapshot,
    };
  }));
  const statusCounts = Object.fromEntries(PERSISTENCE_STATUSES.map((status) => [
    status,
    venueReports.filter((venue) => venue.persistenceStatus === status).length,
  ])) as Record<PersistenceStatus, number>;
  const migrationCounts = Object.fromEntries([
    "NOT_REQUIRED", "SAFE_AUTOMATABLE", "REQUIRES_REVIEW", "BLOCKED",
  ].map((value) => [value, venueReports.filter((venue) => venue.migrationCandidate === value).length]));
  const auditCounts = sumCounts(venueReports.map((venue) => venue.export.audit.counts));
  const domainAuthoritativeCounts = Object.fromEntries(DOMAIN_CONTRACT.map(([domain]) => [
    domain,
    venueReports.filter((venue) => venue.domainMatrix.find((item) => item.domain === domain)?.authoritative).length,
  ]));
  const summarySnapshot = {
    version: PLATFORM_PERSISTENCE_AUDIT_VERSION,
    sourceCommit: input.sourceCommit,
    generatedAt,
    mode: "read_only_dry_run" as const,
    productionWritesPerformed: 0 as const,
    platform: {
      accounts: input.accountCount,
      userAccounts: input.userAccountCount,
      tenants: input.tenantCount,
      venues: venueReports.length,
      memberships: input.membershipCount,
    },
    persistenceStatuses: statusCounts,
    domainAuthoritativeVenueCounts: domainAuthoritativeCounts,
    exports: {
      created: venueReports.length,
      complete: venueReports.filter((venue) => venue.export.complete).length,
      incomplete: venueReports.filter((venue) => !venue.export.complete).length,
    },
    auditCounts,
    migrationCandidates: migrationCounts,
    crossVenueOrAccountViolations: venueReports.reduce((sum, venue) => sum
      + venue.export.invariants.filter((item) => item.code === "CROSS_VENUE_REFERENCE")
        .reduce((count, item) => count + item.count, 0), 0),
  };
  return { ...summarySnapshot, venueReports };
}

export type PlatformPersistenceAudit = Awaited<ReturnType<typeof buildPlatformPersistenceAudit>>;
