import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  allowedLegacySourceKeys,
  CAPTURE_ENABLED_VENUE_IDS,
  validateCapturedCandidates,
} from "../lib/bardoctor/venue-migration-capture";

const root = new URL("../", import.meta.url);
const source = (path: string) => readFile(new URL(path, root), "utf8");

test("capture is enabled only for EazywaY and Plakuchaya Iva", () => {
  assert.deepEqual(CAPTURE_ENABLED_VENUE_IDS, [2088, 3280]);
});

test("secondary venue accepts only its exact account-and-venue legacy key", () => {
  assert.deepEqual(allowedLegacySourceKeys({
    storeKey: "bd_assortment_v1",
    email: "owner@test",
    venueId: 3280,
    primaryVenue: false,
  }), ["bd_assortment_v1__owner@test__venue_3280"]);
  assert.equal(validateCapturedCandidates({
    email: "owner@test",
    venueId: 3280,
    primaryVenue: false,
    value: {
      bd_assortment_v1: {
        source: "browser_local_storage",
        sourceKey: "bd_assortment_v1__owner@test",
        capturedAt: "2026-08-24T07:00:00.000Z",
        data: {},
      },
    },
  }).ok, false);
});

test("primary venue may use exact scoped or documented compatibility keys", () => {
  const keys = allowedLegacySourceKeys({
    storeKey: "bd_suppliers",
    email: "tester@test",
    venueId: 2088,
    primaryVenue: true,
  });
  assert.deepEqual(keys, ["bd_suppliers__tester@test__venue_2088", "bd_suppliers__tester@test", "bd_suppliers"]);
});

test("capture route persists only an immutable backup and performs no business writes", async () => {
  const route = await source("app/api/migration/capture/route.ts");
  assert.match(route, /authenticateRequest\(request\)/);
  assert.match(route, /x-migration-intent.*capture-current-venue-legacy-data/s);
  assert.match(route, /validateCapturedCandidates/);
  assert.match(route, /venueMigrationExports/);
  assert.match(route, /writesPerformed: 0/);
  assert.match(route, /CAPTURE_BACKUP_VERIFICATION_FAILED/);
  assert.doesNotMatch(route, /update\(domainData\)|insert\(domainData\)|DELETE FROM domain_data|UPDATE domain_data/);
});

test("browser collector is read-only, venue-aware, and never uploads automatically", async () => {
  const client = await source("public/venue-migration-capture-v267.js");
  assert.match(client, /bd_active_venue_id/);
  assert.match(client, /state\.primaryVenue \? \[exact/);
  assert.match(client, /X-Migration-Intent/);
  const beforeClick = client.slice(0, client.indexOf('button.addEventListener("click"'));
  assert.doesNotMatch(beforeClick, /method: "POST"|removeItem|clear\(\)|deleteDatabase/);
  assert.doesNotMatch(client, /localStorage\.setItem|localStorage\.removeItem|indexedDB\.deleteDatabase/);
});
