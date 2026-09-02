(function notificationCenterV184() {
  "use strict";

  var state = {
    config: null,
    preferences: null,
    categories: [],
    history: [],
    currentCategory: null,
    oneSignal: null,
    sdkPromise: null,
    sdkError: null,
    sdkLoading: false,
    sdkListenersTarget: null,
    optedIn: false,
    busy: false,
    loaded: false,
    lastRunAt: null,
  };

  var nodes = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", Boolean(hidden));
  }

  function authHeaders(extra) {
    var headers = new Headers(extra || {});
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (venueId) headers.set("X-Venue-Id", venueId);
    return headers;
  }

  function safeRequestMessage(status, code) {
    if (status === 401) return "Сессия завершилась. Войдите в BarDoctor снова.";
    if (status === 403) return "У вас нет доступа к этим настройкам.";
    if (code === "NO_PUSH_SUBSCRIPTION") return "Это устройство ещё не связано с уведомлениями.";
    if (code === "ONESIGNAL_NOT_CONFIGURED") return "Сервис уведомлений временно недоступен.";
    if (code === "ONESIGNAL_SEND_FAILED") return "Проверочное уведомление пока не удалось отправить.";
    if (status === 400 || status === 413) return "Настройки не сохранены. Проверьте введённые значения.";
    if (status >= 500) return "Сервис временно недоступен. Повторите попытку позже.";
    return "Не удалось выполнить действие. Повторите попытку.";
  }

  async function api(path, options) {
    var init = Object.assign({ cache: "no-store" }, options || {});
    init.headers = authHeaders(init.headers);
    if (init.body && !init.headers.has("Content-Type")) {
      init.headers.set("Content-Type", "application/json");
    }
    var response = await fetch(path, init);
    var payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false };
    }
    if (!response.ok || !payload || payload.ok === false) {
      var error = new Error(safeRequestMessage(response.status, payload && payload.code));
      error.code = payload && payload.code ? payload.code : "REQUEST_FAILED";
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
  }

  function permissionState() {
    return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  }

  function showNotice(message, tone) {
    nodes.notice.textContent = message;
    nodes.notice.className = "notification-toast " + (tone || "success");
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(function () {
      nodes.notice.classList.add("hidden");
    }, 5200);
  }

  function setBusy(value) {
    state.busy = value;
    [nodes.enable, nodes.disable, nodes.test, nodes.refreshDevice, nodes.retry, nodes.refreshHistory]
      .forEach(function (button) {
        if (button) button.disabled = value;
      });
    document.body.classList.toggle("is-busy", value);
  }

  function preferenceValue(key) {
    return Boolean(state.preferences && state.preferences[key]);
  }

  function populatePreferences(preferences) {
    state.preferences = preferences || {};
    state.lastRunAt = state.preferences.lastRunAt || null;
    nodes.quietStart.value = state.preferences.quietStart || "23:00";
    nodes.quietEnd.value = state.preferences.quietEnd || "08:00";
    nodes.quietSummary.textContent = nodes.quietStart.value === nodes.quietEnd.value
      ? "Выключены"
      : nodes.quietStart.value + "–" + nodes.quietEnd.value;
    var timezone = state.preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    nodes.timezoneNote.textContent = timezone
      ? "Часовой пояс: " + timezone + ". Переходы на летнее и зимнее время учитываются автоматически."
      : "Время учитывается в часовом поясе вашего устройства.";
  }

  function categoryById(categoryId) {
    return state.categories.find(function (category) { return category.id === categoryId; }) || null;
  }

  function icon(path, className) {
    var image = document.createElement("img");
    image.src = path;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    if (className) image.className = className;
    return image;
  }

  function categoryHref(categoryId) {
    return "/notifications?view=category&category=" + encodeURIComponent(categoryId);
  }

  function installInternalLink(anchor) {
    anchor.addEventListener("click", function (event) {
      if (window.top !== window.self || event.defaultPrevented) return;
      event.preventDefault();
      window.history.pushState({ bdNotificationView: true }, "", anchor.href);
      renderRoute();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function renderCategories() {
    nodes.categoryList.replaceChildren();
    state.categories.forEach(function (category) {
      var row = document.createElement("a");
      row.className = "notification-row category-row";
      row.href = categoryHref(category.id);
      row.dataset.notificationLink = "category";

      var badge = document.createElement("span");
      badge.className = "row-icon " + category.tone;
      badge.appendChild(icon("/integration-icons/" + category.icon + ".svg"));

      var copy = document.createElement("span");
      copy.className = "row-copy";
      var title = document.createElement("strong");
      title.textContent = category.title;
      var description = document.createElement("small");
      description.textContent = category.description;
      copy.append(title, description);

      var status = document.createElement("span");
      var enabled = preferenceValue(category.preferenceKey);
      status.className = "row-state " + (enabled ? "enabled" : "disabled");
      status.textContent = enabled ? "Включено" : "Выключено";

      row.append(badge, copy, status, icon("/integration-icons/chevron-right.svg", "row-chevron"));
      installInternalLink(row);
      nodes.categoryList.appendChild(row);
    });
  }

  function deviceStatus() {
    var config = state.config;
    var permission = permissionState();
    var iosNeedsInstall = isIos() && !isStandalone();
    var supported = "serviceWorker" in navigator && permission !== "unsupported";
    var accountEnabled = Boolean(state.preferences && state.preferences.enabled);
    var channelReady = Boolean(config && config.clientConfigured && config.serverConfigured);
    var active = channelReady && supported && permission === "granted" && state.optedIn && accountEnabled;

    if (!config || !state.loaded || state.sdkLoading) {
      return {
        key: "unknown",
        title: "Состояние неизвестно",
        description: "Проверяю разрешение и связь устройства.",
        action: "Проверить настройки устройства",
      };
    }
    if (!supported) {
      return {
        key: "unknown",
        title: "Состояние неизвестно",
        description: "Этот браузер не поддерживает уведомления.",
        action: "Что можно сделать",
      };
    }
    if (!channelReady || state.sdkError) {
      return {
        key: "unknown",
        title: "Состояние неизвестно",
        description: "Не удалось подтвердить связь устройства.",
        action: "Повторить проверку",
      };
    }
    if (iosNeedsInstall) {
      return {
        key: "unlinked",
        title: "Устройство не связано",
        description: "Установите BarDoctor на экран «Домой».",
        action: "Как включить",
      };
    }
    if (permission === "denied") {
      return {
        key: "permission",
        title: "Требуется разрешение",
        description: "Разрешите уведомления в настройках устройства.",
        action: "Проверить настройки устройства",
      };
    }
    if (permission === "default") {
      return {
        key: "permission",
        title: "Требуется разрешение",
        description: "Разрешите уведомления на этом устройстве.",
        action: "Разрешить уведомления",
      };
    }
    if (active) {
      return {
        key: "active",
        title: "Уведомления включены",
        description: "Устройство готово получать выбранные события.",
        action: "Проверить настройки устройства",
      };
    }
    return {
      key: "unlinked",
      title: "Устройство не связано",
      description: "Связь с аккаунтом ещё не завершена.",
      action: "Связать устройство",
    };
  }

  function appendGuidance(title, description) {
    var heading = document.createElement("strong");
    heading.textContent = title;
    var paragraph = document.createElement("p");
    paragraph.textContent = description;
    nodes.deviceGuidance.replaceChildren(heading, paragraph);
  }

  function renderDevice() {
    var copy = deviceStatus();
    var permission = permissionState();
    var iosNeedsInstall = isIos() && !isStandalone();
    var supported = "serviceWorker" in navigator && permission !== "unsupported";
    var canAttempt = Boolean(state.config && state.config.clientConfigured)
      && supported
      && permission !== "denied"
      && permission !== "unsupported";
    var active = copy.key === "active";

    nodes.deviceStatusTitle.textContent = copy.title;
    nodes.deviceStatusDescription.textContent = copy.description;
    nodes.deviceAction.querySelector("span").textContent = copy.action;
    nodes.deviceIcon.className = "device-icon " + copy.key;
    nodes.deviceDetailIcon.className = "detail-icon " + copy.key;
    nodes.deviceDetailTitle.textContent = copy.title;
    nodes.deviceDetailDescription.textContent = copy.description;

    setHidden(nodes.iosGuidance, !iosNeedsInstall);
    setHidden(nodes.enable, !canAttempt || active || permission === "denied");
    setHidden(nodes.test, !active || !state.config.serverConfigured);
    setHidden(nodes.disable, !(state.optedIn || (state.preferences && state.preferences.enabled)));

    if (iosNeedsInstall) {
      nodes.enable.textContent = "Показать инструкцию";
      appendGuidance("Установите BarDoctor как приложение", "После установки iPhone покажет системный запрос на уведомления.");
    } else if (!supported) {
      appendGuidance("Откройте BarDoctor в поддерживаемом браузере", "Используйте актуальную версию Safari, Chrome или Edge. Системные настройки отсюда открыть нельзя.");
    } else if (permission === "denied") {
      appendGuidance("Разрешите уведомления в настройках", "Откройте настройки сайта или приложения BarDoctor, включите уведомления и вернитесь сюда для повторной проверки.");
    } else if (active) {
      appendGuidance("Устройство готово", "Категории и тихие часы применяются автоматически. Проверочное сообщение подтвердит передачу сервису, но не заменяет системный статус доставки.");
    } else if (copy.key === "unknown") {
      appendGuidance("Проверка не завершена", "Обновите состояние. Если ошибка повторится, ваши сохранённые настройки останутся без изменений.");
    } else {
      appendGuidance("Завершите связь устройства", "Нажмите кнопку ниже и подтвердите системное разрешение, если браузер его запросит.");
    }

    if (!iosNeedsInstall) {
      nodes.enable.textContent = permission === "granted" ? "Связать устройство" : "Разрешить уведомления";
    }
  }

  function renderQuietPolicy() {
    var policy = state.config && state.config.quietPolicy;
    setHidden(nodes.criticalPolicyRow, !(policy && policy.criticalBypassesQuietHours));
  }

  function renderCategoryDetail(categoryId) {
    var category = categoryById(categoryId);
    if (!category) return false;
    state.currentCategory = category;
    nodes.categoryDetailTitle.textContent = category.title;
    nodes.categoryDetailDescription.textContent = category.description;
    nodes.categoryDetailIcon.className = "detail-icon " + category.tone;
    nodes.categoryDetailIcon.querySelector("img").src = "/integration-icons/" + category.icon + ".svg";
    nodes.categoryToggle.checked = preferenceValue(category.preferenceKey);
    nodes.categoryToggle.disabled = false;
    nodes.categorySaveStatus.textContent = "Изменения сохраняются автоматически";
    nodes.categorySaveStatus.className = "";
    nodes.categoryRuleList.replaceChildren();

    category.rules.forEach(function (rule) {
      var item = document.createElement("article");
      item.className = "rule-row" + (rule.urgent ? " urgent" : "");
      var mark = document.createElement("span");
      mark.className = "rule-mark";
      mark.appendChild(icon(rule.urgent ? "/integration-icons/triangle-alert.svg" : "/integration-icons/circle-check.svg"));
      var copy = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = rule.title;
      var description = document.createElement("p");
      description.textContent = rule.description;
      copy.append(title, description);
      item.append(mark, copy);
      nodes.categoryRuleList.appendChild(item);
    });
    return true;
  }

  function categoryLabel(category) {
    var match = categoryById(category);
    if (match) return match.title;
    return category === "test" ? "Проверка устройства" : "Уведомление";
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Время не указано";
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function dayGroup(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Ранее";
    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    var key = date.toLocaleDateString("ru-RU");
    if (key === today.toLocaleDateString("ru-RU")) return "Сегодня";
    if (key === yesterday.toLocaleDateString("ru-RU")) return "Вчера";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  function historyRow(item) {
    var wrapper = item.targetUrl ? document.createElement("a") : document.createElement("article");
    wrapper.className = "history-row";
    if (item.targetUrl) wrapper.href = item.targetUrl;

    var mark = document.createElement("span");
    mark.className = "history-mark " + (item.tone || "muted");
    mark.appendChild(icon(item.tone === "error"
      ? "/integration-icons/triangle-alert.svg"
      : item.status === "cancelled"
        ? "/integration-icons/circle-off.svg"
        : "/integration-icons/activity.svg"));

    var content = document.createElement("span");
    content.className = "history-copy";
    var meta = document.createElement("small");
    meta.textContent = categoryLabel(item.category) + " · " + formatDate(item.eventAt);
    var title = document.createElement("strong");
    title.textContent = item.title || "Уведомление";
    var message = document.createElement("span");
    message.textContent = item.message || item.description || "";
    var status = document.createElement("span");
    status.className = "history-status " + (item.tone || "muted");
    status.textContent = item.label || "Состояние неизвестно";
    var statusDescription = document.createElement("span");
    statusDescription.className = "history-description";
    statusDescription.textContent = item.description || "";
    content.append(meta, title, message, status, statusDescription);
    if (item.scheduledFor) {
      var target = document.createElement("span");
      target.className = "history-target";
      target.textContent = "Целевое время: " + formatDate(item.scheduledFor);
      content.appendChild(target);
    }

    wrapper.append(mark, content);
    if (item.targetUrl) wrapper.appendChild(icon("/integration-icons/chevron-right.svg", "row-chevron"));
    return wrapper;
  }

  function renderHistory() {
    nodes.historyList.replaceChildren();
    if (!Array.isArray(state.history) || state.history.length === 0) {
      var empty = document.createElement("section");
      empty.className = "empty-history";
      empty.appendChild(icon("/integration-icons/activity.svg"));
      var heading = document.createElement("strong");
      heading.textContent = "История пока пуста";
      var description = document.createElement("p");
      description.textContent = "Здесь появятся реально созданные, запланированные или отменённые уведомления.";
      empty.append(heading, description);
      nodes.historyList.appendChild(empty);
      return;
    }

    var currentGroup = "";
    state.history.forEach(function (item) {
      var group = dayGroup(item.eventAt);
      if (group !== currentGroup) {
        currentGroup = group;
        var heading = document.createElement("h3");
        heading.className = "history-day";
        heading.textContent = group;
        nodes.historyList.appendChild(heading);
      }
      nodes.historyList.appendChild(historyRow(item));
    });
  }

  function currentRoute() {
    var params = new URLSearchParams(window.location.search);
    var view = params.get("view") || "overview";
    if (!["overview", "category", "quiet", "history", "device"].includes(view)) view = "overview";
    return { view: view, category: params.get("category") || "" };
  }

  function renderRoute() {
    if (!state.loaded) return;
    var route = currentRoute();
    if (route.view === "category" && !renderCategoryDetail(route.category)) route.view = "overview";
    document.querySelectorAll("[data-notification-view]").forEach(function (view) {
      view.classList.toggle("hidden", view.dataset.notificationView !== route.view);
    });
    var title = route.view === "overview"
      ? "Уведомления"
      : route.view === "category"
        ? (state.currentCategory ? state.currentCategory.title : "Категория")
        : route.view === "quiet"
          ? "Тихие часы"
          : route.view === "history"
            ? "История уведомлений"
            : "Это устройство";
    nodes.pageTitle.textContent = title;
    if (route.view === "overview") {
      nodes.back.href = "/more";
      nodes.back.setAttribute("data-bd-back", "");
      nodes.back.setAttribute("aria-label", "Вернуться в раздел «Ещё»");
    } else {
      nodes.back.href = "/notifications";
      nodes.back.removeAttribute("data-bd-back");
      nodes.back.setAttribute("aria-label", "Вернуться к уведомлениям");
    }
    document.title = title + " — BarDoctor";
    renderDevice();
  }

  function openDeviceView() {
    var target = "/notifications?view=device";
    if (window.top !== window.self) {
      nodes.deviceAction.dataset.route = target;
      return;
    }
    window.history.pushState({ bdNotificationView: true }, "", target);
    renderRoute();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function refreshConfig(options) {
    var result = await api("/api/notifications");
    state.config = result;
    state.categories = Array.isArray(result.categories) ? result.categories : [];
    state.history = Array.isArray(result.history) ? result.history : [];
    populatePreferences(result.preferences || {});
    renderCategories();
    renderHistory();
    renderQuietPolicy();
    state.loaded = true;
    setHidden(nodes.loading, true);
    setHidden(nodes.loadError, true);
    setHidden(nodes.content, false);
    renderRoute();
    if (options && options.announce) showNotice("Данные обновлены.", "success");
    return result;
  }

  async function savePreferencePatch(patch) {
    var result = await api("/api/notifications", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    populatePreferences(result.preferences || {});
    renderCategories();
    return result.preferences;
  }

  async function saveCategoryPreference() {
    if (!state.currentCategory || state.busy) return;
    var category = state.currentCategory;
    var previous = preferenceValue(category.preferenceKey);
    var next = nodes.categoryToggle.checked;
    nodes.categoryToggle.disabled = true;
    nodes.categorySaveStatus.textContent = "Сохраняю…";
    nodes.categorySaveStatus.className = "saving";
    try {
      var patch = {};
      patch[category.preferenceKey] = next;
      await savePreferencePatch(patch);
      nodes.categoryToggle.checked = preferenceValue(category.preferenceKey);
      nodes.categorySaveStatus.textContent = "Сохранено";
      nodes.categorySaveStatus.className = "saved";
      showNotice("Настройка сохранена.", "success");
    } catch (error) {
      nodes.categoryToggle.checked = previous;
      nodes.categorySaveStatus.textContent = "Не сохранено";
      nodes.categorySaveStatus.className = "error";
      showNotice(error.message, "error");
    } finally {
      nodes.categoryToggle.disabled = false;
    }
  }

  async function saveQuietHours() {
    if (state.busy || !state.preferences) return;
    var previousStart = state.preferences.quietStart;
    var previousEnd = state.preferences.quietEnd;
    nodes.quietStart.disabled = true;
    nodes.quietEnd.disabled = true;
    nodes.quietSaveStatus.textContent = "Сохраняю…";
    nodes.quietSaveStatus.className = "inline-save-status saving";
    try {
      await savePreferencePatch({
        quietStart: nodes.quietStart.value,
        quietEnd: nodes.quietEnd.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || state.preferences.timezone,
      });
      nodes.quietSaveStatus.textContent = nodes.quietStart.value === nodes.quietEnd.value
        ? "Сохранено · тихие часы выключены"
        : "Сохранено";
      nodes.quietSaveStatus.className = "inline-save-status saved";
      showNotice("Тихие часы сохранены.", "success");
    } catch (error) {
      nodes.quietStart.value = previousStart;
      nodes.quietEnd.value = previousEnd;
      nodes.quietSaveStatus.textContent = "Не сохранено";
      nodes.quietSaveStatus.className = "inline-save-status error";
      showNotice(error.message, "error");
    } finally {
      nodes.quietStart.disabled = false;
      nodes.quietEnd.disabled = false;
    }
  }

  function normalizedSdkError(error) {
    var raw = error && error.message ? String(error.message) : String(error || "");
    var lowered = raw.toLowerCase();
    var safe = new Error("Не удалось подтвердить связь устройства. Повторите проверку позже.");
    safe.code = "PUSH_CONNECTION_UNAVAILABLE";
    if (lowered.includes("onesignal_web_not_configured") || lowered.includes("not configured for web push")) {
      safe.code = "PUSH_WEB_NOT_CONFIGURED";
    } else if (lowered.includes("service worker") || lowered.includes("worker")) {
      safe.code = "PUSH_BACKGROUND_UNAVAILABLE";
    } else if (lowered.includes("timeout")) {
      safe.code = "PUSH_CONNECTION_TIMEOUT";
    } else if (lowered.includes("script_load_failed")) {
      safe.code = "PUSH_MODULE_UNAVAILABLE";
    }
    return safe;
  }

  function isSdkAlreadyInitializedError(error) {
    var raw = error && error.message ? String(error.message) : String(error || "");
    return raw.toLowerCase().includes("already initialized");
  }

  async function verifyOneSignalWebConfiguration() {
    var response = await fetch(
      "https://api.onesignal.com/sync/" + encodeURIComponent(state.config.appId) + "/web",
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    var payload = null;
    try { payload = await response.json(); } catch { /* SDK handles provider details. */ }
    if (payload && payload.success === false && Number(payload.code) === 2) {
      throw new Error("ONESIGNAL_WEB_NOT_CONFIGURED");
    }
    if (!response.ok) throw new Error("PUSH_CONFIGURATION_UNAVAILABLE");
  }

  function sdkScript(onError) {
    var existing = document.getElementById("onesignal-sdk");
    if (existing) {
      existing.addEventListener("error", onError, { once: true });
      return existing;
    }
    var script = document.createElement("script");
    script.id = "onesignal-sdk";
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.dataset.onesignalSdk = "";
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
    return script;
  }

  function attachSdkListeners(OneSignal) {
    if (state.sdkListenersTarget === OneSignal) return;
    var refresh = function () {
      state.optedIn = Boolean(OneSignal.User.PushSubscription.optedIn);
      renderDevice();
      reportDeviceState(OneSignal).catch(function () { /* health telemetry is best-effort */ });
    };
    OneSignal.User.PushSubscription.addEventListener("change", refresh);
    OneSignal.Notifications.addEventListener("permissionChange", refresh);
    state.sdkListenersTarget = OneSignal;
  }

  function deviceKey() {
    var key = localStorage.getItem("bd_push_device_key");
    if (!key) {
      key = "web:" + (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : String(Date.now()) + ":" + Math.random().toString(36).slice(2));
      localStorage.setItem("bd_push_device_key", key);
    }
    return key;
  }

  async function reportDeviceState(OneSignal) {
    if (!state.loaded && !state.config) return;
    var subscription = OneSignal && OneSignal.User ? OneSignal.User.PushSubscription : null;
    var subscriptionId = subscription && typeof subscription.id === "string" ? subscription.id : null;
    var permission = permissionState();
    var optedIn = Boolean(subscription && subscription.optedIn);
    await api("/api/notifications", {
      method: "PUT",
      body: JSON.stringify({
        device: {
          deviceKey: deviceKey(),
          subscriptionId: subscriptionId,
          permission: permission,
          optedIn: optedIn,
          active: permission === "granted" && optedIn && Boolean(subscriptionId),
        },
      }),
    });
  }

  function connectSdk(OneSignal) {
    state.oneSignal = OneSignal;
    state.optedIn = Boolean(OneSignal.User.PushSubscription.optedIn);
    attachSdkListeners(OneSignal);
    state.sdkError = null;
    renderDevice();
    reportDeviceState(OneSignal).catch(function () { /* connection still works if telemetry is delayed */ });
    return OneSignal;
  }

  async function activatePushForAccount(OneSignal) {
    await OneSignal.login(state.config.externalId);
    if (!OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn();
    }
    state.optedIn = Boolean(OneSignal.User.PushSubscription.optedIn);
    if (!state.optedIn) throw new Error("PUSH_SUBSCRIPTION_NOT_CREATED");
    await savePreferencePatch({ enabled: true });
    await reportDeviceState(OneSignal);
  }

  function ensureSdk() {
    if (state.oneSignal) return Promise.resolve(state.oneSignal);
    if (state.sdkPromise) return state.sdkPromise;
    if (!state.config || !state.config.appId) return Promise.reject(new Error("PUSH_NOT_CONFIGURED"));
    state.sdkError = null;
    state.sdkLoading = true;
    renderDevice();
    state.sdkPromise = new Promise(function (resolve, reject) {
      var settled = false;
      var initStarted = false;
      var initCallback;
      var timer = window.setTimeout(function () {
        if (!initStarted) fail(new Error("ONESIGNAL_TIMEOUT"));
      }, 45_000);

      function removeQueuedCallback() {
        if (!Array.isArray(window.OneSignalDeferred)) return;
        var index = window.OneSignalDeferred.indexOf(initCallback);
        if (index >= 0) window.OneSignalDeferred.splice(index, 1);
      }

      function fail(error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        removeQueuedCallback();
        reject(error);
      }

      function succeed(OneSignal) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(OneSignal);
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      initCallback = async function (OneSignal) {
        initStarted = true;
        window.clearTimeout(timer);
        try {
          await OneSignal.init({
            appId: state.config.appId,
            serviceWorkerPath: "OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/" },
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: location.hostname === "localhost",
          });
        } catch (error) {
          if (!isSdkAlreadyInitializedError(error)) {
            fail(error);
            return;
          }
        }
        try {
          connectSdk(OneSignal);
          succeed(OneSignal);
        } catch (error) {
          fail(error);
        }
      };
      window.OneSignalDeferred.push(initCallback);
      verifyOneSignalWebConfiguration().then(function () {
        sdkScript(function () { fail(new Error("ONESIGNAL_SCRIPT_LOAD_FAILED")); });
      }).catch(fail);
    }).catch(function (error) {
      state.sdkPromise = null;
      state.sdkError = normalizedSdkError(error);
      throw state.sdkError;
    }).finally(function () {
      state.sdkLoading = false;
      renderDevice();
    });
    return state.sdkPromise;
  }

  async function inspectSdkIfAvailable() {
    if (!state.config || !state.config.clientConfigured || !state.config.serverConfigured) return;
    if (isIos() && !isStandalone()) return;
    if (isIos() && permissionState() === "default") return;
    if (permissionState() !== "granted") {
      renderDevice();
      return;
    }
    try {
      var OneSignal = await ensureSdk();
      var preferences = state.config.preferences || state.preferences || {};
      var shouldResumeConnection = permissionState() === "granted"
        && !state.optedIn
        && (preferences.enabled === true || !preferences.updatedAt);
      if (shouldResumeConnection) {
        await activatePushForAccount(OneSignal);
        showNotice("Связь устройства восстановлена.", "success");
      }
    } catch {
      state.sdkPromise = null;
    }
    renderDevice();
  }

  async function enablePush() {
    if (isIos() && !isStandalone()) {
      setHidden(nodes.iosGuidance, false);
      nodes.iosGuidance.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!state.config || !state.config.clientConfigured || !state.config.serverConfigured) {
      showNotice("Сервис уведомлений временно недоступен.", "error");
      return;
    }
    setBusy(true);
    try {
      var permission = permissionState();
      if (permission === "default") {
        permission = await Notification.requestPermission();
        renderDevice();
      }
      if (permission === "denied") throw new Error("PUSH_PERMISSION_DENIED");
      if (permission !== "granted" && permissionState() !== "granted") throw new Error("PUSH_PERMISSION_NOT_GRANTED");
      state.sdkError = null;
      var OneSignal = await ensureSdk();
      await activatePushForAccount(OneSignal);
      showNotice("Уведомления включены на этом устройстве.", "success");
      await refreshConfig();
    } catch (error) {
      if (permissionState() === "granted" && isSdkAlreadyInitializedError(error)) {
        await inspectSdkIfAvailable();
      } else {
        showNotice(
          permissionState() === "denied"
            ? "Разрешите уведомления в настройках устройства и повторите проверку."
            : "Не удалось связать устройство. Повторите попытку позже.",
          "error",
        );
      }
    } finally {
      setBusy(false);
      renderDevice();
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      if (state.oneSignal || (state.config && state.config.clientConfigured)) {
        var OneSignal = await ensureSdk();
        await OneSignal.User.PushSubscription.optOut();
      }
      state.optedIn = false;
      await savePreferencePatch({ enabled: false });
      await reportDeviceState(state.oneSignal);
      showNotice("Уведомления отключены.", "success");
      renderDevice();
    } catch {
      showNotice("Не удалось отключить уведомления. Повторите попытку.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      await api("/api/notifications/test", { method: "POST" });
      showNotice("Проверочное уведомление передано сервису.", "success");
      window.setTimeout(function () { refreshConfig(); }, 900);
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshDevice() {
    setBusy(true);
    state.sdkError = null;
    try {
      await refreshConfig();
      await inspectSdkIfAvailable();
      if (state.oneSignal) await reportDeviceState(state.oneSignal);
      showNotice("Состояние устройства обновлено.", "success");
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
      renderDevice();
    }
  }

  async function refreshHistory() {
    setBusy(true);
    try {
      await refreshConfig({ announce: true });
      renderHistory();
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function bindNodes() {
    nodes.notice = byId("global-notice");
    nodes.loading = byId("notification-loading");
    nodes.authRequired = byId("auth-required");
    nodes.loadError = byId("load-error");
    nodes.retry = byId("retry-load");
    nodes.content = byId("notification-content");
    nodes.back = byId("notification-back");
    nodes.pageTitle = byId("notification-page-title");
    nodes.deviceIcon = byId("device-icon");
    nodes.deviceStatusTitle = byId("device-status-title");
    nodes.deviceStatusDescription = byId("device-status-description");
    nodes.deviceAction = byId("device-action");
    nodes.categoryList = byId("category-list");
    nodes.quietSummary = byId("quiet-summary");
    nodes.criticalPolicyRow = byId("critical-policy-row");
    nodes.categoryDetailIcon = byId("category-detail-icon");
    nodes.categoryDetailTitle = byId("category-detail-title");
    nodes.categoryDetailDescription = byId("category-detail-description");
    nodes.categoryToggle = byId("category-toggle");
    nodes.categorySaveStatus = byId("category-save-status");
    nodes.categoryRuleList = byId("category-rule-list");
    nodes.quietStart = byId("quiet-start");
    nodes.quietEnd = byId("quiet-end");
    nodes.quietSaveStatus = byId("quiet-save-status");
    nodes.timezoneNote = byId("timezone-note");
    nodes.historyList = byId("history-list");
    nodes.refreshHistory = byId("refresh-history");
    nodes.deviceDetailIcon = byId("device-detail-icon");
    nodes.deviceDetailTitle = byId("device-detail-title");
    nodes.deviceDetailDescription = byId("device-detail-description");
    nodes.deviceGuidance = byId("device-guidance");
    nodes.iosGuidance = byId("ios-guidance");
    nodes.enable = byId("enable-push");
    nodes.disable = byId("disable-push");
    nodes.test = byId("send-test");
    nodes.refreshDevice = byId("refresh-device");
  }

  function bindEvents() {
    document.querySelectorAll("a[data-notification-link]").forEach(installInternalLink);
    nodes.deviceAction.addEventListener("click", openDeviceView);
    nodes.categoryToggle.addEventListener("change", saveCategoryPreference);
    nodes.quietStart.addEventListener("change", saveQuietHours);
    nodes.quietEnd.addEventListener("change", saveQuietHours);
    nodes.enable.addEventListener("click", enablePush);
    nodes.disable.addEventListener("click", disablePush);
    nodes.test.addEventListener("click", sendTest);
    nodes.refreshDevice.addEventListener("click", refreshDevice);
    nodes.refreshHistory.addEventListener("click", refreshHistory);
    nodes.retry.addEventListener("click", startLoad);
    window.addEventListener("popstate", renderRoute);
    var standaloneMedia = window.matchMedia("(display-mode: standalone)");
    if (standaloneMedia.addEventListener) standaloneMedia.addEventListener("change", renderDevice);
    window.addEventListener("bd:venue-will-change", function () {
      setHidden(nodes.content, true);
      setHidden(nodes.loading, false);
    });
  }

  async function startLoad() {
    setHidden(nodes.authRequired, true);
    setHidden(nodes.loadError, true);
    setHidden(nodes.loading, false);
    try {
      await refreshConfig();
      await inspectSdkIfAvailable();
    } catch (error) {
      setHidden(nodes.loading, true);
      setHidden(nodes.content, true);
      if (error.status === 401) setHidden(nodes.authRequired, false);
      else setHidden(nodes.loadError, false);
    }
  }

  function start() {
    bindNodes();
    bindEvents();
    startLoad();
  }

  window.addEventListener("DOMContentLoaded", start);
})();
