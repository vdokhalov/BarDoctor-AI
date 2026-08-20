(function (root) {
  "use strict";

  var VERSION = "health-score-v155";
  var SCORE_CHANGE_THRESHOLD = 4;
  var HISTORY_DAYS = 60;
  var launchStatus = "new";
  var startupPhase = "SPLASH_LOADING";
  var entryRendered = false;
  var startupDiagnostics = [];

  function diagnostic(event, details) {
    var entry = {
      at: new Date().toISOString(),
      event: String(event || "unknown"),
      phase: startupPhase,
      status: launchStatus,
      details: details && typeof details === "object" ? details : {},
    };
    startupDiagnostics.push(entry);
    startupDiagnostics = startupDiagnostics.slice(-40);
    try {
      console.info("[BarDoctor Health startup]", entry.event, entry.details);
    } catch {
      // Diagnostics must never affect startup.
    }
    return entry;
  }

  function finiteScore(value) {
    if (value === null || value === undefined || value === "") return null;
    var number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function localDateKey(value) {
    var date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function normalizeHistory(value) {
    if (!Array.isArray(value)) return [];
    var byDate = new Map();
    value.forEach(function (entry) {
      if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ""))) return;
      var score = finiteScore(entry.score);
      if (score === null) return;
      byDate.set(String(entry.date), { date: String(entry.date), score: score });
    });
    return Array.from(byDate.values())
      .sort(function (left, right) { return left.date.localeCompare(right.date); })
      .slice(-HISTORY_DAYS);
  }

  function normalizeState(value) {
    var input = value && typeof value === "object" ? value : {};
    return {
      version: VERSION,
      lastDailyDate: typeof input.lastDailyDate === "string" ? input.lastDailyDate : "",
      lastEntryScore: finiteScore(input.lastEntryScore),
      hasScoreBaseline: Boolean(input.hasScoreBaseline),
      lastDiagnosisToken: typeof input.lastDiagnosisToken === "string" ? input.lastDiagnosisToken : "",
      hasDiagnosisBaseline: Boolean(input.hasDiagnosisBaseline),
      lastClosedMonthToken: typeof input.lastClosedMonthToken === "string" ? input.lastClosedMonthToken : "",
      hasClosedMonthBaseline: Boolean(input.hasClosedMonthBaseline),
      lastShownAt: typeof input.lastShownAt === "string" ? input.lastShownAt : "",
      history: normalizeHistory(input.history),
    };
  }

  function recordScore(value, dateKey, currentScore) {
    var state = normalizeState(value);
    var score = finiteScore(currentScore);
    if (score === null) return state;
    state.history = normalizeHistory(
      state.history.filter(function (entry) { return entry.date !== dateKey; })
        .concat([{ date: dateKey, score: score }]),
    );
    return state;
  }

  function trend(value, dateKey, currentScore) {
    var state = normalizeState(value);
    var score = finiteScore(currentScore);
    if (score === null) return null;
    var today = new Date(dateKey + "T12:00:00");
    if (Number.isNaN(today.getTime())) return null;
    var target = new Date(today);
    target.setDate(target.getDate() - 30);
    var targetKey = localDateKey(target);
    var baseline = state.history
      .filter(function (entry) { return entry.date <= targetKey; })
      .sort(function (left, right) { return right.date.localeCompare(left.date); })[0];
    if (!baseline) return null;
    var delta = score - baseline.score;
    return {
      baselineDate: baseline.date,
      baselineScore: baseline.score,
      delta: delta,
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    };
  }

  function mainFactor(report) {
    var domains = Array.isArray(report && report.domains) ? report.domains : [];
    return domains.reduce(function (lowest, domain) {
      var score = finiteScore(domain && domain.score);
      if (score === null) return lowest;
      if (!lowest || score < lowest.score) {
        return {
          id: String(domain.id || ""),
          label: String(domain.label || "Направление"),
          score: score,
        };
      }
      return lowest;
    }, null);
  }

  function diagnosisToken(diagnosis) {
    if (!diagnosis || typeof diagnosis !== "object") return "";
    var value = diagnosis.generatedAt || diagnosis.cachedAt || diagnosis.updatedAt || "";
    return value ? String(value) : "";
  }

  function evaluate(value, input) {
    var dateKey = String(input && input.dateKey ? input.dateKey : localDateKey());
    var score = finiteScore(input && input.score);
    var diagnosis = String(input && input.diagnosisToken ? input.diagnosisToken : "");
    var closedMonth = String(input && input.closedMonthToken ? input.closedMonthToken : "");
    var state = recordScore(value, dateKey, score);

    var firstDaily = state.lastDailyDate !== dateKey;
    var scoreChanged = state.hasScoreBaseline
      && score !== null
      && state.lastEntryScore !== null
      && Math.abs(score - state.lastEntryScore) >= SCORE_CHANGE_THRESHOLD;
    var scoreBecameAvailable = state.hasScoreBaseline
      && score !== null
      && state.lastEntryScore === null;
    var diagnosisUpdated = state.hasDiagnosisBaseline
      && Boolean(diagnosis)
      && diagnosis !== state.lastDiagnosisToken;
    var monthClosed = state.hasClosedMonthBaseline
      && Boolean(closedMonth)
      && closedMonth !== state.lastClosedMonthToken;

    var reason = firstDaily
      ? "first-daily-entry"
      : scoreChanged || scoreBecameAvailable
        ? "score-change"
        : monthClosed
          ? "month-closed"
          : diagnosisUpdated
            ? "full-diagnosis"
            : "";

    state.hasScoreBaseline = true;
    state.hasDiagnosisBaseline = true;
    state.hasClosedMonthBaseline = true;
    if (diagnosis) state.lastDiagnosisToken = diagnosis;
    if (closedMonth) state.lastClosedMonthToken = closedMonth;

    if (reason) {
      state.lastDailyDate = dateKey;
      state.lastEntryScore = score;
      state.lastShownAt = new Date().toISOString();
    }

    return {
      show: Boolean(reason),
      reason: reason,
      state: state,
      trend: trend(state, dateKey, score),
      scoreChangeThreshold: SCORE_CHANGE_THRESHOLD,
    };
  }

  function beginLaunch() {
    if (launchStatus === "complete") return false;
    if (launchStatus === "new") {
      launchStatus = "pending";
      startupPhase = "SPLASH_LOADING";
      entryRendered = false;
      diagnostic("launch-begin", {});
    }
    return true;
  }

  function markEntryRendered(details) {
    if (launchStatus === "complete") return false;
    launchStatus = "shown";
    startupPhase = "HEALTH_ENTRY";
    entryRendered = true;
    diagnostic("health-entry-rendered", details);
    return true;
  }

  function completeLaunch(reason) {
    launchStatus = "complete";
    startupPhase = "HOME";
    diagnostic("launch-complete", {
      reason: String(reason || "entry-finished"),
      entryRendered: entryRendered,
    });
  }

  function fallbackLaunch(reason, details) {
    launchStatus = "complete";
    startupPhase = "HOME";
    diagnostic("health-entry-fallback", {
      reason: String(reason || "health-unavailable"),
      entryRendered: entryRendered,
      context: details && typeof details === "object" ? details : {},
    });
  }

  function startupDecision(input) {
    var data = input && typeof input === "object" ? input : {};
    if (!data.launchRequested) return { next: "HOME", reason: "not-a-startup-launch" };
    if (!data.minimumSplashElapsed) return { next: "SPLASH_LOADING", reason: "minimum-splash" };

    var hasUsableScore = finiteScore(data.score) !== null;
    var venueReady = Boolean(data.venueReady && data.hasProfile);
    var healthReady = venueReady && (Boolean(data.cloudReady) || hasUsableScore);

    if (healthReady) {
      return {
        next: "HEALTH_ENTRY",
        reason: data.cloudReady ? "health-data-synced" : "cached-health-score-ready",
      };
    }
    if (!data.timedOut) return { next: "SPLASH_LOADING", reason: "health-data-pending" };
    return {
      next: "HOME",
      reason: "health-data-timeout-no-usable-score",
      fallback: true,
    };
  }

  function transitionStartup(phase, event) {
    var current = String(phase || "SPLASH_LOADING");
    var action = String(event || "");
    if (current === "SPLASH_LOADING" && action === "HEALTH_READY") return "HEALTH_ENTRY";
    if (current === "SPLASH_LOADING" && action === "FALLBACK") return "HOME";
    if (current === "HEALTH_ENTRY" && action === "ENTRY_FINISHED") return "HOME";
    return current;
  }

  function getLaunchStatus() {
    return launchStatus;
  }

  function getStartupSnapshot() {
    return {
      phase: startupPhase,
      launchStatus: launchStatus,
      entryRendered: entryRendered,
      diagnostics: startupDiagnostics.slice(),
    };
  }

  root.bdHealthScoreExperience = Object.freeze({
    version: VERSION,
    scoreChangeThreshold: SCORE_CHANGE_THRESHOLD,
    finiteScore: finiteScore,
    localDateKey: localDateKey,
    normalizeState: normalizeState,
    recordScore: recordScore,
    trend: trend,
    mainFactor: mainFactor,
    diagnosisToken: diagnosisToken,
    evaluate: evaluate,
    beginLaunch: beginLaunch,
    markEntryRendered: markEntryRendered,
    completeLaunch: completeLaunch,
    fallbackLaunch: fallbackLaunch,
    getLaunchStatus: getLaunchStatus,
    getStartupSnapshot: getStartupSnapshot,
    startupDecision: startupDecision,
    transitionStartup: transitionStartup,
    diagnostic: diagnostic,
  });
})(typeof window !== "undefined" ? window : globalThis);
