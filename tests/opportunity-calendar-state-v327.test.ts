import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { OpportunityCalendar } from "../lib/bardoctor/opportunity-calendar";
import { opportunityCalendarNeedsPersistence } from "../lib/bardoctor/opportunity-calendar-state";
import { OPPORTUNITY_CALENDAR_VERSION } from "../lib/bardoctor/opportunity-baseline";

function calendar(overrides: Partial<OpportunityCalendar> = {}): OpportunityCalendar {
  return {
    version: OPPORTUNITY_CALENDAR_VERSION,
    venueName: "Кёльн",
    locationLabel: "Бендеры, Молдова",
    profileSignature: "koeln-profile-v1",
    searchRadiusKm: 35,
    windowStart: "2026-08-28",
    windowEnd: "2027-08-28",
    generatedAt: "2026-08-28T13:21:00.000Z",
    model: "gpt-test",
    summary: "Тестовый безопасный snapshot",
    events: [],
    deletedEventIds: [],
    sources: [],
    ...overrides,
  };
}

test("missing stored calendar is persisted once and the next identical GET does not rewrite it", async () => {
  let stored: OpportunityCalendar | null = null;
  let saves = 0;
  const persist = async (next: OpportunityCalendar) => {
    if (opportunityCalendarNeedsPersistence(stored, next)) {
      stored = structuredClone(next);
      saves += 1;
    }
  };
  const baseline = calendar({ model: "calendar-core-v3" });
  await persist(baseline);
  assert.deepEqual(stored, baseline);
  await persist(structuredClone(baseline));
  assert.equal(saves, 1);
});

test("profile signature mismatch produces a persistable canonical calendar", () => {
  const stored = calendar({ profileSignature: "old-profile" });
  const canonical = calendar({ profileSignature: "new-profile", model: "calendar-core-v3" });
  assert.equal(opportunityCalendarNeedsPersistence(stored, canonical), true);
});

test("notification reconciliation changes are persisted without creating identical rewrites", () => {
  const stored = calendar();
  const reconciled = calendar({ notificationSummary: { scheduled: 2, queued: 1, nextAt: "2026-09-01T09:00:00.000Z", enabled: true } });
  assert.equal(opportunityCalendarNeedsPersistence(stored, reconciled), true);
  assert.equal(opportunityCalendarNeedsPersistence(reconciled, structuredClone(reconciled)), false);
});

test("GET persists a canonical baseline without blocking on notification reconciliation", () => {
  const route = readFileSync(new URL("../app/api/opportunities/route.ts", import.meta.url), "utf8");
  const getBody = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  assert.match(getBody, /opportunityCalendarNeedsPersistence\(storedCalendar, calendar\)[\s\S]*saveOpportunityCalendar/);
  assert.doesNotMatch(getBody, /reconcileOpportunityNotifications/);
  assert.doesNotMatch(route, /const before = JSON\.stringify\(calendar\)/);
});

test("automatic refresh has a server-side freshness and generatedAt duplicate guard", () => {
  const route = readFileSync(new URL("../app/api/opportunities/route.ts", import.meta.url), "utf8");
  assert.match(route, /body\.automatic === true/);
  assert.match(route, /previous\.generatedAt !== knownGeneratedAt/);
  assert.match(route, /opportunityCalendarIsStale\(previous, previousMatchesProfile, today\)/);
  assert.match(route, /skipped: true/);
});

test("stale and failed refresh keep the existing calendar visible", () => {
  const client = readFileSync(new URL("../public/opportunities.js", import.meta.url), "utf8");
  assert.match(client, /calendar-content[\s\S]*classList\.toggle\("hidden", !state\.calendar\)/);
  assert.match(client, /state\.refreshFailed = Boolean\(state\.calendar\)/);
  assert.match(client, /Показаны последние сохранённые данные|Показаны последние сохранённые данные/i);
  assert.doesNotMatch(client, /sessionStorage/);
});

test("Home and Calendar render a trustworthy cached snapshot before the server read completes", () => {
  const home = readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
  const calendarClient = readFileSync(new URL("../public/opportunities.js", import.meta.url), "utf8");
  assert.match(home, /readSnapshot\(\)[\s\S]{0,120}renderOpportunity\(cached, "saved"\)/);
  assert.match(home, /AbortController[\s\S]{0,240}15_000/);
  assert.match(calendarClient, /readSnapshot\(\)[\s\S]{0,140}applyResponse\(cached, false\)[\s\S]{0,80}render\(\)/);
  assert.match(calendarClient, /api\("\/api\/opportunities", \{\}, 15_000\)/);
});

test("successful refresh replaces the shared snapshot and failed refresh never clears it", () => {
  const client = readFileSync(new URL("../public/opportunities.js", import.meta.url), "utf8");
  assert.match(client, /state\.calendar = result\.calendar \|\| state\.calendar/);
  assert.match(client, /cacheCurrent\(result\)/);
  assert.doesNotMatch(client, /catch[\s\S]{0,180}state\.calendar = null/);
});

test("Home and Calendar use the same shared selector, cache and refresh lease", () => {
  const home = readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
  const calendarClient = readFileSync(new URL("../public/opportunities.js", import.meta.url), "utf8");
  for (const source of [home, calendarClient]) {
    assert.match(source, /bdOpportunityCalendarClientV327/);
    assert.match(source, /shared\.summary\(/);
    assert.match(source, /shared\.writeSnapshot\(/);
    assert.match(source, /shared\.acquireRefreshLease\(/);
  }
  assert.doesNotMatch(home, /potentialScore \|\| 0\) - Number\(left\.potentialScore/);
});

test("trustworthy cache and refresh coordination are isolated by account and venue", () => {
  const shared = readFileSync(new URL("../public/opportunity-calendar-client-v327.js", import.meta.url), "utf8");
  assert.match(shared, /bd_session/);
  assert.match(shared, /bd_active_venue_id/);
  assert.match(shared, /CACHE_MAX_AGE/);
  assert.match(shared, /response\.calendar/);
  assert.match(shared, /LEASE_DURATION/);
});

test("planned, watching, dismissed and delete remain PATCH-backed server decisions", () => {
  const client = readFileSync(new URL("../public/opportunities.js", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/opportunities/route.ts", import.meta.url), "utf8");
  assert.match(client, /method: "PATCH"/);
  for (const decision of ["planned", "watching", "dismissed"]) assert.match(client, new RegExp('"' + decision + '"'));
  assert.match(client, /action: "delete-event"/);
  assert.match(route, /deletedEventIds/);
  assert.match(route, /saveOpportunityCalendar\(account\.id, calendar\)/);
});

test("compact mobile and desktop layouts preserve bottom-nav clearance", () => {
  const css = readFileSync(new URL("../public/opportunities.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(min-width:1024px\)/);
  assert.match(css, /padding:0 0 calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /grid-template-columns:repeat\(3,168px\)/);
  assert.match(css, /details-content\{display:grid;grid-template-columns:repeat\(2/);
});

test("browser QA fixture is local-only and cannot bypass production authentication", () => {
  const fixture = readFileSync(new URL("../public/opportunity-calendar-qa-v327.js", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/opportunities/route.ts", import.meta.url), "utf8");
  assert.match(fixture, /terminal\.local/);
  assert.match(fixture, /127\.0\.0\.1/);
  assert.match(fixture, /localhost/);
  assert.match(fixture, /includes\(location\.hostname\)\) return/);
  assert.match(route, /includes\(url\.hostname\)/);
  assert.match(fixture, /qaGet.*hang/);
  assert.match(fixture, /qaGet.*fail/);
});
