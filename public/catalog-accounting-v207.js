(function () {
  "use strict";

  var VERSION = "v207";
  var FIELD_OLD = "статья покупки";
  var FIELD_NEW = "СТАТЬЯ ЗАТРАТ";
  var ARTICLE_LABELS = {
    "Продукты": "Себестоимость — продукты питания",
    "Алкоголь": "Себестоимость — алкоголь",
    "Кухня и напитки": "Себестоимость — безалкогольные напитки",
    "Кальян": "Себестоимость — кальянная продукция",
    "Расходники": "Операционные — расходные материалы",
    "Хозтовары": "Операционные — хозяйственные материалы",
    "Ремонт": "Операционные — ремонт и обслуживание",
    "Маркетинг": "Операционные — маркетинг и реклама",
    "Оборудование": "Основные средства — оборудование",
    "Прочее": "Прочие затраты"
  };

  function normalizedText(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("ru");
  }

  function isCatalogCard() {
    if (window.location.pathname !== "/catalog") return false;
    return Array.from(document.querySelectorAll("h1,h2,h3,p,span,div"))
      .some(function (node) {
        return normalizedText(node.textContent) === "карточка номенклатуры";
      });
  }

  function optionLegacyLabel(option) {
    if (!option) return "";
    if (option.dataset.bdPurchaseArticleLegacyLabel) {
      return option.dataset.bdPurchaseArticleLegacyLabel;
    }
    var current = String(option.textContent || "").trim();
    if (Object.prototype.hasOwnProperty.call(ARTICLE_LABELS, current)) return current;
    var match = Object.keys(ARTICLE_LABELS).find(function (legacy) {
      return ARTICLE_LABELS[legacy] === current;
    });
    return match || "";
  }

  function selectLooksLikePurchaseArticle(select) {
    if (!select || select.tagName !== "SELECT") return false;
    var legacyLabels = Array.from(select.options)
      .map(optionLegacyLabel)
      .filter(Boolean);
    return legacyLabels.indexOf("Продукты") >= 0
      && legacyLabels.indexOf("Алкоголь") >= 0
      && legacyLabels.indexOf("Оборудование") >= 0
      && legacyLabels.length >= 6;
  }

  function findFieldLabel(select) {
    var node = select.parentElement;
    for (var depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      var candidates = Array.from(node.querySelectorAll("label,span,p,div"));
      var label = candidates.find(function (candidate) {
        return normalizedText(candidate.textContent) === FIELD_OLD
          || normalizedText(candidate.textContent) === normalizedText(FIELD_NEW);
      });
      if (label) return label;
    }
    return null;
  }

  function enhancePurchaseArticleSelect(select) {
    if (!selectLooksLikePurchaseArticle(select)) return false;

    Array.from(select.options).forEach(function (option) {
      var legacy = optionLegacyLabel(option);
      if (!legacy) return;
      var stableValue = option.value;
      option.dataset.bdPurchaseArticleLegacyLabel = legacy;
      var next = ARTICLE_LABELS[legacy];
      if (next && option.textContent !== next) {
        option.textContent = next;
        option.value = stableValue;
      }
    });

    var label = findFieldLabel(select);
    if (label && String(label.textContent || "").trim() !== FIELD_NEW) {
      label.textContent = FIELD_NEW;
    }

    select.setAttribute("data-bd-cost-article", VERSION);
    select.setAttribute("aria-label", "Статья затрат для управленческого учета");
    return true;
  }

  function enhanceCatalogAccounting() {
    if (!isCatalogCard()) return;
    document.querySelectorAll("select").forEach(enhancePurchaseArticleSelect);
  }

  var scheduled = false;
  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      enhanceCatalogAccounting();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  } else {
    scheduleEnhancement();
  }

  new MutationObserver(scheduleEnhancement).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  window.addEventListener("popstate", scheduleEnhancement);
  window.addEventListener("bd:navigation-change", scheduleEnhancement);
})();
