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

test("Health Score runtime exposes the v155 startup state machine", () => {
  assert.equal(model.version, "health-score-v155");
});

test("Home keeps a prominent Health Index card before the financial result", async () => {
  const [bundle, css] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience-v152.css", import.meta.url), "utf8"),
  ]);
  const homeStart = bundle.indexOf("function bdHomeDaily(");
  const homeEnd = bundle.indexOf("function Dce()", homeStart);
  const home = bundle.slice(homeStart, homeEnd);

  assert.match(bundle, /bdHomeHealthIndexVersion="home-health-v200"/);
  assert.match(bundle, /data-bd-home-health-index":"business-health-snapshot-v283/);
  assert.match(bundle, /Достоверность диагноза/);
  assert.match(bundle, /children:"Business Health"/);
  assert.ok(home.indexOf("i.jsx(bdHomeHealthIndexV200") < home.indexOf("i.jsx(bdHomeMoneyCard"));
  assert.match(css, /\.bd-home-health-index\s*\{/);
  assert.match(css, /grid-template-columns:\s*100px minmax\(0, 1fr\) 24px/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /\.bd-home-health-index\s*\{[^}]*grid-column:\s*1 !important/s);
  assert.match(css, /\.bd-home-daily > \.bd-home-money\s*\{[^}]*grid-column:\s*2 !important/s);
  assert.match(css, /touch-action:\s*manipulation/);
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

test("new session follows Splash -> rendered Health Entry -> Home", async () => {
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
  assert.equal(ready.next, "HEALTH_ENTRY");
  assert.equal(runtime.transitionStartup("SPLASH_LOADING", "HEALTH_READY"), "HEALTH_ENTRY");
  assert.equal(runtime.getStartupSnapshot().entryRendered, false, "flag is not set before render");

  runtime.markEntryRendered({ score: 63 });
  assert.equal(runtime.getLaunchStatus(), "shown");
  assert.equal(runtime.getStartupSnapshot().phase, "HEALTH_ENTRY");
  assert.equal(runtime.getStartupSnapshot().entryRendered, true);

  runtime.completeLaunch("timer");
  assert.equal(runtime.transitionStartup("HEALTH_ENTRY", "ENTRY_FINISHED"), "HOME");
  assert.equal(runtime.getLaunchStatus(), "complete");
  assert.equal(runtime.getStartupSnapshot().phase, "HOME");
  assert.equal(runtime.beginLaunch(), false, "Home -> another route -> Home cannot restart Entry");
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
    reason: "health-data-timeout-no-usable-score",
    fallback: true,
  });
  assert.equal(runtime.getLaunchStatus(), "pending");
});

test("Skip completes only after Entry has rendered and prevents an internal-route replay", async () => {
  const runtime = await freshRuntime("startup-skip");
  runtime.beginLaunch();
  assert.equal(runtime.getStartupSnapshot().entryRendered, false);
  runtime.markEntryRendered({ score: 63 });
  runtime.completeLaunch("skip");
  const snapshot = runtime.getStartupSnapshot();
  assert.equal(snapshot.phase, "HOME");
  assert.equal(snapshot.entryRendered, true);
  assert.equal(snapshot.diagnostics.at(-1).details.reason, "skip");
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
    reason: "health-data-timeout-no-usable-score",
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

test("production artifact has one startup owner and cannot complete before Entry render", async () => {
  const [bundle, css, runtime, response, manifest] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience-v152.css", import.meta.url), "utf8"),
    readFile(new URL("../public/health-score-experience.js", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.json/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotThrow(() => parse(runtime, { ecmaVersion: "latest", sourceType: "script" }));
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bdHealthScoreExperienceVersion="health-score-v155"/);
  assert.match(bundle, /data-bd-health-entry":"v283/);
  assert.match(bundle, /data-bd-health-score-resting":"v153/);
  assert.match(bundle, /Pt\("bd_health_score_experience_v152"\)/);
  assert.match(bundle, /onClick:\(\)=>t\("\/health"\)/);
  assert.match(bundle, /e\?\.stateScore\?\?e\?\.overall/);
  assert.match(bundle, /dataQualityPercent:t\.dataQualityPercent/);
  assert.match(bundle, /source:"server_business_intelligence"/);
  assert.match(bundle, /function bdHealthStartupGateV155\(\{children:e\}\)/);
  assert.match(bundle, /i\.jsx\(bdHealthStartupGateV155,\{children:i\.jsxs\(bse/);
  assert.match(bundle, /"data-bd-health-startup-machine":"v283"/);
  assert.match(bundle, /"data-bd-health-startup-state":"SPLASH_LOADING"/);
  assert.match(bundle, /q\?"SPLASH_LOADING":"HOME"/);
  assert.match(bundle, /R\.next==="HEALTH_ENTRY"/);
  assert.match(bundle, /U\("HEALTH_ENTRY"\)/);
  assert.match(bundle, /bdHealthLaunchRenderedV155\(\{score:s,venueName:t\|\|"",confidence:u,calculationVersion:e\?\.calculationVersion,period:e\?\.period\?\.id\}\)/);
  assert.match(bundle, /bdHealthLaunchCompleteV155\(R\|\|"entry-finished"\),U\("HOME"\)/);
  assert.match(bundle, /bdHealthLaunchFallbackV155\(R\.reason,\{score:E,venueReady:n,hasProfile:!!t,cloudReady:r,timeoutMs:5200\}\)/);
  assert.doesNotMatch(runtime, /cached-health-score-ready/);
  assert.match(bundle, /health-data-timeout-no-usable-score/);
  assert.match(bundle, /setTimeout\(\(\)=>I\(!0\),2700\)/);
  assert.match(bundle, /setTimeout\(\(\)=>F\(!0\),5200\)/);
  assert.match(bundle, /B==="\/"\?Cle\(\):B/);
  assert.match(bundle, /window\.history\.replaceState\(window\.history\.state,"","\/home"\)/);
  assert.doesNotMatch(
    bundle,
    /bdHealthLaunchCompleteV153|bdHealthStartupGateV154|bdHomeLaunchPhase|bdHomeLaunchRequested/,
    "the three competing v154 startup controllers must be removed",
  );
  const homeStart = bundle.indexOf("function Dce(){");
  const homeEnd = bundle.indexOf("const q7=", homeStart);
  assert.ok(homeStart >= 0 && homeEnd > homeStart);
  const homeSource = bundle.slice(homeStart, homeEnd);
  assert.doesNotMatch(homeSource, /Launch|health-entry|SPLASH_LOADING|setTimeout/);
  assert.match(homeSource, /data-bd-home-page":"v151/);

  const coordinatorStart = bundle.indexOf("function bdHealthStartupGateV155");
  const coordinatorEnd = bundle.indexOf("function cEe(){", coordinatorStart);
  const coordinator = bundle.slice(coordinatorStart, coordinatorEnd);
  assert.match(coordinator, /bdUseBusinessHealthSnapshotV283\(\)/);
  assert.match(coordinator, /snapshot:j,diagnosis:v/);
  assert.match(coordinator, /r&&!!j/);
  assert.doesNotMatch(coordinator, /zC\(/);
  assert.doesNotMatch(coordinator, /bdHealthScoreValueV153/);
  assert.doesNotMatch(coordinator, /lastDailyDate|first-daily-entry|bdHealthExperienceReadV153/);

  const splashStart = bundle.indexOf("function _le(){");
  const splashEnd = bundle.indexOf("const Ele=", splashStart);
  const rootSplash = bundle.slice(splashStart, splashEnd);
  assert.match(rootSplash, /setTimeout\(\(\)=>n\(!0\),2700\)/);
  assert.doesNotMatch(rootSplash, /Ai\(|HealthLaunch|5200/);

  assert.match(bundle, /onPointerUp:/);
  assert.match(bundle, /pointerType==="touch"/);
  assert.match(bundle, /onClick:[A-Za-z_$][\w$]*=>\{[A-Za-z_$][\w$]*\.stopPropagation\(\),T\(!0\)\}/);
  assert.match(bundle, /S\.useRef\(null\),N=S\.useRef\(null\)/, "auto and leave timers stay independent");
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.bd-health-startup-home\.is-concealed\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(response, /health-score-experience-v152\.css\?v=20260815-home-health-v200/);
  assert.match(response, /health-score-experience\.js\?v=20260811-health-v155/);
  assert.match(response, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  assert.match(manifest, /start_url:\s*"\/home\?source=pwa"/);
});
