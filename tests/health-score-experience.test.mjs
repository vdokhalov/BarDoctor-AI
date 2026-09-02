import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

await import(`../public/health-score-experience.js?test=${Date.now()}`);
const model = globalThis.bdHealthScoreExperience;

async function freshRuntime(label) {
  await import(`../public/health-score-experience.js?${label}=${Date.now()}-${Math.random()}`);
  return globalThis.bdHealthScoreExperience;
}

test("Health Score runtime exposes the v332 canonical startup state machine", () => {
  assert.equal(model.version, "health-score-v332");
});

test("Home keeps the compact canonical Business Health card before the financial result", async () => {
  const [bundle, css] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience-v152.css", import.meta.url), "utf8"),
  ]);
  const homeStart = bundle.indexOf("function bdHomeDaily(");
  const homeEnd = bundle.indexOf("function Dce()", homeStart);
  const home = bundle.slice(homeStart, homeEnd);
  const cardStart = bundle.indexOf("function bdHomeHealthIndexV200");
  const card = bundle.slice(cardStart, homeStart);

  assert.match(bundle, /bdHomeHealthIndexVersion="home-health-v200"/);
  assert.match(bundle, /bdOwnerUATFixesV286="owner-uat-v286"/);
  assert.match(bundle, /function bdHealthShiftCoverage\(e,t,n=new Date\).*trackingStartDate.*for\(const f of t\)/s);
  assert.match(bundle, /data-bd-home-health-index":"business-health-snapshot-v334/);
  assert.match(bundle, /data-bd-home-health-index":"business-health-v344-loading/);
  assert.match(bundle, /data-bd-home-health-index":"business-health-v334-unavailable/);
  assert.match(bundle, /"data-bd-health-snapshot-id":e\?\.snapshotId/);
  assert.match(bundle, /children:"Business Health"/);
  assert.match(card, /children:u\.hasIssue\?"Главный приоритет":"Состояние"/);
  assert.match(bundle, /bdHealthHomeZonesV332\(e\).*"Финансы".*"Спрос".*"Операции".*"Данные"/s);
  assert.match(card, /bdHealthLivePeriodV334\(e\)/);
  assert.doesNotMatch(card, /Достоверность диагноза|confidence/i);
  assert.ok(home.indexOf("i.jsx(bdHomeHealthIndexV200") < home.indexOf("i.jsx(bdHomeMoneyCard"));
  assert.match(css, /\.bd-home-health-card-v332\s*\{/);
  assert.match(css, /\.bd-home-health-zones-v332\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(card, /bd-home-health-zone-track-v332/, "Home zones stay compact without progress bars");
  assert.match(card, /children:u\.hasIssue\?"Главный приоритет":"Состояние"/);
  assert.match(bundle, /target:l\?\.target&&l\.target\.path/);
  assert.match(css, /\.bd-home-health-priority-body-v332\s*\{[^}]*min-height:\s*42px/s);
  assert.match(css, /\.bd-home-health-priority-action-v332\s*\{/);
  assert.match(css, /\.bd-home-health-card-v332\.is-loading\s*\{[^}]*min-height:\s*226px/s);
  assert.match(css, /@media \(max-width: 374px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /\.bd-home-daily > \.bd-home-health-card-v332\s*\{[^}]*grid-column:\s*1 !important/s);
  assert.match(css, /\.bd-home-daily > \.bd-home-money\s*\{[^}]*grid-column:\s*2 !important/s);
  assert.match(css, /touch-action:\s*manipulation/);
});

test("Business Health presents every supported state without inventing an action or trend", async () => {
  const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  const statusStart = bundle.indexOf("function bdHealthUiStatusV332");
  const statusEnd = bundle.indexOf("function bdHealthLivePeriodV334", statusStart);
  const status = bundle.slice(statusStart, statusEnd);
  const priorityStart = bundle.indexOf("function bdHealthPriorityV332");
  const priorityEnd = bundle.indexOf("function bdHealthZoneV332", priorityStart);
  const priority = bundle.slice(priorityStart, priorityEnd);

  assert.match(status, /e<45.*critical.*e<=70.*attention/s);
  assert.match(status, /Требует внимания.*внимание/s);
  assert.match(status, /Хорошее состояние.*хорошо/s);
  assert.match(status, /Недостаточно данных.*нет данных/s);
  assert.match(priority, /Всё под контролем/);
  assert.match(priority, /Подробнее о состоянии/);
  assert.match(priority, /Текущий анализ ограничен/);
  assert.match(priority, /1 зона требует внимания/);
  assert.match(bundle, /const t=e\?\.trend;if\(!t\|\|Number\(t\.periodDays\)!==7/);
  assert.match(bundle, /current_mtd_vs_previous_mtd|livePeriod/);
  assert.doesNotMatch(bundle, /Текущий анализ формируется/);
  assert.match(bundle, /fetch\("\/api\/business-health"/);
  assert.match(bundle, /n\.calculationVersion!==bdBusinessHealthCalculationVersionV284\|\|!n\.livePeriod/);
  const detail = bundle.slice(bundle.indexOf("function bdHealthDetailPriorityV332"), bundle.indexOf("function Ln("));
  assert.match(detail, /r\.path&&r\.path!=="\/health"/);
  assert.doesNotMatch(detail, /children:\["Подробнее о состоянии"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function c_e(){"), bundle.indexOf("function Ln(")), /bd-health-tabs-v332|Открыть раздел/);
});

test("daily history remains available for trend data but does not gate session startup", () => {
  const first = model.evaluate({}, {
    dateKey: "2026-08-11",
    score: 63,
    diagnosisToken: "diagnosis-1",
    closedMonthToken: "2026-07",
  });
  assert.equal(first.show, true);
  assert.equal(first.reason, "first-daily-entry");

  const repeat = model.evaluate(first.state, {
    dateKey: "2026-08-11",
    score: 63,
    diagnosisToken: "diagnosis-1",
    closedMonthToken: "2026-07",
  });
  assert.equal(repeat.show, false);
});

test("new session follows branding Splash -> server bootstrap -> Home", async () => {
  const runtime = await freshRuntime("startup-success");
  assert.equal(runtime.getLaunchStatus(), "new");
  assert.equal(runtime.beginLaunch(), true);
  assert.equal(runtime.beginLaunch(), true, "StrictMode-safe repeated begin remains pending");
  assert.deepEqual(runtime.getStartupSnapshot().phase, "SPLASH_LOADING");
  assert.equal(runtime.getStartupSnapshot().entryRendered, false);

  const waiting = runtime.startupDecision({
    launchRequested: true,
    minimumSplashElapsed: false,
    venueReady: true,
    hasProfile: true,
    cloudReady: true,
    score: 63,
  });
  assert.equal(waiting.next, "SPLASH_LOADING");

  const ready = runtime.startupDecision({
    launchRequested: true,
    minimumSplashElapsed: true,
    venueReady: true,
    hasProfile: true,
    cloudReady: true,
    score: 63,
  });
  assert.deepEqual(ready, { next: "HOME", reason: "server-bootstrap-ready" });
  assert.equal(runtime.transitionStartup("SPLASH_LOADING", "HEALTH_READY"), "HOME");
  assert.equal(runtime.getStartupSnapshot().entryRendered, false);

  runtime.completeLaunch("server-bootstrap-ready");
  assert.equal(runtime.getLaunchStatus(), "complete");
  assert.equal(runtime.getStartupSnapshot().phase, "HOME");
  assert.equal(runtime.getStartupSnapshot().entryRendered, false, "splash never renders Health score");
  assert.equal(runtime.beginLaunch(), false, "Home -> another route -> Home cannot restart splash");
});

test("a local score cannot bypass the server-authoritative startup snapshot", async () => {
  const runtime = await freshRuntime("timeout-with-score");
  runtime.beginLaunch();
  const decision = runtime.startupDecision({
    launchRequested: true,
    minimumSplashElapsed: true,
    timedOut: true,
    venueReady: true,
    hasProfile: true,
    cloudReady: false,
    score: 63,
  });
  assert.deepEqual(decision, {
    next: "HOME",
    reason: "server-bootstrap-timeout",
    fallback: true,
  });
  assert.equal(runtime.getLaunchStatus(), "pending");
});

test("branding splash completion prevents an internal-route replay", async () => {
  const runtime = await freshRuntime("startup-complete");
  runtime.beginLaunch();
  assert.equal(runtime.getStartupSnapshot().entryRendered, false);
  runtime.completeLaunch("server-bootstrap-ready");
  const snapshot = runtime.getStartupSnapshot();
  assert.equal(snapshot.phase, "HOME");
  assert.equal(snapshot.entryRendered, false);
  assert.equal(snapshot.diagnostics.at(-1).details.reason, "server-bootstrap-ready");
  assert.equal(runtime.beginLaunch(), false);
});

test("health data error or timeout without usable data falls back to Home with a diagnostic", async () => {
  const runtime = await freshRuntime("startup-fallback");
  runtime.beginLaunch();
  const decision = runtime.startupDecision({
    launchRequested: true,
    minimumSplashElapsed: true,
    timedOut: true,
    venueReady: true,
    hasProfile: true,
    cloudReady: false,
    score: null,
  });
  assert.deepEqual(decision, {
    next: "HOME",
    reason: "server-bootstrap-timeout",
    fallback: true,
  });
  runtime.fallbackLaunch(decision.reason, { cloudReady: false });
  const snapshot = runtime.getStartupSnapshot();
  assert.equal(snapshot.phase, "HOME");
  assert.equal(snapshot.entryRendered, false);
  assert.equal(snapshot.diagnostics.at(-1).event, "health-entry-fallback");
  assert.equal(snapshot.diagnostics.at(-1).details.reason, decision.reason);
});

test("a new document runtime creates a fresh launch lifecycle", async () => {
  const nextSession = await freshRuntime("new-session");
  assert.equal(nextSession.getLaunchStatus(), "new");
  assert.equal(nextSession.beginLaunch(), true);
});

test("each venue keeps an independent daily Entry state", () => {
  const venueA = model.evaluate({}, { dateKey: "2026-08-11", score: 63 });
  const venueARepeat = model.evaluate(venueA.state, { dateKey: "2026-08-11", score: 63 });
  const venueB = model.evaluate({}, { dateKey: "2026-08-11", score: 81 });

  assert.equal(venueARepeat.show, false);
  assert.equal(venueB.show, true);
  assert.equal(venueB.reason, "first-daily-entry");
});

test("Health Score Experience uses the visual-spec threshold without changing the score", () => {
  const baseline = model.evaluate({}, { dateKey: "2026-08-11", score: 63 }).state;
  const smallChange = model.evaluate(baseline, { dateKey: "2026-08-11", score: 66 });
  assert.equal(smallChange.show, false);
  assert.equal(smallChange.scoreChangeThreshold, 4);

  const substantialChange = model.evaluate(smallChange.state, {
    dateKey: "2026-08-11",
    score: 67,
  });
  assert.equal(substantialChange.show, true);
  assert.equal(substantialChange.reason, "score-change");
});

test("new full diagnosis and newly closed month each trigger one Entry", () => {
  const baseline = model.evaluate({}, {
    dateKey: "2026-08-11",
    score: 70,
    diagnosisToken: "diagnosis-1",
    closedMonthToken: "2026-06",
  }).state;

  const diagnosis = model.evaluate(baseline, {
    dateKey: "2026-08-11",
    score: 70,
    diagnosisToken: "diagnosis-2",
    closedMonthToken: "2026-06",
  });
  assert.equal(diagnosis.show, true);
  assert.equal(diagnosis.reason, "full-diagnosis");

  const closed = model.evaluate(diagnosis.state, {
    dateKey: "2026-08-11",
    score: 70,
    diagnosisToken: "diagnosis-2",
    closedMonthToken: "2026-07",
  });
  assert.equal(closed.show, true);
  assert.equal(closed.reason, "month-closed");
});

test("insufficient data stays honest and does not manufacture a score or factor", () => {
  const result = model.evaluate({}, { dateKey: "2026-08-11", score: null });
  assert.equal(result.show, true);
  assert.equal(result.state.lastEntryScore, null);
  assert.equal(model.mainFactor({ domains: [{ label: "Финансы", score: null }] }), null);
});

test("30-day trend is shown only when a real historical score exists", () => {
  let state = model.recordScore({}, "2026-07-12", 67);
  state = model.recordScore(state, "2026-08-11", 63);
  assert.deepEqual(model.trend(state, "2026-08-11", 63), {
    baselineDate: "2026-07-12",
    baselineScore: 67,
    delta: -4,
    direction: "down",
  });
  assert.equal(model.trend({}, "2026-08-11", 63), null);
});

test("main factor is selected from existing diagnostic domains", () => {
  assert.deepEqual(model.mainFactor({
    domains: [
      { id: "finance", label: "Финансы", score: 48 },
      { id: "staff", label: "Команда", score: 76 },
      { id: "operations", label: "Операции", score: 81 },
    ],
  }), { id: "finance", label: "Финансы", score: 48 });
});

test("production artifact keeps one startup surface and opens server-authoritative Home", async () => {
  const [bundle, css, runtime, response, manifest] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience-v152.css", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience.js", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.json/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotThrow(() => parse(runtime, { ecmaVersion: "latest", sourceType: "script" }));
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bdHealthScoreExperienceVersion="health-score-v334"/);
  assert.match(bundle, /bdSingleSplashVersionV395="v395"/);
  assert.match(bundle, /function ble\(\)\{return null\}/);
  assert.match(bundle, /data-bd-health-score-resting":"v153/);
  assert.match(bundle, /Pt\("bd_health_score_experience_v152"\)/);
  assert.match(bundle, /onClick:\(\)=>t\("\/health"\)/);
  assert.match(bundle, /e\?\.stateScore\?\?e\?\.overall/);
  assert.match(bundle, /dataQualityPercent:t\.dataQualityPercent/);
  assert.match(bundle, /source:"server_business_intelligence"/);
  assert.match(bundle, /function bdHealthStartupGateV155\(\{children:e\}\)/);
  assert.match(bundle, /i\.jsx\(bdHealthStartupGateV155,\{children:i\.jsxs\(bse/);
  assert.match(bundle, /bdStartupPerformanceVersionV343="v343"/);
  assert.doesNotMatch(bundle, /"data-bd-health-startup-machine":"v335"/);
  assert.doesNotMatch(bundle, /"data-bd-health-startup-machine":"v356"/);
  assert.doesNotMatch(bundle, /"data-bd-health-startup-state":"SPLASH_LOADING"/);
  assert.doesNotMatch(bundle, /\?"SPLASH_LOADING":"HOME"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdHealthStartupGateV155")), /bdHealthLaunchRenderedV155|HEALTH_ENTRY/);
  assert.match(bundle, /S\.useState\(\(\)=>bz\(\)\),\[r,a\]=S\.useState\(\(\)=>bz\(\)!==null\)/);
  assert.match(bundle, /function Woe\(\{children:e\}\)\{const\{isReady:t,profile:n\}=Un\(\),\[r,a\]=S\.useState\(!1\)/);
  assert.doesNotMatch(runtime, /cached-health-score-ready/);
  assert.match(runtime, /server-bootstrap-timeout/);
  assert.doesNotMatch(bundle, /setTimeout\(\(\)=>U\(!0\),900\)/);
  assert.doesNotMatch(bundle, /setTimeout\(\(\)=>I\(!0\),5200\)/);
  assert.doesNotMatch(
    bundle,
    /bdHealthLaunchCompleteV153|bdHealthStartupGateV154|bdHomeLaunchPhase|bdHomeLaunchRequested/,
    "the three competing v154 startup controllers must be removed",
  );
  const homeStart = bundle.indexOf("function Dce(){");
  const homeEnd = bundle.indexOf("const q7=", homeStart);
  assert.ok(homeStart >= 0 && homeEnd > homeStart);
  const homeSource = bundle.slice(homeStart, homeEnd);
  assert.doesNotMatch(homeSource, /Launch|health-entry|SPLASH_LOADING|bdHomeStartupTimedOutV349/);
  assert.match(homeSource, /data-bd-home-page":"v151/);

  const coordinatorStart = bundle.indexOf("function bdHealthStartupGateV155");
  const coordinatorEnd = bundle.indexOf("function cEe(){", coordinatorStart);
  const coordinator = bundle.slice(coordinatorStart, coordinatorEnd);
  assert.match(coordinator, /bdUseBusinessHealthSnapshotV284\(\)/);
  assert.match(coordinator, /n&&!!t/);
  assert.doesNotMatch(coordinator, /financeReady/);
  assert.match(coordinator, /bdStartupFirstPaintCompleteV201\(\)/);
  assert.match(coordinator, /return e/);
  assert.doesNotMatch(coordinator, /children:i\.jsx\(ble/);
  assert.doesNotMatch(coordinator, /zC\(/);
  assert.doesNotMatch(coordinator, /bdHealthScoreValueV153/);
  assert.doesNotMatch(coordinator, /bdHealthScoreEntryV153|HEALTH_ENTRY|confidence/);
  assert.doesNotMatch(coordinator, /lastDailyDate|first-daily-entry|bdHealthExperienceReadV153/);

  const sharedStoreStart = bundle.indexOf("const bdBusinessHealthSnapshotClientVersionV284");
  const sharedStoreEnd = bundle.indexOf("function WS(){", sharedStoreStart);
  const sharedStore = bundle.slice(sharedStoreStart, sharedStoreEnd);
  assert.ok(sharedStoreStart >= 0 && sharedStoreEnd > sharedStoreStart);
  assert.match(sharedStore, /S\.useSyncExternalStore\(bdBusinessHealthSubscribeV284,bdBusinessHealthGetSharedV284,bdBusinessHealthGetSharedV284\)/);
  assert.match(sharedStore, /bdBusinessHealthHydrateSharedV284\(!1\)/, "Home synchronously hydrates before its first render");
  assert.match(sharedStore, /if\(e===null\|\|e===void 0\|\|e===""\)return null/, "missing factor values stay null");
  assert.match(sharedStore, /availability:f===null\?"unavailable":"measured"/);
  assert.match(sharedStore, /if\(l&&l\.order>s\)return/, "older responses cannot replace a newer snapshot");
  assert.doesNotMatch(sharedStore, /Number\(d\?\.score\)/, "null must never be coerced to zero while ranking factors");

  assert.doesNotMatch(homeSource, /fetch\("\/api\/ai\/diagnosis"/, "Home navigation does not request a second diagnosis");
  assert.match(bundle, /fetch\("\/api\/business-health"/, "Home uses the deterministic canonical Health endpoint");
  assert.match(homeSource, /bdCanonicalSnapshot=g/, "Home shows the last canonical snapshot while refreshing");
  assert.match(homeSource, /bdHealthLoading=!g&&bdLiveHealthStatus!=="error"/);
  assert.match(bundle, /bdBusinessHealthCommitEnvelopeV284\(n,!0\),bdPersistDiagnosisV294\(n\)/, "refresh commits atomically before authoritative persistence");

  const splashStart = bundle.indexOf("function _le(){");
  const splashEnd = bundle.indexOf("const Ele=", splashStart);
  const rootSplash = bundle.slice(splashStart, splashEnd);
  if (bundle.includes('bdStableSplashVersionV394="v394"')) {
    assert.match(rootSplash, /useLayoutEffect/);
    assert.doesNotMatch(rootSplash, /2700|setTimeout|animate:|onAnimationComplete/);
  } else {
    assert.match(rootSplash, /setTimeout\(\(\)=>n\(!0\),2700\)/);
  }
  assert.doesNotMatch(rootSplash, /Ai\(|HealthLaunch|5200/);
  assert.doesNotMatch(rootSplash, /\/100|confidence|Диагноз/);

  assert.match(bundle, /onPointerUp:/);
  assert.match(bundle, /pointerType==="touch"/);
  assert.match(bundle, /onClick:[A-Za-z_$][\w$]*=>\{[A-Za-z_$][\w$]*\.stopPropagation\(\),T\(!0\)\}/);
  assert.match(bundle, /S\.useRef\(null\),N=S\.useRef\(null\)/, "auto and leave timers stay independent");
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.bd-health-startup-home\.is-concealed\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(response, /health-score-experience-v152\.css\?v=20260828-business-health-canonical-v335/);
  assert.match(response, /health-score-experience\.js\?v=20260828-health-startup-v332/);
  assert.match(response, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  assert.match(manifest, /start_url:\s*"\/home\?source=pwa"/);
});
