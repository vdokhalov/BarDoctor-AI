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
  // Correlate only same-origin month-preview GETs. This QA header is never an
  // authorization input and never reaches an external provider.
  let requestSequence = 0;
  const signalRequests = new WeakMap();
  window.__bdWebKitReaderDisposed = signal => {
    const detail = signal && signalRequests.get(signal);
    if (detail) observe({type:"month-reader-dispose",...detail});
  };
  const nativeFetch = window.fetch;
  const route = () => location.pathname + location.search;
  for (const method of ["pushState", "replaceState"]) {
    const native = history[method];
    history[method] = function(...args) {
      const from = route(), result = native.apply(this, args);
      observe({type:"route-change",documentId:window.__bdWebKitDocumentId,from,to:route(),method});
      return result;
    };
  }
  for (const type of ["popstate", "beforeunload", "pagehide"]) addEventListener(type, () => observe({type:"navigation",documentId:window.__bdWebKitDocumentId,event:type,route:route()}));
  window.fetch = function(input, init) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.origin !== location.origin || url.pathname !== "/api/month-close" || method !== "GET") return nativeFetch.call(this,input,init);
    const requestId = window.__bdWebKitDocumentId + ":" + (++requestSequence);
    const signal = init?.signal || (input instanceof Request ? input.signal : undefined);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    headers.set("X-BD-QA-Request-ID",requestId);
    const detail={requestId,documentId:window.__bdWebKitDocumentId,path:url.pathname,method,monthKey:url.searchParams.get("monthKey"),venueId:url.searchParams.get("venueId"),route:route()};
    if(signal)signalRequests.set(signal,detail);
    observe({type:"request-start",...detail});
    const aborted=()=>observe({type:"request-abort",...detail,currentRoute:route(),aborted:signal.aborted,reason:signal.reason?.name});
    signal?.addEventListener("abort",aborted,{once:true});
    return nativeFetch.call(this,input,{...init,headers}).then(response=>{
      observe({type:"request-result",...detail,status:response.status});return response;
    },error=>{observe({type:"request-rejected",...detail,errorName:error.name,aborted:!!signal?.aborted});throw error;}).finally(()=>signal?.removeEventListener("abort",aborted));
  };
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
