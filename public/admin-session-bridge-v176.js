(function () {
  "use strict";

  function revealDenied() {
    document.body.dataset.accessPending = "false";
  }

  try { localStorage.removeItem("bd_session_token"); } catch { /* cookie-only auth */ }
  revealDenied();
})();
