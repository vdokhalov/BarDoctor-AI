// Presence and call-stack evidence only. No credential values, session writes,
// recovery, replacement page/context, or application fetch interception.
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  window.__bdCompletionDocumentId = crypto.randomUUID();
  const tracked = ["bd_session", "bd_session_token", "qa_webkit_session_marker"];
  function observe(type, extra = {}) {
    void window.__bdCompletionObserve({ type, ...extra, origin: location.origin,
      documentId: window.__bdCompletionDocumentId,
      auth: { email: Boolean(localStorage.getItem("bd_session")), token: Boolean(localStorage.getItem("bd_session_token")), marker: Boolean(sessionStorage.getItem("qa_webkit_session_marker")) } });
  }
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
  Storage.prototype.setItem = function(key, value) { set.call(this, key, value); if (tracked.includes(key)) observe("credential-write", { key, present: Boolean(value), stack: new Error().stack }); };
  Storage.prototype.removeItem = function(key) { remove.call(this, key); if (tracked.includes(key)) observe("credential-remove", { key, stack: new Error().stack }); };
  Storage.prototype.clear = function() { clear.call(this); observe("storage-clear", { stack: new Error().stack }); };
  for (const name of ["DOMContentLoaded", "load", "pagehide", "beforeunload", "storage"]) addEventListener(name, () => observe("document-event", { name }));
})();
