import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHORITATIVE_STORE_KEYS,
  emptyAuthoritativeVenueStores,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "../lib/bardoctor/authoritative-persistence";
import {
  buildPlatformPersistenceAudit,
  classifyVenuePersistence,
  type PlatformVenueInput,
} from "../lib/bardoctor/platform-persistence-audit";

function serverStores(venueId: number): Record<AuthoritativeStoreKey, AuthoritativeStoreInput> {
  const stores = emptyAuthoritativeVenueStores(venueId);
  return Object.fromEntries(AUTHORITATIVE_STORE_KEYS.map((key) => [key, {
    exists: true,
    data: stores[key],
    updatedAt: "2026-08-24T00:00:00.000Z",
  }])) as Record<AuthoritativeStoreKey, AuthoritativeStoreInput>;
}

function venue(id: number, stores: PlatformVenueInput["serverStores"] = {}): PlatformVenueInput {
  return { id, dataAccountId: id * 10, workspaceId: id, status: "active", serverStores: stores };
}

test("full five-store boundary is fully server authoritative", () => {
  assert.equal(classifyVenuePersistence(venue(1, serverStores(1))), "FULLY_SERVER_AUTHORITATIVE");
});

test("purchase history without assortment and movements is split-brain", () => {
  assert.equal(classifyVenuePersistence(venue(1, {
    bd_purchase_documents: { exists: true, data: [] },
    bd_inventory_snapshots: { exists: true, data: [] },
  })), "MIXED_SPLIT_BRAIN");
});

test("client candidate without server store remains legacy-held", () => {
  const input = venue(1);
  input.legacyCandidates = { bd_assortment_v1: { nomenclature: [] } };
  assert.equal(classifyVenuePersistence(input), "LEGACY_CLIENT_HELD");
});

test("unknown empty boundary is not silently classified as an empty venue", () => {
  assert.equal(classifyVenuePersistence(venue(1)), "INCOMPLETE_UNKNOWN");
});

test("partial non-historical server state is classified separately", () => {
  assert.equal(classifyVenuePersistence(venue(1, {
    bd_suppliers: { exists: true, data: [] },
  })), "PARTIALLY_SERVER_AUTHORITATIVE");
});

test("platform report isolates venue stores and creates one export per venue", async () => {
  const report = await buildPlatformPersistenceAudit({
    venues: [venue(1, serverStores(1)), venue(2, serverStores(2))],
    accountCount: 3,
    userAccountCount: 1,
    tenantCount: 2,
    membershipCount: 2,
    generatedAt: "2026-08-24T00:00:00.000Z",
    sourceCommit: "abc123",
  });
  assert.equal(report.exports.created, 2);
  assert.equal(report.exports.complete, 2);
  assert.equal(report.productionWritesPerformed, 0);
  assert.equal(report.venueReports[0].export.sourceCommit, "abc123");
  assert.notEqual(report.venueReports[0].export.exportId, report.venueReports[1].export.exportId);
  assert.equal((report.venueReports[0].export.stores.bd_assortment_v1 as { venueId: number }).venueId, 1);
  assert.equal((report.venueReports[1].export.stores.bd_assortment_v1 as { venueId: number }).venueId, 2);
});

test("incomplete export blocks reconciliation and migration", async () => {
  const report = await buildPlatformPersistenceAudit({
    venues: [venue(1, { bd_inventory_snapshots: { exists: true, data: [] } })],
    accountCount: 1,
    userAccountCount: 1,
    tenantCount: 1,
    membershipCount: 1,
    sourceCommit: "abc123",
  });
  const result = report.venueReports[0];
  assert.equal(result.export.complete, false);
  assert.equal(result.export.reconciliationAllowed, false);
  assert.notEqual(result.migrationCandidate, "SAFE_AUTOMATABLE");
});

test("domain matrix has explicit read and write lineage for every critical domain", async () => {
  const report = await buildPlatformPersistenceAudit({
    venues: [venue(1, serverStores(1))],
    accountCount: 1,
    userAccountCount: 1,
    tenantCount: 1,
    membershipCount: 1,
    sourceCommit: "abc123",
  });
  const domains = report.venueReports[0].domainMatrix;
  assert.ok(domains.length >= 12);
  assert.ok(domains.every((domain) => domain.currentReadSource === "server_d1"));
  assert.ok(domains.every((domain) => domain.currentWriteSource === "server_d1"));
});

test("cross-venue records are counted without mutating either venue", async () => {
  const stores = serverStores(1);
  const assortment = {
    venueId: 1,
    nomenclature: [{ productKey: "foreign", venueId: 2 }],
    stockBalances: [], supplierProductMappings: [], recipes: [],
  };
  stores.bd_assortment_v1.data = assortment;
  const before = JSON.stringify(assortment);
  const report = await buildPlatformPersistenceAudit({
    venues: [venue(1, stores)], accountCount: 2, userAccountCount: 2,
    tenantCount: 2, membershipCount: 2, sourceCommit: "abc123",
  });
  assert.ok(report.crossVenueOrAccountViolations > 0);
  assert.equal(JSON.stringify(assortment), before);
  assert.equal(report.productionWritesPerformed, 0);
});
