(function () {
  "use strict";
  var storeLabels = {
    bd_assortment_v1: "Номенклатура, остатки и техкарты",
    bd_stock_movements: "Движения склада",
    bd_purchase_documents: "Закупочные документы",
    bd_inventory_snapshots: "Инвентаризации",
    bd_suppliers: "Поставщики"
  };
  var storeKeys = Object.keys(storeLabels);
  var venueCard = document.getElementById("venue-card");
  var sourceCard = document.getElementById("source-card");
  var sourceList = document.getElementById("source-list");
  var button = document.getElementById("capture-run");
  var status = document.getElementById("capture-status");
  var result = document.getElementById("capture-result");
  var state = null;
  var bundle = null;
  if (!venueCard || !sourceCard || !sourceList || !button || !status || !result) return;

  function text(value) { return String(value == null ? "" : value); }
  function escapeText(value) {
    return text(value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }
  function parse(raw) {
    try { return { ok: true, data: JSON.parse(raw) }; }
    catch { return { ok: false, data: null }; }
  }
  function sourceKeys(storeKey) {
    var exact = storeKey + "__" + state.actorEmail + "__venue_" + state.venueId;
    return state.primaryVenue ? [exact, storeKey + "__" + state.actorEmail, storeKey] : [exact];
  }
  function collect() {
    var candidates = {};
    var evidence = [];
    storeKeys.forEach(function (storeKey) {
      var keys = sourceKeys(storeKey);
      for (var index = 0; index < keys.length; index += 1) {
        var sourceKey = keys[index];
        var raw = localStorage.getItem(sourceKey);
        if (raw === null) continue;
        var parsed = parse(raw);
        evidence.push({ storeKey: storeKey, sourceKey: sourceKey, validJson: parsed.ok, bytes: new TextEncoder().encode(raw).byteLength });
        if (parsed.ok && !Object.prototype.hasOwnProperty.call(candidates, storeKey)) {
          candidates[storeKey] = {
            source: "browser_local_storage",
            sourceKey: sourceKey,
            capturedAt: new Date().toISOString(),
            data: parsed.data
          };
        }
      }
    });
    return { candidates: candidates, evidence: evidence };
  }
  function renderSources() {
    bundle = collect();
    sourceList.textContent = "";
    storeKeys.forEach(function (key) {
      var found = bundle.evidence.find(function (item) { return item.storeKey === key && item.validJson; });
      var row = document.createElement("article");
      var name = document.createElement("strong");
      var value = document.createElement("span");
      name.textContent = storeLabels[key];
      value.textContent = found ? "Найдено · " + Math.max(1, Math.round(found.bytes / 1024)) + " КБ" : (state.serverStores[key] && state.serverStores[key].exists ? "Уже на сервере" : "В браузере не найдено");
      value.className = found ? "found" : (state.serverStores[key] && state.serverStores[key].exists ? "server" : "missing");
      row.append(name, value);
      sourceList.appendChild(row);
    });
    sourceCard.hidden = false;
    var count = Object.keys(bundle.candidates).length;
    var serverCount = storeKeys.filter(function (key) { return Boolean(state.serverStores[key] && state.serverStores[key].exists); }).length;
    var serverPreviewAvailable = count === 0 && serverCount > 0 && !(state.serverStores.bd_assortment_v1 && state.serverStores.bd_assortment_v1.exists);
    venueCard.querySelector("small").textContent = "Серверных хранилищ: " + serverCount + " из " + storeKeys.length;
    button.dataset.action = serverPreviewAvailable ? "server-preview" : "browser-capture";
    button.textContent = serverPreviewAvailable ? "Проверить серверные данные" : "Сохранить копию и проверить перенос";
    button.disabled = !state.captureEnabled || (count === 0 && !serverPreviewAvailable);
    if (!state.captureEnabled) status.textContent = "Для этого заведения перенос не запланирован.";
    else if (serverPreviewAvailable) status.textContent = "Данные закупок и склада уже на сервере. Preview будет построен без localStorage.";
    else if (!count) status.textContent = "Старые данные этого заведения в этом браузере не найдены.";
    else status.textContent = "Найдено источников: " + count + ". Можно сохранить резервную копию и выполнить проверку.";
  }
  async function initialize() {
    var venueId = localStorage.getItem("bd_active_venue_id") || "";
    var response = await fetch("/api/migration/capture", {
      credentials: "same-origin",
      cache: "no-store",
      headers: venueId ? { "X-Venue-Id": venueId } : {}
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось проверить заведение");
    state = payload;
    venueCard.innerHTML = "<span>Активное заведение</span><strong>" + escapeText(payload.venueName || "Без названия") + " · #" + escapeText(payload.venueId) + "</strong><small>Серверных хранилищ: " + escapeText(Object.keys(payload.serverStores || {}).length) + " из 5</small>";
    renderSources();
  }
  button.addEventListener("click", async function () {
    if (button.dataset.action === "server-preview") {
      window.location.assign("/migration-preview");
      return;
    }
    button.disabled = true;
    status.className = "running";
    status.textContent = "Сохраняю неизменяемую копию и проверяю целостность…";
    try {
      bundle = collect();
      var activeVenueId = Number(localStorage.getItem("bd_active_venue_id"));
      if (activeVenueId !== Number(state.venueId)) throw new Error("Активное заведение изменилось. Обновите страницу.");
      var response = await fetch("/api/migration/capture", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Venue-Id": text(state.venueId),
          "X-Migration-Intent": "capture-current-venue-legacy-data"
        },
        body: JSON.stringify({ venueId: state.venueId, candidates: bundle.candidates })
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Проверка переноса завершилась с ошибкой");
      var plan = payload.plan || {};
      result.innerHTML = "<h2>Копия сохранена и проверена</h2><div class=\"result-grid\"><span>Класс переноса<strong>" + escapeText(plan.migrationClass) + "</strong></span><span>Хранилищ к переносу<strong>" + escapeText((plan.writes || []).length) + "</strong></span><span>Записей к переносу<strong>" + escapeText(plan.records && plan.records.toMigrate) + "</strong></span><span>Записей уже на сервере<strong>" + escapeText(plan.records && plan.records.alreadyServerSide) + "</strong></span></div><p>Рабочие данные ещё не изменены. Следующий этап запускается только после проверки этого отчёта.</p>";
      result.hidden = false;
      status.className = plan.migrationClass === "SAFE_AUTOMATABLE" ? "success" : "warning";
      status.textContent = plan.migrationClass === "SAFE_AUTOMATABLE" ? "Данные готовы к контролируемому переносу на сервер." : "Копия сохранена, но перед переносом нужна дополнительная проверка.";
    } catch (error) {
      status.className = "error";
      status.textContent = error && error.message ? error.message : "Проверка переноса завершилась с ошибкой";
    } finally {
      button.disabled = false;
    }
  });
  initialize().then(function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get("autocapture") !== "1" || button.disabled) return;
    params.delete("autocapture");
    var query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
    button.click();
  }).catch(function (error) {
    venueCard.innerHTML = "<strong>Не удалось открыть перенос</strong><span>" + escapeText(error && error.message) + "</span>";
    status.className = "error";
    status.textContent = "Вернитесь в BarDoctor, войдите в аккаунт и выберите нужное заведение.";
  });
})();
