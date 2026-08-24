(function () {
  "use strict";
  var button = document.getElementById("phase-a-run");
  var status = document.getElementById("phase-a-status");
  var result = document.getElementById("phase-a-result");
  var kpis = document.getElementById("phase-a-kpis");
  var venues = document.getElementById("phase-a-venues");
  var archiveButton = document.getElementById("archive-confirmed");
  var archiveStatus = document.getElementById("archive-status");
  var archiveResult = document.getElementById("archive-result");
  var capturedVenues = document.getElementById("captured-venues");
  var capturedStatus = document.getElementById("captured-status");
  if (!button || !status || !result || !kpis || !venues || !archiveButton || !archiveStatus || !archiveResult || !capturedVenues || !capturedStatus) return;

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

  archiveButton.addEventListener("click", async function () {
    archiveButton.disabled = true;
    archiveStatus.className = "running";
    archiveStatus.textContent = "Архивирую только подтверждённый список и проверяю результат…";
    try {
      var venueIds = [2, 3, 1080, 3162, 3281, 3282, 3283, 3284, 3285, 3286, 3287];
      var response = await fetch("/api/admin/venues/archive-confirmed", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Intent": "archive-confirmed-venues"
        },
        body: JSON.stringify({
          venueIds: venueIds,
          confirmation: "ARCHIVE 11 CONFIRMED VENUES; KEEP 1,2088,3280 ACTIVE"
        })
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Архивация завершилась с ошибкой");
      archiveResult.textContent = "";
      var archived = document.createElement("article");
      var archivedTitle = document.createElement("strong");
      var archivedDetail = document.createElement("small");
      archivedTitle.textContent = "Архивировано: " + text(payload.archived && payload.archived.length);
      archivedDetail.textContent = (payload.archived || []).map(function (venue) { return text(venue.name) + " #" + text(venue.id); }).join(" · ");
      archived.append(archivedTitle, archivedDetail);
      var kept = document.createElement("article");
      var keptTitle = document.createElement("strong");
      var keptDetail = document.createElement("small");
      keptTitle.textContent = "Остались активными: " + text(payload.keptActive && payload.keptActive.length);
      keptDetail.textContent = (payload.keptActive || []).map(function (venue) { return text(venue.name) + " #" + text(venue.id); }).join(" · ");
      kept.append(keptTitle, keptDetail);
      archiveResult.append(archived, kept);
      archiveResult.hidden = false;
      archiveStatus.className = "success";
      archiveStatus.textContent = "Архивация подтверждена сервером. Данные не удалены.";
    } catch (error) {
      archiveStatus.className = "error";
      archiveStatus.textContent = error && error.message ? error.message : "Архивация завершилась с ошибкой";
    } finally {
      archiveButton.disabled = false;
    }
  });

  async function checkCaptured(venueId, row) {
    var control = row.querySelector("button");
    var detail = row.querySelector("small");
    control.disabled = true;
    capturedStatus.className = "running";
    capturedStatus.textContent = "Проверяю неизменяемую копию…";
    try {
      var response = await fetch("/api/admin/data-migrations?venueId=" + encodeURIComponent(venueId) + "&mode=captured", { credentials: "same-origin", cache: "no-store" });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Собранные данные не найдены");
      var plan = payload.plan || {};
      detail.textContent = "Класс: " + text(plan.migrationClass) + " · хранилищ к добавлению: " + text((plan.writes || []).length) + " · записей: " + text(plan.records && plan.records.toMigrate);
      if (plan.migrationClass !== "SAFE_AUTOMATABLE") {
        control.textContent = "Требуется ручная проверка";
        capturedStatus.className = "warning";
        capturedStatus.textContent = "Копия сохранена, но автоматический перенос заблокирован проверками целостности.";
        return;
      }
      control.disabled = false;
      control.textContent = "Перенести на сервер";
      control.onclick = async function () {
        control.disabled = true;
        capturedStatus.className = "running";
        capturedStatus.textContent = "Добавляю отсутствующие хранилища и проверяю контрольные суммы…";
        try {
          var migrate = await fetch("/api/admin/data-migrations", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json", "X-Admin-Intent": "migrate-captured-venue" },
            body: JSON.stringify({
              action: "migrate_captured_venue",
              venueId: Number(venueId),
              operationId: plan.operationId,
              exportId: plan.backup && plan.backup.exportId,
              backupChecksum: plan.backup && plan.backup.checksum && plan.backup.checksum.value,
              confirmation: "PHASE_B_SAFE_VENUE_MIGRATION_APPROVED"
            })
          });
          var migrated = await migrate.json().catch(function () { return {}; });
          if (!migrate.ok || !migrated.ok) throw new Error(migrated.error || "Перенос завершился с ошибкой");
          detail.textContent = "Перенесено и проверено · операция " + text(migrated.result && migrated.result.operationId);
          control.textContent = "Перенесено";
          capturedStatus.className = "success";
          capturedStatus.textContent = "Заведение переведено на серверное хранение.";
        } catch (error) {
          control.disabled = false;
          capturedStatus.className = "error";
          capturedStatus.textContent = error && error.message ? error.message : "Перенос завершился с ошибкой";
        }
      };
      capturedStatus.className = "success";
      capturedStatus.textContent = "Контрольный план готов. Можно запускать перенос одного заведения.";
    } catch (error) {
      control.disabled = false;
      detail.textContent = "Сначала владелец должен открыть /migration в нужном браузере и сохранить копию.";
      capturedStatus.className = "error";
      capturedStatus.textContent = error && error.message ? error.message : "Собранные данные не найдены";
    }
  }

  capturedVenues.addEventListener("click", function (event) {
    var control = event.target.closest("[data-capture-check]");
    if (!control || control.onclick) return;
    var row = control.closest("[data-captured-venue]");
    if (row) checkCaptured(control.getAttribute("data-capture-check"), row);
  });
})();
