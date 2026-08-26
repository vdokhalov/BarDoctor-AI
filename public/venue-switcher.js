(function () {
  "use strict";

  var context = { venues: [], activeVenueId: null, canCreateVenues: false };
  var switching = false;
  var observer = null;
  var renderFrame = 0;
  var contextEpoch = 0;

  var SAFE_MODULE_ROOTS = new Set([
    "/home", "/shifts", "/finance", "/employees", "/salaries", "/warehouse",
    "/suppliers", "/assortment", "/equipment", "/integrations", "/data-control",
    "/team-access", "/tasks", "/reports", "/notifications", "/market",
    "/opportunities", "/supplier-alternatives", "/sales-import", "/more",
    "/profile", "/settings", "/analysis", "/reviews", "/incidents"
  ]);

  var MODULE_ALIASES = {
    "/catalog": "/assortment",
    "/inventory": "/warehouse",
    "/purchases": "/suppliers",
    "/payroll": "/salaries",
    "/team": "/employees"
  };

  function email() {
    return localStorage.getItem("bd_session") || "session";
  }

  function contextKey() {
    return "bd_venue_context__" + email();
  }

  function roleLabel(role) {
    return role === "owner" ? "Владелец" : role === "manager" ? "Управляющий" : "Менеджер";
  }

  function venueInitials(venue) {
    var parts = String(venue && venue.name || "Заведение").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  }

  function venueLogoUrl(venue) {
    var logoId = venue && typeof venue.logoId === "string" ? venue.logoId : "";
    return /^[a-zA-Z0-9-]{20,80}$/.test(logoId) ? "/api/venues/logo/" + logoId : "";
  }

  function renderVenueAvatar(target, venue) {
    if (!target) return;
    var fallback = venueInitials(venue);
    var logoUrl = venueLogoUrl(venue);
    target.replaceChildren();
    target.classList.remove("has-logo");
    if (!logoUrl) {
      target.textContent = fallback;
      return;
    }
    var image = document.createElement("img");
    image.src = logoUrl;
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("load", function () { target.classList.add("has-logo"); }, { once: true });
    image.addEventListener("error", function () {
      target.classList.remove("has-logo");
      target.textContent = fallback;
    }, { once: true });
    target.appendChild(image);
  }

  function loadContext() {
    try {
      var stored = JSON.parse(localStorage.getItem(contextKey()) || "null");
      if (stored && Array.isArray(stored.venues)) {
        context = stored;
        context.activeVenueId = Number(localStorage.getItem("bd_active_venue_id")) || stored.activeVenueId || null;
      }
    } catch {
      context = { venues: [], activeVenueId: null, canCreateVenues: false };
    }
  }

  function saveContext() {
    try { localStorage.setItem(contextKey(), JSON.stringify(context)); } catch { /* no-op */ }
  }

  function activeVenue() {
    return context.venues.find(function (venue) {
      return Number(venue.id) === Number(context.activeVenueId);
    }) || context.venues[0] || null;
  }

  function currentVenueId() {
    return Number(localStorage.getItem("bd_active_venue_id")) || Number(context.activeVenueId) || null;
  }

  function bumpContextEpoch() {
    contextEpoch += 1;
    window.__bdVenueContextEpoch = contextEpoch;
    return contextEpoch;
  }

  function moduleRoot(pathname) {
    var firstSegment = "/" + String(pathname || "").split("/").filter(Boolean)[0];
    if (MODULE_ALIASES[firstSegment]) return MODULE_ALIASES[firstSegment];
    return SAFE_MODULE_ROOTS.has(firstSegment) ? firstSegment : "/home";
  }

  function safeTargetForVenue(venueId, href) {
    var source = new URL(href || window.location.href, window.location.href);
    var target = new URL(moduleRoot(source.pathname), source.origin);
    target.searchParams.set("venue", String(venueId));
    return target.pathname + target.search;
  }

  function staleVenueError() {
    return new DOMException("Ответ относится к ранее выбранному заведению", "AbortError");
  }

  function installResponseGuard() {
    if (window.fetch.__bdCanonicalVenueGuard) return;
    var previousFetch = window.fetch.bind(window);
    var guardedFetch = function () {
      var input = arguments[0];
      var init = arguments[1] || {};
      var requestUrl = null;
      var requestVenueId = null;
      var requestEpoch = contextEpoch;
      var shouldGuard = false;
      try {
        requestUrl = new URL(typeof input === "string" ? input : input.url, window.location.href);
        if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith("/api/")) {
          var headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init.headers || {}).forEach(function (value, key) { headers.set(key, value); });
          requestVenueId = headers.get("X-Venue-Id") || String(currentVenueId() || "");
          shouldGuard = Boolean(requestVenueId)
            && !requestUrl.pathname.startsWith("/api/auth/")
            && requestUrl.pathname !== "/api/access/active-venue"
            && requestUrl.pathname !== "/api/access/join";
        }
      } catch {
        shouldGuard = false;
      }
      var pending = previousFetch.apply(null, arguments);
      if (!shouldGuard) return pending;
      return Promise.resolve(pending).then(function (response) {
        if (requestEpoch !== contextEpoch || String(currentVenueId() || "") !== String(requestVenueId)) {
          try { if (response.body) response.body.cancel(); } catch { /* no-op */ }
          throw staleVenueError();
        }
        return response;
      });
    };
    guardedFetch.__bdCanonicalVenueGuard = true;
    window.fetch = guardedFetch;
  }

  function sessionHeaders() {
    var sessionEmail = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    if (!sessionEmail || !token) return null;
    var headers = {
      "Content-Type": "application/json",
      "X-Session-Email": sessionEmail,
      "X-Session-Token": token
    };
    if (context.activeVenueId) headers["X-Venue-Id"] = String(context.activeVenueId);
    return headers;
  }

  function appPath() {
    return !/^\/(login|register|forgot-password|join|setup|venues\/new)(\/|$)/.test(window.location.pathname);
  }

  function closeSheet() {
    var sheet = document.querySelector("[data-bd-venue-sheet]");
    if (sheet) sheet.remove();
    document.body.classList.remove("bd-venue-sheet-open");
  }

  function showMessage(title, description, variant) {
    var previous = document.querySelector("[data-bd-venue-message]");
    if (previous) previous.remove();
    var message = document.createElement("div");
    message.className = "bd-venue-message " + (variant || "success");
    message.setAttribute("data-bd-venue-message", "");
    message.setAttribute("role", variant === "error" ? "alert" : "status");
    message.innerHTML = "<strong></strong><span></span>";
    message.querySelector("strong").textContent = title;
    message.querySelector("span").textContent = description;
    document.body.appendChild(message);
    window.setTimeout(function () { if (message.isConnected) message.remove(); }, 7000);
  }

  async function switchVenue(venue) {
    if (switching || !venue || Number(venue.id) === Number(currentVenueId())) return false;
    var headers = sessionHeaders();
    if (!headers) {
      window.location.replace("/login");
      return false;
    }
    switching = true;
    var previousVenueId = currentVenueId();
    var switchEpoch = bumpContextEpoch();
    document.body.classList.add("bd-venue-switching");
    window.dispatchEvent(new CustomEvent("bd:venue-will-change", {
      detail: { fromVenueId: previousVenueId, toVenueId: Number(venue.id), epoch: switchEpoch }
    }));
    try {
      var response = await fetch("/api/access/active-venue", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ venueId: Number(venue.id) }),
        cache: "no-store"
      });
      var result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Доступ к заведению недоступен");
      context.activeVenueId = Number(result.activeVenueId);
      context.activeWorkspaceId = result.activeWorkspaceId || null;
      context.venues = context.venues.map(function (item) {
        return Number(item.id) === Number(result.activeVenueId)
          ? {
              ...item,
              name: result.venueName || item.name,
              logoId: Object.prototype.hasOwnProperty.call(result, "logoId") ? result.logoId : item.logoId
            }
          : item;
      });
      localStorage.setItem("bd_active_venue_is_primary", result.activeVenueIsPrimary ? "1" : "0");
      localStorage.setItem("bd_active_role", result.role || venue.role || "shift_manager");
      localStorage.setItem("bd_active_permissions", JSON.stringify(result.permissions || venue.permissions || []));
      saveContext();
      // Commit the active venue last. Other tabs only react after the complete
      // role, permission and venue context has already been persisted.
      localStorage.setItem("bd_active_venue_id", String(result.activeVenueId));
      window.dispatchEvent(new CustomEvent("bd:venue-changed", {
        detail: { fromVenueId: previousVenueId, toVenueId: Number(result.activeVenueId), epoch: switchEpoch }
      }));
      window.location.replace(safeTargetForVenue(result.activeVenueId));
      return true;
    } catch (error) {
      switching = false;
      bumpContextEpoch();
      document.body.classList.remove("bd-venue-switching");
      showMessage("Не удалось переключить заведение", error instanceof Error ? error.message : "Повторите попытку", "error");
      return false;
    }
  }

  function openSheet() {
    closeSheet();
    var active = activeVenue();
    var root = document.createElement("div");
    root.className = "bd-venue-sheet";
    root.setAttribute("data-bd-venue-sheet", "");
    root.innerHTML = [
      '<button class="bd-venue-sheet-backdrop" type="button" aria-label="Закрыть"></button>',
      '<section class="bd-venue-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="bd-venue-sheet-title">',
        '<div class="bd-venue-sheet-handle"></div>',
        '<header><div><small>РАБОЧИЙ КОНТЕКСТ</small><h2 id="bd-venue-sheet-title">Заведения</h2></div><button type="button" data-close aria-label="Закрыть">×</button></header>',
        '<p class="bd-venue-sheet-help">После переключения все данные и инструменты откроются для выбранного заведения.</p>',
        '<div class="bd-venue-list"></div>',
        (context.canCreateVenues ? '<a class="bd-add-venue" href="/venues/new"><b>＋</b><span><strong>Добавить заведение</strong><small>Создать новую пустую точку</small></span><i>→</i></a>' : ''),
      '</section>'
    ].join("");
    var list = root.querySelector(".bd-venue-list");
    context.venues.forEach(function (venue) {
      var selected = active && Number(active.id) === Number(venue.id);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bd-venue-row" + (selected ? " active" : "");
      button.disabled = selected;
      if (selected) button.setAttribute("aria-current", "true");
      button.innerHTML = '<span class="bd-venue-monogram"></span><span class="bd-venue-row-copy"><strong></strong><small></small></span><b></b>';
      renderVenueAvatar(button.querySelector(".bd-venue-monogram"), venue);
      button.querySelector(".bd-venue-row-copy strong").textContent = venue.name || "Новое заведение";
      button.querySelector(".bd-venue-row-copy small").textContent = roleLabel(venue.role);
      button.querySelector(":scope>b").textContent = selected ? "Текущее" : "Перейти";
      button.addEventListener("click", function () { switchVenue(venue); });
      list.appendChild(button);
    });
    root.querySelector(".bd-venue-sheet-backdrop").addEventListener("click", closeSheet);
    root.querySelector("[data-close]").addEventListener("click", closeSheet);
    var addVenue = root.querySelector(".bd-add-venue");
    if (addVenue) addVenue.addEventListener("click", function (event) {
      if (typeof window.bdNavigate !== "function") return;
      event.preventDefault();
      closeSheet();
      window.bdNavigate("/venues/new");
    });
    document.body.appendChild(root);
    document.body.classList.add("bd-venue-sheet-open");
    var close = root.querySelector("[data-close]");
    if (close) close.focus();
  }

  function injectTrigger() {
    var existing = document.querySelector("[data-bd-venue-trigger]");
    var inlineHost = document.querySelector("[data-bd-canonical-venue-host]") || document.querySelector("[data-bd-venue-host]");
    var pathOwnsVenueHeader = ["/data-control", "/team-access"].includes(window.location.pathname);
    if (pathOwnsVenueHeader && !inlineHost) {
      if (existing) existing.remove();
      return;
    }
    var profileHost = inlineHost && inlineHost.hasAttribute("data-bd-canonical-venue-host");
    if (!appPath() || (context.venues.length < 2 && !profileHost)) {
      if (existing) existing.remove();
      return;
    }
    var venue = activeVenue();
    if (!venue) return;
    if (!existing) {
      existing = document.createElement("button");
      existing.type = "button";
      existing.className = "bd-venue-trigger";
      existing.setAttribute("data-bd-venue-trigger", "");
      existing.setAttribute("aria-label", "Переключить заведение");
      existing.innerHTML = '<span class="bd-venue-trigger-avatar" aria-hidden="true"></span><span class="bd-venue-trigger-copy"><small>ЗАВЕДЕНИЕ</small><strong></strong></span><b>⌄</b>';
      existing.addEventListener("click", openSheet);
    }
    if (inlineHost) {
      existing.classList.add("bd-venue-trigger-inline");
      if (existing.parentElement !== inlineHost) inlineHost.appendChild(existing);
    } else {
      existing.classList.remove("bd-venue-trigger-inline");
      if (existing.parentElement !== document.body) document.body.appendChild(existing);
    }
    var label = venue.name || "Новое заведение";
    renderVenueAvatar(existing.querySelector(".bd-venue-trigger-avatar"), venue);
    var labelNode = existing.querySelector("strong");
    if (labelNode && labelNode.textContent !== label) labelNode.textContent = label;
  }

  function findMoreManagementCard(main) {
    var headings = Array.from(main.querySelectorAll("p"));
    var heading = headings.find(function (node) {
      return (node.textContent || "").trim().toLocaleLowerCase("ru") === "управление";
    });
    if (!heading || !heading.parentElement) return null;
    return Array.from(heading.parentElement.children).find(function (node) {
      return node !== heading && node.querySelector && node.querySelector("button");
    }) || null;
  }

  function injectMoreEntry() {
    var existing = document.querySelector("[data-bd-venues-entry]");
    if (document.querySelector('[data-bd-more-hub="v166"]')) {
      if (existing) existing.remove();
      return;
    }
    if (window.location.pathname !== "/more" || (!context.canCreateVenues && context.venues.length < 2)) {
      if (existing) existing.remove();
      return;
    }
    var main = document.querySelector("main");
    if (!main) return;
    var managementCard = findMoreManagementCard(main);
    if (!managementCard) return;
    if (!existing) {
      existing = document.createElement("button");
      existing.type = "button";
      existing.className = "bd-venues-entry bd-more-system-row";
      existing.setAttribute("data-bd-venues-entry", "");
      existing.innerHTML = '<span class="bd-more-system-icon" aria-hidden="true">▦</span><strong class="bd-more-system-label"></strong><span class="bd-more-system-chevron" aria-hidden="true">›</span>';
      existing.addEventListener("click", function () {
        loadContext();
        if (context.venues.length > 1) openSheet();
        else if (typeof window.bdNavigate === "function") window.bdNavigate("/venues/new");
        else window.location.href = "/venues/new";
      });
    }
    existing.querySelector(".bd-more-system-label").textContent = context.venues.length > 1
      ? "Мои заведения"
      : "Добавить заведение";
    existing.setAttribute("aria-label", context.venues.length > 1
      ? "Открыть список заведений"
      : "Добавить заведение");
    if (existing.parentElement !== managementCard) managementCard.appendChild(existing);
  }

  function preserveVenueInHistory() {
    if (window.history.__bdVenueAware) return;
    var push = window.history.pushState.bind(window.history);
    var replace = window.history.replaceState.bind(window.history);
    function scoped(method, state, title, value) {
      if (value != null && appPath() && context.activeVenueId) {
        try {
          var url = new URL(String(value), window.location.href);
          if (url.origin === window.location.origin && !/^\/(login|register|setup|venues\/new)(\/|$)/.test(url.pathname)) {
            url.searchParams.set("venue", String(context.activeVenueId));
            value = url.pathname + url.search + url.hash;
          }
        } catch { /* preserve unusual history values */ }
      }
      return method(state, title, value);
    }
    window.history.pushState = function (state, title, value) { return scoped(push, state, title, value); };
    window.history.replaceState = function (state, title, value) { return scoped(replace, state, title, value); };
    window.history.__bdVenueAware = true;
  }

  function syncVenueFromLocation() {
    loadContext();
    var venueFromUrl = Number(new URLSearchParams(window.location.search).get("venue"));
    if (Number.isInteger(venueFromUrl) && venueFromUrl > 0 && venueFromUrl !== Number(context.activeVenueId)) {
      var target = context.venues.find(function (venue) { return Number(venue.id) === venueFromUrl; });
      if (target) {
        switchVenue(target);
        return;
      }
    }
    if (context.activeVenueId && venueFromUrl !== Number(context.activeVenueId)) {
      var normalized = new URL(window.location.href);
      normalized.searchParams.set("venue", String(context.activeVenueId));
      window.history.replaceState(null, "", normalized.pathname + normalized.search + normalized.hash);
    }
    scheduleRender();
  }

  function syncVenueAcrossTabs(event) {
    if (!event || event.key !== "bd_active_venue_id" || !event.newValue || switching) return;
    var nextVenueId = Number(event.newValue);
    if (!Number.isInteger(nextVenueId) || nextVenueId <= 0) return;
    bumpContextEpoch();
    window.location.replace(safeTargetForVenue(nextVenueId));
  }

  function render() {
    loadContext();
    injectTrigger();
    injectMoreEntry();
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = window.requestAnimationFrame(function () {
      renderFrame = 0;
      render();
    });
  }

  window.addEventListener("bd:venue-context", function (event) {
    if (event.detail && Array.isArray(event.detail.venues)) {
      context = event.detail;
      saveContext();
      render();
    }
  });
  window.addEventListener("bd:venue-context-updated", function () {
    loadContext();
    render();
  });
  window.addEventListener("popstate", syncVenueFromLocation);
  window.addEventListener("storage", syncVenueAcrossTabs);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeSheet();
  });
  loadContext();
  installResponseGuard();
  preserveVenueInHistory();
  if (window.__bdBootstrapPending) {
    window.addEventListener("bd:bootstrap-complete", syncVenueFromLocation, { once: true });
  } else {
    syncVenueFromLocation();
  }
  observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  var newVenueNotice = sessionStorage.getItem("bd_new_venue_notice");
  if (newVenueNotice) {
    sessionStorage.removeItem("bd_new_venue_notice");
    window.setTimeout(function () {
      showMessage("Новое заведение готово", newVenueNotice, "success");
    }, 900);
  }

  window.bdVenueSwitcher = Object.freeze({
    open: openSheet,
    close: closeSheet,
    switchVenue: switchVenue,
    currentVenueId: currentVenueId,
    safeTargetForVenue: safeTargetForVenue
  });
})();
