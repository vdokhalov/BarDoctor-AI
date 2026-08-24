import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bulk store bootstrap is read-only and exposes missing authoritative stores", async () => {
  const source = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /INSERT INTO|UPDATE domain_data|database\.batch|\.insert\(/);
  assert.match(source, /missingAuthoritativeStores/);
  assert.match(source, /writesPerformed: 0/);
});

test("generic writes cannot mutate immutable movement ledger or bootstrap over history", async () => {
  const source = await readFile(new URL("../app/api/store/[key]/route.ts", import.meta.url), "utf8");
  assert.match(source, /IMMUTABLE_STOCK_LEDGER/);
  assert.match(source, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
  assert.match(source, /INVENTORY_SNAPSHOT_STORE_KEY/);
  assert.doesNotMatch(source, /repairInventoryPurchaseAmounts|repairedStockMovements/);
});

test("purchase posting and inventory finalization stop at a missing authoritative assortment", async () => {
  const purchase = await readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8");
  const counts = await readFile(new URL("../app/api/inventory/counts/route.ts", import.meta.url), "utf8");
  assert.match(purchase, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
  assert.match(purchase, /INVENTORY_SNAPSHOT_STORE_KEY/);
  assert.match(counts, /assortmentExists/);
  assert.match(counts, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
});

test("export candidate preview is owner-only and read-only", async () => {
  const source = await readFile(new URL("../app/api/data-integrity/export/route.ts", import.meta.url), "utf8");
  assert.match(source, /account\.role !== "owner"/);
  assert.match(source, /writesPerformed: 0/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});

test("new secondary venues initialize isolated empty authoritative stores", async () => {
  const source = await readFile(new URL("../lib/bardoctor/venue-service.ts", import.meta.url), "utf8");
  assert.match(source, /authoritativeVenueStoreRows/);
  assert.match(source, /dataAccountId/);
  assert.match(source, /venueId: venue\.id/);
  assert.doesNotMatch(source, /actor\.id.*authoritativeVenueStoreRows/);
});

test("new owner account initializes stores only when its venue is newly created", async () => {
  const source = await readFile(new URL("../lib/bardoctor/auth.ts", import.meta.url), "utf8");
  assert.match(source, /let createdVenue = false/);
  assert.match(source, /createdVenue = true/);
  assert.match(source, /if \(createdVenue\)/);
  assert.match(source, /authoritativeVenueStoreRows/);
});

test("platform export is platform-admin only and performs no persistence writes", async () => {
  const source = await readFile(new URL("../app/api/admin/data-integrity/route.ts", import.meta.url), "utf8");
  assert.match(source, /authenticatePlatformAdmin\(request\)/);
  assert.match(source, /productionWritesPerformed/);
  assert.match(source, /writesPerformed: 0/);
  assert.match(source, /platform_immutable_export_bundle/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});
