(function () {
  "use strict";

  var CACHE_PREFIX = "bd_opportunity_server_snapshot_v327:";
  var LEASE_PREFIX = "bd_opportunity_refresh_lease_v327:";
  var CACHE_MAX_AGE = 30 * 86_400_000;
  var LEASE_DURATION = 3 * 60_000;

  function contextKey() {
    return [
      localStorage.getItem("bd_session") || "anonymous",
      localStorage.getItem("bd_active_venue_id") || "default",
    ].join(":");
  }

  function cacheKey() { return CACHE_PREFIX + contextKey(); }
  function leaseKey() { return LEASE_PREFIX + contextKey(); }

  function writeSnapshot(response) {
    if (!response || response.ok === false || !response.calendar) return;
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({
        cachedAt: new Date().toISOString(),
        response: response,
      }));
    } catch {}
  }

  function readSnapshot() {
    try {
      var stored = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      var cachedAt = stored && Date.parse(stored.cachedAt);
      if (!stored || !stored.response || !stored.response.calendar || !Number.isFinite(cachedAt)) return null;
      if (Date.now() - cachedAt > CACHE_MAX_AGE) return null;
      return stored.response;
    } catch {
      return null;
    }
  }

  async function acquireRefreshLease(key) {
    try {
      var identity = [contextKey(), localStorage.getItem("bd_session_token") || ""].join(":");
      var digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
      key = key || LEASE_PREFIX + Array.from(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2,"0"); }).join("");
      var now = Date.now();
      var existing = JSON.parse(localStorage.getItem(key) || "null");
      if (existing && Number(existing.expiresAt) > now) return null;
      var token = now.toString(36) + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(key, JSON.stringify({ token: token, expiresAt: now + LEASE_DURATION }));
      var confirmed = JSON.parse(localStorage.getItem(key) || "null");
      return confirmed && confirmed.token === token ? {token:token,key:key} : null;
    } catch {
      return null;
    }
  }

  function releaseRefreshLease(token, key) {
    if (!token) return;
    key = token.key || key || leaseKey();
    token = token.token || token;
    try {
      var existing = JSON.parse(localStorage.getItem(key) || "null");
      if (existing && existing.token === token) localStorage.removeItem(key);
    } catch {}
  }

  function activeEvents(calendar) {
    return ((calendar && calendar.events) || []).filter(function (event) {
      return event && event.decision !== "dismissed";
    }).slice().sort(function (left, right) {
      return String(left.startDate || "").localeCompare(String(right.startDate || ""))
        || Number(right.potentialScore || 0) - Number(left.potentialScore || 0)
        || String(left.title || "").localeCompare(String(right.title || ""), "ru");
    });
  }

  function primaryEvent(calendar) {
    var events = activeEvents(calendar);
    var today = new Date().toISOString().slice(0, 10);
    return events.find(function (event) { return String(event.startDate || "") >= today; }) || events[0] || null;
  }

  function daysBetween(start, end) {
    var left = Date.parse(String(start || "").slice(0, 10) + "T12:00:00Z");
    var right = Date.parse(String(end || "").slice(0, 10) + "T12:00:00Z");
    return Number.isFinite(left) && Number.isFinite(right) ? Math.max(0, Math.round((right - left) / 86_400_000)) : 0;
  }

  function summary(calendar) {
    var events = activeEvents(calendar);
    var nearest = primaryEvent(calendar);
    return {
      events: events,
      nearest: nearest,
      nearestDays: nearest ? daysBetween(new Date().toISOString().slice(0, 10), nearest.startDate) : null,
      highCount: events.filter(function (event) { return Number(event.potentialScore || 0) >= 70; }).length,
      periodDays: calendar ? daysBetween(calendar.windowStart, calendar.windowEnd) : 0,
    };
  }

  window.bdOpportunityCalendarClientV327 = {
    acquireRefreshLease: acquireRefreshLease,
    activeEvents: activeEvents,
    primaryEvent: primaryEvent,
    readSnapshot: readSnapshot,
    releaseRefreshLease: releaseRefreshLease,
    summary: summary,
    writeSnapshot: writeSnapshot,
  };

  // Run only after authoritative bootstrap; never await this work in app startup.
  var bootstrapped = false, startupTimer = null, startupController = null, startupCancel = null;
  var attempts = new Map(), runningContext = null, generation = 0, resumeIdentity = null;
  var MAX_FAILURES = 3, RETRY_DELAY = 30000;
  function sessionIdentity() {
    return [localStorage.getItem("bd_session") || "", localStorage.getItem("bd_session_token") || ""].join(":");
  }
  function stopStartup() {
    if (startupTimer) clearTimeout(startupTimer);
    startupTimer = null;
    if (startupCancel) startupCancel();
  }
  function startupContext() {
    if (!bootstrapped || !window.__bdAuthBootstrapV274 || window.__bdAuthBootstrapV274.state !== "ready" || navigator.onLine === false) return null;
    var email = localStorage.getItem("bd_session"), token = localStorage.getItem("bd_session_token"), venue = localStorage.getItem("bd_active_venue_id");
    var permissions; try { permissions = JSON.parse(localStorage.getItem("bd_active_permissions") || "[]"); } catch { return null; }
    if (!email || !token || !venue || (localStorage.getItem("bd_active_role") !== "owner" && (!Array.isArray(permissions) || permissions.indexOf("calendar.manage") < 0))) return null;
    return { key: contextKey() + ":" + token, email: email, token: token, venue: venue };
  }
  function scheduleStartupCheck() {
    var next = startupContext();
    if (runningContext && next && runningContext === next.key) return;
    generation++;
    stopStartup();
    var scheduledGeneration = generation;
    // Yield two frames and a task: shell/bootstrap rendering never waits on calendar I/O.
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if (generation !== scheduledGeneration) return;
      startupTimer = setTimeout(function () { void checkAtStartup(); }, 0);
    }); });
  }
  async function checkAtStartup() {
    var context = startupContext();
    if (!context) return;
    var attempt = attempts.get(context.key) || {failures:0,retryAt:0,complete:false};
    if (attempt.complete || attempt.failures >= MAX_FAILURES) return;
    if (attempt.retryAt > Date.now()) {
      startupTimer = setTimeout(function () { void checkAtStartup(); }, attempt.retryAt - Date.now());
      return;
    }
    var capturedGeneration = generation, lease = await acquireRefreshLease();
    if (!lease) return;
    if (generation !== capturedGeneration || !startupContext() || startupContext().key !== context.key) { releaseRefreshLease(lease); return; }
    attempts.set(context.key, attempt);
    var controller = new AbortController(), finished = false, timeout;
    startupController = controller; runningContext = context.key;
    var current = function () { var next = startupContext(); return next && generation === capturedGeneration && next.key === context.key && next.token === context.token && !controller.signal.aborted; };
    function finish(outcome) {
      if (finished) return;
      finished = true;
      releaseRefreshLease(lease); clearTimeout(timeout);
      if (startupController === controller) { startupController = null; startupCancel = null; runningContext = null; }
      if (outcome === "cancel") return;
      if (outcome === "success" || outcome === "denied") attempt.complete = true;
      else { attempt.failures++; attempt.retryAt = Date.now() + RETRY_DELAY * attempt.failures; }
      var next = startupContext();
      if (!attempt.complete && attempt.failures < MAX_FAILURES && generation === capturedGeneration && next && next.key === context.key) {
        startupTimer = setTimeout(function () { void checkAtStartup(); }, Math.max(0, attempt.retryAt - Date.now()));
      }
    }
    startupCancel = function () { controller.abort(); finish("cancel"); };
    timeout = setTimeout(function () { controller.abort(); finish("failure"); }, 20000);
    var outcome = "failure";
    var headers = {"X-Session-Email":context.email,"X-Session-Token":context.token,"X-Venue-Id":context.venue,"Content-Type":"application/json"};
    try {
      var response = await fetch("/api/opportunities", {headers:headers,cache:"no-store",signal:controller.signal});
      if (!current()) return;
      if (!response.ok) { if (response.status === 401 || response.status === 403) outcome = "denied"; return; }
      var data = await response.json(); if (!current()) return;
      if (data.sync && data.sync.supported && data.sync.allowed && data.sync.due) {
        response = await fetch("/api/opportunities", {method:"POST",headers:headers,cache:"no-store",signal:controller.signal,body:JSON.stringify({action:"refresh",automatic:true})});
        if (!current()) return;
        if (!response.ok) { if (response.status === 401 || response.status === 403) outcome = "denied"; return; }
        data = await response.json(); if (!current()) return;
      }
      if (data.ok === false || (data.sync && data.sync.error) || data.syncOutcome === "failed" || data.syncOutcome === "busy") return;
      writeSnapshot(data);
      outcome = "success";
      window.dispatchEvent(new CustomEvent("bd:calendar-checked", {detail:{venueId:context.venue}}));
    } catch { /* Keep last-good; bounded retry only, never block application startup. */ }
    finally { finish(outcome); }
  }
  window.addEventListener("bd:bootstrap-start", function () { bootstrapped = false; resumeIdentity = null; generation++; stopStartup(); attempts.clear(); });
  window.addEventListener("bd:bootstrap-complete", function () { bootstrapped = true; scheduleStartupCheck(); });
  window.addEventListener("bd:venue-context", scheduleStartupCheck);
  window.addEventListener("online", scheduleStartupCheck);
  window.addEventListener("pagehide", function () { resumeIdentity = bootstrapped ? sessionIdentity() : null; bootstrapped = false; generation++; stopStartup(); });
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    bootstrapped = resumeIdentity !== null && resumeIdentity === sessionIdentity() && Boolean(window.__bdAuthBootstrapV274 && window.__bdAuthBootstrapV274.state === "ready");
    resumeIdentity = null;
    scheduleStartupCheck();
  });
})();
