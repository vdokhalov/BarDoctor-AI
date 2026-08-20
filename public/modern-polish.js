(function modernPolishV87() {
  "use strict";

  if (window.__bdModernPolishV87) return;
  window.__bdModernPolishV87 = true;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scrollButton = document.createElement("button");
  scrollButton.type = "button";
  scrollButton.className = "bd-scroll-top";
  scrollButton.innerHTML = '<svg class="bd-scroll-top-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m18 15-6-6-6 6"></path><path d="M12 9v12"></path></svg>';
  scrollButton.setAttribute("aria-label", "Прокрутить страницу наверх");
  scrollButton.setAttribute("data-visible", "false");
  scrollButton.setAttribute("aria-hidden", "true");
  scrollButton.tabIndex = -1;

  function currentRoute() {
    return window.location.pathname || "/";
  }

  function setRouteContext() {
    document.body.dataset.bdRoute = currentRoute();
  }

  function visible(element) {
    if (!element || !element.isConnected) return false;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function scrollContainers() {
    var containers = [document.scrollingElement || document.documentElement];
    document.querySelectorAll("[data-bd-app-main]").forEach(function (element) {
      if (element.scrollHeight > element.clientHeight + 8) containers.push(element);
    });
    return containers;
  }

  function currentScrollTop() {
    return scrollContainers().reduce(function (maximum, element) {
      return Math.max(maximum, Number(element.scrollTop) || 0);
    }, window.scrollY || 0);
  }

  function modalIsOpen() {
    return Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"], .bd-venue-sheet, .bd-catalog-sheet-backdrop, .bd-procurement-sheet-backdrop')).some(visible);
  }

  function bottomOffset() {
    if (window.matchMedia("(min-width: 1024px)").matches) return 28;
    var offset = 20;
    var selectors = [
      '[data-bd-bottom-nav="responsive-v54"]',
      ".market-bottom-nav",
      ".opportunity-bottom-nav",
      ".trust-bottom-nav",
      ".push-bottom-nav",
      ".bd-venue-message",
      '[class*="bottom-24"][class*="right-6"]'
    ];
    document.querySelectorAll(selectors.join(",")).forEach(function (element) {
      if (!visible(element) || element === scrollButton) return;
      var rect = element.getBoundingClientRect();
      var occupiesRightEdge = rect.right > window.innerWidth - 150 || rect.width > window.innerWidth * 0.55;
      if (occupiesRightEdge && rect.bottom > window.innerHeight * 0.55) {
        offset = Math.max(offset, Math.ceil(window.innerHeight - rect.top + 12));
      }
    });
    return offset;
  }

  var scrollFrame = 0;
  function updateScrollButton() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = 0;
      var threshold = Math.max(560, Math.round(window.innerHeight * 0.82));
      var shouldShow = currentScrollTop() > threshold && !modalIsOpen();
      scrollButton.style.setProperty("--bd-scroll-top-offset", bottomOffset() + "px");
      scrollButton.setAttribute("data-visible", shouldShow ? "true" : "false");
      scrollButton.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      scrollButton.tabIndex = shouldShow ? 0 : -1;
    });
  }

  scrollButton.addEventListener("click", function () {
    var behavior = reducedMotion.matches ? "auto" : "smooth";
    scrollContainers().forEach(function (element) {
      element.scrollTo({ top: 0, behavior: behavior });
    });
    window.scrollTo({ top: 0, behavior: behavior });
  });

  function labelDialog(dialog) {
    if (!dialog || dialog.getAttribute("role")) return;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    var heading = dialog.querySelector("h1, h2, h3");
    if (heading) {
      if (!heading.id) heading.id = "bd-dialog-title-" + Math.random().toString(36).slice(2, 8);
      dialog.setAttribute("aria-labelledby", heading.id);
    } else {
      dialog.setAttribute("aria-label", "Диалог BarDoctor");
    }
  }

  function enhanceDialogs() {
    document.querySelectorAll(".bd-catalog-sheet, .bd-procurement-sheet, .bd-warehouse-product-sheet").forEach(labelDialog);
  }

  function enhanceTables() {
    document.querySelectorAll(".table-scroll").forEach(function (wrapper, index) {
      if (wrapper.dataset.bdTableReady) return;
      wrapper.dataset.bdTableReady = "true";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      if (!wrapper.getAttribute("aria-label")) {
        var nearbyHeading = wrapper.closest("section, article, main")?.querySelector("h1, h2, h3");
        wrapper.setAttribute("aria-label", nearbyHeading ? nearbyHeading.textContent.trim() : "Таблица данных " + (index + 1));
      }
    });
  }

  function enhanceStatusFeedback() {
    document.querySelectorAll(".notice, .bd-venue-message, [data-sonner-toast]").forEach(function (message) {
      if (!message.getAttribute("role")) message.setAttribute("role", message.classList.contains("error") ? "alert" : "status");
      message.setAttribute("aria-live", message.classList.contains("error") ? "assertive" : "polite");
    });
    document.querySelectorAll(".bd-skeleton, [data-bd-diagnosis-loading]").forEach(function (loader) {
      loader.setAttribute("aria-busy", "true");
      if (!loader.getAttribute("role")) loader.setAttribute("role", "status");
    });
  }

  function fieldHasLabel(field) {
    if (field.getAttribute("aria-label") || field.getAttribute("aria-labelledby")) return true;
    if (field.id && document.querySelector('label[for="' + CSS.escape(field.id) + '"]')) return true;
    return Boolean(field.closest("label"));
  }

  function enhanceFields() {
    var fields = Array.from(document.querySelectorAll("input, select, textarea"));
    fields.forEach(function (field, index) {
      if (field.dataset.bdFieldReady) return;
      field.dataset.bdFieldReady = "true";
      if (field.type === "number" && !field.inputMode) {
        var integerOnly = field.step === "1" || field.step === "" && !String(field.placeholder || "").match(/[.,]/);
        field.inputMode = integerOnly ? "numeric" : "decimal";
      }
      if (field.type === "tel" && !field.inputMode) field.inputMode = "tel";
      if (field.type === "email" && !field.inputMode) field.inputMode = "email";
      if (field.type === "search" && !field.inputMode) field.inputMode = "search";
      if (!field.getAttribute("enterkeyhint")) field.setAttribute("enterkeyhint", index === fields.length - 1 ? "done" : "next");
      if (!fieldHasLabel(field) && field.placeholder) field.setAttribute("aria-label", field.placeholder);
    });
  }

  function enhanceDirtyState() {
    document.querySelectorAll("form").forEach(function (form) {
      if (form.dataset.bdDirtyReady) return;
      var fields = form.querySelectorAll("input:not([type=hidden]), select, textarea");
      var submit = form.querySelector('button[type="submit"], input[type="submit"]');
      if (!submit || fields.length < 4) return;
      form.dataset.bdDirtyReady = "true";
      var status = document.createElement("span");
      status.className = "bd-dirty-state";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Есть несохранённые изменения";
      status.hidden = true;
      submit.parentElement.insertBefore(status, submit);
      form.addEventListener("input", function () {
        form.dataset.bdDirty = "true";
        status.hidden = false;
      });
      form.addEventListener("reset", function () {
        form.dataset.bdDirty = "false";
        status.hidden = true;
      });
    });
  }

  function stickyTopFor(element) {
    var top = 0;
    document.querySelectorAll("header, .sticky.top-0").forEach(function (candidate) {
      if (candidate === element || candidate.contains(element) || !visible(candidate)) return;
      var style = window.getComputedStyle(candidate);
      var rect = candidate.getBoundingClientRect();
      if ((style.position === "sticky" || style.position === "fixed") && rect.top <= 2 && rect.bottom > 0) top = Math.max(top, Math.round(rect.bottom));
    });
    return top;
  }

  function periodCandidate() {
    if (currentRoute() !== "/finance" && currentRoute() !== "/reports") return null;
    return Array.from(document.querySelectorAll("main div, [data-bd-app-main] div")).find(function (element) {
      var text = element.textContent || "";
      var directButtons = Array.from(element.children).filter(function (child) { return child.tagName === "BUTTON"; });
      return directButtons.length >= 2 && directButtons.length <= 8 && /недел|месяц|период/i.test(text) && text.length < 220;
    }) || null;
  }

  function enhanceStickyContext() {
    document.querySelectorAll(".bd-sticky-context").forEach(function (element) {
      element.classList.remove("bd-sticky-context");
      element.style.removeProperty("--bd-sticky-top");
    });
    var pageIsLong = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) > window.innerHeight * 1.45;
    if (!pageIsLong) return;
    var candidates = [periodCandidate()];
    document.querySelectorAll(".bd-catalog-tabs, .bd-procurement-tabs, .bd-warehouse-tabs, .bd-team-controls").forEach(function (element) {
      candidates.push(element);
    });
    candidates.filter(Boolean).forEach(function (element) {
      element.classList.add("bd-sticky-context");
      element.style.setProperty("--bd-sticky-top", stickyTopFor(element) + "px");
    });
  }

  function classifyAiSection(element) {
    var text = (element.textContent || "").trim();
    if (element.querySelector('[data-bd-ai-recommendations="recommendation-outcomes-v50"]') || element.matches('[data-bd-ai-recommendations="recommendation-outcomes-v50"]')) return { key: "action-check", order: 50 };
    if (element.querySelector('[data-bd-ai-areas="diagnosis-specificity-v46"]') || element.matches('[data-bd-ai-areas="diagnosis-specificity-v46"]')) return { key: "details", order: 60 };
    if (/Приоритет №1/i.test(text)) return { key: "problem", order: 10 };
    if (/Управленческий диагноз/i.test(text)) return { key: "problem-context", order: 15 };
    if (/Почему это важно/i.test(text)) return { key: "reason", order: 20 };
    if (/Финансовая оценка|Финансовый эффект|Что будет, если не менять/i.test(text)) return { key: "financial-effect", order: 30 };
    if (/Что делать дальше|Краткий план/i.test(text)) return { key: "action", order: 40 };
    if (/Что вошло в диагноз|Повторяющийся паттерн/i.test(text)) return { key: "details", order: 70 };
    if (/Обновить диагноз/i.test(text)) return { key: "refresh", order: 90 };
    return { key: "details", order: 75 };
  }

  function enhanceAiOrder() {
    document.querySelectorAll('[data-bd-ai-result="scan-order-v86"]').forEach(function (root) {
      var children = Array.from(root.children);
      var ordered = children.map(function (element, index) {
        var classification = classifyAiSection(element);
        element.dataset.bdAiSection = classification.key;
        return { element: element, order: classification.order, index: index };
      }).sort(function (left, right) {
        return left.order - right.order || left.index - right.index;
      });
      var differs = ordered.some(function (item, index) { return root.children[index] !== item.element; });
      if (differs) ordered.forEach(function (item) { root.appendChild(item.element); });
    });
  }

  var enhanceFrame = 0;
  function enhance() {
    if (enhanceFrame) return;
    enhanceFrame = window.requestAnimationFrame(function () {
      enhanceFrame = 0;
      setRouteContext();
      enhanceDialogs();
      enhanceTables();
      enhanceStatusFeedback();
      enhanceFields();
      enhanceDirtyState();
      enhanceAiOrder();
      enhanceStickyContext();
      updateScrollButton();
    });
  }

  var nativePushState = history.pushState;
  var nativeReplaceState = history.replaceState;
  history.pushState = function () {
    var result = nativePushState.apply(this, arguments);
    window.dispatchEvent(new Event("bd:routechange"));
    return result;
  };
  history.replaceState = function () {
    var result = nativeReplaceState.apply(this, arguments);
    window.dispatchEvent(new Event("bd:routechange"));
    return result;
  };

  document.body.appendChild(scrollButton);
  window.addEventListener("scroll", updateScrollButton, { passive: true, capture: true });
  window.addEventListener("resize", enhance, { passive: true });
  window.addEventListener("popstate", enhance);
  window.addEventListener("bd:routechange", enhance);
  reducedMotion.addEventListener?.("change", updateScrollButton);

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();
