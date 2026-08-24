import {
  AUTHORITATIVE_STORE_KEYS,
  buildImmutableVenueExport,
  stableJson,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "./authoritative-persistence";
import { toInventoryBaseAmount } from "./inventory";
import {
  classifyVenuePersistence,
  type MigrationCandidateClass,
  type PlatformVenueInput,
} from "./platform-persistence-audit";

export const CONTROLLED_MIGRATION_VERSION = "controlled-server-migration-v1";
export const PHASE_B_CONFIRMATION = "PHASE_B_SAFE_VENUE_MIGRATION_APPROVED";

export const LEGACY_PHYSICAL_SOURCES = [
  "browser_local_storage",
  "browser_indexed_db",
  "legacy_api",
  "old_d1_table",
  "kv_or_blob",
  "serialized_account_state",
  "compatibility_store",
  "migration_cache",
  "static_bootstrap_json",
] as const;

export type LegacyPhysicalSource = (typeof LEGACY_PHYSICAL_SOURCES)[number];
export type MigrationRisk = "SAFE_AUTOMATABLE" | "REQUIRES_REVIEW" | "BLOCKED" | "NOT_REQUIRED";
export type LegacyCandidateEnvelope = {
  data: unknown;
  source: LegacyPhysicalSource;
  sourceKey?: string | null;
  capturedAt?: string | null;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = "", max = 320): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function legacyCandidateEnvelope(value: unknown): LegacyCandidateEnvelope {
  const root = record(value);
  const source = LEGACY_PHYSICAL_SOURCES.includes(root.source as LegacyPhysicalSource)
    ? root.source as LegacyPhysicalSource
    : "browser_local_storage";
  const isEnvelope = Object.prototype.hasOwnProperty.call(root, "data")
    && Object.prototype.hasOwnProperty.call(root, "source");
  return {
    data: isEnvelope ? root.data : value,
    source,
    sourceKey: isEnvelope ? text(root.sourceKey, "", 500) || null : null,
    capturedAt: isEnvelope ? text(root.capturedAt, "", 50) || null : null,
  };
}

function recordCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  const root = record(value);
  return [
    "nomenclature", "stockBalances", "supplierProductMappings", "recipes",
    "inventoryProductAliases", "canonicalProductAliases", "canonicalSupersessions",
  ].reduce((sum, key) => sum + array(root[key]).length, 0);
}

type EconomicSnapshot = {
  baseQuantityByUnit: Record<string, number>;
  valuationByCurrency: Record<string, number>;
  unknownCostPositions: number;
};

function economicSnapshot(assortment: unknown): EconomicSnapshot {
  const root = record(assortment);
  const currency = text(root.accountingCurrency ?? root.currency, "UNKNOWN", 16).toUpperCase();
  const quantityByUnit: Record<string, number> = {};
  const valuationByCurrency: Record<string, number> = {};
  let unknownCostPositions = 0;
  for (const value of array(root.stockBalances)) {
    const balance = record(value);
    const current = numeric(balance.current ?? balance.quantity) ?? 0;
    const converted = toInventoryBaseAmount(current, balance.unit ?? balance.baseUnit);
    quantityByUnit[converted.unit] = (quantityByUnit[converted.unit] ?? 0) + converted.amount;
    if (current <= 0) continue;
    const explicit = numeric(balance.inventoryValue);
    const unitCost = numeric(balance.averageUnitCost ?? balance.costBasis);
    if (explicit !== null && explicit >= 0) {
      valuationByCurrency[currency] = (valuationByCurrency[currency] ?? 0) + explicit;
    } else if (unitCost !== null && unitCost > 0) {
      valuationByCurrency[currency] = (valuationByCurrency[currency] ?? 0) + current * unitCost;
    } else {
      unknownCostPositions += 1;
    }
  }
  return {
    baseQuantityByUnit: Object.fromEntries(Object.entries(quantityByUnit).map(([key, value]) => [key, Number(value.toFixed(6))])),
    valuationByCurrency: Object.fromEntries(Object.entries(valuationByCurrency).map(([key, value]) => [key, Number(value.toFixed(4))])),
    unknownCostPositions,
  };
}

function sameEconomicState(left: EconomicSnapshot, right: EconomicSnapshot): boolean {
  return stableJson(left) === stableJson(right);
}

function candidateData(input: PlatformVenueInput, key: AuthoritativeStoreKey): unknown {
  const value = input.legacyCandidates?.[key];
  return legacyCandidateEnvelope(value).data;
}

function candidateLineage(input: PlatformVenueInput, key: AuthoritativeStoreKey) {
  if (!Object.prototype.hasOwnProperty.call(input.legacyCandidates ?? {}, key)) return null;
  const candidate = legacyCandidateEnvelope(input.legacyCandidates?.[key]);
  return {
    physicalSource: candidate.source,
    sourceKey: candidate.sourceKey,
    capturedAt: candidate.capturedAt,
    readOnly: true as const,
  };
}

function expectedStores(input: PlatformVenueInput): Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>> {
  return Object.fromEntries(AUTHORITATIVE_STORE_KEYS.flatMap((key) => {
    const server = input.serverStores[key];
    if (server?.exists) return [[key, server]];
    if (!Object.prototype.hasOwnProperty.call(input.legacyCandidates ?? {}, key)) return [];
    return [[key, { exists: true, data: candidateData(input, key), updatedAt: null }]];
  })) as Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>;
}

function splitBrainStores(input: PlatformVenueInput): AuthoritativeStoreKey[] {
  return AUTHORITATIVE_STORE_KEYS.filter((key) => {
    const server = input.serverStores[key];
    if (!server?.exists || !Object.prototype.hasOwnProperty.call(input.legacyCandidates ?? {}, key)) return false;
    return stableJson(server.data) !== stableJson(candidateData(input, key));
  });
}

function auditCount(findings: Array<{ code: string; count: number }>, code: string): number {
  return findings.find((finding) => finding.code === code)?.count ?? 0;
}

function migrationRisk(input: {
  currentComplete: boolean;
  expectedStoresPresent: boolean;
  missingWithoutEvidence: AuthoritativeStoreKey[];
  splitBrain: AuthoritativeStoreKey[];
  hardBlockingInvariants: number;
  reviewFindings: number;
  ambiguous: number;
  unknownCostPositions: number;
  economicInvariant: boolean;
}): MigrationRisk {
  if (input.currentComplete) return "NOT_REQUIRED";
  if (input.missingWithoutEvidence.length || !input.expectedStoresPresent || input.hardBlockingInvariants > 0 || !input.economicInvariant) {
    return "BLOCKED";
  }
  if (input.splitBrain.length || input.ambiguous > 0 || input.unknownCostPositions > 0 || input.reviewFindings > 0) {
    return "REQUIRES_REVIEW";
  }
  return "SAFE_AUTOMATABLE";
}

export async function buildVenueMigrationPlan(input: {
  venue: PlatformVenueInput;
  sourceCommit: string;
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const currentExport = await buildImmutableVenueExport({
    venue: {
      id: input.venue.id,
      name: input.venue.name,
      workspaceId: input.venue.workspaceId,
      dataAccountId: input.venue.dataAccountId,
    },
    serverStores: input.venue.serverStores,
    exportedAt: generatedAt,
    sourceVersion: CONTROLLED_MIGRATION_VERSION,
    sourceCommit: input.sourceCommit,
  });
  const backupExport = await buildImmutableVenueExport({
    venue: {
      id: input.venue.id,
      name: input.venue.name,
      workspaceId: input.venue.workspaceId,
      dataAccountId: input.venue.dataAccountId,
    },
    serverStores: input.venue.serverStores,
    legacyCandidates: Object.fromEntries(Object.entries(input.venue.legacyCandidates ?? {}).map(([key, value]) => [
      key,
      legacyCandidateEnvelope(value).data,
    ])),
    exportedAt: generatedAt,
    sourceVersion: CONTROLLED_MIGRATION_VERSION,
    sourceCommit: input.sourceCommit,
  });
  const afterStores = expectedStores(input.venue);
  const expectedExport = await buildImmutableVenueExport({
    venue: {
      id: input.venue.id,
      name: input.venue.name,
      workspaceId: input.venue.workspaceId,
      dataAccountId: input.venue.dataAccountId,
    },
    serverStores: afterStores,
    exportedAt: generatedAt,
    sourceVersion: CONTROLLED_MIGRATION_VERSION,
    sourceCommit: input.sourceCommit,
  });
  const missingWithoutEvidence = AUTHORITATIVE_STORE_KEYS.filter((key) =>
    !input.venue.serverStores[key]?.exists
    && !Object.prototype.hasOwnProperty.call(input.venue.legacyCandidates ?? {}, key));
  const splitBrain = splitBrainStores(input.venue);
  const currentBoundaryComplete = AUTHORITATIVE_STORE_KEYS.every((key) => input.venue.serverStores[key]?.exists);
  const expectedStoresPresent = AUTHORITATIVE_STORE_KEYS.every((key) => afterStores[key]?.exists);
  const hardBlockingCodes = new Set([
    "AUTHORITATIVE_SOURCE_MISSING",
    "AUTHORITATIVE_STORE_INVALID_JSON",
    "CROSS_VENUE_REFERENCE",
    "MOVEMENT_CHAIN_INVALID",
    "AUDIT_CROSS_VENUE_RECORD_OR_REFERENCE",
  ]);
  const hardBlockingInvariants = expectedExport.invariants
    .filter((invariant) => hardBlockingCodes.has(invariant.code))
    .reduce((sum, invariant) => sum + invariant.count, 0);
  const reviewFindings = expectedExport.invariants
    .filter((invariant) => !hardBlockingCodes.has(invariant.code))
    .reduce((sum, invariant) => sum + invariant.count, 0);
  const beforeEconomic = economicSnapshot(input.venue.serverStores.bd_assortment_v1?.data);
  const expectedEconomic = economicSnapshot(afterStores.bd_assortment_v1?.data);
  const economicInvariant = input.venue.serverStores.bd_assortment_v1?.exists
    ? sameEconomicState(beforeEconomic, expectedEconomic)
    : true;
  const risk = migrationRisk({
    currentComplete: currentBoundaryComplete,
    expectedStoresPresent,
    missingWithoutEvidence,
    splitBrain,
    hardBlockingInvariants,
    reviewFindings,
    ambiguous: expectedExport.dryRun.ambiguous,
    unknownCostPositions: expectedEconomic.unknownCostPositions,
    economicInvariant,
  });
  const writes = AUTHORITATIVE_STORE_KEYS.flatMap((key) => {
    if (input.venue.serverStores[key]?.exists) return [];
    if (!Object.prototype.hasOwnProperty.call(input.venue.legacyCandidates ?? {}, key)) return [];
    const data = candidateData(input.venue, key);
    return [{
      storeKey: key,
      strategy: "INSERT_MISSING_ONLY" as const,
      records: recordCount(data),
      data,
      lineage: candidateLineage(input.venue, key),
    }];
  });
  const planIdentity = {
    version: CONTROLLED_MIGRATION_VERSION,
    sourceCommit: input.sourceCommit,
    venueId: input.venue.id,
    dataAccountId: input.venue.dataAccountId,
    currentExportId: backupExport.exportId,
    expectedChecksum: expectedExport.checksum.value,
    writes: writes.map(({ storeKey, strategy, records, lineage }) => ({ storeKey, strategy, records, lineage })),
  };
  const operationHash = await sha256(stableJson(planIdentity));
  return {
    version: CONTROLLED_MIGRATION_VERSION,
    mode: "read_only_dry_run" as const,
    writesPerformed: 0 as const,
    sourceCommit: input.sourceCommit,
    generatedAt,
    operationId: `bdm_${operationHash.slice(0, 24)}`,
    venue: {
      id: input.venue.id,
      dataAccountId: input.venue.dataAccountId,
      workspaceId: input.venue.workspaceId,
      name: input.venue.name ?? null,
      status: input.venue.status,
    },
    persistenceStatus: classifyVenuePersistence(input.venue),
    migrationClass: risk satisfies MigrationCandidateClass,
    backup: {
      exportId: backupExport.exportId,
      checksum: backupExport.checksum,
      immutable: true,
      readOnly: true,
      sourceCommit: input.sourceCommit,
      payload: backupExport,
    },
    lineage: AUTHORITATIVE_STORE_KEYS.map((key) => ({
      storeKey: key,
      server: input.venue.serverStores[key]?.exists ? {
        physicalSource: "d1.domain_data",
        accountId: input.venue.dataAccountId,
        updatedAt: input.venue.serverStores[key]?.updatedAt ?? null,
      } : null,
      legacy: candidateLineage(input.venue, key),
      target: "d1.domain_data",
    })),
    records: {
      toMigrate: writes.reduce((sum, write) => sum + write.records, 0),
      alreadyServerSide: AUTHORITATIVE_STORE_KEYS.filter((key) => input.venue.serverStores[key]?.exists)
        .reduce((sum, key) => sum + recordCount(input.venue.serverStores[key]?.data), 0),
      byStore: Object.fromEntries(AUTHORITATIVE_STORE_KEYS.map((key) => [key, {
        server: input.venue.serverStores[key]?.exists ? recordCount(input.venue.serverStores[key]?.data) : 0,
        candidate: Object.prototype.hasOwnProperty.call(input.venue.legacyCandidates ?? {}, key)
          ? recordCount(candidateData(input.venue, key)) : 0,
      }])),
    },
    findings: {
      duplicateCanonicalCandidates: auditCount(expectedExport.audit.findings, "CANONICAL_DUPLICATE"),
      ambiguousMappings: expectedExport.dryRun.ambiguous,
      orphanSourceItems: auditCount(expectedExport.audit.findings, "SUPPLIER_MAPPING_STALE_OR_ORPHAN"),
      unitOrPackagingConflicts: auditCount(expectedExport.audit.findings, "UNIT_OR_PACKAGE_CONFLICT"),
      stockWithoutCost: auditCount(expectedExport.audit.findings, "STOCK_WITHOUT_COST_BASIS"),
      snapshotUnresolvedRefs: auditCount(expectedExport.audit.findings, "INVENTORY_SNAPSHOT_ORPHAN"),
      techCardUnresolvedRefs: auditCount(expectedExport.audit.findings, "TECH_CARD_ORPHAN_OR_AMBIGUOUS"),
      crossVenueViolations: auditCount(expectedExport.audit.findings, "CROSS_VENUE_RECORD_OR_REFERENCE"),
      historicalGaps: auditCount(expectedExport.audit.findings, "PURCHASE_MOVEMENT_CHAIN_BROKEN"),
      splitBrainStores: splitBrain,
      missingWithoutEvidence,
    },
    before: { counts: currentExport.counts, economic: beforeEconomic },
    expectedAfter: { counts: expectedExport.counts, economic: expectedEconomic },
    invariants: {
      expectedComplete: expectedStoresPresent && hardBlockingInvariants === 0,
      economicQuantityAndValuationPreserved: economicInvariant,
      blocking: expectedExport.invariants,
      noSyntheticHistory: true,
      unknownCostRemainsUnknown: true,
    },
    writes,
    rollback: {
      provable: writes.length > 0 && writes.every((write) => write.strategy === "INSERT_MISSING_ONLY"),
      strategy: "Delete only rows inserted by this operation when their after checksum still matches; existing server rows are never overwritten.",
      insertedStoreKeys: writes.map((write) => write.storeKey),
      beforeExportId: backupExport.exportId,
    },
  };
}

export type VenueMigrationPlan = Awaited<ReturnType<typeof buildVenueMigrationPlan>>;

export function migrateFixtureStores(input: {
  plan: VenueMigrationPlan;
  stores: Partial<Record<AuthoritativeStoreKey, unknown>>;
}) {
  if (input.plan.migrationClass !== "SAFE_AUTOMATABLE" || !input.plan.rollback.provable) {
    return { ok: false as const, code: "VENUE_NOT_SAFE_AUTOMATABLE", stores: structuredClone(input.stores) };
  }
  const before = structuredClone(input.stores);
  const after = structuredClone(input.stores);
  const inserted: AuthoritativeStoreKey[] = [];
  for (const write of input.plan.writes) {
    if (Object.prototype.hasOwnProperty.call(after, write.storeKey)) continue;
    after[write.storeKey] = structuredClone(write.data);
    inserted.push(write.storeKey);
  }
  return {
    ok: true as const,
    operationId: input.plan.operationId,
    before,
    stores: after,
    inserted,
  };
}

export function rollbackFixtureStores(input: {
  migrated: ReturnType<typeof migrateFixtureStores>;
}) {
  if (!input.migrated.ok) return { ok: false as const, stores: input.migrated.stores };
  return { ok: true as const, stores: structuredClone(input.migrated.before) };
}

export async function buildControlledPlatformDryRun(input: {
  venues: PlatformVenueInput[];
  sourceCommit: string;
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const venues = await Promise.all(input.venues.map((venue) => buildVenueMigrationPlan({
    venue,
    sourceCommit: input.sourceCommit,
    generatedAt,
  })));
  const classes = ["NOT_REQUIRED", "SAFE_AUTOMATABLE", "REQUIRES_REVIEW", "BLOCKED"] as const;
  return {
    version: CONTROLLED_MIGRATION_VERSION,
    sourceCommit: input.sourceCommit,
    generatedAt,
    phase: "A" as const,
    mode: "read_only_dry_run" as const,
    productionBusinessWritesPerformed: 0 as const,
    migrationClasses: Object.fromEntries(classes.map((value) => [value, venues.filter((venue) => venue.migrationClass === value).length])),
    backups: {
      generated: venues.length,
      checksumVerified: venues.filter((venue) => venue.backup.checksum.value && venue.backup.immutable).length,
    },
    venues,
  };
}

export type ControlledPlatformDryRun = Awaited<ReturnType<typeof buildControlledPlatformDryRun>>;
