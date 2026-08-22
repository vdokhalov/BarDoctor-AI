(function () {
  "use strict";

  window.bdStandaloneNavigationAsset = "bd-route-context-v247";
  document.documentElement.dataset.bdRouteContext = "v247";
  if (window.top !== window.self || new URLSearchParams(window.location.search).get("embedded") === "1") return;

  var parentRoute = document.body && document.body.dataset.bdParentRoute;
  if (!parentRoute) return;
  var contract = window.bdNavigationContract;
  if (contract && (!contract.isRegistered(parentRoute) || !contract.isSafeInternal(parentRoute))) parentRoute = "/home";

  var navigationVersion = "standalone-navigation-v247";
  var venueId = localStorage.getItem("bd_active_venue_id") || "";
  var currentUrl = window.location.pathname + window.location.search + window.location.hash;
  var state = window.history.state && typeof window.history.state === "object"
    ? window.history.state
    : {};

  function navigationEntryId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  var navigationSeeded = Boolean(state.bdStandaloneEntry);
  try {
    if (!state.bdStandaloneEntry) {
      var parentEntryId = navigationEntryId();
      window.history.replaceState({
        bdStandaloneEntry: parentEntryId,
        bdVenueId: venueId,
        bdNavigationVersion: navigationVersion,
        bdSyntheticParent: true
      }, "", parentRoute);
      window.history.pushState({
        bdStandaloneEntry: navigationEntryId(),
        bdPreviousEntryId: parentEntryId,
        bdPreviousUrl: parentRoute,
        bdVenueId: venueId,
        bdNavigationVersion: navigationVersion
      }, "", currentUrl);
      navigationSeeded = true;
    }
  } catch {
    navigationSeeded = false;
  }
  document.documentElement.dataset.bdRouteContextSeeded = navigationSeeded ? "true" : "false";

  var formBaselines = new WeakMap();
  var saveIntent = 0;
  var ignoreNextPopstate = false;

  function formSignature(form) {
    return Array.from(form.elements || [])
      .filter(function (control) {
        return control.name && !control.disabled && !["button", "submit", "reset"].includes((control.type || "").toLowerCase());
      })
      .map(function (control) {
        var value = control.type === "checkbox" || control.type === "radio"
          ? (control.checked ? "1" : "0")
          : control.value;
        return [control.name, control.type || control.tagName, value].join("=");
      })
      .join("&");
  }

  function rememberBaselines() {
    document.querySelectorAll("form").forEach(function (form) {
      formBaselines.set(form, formSignature(form));
      form.removeAttribute("data-bd-unsaved-changes");
    });
  }

  function dirtyForms() {
    return Array.from(document.querySelectorAll("form")).filter(function (form) {
      if (!formBaselines.has(form)) formBaselines.set(form, formSignature(form));
      return formBaselines.get(form) !== formSignature(form);
    });
  }

  function confirmDiscard() {
    if (Date.now() < saveIntent || dirtyForms().length === 0) return true;
    if (!window.confirm("Изменения не сохранены. Выйти без сохранения?")) return false;
    rememberBaselines();
    return true;
  }

  function markSaved() {
    saveIntent = 0;
    rememberBaselines();
  }

  window.bdStandaloneNavigation = {
    confirmDiscard: confirmDiscard,
    markSaved: markSaved,
    parentRoute: parentRoute,
    navigationSeeded: navigationSeeded
  };

  window.setTimeout(rememberBaselines, 0);
  document.addEventListener("input", function (event) {
    var form = event.target && event.target.form;
    if (form && !formBaselines.has(form)) formBaselines.set(form, formSignature(form));
  }, true);
  document.addEventListener("submit", function () {
    saveIntent = Date.now() + 30000;
  }, true);
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    var url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
    if (!confirmDiscard()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (anchor.hasAttribute("data-bd-back")) {
      event.preventDefault();
      var currentState = window.history.state || {};
      var sameVenue = !currentState.bdVenueId || !venueId || String(currentState.bdVenueId) === String(venueId);
      var safePrevious = !contract || contract.isSafeInternal(currentState.bdPreviousUrl);
      if (currentState.bdPreviousEntryId && currentState.bdPreviousUrl && sameVenue && safePrevious) window.history.back();
      else window.location.replace(parentRoute);
    }
  }, true);
  window.addEventListener("beforeunload", function (event) {
    if (Date.now() < saveIntent || dirtyForms().length === 0) return;
    event.preventDefault();
    event.returnValue = "";
  });
  window.addEventListener("popstate", function () {
    if (ignoreNextPopstate) {
      ignoreNextPopstate = false;
      return;
    }
    if (confirmDiscard()) return;
    ignoreNextPopstate = true;
    window.history.forward();
  });

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function () {
    var init = arguments[1] || {};
    var method = String(init.method || "GET").toUpperCase();
    var request = nativeFetch.apply(null, arguments);
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return request;
    saveIntent = Date.now() + 30000;
    return request.then(function (response) {
      if (response.ok) window.setTimeout(markSaved, 0);
      else saveIntent = 0;
      return response;
    }, function (error) {
      saveIntent = 0;
      throw error;
    });
  };
})();
