(function () {
  "use strict";

  var VERSION = "navigation-transient-v247";
  var records = new Map();
  var sequence = 0;
  var bodyOverflow = "";
  var htmlOverflow = "";
  var scrollLocked = false;
  var settling = false;

  function visible(element) {
    if (!element || !element.isConnected || element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    var style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0;
  }

  function closeControl(element) {
    var controls = Array.from(element.querySelectorAll("button,a[href]"));
    return controls.find(function (control) {
      var label = String(control.getAttribute("aria-label") || control.textContent || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("ru");
      return label === "×" || label === "закрыть" || label.startsWith("закрыть ") || label === "отмена";
    }) || null;
  }

  function routeOwnsLayer() {
    var contract = window.bdNavigationContract;
    var screen = contract && contract.resolve(window.location.href);
    if (!screen || !screen.parent) return false;
    try { return new URL(screen.parent, window.location.href).pathname === window.location.pathname; }
    catch { return false; }
  }

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    bodyOverflow = document.body.style.overflow;
    htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("bd-transient-layer-open-v247");
  }

  function unlockScrollIfIdle() {
    if (Array.from(records.values()).some(function (record) { return visible(record.element); })) return;
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflow = bodyOverflow;
    document.documentElement.style.overflow = htmlOverflow;
    document.body.classList.remove("bd-transient-layer-open-v247");
  }

  function remember(element) {
    if (!visible(element) || element.dataset.bdTransientManaged === VERSION) return;
    if (element.closest("[data-bd-static-startup]")) return;
    var close = closeControl(element);
    if (!close) return;
    var id = "transient-" + Date.now().toString(36) + "-" + (++sequence).toString(36);
    var owned = routeOwnsLayer();
    var record = {
      id: id,
      element: element,
      close: close,
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      pushed: false,
      closingByHistory: false,
      owned: owned
    };
    element.dataset.bdTransientManaged = VERSION;
    element.dataset.bdTransientId = id;
    records.set(id, record);
    lockScroll();
    if (!owned && !(window.history.state && window.history.state.bdTransientLayer)) {
      var state = Object.assign({}, window.history.state || {}, { bdTransientLayer: id, bdTransientVersion: VERSION });
      window.history.pushState(state, "", window.location.pathname + window.location.search + window.location.hash);
      record.pushed = true;
    }
    window.setTimeout(function () {
      if (!visible(element)) return;
      var focusTarget = element.querySelector("[autofocus],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href]");
      if (focusTarget instanceof HTMLElement && !element.contains(document.activeElement)) focusTarget.focus({ preventScroll: true });
    }, 0);
  }

  function cleanup() {
    if (settling) return;
    settling = true;
    window.requestAnimationFrame(function () {
      settling = false;
      records.forEach(function (record, id) {
        if (visible(record.element)) return;
        records.delete(id);
        if (record.trigger && record.trigger.isConnected) record.trigger.focus({ preventScroll: true });
        if (record.pushed && !record.closingByHistory && window.history.state && window.history.state.bdTransientLayer === id) {
          window.history.back();
        }
      });
      unlockScrollIfIdle();
    });
  }

  function scan() {
    document.querySelectorAll('[role="dialog"],[aria-modal="true"]').forEach(remember);
    cleanup();
  }

  function topRecord() {
    return Array.from(records.values()).filter(function (record) { return visible(record.element); }).pop() || null;
  }

  window.addEventListener("popstate", function () {
    var record = topRecord();
    if (!record || record.owned || !record.pushed) return;
    if (window.history.state && window.history.state.bdTransientLayer === record.id) return;
    record.closingByHistory = true;
    record.close.click();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    var record = topRecord();
    if (!record || record.element.hasAttribute("data-bd-no-escape")) return;
    event.preventDefault();
    record.close.click();
  }, true);
  document.addEventListener("DOMContentLoaded", scan, { once: true });
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "class", "style"] });
  window.bdTransientNavigationV247 = { version: VERSION, scan: scan };
  scan();
})();
