/* One visible-only, single-flight refresh shared by cashier and management views. */
(function (root) {
  "use strict";
  root.bdPosRefresh = function (options) {
    let stopped=true, running=false, timer=null, lastAttempt=null, lastSuccess=null;
    const now=options.now || Date.now, interval=options.intervalMs || 15000;
    async function refresh(force=false) {
      if (stopped || running || !options.isVisible() || !options.canRun() || !force && lastAttempt!==null && now()-lastAttempt<interval) return false;
      running=true; lastAttempt=now();
      try { const result=await options.load(); if (!stopped && options.isVisible()) { options.onSuccess(result); lastSuccess=now(); } return true; }
      catch(error) { if (!stopped) options.onError(error); return false; }
      finally { running=false; }
    }
    return { start() { if (!stopped) return; stopped=false; timer=(options.setInterval || root.setInterval)(()=>{void refresh();},interval); },
      stop() { stopped=true; if(timer!==null)(options.clearInterval || root.clearInterval)(timer); timer=null; },refresh,
      state() { return {stopped,running,lastAttempt,lastSuccess}; } };
  };
})(typeof window === "undefined" ? globalThis : window);
