(function () {
  "use strict";

  var SHELL_VERSION = "v247";
  var HEADER_MARK = "canonical-v247";
  var TAB_SELECTORS = [
    ".bd-team-tabs-v163",
    ".bd-eq-tabs-v167",
    ".bd-assortment-tabs-v170",
    ".bd-proc-tabs-v168",
    ".bd-warehouse-tabs",
    ".trust-tabs"
  ].join(",");
  var LEGACY_HEADERS = [
    ".bd-home-header",
    ".bd-shifts-header",
    ".bd-finance-header-v160",
    ".bd-team-module-header-v163",
    ".bd-more-header-v166",
    ".bd-payroll-header-v164",
    ".bd-settings-header-v182",
    ".notification-header",
    ".integration-header",
    ".market-topbar",
    ".opportunity-topbar",
    ".trust-header",
    ".access-header",
    ".venue-topbar",
    "header.topbar",
    "header.top"
  ].join(",");
  var LEGACY_TITLE_ROWS = [
    ".bd-eq-titlebar-v167",
    ".bd-assortment-titlebar-v170",
    ".bd-proc-titlebar-v168"
  ].join(",");

  function currentUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function startupPending() {
    if (document.documentElement.getAttribute("data-bd-startup-pending") === "v201") return true;
    return !!document.querySelector(
      "[data-bd-root-splash], [data-bd-health-startup-state=\"SPLASH_LOADING\"], [data-bd-health-entry]"
    );
  }

  function resolveRoute() {
    var contract = window.bdNavigationContract;
    var screen = contract && contract.resolve(window.location.href);
    if (screen && screen.headerMode === "underlay" && screen.parent) screen = contract.resolve(screen.parent);
    if (!screen || ["public", "admin", "compatibility", "redirect"].includes(screen.type)) return null;
    return {
      variant: screen.type === "root" ? "root" : ["module", "list", "report", "settings"].includes(screen.type) ? "module" : "detail",
      title: screen.title,
      parent: screen.parent,
      shell: screen.shell,
      bottomNav: screen.bottomNav,
      headerMode: screen.headerMode,
      screenType: screen.type
    };
  }

  function isPublicOrEmbedded() {
    if (new URLSearchParams(window.location.search).get("embedded") === "1") return true;
    return /^\/(?:admin|api|login|register|forgot-password|join|setup|terms|privacy|reset)(?:\/|$)/.test(window.location.pathname);
  }

  function backLabel(config) {
    return config && config.variant === "detail" ? "Назад" : "Вернуться назад";
  }

  function makeIconButton(original, staticAction) {
    var action = document.createElement("button");
    action.className = "bd-app-header-action";
    action.type = "button";
    var label = staticAction && staticAction.label || original && (original.getAttribute("aria-label") || original.getAttribute("title")) || "Действие";
    action.setAttribute("aria-label", label);
    action.title = label;
    if (staticAction && staticAction.icon === "bell") action.textContent = "♢";
    else if (original) action.innerHTML = original.innerHTML || "+";
    else action.textContent = "+";
    if (original) action.addEventListener("click", function () {
      if (original.matches(".bd-finance-quick-add-fab")) openProxyActionMenu(original);
      else original.click();
    });
    else if (staticAction && staticAction.href) action.addEventListener("click", function () {
      if (typeof window.bdNavigate === "function") window.bdNavigate(staticAction.href);
      else window.location.assign(staticAction.href);
    });
    return action;
  }

  function openProxyActionMenu(original) {
    var previous = document.querySelector("[data-bd-app-action-sheet]");
    if (previous) previous.remove();
    var source = original.closest("details") || original.parentElement;
    var sourceButtons = source ? Array.from(source.querySelectorAll('[role="menuitem"],.bd-finance-quick-add-menu button')) : [];
    if (!sourceButtons.length) { original.click(); return; }
    var shell = document.createElement("div");
    shell.className = "bd-app-action-sheet";
    shell.setAttribute("data-bd-app-action-sheet", "");
    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Закрыть быстрые действия");
    var panel = document.createElement("div");
    panel.className = "bd-app-action-sheet-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Быстрые финансовые действия");
    var title = document.createElement("strong");
    title.textContent = "Быстрые финансовые действия";
    panel.appendChild(title);
    sourceButtons.forEach(function (sourceButton) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = (sourceButton.textContent || "Действие").trim();
      button.addEventListener("click", function () { shell.remove(); sourceButton.click(); });
      panel.appendChild(button);
    });
    backdrop.addEventListener("click", function () { shell.remove(); });
    shell.appendChild(backdrop);
    shell.appendChild(panel);
    document.body.appendChild(shell);
    panel.querySelector("button")?.focus();
  }

  function explicitAction(config) {
    var path = window.location.pathname;
    if (path === "/opportunities" && config.variant === "module") return { href: "/notifications", label: "Настройки уведомлений", icon: "bell" };
    var selector = path === "/finance" ? ".bd-finance-quick-add-fab"
      : path === "/employees" ? ".bd-team-header-add-v163"
        : path === "/equipment" ? ".bd-eq-add-icon-v167" : "";
    return selector ? document.querySelector(selector) : null;
  }

  function genericAction() {
    var back = Array.from(document.querySelectorAll('button[aria-label^="Назад"],button[aria-label^="Закрыть"],a[data-bd-back]')).find(function (item) {
      return !item.closest("bd-app-header,dialog,[role=dialog]");
    });
    if (!back) return null;
    var row = back.parentElement;
    if (!row) return null;
    return Array.from(row.querySelectorAll("button,a[href],summary[role=button]")).find(function (item) {
      if (item === back || item.closest("[data-bd-venue-host]") || item.matches("[data-bd-back],.bd-venue-trigger")) return false;
      return Boolean(item.getAttribute("aria-label") || item.getAttribute("title"));
    }) || null;
  }

  function legacyTitleRow(back) {
    var current = back && back.parentElement;
    for (var depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      if (current.matches("main,body,#root")) break;
      if (current.querySelector("h1") && !current.querySelector("nav,[role=tablist]")) return current;
    }
    return null;
  }

  function markLegacyHeaders() {
    document.querySelectorAll(LEGACY_HEADERS).forEach(function (header) {
      if (!header.closest("dialog,[role=dialog]") && !header.matches("bd-app-header")) header.setAttribute("data-bd-legacy-header", "true");
    });
    document.querySelectorAll(LEGACY_TITLE_ROWS).forEach(function (row) { row.setAttribute("data-bd-legacy-header", "true"); });
    document.querySelectorAll(".bd-eq-header-v167,.bd-assortment-header-v170,.bd-proc-header-v168").forEach(function (header) { header.setAttribute("data-bd-header-tabs-host", "true"); });
    document.querySelectorAll('button[aria-label^="Назад"],button[aria-label^="Закрыть"],a[data-bd-back]').forEach(function (back) {
      if (back.closest("bd-app-header,dialog,[role=dialog]")) return;
      var row = legacyTitleRow(back);
      if (row) row.setAttribute("data-bd-legacy-header", "true");
    });
  }

  function decorateTabs() {
    document.querySelectorAll(TAB_SELECTORS).forEach(function (tabs) {
      if (tabs.closest("dialog,[role=dialog]") || tabs.closest("[data-bd-bottom-nav]")) return;
      tabs.setAttribute("data-bd-tabs", HEADER_MARK);
      if (!tabs.hasAttribute("role")) tabs.setAttribute("role", "tablist");
      tabs.querySelectorAll(":scope > button").forEach(function (button) {
        if (!button.hasAttribute("role")) button.setAttribute("role", "tab");
      });
    });
  }

  function moveVenueTrigger(header, config) {
    var host = header.querySelector("[data-bd-canonical-venue-host]");
    if (!host || config.variant === "detail") return;
    var triggers = Array.from(document.querySelectorAll("[data-bd-venue-trigger]")).filter(function (item) { return !item.closest(".bd-venue-sheet"); });
    var trigger = triggers.find(function (item) { return item.closest("bd-app-header"); }) || triggers[triggers.length - 1];
    if (!trigger) return;
    trigger.classList.add("bd-venue-trigger-inline");
    if (trigger.parentElement !== host) host.appendChild(trigger);
    triggers.forEach(function (item) { if (item !== trigger && !item.closest("bd-app-header")) item.remove(); });
  }

  function navigateBack(config) {
    var embeddedFrame = document.querySelector("main[data-bd-app-main] > iframe");
    var embeddedParent = null;
    if (embeddedFrame && config.parent) {
      try {
        var parentUrl = new URL(config.parent, window.location.href);
        if (parentUrl.pathname === window.location.pathname) {
          parentUrl.searchParams.set("embedded", "1");
          embeddedParent = parentUrl.pathname + parentUrl.search + parentUrl.hash;
        }
      } catch { embeddedParent = null; }
    }
    if (embeddedFrame && config.parent && typeof window.bdNavigate === "function") {
      window.bdNavigate(config.parent, { replace: true });
      return;
    }
    if (typeof window.bdNavigateBack === "function") {
      window.bdNavigateBack(config.parent || undefined);
      if (embeddedParent && embeddedFrame.contentWindow) {
        try {
          embeddedFrame.contentWindow.history.replaceState({ bdCanonicalBack: true }, "", embeddedParent);
          embeddedFrame.contentWindow.dispatchEvent(new embeddedFrame.contentWindow.PopStateEvent("popstate", { state: embeddedFrame.contentWindow.history.state }));
        } catch { /* The outer route remains authoritative. */ }
      }
      return;
    }
    var original = document.querySelector("[data-bd-back]");
    if (original) { original.click(); return; }
    if (window.history.length > 1) window.history.back();
    else if (config.parent) window.location.replace(config.parent);
  }

  class BdAppHeader extends HTMLElement {
    syncAction(config) {
      var trailing = this.querySelector(".bd-app-header-trailing");
      if (!trailing || trailing.querySelector(".bd-app-header-action")) return;
      var action = explicitAction(config);
      if (!action && config.variant === "detail") action = genericAction();
      if (action) trailing.appendChild(action.nodeType ? makeIconButton(action) : makeIconButton(null, action));
    }

    setConfig(config) {
      var signature = [currentUrl(), config.variant, config.title, config.parent || ""].join("|");
      if (this.dataset.signature === signature && this.querySelector(".bd-app-header-row")) {
        this.syncAction(config);
        return;
      }
      this.dataset.signature = signature;
      this.dataset.variant = config.variant;
      this.setAttribute("data-bd-header", HEADER_MARK);
      this.replaceChildren();

      var row = document.createElement("div");
      row.className = "bd-app-header-row";
      var leading = document.createElement("div");
      leading.className = "bd-app-header-leading";
      if (config.variant !== "root") {
        var back = document.createElement("button");
        back.type = "button";
        back.className = "bd-app-back";
        back.setAttribute("aria-label", backLabel(config));
        back.innerHTML = '<span aria-hidden="true">‹</span>';
        back.addEventListener("click", function () { navigateBack(config); });
        leading.appendChild(back);
      }
      if (config.variant === "module") {
        var mark = document.createElement("span");
        mark.className = "bd-app-module-mark";
        mark.setAttribute("aria-hidden", "true");
        var image = document.createElement("img");
        image.src = "/icons/bardoctor-mark-v159.svg";
        image.alt = "";
        mark.appendChild(image);
        leading.appendChild(mark);
      }
      var copy = document.createElement("div");
      copy.className = "bd-app-header-copy";
      if (config.variant !== "root") {
        var kicker = document.createElement("small");
        kicker.textContent = config.variant === "detail" ? "BARDOCTOR" : "МОДУЛЬ BARDOCTOR";
        copy.appendChild(kicker);
      }
      var title = document.createElement("h1");
      title.textContent = config.title;
      title.title = config.title;
      copy.appendChild(title);
      leading.appendChild(copy);
      row.appendChild(leading);

      var trailing = document.createElement("div");
      trailing.className = "bd-app-header-trailing";
      if (config.variant !== "detail") {
        var venue = document.createElement("div");
        venue.className = "bd-app-canonical-venue-host";
        venue.setAttribute("data-bd-canonical-venue-host", "");
        venue.setAttribute("data-bd-venue-host", "canonical-v247");
        trailing.appendChild(venue);
      }
      row.appendChild(trailing);
      this.appendChild(row);
      this.syncAction(config);
    }
  }

  if (!customElements.get("bd-app-header")) customElements.define("bd-app-header", BdAppHeader);

  var rendering = false;
  var scheduled = false;
  function renderShell() {
    scheduled = false;
    if (rendering) return;
    rendering = true;
    try {
      decorateTabs();
      if (isPublicOrEmbedded()) return;
      var config = resolveRoute();
      var existing = document.querySelector("body > bd-app-header");
      if (startupPending()) {
        if (existing) {
          existing.hidden = true;
          existing.setAttribute("data-bd-startup-suppressed", "v201");
        }
        document.documentElement.removeAttribute("data-bd-user-shell");
        document.documentElement.removeAttribute("data-bd-header-variant");
        return;
      }
      if (!config) { if (existing) existing.remove(); return; }
      document.documentElement.setAttribute("data-bd-user-shell", SHELL_VERSION);
      document.documentElement.setAttribute("data-bd-header-variant", config.variant);
      document.documentElement.setAttribute("data-bd-shell-mode", config.shell || "standard");
      if (config.headerMode === "owned") {
        if (existing) existing.remove();
        markLegacyHeaders();
        return;
      }
      var header = existing || document.createElement("bd-app-header");
      if (!existing) document.body.insertBefore(header, document.body.firstChild);
      header.hidden = false;
      header.removeAttribute("data-bd-startup-suppressed");
      header.setConfig(config);
      moveVenueTrigger(header, config);
      markLegacyHeaders();
      decorateTabs();
    } finally {
      rendering = false;
    }
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(renderShell);
  }

  function renderForNavigation() {
    if (rendering) scheduleRender();
    else renderShell();
  }

  window.bdAppHeaderContract = {
    version: HEADER_MARK,
    resolve: resolveRoute,
    refresh: scheduleRender,
    variants: ["root", "module", "detail"]
  };
  window.bdUserRouteInventoryV247 = window.bdNavigationContract;
  document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  window.addEventListener("popstate", renderForNavigation);
  window.addEventListener("bd:navigation-change", renderForNavigation);
  window.addEventListener("bd:startup-complete", renderForNavigation);
  window.addEventListener("bd:venue-changed", scheduleRender);
  new MutationObserver(scheduleRender).observe(document.documentElement, { childList: true, subtree: true });
  scheduleRender();
})();
