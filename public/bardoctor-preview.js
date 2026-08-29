(async function () {
  "use strict";

  window.__bdBootstrapPending = true;
  window.__bdAuthBootstrapV274 = { state: "loading", reason: "auth_bootstrap_pending" };

  var currentFirstName = localStorage.getItem("bd_user_first_name") || "";
  var currentRole = localStorage.getItem("bd_active_role") || "";
  var currentPermissions = (function () {
    try {
      var value = JSON.parse(localStorage.getItem("bd_active_permissions") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  })();
  var registrationMode = "owner";
  var registrationInviteCode = "";

  function serverStoreCacheKey(storeKey) {
    var email = localStorage.getItem("bd_session");
    var venue = localStorage.getItem("bd_active_venue_id");
    if (!email) return storeKey + "_cache";
    return storeKey + "_cache__" + email + (venue ? "__venue_" + venue : "");
  }

  function cacheServerStore(storeKey, value) {
    try { localStorage.setItem(serverStoreCacheKey(storeKey), JSON.stringify(value)); } catch { /* no-op */ }
  }

  async function refreshServerInventoryCacheV235() {
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    if (!email || !token) return;
    try {
      var response = await fetch("/api/store/bd_assortment_v1", {
        method: "GET",
        headers: {
          "X-Session-Email": email,
          "X-Session-Token": token
        },
        cache: "no-store"
      });
      if (!response.ok) return;
      var result = await response.json();
      var assortment = result && result.ok && result.data;
      if (!assortment || typeof assortment !== "object" || Array.isArray(assortment)) return;
      if (!assortment.inventoryQuantityRepairedAt) return;
      cacheServerStore("bd_assortment_v1", assortment);
      window.dispatchEvent(new CustomEvent("bd:store-updated", {
        detail: { storeKey: "bd_assortment_v1", source: "server-repair-v235" }
      }));
    } catch {
      // Cloud sync will retry through its normal path.
    }
  }

  function observePurchaseConfirmation() {
    if (window.fetch.__bdPurchaseInventoryObserver) return;
    var originalFetch = window.fetch.bind(window);
    var observedFetch = async function () {
      var response = await originalFetch.apply(null, arguments);
      try {
        var target = typeof arguments[0] === "string"
          ? arguments[0]
          : arguments[0] && arguments[0].url;
        var pathname = new URL(target, window.location.href).pathname;
        if (pathname === "/api/purchases/confirm" && response.ok) {
          response.clone().json().then(function (result) {
            if (!result || !result.ok) return;
            if (result.assortment) cacheServerStore("bd_assortment_v1", result.assortment);
            if (Array.isArray(result.stockMovements)) {
              cacheServerStore("bd_stock_movements", result.stockMovements);
            }
          }).catch(function () {});
        }
      } catch {
        // The original response remains untouched.
      }
      return response;
    };
    observedFetch.__bdPurchaseInventoryObserver = true;
    window.fetch = observedFetch;
  }

  function protectedOriginalUrl(anchor) {
    if (!anchor || !anchor.href) return null;
    try {
      var url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      if (!/^\/api\/(purchases|catalog|sales)\/files\/[a-zA-Z0-9-]{20,80}$/.test(url.pathname)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  function showProtectedOriginalMessage(title, description, variant) {
    var previous = document.querySelector("[data-bd-protected-original-message]");
    if (previous) previous.remove();
    var message = document.createElement("div");
    message.setAttribute("data-bd-protected-original-message", "v78");
    message.setAttribute("role", variant === "error" ? "alert" : "status");
    message.setAttribute("aria-live", variant === "error" ? "assertive" : "polite");
    message.style.cssText = [
      "position:fixed",
      "left:16px",
      "right:16px",
      "bottom:calc(94px + env(safe-area-inset-bottom))",
      "z-index:120",
      "max-width:430px",
      "margin:0 auto",
      "padding:14px 46px 14px 16px",
      "border:1px solid " + (variant === "error" ? "#fecaca" : "#bbf7d0"),
      "border-radius:16px",
      "background:" + (variant === "error" ? "#fff7f7" : "#f0fdf4"),
      "box-shadow:0 16px 45px rgba(15,23,42,.18)",
      "color:#111827",
      "font-family:Inter,system-ui,sans-serif"
    ].join(";");

    var heading = document.createElement("strong");
    heading.style.cssText = "display:block;font-size:14px;line-height:1.25;font-weight:850";
    heading.textContent = title;
    var copy = document.createElement("span");
    copy.style.cssText = "display:block;margin-top:4px;font-size:12.5px;line-height:1.4;color:#667085";
    copy.textContent = description;
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Закрыть сообщение");
    close.textContent = "×";
    close.style.cssText = "position:absolute;top:8px;right:10px;width:32px;height:32px;border:0;background:transparent;color:#667085;font-size:24px;line-height:1;cursor:pointer";
    close.addEventListener("click", function () { message.remove(); });
    message.appendChild(heading);
    message.appendChild(copy);
    message.appendChild(close);
    document.body.appendChild(message);
    window.setTimeout(function () { if (message.isConnected) message.remove(); }, 8000);
  }

  function protectedOriginalEscapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderProtectedOriginalPopup(popup, title, description, isError) {
    if (!popup || popup.closed) return;
    try {
      popup.document.open();
      popup.document.write([
        '<!doctype html><html lang="ru"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<title>' + protectedOriginalEscapeHtml(title) + '</title></head>',
        '<body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f4f6fb;color:#111827;font-family:Inter,system-ui,sans-serif">',
        '<main style="width:min(100%,430px);padding:24px;box-sizing:border-box;border:1px solid ' + (isError ? '#fecaca' : '#e5e7eb') + ';border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12)">',
        '<strong style="display:block;font-size:22px;line-height:1.2">' + protectedOriginalEscapeHtml(title) + '</strong>',
        '<p style="margin:10px 0 0;color:#667085;font-size:15px;line-height:1.5">' + protectedOriginalEscapeHtml(description) + '</p>',
        '</main></body></html>'
      ].join(""));
      popup.document.close();
    } catch {
      // Some embedded browsers do not expose the temporary tab document.
    }
  }

  function protectedOriginalError(response, detail) {
    if (response.status === 401) {
      return "Сессия истекла. Вернитесь в BarDoctor, войдите снова и повторите попытку.";
    }
    if (response.status === 403) return "У вашей роли нет доступа к закупочным документам.";
    if (response.status === 404) return "Оригинал не найден в хранилище. Данные накладной сохранены, но исходный файл недоступен.";
    if (detail) return detail;
    return "Не удалось получить файл. Проверьте соединение и повторите попытку.";
  }

  function protectedOriginalFileName(response) {
    var disposition = response.headers.get("Content-Disposition") || "";
    var match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (!match) return "original-document";
    try { return decodeURIComponent(match[1]); } catch { return "original-document"; }
  }

  async function openProtectedOriginal(event, anchor, targetUrl) {
    event.preventDefault();
    event.stopPropagation();
    var popup = window.open("about:blank", "_blank");
    renderProtectedOriginalPopup(
      popup,
      "Открываем оригинал",
      "BarDoctor безопасно загружает файл документа.",
      false
    );
    var originalText = anchor.textContent;
    anchor.setAttribute("aria-busy", "true");
    anchor.textContent = "Открываю оригинал…";

    try {
      var response = await fetch(targetUrl.pathname + targetUrl.search, {
        method: "GET",
        headers: { "Accept": "application/pdf,image/*,text/plain,application/octet-stream" },
        cache: "no-store"
      });
      if (!response.ok) {
        var detail = "";
        try {
          var contentType = response.headers.get("Content-Type") || "";
          if (contentType.indexOf("application/json") >= 0) {
            var payload = await response.json();
            detail = payload && typeof payload.error === "string" ? payload.error : "";
          }
        } catch {
          detail = "";
        }
        throw new Error(protectedOriginalError(response, detail));
      }

      var blob = await response.blob();
      if (!blob.size) throw new Error("Оригинал документа пуст и не может быть открыт.");
      var objectUrl = URL.createObjectURL(blob);
      var fileName = protectedOriginalFileName(response);
      var canPreview = /^image\//i.test(blob.type)
        || blob.type === "application/pdf"
        || /^text\//i.test(blob.type);

      if (canPreview) {
        if (popup && !popup.closed) {
          try { popup.opener = null; } catch { /* no-op */ }
          popup.location.replace(objectUrl);
        } else {
          window.location.assign(objectUrl);
        }
      } else {
        if (popup && !popup.closed) popup.close();
        var download = document.createElement("a");
        download.href = objectUrl;
        download.download = fileName;
        download.style.display = "none";
        document.body.appendChild(download);
        download.click();
        download.remove();
        showProtectedOriginalMessage("Файл подготовлен", "Оригинал сохранён в загрузки устройства.", "success");
      }
      window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
    } catch (error) {
      var message = error instanceof Error
        ? error.message
        : "Не удалось получить оригинал документа.";
      renderProtectedOriginalPopup(popup, "Оригинал недоступен", message, true);
      showProtectedOriginalMessage("Оригинал недоступен", message, "error");
    } finally {
      anchor.removeAttribute("aria-busy");
      anchor.textContent = originalText;
    }
  }

  function installProtectedOriginalLinks() {
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      var target = event.target;
      var anchor = target && target.closest ? target.closest("a[href]") : null;
      var targetUrl = protectedOriginalUrl(anchor);
      if (!targetUrl) return;
      openProtectedOriginal(event, anchor, targetUrl);
    }, true);
  }

  function cleanFirstName(value) {
    return typeof value === "string" ? value.trim().slice(0, 48) : "";
  }

  function normalizeApplicationHref(value) {
    try {
      var url = new URL(String(value), window.location.href);
      if (url.origin === window.location.origin && url.pathname === "/decisions") {
        url.pathname = "/analysis";
        return url.pathname + url.search + url.hash;
      }
    } catch {
      // Preserve unusual history values.
    }
    return value;
  }

  function navigateInApplication(event, href) {
    if (event) event.preventDefault();
    window.history.pushState(null, "", normalizeApplicationHref(href));
  }

  function greetingForCurrentTime() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "☀️ Доброе утро";
    if (hour >= 12 && hour < 17) return "👋 Добрый день";
    if (hour >= 17 && hour < 22) return "🌆 Добрый вечер";
    return "🌙 Доброй ночи";
  }

  function updateHomeGreeting() {
    if (window.location.pathname !== "/home") return;
    var headings = document.querySelectorAll("main h1");
    for (var index = 0; index < headings.length; index += 1) {
      var heading = headings[index];
      if (!/Доброе утро|Добрый день|Добрый вечер|Доброй ночи/.test(heading.textContent || "")) continue;
      var name = cleanFirstName(currentFirstName);
      var desired = greetingForCurrentTime() + (name ? ", " + name : "") + ".";
      if (heading.textContent !== desired) heading.textContent = desired;

      var venueButton = heading.nextElementSibling;
      if (venueButton && venueButton.tagName === "BUTTON") {
        var venueName = (venueButton.textContent || "").replace(/^Заведение:\s*/i, "").trim();
        if (venueName && venueButton.textContent !== "Заведение: " + venueName) {
          venueButton.textContent = "Заведение: " + venueName;
        }
      }
      break;
    }
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

  function injectDataControlEntry() {
    var existing = document.querySelector("[data-bd-data-control-entry]");
    if (document.querySelector('[data-bd-more-hub="v166"]')) {
      if (existing) existing.remove();
      return;
    }
    if (window.location.pathname !== "/more") {
      if (existing) existing.remove();
      return;
    }
    var main = document.querySelector("main");
    if (!main) return;

    var managementCard = findMoreManagementCard(main);
    if (!managementCard) return;
    if (existing) {
      if (existing.parentElement !== managementCard) managementCard.appendChild(existing);
      return;
    }

    var entry = document.createElement("button");
    entry.type = "button";
    entry.className = "bd-data-control-entry bd-more-system-row";
    entry.setAttribute("data-bd-data-control-entry", "");
    entry.setAttribute("aria-label", "Открыть контроль данных");

    var icon = document.createElement("span");
    icon.className = "bd-more-system-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "i";

    var title = document.createElement("strong");
    title.className = "bd-more-system-label";
    title.textContent = "Контроль данных";

    var arrow = document.createElement("span");
    arrow.className = "bd-more-system-chevron";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    entry.appendChild(icon);
    entry.appendChild(title);
    entry.appendChild(arrow);
    entry.addEventListener("click", function (event) {
      navigateInApplication(event, "/data-control");
    });
    managementCard.appendChild(entry);
  }

  function injectTeamAccessEntry() {
    var existing = document.querySelector("[data-bd-team-access-entry]");
    if (window.location.pathname !== "/employees" || !hasClientPermission("access.manage")) {
      if (existing) existing.remove();
      return;
    }
    var tabs = document.querySelector(".bd-team-tabs-v163");
    if (!tabs || existing) return;
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.setAttribute("data-bd-team-access-entry", "v171");
    button.textContent = "Роли и доступ";
    button.addEventListener("click", function (event) {
      navigateInApplication(event, "/team-access");
    });
    tabs.appendChild(button);
  }

  function injectWarehouseSalesEntry() {
    var entries = Array.from(document.querySelectorAll("[data-bd-warehouse-sales-entry]"));
    if (window.location.pathname !== "/warehouse") {
      entries.forEach(function (entry) { entry.remove(); });
      return;
    }
    if (document.querySelector('[data-bd-warehouse-version="compact-tree-v240"]')) {
      entries.forEach(function (entry) {
        if (entry.getAttribute("data-bd-warehouse-sales-entry") === "legacy") entry.remove();
      });
      return;
    }
    var nativeEntry = document.querySelector('[data-bd-warehouse-sales-entry="native-v79"]');
    if (nativeEntry) {
      entries.forEach(function (entry) { if (entry !== nativeEntry) entry.remove(); });
      return;
    }
    var existing = entries[0];
    if (existing || !hasClientPermission("inventory.manage") || !hasClientPermission("shifts.manage")) return;
    var main = document.querySelector("main");
    if (!main) return;

    var entry = document.createElement("section");
    entry.className = "bd-warehouse-sales-entry";
    entry.setAttribute("data-bd-warehouse-sales-entry", "legacy");
    entry.innerHTML = [
      '<span class="bd-warehouse-sales-icon" aria-hidden="true">↘</span>',
      '<span class="bd-warehouse-sales-copy"><small>РАСХОД ПО ТЕХКАРТАМ</small><strong>Импортировать продажи</strong>',
      '<span>Загрузите отчёт кассы: BarDoctor сопоставит позиции меню и спишет ингредиенты.</span></span>',
      '<a href="/sales-import">Открыть <b aria-hidden="true">→</b></a>',
    ].join("");
    var heading = main.querySelector(":scope > header");
    var reference = heading ? heading.nextSibling : main.firstChild;
    if (reference && reference.parentNode === main) main.insertBefore(entry, reference);
    else main.appendChild(entry);
  }

  function enhancePurchaseLanguage() {
    if (window.location.pathname !== "/suppliers") return;
    document.querySelectorAll("p").forEach(function (paragraph) {
      var copy = (paragraph.textContent || "").trim();
      if (copy === "Перед сохранением вы проверите магазин, товары, цены, категорию и итог. После подтверждения закупка попадёт в расходы и историю цен.") {
        paragraph.textContent = "Перед сохранением проверьте товары, фасовку и цены. После проведения BarDoctor поставит позиции на приход. Оплату поставщику добавьте отдельной связанной операцией.";
      }
      if (copy === "Расход и история цен созданы один раз из этого документа.") {
        paragraph.textContent = "Складской приход создан из этой накладной. Оплаты ведутся отдельно и не дублируют закупку.";
      }
    });
    document.querySelectorAll("button").forEach(function (button) {
      if ((button.textContent || "").trim() === "Учесть закупку") {
        button.textContent = "Оприходовать закупку";
      }
    });
  }

  function injectCompetitorsEntryV329() {
    var existing = document.querySelector("[data-bd-competitors-entry]");
    if (window.location.pathname !== "/home") { if (existing) existing.remove(); return; }
    if (existing) return;
    var aiCard = document.querySelector("[data-bd-home-ai]");
    var shared = window.bdCompetitorMarketClientV329;
    if (!aiCard || !aiCard.parentNode || !shared) return;
    var entry = document.createElement("section");
    entry.className = "bd-competitors-entry";
    entry.setAttribute("data-bd-competitors-entry", "canonical-v329");
    entry.innerHTML = [
      '<div class="bd-competitors-entry-head"><span class="bd-competitors-entry-icon" aria-hidden="true">◎</span><span class="bd-competitors-entry-title"><small>КОНКУРЕНТЫ</small><strong>Локальный рынок</strong></span></div>',
      '<p class="bd-competitors-entry-status" data-bd-competitors-status><i aria-hidden="true"></i><span>Загружаю сохранённые данные…</span></p>',
      '<div class="bd-competitors-entry-stats"><span><strong data-bd-competitors-confirmed>—</strong><small>подтверждено</small></span><span class="attention"><strong data-bd-competitors-changes>—</strong><small>изменения требуют внимания</small></span></div>',
      '<div class="bd-competitors-entry-latest"><small>Последнее изменение</small><strong data-bd-competitors-latest>—</strong><time data-bd-competitors-updated>—</time></div>',
      '<a class="bd-competitors-entry-action" href="/market"><span>Открыть конкурентов</span><b aria-hidden="true">→</b></a>',
    ].join("");
    aiCard.parentNode.insertBefore(entry, aiCard);
    var link = entry.querySelector("a");
    link.addEventListener("click", function (event) { navigateInApplication(event, link.getAttribute("href")); });

    function formatUpdated(value) {
      var date = new Date(value || "");
      return Number.isFinite(date.getTime()) ? "обновлено " + date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "дата не указана";
    }
    function render(result, offline) {
      if (!result || !result.analysis) return false;
      var summary = shared.summary(result.analysis);
      var latest = summary.latestChange;
      entry.querySelector("[data-bd-competitors-confirmed]").textContent = String(summary.confirmedCount);
      entry.querySelector("[data-bd-competitors-changes]").textContent = String(summary.attentionCount);
      entry.querySelector("[data-bd-competitors-latest]").textContent = latest ? (latest.competitorName ? latest.competitorName + ": " : "") + (latest.summary || latest.title || "Найдены новые данные") : "Новых изменений нет";
      entry.querySelector("[data-bd-competitors-updated]").textContent = formatUpdated(result.analysis.generatedAt);
      var status = entry.querySelector("[data-bd-competitors-status]");
      status.classList.toggle("warning", Boolean(offline));
      status.querySelector("span").textContent = offline ? "Нет связи · показаны последние сохранённые данные" : "Данные сохранены";
      shared.writeSnapshot(result);
      return true;
    }
    function refreshInBackground(result) {
      var lease = shared.acquireRefreshLease();
      if (!lease) return;
      fetch("/api/market", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ automatic: true, knownGeneratedAt: result.analysis && result.analysis.generatedAt }) })
        .then(function (response) { return response.json(); })
        .then(function (fresh) { if (fresh && fresh.ok !== false && (fresh.analysis || fresh.data)) render({ ok: true, restaurant: fresh.restaurant || result.restaurant, analysis: fresh.analysis || fresh.data, stale: false }, false); })
        .catch(function () {})
        .finally(function () { shared.releaseRefreshLease(lease); });
    }
    var cached = shared.readSnapshot();
    if (cached) render(cached, false);
    fetch("/api/market")
      .then(function (response) { return response.json(); })
      .then(function (result) {
        if (!result || result.ok === false) throw new Error("market unavailable");
        if (!render(result, false) && !cached) {
          entry.querySelector("[data-bd-competitors-status] span").textContent = "Анализ рынка ещё не выполнен";
          entry.querySelector("[data-bd-competitors-confirmed]").textContent = "0";
          entry.querySelector("[data-bd-competitors-changes]").textContent = "0";
        }
        if (result.analysis && result.stale) refreshInBackground(result);
      })
      .catch(function () {
        if (cached) render(cached, true);
        else entry.querySelector("[data-bd-competitors-status] span").textContent = "Не удалось загрузить сохранённые данные";
      });
  }

  function injectCompetitorsEntry() {
    injectCompetitorsEntryV329();
  }
  function injectOpportunityEntry() {
    var existing = document.querySelector("[data-bd-opportunity-entry]");
    if (window.location.pathname !== "/home") {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    var aiCard = document.querySelector("[data-bd-home-ai]");
    if (!aiCard || !aiCard.parentNode) return;
    var competitorEntry = document.querySelector("[data-bd-competitors-entry]");

    var entry = document.createElement("section");
    entry.className = "bd-opportunity-entry";
    entry.setAttribute("data-bd-opportunity-entry", "");
    entry.innerHTML = [
      '<div class="bd-opportunity-entry-head">',
        '<span class="bd-opportunity-entry-title"><small>ПОВОДЫ ДЛЯ РОСТА</small><strong>Календарь возможностей</strong></span>',
      '</div>',
      '<p class="bd-opportunity-entry-status" data-bd-opportunity-status><i aria-hidden="true"></i><span>Загружаю сохранённые данные…</span></p>',
      '<div class="bd-opportunity-entry-main">',
        '<time class="bd-opportunity-entry-date" data-bd-opportunity-date><span>—</span><strong>—</strong></time>',
        '<span class="bd-opportunity-entry-next"><small>БЛИЖАЙШЕЕ СОБЫТИЕ</small><strong data-bd-opportunity-next>—</strong><em data-bd-opportunity-reason>—</em></span>',
        '<span class="bd-opportunity-entry-score"><strong data-bd-opportunity-score>—</strong><small>/100</small><i data-bd-opportunity-segments></i></span>',
      '</div>',
      '<div class="bd-opportunity-entry-meta"><span data-bd-opportunity-important>— важных событий</span><span>автообновление 7 дней</span></div>',
      '<a class="bd-opportunity-entry-action" href="/opportunities"><span>Открыть календарь</span><b aria-hidden="true">→</b></a>',
    ].join("");

    aiCard.parentNode.insertBefore(entry, competitorEntry || aiCard);
    var actionLink = entry.querySelector(".bd-opportunity-entry-action");
    if (actionLink) {
      actionLink.addEventListener("click", function (event) {
        navigateInApplication(event, actionLink.getAttribute("href"));
      });
    }
    var shared = window.bdOpportunityCalendarClientV327;
    function opportunityHeaders(extra) {
      var headers = new Headers(extra || {});
      var email = localStorage.getItem("bd_session");
      var token = localStorage.getItem("bd_session_token");
      var venueId = localStorage.getItem("bd_active_venue_id");
      if (email && token) {
        headers.set("X-Session-Email", email);
        headers.set("X-Session-Token", token);
        if (venueId) headers.set("X-Venue-Id", venueId);
      }
      return headers;
    }
    function datePart(value, options) {
      var parsed = new Date(String(value || "").slice(0, 10) + "T12:00:00Z");
      return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("ru-RU", Object.assign({ timeZone: "UTC" }, options));
    }
    function updatedCopy(value) {
      var parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "давно";
      var sameDay = parsed.toLocaleDateString("ru-RU") === new Date().toLocaleDateString("ru-RU");
      return (sameDay ? "сегодня в " : parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " в ")
        + parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    function renderOpportunity(result, mode) {
      var calendar = result && result.calendar;
      var summary = shared && calendar ? shared.summary(calendar) : { nearest: null, highCount: 0 };
      var nearest = summary.nearest;
      var status = entry.querySelector("[data-bd-opportunity-status]");
      status.className = "bd-opportunity-entry-status" + (mode === "offline" || mode === "failed" ? " is-warning" : "");
      status.querySelector("span").textContent = mode === "offline"
        ? "Нет связи · показаны последние сохранённые данные"
        : mode === "failed"
          ? "Не удалось актуализировать · показаны сохранённые данные"
          : calendar ? "Данные сохранены · обновлено " + updatedCopy(calendar.generatedAt) : "Сохранённых данных пока нет";
      var dateNode = entry.querySelector("[data-bd-opportunity-date]");
      dateNode.querySelector("span").textContent = nearest ? datePart(nearest.startDate, { month: "short" }).replace(".", "") : "—";
      dateNode.querySelector("strong").textContent = nearest ? datePart(nearest.startDate, { day: "2-digit" }) : "—";
      entry.querySelector("[data-bd-opportunity-next]").textContent = nearest ? nearest.title : "Событий пока нет";
      entry.querySelector("[data-bd-opportunity-reason]").textContent = nearest ? (nearest.summary || nearest.scoreReason || "") : "Календарь появится после первого сохранения";
      entry.querySelector("[data-bd-opportunity-score]").textContent = nearest ? String(nearest.potentialScore) : "—";
      var segments = entry.querySelector("[data-bd-opportunity-segments]");
      segments.textContent = "";
      for (var index = 0; index < 5; index += 1) {
        var segment = document.createElement("b");
        if (nearest && Number(nearest.potentialScore || 0) >= (index + 1) * 20 - 10) segment.className = "active";
        segments.appendChild(segment);
      }
      entry.querySelector("[data-bd-opportunity-important]").textContent = String(summary.highCount || 0) + " важных событий";
    }
    function backgroundRefresh(result) {
      if (!result.stale || !shared) return;
      var lease = shared.acquireRefreshLease();
      if (!lease) return;
      fetch("/api/opportunities", {
        method: "POST",
        headers: opportunityHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "refresh",
          automatic: true,
          knownGeneratedAt: result.calendar && result.calendar.generatedAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Chisinau"
        })
      }).then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok || body.ok === false) throw new Error(body.error || "refresh failed");
          return body;
        });
      }).then(function (refreshResult) {
        var next = Object.assign({}, result, refreshResult, { restaurant: result.restaurant });
        shared.writeSnapshot(next);
        renderOpportunity(next, "saved");
      }).catch(function () {
        renderOpportunity(result, "failed");
      }).finally(function () {
        shared.releaseRefreshLease(lease);
      });
    }
    var cached = shared && shared.readSnapshot();
    if (cached && cached.calendar) renderOpportunity(cached, "saved");
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15_000);
    fetch("/api/opportunities", { headers: opportunityHeaders(), cache: "no-store", signal: controller.signal })
      .then(function (response) { return response.json().then(function (body) { if (!response.ok || body.ok === false) throw new Error("calendar unavailable"); return body; }); })
      .then(function (result) {
        if (shared) shared.writeSnapshot(result);
        renderOpportunity(result, "saved");
        backgroundRefresh(result);
      })
      .catch(function () {
        if (cached && cached.calendar) renderOpportunity(cached, "offline");
        elseesult, "activeVenueId") && result.activeVenueId) {
      localStorage.setItem("bd_active_venue_id", String(result.activeVenueId));
      if (typeof bdEnsureCurrentEntry === "function") bdEnsureCurrentEntry();
      var activeVenueMeta = Array.isArray(result.venues)
        ? result.venues.find(function (venue) { return Number(venue.id) === Number(result.activeVenueId); })
        : null;
      var activeVenueIsPrimary = typeof result.activeVenueIsPrimary === "boolean"
        ? result.activeVenueIsPrimary
        : Boolean(activeVenueMeta && activeVenueMeta.isPrimary);
      localStorage.setItem("bd_active_venue_is_primary", activeVenueIsPrimary ? "1" : "0");
      if (!/^\/(login|register|forgot-password|join|setup|venues\/new)(\/|$)/.test(window.location.pathname)) {
        var scopedUrl = new URL(window.location.href);
        if (scopedUrl.searchParams.get("venue") !== String(result.activeVenueId)) {
          scopedUrl.searchParams.set("venue", String(result.activeVenueId));
          window.history.replaceState(null, "", scopedUrl.pathname + scopedUrl.search + scopedUrl.hash);
        }
      }
    } else if (Object.prototype.hasOwnProperty.call(result, "activeVenueId")) {
      localStorage.removeItem("bd_active_venue_id");
      localStorage.removeItem("bd_active_venue_is_primary");
    }
    if (Array.isArray(result.venues)) {
      var venueContextKey = "bd_venue_context__" + (result.email || localStorage.getItem("bd_session") || "session");
      var venueContext = {
        activeVenueId: result.activeVenueId || null,
        activeWorkspaceId: result.activeWorkspaceId || null,
        canCreateVenues: Boolean(result.canCreateVenues),
        venues: result.venues
      };
      localStorage.setItem(venueContextKey, JSON.stringify(venueContext));
      window.dispatchEvent(new CustomEvent("bd:venue-context", { detail: venueContext }));
    }
  }

  function hasClientPermission(permission) {
    return currentRole === "owner" || currentPermissions.indexOf(permission) >= 0;
  }
  window.bdHasClientPermission = hasClientPermission;

  function registrationInviteFromUrl() {
    var query = new URLSearchParams(window.location.search);
    return (query.get("invite") || sessionStorage.getItem("bd_pending_invite_code") || "").trim();
  }

  function setRegistrationMode(mode, root) {
    registrationMode = mode === "join" ? "join" : "owner";
    root.querySelectorAll("[data-bd-registration-mode]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.bdRegistrationMode === registrationMode);
    });
    var field = root.querySelector("[data-bd-invite-field]");
    if (field) field.classList.toggle("hidden", registrationMode !== "join");
    var heading = document.querySelector(".bd-auth-copy h1");
    var copy = document.querySelector(".bd-auth-copy p");
    if (heading) heading.textContent = registrationMode === "join" ? "Присоединитесь к заведению" : "Создайте аккаунт владельца";
    if (copy) copy.textContent = registrationMode === "join"
      ? "Код владельца безопасно подключит ваш личный аккаунт к нужному заведению."
      : "Создайте аккаунт и добавьте своё заведение — без лишних настроек.";
  }

  function injectRegistrationAccessChoice() {
    var existing = document.querySelector("[data-bd-registration-choice]");
    if (window.location.pathname !== "/register") {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var form = document.querySelector(".bd-auth-form");
    if (!form) return;

    var root = document.createElement("section");
    root.className = "bd-registration-choice";
    root.setAttribute("data-bd-registration-choice", "");
    root.innerHTML = [
      '<div class="bd-registration-toggle" role="group" aria-label="Способ регистрации">',
        '<button type="button" data-bd-registration-mode="owner">Новое заведение</button>',
        '<button type="button" data-bd-registration-mode="join">Есть код</button>',
      '</div>',
      '<label class="bd-registration-invite hidden" data-bd-invite-field>',
        '<span>Код приглашения</span>',
        '<input type="text" inputmode="text" autocomplete="one-time-code" maxlength="14" placeholder="BD-XXXX-XXXX" data-bd-invite-input />',
        '<small>Роль назначил владелец. Самостоятельно повысить уровень доступа нельзя.</small>',
      '</label>',
    ].join("");
    form.insertBefore(root, form.firstChild);
    var input = root.querySelector("[data-bd-invite-input]");
    registrationInviteCode = registrationInviteFromUrl();
    if (registrationInviteCode && input) input.value = registrationInviteCode;
    root.querySelectorAll("[data-bd-registration-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        setRegistrationMode(button.dataset.bdRegistrationMode, root);
        if (button.dataset.bdRegistrationMode === "join" && input) input.focus();
      });
    });
    if (input) {
      input.addEventListener("input", function () {
        registrationInviteCode = input.value.trim();
      });
    }
    setRegistrationMode(registrationInviteCode ? "join" : "owner", root);
  }

  var PATH_PERMISSIONS = [
    { prefix: "/shifts", permission: "shifts.view" },
    { prefix: "/finance", permission: "finance.view" },
    { prefix: "/salaries", permission: "payroll.view" },
    { prefix: "/payroll", permission: "payroll.view" },
    { prefix: "/reports", permission: "reports.view" },
    { prefix: "/month-closing", permission: "reports.view" },
    { prefix: "/warehouse", permission: "inventory.view" },
    { prefix: "/sales-import", permission: "inventory.view" },
    { prefix: "/suppliers", permission: "inventory.view" },
    { prefix: "/catalog", permission: "inventory.view" },
    { prefix: "/employees", permission: "team.view" },
    { prefix: "/equipment", permission: "equipment.view" },
    { prefix: "/cases", permission: "incidents.view" },
    { prefix: "/events", permission: "tasks.view" },
    { prefix: "/tasks", permission: "tasks.view" },
    { prefix: "/analysis", permission: "analysis.view" },
    { prefix: "/health", permission: "analysis.view" },
    { prefix: "/market", permission: "analysis.view" },
    { prefix: "/smart", permission: "analysis.view" },
    { prefix: "/reviews", permission: "reviews.view" },
    { prefix: "/opportunities", permission: "calendar.view" },
    { prefix: "/data-control", permission: "audit.view" },
    { prefix: "/team-access", permission: "access.manage" },
    { prefix: "/setup", permission: "settings.manage" },
    { prefix: "/integrations", permission: "integrations.manage" },
  ];

  function requiredPermissionForPath(pathname) {
    var entry = PATH_PERMISSIONS.find(function (item) {
      return pathname === item.prefix || pathname.startsWith(item.prefix + "/");
    });
    return entry && entry.permission;
  }

  function renderAccessDenied(permission) {
    if (document.querySelector("[data-bd-access-denied]")) return;
    var overlay = document.createElement("div");
    overlay.className = "bd-access-denied";
    overlay.setAttribute("data-bd-access-denied", "");
    overlay.innerHTML = [
      '<section><span>ДОСТУП ОГРАНИЧЕН</span><h2>Раздел не входит в ваши права</h2>',
      '<p>' + (currentRole === "owner"
        ? 'Права владельца не удалось синхронизировать. Обновите страницу; если ошибка повторится, доступ требует проверки.'
        : 'Владелец может включить это право в разделе «Команда → Роли и доступ».') + '</p>',
      '<a href="/home">Вернуться на главную</a><small>' + String(permission) + '</small></section>',
    ].join("");
    var homeLink = overlay.querySelector("a");
    if (homeLink) {
      homeLink.addEventListener("click", function (event) {
        overlay.remove();
        navigateInApplication(event, "/home");
      });
    }
    document.body.appendChild(overlay);
  }

  function applyAccessUi() {
    if (!currentRole) {
      var staleDenial = document.querySelector("[data-bd-access-denied]");
      if (staleDenial) staleDenial.remove();
      return;
    }
    var required = requiredPermissionForPath(window.location.pathname);
    var existingDenial = document.querySelector("[data-bd-access-denied]");
    if (required && !hasClientPermission(required)) {
      renderAccessDenied(required);
    } else if (existingDenial) {
      existingDenial.remove();
    }

    document.querySelectorAll("a[href]").forEach(function (link) {
      var path;
      try { path = new URL(link.href, windsing", permission: "reports.view" },
    { prefix: "/warehouse", permission: "inventory.view" },
    { prefix: "/sales-import", permission: "inventory.view" },
    { prefix: "/suppliers", permission: "inventory.view" },
    { prefix: "/catalog", permission: "inventory.view" },
    { prefix: "/employees", permission: "team.view" },
    { prefix: "/equipment", permission: "equipment.view" },
    { prefix: "/cases", permission: "incidents.view" },
    { prefix: "/events", permission: "tasks.view" },
    { prefix: "/tasks", permission: "tasks.view" },
    { prefix: "/analysis", permission: "analysis.view" },
    { prefix: "/health", permission: "analysis.view" },
    { prefix: "/market", permission: "analysis.view" },
    { prefix: "/smart", permission: "analysis.view" },
    { prefix: "/reviews", permission: "reviews.view" },
    { prefix: "/opportunities", permission: "calendar.view" },
    { prefix: "/data-control", permission: "audit.view" },
    { prefix: "/team-access", permission: "access.manage" },
    { prefix: "/setup", permission: "settings.manage" },
    { prefix: "/integrations", permission: "integrations.manage" },
  ];

  function requiredPermissionForPath(pathname) {
    var entry = PATH_PERMISSIONS.find(function (item) {
      return pathname === item.prefix || pathname.startsWith(item.prefix + "/");
    });
    return entry && entry.permission;
  }

  function renderAccessDenied(permission) {
    if (document.querySelector("[data-bd-access-denied]")) return;
    var overlay = document.createElement("div");
    overlay.className = "bd-access-denied";
    overlay.setAttribute("data-bd-access-denied", "");
    overlay.innerHTML = [
      '<section><span>ДОСТУП ОГРАНИЧЕН</span><h2>Раздел не входит в ваши права</h2>',
      '<p>' + (currentRole === "owner"
        ? 'Права владельца не удалось синхронизировать. Обновите страницу; если ошибка повторится, доступ требует проверки.'
        : 'Владелец может включить это право в разделе «Команда → Роли и доступ».') + '</p>',
      '<a href="/home">Вернуться на главную</a><small>' + String(permission) + '</small></section>',
    ].join("");
    var homeLink = overlay.querySelector("a");
    if (homeLink) {
      homeLink.addEventListener("click", function (event) {
        overlay.remove();
        navigateInApplication(event, "/home");
      });
    }
    document.body.appendChild(overlay);
  }

  function applyAccessUi() {
    if (!currentRole) {
      var staleDenial = document.querySelector("[data-bd-access-denied]");
      if (staleDenial) staleDenial.remove();
      return;
    }
    var required = requiredPermissionForPath(window.location.pathname);
    var existingDenial = document.querySelector("[data-bd-access-denied]");
    if (required && !hasClientPermission(required)) {
      renderAccessDenied(required);
    } else if (existingDenial) {
      existingDenial.remove();
    }

    document.querySelectorAll("a[href]").forEach(function (link) {
      var path;
      try { path = new URL(link.href, window.location.href).pathname; } catch { return; }
      var permission = requiredPermissionForPath(path);
      if (permission) link.classList.toggle("bd-permission-hidden", !hasClientPermission(permission));
    });

    if (window.location.pathname === "/home") {
      var venueButton = Array.from(document.querySelectorAll("main button")).find(function (button) {
        return /^Заведение:/i.test(button.textContent || "");
      });
      if (venueButton && !venueButton.querySelector("[data-bd-role-chip]")) {
        var chip = document.createElement("span");
        chip.className = "bd-active-role-chip";
        chip.setAttribute("data-bd-role-chip", "");
        chip.textContent = currentRole === "owner" ? "Владелец" : currentRole === "manager" ? "Управляющий" : "Менеджер";
        venueButton.appendChild(chip);
      }
    }
  }

  function updateInjectedUi() {
    updateHomeGreeting();
    injectOpportunityEntry();
    injectCompetitorsEntry();
    injectDataControlEntry();
    injectTeamAccessEntry();
    injectWarehouseSalesEntry();
    injectRegistrationAccessChoice();
    removeLegacyActionPlanLinks();
    enhanceRecommendationCards();
    enhancePurchaseLanguage();
    applyAccessUi();
  }

  function watchHomeGreeting() {
    var observer = new MutationObserver(updateInjectedUi);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("popstate", updateInjectedUi);
    updateInjectedUi();
  }

  if (typeof window.crypto.randomUUID !== "function") {
    Object.defineProperty(window.crypto, "randomUUID", {
      configurable: true,
      value: function randomUUIDFallback() {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        var hex = Array.from(bytes, function (byte) {
          return byte.toString(16).padStart(2, "0");
        });
        return [
          hex.slice(0, 4).join(""),
          hex.slice(4, 6).join(""),
          hex.slice(6, 8).join(""),
          hex.slice(8, 10).join(""),
          hex.slice(10, 16).join(""),
        ].join("-");
      },
    });
  }

  if (window.location.pathname === "/join") {
    var sharedInvite = new URLSearchParams(window.location.search).get("code") || "";
    if (sharedInvite.trim()) sessionStorage.setItem("bd_pending_invite_code", sharedInvite.trim());
    window.location.replace("/register" + (sharedInvite.trim() ? "?invite=" + encodeURIComponent(sharedInvite.trim()) : ""));
    return;
  }

  if (window.location.pathname === "/app.html" || window.location.pathname.startsWith("/app.html/")) {
    window.location.replace("/");
    return;
  }

  if (window.location.pathname === "/decisions") {
    window.history.replaceState(null, "", "/analysis" + window.location.search + window.location.hash);
  }

  function serverRenderedUrl(value) {
    try {
      var url = new URL(String(value), window.location.href);
      var standaloneRoutes = ["/forgot-password"];
      return url.origin === window.location.origin
        && standaloneRoutes.includes(url.pathname);
    } catch {
      return false;
    }
  }

  var nativePushState = window.history.pushState.bind(window.history);
  var nativeReplaceState = window.history.replaceState.bind(window.history);

  var bdNavigationVersion = "canonical-navigation-v247";
  var bdTopLevelRoutes = window.bdNavigationContract
    ? window.bdNavigationContract.roots.slice()
    : ["/home", "/shifts", "/finance", "/employees", "/more"];
  var bdPendingScrollRestore = "";
  var bdInitialHadNavigationEntry = Boolean(window.history.state && window.history.state.bdEntryId);

  function bdNavigationUrl(value) {
    try {
      var url = new URL(String(value == null ? window.location.href : value), window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
      return url.pathname + url.search + url.hash;
    } catch {
      return null;
    }
  }

  function bdCurrentNavigationUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function bdDispatchNavigationChange() {
    window.dispatchEvent(new CustomEvent("bd:navigation-change", {
      detail: { url: bdCurrentNavigationUrl(), venueId: bdActiveVenueId() }
    }));
  }

  function bdActiveVenueId() {
    return localStorage.getItem("bd_active_venue_id") || "";
  }

  function bdHistoryState(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? Object.assign({}, value)
      : {};
  }

  function bdNewEntryId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function bdEnsureCurrentEntry() {
    var state = bdHistoryState(window.history.state);
    var activeVenueId = bdActiveVenueId();
    if (state.bdEntryId) {
      if (String(state.bdVenueId || "") !== String(activeVenueId)) {
        state.bdVenueId = activeVenueId;
        state.bdPreviousEntryId = "";
        state.bdPreviousUrl = "";
        nativeReplaceState(state, "", bdCurrentNavigationUrl());
      }
      return state;
    }
    state.bdEntryId = bdNewEntryId();
    state.bdVenueId = activeVenueId;
    state.bdNavigationVersion = bdNavigationVersion;
    nativeReplaceState(state, "", bdCurrentNavigationUrl());
    return state;
  }

  function bdIsTopLevelRoute(value) {
    try {
      return bdTopLevelRoutes.indexOf(new URL(String(value), window.location.href).pathname) >= 0;
    } catch {
      return false;
    }
  }

  function bdNavigationPathname  if (!url) return false;
    var replace = Boolean(options && options.replace);
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", url);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    return true;
  };
  window.bdNavigateBack = function (fallback) {
    if (typeof bdConfirmLeavingDirtyState === "function" && !bdConfirmLeavingDirtyState()) return;
    var state = bdHistoryState(window.history.state);
    var target = fallback == null
      ? bdLogicalParentUrl()
      : (bdNavigationUrl(fallback) || bdLogicalParentUrl());
    var queryParent = bdQueryParentUrl(bdCurrentNavigationUrl());
    var explicitSameRouteParent = fallback != null
      && bdNavigationPathname(target) === bdNavigationPathname(bdCurrentNavigationUrl());
    var previousSameRoute = bdCanReturnToPreviousContext(state)
      && bdNavigationPathname(state.bdPreviousUrl) === bdNavigationPathname(bdCurrentNavigationUrl());
    if (previousSameRoute || (bdCanReturnToPreviousContext(state) && !queryParent && !explicitSameRouteParent)) {
      bdPendingScrollRestore = state.bdPreviousUrl;
      window.history.back();
      return;
    }
    bdPendingScrollRestore = target;
    window.history.replaceState(state, "", target);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    bdRestoreScroll(target);
  };

  function bdSeedDirectLinkParent() {
    var path = window.location.pathname;
    var currentUrl = bdCurrentNavigationUrl();
    var queryParentUrl = bdQueryParentUrl(currentUrl);
    var routeScreen = window.bdNavigationContract && window.bdNavigationContract.resolve(currentUrl);
    var publicOrTopLevel = Boolean(routeScreen && ["public", "root", "redirect", "compatibility"].includes(routeScreen.type));
    if (bdInitialHadNavigationEntry || (publicOrTopLevel && !queryParentUrl)) {
      bdEnsureCurrentEntry();
      return;
    }
    var parentUrl = queryParentUrl || bdLogicalParentRoute(path);
    if (!parentUrl || parentUrl === currentUrl) {
      bdEnsureCurrentEntry();
      return;
    }
    var parentEntryId = bdNewEntryId();
    nativeReplaceState({
      bdEntryId: parentEntryId,
      bdVenueId: bdActiveVenueId(),
      bdNavigationVersion: bdNavigationVersion,
      bdSyntheticParent: true
    }, "", parentUrl);
    nativePushState({
      bdEntryId: bdNewEntryId(),
      bdPreviousEntryId: parentEntryId,
      bdPreviousUrl: parentUrl,
      bdVenueId: bdActiveVenueId(),
      bdNavigationVersion: bdNavigationVersion,
      bdDirectLink: true
    }, "", currentUrl);
  }

  bdSeedDirectLinkParent();
  window.history.pushState = function (state, title, url) {
    url = normalizeApplicationHref(url);
    if (url != null && serverRenderedUrl(url)) {
      var target = new URL(String(url), window.location.href);
      window.location.assign(target.pathname + target.search + target.hash);
      return;
    }
    var sourceUrl = bdCurrentNavigationUrl();
    var targetUrl = url == null ? sourceUrl : bdNavigationUrl(url);
    var sourceState = bdEnsureCurrentEntry();
    var nextState = bdHistoryState(state);
    bdRememberScroll(sourceUrl);
    nextState.bdEntryId = bdNewEntryId();
    nextState.bdPreviousEntryId = sourceState.bdEntryId;
    nextState.bdPreviousUrl = sourceUrl;
    nextState.bdVenueId = bdActiveVenueId();
    nextState.bdNavigationVersion = bdNavigationVersion;
    if (
      targetUrl
      && bdIsTopLevelRoute(sourceUrl)
      && bdIsTopLevelRoute(targetUrl)
      && bdNavigationPathname(sourceUrl) !== bdNavigationPathname(targetUrl)
      && !bdQueryParentUrl(sourceUrl)
      && !bdQueryParentUrl(targetUrl)
    ) {
      nextState.bdPreviousEntryId = sourceState.bdPreviousEntryId || "";
      nextState.bdPreviousUrl = sourceState.bdPreviousUrl || "";
      var topLevelResult = nativeReplaceState(nextState, title, url);
      bdDispatchNavigationChange();
      return topLevelResult;
    }
    var pushResult = nativePushState(nextState, title, url);
    bdDispatchNavigationChange();
    return pushResult;
  };
  window.history.replaceState = function (state, title, url) {
    url = normalizeApplicationHref(url);
    if (url != null && serverRenderedUrl(url)) {
      var target = new URL(String(url), window.location.href);
      window.location.replace(target.pathname + target.search + target.hash);
      return;
    }
    var currentState = bdEnsureCurrentEntry();
    var nextState = Object.assign({}, currentState, bdHistoryState(state), {
      bdEntryId: currentState.bdEntryId,
      bdVenueId: bdActiveVenueId(),
      bdNavigationVersion: bdNavigationVersion
    });
    var replaceResult = nativeReplaceState(nextState, title, url);
    bdDispatchNavigationChange();
    return replaceResult;
  };

  window.addEventListener("popstate", function () {
    bdDispatchNavigationChange();
    var restoreTarget = bdPendingScrollRestore || bdCurrentNavigationUrl();
    bdPendingScrollRestore = "";
    window.setTimeout(function () { bdRestoreScroll(restoreTarget); }, 0);
  });
  window.addEventListener("bd:venue-changed", function () {
    var state = bdHistoryState(window.history.state);
    state.bdVenueId = bdActiveVenueId();
    state.bdPreviousEntryId = "";
    state.bdPreviousUrl = "";
    nativeReplaceState(state, "", bdCurrentNavigationUrl());
    bdDispatchNavigationChange();
  });

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function authenticatedFetch(input, init) {
    var requestUrl = null;
    var requestVenueId = null;
    var rejectStaleVenueResponse = false;
    try {
      requestUrl = new URL(typeof input === "string" ? input : input.url, window.location.href);
      if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith("/api/")) {
        var sessionEmail = localStorage.getItem("bd_session");
        var sessionToken = localStorage.getItem("bd_session_token");
        var activeVenueId = localStorage.getItem("bd_active_venue_id");
        if (sessionEmail && sessionToken) {
          var headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init && init.headers ? init.headers : undefined).forEach(function (value, key) {
            headers.set(key, value);
          });
          if (!headers.has("X-Session-Email")) headers.set("X-Session-Email", sessionEmail);
          if (!headers.has("X-Session-Token")) headers.set("X-Session-Token", sessionToken);
          if (activeVenueId && !headers.has("X-Venue-Id")) headers.set("X-Venue-Id", activeVenueId);
          requestVenueId = headers.get("X-Venue-Id");
          rejectStaleVenueResponse = Boolean(requestVenueId)
            && !requestUrl.pathname.startsWith("/api/auth/")
            && requestUrl.pathname !== "/api/access/active-venue"
            && requestUrl.pathname !== "/api/access/join";
          init = Object.assign({}, init || {}, { headers: headers });
        }
        if (requestUrl.pathname === "/api/auth/register" && init && typeof init.body === "string") {
          try {
            var registerBody = JSON.parse(init.body);
            registerBody.registrationMode = registrationMode;
            if (registrationMode === "join") registerBody.invitationCode = registrationInviteCode;
            else delete registerBody.invitationCode;
            init = Object.assign({}, init, { body: JSON.stringify(registerBody) });
          } catch {
            // The registration endpoint will reject malformed JSON itself.
          }
        }
        if (
          requestUrl.pathname === "/api/store/bd_finance_expenses"
          && String(init && init.method || "GET").toUpperCase() === "PUT"
          && hasClientPermission("expenses.create")
          && !hasClientPermission("finance.manage")
          && init
          && typeof init.body === "string"
        ) {
          try {
            var expensePayload = JSON.parse(init.body);
            var expenseRows = Array.isArray(expensePayload.data) ? expensePayload.data.slice() : [];
            expenseRows.sort(function (left, right) {
              return String(right && (right.updatedAt || right.createdAt || right.date) || "")
                .localeCompare(String(left && (left.updatedAt || left.createdAt || left.date) || ""));
            });
            if (expenseRows[0]) {
              input = "/api/expenses";
              requestUrl = new URL("/api/expenses", window.location.href);
              init = Object.assign({}, init, {
                method: "POST",
                body: JSON.stringify({ entry: expenseRows[0] })
              });
            }
          } catch {
            // The normal store request will be rejected safely by the server.
          }
        }
      }
    } catch {
      // Preserve the browser's normal fetch behavior for unusual Request objects.
    }
    var requestMethod = String(
      init && init.method
        ? init.method
        : (typeof Request !== "un url) {
    url = normalizeApplicationHref(url);
    if (url != null && serverRenderedUrl(url)) {
      var target = new URL(String(url), window.location.href);
      window.location.replace(target.pathname + target.search + target.hash);
      return;
    }
    var currentState = bdEnsureCurrentEntry();
    var nextState = Object.assign({}, currentState, bdHistoryState(state), {
      bdEntryId: currentState.bdEntryId,
      bdVenueId: bdActiveVenueId(),
      bdNavigationVersion: bdNavigationVersion
    });
    var replaceResult = nativeReplaceState(nextState, title, url);
    bdDispatchNavigationChange();
    return replaceResult;
  };

  window.addEventListener("popstate", function () {
    bdDispatchNavigationChange();
    var restoreTarget = bdPendingScrollRestore || bdCurrentNavigationUrl();
    bdPendingScrollRestore = "";
    window.setTimeout(function () { bdRestoreScroll(restoreTarget); }, 0);
  });
  window.addEventListener("bd:venue-changed", function () {
    var state = bdHistoryState(window.history.state);
    state.bdVenueId = bdActiveVenueId();
    state.bdPreviousEntryId = "";
    state.bdPreviousUrl = "";
    nativeReplaceState(state, "", bdCurrentNavigationUrl());
    bdDispatchNavigationChange();
  });

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function authenticatedFetch(input, init) {
    var requestUrl = null;
    var requestVenueId = null;
    var rejectStaleVenueResponse = false;
    try {
      requestUrl = new URL(typeof input === "string" ? input : input.url, window.location.href);
      if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith("/api/")) {
        var sessionEmail = localStorage.getItem("bd_session");
        var sessionToken = localStorage.getItem("bd_session_token");
        var activeVenueId = localStorage.getItem("bd_active_venue_id");
        if (sessionEmail && sessionToken) {
          var headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init && init.headers ? init.headers : undefined).forEach(function (value, key) {
            headers.set(key, value);
          });
          if (!headers.has("X-Session-Email")) headers.set("X-Session-Email", sessionEmail);
          if (!headers.has("X-Session-Token")) headers.set("X-Session-Token", sessionToken);
          if (activeVenueId && !headers.has("X-Venue-Id")) headers.set("X-Venue-Id", activeVenueId);
          requestVenueId = headers.get("X-Venue-Id");
          rejectStaleVenueResponse = Boolean(requestVenueId)
            && !requestUrl.pathname.startsWith("/api/auth/")
            && requestUrl.pathname !== "/api/access/active-venue"
            && requestUrl.pathname !== "/api/access/join";
          init = Object.assign({}, init || {}, { headers: headers });
        }
        if (requestUrl.pathname === "/api/auth/register" && init && typeof init.body === "string") {
          try {
            var registerBody = JSON.parse(init.body);
            registerBody.registrationMode = registrationMode;
            if (registrationMode === "join") registerBody.invitationCode = registrationInviteCode;
            else delete registerBody.invitationCode;
            init = Object.assign({}, init, { body: JSON.stringify(registerBody) });
          } catch {
            // The registration endpoint will reject malformed JSON itself.
          }
        }
        if (
          requestUrl.pathname === "/api/store/bd_finance_expenses"
          && String(init && init.method || "GET").toUpperCase() === "PUT"
          && hasClientPermission("expenses.create")
          && !hasClientPermission("finance.manage")
          && init
          && typeof init.body === "string"
        ) {
          try {
            var expensePayload = JSON.parse(init.body);
            var expenseRows = Array.isArray(expensePayload.data) ? expensePayload.data.slice() : [];
            expenseRows.sort(function (left, right) {
              return String(right && (right.updatedAt || right.createdAt || right.date) || "")
                .localeCompare(String(left && (left.updatedAt || left.createdAt || left.date) || ""));
            });
            if (expenseRows[0]) {
              input = "/api/expenses";
              requestUrl = new URL("/api/expenses", window.location.href);
              init = Object.assign({}, init, {
                method: "POST",
                body: JSON.stringify({ entry: expenseRows[0] })
              });
            }
          } catch {
            // The normal store request will be rejected safely by the server.
          }
        }
      }
    } catch {
      // Preserve the browser's normal fetch behavior for unusual Request objects.
    }
    var requestMethod = String(
      init && init.method
        ? init.method
        : (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    var pendingResponse = nativeFetch(input, init);
    if (rejectStaleVenueResponse) {
      pendingResponse = pendingResponse.then(function (response) {
        var activeVenueId = localStorage.getItem("bd_active_venue_id");
        if (activeVenueId && String(activeVenueId) !== String(requestVenueId)) {
          try { if (response.body) response.body.cancel(); } catch { /* no-op */ }
          throw new DOMException("Ответ относится к ранее выбранному заведению", "AbortError");
        }
        return response;
      });
    }
    if (
      requestUrl
      && requestUrl.origin === window.location.origin
      && ["/api/auth/login", "/api/auth/register", "/api/auth/bootstrap"].indexOf(requestUrl.pathname) >= 0
    ) {
      // bd-auth-single-read-v248: consume the auth body once. Response.clone()
      // could leave both readers waiting indefinitely in embedded browsers.
      return pendingResponse.then(function (response) {
        return response.text().then(function (body) {
          try {
            var result = JSON.parse(body);
            rememberAccessContext(result);
            if (result && result.ok && result.joinedVenue) {
              sessionStorage.removeItem("bd_pending_invite_code");
            }
          } catch {
            // The caller will surface malformed auth responses.
          }
          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      });
    }
    if (["POST", "PUT", "PATCH", "DELETE"].indexOf(requestMethod) >= 0 && Date.now() < bdSaveIntentUntil) {
      pendingResponse = pendingResponse.then(function (response) {
        if (response.ok) window.setTimeout(function () { window.bdMarkNavigationClean?.(); }, 0);
        else bdSaveIntentUntil = 0;
        return response;
      }, function (error) {
        bdSaveIntentUntil = 0;
        throw error;
      });
    }
    return pendingResponse;
  };

  function loadApplication() {
    var script = document.createElement("script");
    script.type = "module";
    script.src = "/assets/index-BQGspy0I.js?v=20260821-inventory-reconciliation-v224-user-display-units-v236-purchase-units-v237-collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244-inventory-workflow-v245-inventory-layer-v246-20260823-auth-login-v248-20260823-existing-venue-gate-v249-20260823-embedded-login-transition-v250-20260823-venue-setup-boundary-v251-20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-20260826-invoice-recognition-v2-20260824-canonical-supplier-v260-20260824-auth-bootstrap-state-v274-20260825-profile-v280a-20260825-profile-v281-20260825-profile-v282-20260825-business-health-v284-20260826-venue-identity-v297-20260826-menu-sale-size-v298-20260828-calculation-audit-v320-20260828-accounting-money-v321-20260828-authoritative-bootstrap-v324-20260828-assortment-currency-ux-v325-20260828-venue-currency-lock-v326-20260828-business-health-ux-v332-20260828-business-health-ux-v333-20260828-business-health-live-v334-20260828-business-health-canonical-v335-20260829-canonical-taxonomy-v336-20260826-invoice-create-canonical-v297";
    document.head.appendChild(script);
  }

  function injectSupplierAlternativesEntry() {
    function apply() {
      if (window.location.pathname !== "/suppliers") return;
      if (document.querySelector("[data-bd-supplier-alternatives]")) return;
      var catalog = document.querySelector(".bd-procurement-catalog-gateway");
      if (!catalog || !catalog.parentNode) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bd-procurement-catalog-gateway";
      button.setAttribute("data-bd-supplier-alternatives", "true");
      button.innerHTML = "<b>Новые поставщики →</b><span>Найти региональные альтернативы по ассортименту, ценам и условиям закупки.</span>";
      button.addEventListener("click", function () {
        window.location.href = "/supplier-alternatives";
      });
      catalog.parentNode.insertBefore(button, catalog.nextSibling);
    }
    apply();
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", function () { setTimeout(apply, 0); });
  }

  function enhanceAiActionPlan() {
    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    var existing = document.querySelector("[data-bd-action-plan]");
    if (window.location.pathname !== "/analysis") {
      if (existing) existing.removeAttribute("data-bd-action-plan");
      return;
    }

    var labels = document.querySelectorAll("main p");
    var label = null;
    for (var index = 0; index < labels.length; index += 1) {
      if ((labels[index].textContent || "").trim() === "Что делать по шагам") {
        label = labels[index];
        break;
      }
    }
    if (!label) return;

    var card = label.closest(".bd-card");
    if (!card || card.hasAttribute("data-bd-action-plan")) return;
    var source = card.querySelector(":scope > p:last-child");
    if (!source) return;

    var sourceText = (source.textContent || "").replace(/\s+/g, " ").trim();
    var metadataStart = sourceText.search(/\sОтветственный:\s*/i);
    var stepsText = metadataStart >= 0 ? sourceText.slice(0, metadataStart) : sourceText;
    var metadataText = metadataStart >= 0 ? sourceText.slice(metadataStart).trim() : "";
    var steps = [];
    var stepPattern = /(?:^|\s)(\d+)\.\s+([\s\S]*?)(?=\s\d+\.\s+|$)/g;
    var match;
    while ((match = stepPattern.exec(stepsText))) {
      steps.push(match[2].trim());
    }
    if (steps.length < 2) return;

    function field(pattern, fallback) {
      var value = metadataText.match(pattern);
      return value && value[1] ? value[1].trim().replace(/\.$/, "") : fallback;
    }

    var responsible = field(/Ответственный:\s*([\s\S]*?)(?=\.\s*Срок:|\s+Срок:|$)/i, "Управляющий");
    var deadline = field(/Срок:\s*([\s\S]*?)(?=\.\s*Готово, когда:|\s+Готово, когда:|$)/i, "По указанному сроку");
    var readyWhen = field(/Готово, когда:\s*([\s\S]*?)$/i, "Результат проверен и зафиксирован");
    var planKey = "bd_ai_action_plan__" + (localStorage.getItem("bd_active_venue_id") || "default") + "__" + steps.join("|").slice(0, 240);
    var completed = [];
    try {
      completed = JSON.parse(localStorage.getItem(planKey) || "[]");
      if (!Array.isArray(completed)) completed = [];
    } catch {
      completed = [];
    }

    card.setAttribute("data-bd-action-plan", "action-plan-v1");
    label.textContent = "План действий";
    var headingRow = label.parentElement;
    if (headingRow) headingRow.classList.add("bd-action-plan-heading");
    source.hidden = true;

    var plan = document.createElement("section");
    plan.className = "bd-action-plan";
    plan.setAttribute("aria-label", "Пошаговый план действий");

    function render() {
      while (plan.firstChild) plan.removeChild(plan.firstChild);
      var currentIndex = steps.findIndex(function (_, stepIndex) {
        return completed.indexOf(stepIndex) < 0;
      });
      var allDone = currentIndex < 0;

      var intro = document.createElement("div");
      intro.className = "bd-action-plan-intro";
      intro.innerHTML = allDone
        ? '<div><strong>План выполнен</strong><span>Все шаги отмечены как готовые</span></div><b>✓</b>'
        : '<div><strong>Сейчас — шаг ' + (currentIndex + 1) + ' из ' + steps.length + '</strong><span>Выполняйте по одному действию</span></div><b>' + Math.round((completed.length / steps.length) * 100) + '%</b>';
      plan.appendChild(intro);

      var progress = document.createElement("div");
      progress.className = "bd-action-plan-progress";
      progress.innerHTML = '<i style="width:' + Math.round((completed.length / steps.length) * 100) + '%"></i>';
      plan.appendChild(progress);

      steps.forEach(function (step, stepIndex) {
        var done = completed.indexOf(stepIndex) >= 0;
        var item = document.createElement("details");
        item.className = "bd-action-plan-step" + (done ? " is-done" : "") + (stepIndex === currentIndex ? " is-current" : "");
        item.open = stepIndex === currentIndex;

        var summary = document.createElement("summary");
        summary.innerHTML = '<span class="bd-action-plan-number">' + (done ? "✓" : stepIndex + 1) + '</span><span class="bd-action-plan-title">' + escapeHtml(step) + '</span><span class="bd-action-plan-toggle" aria-hidden="true">⌄</span>';
        item.appendChild(summary);

        var body = document.createElement("div");
        body.className = "bd-action-plan-body";
        body.innerHTML = [
          '<div class="bd-action-plan-facts">',
            '<span><small>КТО ДЕЛАЕТ</small><strong>' + escapeHtml(responsible) + '</strong></span>',
            '<span><small>СРОК</small><strong>' + escapeHtml(deadline) + '</strong></span>',
          '</div>',
          '<div class="bd-action-plan-ready"><small>ГОТОВО, КОГДА</small><p>' + escapeHtml(readyWhen) + '</p></div>'
        ].join("");

        var button = document.createElement("button");
        button.type = "button";
        button.className = "bd-action-plan-complete";
        button.textContent = done ? "Вернуть в работу" : "Отметить шаг выполненным";
        button.addEventListener("click", function () {
          if (done) completed = completed.filter(function (value) { return value !== stepIndex; });
          else completed = completed.concat(stepIndex).filter(function (value, position, values) { return values.indexOf(value) === position; });
          localStorage.setItem(planKey, JSON.stringify(completed));
          render();
        });
        body.appendChild(button);
        item.appendChild(body);
        plan.appendChild(item);
      });
    }

    render();
    source.insertAdjacentElement("afterend", plan);
  }

  function removeLegacyFinancePurchasePaymentEntryV195() {
    var existing = document.querySelector("[data-bd-purchase-payment-entry]");
    if (existing) existing.remove();
  }

  var bdDirtySurfaces = new WeakMap();
  var bdSaveIntentUntil = 0;
  var bdIgnoreNextPopstateGuard = false;

  function bdEditableSurface(element) {
    if (!element || !element.closest) return null;
    var form = element.closest("form");
    if (form) return form;
    var dialog = element.closest('[role="dialog"]');
    if (dialog) return dialog;
    var fixed = element.closest(".fixed");
    if (fixed && /(?:^|\s)(?:inset-0|bottom-0)(?:\s|$)/.test(fixed.className || "")) return fixed;
    return null;
  }

  function bdSurfaceSignature(surface) {
    if (!surface || !surface.querySelectorAll) return "";
    retu return true;
    if (!window.confirm("Изменения не сохранены. Выйти без сохранения?")) return false;
    dirtySurface.removeAttribute("data-bd-unsaved-changes");
    bdDirtySurfaces.set(dirtySurface, bdSurfaceSignature(dirtySurface));
    return true;
  }

  window.bdConfirmDiscard = bdConfirmLeavingDirtyState;
  window.bdMarkNavigationClean = function (surface) {
    var target = surface || bdVisibleDirtySurface();
    if (!target) return;
    target.removeAttribute("data-bd-unsaved-changes");
    bdDirtySurfaces.set(target, bdSurfaceSignature(target));
  };

  function bdNavigationControlLabel(control) {
    return String(control?.getAttribute?.("aria-label") || control?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("ru");
  }

  function bdIsSaveControl(control) {
    var label = bdNavigationControlLabel(control);
    return /^(сохранить|создать|подтвердить|обновить|закрыть смену|провести)/.test(label);
  }

  function bdIsDiscardControl(control) {
    if (control?.hasAttribute?.("data-bd-internal-step-navigation")) return false;
    var label = bdNavigationControlLabel(control);
    return label === "назад" || label === "отмена" || label === "закрыть" || label === "×" || label.startsWith("вернуться");
  }

  function installNavigationConsistencyGuards() {
    document.addEventListener("focusin", function (event) {
      bdRememberSurfaceBaseline(bdEditableSurface(event.target));
    }, true);
    document.addEventListener("input", function (event) {
      bdUpdateSurfaceDirty(bdEditableSurface(event.target));
    }, true);
    document.addEventListener("change", function (event) {
      bdUpdateSurfaceDirty(bdEditableSurface(event.target));
    }, true);
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var target = event.target;
      var control = target && target.closest ? target.closest("button,a[href]") : null;
      if (!control) return;
      var surface = bdEditableSurface(control) || control.form || null;
      if (surface && bdIsSaveControl(control)) {
        bdSaveIntentUntil = Date.now() + 30000;
        return;
      }
      if (bdIsDiscardControl(control) && surface && !bdConfirmLeavingDirtyState(surface)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (control.tagName === "A" && control.href) {
        var href = bdNavigationUrl(control.href);
        if (href && href !== bdCurrentNavigationUrl() && !bdConfirmLeavingDirtyState()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    }, true);
    window.addEventListener("beforeunload", function (event) {
      if (!bdVisibleDirtySurface()) return;
      event.preventDefault();
      event.returnValue = "";
    });
    window.addEventListener("popstate", function () {
      if (bdIgnoreNextPopstateGuard) {
        bdIgnoreNextPopstateGuard = false;
        return;
      }
      if (!bdVisibleDirtySurface()) return;
      if (bdConfirmLeavingDirtyState()) return;
      bdIgnoreNextPopstateGuard = true;
      window.history.forward();
    });
  }

  try {
    var demoEmail = "demo@bardoctor.app";
    if (localStorage.getItem("bd_session") === demoEmail) {
      var demoKeys = [];
      for (var i = 0; i < localStorage.length; i += 1) {
        var candidate = localStorage.key(i);
        if (candidate && (candidate === "bd_session" || candidate === "bd_session_token" || candidate === "bd_session_userid" || candidate.endsWith("__" + demoEmail))) {
          demoKeys.push(candidate);
        }
      }
      demoKeys.forEach(function (key) { localStorage.removeItem(key); });
    }

    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var headers = {};
    if (email && token) {
      headers["X-Session-Email"] = email;
      headers["X-Session-Token"] = token;
    }

    var response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: headers,
      signal: AbortSignal.timeout(30000)
    });
    var result = await response.json();

    if (result.ok) {
      rememberAccessContext(result);
      currentFirstName = cleanFirstName(result.firstName);
      localStorage.setItem("bd_session", result.email);
      localStorage.setItem("bd_session_token", result.token);
      localStorage.setItem("bd_session_userid", String(result.userId));
      if (currentFirstName) localStorage.setItem("bd_user_first_name", currentFirstName);
      else localStorage.removeItem("bd_user_first_name");
      if (result.migrated) {
        localStorage.setItem("bd_sites_migration_complete", new Date().toISOString());
      }
      if (window.location.pathname === "/setup" && result.role !== "owner") {
        window.location.replace("/home");
        return;
      }
      await refreshServerInventoryCacheV235();
    } else if (result.needsLogin) {
      window.__bdAuthBootstrapV274 = { state: "unauthenticated", reason: "login_required" };
      localStorage.removeItem("bd_session");
      localStorage.removeItem("bd_session_token");
      localStorage.removeItem("bd_session_userid");
      localStorage.removeItem("bd_active_role");
      localStorage.removeItem("bd_active_permissions");
      localStorage.removeItem("bd_active_venue_id");
      localStorage.removeItem("bd_active_venue_is_primary");
    } else {
      window.__bdAuthBootstrapV274 = { state: "error", reason: "bootstrap_response_failed" };
    }
  } catch {
    window.__bdAuthBootstrapV274 = { state: "error", reason: "bootstrap_request_failed" };
  }

  window.__bdBootstrapPending = false;
  window.dispatchEvent(new CustomEvent("bd:bootstrap-complete"));

  observePurchaseConfirmation();
  installProtectedOriginalLinks();
  installNavigationConsistencyGuards();
  loadApplication();
  injectSupplierAlternativesEntry();
  removeLegacyFinancePurchasePaymentEntryV195();
  enhanceAiActionPlan();
  new MutationObserver(enhanceAiActionPlan).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", function () { setTimeout(enhanceAiActionPlan, 0); });
  watchHomeGreeting();
})();
