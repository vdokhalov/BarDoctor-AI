/* bd-request-observability-v1: metadata only; no telemetry requests or storage. */
(function () {
  "use strict";
  if (window.fetch.__bdRequestObservability) return;
  var native = window.fetch.bind(window);
  function route(path) {
    if (path === "/api/auth/bootstrap") return path;
    if (path.indexOf("/api/auth/") === 0) return "/api/auth/:action";
    if (path === "/api/store" || path.indexOf("/api/store/") === 0) return "/api/store/:key";
    if (path === "/api/tech-cards/nomenclature" || path === "/api/users/me") return path;
    return null;
  }
  function kind(value) {
    try { return value && value.name === "TimeoutError" ? "timeout" : value && value.name === "AbortError" ? "abort" : "error"; }
    catch { return "error"; }
  }
  function log(value) { try { console.info(JSON.stringify(value)); } catch { /* telemetry cannot break fetch */ } }
  var tracedFetch = function (input, init) {
    var id, label, signal, started, options;
    try {
      var url = new URL(typeof input === "string" ? input : input.url, window.location.href);
      label = url.origin === window.location.origin && route(url.pathname);
      if (!label) return native(input, init);
      id = crypto.randomUUID();
      var headers = new Headers(init && init.headers !== undefined ? init.headers : input instanceof Request ? input.headers : undefined);
      headers.set("X-BD-Correlation-Id", id);
      options = Object.assign({}, init || {}, { headers: headers });
      signal = init && init.signal !== undefined ? init.signal : input instanceof Request ? input.signal : null;
      started = performance.now();
    } catch { return native(input, init); }
    function event(name, outcome, response) {
      try {
      var execution = response && response.headers.get("X-BD-Request-Id");
      log({ telemetry: "bd-runtime-observability-v1", event: name, correlationId: id,
        requestId: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(execution || "") ? execution : null,
        route: label, timestamp: new Date().toISOString(), durationMs: Math.round(performance.now() - started),
        outcome: outcome, status: response ? response.status : null,
        timeoutSource: signal && signal.aborted && kind(signal.reason) === "timeout" ? "client_abort_signal" : "not_observed" });
      } catch { /* diagnostics never replace the original response/error */ }
    }
    function aborted() { event("client.abort", kind(signal.reason)); }
    event("client.request.start", "pending");
    if (signal) { signal.addEventListener("abort", aborted, { once: true }); if (signal.aborted) aborted(); }
    function cleanup() { if (signal) signal.removeEventListener("abort", aborted); }
    try {
      return native(input, options).then(function (response) {
        cleanup(); event("client.request.end", "headers_ready", response); return response;
      }, function (error) { cleanup(); event("client.request.end", kind(error)); throw error; });
    } catch (error) { cleanup(); event("client.request.end", kind(error)); throw error; }
  };
  tracedFetch.__bdRequestObservability = true;
  window.fetch = tracedFetch;
})();
