(function () {
  "use strict";

  var button = document.getElementById("admin-bootstrap-claim");
  var toast = document.getElementById("admin-toast");
  if (!button || !toast) return;

  function showError(message) {
    toast.textContent = message || "Не удалось активировать Internal Admin";
    toast.className = "admin-toast visible error";
  }

  button.addEventListener("click", async function () {
    button.disabled = true;
    button.textContent = "Активирую…";
    try {
      var response = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "X-Admin-Intent": "claim-platform-admin" },
        credentials: "same-origin",
        cache: "no-store"
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Активация отклонена");
      location.replace("/admin");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Активировать Internal Admin";
      showError(error && error.message);
    }
  });
})();
