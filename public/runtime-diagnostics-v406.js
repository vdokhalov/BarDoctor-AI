(function runtimeDiagnosticsV406() {
  "use strict";

  var sent = 0;
  var MAX_REPORTS = 5;

  function text(value, limit) {
    return String(value == null ? "" : value)
      .replace(/https?:\/\/[^\s)]+/g, "[url]")
      .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
      .replace(/[\r\n\t]+/g, " ")
      .slice(0, limit || 180);
  }

  function report(kind, message, source, line, column) {
    if (sent >= MAX_REPORTS) return;
    sent += 1;
    fetch("/api/client-runtime-diagnostic", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: "runtime-diagnostics-v406",
        kind: text(kind, 40),
        message: text(message),
        source: text(source, 100),
        line: Number.isFinite(Number(line)) ? Number(line) : 0,
        column: Number.isFinite(Number(column)) ? Number(column) : 0,
        path: location.pathname,
      }),
    }).catch(function () { /* diagnostics must never affect product flow */ });
  }

  window.addEventListener("error", function (event) {
    report("window-error", event.message, event.filename, event.lineno, event.colno);
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    report("unhandled-rejection", reason && reason.message ? reason.message : reason, "promise", 0, 0);
  });
  window.addEventListener("bd:widget-error", function (event) {
    report("widget-boundary", "Widget render failed", event.detail && event.detail.widget, 0, 0);
  });
})();
