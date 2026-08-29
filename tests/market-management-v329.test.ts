import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MARKET_REFRESH_INTERVAL_MS,
  deriveMarketChanges,
  marketAnalysisIsStale,
  marketLocationSignature,
  shouldRunAutomaticMarketRefresh,
} from "../lib/bardoctor/market-analysis-state";

const generatedAt = "2026-08-28T12:00:00.000Z";
const now = Date.parse(generatedAt) + 60_000;

test("saved market snapshot is fresh for seven days and stale data remains identifiable", () => {
  assert.equal(marketAnalysisIsStale({ generatedAt }, now), false);
  assert.equal(marketAnalysisIsStale({ generatedAt, locationChangePending: true }, now), true);
  assert.equal(marketAnalysisIsStale({ generatedAt }, now + MARKET_REFRESH_INTERVAL_MS + 1), true);
  assert.equal(marketAnalysisIsStale(null, now), true);
});

test("automatic refresh guard prevents repeated open and allows one stale refresh", () => {
  const analysis = { generatedAt };
  assert.equal(shouldRunAutomaticMarketRefresh({ analysis, knownGeneratedAt: generatedAt, now }), false);
  assert.equal(shouldRunAutomaticMarketRefresh({ analysis, knownGeneratedAt: generatedAt, now: now + MARKET_REFRESH_INTERVAL_MS + 1 }), true);
  assert.equal(shouldRunAutomaticMarketRefresh({ analysis: { generatedAt: "2026-08-28T13:00:00.000Z" }, knownGeneratedAt: generatedAt, now: now + MARKET_REFRESH_INTERVAL_MS + 1 }), false);
  assert.equal(shouldRunAutomaticMarketRefresh({ analysis: null, knownGeneratedAt: "", now }), true);
});

test("unchanged location has one signature while a real location or focus change does not", () => {
  const first = marketLocationSignature({ address: " Бендеры, Центр ", city: "Бендеры", country: "Молдова", latitude: 46.8312341, longitude: 29.4712341, focus: "Коктейли" });
  const same = marketLocationSignature({ address: "бендеры,   центр", city: "бендеры", country: "молдова", latitude: "46.831234", longitude: "29.471234", focus: "коктейли" });
  assert.equal(first, same);
  assert.notEqual(first, marketLocationSignature({ address: "Бендеры, Центр", city: "Бендеры", country: "Молдова", latitude: 46.831234, longitude: 29.471234, focus: "Караоке" }));
  assert.notEqual(first, marketLocationSignature({ address: "Тирасполь, Центр", city: "Тирасполь", country: "Молдова", latitude: 46.831234, longitude: 29.471234, focus: "Коктейли" }));
});

test("detected competitor changes preserve previous decisions and add only new signals", () => {
  const previous = { competitors: [{ key: "goodzone", name: "GoodZone", strengths: ["Караоке"], gaps: ["Средний чек выше"], rating: "4.5" }], detectedChanges: [{ id: "old", competitorName: "GoodZone", summary: "Старое изменение", status: "resolved" }] };
  const changes = deriveMarketChanges({ previous, nextCompetitors: [{ key: "goodzone", name: "GoodZone", strengths: ["Караоке", "Живая музыка"], gaps: ["Средний чек выше"], rating: "4.6", sourceUrls: ["https://example.com"] }], detectedAt: generatedAt });
  assert.equal(changes.some((item) => item.id === "old" && item.status === "resolved"), true);
  assert.equal(changes.some((item) => item.summary === "Живая музыка"), true);
  assert.equal(changes.some((item) => String(item.summary).includes("4.5") && String(item.summary).includes("4.6")), true);
  assert.equal(changes.some((item) => item.summary === "Караоке"), false);
});

test("page and Home share canonical server snapshot and keep saved data during refresh errors", async () => {
  const [page, client, home, apiRoute] = await Promise.all([
    readFile(new URL("../public/market.js", import.meta.url), "utf8"),
    readFile(new URL("../public/competitor-market-client-v329.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/market/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /shared\.readSnapshot\(\)/);
  assert.match(page, /if\(r\.analysis&&r\.stale\)refresh\(true\)/);
  assert.match(page, /catch\{state\.refreshFailed=true\}/);
  assert.match(page, /Предыдущие результаты остаются доступными/);
  assert.match(home, /bdCompetitorMarketClientV329/);
  assert.match(home, /fetch\("\/api\/market"\)/);
  assert.match(client, /bd_market_server_snapshot_v329:/);
  assert.match(client, /bd_active_venue_id/);
  assert.match(apiRoute, /MARKET_KEY = "bd_market_analysis_v1"/);
  assert.match(apiRoute, /shouldRunAutomaticMarketRefresh/);
  assert.match(apiRoute, /await saveAnalysis\(account\.id, payload\)/);
  assert.match(apiRoute, /locationChangePending = true/);
  assert.match(apiRoute, /pendingLocation = \{ address, latitude, longitude, focus, updatedAt \}/);
});

test("responsive management layout keeps content above bottom navigation", async () => {
  const css = await readFile(new URL("../public/market.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(min-width:1024px\)/);
  assert.match(css, /calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.doesNotMatch(css, /market-hero/);
});
