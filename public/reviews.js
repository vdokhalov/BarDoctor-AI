(function reviewsV179() {
  "use strict";

  var state = {
    layer: null,
    sources: null,
    sequence: 0,
    controller: null,
    search: "",
    source: "all",
    importInspection: null,
    analysisAttempted: false,
    doctorAttempted: false,
    doctor: null,
    googleSettings: null,
    googleConnecting: false,
    toastTimer: 0
  };

  var sourceLabels = {
    google: "Google",
    yandex: "Яндекс Карты",
    "2gis": "2ГИС",
    tripadvisor: "TripAdvisor",
    facebook: "Facebook",
    instagram: "Instagram",
    survey: "Анкета",
    other: "Другой источник"
  };
  var topicLabels = {
    staff: "Команда",
    kitchen: "Кухня",
    bar: "Бар",
    music: "Музыка",
    hookah: "Кальяны",
    cleanliness: "Чистота",
    wait_time: "Скорость",
    price: "Цена",
    atmosphere: "Атмосфера",
    other: "Другое"
  };

  var loading = document.getElementById("reviews-loading");
  var auth = document.getElementById("reviews-auth");
  var errorState = document.getElementById("reviews-error");
  var errorCopy = document.getElementById("reviews-error-copy");
  var content = document.getElementById("reviews-content");
  var message = document.getElementById("reviews-message");
  var manualDialog = document.getElementById("manual-review-dialog");
  var importDialog = document.getElementById("review-import-dialog");
  var replyDialog = document.getElementById("review-reply-dialog");
  var googleDialog = document.getElementById("google-business-dialog");
  var googleForm = document.getElementById("google-business-form");

  function node(tag, className, text) {
    var result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function currentVenueId() {
    return localStorage.getItem("bd_active_venue_id") || "";
  }

  function permissions() {
    try { return JSON.parse(localStorage.getItem("bd_active_permissions") || "[]"); } catch { return []; }
  }

  function canManageReviews() {
    var role = localStorage.getItem("bd_active_role") || "";
    var values = permissions();
    return values.includes("reviews.manage") || role === "owner" || role === "manager";
  }

  function canManageIntegrations() {
    var role = localStorage.getItem("bd_active_role") || "";
    return role === "owner" || permissions().includes("integrations.manage");
  }

  function canImportReviews() {
    return canManageReviews() && (permissions().includes("data.import") || permissions().length === 0);
  }

  function sessionHeaders(includeContentType) {
    var headers = {};
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    if (includeContentType !== false) headers["Content-Type"] = "application/json";
    if (email && token) {
      headers["X-Session-Email"] = email;
      headers["X-Session-Token"] = token;
      if (currentVenueId()) headers["X-Venue-Id"] = currentVenueId();
    }
    return headers;
  }

  async function api(path, options, signal) {
    var settings = Object.assign({ cache: "no-store" }, options || {});
    settings.headers = Object.assign(
      {},
      sessionHeaders(!(settings.body instanceof FormData)),
      settings.headers || {}
    );
    if (signal) settings.signal = signal;
    var response = await fetch(path, settings);
    var result;
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok || result.ok === false || result.success === false) {
      var problem = new Error(result.error || "Запрос не выполнен");
      problem.status = response.status;
      throw problem;
    }
    return result;
  }

  async function ensureSession() {
    if (localStorage.getItem("bd_session") && localStorage.getItem("bd_session_token")) return;
    var result = await api("/api/auth/bootstrap", { method: "POST", body: "{}" });
    localStorage.setItem("bd_session", result.email);
    localStorage.setItem("bd_session_token", result.token);
    localStorage.setItem("bd_session_userid", String(result.userId));
  }

  function showMessage(text, isError) {
    window.clearTimeout(state.toastTimer);
    message.textContent = text;
    message.classList.remove("hidden", "error");
    if (isError) message.classList.add("error");
    message.setAttribute("role", isError ? "alert" : "status");
    state.toastTimer = window.setTimeout(function () { message.classList.add("hidden"); }, 6500);
  }

  function readableDate(value, withTime) {
    if (!value) return "—";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    var options = withTime
      ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" };
    return new Intl.DateTimeFormat("ru-RU", options).format(date).replace(" г.", "");
  }

  function number(value, digits) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits == null ? 0 : digits }).format(value);
  }

  function reviewCount(value) {
    var count = Number(value || 0);
    var mod100 = Math.abs(count) % 100;
    var mod10 = mod100 % 10;
    var word = mod100 >= 11 && mod100 <= 14 ? "отзывов" : mod10 === 1 ? "отзыв" : mod10 >= 2 && mod10 <= 4 ? "отзыва" : "отзывов";
    return number(count) + " " + word;
  }

  function summary() {
    return state.layer && state.layer.summary ? state.layer.summary : {};
  }

  function reviews() {
    return state.layer && Array.isArray(state.layer.reviews) ? state.layer.reviews : [];
  }

  function renderKpis() {
    var data = summary();
    var sourceCount = Object.keys(data.sources || {}).length;
    document.getElementById("reviews-total").textContent = typeof data.total === "number" ? number(data.total) : "—";
    document.getElementById("reviews-sources-count").textContent = typeof data.total === "number"
      ? sourceCount + " " + (sourceCount === 1 ? "источник" : sourceCount >= 2 && sourceCount <= 4 ? "источника" : "источников")
      : "данные не получены";
    document.getElementById("reviews-rating").textContent = data.averageRating == null ? "—" : number(data.averageRating, 2) + " / 5";
    document.getElementById("reviews-rated-count").textContent = typeof data.rated === "number" ? "оценок: " + number(data.rated) : "оценки не зафиксированы";
    var trend = data.trend || {};
    document.getElementById("reviews-trend").textContent = trend.available
      ? (trend.delta > 0 ? "+" : "") + number(trend.delta, 2)
      : "—";
    document.getElementById("reviews-trend-note").textContent = trend.available
      ? "к предыдущим 30 дням"
      : trend.reason || "Недостаточно данных";
    document.getElementById("reviews-last").textContent = readableDate(data.lastReceivedAt, false);
  }

  function renderAnalysis() {
    var data = summary();
    var confidence = document.getElementById("reviews-confidence");
    var confidenceLabel = data.confidence === "high" ? "Высокая уверенность" : data.confidence === "medium" ? "Средняя уверенность" : "Низкая уверенность";
    confidence.textContent = confidenceLabel;
    confidence.className = "confidence-pill " + (data.confidence || "low");
    document.getElementById("reviews-confidence-note").textContent = data.confidenceReason || "Достоверность анализа пока неизвестна.";

    var sentiment = data.sentiment || {};
    var root = document.getElementById("reviews-analysis-state");
    root.textContent = "";
    [["Положительные", sentiment.positive, "positive"], ["Нейтральные", sentiment.neutral, "neutral"], ["Негативные", sentiment.negative, "negative"]].forEach(function (item) {
      var card = node("article", item[2]);
      card.appendChild(node("span", "", item[0]));
      card.appendChild(node("strong", "", typeof item[1] === "number" ? number(item[1]) : "—"));
      root.appendChild(card);
    });

    var topics = document.getElementById("reviews-topics");
    topics.textContent = "";
    var topicItems = Array.isArray(data.topics) ? data.topics : [];
    if (!topicItems.length) {
      topics.appendChild(node("div", "honest-state", data.total
        ? "Темы появятся после AI-анализа отзывов."
        : "Добавьте отзывы вручную, импортируйте файл или подключите Google."));
    } else {
      topicItems.slice(0, 8).forEach(function (item) {
        topics.appendChild(node("span", "topic-chip " + (item.negative > item.positive ? "negative" : ""), (topicLabels[item.topic] || item.topic) + " · " + number(item.count)));
      });
    }
    renderDoctor();
  }

  function sourceMark(label, google) {
    var mark = node("span", "source-mark" + (google ? " google" : ""));
    if (google) {
      var image = document.createElement("img");
      image.src = "/integration-icons/google-g.svg";
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      mark.appendChild(image);
    } else mark.textContent = label;
    return mark;
  }

  function sourceRow(options) {
    var row = node("article", "review-source-row");
    row.appendChild(sourceMark(options.mark, options.google));
    var copy = node("div");
    copy.appendChild(node("strong", "", options.title));
    copy.appendChild(node("p", "", options.description));
    row.appendChild(copy);
    var actions = Array.isArray(options.actions) ? options.actions : options.action ? [options.action] : [];
    if (actions.length) {
      var actionRoot = node("div", "source-actions");
      actions.forEach(function (actionOptions) {
        var action = node("button", "source-action", actionOptions.label);
        action.type = "button";
        action.disabled = Boolean(actionOptions.disabled);
        if (!action.disabled) action.addEventListener("click", actionOptions.handler);
        actionRoot.appendChild(action);
      });
      row.appendChild(actionRoot);
    }
    return row;
  }

  function googleStatus(provider) {
    if (state.googleConnecting) return { code: "CONNECTING", description: "Открываю авторизацию Google…" };
    if (!provider) return { code: "SYNC ERROR", description: "Не удалось проверить Google Business Profile." };
    if (provider.status === "connected" && provider.lastSyncError) return { code: "SYNC ERROR", description: provider.lastSyncError };
    if (provider.status === "connected") return { code: "CONNECTED", description: provider.locationName ? "Подключено: " + provider.locationName + ". Последняя синхронизация: " + readableDate(provider.lastSyncedAt, true) : "Google Business Profile подключён." };
    if (provider.status === "pending_location") return { code: "PENDING LOCATION", description: "Авторизация завершена. Выберите заведение Google Business Profile." };
    if (provider.status === "error") return { code: "SYNC ERROR", description: provider.lastSyncError || "Google-подключение требует повторной авторизации." };
    if (provider.configured) return { code: "READY TO CONNECT", description: "Google OAuth настроен. Подключите аккаунт Google." };
    return { code: "NOT CONFIGURED", description: "Сохраните Google Client ID и Client Secret." };
  }

  function renderSources() {
    var root = document.getElementById("review-sources-list");
    root.textContent = "";
    var providers = state.sources && Array.isArray(state.sources.providers) ? state.sources.providers : [];
    var google = providers.find(function (provider) { return provider.id === "google"; }) || null;
    var status = googleStatus(google);
    var googleActions = [];
    if (canManageIntegrations()) googleActions.push({ label: google && google.configured ? "Настройки" : "Настроить", handler: openGoogleSettings });
    if (google && google.status === "connected" && canManageReviews()) googleActions.push({ label: "Синхронизировать", handler: syncGoogle });
    else if (google && google.status !== "pending_location" && google.configured && canManageReviews()) googleActions.push({ label: google.status === "error" ? "Подключить заново" : "Подключить Google", handler: connectGoogle });
    var googleRow = sourceRow({ mark: "G", google: true, title: "Google Business Profile", description: status.code + ". " + status.description, actions: googleActions });
    if (google && google.status === "pending_location" && Array.isArray(google.pendingLocations)) {
      var location = node("div", "location-select");
      var select = document.createElement("select");
      select.setAttribute("aria-label", "Профиль Google Business Profile");
      google.pendingLocations.forEach(function (item) {
        var option = node("option", "", item.name || item.id);
        option.value = item.id;
        select.appendChild(option);
      });
      var confirm = node("button", "source-action", "Подтвердить");
      confirm.type = "button";
      confirm.addEventListener("click", function () { selectGoogleLocation(select.value, confirm); });
      location.append(select, confirm);
      googleRow.appendChild(location);
    }
    root.appendChild(googleRow);

    var methods = summary().methods || {};
    root.appendChild(sourceRow({
      mark: "+",
      title: "Ручные отзывы",
      description: reviewCount(methods.manual || 0) + " · проходят тот же AI-анализ",
      action: canManageReviews() ? { label: "Добавить", handler: openManual } : null
    }));
    root.appendChild(sourceRow({
      mark: "⇧",
      title: "Импорт из файла",
      description: reviewCount(methods.file_import || 0) + " · CSV, Excel или JSON",
      action: canImportReviews() ? { label: "Импортировать", handler: openImport } : null
    }));
  }

  function sourceFilterButton(id, label, count) {
    var button = node("button", "review-filter" + (state.source === id ? " active" : ""), label + (typeof count === "number" ? " · " + number(count) : ""));
    button.type = "button";
    button.addEventListener("click", function () { state.source = id; renderFilters(); renderReviewList(); });
    return button;
  }

  function renderFilters() {
    var root = document.getElementById("review-source-filters");
    root.textContent = "";
    root.appendChild(sourceFilterButton("all", "Все", reviews().length));
    Object.entries(summary().sources || {}).sort(function (left, right) { return right[1] - left[1]; }).forEach(function (entry) {
      root.appendChild(sourceFilterButton(entry[0], sourceLabels[entry[0]] || entry[0], entry[1]));
    });
  }

  function ratingStars(value) {
    if (typeof value !== "number") return "Без оценки";
    return "★".repeat(Math.max(1, Math.min(5, Math.round(value)))) + "☆".repeat(Math.max(0, 5 - Math.round(value)));
  }

  function renderReviewList() {
    var root = document.getElementById("review-list");
    root.textContent = "";
    var query = state.search.trim().toLocaleLowerCase("ru");
    var values = reviews().filter(function (review) {
      if (state.source !== "all" && review.source !== state.source) return false;
      if (!query) return true;
      return [review.text, review.authorName, sourceLabels[review.source] || review.source]
        .filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(query);
    });
    if (!values.length) {
      root.appendChild(node("div", "review-empty", reviews().length ? "По выбранному фильтру отзывов нет." : "Отзывов пока нет. Добавьте первый отзыв или импортируйте файл."));
      return;
    }
    values.forEach(function (review) {
      var item = node("article", "review-item");
      var date = node("div", "review-item-date");
      date.appendChild(node("span", "", readableDate(review.publishedAt || review.date, false)));
      if (review.ingestionMethod === "file_import") date.appendChild(node("span", "", "Импорт"));
      else if (review.ingestionMethod === "sync") date.appendChild(node("span", "", "Синхронизация"));
      else date.appendChild(node("span", "", "Вручную"));
      item.appendChild(date);
      var main = node("div", "review-item-main");
      var head = node("div", "review-item-head");
      head.appendChild(node("strong", "", review.authorName || "Гость"));
      head.appendChild(node("span", "rating-stars", ratingStars(review.rating)));
      head.appendChild(node("span", "review-source-label", sourceLabels[review.source] || review.source || "Источник не указан"));
      main.appendChild(head);
      main.appendChild(node("p", "review-item-text", review.text));
      if (review.aiSummary) main.appendChild(node("p", "review-ai-summary", review.aiSummary));
      if (Array.isArray(review.topics) && review.topics.length) {
        var topics = node("div", "review-topics");
        review.topics.slice(0, 6).forEach(function (topic) { topics.appendChild(node("span", "", topicLabels[topic] || topic)); });
        main.appendChild(topics);
      }
      item.appendChild(main);
      var actions = node("div", "review-item-actions");
      if (canManageReviews()) {
        var reply = node("button", "source-action", "Подготовить ответ");
        reply.type = "button";
        reply.addEventListener("click", function () { prepareReply(review, reply); });
        actions.appendChild(reply);
      }
      item.appendChild(actions);
      root.appendChild(item);
    });
  }

  function renderDoctor() {
    var root = document.getElementById("reviews-doctor");
    root.textContent = "";
    if (!state.doctor) return;
    var recommendations = Array.isArray(state.doctor.recommendations) ? state.doctor.recommendations : [];
    if (!recommendations.length) return;
    root.appendChild(node("h3", "doctor-heading", "Что делать дальше"));
    recommendations.slice(0, 4).forEach(function (item) { root.appendChild(node("div", "doctor-item", item)); });
  }

  function renderAll() {
    renderKpis();
    renderAnalysis();
    renderSources();
    renderFilters();
    renderReviewList();
    document.getElementById("add-review").hidden = !canManageReviews();
    document.getElementById("import-reviews").hidden = !canImportReviews();
  }

  function googleProvider() {
    var providers = state.sources && Array.isArray(state.sources.providers) ? state.sources.providers : [];
    return providers.find(function (provider) { return provider.id === "google"; }) || null;
  }

  function setGoogleSettingsError(text) {
    var error = document.getElementById("google-settings-error");
    error.textContent = text || "";
    error.classList.toggle("hidden", !text);
  }

  function resetGoogleSecretVisibility() {
    var secret = googleForm.elements.clientSecret;
    var toggle = document.getElementById("google-secret-toggle");
    secret.type = "password";
    toggle.textContent = "Показать";
    toggle.setAttribute("aria-pressed", "false");
    toggle.disabled = !secret.value;
  }

  function updateGoogleSecretToggle() {
    document.getElementById("google-secret-toggle").disabled = !googleForm.elements.clientSecret.value;
  }

  function navigateGoogleOAuth(url) {
    window.top.location.assign(url.href);
  }

  function renderGoogleSettings() {
    var provider = googleProvider();
    var status = googleStatus(provider);
    var settings = state.googleSettings;
    var configured = Boolean(settings && settings.services && settings.services.google_business && settings.services.google_business.configured) || Boolean(provider && provider.configured);
    if (!provider && configured) status = { code: "READY TO CONNECT", description: "Google OAuth настроен. Подключите аккаунт Google." };
    document.getElementById("google-setup-state").textContent = status.code;
    document.getElementById("google-setup-description").textContent = configured ? (status.code === "NOT CONFIGURED" ? "Google OAuth настроен." : status.description) : "Введите Google Client ID и Client Secret.";
    document.getElementById("google-callback-url").value = settings && settings.googleCallbackUrl ? settings.googleCallbackUrl : "";
    var connect = document.getElementById("google-connect-button");
    connect.classList.toggle("hidden", !configured || status.code === "CONNECTED" || status.code === "PENDING LOCATION");
    connect.disabled = state.googleConnecting;
    connect.textContent = state.googleConnecting ? "Подключаю…" : status.code === "SYNC ERROR" ? "Подключить заново" : "Подключить Google";
  }

  async function loadGoogleSettings() {
    setGoogleSettingsError("");
    try {
      var result = await api("/api/integrations", { method: "GET" });
      state.googleSettings = result.data;
      renderGoogleSettings();
    } catch (problem) {
      setGoogleSettingsError(problem.message || "Не удалось загрузить настройки Google OAuth.");
    }
  }

  function openGoogleSettings() {
    if (!canManageIntegrations()) return showMessage("Настройки OAuth доступны только владельцу.", true);
    googleForm.reset();
    resetGoogleSecretVisibility();
    setGoogleSettingsError("");
    renderGoogleSettings();
    googleDialog.showModal();
    loadGoogleSettings();
  }

  async function saveGoogleSettings(event) {
    event.preventDefault();
    var clientId = String(googleForm.elements.clientId.value || "").trim();
    var clientSecret = String(googleForm.elements.clientSecret.value || "").trim();
    var submit = document.getElementById("google-settings-save");
    setGoogleSettingsError("");
    if (!clientId && !clientSecret) return setGoogleSettingsError("Введите Google Client ID и Client Secret.");
    if (!clientId) return setGoogleSettingsError("Введите Google Client ID.");
    if (!clientSecret) return setGoogleSettingsError("Введите Google Client Secret.");
    submit.disabled = true;
    submit.textContent = "Сохраняю…";
    try {
      var result = await api("/api/integrations", {
        method: "PUT",
        body: JSON.stringify({ service: "google_business", clientId: clientId, clientSecret: clientSecret })
      });
      state.googleSettings = result.data;
      var provider = googleProvider();
      if (provider) provider.configured = true;
      googleForm.reset();
      resetGoogleSecretVisibility();
      renderAll();
      renderGoogleSettings();
      showMessage("Google OAuth настроен.");
    } catch (problem) {
      setGoogleSettingsError(problem.message || "Не удалось сохранить настройки Google OAuth.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Сохранить";
    }
  }

  async function connectGoogle(event) {
    var target = event && event.currentTarget;
    if (target) target.disabled = true;
    state.googleConnecting = true;
    renderSources();
    try {
      var result = await api("/api/reviews/sources/google/connect", { method: "GET" });
      var url = result.data && result.data.url ? new URL(result.data.url) : null;
      if (!url || url.protocol !== "https:" || url.hostname !== "accounts.google.com") throw new Error("Google вернул некорректную ссылку авторизации.");
      navigateGoogleOAuth(url);
    } catch (problem) {
      state.googleConnecting = false;
      renderSources();
      if (googleDialog.open) {
        renderGoogleSettings();
        setGoogleSettingsError(problem.message || "Не удалось начать подключение Google.");
      }
      showMessage(problem.message || "Не удалось начать подключение Google.", true);
      if (target) target.disabled = false;
    }
  }

  async function selectGoogleLocation(locationId, target) {
    target.disabled = true;
    try {
      var result = await api("/api/reviews/sources/google/select-location", { method: "POST", body: JSON.stringify({ locationId: locationId }) });
      var sync = result.data && result.data.sync;
      showMessage(sync && sync.ok === false ? "Профиль подключён, но первая синхронизация не завершена: " + (sync.error || "повторите попытку") : "Профиль Google подключён, первая синхронизация завершена.", Boolean(sync && sync.ok === false));
      await loadData();
    } catch (problem) {
      showMessage(problem.message || "Не удалось выбрать профиль.", true);
      target.disabled = false;
    }
  }

  async function syncGoogle(event) {
    var target = event && event.currentTarget;
    if (target) target.disabled = true;
    try {
      var result = await api("/api/reviews/sources/google/sync", { method: "POST", body: "{}" });
      if (!result.data || !result.data.synced) throw new Error(result.data && result.data.error ? result.data.error : "Синхронизация не завершена");
      showMessage("Google синхронизирован: новых " + number(result.data.added || 0) + ", обновлено " + number(result.data.updated || 0) + ".");
      await loadData();
    } catch (problem) {
      showMessage(problem.message || "Не удалось синхронизировать Google.", true);
      if (target) target.disabled = false;
    }
  }

  function openManual() {
    var date = manualDialog.querySelector('input[name="publishedAt"]');
    if (!date.value) date.value = new Date().toISOString().slice(0, 10);
    manualDialog.showModal();
  }

  function openImport() {
    importDialog.showModal();
  }

  async function analyzePending() {
    if (state.analysisAttempted || !canManageReviews()) return;
    state.analysisAttempted = true;
    var pending = reviews().filter(function (review) { return review.aiStatus === "pending"; }).slice(0, 25);
    if (!pending.length) return loadDoctorSummary();
    try {
      var analyzed = await api("/api/reviews/analyze", {
        method: "POST",
        body: JSON.stringify({ reviews: pending.map(function (review) { return { id: review.id, source: review.source, rating: review.rating, text: review.text, date: review.publishedAt }; }) })
      });
      var results = analyzed.data && Array.isArray(analyzed.data.results) ? analyzed.data.results : [];
      var persisted = await api("/api/review-layer/analysis", { method: "POST", body: JSON.stringify({ updates: results }) });
      if (persisted.data) state.layer = persisted.data;
      renderAll();
    } catch {
      showMessage("AI-анализ временно недоступен. Отзывы сохранены и не потеряны.", true);
    }
    loadDoctorSummary();
  }

  async function loadDoctorSummary() {
    if (state.doctorAttempted || !canManageReviews() || !summary().total) return;
    state.doctorAttempted = true;
    var cacheKey = "bd_review_doctor::" + currentVenueId() + "::" + (state.layer.updatedAt || "unknown");
    try {
      var cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (cached) { state.doctor = cached; renderDoctor(); return; }
    } catch { /* no-op */ }
    try {
      var data = summary();
      var result = await api("/api/reviews/doctor-summary", {
        method: "POST",
        body: JSON.stringify({
          insights: {
            totalReviews: data.total || 0,
            sentiment: Object.assign({ total: data.analyzed || 0 }, data.sentiment || {}),
            avgRating: data.averageRating,
            trend: data.trend,
            topComplaints: data.complaints,
            sources: data.sources,
            confidence: data.confidence
          },
          topics: data.topics,
          staffMentions: []
        })
      });
      state.doctor = result.data || null;
      if (state.doctor) sessionStorage.setItem(cacheKey, JSON.stringify(state.doctor));
      renderDoctor();
    } catch {
      // The deterministic summary remains available when the AI provider is offline.
    }
  }

  async function prepareReply(review, target) {
    target.disabled = true;
    try {
      var result = await api("/api/reviews/reply", { method: "POST", body: JSON.stringify({ review: review }) });
      document.getElementById("review-reply-copy").textContent = result.data && result.data.draft ? result.data.draft : "Черновик не подготовлен.";
      replyDialog.showModal();
    } catch (problem) {
      showMessage(problem.message || "Не удалось подготовить ответ.", true);
    } finally {
      target.disabled = false;
    }
  }

  async function loadData() {
    var sequence = ++state.sequence;
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    var signal = state.controller.signal;
    var venueAtStart = currentVenueId();
    loading.classList.remove("hidden");
    auth.classList.add("hidden");
    errorState.classList.add("hidden");
    content.classList.add("hidden");
    try {
      await ensureSession();
      venueAtStart = currentVenueId();
      var results = await Promise.all([
        api("/api/review-layer", { method: "GET" }, signal),
        api("/api/reviews/sources", { method: "GET" }, signal)
      ]);
      if (sequence !== state.sequence || venueAtStart !== currentVenueId()) return;
      state.layer = results[0].data;
      state.sources = results[1].data;
      state.analysisAttempted = false;
      state.doctorAttempted = false;
      state.doctor = null;
      renderAll();
      loading.classList.add("hidden");
      content.classList.remove("hidden");
      analyzePending();
    } catch (problem) {
      if (problem && problem.name === "AbortError") return;
      loading.classList.add("hidden");
      if (problem && problem.status === 401) auth.classList.remove("hidden");
      else {
        errorCopy.textContent = problem && problem.message ? problem.message : "Повторите попытку.";
        errorState.classList.remove("hidden");
      }
    }
  }

  document.getElementById("reviews-retry").addEventListener("click", loadData);
  document.getElementById("add-review").addEventListener("click", openManual);
  document.getElementById("import-reviews").addEventListener("click", openImport);
  document.getElementById("review-search").addEventListener("input", function (event) { state.search = event.target.value; renderReviewList(); });
  document.querySelectorAll("[data-close-dialog]").forEach(function (control) {
    control.addEventListener("click", function () {
      var dialog = document.getElementById(control.dataset.closeDialog);
      if (dialog && dialog.open) {
        dialog.close();
        if (dialog === googleDialog) {
          googleForm.reset();
          resetGoogleSecretVisibility();
          setGoogleSettingsError("");
        }
      }
    });
  });

  googleForm.addEventListener("submit", saveGoogleSettings);
  document.getElementById("google-connect-button").addEventListener("click", connectGoogle);
  googleForm.elements.clientSecret.addEventListener("input", updateGoogleSecretToggle);
  document.getElementById("google-secret-toggle").addEventListener("click", function () {
    var secret = googleForm.elements.clientSecret;
    if (!secret.value) return;
    var reveal = secret.type === "password";
    secret.type = reveal ? "text" : "password";
    this.textContent = reveal ? "Скрыть" : "Показать";
    this.setAttribute("aria-pressed", String(reveal));
    secret.focus();
  });
  document.getElementById("copy-google-callback").addEventListener("click", async function () {
    var callbackUrl = document.getElementById("google-callback-url").value;
    if (!callbackUrl) return setGoogleSettingsError("Callback URL пока не получен от сервера.");
    try {
      await navigator.clipboard.writeText(callbackUrl);
      showMessage("Callback URL скопирован.");
    } catch {
      document.getElementById("google-callback-url").select();
      setGoogleSettingsError("Автокопирование недоступно. Скопируйте выделенный Callback URL.");
    }
  });

  document.getElementById("manual-review-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    var values = Object.fromEntries(new FormData(form).entries());
    if (values.rating) values.rating = Number(values.rating);
    try {
      var result = await api("/api/review-layer/reviews", { method: "POST", body: JSON.stringify(values) });
      manualDialog.close();
      form.reset();
      showMessage(result.result && result.result.skipped ? "Такой отзыв уже есть — дубль не создан." : "Отзыв добавлен и передан на единый AI-анализ.");
      await loadData();
    } catch (problem) {
      showMessage(problem.message || "Не удалось сохранить отзыв.", true);
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById("review-import-preview").addEventListener("click", async function (event) {
    var form = document.getElementById("review-import-form");
    var file = form.querySelector('input[name="file"]').files[0];
    if (!file) return showMessage("Сначала выберите файл.", true);
    event.currentTarget.disabled = true;
    var payload = new FormData();
    payload.append("file", file);
    try {
      var result = await api("/api/review-layer/import/preview", { method: "POST", body: payload });
      state.importInspection = result;
      var root = document.getElementById("review-import-fields");
      root.textContent = "";
      result.fields.forEach(function (field) {
        var label = node("label", "field-map-row", field.label + (field.required ? " *" : ""));
        var select = document.createElement("select");
        select.dataset.target = field.target;
        var empty = node("option", "", "Не импортировать");
        empty.value = "";
        select.appendChild(empty);
        result.inspection.headers.forEach(function (header) {
          var option = node("option", "", header);
          option.value = header;
          option.selected = result.inspection.suggestedMapping[field.target] === header;
          select.appendChild(option);
        });
        select.addEventListener("change", updateImportMapping);
        label.appendChild(select);
        root.appendChild(label);
      });
      document.getElementById("review-import-summary").textContent = reviewCount(result.inspection.recordCount) + " · " + number(result.inspection.headers.length) + " столбцов";
      document.getElementById("review-import-mapping").classList.remove("hidden");
      updateImportMapping();
    } catch (problem) {
      showMessage(problem.message || "Не удалось проверить файл.", true);
    } finally {
      event.currentTarget.disabled = false;
    }
  });

  function updateImportMapping() {
    var mapping = {};
    document.querySelectorAll("#review-import-fields select[data-target]").forEach(function (select) {
      if (select.value) mapping[select.dataset.target] = select.value;
    });
    document.querySelector('#review-import-form input[name="fieldMapping"]').value = JSON.stringify(mapping);
    document.getElementById("review-import-submit").disabled = !mapping.text;
  }

  document.querySelector('#review-import-form input[name="file"]').addEventListener("change", function () {
    state.importInspection = null;
    document.getElementById("review-import-mapping").classList.add("hidden");
    document.getElementById("review-import-submit").disabled = true;
  });

  document.getElementById("review-import-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var file = form.querySelector('input[name="file"]').files[0];
    if (!file || !state.importInspection) return showMessage("Сначала проверьте структуру файла.", true);
    var submit = document.getElementById("review-import-submit");
    submit.disabled = true;
    var payload = new FormData();
    payload.append("file", file);
    payload.append("source", form.elements.source.value);
    payload.append("fieldMapping", form.elements.fieldMapping.value);
    try {
      var result = await api("/api/review-layer/import", { method: "POST", body: payload });
      var stats = result.result || {};
      var resultBox = document.getElementById("review-import-result");
      resultBox.classList.remove("hidden", "error");
      resultBox.textContent = "Создано: " + number(stats.created || 0) + " · обновлено: " + number(stats.updated || 0) + " · пропущено: " + number(stats.skipped || 0) + " · ошибки: " + number(stats.invalid || 0);
      showMessage("Импорт завершён. Дубли не создаются.");
      window.setTimeout(function () { importDialog.close(); form.reset(); loadData(); }, 900);
    } catch (problem) {
      showMessage(problem.message || "Импорт не выполнен.", true);
      submit.disabled = false;
    }
  });

  document.getElementById("copy-review-reply").addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(document.getElementById("review-reply-copy").textContent || "");
      showMessage("Черновик скопирован.");
    } catch {
      showMessage("Не удалось скопировать автоматически.", true);
    }
  });

  window.addEventListener("bd:venue-will-change", function () {
    state.sequence += 1;
    if (state.controller) state.controller.abort();
    state.layer = null;
    state.sources = null;
    state.googleSettings = null;
    state.googleConnecting = false;
    state.search = "";
    state.source = "all";
  });

  var params = new URLSearchParams(window.location.search);
  var googleReason = params.get("reason");
  var googleErrors = {
    access_denied: "Вы отменили доступ Google. Подключение не изменено.",
    invalid_state: "Сессия подключения истекла. Начните подключение Google заново.",
    no_locations: "В аккаунте Google Business Profile не найдено доступных заведений.",
    invalid_client: "Google отклонил Client ID или Client Secret.",
    invalid_client_secret: "Google отклонил Client Secret для этого OAuth Client ID.",
    redirect_uri_mismatch: "Callback URL не совпадает с Authorized redirect URI в Google Cloud.",
    invalid_grant: "Google authorization code истёк, уже использован или был отозван. Начните подключение заново.",
    profile_unauthorized: "Google-токен истёк или был отозван. Подключите Google заново.",
    profile_forbidden: "Google авторизация завершена, но доступ к Business Profile запрещён. Проверьте права аккаунта и включённые Google Business API.",
    profile_rate_limited: "Google временно ограничил запросы к Business Profile. Повторите попытку позже.",
    profile_unavailable: "Google авторизация завершена, но Business Profile временно недоступен.",
    exchange_failed: "Google не завершил обмен authorization code. Повторите подключение."
  };
  if (params.get("googleConnect") === "success" && params.get("sync") === "error") showMessage("Google Business Profile подключён, но первая синхронизация завершилась ошибкой.", true);
  else if (params.get("googleConnect") === "success") showMessage("Google Business Profile подключён, первая синхронизация завершена.");
  else if (params.get("googleConnect") === "pending") showMessage("Выберите профиль заведения Google.");
  else if (params.get("googleConnect") === "error") showMessage(googleErrors[googleReason] || "Подключение Google не завершено. Проверьте OAuth-настройки и повторите попытку.", true);

  loadData();
})();
