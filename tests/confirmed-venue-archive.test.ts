import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CONFIRMED_ARCHIVE_VENUE_IDS,
  isExactConfirmedArchiveSet,
  PROTECTED_ACTIVE_VENUE_IDS,
} from "../lib/bardoctor/confirmed-venue-archive";

const root = new URL("../", import.meta.url);
const source = (path: string) => readFile(new URL(path, root), "utf8");

test("confirmed archive plan accepts only the exact set and protects the three retained venues", () => {
  assert.deepEqual(CONFIRMED_ARCHIVE_VENUE_IDS, [2, 3, 1080, 3162, 3281, 3282, 3283, 3284, 3285, 3286, 3287]);
  assert.deepEqual(PROTECTED_ACTIVE_VENUE_IDS, [1, 2088, 3280]);
  assert.equal(isExactConfirmedArchiveSet([...CONFIRMED_ARCHIVE_VENUE_IDS].reverse()), true);
  assert.equal(isExactConfirmedArchiveSet([...CONFIRMED_ARCHIVE_VENUE_IDS, 9999]), false);
  assert.equal(isExactConfirmedArchiveSet(CONFIRMED_ARCHIVE_VENUE_IDS.slice(1)), false);
  assert.equal(isExactConfirmedArchiveSet([2, 2, ...CONFIRMED_ARCHIVE_VENUE_IDS.slice(2)]), false);
});

test("archive endpoint is admin-only, same-origin, reversible and preserves all related data", async () => {
  const endpoint = await source("app/api/admin/venues/archive-confirmed/route.ts");
  assert.match(endpoint, /authenticatePlatformAdmin\(request\)/);
  assert.match(endpoint, /x-admin-intent.*archive-confirmed-venues/s);
  assert.match(endpoint, /isExactConfirmedArchiveSet/);
  assert.match(endpoint, /PROTECTED_ACTIVE_VENUE_IDS/);
  assert.match(endpoint, /status: "archived"/);
  assert.match(endpoint, /recordPlatformAdminAudit/);
  assert.match(endpoint, /deleted: false/);
  assert.doesNotMatch(endpoint, /\.delete\(|DELETE FROM|DROP TABLE|update\(accounts\)|update\(domainData\)|update\(venueMemberships\)/);
});

test("migration operator UI sends the exact confirmed list and intent", async () => {
  const [page, client] = await Promise.all([
    source("app/admin/migrations/route.ts"),
    source("public/admin-migrations-v265.js"),
  ]);
  assert.match(page, /Кёльн #1, EazywaY #2088 и Плакучая Ива #3280/);
  assert.match(page, /Данные и резервные копии не удаляются/);
  assert.match(client, /\/api\/admin\/venues\/archive-confirmed/);
  assert.match(client, /X-Admin-Intent.*archive-confirmed-venues/s);
  assert.match(client, /venueIds: venueIds/);
  assert.match(client, /KEEP 1,2088,3280 ACTIVE/);
});
