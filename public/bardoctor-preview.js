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
    button.setAttribu