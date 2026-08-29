(function () {
  "use strict";

  var CACHE_PREFIX = "bd_market_server_snapshot_v329:";
  var LEASE_PREFIX = "bd_market_refresh_lease_v329:";
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
    if (!response || response.ok === false || !response.analysis) return;
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ cachedAt: new Date().toISOString(), response: response }));
    } catch {}
  }

  function readSnapshot() {
    try {
      var stored = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      var cachedAt = stored && Date.parse(stored.cachedAt);
      if (!stored || !stored.response || !stored.response.analysis || !Number.isFinite(cachedAt)) return null;
      if (Date.now() - cachedAt > CACHE_MAX_AGE) return null;
      return stored.response;
    } catch { return null; }
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
    } catch { return null; }
  }

  function releaseRefreshLease(token) {
    if (!token) return;
    try {
      var existing = JSON.parse(localStorage.getItem(leaseKey()) || "null");
      if (existing && existing.token === token) localStorage.removeItem(leaseKey());
    } catch {}
  }

  function competitors(analysis) {
    return Array.isArray(analysis && analysis.competitors) ? analysis.competitors.filter(Boolean) : [];
  }

  function changes(analysis) {
    var direct = Array.isArray(analysis && analysis.detectedChanges) ? analysis.detectedChanges.filter(Boolean) : [];
    if (direct.length) return direct;
    var merged = [];
    competitors(analysis).forEach(function (competitor) {
      (Array.isArray(competitor.changes) ? competitor.changes : []).forEach(function (change) {
        merged.push(Object.assign({ competitorName: competitor.name, competitorKey: competitor.key }, change));
      });
    });
    return merged;
  }

  function summary(analysis) {
    var rows = competitors(analysis);
    var changeRows = changes(analysis).slice().sort(function (left, right) {
      return String(right.detectedAt || right.date || "").localeCompare(String(left.detectedAt || left.date || ""));
    });
    return {
      competitors: rows,
      foundCount: rows.length,
      confirmedCount: rows.filter(function (item) { return item.confirmed === true; }).length,
      candidateCount: rows.filter(function (item) { return item.confirmed !== true; }).length,
      changes: changeRows,
      attentionCount: changeRows.filter(function (item) { return item.status !== "dismissed" && item.status !== "resolved"; }).length,
      latestChange: changeRows[0] || null,
      sourceCount: Array.isArray(analysis && analysis.sources) ? analysis.sources.length : 0,
    };
  }

  window.bdCompetitorMarketClientV329 = {
    acquireRefreshLease: acquireRefreshLease,
    changes: changes,
    competitors: competitors,
    readSnapshot: readSnapshot,
    releaseRefreshLease: releaseRefreshLease,
    summary: summary,
    writeSnapshot: writeSnapshot,
  };
})();
