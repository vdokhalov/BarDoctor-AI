(function () {
  "use strict";
  function mount() {
    if (location.pathname !== "/settings" || document.querySelector("[data-sales-accounting-entry]")) return;
    var card = document.querySelector(".bd-settings-card-v182");
    if (!card) return;
    var link = document.createElement("a");
    link.href = "/settings/sales-accounting";
    link.className = "bd-settings-row-v182 is-action";
    link.dataset.salesAccountingEntry = "true";
    link.style.textDecoration = "none";
    var icon = document.createElement("span"); icon.className = "bd-settings-row-icon-v182"; icon.textContent = "▤";
    var copy = document.createElement("span"); copy.className = "bd-settings-row-copy-v182";
    var title = document.createElement("strong"); title.textContent = "Как учитывать продажи";
    var detail = document.createElement("span"); detail.textContent = "Касса BarDoctor или ввод итогов вручную";
    copy.append(title, detail); link.append(icon, copy); card.append(link);
  }
  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();
