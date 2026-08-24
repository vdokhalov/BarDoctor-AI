import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHORITATIVE_ENTITY_SOURCES,
  AUTHORITATIVE_STORE_KEYS,
  buildImmutableVenueExport,
  authoritativeVenueStoreRows,
  emptyAuthoritativeVenueStores,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "../lib/bardoctor/authoritative-persistence";

function authoritativeStores(venueId = 1): Record<AuthoritativeStoreKey, AuthoritativeStoreInput> {
  const data = emptyAuthoritativeVenueStores(venueId);
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, {
    exists: true, data: value, updatedAt: "2026-08-24T00:00:00.000Z",
  }])) as Record<AuthoritativeStoreKey, AuthoritativeStoreInput>;
}

test("complete immutable export uses only server D1 sources and performs no writes", async () => {
  const snapshot = await buildImmutableVenueExport({
    venue: { id: 1, name: "One", workspaceId: 7, dataAccountId: 99 },
    serverStores: authoritativeStores(), exportedAt: "2026-08-24T01:00:00.000Z",
  });
  assert.equal(snapshot.complete, true);
  assert.equal(snapshot.reconciliationAllowed, true);
  assert.equal(snapshot.dryRun.writesPerformed, 0);
  assert.equal(snapshot.counts.serverAuthoritativeStores, AUTHORITATIVE_STORE_KEYS.length);
  assert.equal(JSON.stringify(snapshot).includes("dataAccountId"), false);
});

test("checksum and export id are stable for the same snapshot", async () => {
  const stores = authoritativeStores();
  const one = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores, exportedAt: "2026-08-24T01:00:00Z" });
  const two = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores, exportedAt: "2026-08-25T01:00:00Z" });
  assert.equal(one.checksum.value, two.checksum.value);
  assert.equal(one.exportId, two.exportId);
});

test("missing assortment blocks reconciliation instead of treating it as empty", async () => {
  const stores = authoritativeStores(); stores.bd_assortment_v1 = { exists: false, data: null };
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.equal(snapshot.complete, false);
  assert.equal(snapshot.reconciliationAllowed, false);
  assert.equal(snapshot.counts.missingStores, 1);
  assert.ok(snapshot.invariants.some((item) => item.code === "AUTHORITATIVE_SOURCE_MISSING"));
});

test("invalid server JSON blocks reconciliation instead of being treated as empty", async () => {
  const stores = authoritativeStores();
  stores.bd_assortment_v1 = { exists: true, data: null, parseError: true };
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.equal(snapshot.complete, false);
  assert.equal(snapshot.reconciliationAllowed, false);
  assert.ok(snapshot.invariants.some((item) => item.code === "AUTHORITATIVE_STORE_INVALID_JSON"));
  assert.equal(snapshot.storeProvenance.bd_assortment_v1.validJson, false);
});

test("legacy candidate contributes dry-run counts but never becomes authoritative", async () => {
  const stores = authoritativeStores(); stores.bd_assortment_v1 = { exists: false, data: null };
  const snapshot = await buildImmutableVenueExport({
    venue: { id: 1 }, serverStores: stores,
    legacyCandidates: { bd_assortment_v1: { nomenclature: [{ productKey: "p", name: "P", venueId: 1 }], stockBalances: [] } },
  });
  assert.equal(snapshot.counts.canonicalItems, 1);
  assert.equal(snapshot.counts.legacyCandidateStores, 1);
  assert.equal(snapshot.reconciliationAllowed, false);
  assert.equal(snapshot.dryRun.writesPerformed, 0);
});

test("export counts purchase chain deterministically", async () => {
  const stores = authoritativeStores();
  stores.bd_assortment_v1.data = { venueId: 1, nomenclature: [{ productKey: "p", name: "P", venueId: 1 }], stockBalances: [{ productKey: "p", current: 1, averageUnitCost: 5, venueId: 1 }], supplierProductMappings: [], recipes: [] };
  stores.bd_purchase_documents.data = [{ id: "d", venueId: 1, status: "confirmed", items: [{ id: "l", productKey: "p" }] }];
  stores.bd_stock_movements.data = [{ id: "m", venueId: 1, type: "receipt", productKey: "p", sourceDocumentId: "d" }];
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.equal(snapshot.counts.purchaseDocuments, 1);
  assert.equal(snapshot.counts.purchaseLines, 1);
  assert.equal(snapshot.counts.stockMovements, 1);
  assert.equal(snapshot.invariants.some((item) => item.code === "MOVEMENT_CHAIN_INVALID"), false);
});

test("historical snapshot keys resolve through additive aliases", async () => {
  const stores = authoritativeStores();
  stores.bd_assortment_v1.data = { venueId: 1, nomenclature: [{ productKey: "new", name: "New", venueId: 1 }], stockBalances: [{ productKey: "new", current: 0, venueId: 1 }], inventoryProductAliases: [{ from: "old", to: "new" }], supplierProductMappings: [], recipes: [] };
  stores.bd_inventory_snapshots.data = [{ id: "s", venueId: 1, items: [{ productKey: "old" }] }];
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.equal(snapshot.invariants.some((item) => item.code === "SNAPSHOT_KEY_UNRESOLVED"), false);
});

test("invalid supplier mapping target blocks reconciliation", async () => {
  const stores = authoritativeStores();
  stores.bd_assortment_v1.data = { venueId: 1, nomenclature: [], stockBalances: [], recipes: [], supplierProductMappings: [{ id: "map", sourceItemKey: "src", canonicalProductKey: "missing", venueId: 1 }] };
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.equal(snapshot.reconciliationAllowed, false);
  assert.ok(snapshot.invariants.some((item) => item.code === "SUPPLIER_MAPPING_TARGET_INVALID"));
});

test("cross-venue records are blocking and isolated", async () => {
  const stores = authoritativeStores(1);
  stores.bd_assortment_v1.data = { venueId: 1, nomenclature: [{ productKey: "foreign", venueId: 2 }], stockBalances: [], supplierProductMappings: [], recipes: [] };
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.ok(snapshot.invariants.some((item) => item.code === "CROSS_VENUE_REFERENCE"));
  assert.equal(snapshot.reconciliationAllowed, false);
});

test("positive stock without cost is reported without changing data", async () => {
  const stores = authoritativeStores();
  const assortment = { venueId: 1, nomenclature: [{ productKey: "p", name: "P", venueId: 1 }], stockBalances: [{ productKey: "p", name: "P", current: 10, averageUnitCost: 0, venueId: 1 }], supplierProductMappings: [], recipes: [] };
  stores.bd_assortment_v1.data = assortment;
  const before = JSON.stringify(assortment);
  const snapshot = await buildImmutableVenueExport({ venue: { id: 1 }, serverStores: stores });
  assert.ok(snapshot.invariants.some((item) => item.code === "POSITIVE_STOCK_WITHOUT_COST"));
  assert.ok(snapshot.dryRun.valuationRecordsPotentiallyAffected >= 1);
  assert.equal(JSON.stringify(assortment), before);
});

test("entity source map has one explicit authoritative owner per entity", () => {
  assert.equal(AUTHORITATIVE_ENTITY_SOURCES.stockMovements, "bd_stock_movements");
  assert.equal(AUTHORITATIVE_ENTITY_SOURCES.purchaseDocuments, "bd_purchase_documents");
  assert.equal(AUTHORITATIVE_ENTITY_SOURCES.techCards, "bd_assortment_v1");
});

test("new venue stores are isolated and contain no shared mutable objects", () => {
  const one = emptyAuthoritativeVenueStores(1); const two = emptyAuthoritativeVenueStores(2);
  assert.equal((one.bd_assortment_v1 as { venueId: number }).venueId, 1);
  assert.equal((two.bd_assortment_v1 as { venueId: number }).venueId, 2);
  assert.notEqual(one.bd_assortment_v1, two.bd_assortment_v1);
});

test("new venue initialization creates exactly five venue-scoped server rows", () => {
  const rows = authoritativeVenueStoreRows({ dataAccountId: 77, venueId: 42, updatedAt: "now" });
  assert.equal(rows.length, AUTHORITATIVE_STORE_KEYS.length);
  assert.ok(rows.every((row) => row.accountId === 77 && row.updatedAt === "now"));
  const assortment = JSON.parse(rows.find((row) => row.storeKey === "bd_assortment_v1")!.dataJson);
  assert.equal(assortment.venueId, 42);
  assert.deepEqual(assortment.nomenclature, []);
});
