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

  function acquireRefreshLease() {
    var now = Date.now();
    try {
      var existing = JSON.parse(localStorage.getItem(leaseKey()) || "null");
      if (existing && Number(existing.expiresAt) > now) return null;
      var token = now.toString(36) + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(leaseKey(), JSON.stringify({ token: token, expiresAt: now + LEASE_DURATION }));
      var confirmed = JSON.parse(localStorage.getItem(leaseKey()) || "null");
      return confirmed && confirmed.token === token ? token : null;
    } catch {
      return null;
    }
  }

  function releaseRefreshLease(token) {
    if (!token) return;
    try {
      var existing = JSON.parse(localStorage.getItem(leaseKey()) || "null");
      if (existing && existing.token === token) localStorage.removeItem(leaseKey());
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
})();
