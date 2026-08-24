import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORITATIVE_STORE_KEYS,
  emptyAuthoritativeVenueStores,
  stableJson,
  type AuthoritativeStoreKey,
} from "../lib/bardoctor/authoritative-persistence";
import {
  buildControlledPlatformDryRun,
  buildVenueMigrationPlan,
  legacyCandidateEnvelope,
  migrateFixtureStores,
  rollbackFixtureStores,
} from "../lib/bardoctor/controlled-server-migration";
import type { PlatformVenueInput } from "../lib/bardoctor/platform-persistence-audit";

function legacyCandidates(venueId: number) {
  return Object.fromEntries(Object.entries(emptyAuthoritativeVenueStores(venueId)).map(([key, data]) => [key, {
    source: "browser_local_storage",
    sourceKey: `${key}__owner@example.test__venue_${venueId}`,
    capturedAt: "2026-08-24T04:00:00.000Z",
    data,
  }]));
}

function venue(overrides: Partial<PlatformVenueInput> = {}): PlatformVenueInput {
  return {
    id: 7,
    dataAccountId: 70,
    workspaceId: 700,
    name: "Safe fixture",
    status: "active",
    serverStores: {},
    legacyCandidates: legacyCandidates(7),
    ...overrides,
  };
}

test("legacy export and dry-run are read-only and carry physical lineage", async () => {
  const input = venue();
  const before = stableJson(input);
  const plan = await buildVenueMigrationPlan({ venue: input, sourceCommit: "abc123", generatedAt: "2026-08-24T05:00:00.000Z" });
  assert.equal(stableJson(input), before);
  assert.equal(plan.writesPerformed, 0);
  assert.equal(plan.migrationClass, "SAFE_AUTOMATABLE");
  assert.equal(plan.writes.length, AUTHORITATIVE_STORE_KEYS.length);
  assert.equal(plan.backup.immutable, true);
  assert.equal(plan.backup.readOnly, true);
  assert.match(plan.backup.exportId, /^bdx_[a-f0-9]{24}$/);
  assert.ok(plan.backup.checksum.value.length === 64);
  assert.equal(plan.lineage[0].legacy?.physicalSource, "browser_local_storage");
  assert.equal(plan.rollback.provable, true);
});

test("migration is idempotent, preserves exact payloads, and fixture rollback restores before state", async () => {
  const plan = await buildVenueMigrationPlan({ venue: venue(), sourceCommit: "abc123" });
  const first = migrateFixtureStores({ plan, stores: {} });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.deepEqual(first.inserted.sort(), [...AUTHORITATIVE_STORE_KEYS].sort());
  const second = migrateFixtureStores({ plan, stores: first.stores });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.deepEqual(second.inserted, []);
  assert.equal(stableJson(second.stores), stableJson(first.stores));
  const rollback = rollbackFixtureStores({ migrated: first });
  assert.equal(rollback.ok, true);
  assert.deepEqual(rollback.stores, {});
});

test("a missing physical source blocks the venue without partial migration", async () => {
  const candidates = legacyCandidates(7);
  delete candidates.bd_stock_movements;
  const plan = await buildVenueMigrationPlan({ venue: venue({ legacyCandidates: candidates }), sourceCommit: "abc123" });
  assert.equal(plan.migrationClass, "BLOCKED");
  assert.deepEqual(plan.findings.missingWithoutEvidence, ["bd_stock_movements"]);
  const result = migrateFixtureStores({ plan, stores: {} });
  assert.equal(result.ok, false);
  assert.deepEqual(result.stores, {});
});

test("existing server rows are never overwritten and split-brain requires review", async () => {
  const candidates = legacyCandidates(7);
  const serverStores = {
    bd_suppliers: { exists: true, data: [{ id: "server" }], updatedAt: "2026-08-24T01:00:00.000Z" },
  };
  const plan = await buildVenueMigrationPlan({ venue: venue({ serverStores, legacyCandidates: candidates }), sourceCommit: "abc123" });
  assert.equal(plan.migrationClass, "REQUIRES_REVIEW");
  assert.deepEqual(plan.findings.splitBrainStores, ["bd_suppliers"]);
  assert.equal(plan.writes.some((write) => write.storeKey === "bd_suppliers"), false);
});

test("unknown cost remains unknown and routes venue to manual review instead of zeroing valuation", async () => {
  const candidates = legacyCandidates(7);
  const assortment = legacyCandidateEnvelope(candidates.bd_assortment_v1).data as Record<string, unknown>;
  assortment.stockBalances = [{ productKey: "gin", current: 4, unit: "pcs", averageUnitCost: null }];
  assortment.nomenclature = [{ key: "gin", name: "Gin", venueId: 7 }];
  const plan = await buildVenueMigrationPlan({ venue: venue({ legacyCandidates: candidates }), sourceCommit: "abc123" });
  assert.equal(plan.migrationClass, "REQUIRES_REVIEW");
  assert.equal(plan.before.economic.valuationByCurrency.UNKNOWN, undefined);
  assert.equal(plan.expectedAfter.economic.unknownCostPositions, 1);
  assert.equal((plan.writes.find((write) => write.storeKey === "bd_assortment_v1")?.data as Record<string, unknown>)
    .stockBalances instanceof Array, true);
});

test("cross-venue data is blocked and cannot be applied", async () => {
  const candidates = legacyCandidates(7);
  const assortment = legacyCandidateEnvelope(candidates.bd_assortment_v1).data as Record<string, unknown>;
  assortment.nomenclature = [{ key: "foreign", name: "Foreign", venueId: 8 }];
  const plan = await buildVenueMigrationPlan({ venue: venue({ legacyCandidates: candidates }), sourceCommit: "abc123" });
  assert.equal(plan.migrationClass, "BLOCKED");
  assert.ok(plan.findings.crossVenueViolations > 0);
  assert.equal(migrateFixtureStores({ plan, stores: {} }).ok, false);
});

test("fully server-authoritative venue is not migrated again", async () => {
  const stores = Object.fromEntries(Object.entries(emptyAuthoritativeVenueStores(7)).map(([key, data]) => [key, {
    exists: true,
    data,
    updatedAt: "2026-08-24T05:00:00.000Z",
  }])) as Partial<Record<AuthoritativeStoreKey, { exists: boolean; data: unknown; updatedAt: string }>>;
  const plan = await buildVenueMigrationPlan({ venue: venue({ serverStores: stores, legacyCandidates: undefined }), sourceCommit: "abc123" });
  assert.equal(plan.migrationClass, "NOT_REQUIRED");
  assert.equal(plan.writes.length, 0);
});

test("platform dry-run generates a checksum-backed backup for every venue and performs no writes", async () => {
  const report = await buildControlledPlatformDryRun({
    venues: [venue(), venue({ id: 8, dataAccountId: 80, workspaceId: 800, legacyCandidates: {} })],
    sourceCommit: "abc123",
    generatedAt: "2026-08-24T05:00:00.000Z",
  });
  assert.equal(report.productionBusinessWritesPerformed, 0);
  assert.equal(report.backups.generated, 2);
  assert.equal(report.backups.checksumVerified, 2);
  assert.equal(report.migrationClasses.SAFE_AUTOMATABLE, 1);
  assert.equal(report.migrationClasses.BLOCKED, 1);
});
