(function () {
  "use strict";

  function revealDenied() {
    document.body.dataset.accessPending = "false";
  }

  var marker = new URLSearchParams(location.search).get("session_bridge");
  var email;
  var token;
  try {
    email = localStorage.getItem("bd_session");
    token = localStorage.getItem("bd_session_token");
  } catch {
    revealDenied();
    return;
  }
  if (marker === "1" || !email || !token) {
    revealDenied();
    return;
  }

  var timeout = setTimeout(revealDenied, 5_000);
  fetch("/api/auth/server-session", {
    method: "POST",
    headers: { "X-Session-Email": email, "X-Session-Token": token },
    credentials: "same-origin",
    cache: "no-store"
  }).then(function (response) {
    return response.json().then(function (payload) {
      if (!response.ok || !payload.ok) throw new Error("SESSION_REJECTED");
      if (payload.email) localStorage.setItem("bd_session", payload.email);
      if (payload.token) localStorage.setItem("bd_session_token", payload.token);
      clearTimeout(timeout);
      location.replace("/admin?session_bridge=1");
    });
  }).catch(function () {
    clearTimeout(timeout);
    revealDenied();
  });
})();
