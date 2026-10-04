// Test-only presence observations. No auth/cookie values, application writes or recovery.
(() => {
  // Opaque initial about:blank has no session storage; instrument the QA origin only.
  if (!/^https?:$/.test(location.protocol)) return;
  window.__bdWebKitDocumentId = crypto.randomUUID();
  const tracked = ["bd_session", "bd_session_token", "qa_webkit_session_marker"];
  function observe(event) {
    if (event.type === "state") Object.assign(event, {
      origin: location.origin, documentId: window.__bdWebKitDocumentId,
      auth: { email: Boolean(localStorage.getItem("bd_session")), token: Boolean(localStorage.getItem("bd_session_token")), marker: Boolean(sessionStorage.getItem("qa_webkit_session_marker")) },
    });
    void window.__bdWebKitObserve(event);
  }
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
  Storage.prototype.setItem = function(key, value) {
    set.call(this, key, value);
    if (tracked.includes(key)) { observe({ type: "storage-write", key, present: Boolean(value) }); observe({ type: "state" }); }
  };
  Storage.prototype.removeItem = function(key) { remove.call(this, key); observe({ type: "storage-write", key, present: false }); };
  Storage.prototype.clear = function() { clear.call(this); observe({ type: "storage-clear" }); };
  sessionStorage.setItem("qa_webkit_session_marker", "present");
  for (const name of ["DOMContentLoaded", "pagehide", "beforeunload"]) addEventListener(name, () => observe({ type: "state" }));
})();
