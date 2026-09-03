import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("guest reviews use one exact route and one canonical application navigation", async () => {
  const [route, client, integrationsRoute, navigation, bootstrap] = await Promise.all([
    source("app/reviews/route.ts"),
    source("public/reviews.js"),
    source("app/integrations/route.ts"),
    source("lib/bardoctor/standalone-navigation.ts"),
    source("public/bardoctor-preview.js"),
  ]);
  assert.match(route, /ЕДИНЫЙ REVIEW LAYER/);
  assert.match(client, /Google Business Profile/);
  assert.match(route, /РУЧНОЙ ВВОД/);
  assert.match(route, /CSV, Excel или JSON/);
  assert.match(route, /canonicalAppNavigationForRequest\(request, "more"\)/);
  assert.match(route, /if \(!isEmbeddedApplicationRoute\(request\)\) return barDoctorResponse\(\)/);
  assert.match(integrationsRoute, /review-layer-card/);
  assert.doesNotMatch(integrationsRoute, /Google Places|google-places-card|КОНКУРЕНТЫ/);
  assert.equal((navigation.match(/<nav /g) || []).length, 1);
  assert.match(bootstrap, /var standaloneRoutes = \["\/forgot-password"\]/);
});

test("review APIs enforce authentication, permissions and server-side idempotency", async () => {
  const [readRoute, createRoute, importRoute, layer, model, google] = await Promise.all([
    source("app/api/review-layer/route.ts"),
    source("app/api/review-layer/reviews/route.ts"),
    source("app/api/review-layer/import/route.ts"),
    source("lib/bardoctor/review-layer.ts"),
    source("lib/bardoctor/review-model.ts"),
    source("lib/bardoctor/review-sources.ts"),
  ]);
  [readRoute, createRoute, importRoute].forEach((file) => assert.match(file, /authenticateRequest/));
  assert.match(readRoute, /reviews\.view/);
  assert.match(createRoute, /reviews\.manage/);
  assert.match(importRoute, /reviews\.manage/);
  assert.match(importRoute, /data\.import/);
  assert.match(layer, /mergeReviewRecords/);
  assert.match(model, /reviewDeduplicationKey/);
  assert.match(model, /source.*externalId/s);
  assert.match(layer, /onConflictDoUpdate/);
  assert.match(google, /upsertReviewRecords/);
  assert.doesNotMatch(google, /const storeKey = "bd_guest_reviews"/);
});

test("the UI has actionable Google setup, shared AI analysis and late-response guards", async () => {
  const [client, css, sources, adminRoute, adminClient, competitors] = await Promise.all([
    source("public/reviews.js"),
    source("public/reviews.css"),
    source("lib/bardoctor/review-sources.ts"),
    source("app/api/admin/[section]/route.ts"),
    source("public/admin-v175.js"),
    source("app/api/competitors/refresh/route.ts"),
  ]);
  assert.match(client, /NOT CONFIGURED/);
  assert.match(client, /READY TO CONNECT/);
  assert.match(client, /openGoogleSettings/);
  assert.match(client, /\/api\/review-layer\/reviews/);
  assert.match(client, /\/api\/review-layer\/import\/preview/);
  assert.match(client, /\/api\/reviews\/analyze/);
  assert.match(client, /\/api\/reviews\/doctor-summary/);
  assert.match(client, /totalReviews: data\.total \|\| 0/);
  assert.match(client, /avgRating: data\.averageRating/);
  assert.match(client, /sequence !== state\.sequence \|\| venueAtStart !== currentVenueId\(\)/);
  assert.match(client, /bd:venue-will-change/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(sources, /reviewLayer/);
  assert.match(adminRoute, /section === "reviews"/);
  assert.match(adminClient, /renderReviews/);
  assert.match(competitors, /Google|Places|competitor/i);
});
