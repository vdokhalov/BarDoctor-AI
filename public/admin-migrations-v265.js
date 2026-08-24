(function () {
  "use strict";
  var button = document.getElementById("phase-a-run");
  var status = document.getElementById("phase-a-status");
  var result = document.getElementById("phase-a-result");
  var kpis = document.getElementById("phase-a-kpis");
  var venues = document.getElementById("phase-a-venues");
  if (!button || !status || !result || !kpis || !venues) return;

  function text(value) {
    return String(value == null ? "" : value);
  }

  button.addEventListener("click", async function () {
    button.disabled = true;
    status.className = "running";
    status.textContent = "Формирую и проверяю резервные экспорты…";
    try {
      var response = await fetch("/api/admin/data-migrations", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Intent": "persist-phase-a-backups"
        },
        body: JSON.stringify({ action: "persist_phase_a_backups" })
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Phase A завершилась с ошибкой");
      var plans = payload.report && Array.isArray(payload.report.venues) ? payload.report.venues : [];
      var counts = plans.reduce(function (acc, plan) {
        var key = text(plan.migrationClass || "UNKNOWN");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      kpis.textContent = "";
      [
        ["Заведений", payload.platform && payload.platform.venues],
        ["Backups проверено", payload.backups && payload.backups.verified],
        ["SAFE", counts.SAFE_AUTOMATABLE || 0],
        ["REVIEW / BLOCKED", (counts.REVIEW_REQUIRED || 0) + (counts.BLOCKED || 0)]
      ].forEach(function (entry) {
        var card = document.createElement("article");
        var label = document.createElement("span");
        var value = document.createElement("strong");
        label.textContent = entry[0];
        value.textContent = text(entry[1]);
        card.append(label, value);
        kpis.appendChild(card);
      });
      venues.textContent = "";
      plans.forEach(function (plan) {
        var row = document.createElement("article");
        var title = document.createElement("strong");
        var badge = document.createElement("span");
        var detail = document.createElement("small");
        title.textContent = text(plan.venue && plan.venue.name) + " · #" + text(plan.venue && plan.venue.id);
        badge.textContent = text(plan.migrationClass);
        badge.className = "badge " + text(plan.migrationClass).toLowerCase();
        detail.textContent = "Записей к добавлению: " + text(Array.isArray(plan.writes) ? plan.writes.reduce(function (sum, write) { return sum + Number(write.records || 0); }, 0) : 0) + " · blockers: " + text(Array.isArray(plan.blockers) ? plan.blockers.length : 0);
        row.append(title, badge, detail);
        venues.appendChild(row);
      });
      status.className = "success";
      status.textContent = "Phase A завершена: все резервные экспорты сохранены и проверены.";
      result.hidden = false;
    } catch (error) {
      status.className = "error";
      status.textContent = error && error.message ? error.message : "Phase A завершилась с ошибкой";
    } finally {
      button.disabled = false;
    }
  });
})();
