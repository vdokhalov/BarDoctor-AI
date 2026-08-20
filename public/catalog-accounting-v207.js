(function () {
  "use strict";

  var VERSION = "v208";
  var FIELD_OLD = "статья покупки";
  var FIELD_NEW = "СТАТЬЯ ЗАТРАТ";
  var ARTICLE_META = {
    "Продукты": { label: "Продукты питания", group: "Себестоимость" },
    "Алкоголь": { label: "Алкоголь", group: "Себестоимость" },
    "Кухня и напитки": { label: "Безалкогольные напитки", group: "Себестоимость" },
    "Кальян": { label: "Кальянная продукция", group: "Себестоимость" },
    "Расходники": { label: "Расходные материалы", group: "Операционные затраты" },
    "Хозтовары": { label: "Хозяйственные материалы", group: "Операционные затраты" },
    "Ремонт": { label: "Ремонт и обслуживание", group: "Операционные затраты" },
    "Маркетинг": { label: "Маркетинг и реклама", group: "Операционные затраты" },
    "Оборудование": { label: "Оборудование", group: "Основные средства" },
    "Прочее": { label: "Прочие затраты", group: "Прочее" }
  };
  var GROUP_ORDER = ["Себестоимость", "Операционные затраты", "Основные средства", "Прочее"];

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
    if (option.dataset.bdPurchaseArticleLegacyLabel) return option.dataset.bdPurchaseArticleLegacyLabel;
    var current = String(option.textContent || "").trim();
    if (Object.prototype.hasOwnProperty.call(ARTICLE_META, current)) return current;
    return Object.keys(ARTICLE_META).find(function (legacy) {
      return ARTICLE_META[legacy].label === current;
    }) || "";
  }

  function selectLooksLikePurchaseArticle(select) {
    if (!select || select.tagName !== "SELECT") return false;
    var legacyLabels = Array.from(select.options).map(optionLegacyLabel).filter(Boolean);
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

  function groupOptions(select) {
    if (select.getAttribute("data-bd-cost-groups") === VERSION) return;

    var selectedValue = select.value;
    var options = Array.from(select.options);
    var groups = {};
    GROUP_ORDER.forEach(function (name) {
      var group = document.createElement("optgroup");
      group.label = name;
      groups[name] = group;
    });

    var remainder = [];
    options.forEach(function (option) {
      var legacy = optionLegacyLabel(option);
      if (!legacy || !ARTICLE_META[legacy]) {
        remainder.push(option);
        return;
      }
      var stableValue = option.value;
      option.dataset.bdPurchaseArticleLegacyLabel = legacy;
      option.textContent = ARTICLE_META[legacy].label;
      option.value = stableValue;
      groups[ARTICLE_META[legacy].group].appendChild(option);
    });

    while (select.firstChild) select.removeChild(select.firstChild);
    remainder.forEach(function (option) { select.appendChild(option); });
    GROUP_ORDER.forEach(function (name) {
      if (groups[name].children.length) select.appendChild(groups[name]);
    });
    select.value = selectedValue;
    select.setAttribute("data-bd-cost-groups", VERSION);
  }

  function enhancePurchaseArticleSelect(select) {
    if (!selectLooksLikePurchaseArticle(select)) return false;

    Array.from(select.options).forEach(function (option) {
      var legacy = optionLegacyLabel(option);
      if (!legacy || !ARTICLE_META[legacy]) return;
      var stableValue = option.value;
      option.dataset.bdPurchaseArticleLegacyLabel = legacy;
      option.textContent = ARTICLE_META[legacy].label;
      option.value = stableValue;
    });

    groupOptions(select);

    var label = findFieldLabel(select);
    if (label && String(label.textContent || "").trim() !== FIELD_NEW) label.textContent = FIELD_NEW;

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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  else scheduleEnhancement();

  new MutationObserver(scheduleEnhancement).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleEnhancement);
  window.addEventListener("bd:navigation-change", scheduleEnhancement);
})();
