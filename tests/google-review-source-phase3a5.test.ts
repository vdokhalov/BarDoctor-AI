import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

async function fixture() {
  const provider = { incoming: [] as Record<string, unknown>[], beforeFetch: undefined as (() => void) | undefined, calls: [] as string[] };
  const r = await lifecycleRuntime({ sources: "./lib/bardoctor/review-sources", context: "./lib/bardoctor/venue-ai-context", external: "./lib/bardoctor/diagnosis-context" }, { now: "2026-10-02T12:00:00.000Z", modules: { "phase3a5-google-fixture": provider }, plugins: [{ name: "isolated-google", setup(build) {
    build.onResolve({ filter: /^\.\/google$/ }, args => args.importer.endsWith("review-sources.ts") ? { path: "google-provider-fixture", namespace: "fixture" } : null);
    build.onResolve({ filter: /^phase3a5-google-fixture$/ }, args => ({ path: args.path, external: true }));
    build.onResolve({ filter: /\/google\.ts$/, namespace: "fixture" }, args => ({ path: args.path, namespace: "file" }));
    build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export * from '${process.cwd()}/lib/bardoctor/google.ts'; const fixture = require('phase3a5-google-fixture'); export async function decryptGoogleToken() { return 'isolated-token'; } export async function fetchGoogleReviews(token, account, location) { fixture.calls.push(account+'/'+location); fixture.beforeFetch?.(); return fixture.incoming; }` }));
  } }] });
  const owner = await r.register("google-source-owner@isolated.test");
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Google QA", currency: "MDL" }), owner.userId);
  r.sqlite.prepare("INSERT INTO google_connections(account_id,status,google_account_id,google_location_id,location_name,access_token_encrypted,token_expires_at) VALUES(?,'connected','account','A','Location A','isolated-encrypted','2099-01-01T00:00:00Z')").run(owner.userId);
  const put = (reviews: unknown[]) => r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_guest_reviews',?,'2026-10-02T09:00:00Z') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(owner.userId, JSON.stringify(reviews));
  const get = (): Record<string, unknown>[] => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_guest_reviews'").get(owner.userId)?.data_json ?? "[]"));
  const account = await r.api.auth.authenticateRequest(r.request(owner, "/api/auth/bootstrap")); assert.ok(account);
  return { ...r, provider, owner, account, put, get, sources: r.api.sources as unknown as typeof import("../lib/bardoctor/review-sources") };
}
const externalReview = { externalId: "external-1", authorName: "Google author", rating: 5, text: "External A", date: "2026-10-01", ownerReply: null };

test("actual sync safely updates mixed rows, preserves stable identity and bytes on unchanged repeat; A→B retains origin and scopes Home/AI", async t => {
  const r = await fixture(); t.after(r.close);
  const base = (id: string, source: string, text: string, other = {}) => ({ id, venueId: r.owner.activeVenueId, source, text, rating: 4, publishedAt: "2026-10-01", createdAt: "2026-10-01T12:00:00Z", ...other });
  r.put([base("manual-1", "manual", "Manual 1"), base("google-1", "google", "Old external A", { externalId: "external-1", sourceMetadata: { provider: "google_business_profile", googleAccountId: "account", googleLocationId: "A" } }), base("manual-2", "manual", "Manual 2")]);
  r.provider.incoming = [externalReview, { ...externalReview, externalId: "external-2", text: "Second A" }, externalReview];
  assert.equal((await r.sources.syncGoogleReviews(r.owner.userId)).ok, true);
  assert.equal(r.get().find(x => x.id === "manual-1")!.text, "Manual 1"); assert.equal(r.get().find(x => x.id === "manual-2")!.text, "Manual 2");
  assert.equal(r.get().find(x => x.id === "google-1")!.text, "External A"); assert.equal(r.get().filter(x => x.source === "google").length, 2);
  const bytes = r.sqlite.prepare("SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key='bd_guest_reviews'").get(r.owner.userId);
  r.provider.incoming.reverse(); assert.equal((await r.sources.syncGoogleReviews(r.owner.userId)).ok, true);
  assert.deepEqual(r.sqlite.prepare("SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key='bd_guest_reviews'").get(r.owner.userId), bytes);
  assert.equal((await r.sources.loadHomeReviewSnapshot(r.account)).metrics.total, 2);
  r.sqlite.prepare("UPDATE google_connections SET google_location_id='B',location_name='Location B',last_synced_at=NULL WHERE account_id=?").run(r.owner.userId);
  assert.equal((await r.sources.loadHomeReviewSnapshot(r.account)).metrics.total, 0);
  r.provider.incoming = [{ ...externalReview, text: "External B", rating: 1 }];
  assert.equal((await r.sources.syncGoogleReviews(r.owner.userId)).ok, true);
  assert.equal((r.get().find(x => x.id === "google-1")!.sourceMetadata as Record<string, unknown>).googleLocationId, "A"); assert.equal(r.get().filter(x => x.source === "google").length, 3);
  assert.equal((await r.sources.loadHomeReviewSnapshot(r.account)).metrics.total, 1);
  const context = await (r.api.context as unknown as typeof import("../lib/bardoctor/venue-ai-context")).loadVenueAIContext(r.account, "diagnosis");
  // Diagnosis includes manual reviews plus CURRENT provider location, excluding A.
  assert.equal(context.promptData.guestFeedback.total, 3);
  const external = await (r.api.external as unknown as typeof import("../lib/bardoctor/diagnosis-context")).loadDiagnosisExternalContext(r.account);
  assert.equal(external.reviews.total, 3); assert.ok(external.reviews.recent.every(review => !/External A|Second A/.test(review.text)));
});

test("unbound legacy collision fails without relabel/backfill or duplicate; foreign-venue rows are never relabelled", async t => {
  const r = await fixture(); t.after(r.close);
  const legacy = [{ id: "legacy", venueId: r.owner.activeVenueId, source: "google", externalId: "external-1", text: "Unknown old origin", rating: 4, date: "2026-10-01" }];
  r.put(legacy); r.provider.incoming = [externalReview];
  const result = await r.sources.syncGoogleReviews(r.owner.userId);
  assert.equal(result.ok, false); assert.match(result.error!, /GOOGLE_REVIEW_SOURCE_NEEDS_REVIEW/); assert.deepEqual(r.get(), legacy);
  assert.equal((await r.sources.loadHomeReviewSnapshot(r.account)).metrics.total, 0);
  r.put([{ ...legacy[0], venueId: 999999 }]);
  assert.equal((await r.sources.syncGoogleReviews(r.owner.userId)).ok, false); assert.equal(r.get()[0].venueId, 999999);
});

test("in-flight sync from A cannot update B checkpoint or relabel origin after selection changes", async t => {
  const r = await fixture(); t.after(r.close);
  r.provider.incoming = [externalReview];
  r.provider.beforeFetch = () => { r.sqlite.prepare("UPDATE google_connections SET google_location_id='B',location_name='Location B',last_synced_at=NULL WHERE account_id=?").run(r.owner.userId); };
  await r.sources.syncGoogleReviews(r.owner.userId);
  assert.equal(r.sqlite.prepare("SELECT last_synced_at FROM google_connections WHERE account_id=?").get(r.owner.userId)?.last_synced_at, null);
  assert.ok(r.get().every(review => (review.sourceMetadata as Record<string, unknown>).googleLocationId === "A"));
  assert.equal((await r.sources.loadHomeReviewSnapshot(r.account)).metrics.total, 0);
});
