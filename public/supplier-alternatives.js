(function () {
  "use strict";

  var searchPlan = [];
  var currentData = null;
  var activeView = { name: "positions" };
  var query = "";
  var activeFilter = "all";
  var selectedSupplier = "all";
  var searchRunning = false;
  var positionsScrollTop = 0;
  var localQaFixture = /^(terminal\.local|127\.0\.0\.1|localhost)$/.test(location.hostname) && new URLSearchParams(location.search).get("fixture") === "supplier-management-v330";
  var $ = function (selector) { return document.querySelector(selector); };

  function element(tag, className, textValue) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }

  function headers(extra) {
    var result = new Headers(extra || {});
    var venue = localStorage.getItem("bd_active_venue_id");
    if (venue) result.set("X-Venue-Id", venue);
    return result;
  }

  async function api(method, body) {
    var response = await fetch("/api/supplier-alternatives", {
      method: method,
      headers: headers({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    var json = await response.json().catch(function () { return {}; });
    if (!response.ok || json.ok === false) throw new Error(json.error || "Не удалось выполнить запрос");
    return json;
  }

  function normal(value) {
    return String(value || "").toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
  }

  function canonicalUrl(value) {
    try {
      var url = new URL(String(value || ""));
      url.hash = "";
      url.search = "";
      return (url.origin + url.pathname.replace(/\/$/, "")).toLocaleLowerCase("en");
    } catch (_) {
      return String(value || "").replace(/[?#].*$/, "").replace(/\/$/, "").toLocaleLowerCase("en");
    }
  }

  function deduplicate(offers) {
    var selected = new Map();
    (offers || []).forEach(function (offer) {
      var identity = [normal(offer.matchedTo), normal(offer.supplierName), normal(offer.product), canonicalUrl((offer.sourceUrls || [])[0])].join("|");
      var current = selected.get(identity);
      var rank = { confirmed: 0, checking: 1, new: 2, dismissed: 3 };
      if (!current) selected.set(identity, offer);
      else if ((rank[offer.decision] === undefined ? 9 : rank[offer.decision]) < (rank[current.decision] === undefined ? 9 : rank[current.decision])) {
        selected.set(identity, Object.assign({}, current, {
          id: offer.id || current.id,
          decision: offer.decision,
          sourceUrls: Array.from(new Set((current.sourceUrls || []).concat(offer.sourceUrls || []))),
        }));
      }
    });
    return Array.from(selected.values());
  }

  function packageIdentity(offer) {
    var packageSize = String(offer.packageSize || "").trim();
    var unit = String(offer.unit || "").trim();
    var raw = (packageSize + " " + unit).toLocaleLowerCase("ru").replace(",", ".");
    var match = raw.match(/(\d+(?:\.\d+)?)\s*(ml|мл|l|л|kg|кг|g|гр|г)\b/i);
    if (!match) return { key: null, label: [packageSize, unit].filter(Boolean).join(" · ") || "Фасовка не указана" };
    var amount = Number(match[1]);
    var sourceUnit = match[2].toLocaleLowerCase("ru");
    var volume = ["ml", "мл", "l", "л"].indexOf(sourceUnit) !== -1;
    var baseAmount = volume ? amount * (["l", "л"].indexOf(sourceUnit) !== -1 ? 1000 : 1) : amount * (["kg", "кг"].indexOf(sourceUnit) !== -1 ? 1000 : 1);
    return { key: (Math.round(baseAmount * 1000) / 1000) + (volume ? "ml" : "g"), label: packageSize || amount + " " + sourceUnit };
  }

  function comparisonKey(offer) {
    var packageKey = packageIdentity(offer).key;
    var currency = String(offer.currency || "").toUpperCase();
    return packageKey && currency ? currency + "|" + packageKey : null;
  }

  function groupPositions(offers) {
    var grouped = new Map();
    deduplicate(offers).filter(function (offer) { return offer.decision !== "dismissed"; }).forEach(function (offer) {
      var key = normal(offer.matchedTo);
      if (!key) return;
      var group = grouped.get(key) || { key: key, internalPosition: offer.matchedTo, offers: [] };
      group.offers.push(offer);
      grouped.set(key, group);
    });
    return Array.from(grouped.values()).map(function (group) {
      var buckets = new Map();
      group.offers.forEach(function (offer) {
        var key = comparisonKey(offer);
        if (key) buckets.set(key, (buckets.get(key) || []).concat(offer));
      });
      var ranked = Array.from(buckets.entries()).sort(function (a, b) { return b[1].length - a[1].length; });
      var reference = ranked.length ? ranked[0][0] : null;
      var comparable = ranked.length ? ranked[0][1] : [];
      comparable.sort(function (a, b) { return Number(a.candidatePrice || Infinity) - Number(b.candidatePrice || Infinity); });
      var best = comparable[0] || null;
      group.offerCount = group.offers.length;
      group.supplierCount = new Set(group.offers.map(function (offer) { return normal(offer.supplierName); })).size;
      group.bestOfferId = best ? best.id : null;
      group.bestAmount = best ? Number(best.candidatePrice) : null;
      group.bestCurrency = best ? String(best.currency || "").toUpperCase() : null;
      group.bestPackageLabel = best ? packageIdentity(best).label : null;
      group.mixedPackages = buckets.size > 1 || group.offers.some(function (offer) { return !comparisonKey(offer); });
      group.offers.sort(function (a, b) {
        var ranks = { confirmed: 0, checking: 1, new: 2 };
        var status = (ranks[a.decision] === undefined ? 2 : ranks[a.decision]) - (ranks[b.decision] === undefined ? 2 : ranks[b.decision]);
        if (status) return status;
        var aComparable = reference && comparisonKey(a) === reference ? 0 : 1;
        var bComparable = reference && comparisonKey(b) === reference ? 0 : 1;
        if (aComparable !== bComparable) return aComparable - bComparable;
        if (comparisonKey(a) && comparisonKey(a) === comparisonKey(b)) return Number(a.candidatePrice || Infinity) - Number(b.candidatePrice || Infinity);
        return String(b.verifiedAt || "").localeCompare(String(a.verifiedAt || ""));
      });
      return group;
    }).sort(function (a, b) { return a.internalPosition.localeCompare(b.internalPosition, "ru"); });
  }

  function qaFixtureData() {
    var positions = [
      ["OLMECA SILVER", "Tequila OLMECA Silver 35% 0.7L"],
      ["SIERRA SILVER", "Sierra Silver Tequila 38% 0.7L"],
      ["BACARDI WHITE", "Bacardi Carta Blanca 0.7L"],
      ["JAMESON 0.7", "Jameson Irish Whiskey 0.7L"],
      ["CAPTAIN MORGAN", "Captain Morgan Spiced Gold 0.7L"],
      ["RED BULL 0.25", "Red Bull Energy Drink 250 ml"],
      ["APEROL 1L", "Aperol Aperitivo 1L"],
      ["MARTINI BIANCO", "Martini Bianco Vermouth 1L"],
      ["FINLANDIA 0.7", "Finlandia Vodka 0.7L"],
    ];
    var suppliers = ["AlcoHall", "WineTime", "Metro Drinks", "HoReCa Market"];
    var offers = [];
    positions.forEach(function (position, positionIndex) {
      var count = positionIndex < 3 ? [3, 2, 4][positionIndex] : (positionIndex < 7 || positionIndex === 8 ? 1 : 2);
      for (var index = 0; index < count; index += 1) {
        offers.push({
          id: "qa-" + positionIndex + "-" + index,
          matchedTo: position[0],
          product: position[1],
          supplierName: suppliers[(positionIndex + index) % suppliers.length],
          candidatePrice: 299 + positionIndex * 21 + index * 13,
          currentPrice: null,
          currency: "MDL",
          packageSize: /1L/.test(position[1]) ? "1 L" : /250/.test(position[1]) ? "250 ml" : "0.7 L",
          unit: "за упаковку",
          minimumOrder: index === 1 ? "6 бутылок" : "1 бутылка",
          delivery: "Не указано",
          availability: index === 2 ? "Уточнить" : "В наличии",
          offerType: index === 3 ? "B2B" : "Публичная цена",
          verifiedAt: "2026-08-25",
          matchType: "exact_product",
          matchEvidence: "Совпадают бренд, линейка и фасовка",
          sellerType: index === 3 ? "wholesaler" : "retailer",
          sourceUrls: ["https://supplier.example/" + positionIndex + "/" + index],
          decision: index === 1 ? "checking" : index === 0 ? "confirmed" : "new",
          caveats: index === 2 ? ["Наличие требует повторной проверки"] : [],
        });
      }
    });
    return {
      generatedAt: "2026-08-25T12:00:00.000Z",
      targetCount: 54,
      coveredTargetCount: 9,
      alternatives: offers,
      positionGroups: groupPositions(offers),
      uncoveredTargets: ["Chivas Regal 12 0.7", "Hennessy VS 0.7", "Martini Rosso 1L", "Schweppes Tonic 1L", "Coca-Cola Zero 1.25L"].concat(Array.from({ length: 40 }, function (_, index) { return "Закупочная позиция " + (index + 6); })),
    };
  }

  function groups() {
    if (!currentData) return [];
    return Array.isArray(currentData.positionGroups) ? currentData.positionGroups : groupPositions(currentData.alternatives || []);
  }

  function plural(value, one, few, many) {
    var mod10 = value % 10;
    var mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function money(value, currency) {
    return typeof value === "number" && Number.isFinite(value)
      ? value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " " + String(currency || "")
      : "нет данных";
  }

  function formatDate(value) {
    if (!value) return "дата не указана";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  }

  function updateSnapshotStatus(message, tone) {
    var node = $("#snapshot-status");
    node.textContent = message;
    var bar = node.closest(".snapshot-bar");
    bar.classList.toggle("is-error", tone === "error");
    bar.classList.toggle("is-searching", tone === "searching");
  }

  function setTitle(title, main) {
    $("#page-title").textContent = title;
    var back = $("#back");
    back.href = main ? "/suppliers" : "#";
    if (main) back.setAttribute("data-bd-back", "");
    else back.removeAttribute("data-bd-back");
  }

  function setView(name, payload) {
    var previousView = activeView.name;
    if (previousView === "positions" && name !== "positions") positionsScrollTop = window.scrollY || window.pageYOffset || 0;
    activeView = Object.assign({ name: name }, payload || {});
    render();
    window.requestAnimationFrame(function () {
      window.scrollTo({ top: name === "positions" && previousView !== "positions" ? positionsScrollTop : 0, behavior: "instant" });
    });
  }

  function emptyState(title, copy, actionLabel, action) {
    var box = element("section", "empty-state");
    box.append(element("h2", "", title), element("p", "", copy));
    if (actionLabel) {
      var button = element("button", "primary-button", actionLabel);
      button.type = "button";
      button.onclick = action;
      box.append(button);
    }
    return box;
  }

  function metric(value, label, secondary, tone) {
    var node = element("div", "kpi" + (tone ? " " + tone : ""));
    node.append(element("span", "", label), element("strong", "", value));
    if (secondary) node.append(element("small", "", secondary));
    return node;
  }

  function renderKpis(root, positionGroups) {
    var targets = Number(currentData.targetCount || 0);
    var covered = Number(currentData.coveredTargetCount || positionGroups.length);
    var visibleOffers = deduplicate(currentData.alternatives || []).filter(function (offer) { return offer.decision !== "dismissed"; });
    var suppliers = new Set(visibleOffers.map(function (offer) { return normal(offer.supplierName); }).filter(Boolean));
    var grid = element("section", "kpi-grid");
    grid.append(
      metric(covered + "/" + targets, "Охват", targets ? Math.round(covered / targets * 100) + "%" : "0%", "success"),
      metric(String(visibleOffers.length), "Предложения", "сохранено"),
      metric(String(suppliers.size), "Поставщики", "активных"),
      metric(String(Math.max(0, targets - covered)), "Без предложений", "позиций", "warning")
    );
    root.append(grid);
  }

  function renderTools(root, positionGroups) {
    var suppliers = Array.from(new Set(positionGroups.flatMap(function (group) { return group.offers.map(function (offer) { return offer.supplierName; }); }))).filter(Boolean).sort();
    var tools = element("section", "tools");
    var search = element("label", "search-field");
    search.setAttribute("aria-label", "Поиск по товарам и поставщикам");
    var input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Найти товар или поставщика";
    input.value = query;
    input.oninput = function () { query = input.value; render(); };
    search.append(input);
    var filterButton = element("button", "filter-button", "Фильтры");
    filterButton.type = "button";
    filterButton.setAttribute("aria-expanded", String(activeFilter !== "all" || selectedSupplier !== "all"));
    filterButton.onclick = function () {
      var panel = $("#filter-panel");
      panel.hidden = !panel.hidden;
      filterButton.setAttribute("aria-expanded", String(!panel.hidden));
    };
    tools.append(search, filterButton);
    var panel = element("div", "filter-panel");
    panel.id = "filter-panel";
    panel.hidden = true;
    var filterSelect = document.createElement("select");
    filterSelect.setAttribute("aria-label", "Фильтр предложений");
    [
      ["all", "Все позиции"], ["checking", "В проверке"], ["confirmed", "Подтверждено"],
      ["available", "В наличии"], ["public", "Публичная цена"], ["b2b", "B2B"], ["no-offers", "Без предложений"]
    ].forEach(function (option) { filterSelect.append(new Option(option[1], option[0])); });
    filterSelect.value = activeFilter;
    filterSelect.onchange = function () {
      activeFilter = filterSelect.value;
      if (activeFilter === "no-offers") setView("missing"); else render();
    };
    var supplierSelect = document.createElement("select");
    supplierSelect.setAttribute("aria-label", "Поставщик");
    supplierSelect.append(new Option("Все поставщики", "all"));
    suppliers.forEach(function (supplier) { supplierSelect.append(new Option(supplier, supplier)); });
    supplierSelect.value = selectedSupplier;
    supplierSelect.onchange = function () { selectedSupplier = supplierSelect.value; render(); };
    panel.append(filterSelect, supplierSelect);
    tools.append(panel);
    root.append(tools);
  }

  function offerMatchesFilter(offer) {
    if (selectedSupplier !== "all" && offer.supplierName !== selectedSupplier) return false;
    if (activeFilter === "checking" || activeFilter === "confirmed") return offer.decision === activeFilter;
    if (activeFilter === "available") return /в наличии|available|есть/i.test(String(offer.availability || offer.offer || ""));
    if (activeFilter === "public") return !offer.offerType || /публич/i.test(String(offer.offerType));
    if (activeFilter === "b2b") return /b2b|опт|wholesale|distributor|дистриб/i.test([offer.offerType, offer.sellerType, offer.sellerTypeEvidence].join(" "));
    return true;
  }

  function statusLabel(decision) {
    if (decision === "confirmed") return "Подтверждено";
    if (decision === "checking") return "В проверке";
    if (decision === "dismissed") return "Не подходит";
    return "Требует проверки";
  }

  function renderPositionCard(group) {
    var card = element("article", "position-card");
    var copy = element("button", "position-main");
    copy.type = "button";
    copy.onclick = function () { setView("comparison", { groupKey: group.key }); };
    var meta = element("div", "position-copy");
    meta.append(
      element("h3", "", group.internalPosition),
      element("p", "", group.offerCount + " " + plural(group.offerCount, "предложение", "предложения", "предложений") + " · " + group.supplierCount + " " + plural(group.supplierCount, "поставщик", "поставщика", "поставщиков"))
    );
    var priceText = group.bestAmount !== null && !group.mixedPackages
      ? "от " + money(group.bestAmount, group.bestCurrency)
      : group.bestAmount !== null ? money(group.bestAmount, group.bestCurrency) + " · " + (group.bestPackageLabel || "фасовка") : "Цену нужно сравнить";
    meta.append(element("strong", "best-price", priceText));
    copy.append(meta);
    var side = element("div", "position-side");
    var statuses = element("div", "position-badges");
    var available = group.offers.some(function (offer) { return /в наличии|available|есть/i.test(String(offer.availability || offer.offer || "")); });
    var publicOffer = group.offers.some(function (offer) { return !offer.offerType || /публич/i.test(String(offer.offerType)); });
    if (publicOffer) statuses.append(element("span", "badge neutral", "Публичная цена"));
    if (available) statuses.append(element("span", "badge success", "В наличии"));
    side.append(statuses);
    var compare = element("button", "compare-button", "Сравнить");
    compare.type = "button";
    compare.onclick = function () { setView("comparison", { groupKey: group.key }); };
    side.append(compare);
    card.append(copy, side);
    return card;
  }

  function renderPositions(root) {
    setTitle("Новые поставщики", true);
    $("#refresh").hidden = false;
    if (!currentData) {
      root.append(emptyState("Предложения ещё не найдены", "BarDoctor проверит точные позиции активного ассортимента и сохранит найденные предложения на сервере.", "Запустить поиск", runFullSearch));
      return;
    }
    var positionGroups = groups();
    renderKpis(root, positionGroups);
    renderTools(root, positionGroups);
    var heading = element("div", "section-heading");
    heading.append(element("h2", "", "По внутренней позиции"), element("span", "", positionGroups.length + " поз."));
    root.append(heading);
    var needle = normal(query);
    var visible = positionGroups.filter(function (group) {
      var filteredOffers = group.offers.filter(offerMatchesFilter);
      if (!filteredOffers.length && (activeFilter !== "all" || selectedSupplier !== "all")) return false;
      if (!needle) return true;
      return normal([group.internalPosition].concat(group.offers.map(function (offer) { return [offer.product, offer.supplierName, offer.sku, offer.barcode].join(" "); })).join(" ")).indexOf(needle) !== -1;
    });
    var list = element("section", "position-list");
    visible.forEach(function (group) { list.append(renderPositionCard(group)); });
    if (!visible.length) list.append(emptyState("Ничего не найдено", "Измените запрос или фильтры. Сохранённые предложения не удалены."));
    root.append(list);
    var missingCount = Math.max(0, Number(currentData.targetCount || 0) - Number(currentData.coveredTargetCount || positionGroups.length));
    if (missingCount) {
      var missing = element("button", "missing-row");
      missing.type = "button";
      missing.append(element("span", "", "Без предложений"), element("strong", "", missingCount + " позиций"), element("i", "", "›"));
      missing.onclick = function () { setView("missing"); };
      root.append(missing);
    }
    root.append(element("p", "info-row", "Результаты сохраняются автоматически. Новый поиск не скрывает уже найденные предложения."));
  }

  function findGroup(key) {
    return groups().find(function (group) { return group.key === key; });
  }

  function availabilityText(offer) {
    var explicit = String(offer.availability || "").trim();
    if (explicit && explicit !== "Уточнить") return explicit;
    return /в наличии|available|есть/i.test(String(offer.offer || "")) ? "В наличии" : "Уточнить";
  }

  function renderComparison(root) {
    var group = findGroup(activeView.groupKey);
    if (!group) return setView("positions");
    setTitle(group.internalPosition, false);
    $("#refresh").hidden = true;
    var header = element("section", "comparison-summary");
    var summary = group.offerCount + " " + plural(group.offerCount, "предложение", "предложения", "предложений");
    if (group.bestAmount !== null && !group.mixedPackages) summary += " · лучшая цена " + money(group.bestAmount, group.bestCurrency);
    else if (group.mixedPackages) summary += " · фасовки сравниваются отдельно";
    header.append(element("strong", "", summary), element("p", "", "Internal position: " + group.internalPosition));
    root.append(header);
    var labels = element("div", "comparison-labels");
    ["Поставщик", "Цена", "Наличие", "Мин. заказ"].forEach(function (label) { labels.append(element("span", "", label)); });
    root.append(labels);
    var list = element("section", "offer-list");
    group.offers.forEach(function (offer) {
      var card = element("article", "offer-row" + (offer.id === group.bestOfferId && !group.mixedPackages ? " is-best" : ""));
      if (offer.id === group.bestOfferId && !group.mixedPackages) card.append(element("span", "best-label", "Лучшая цена"));
      var supplier = element("div", "supplier-cell");
      supplier.append(element("strong", "", offer.supplierName || "Поставщик"), element("small", "status " + (offer.decision || "new"), statusLabel(offer.decision)));
      var price = element("div", "price-cell");
      price.append(element("strong", "", money(Number(offer.candidatePrice), offer.currency)), element("small", "", packageIdentity(offer).label));
      var availability = element("span", "availability " + (/в наличии/i.test(availabilityText(offer)) ? "available" : "unknown"), availabilityText(offer));
      var minimum = element("span", "minimum", offer.minimumOrder || "Не указано");
      var open = element("button", "open-offer", offer.decision === "checking" ? "В проверке" : "Открыть");
      open.type = "button";
      open.onclick = function () { setView("offer", { groupKey: group.key, offerId: offer.id }); };
      card.append(supplier, price, availability, minimum, open);
      list.append(card);
    });
    root.append(list);
    root.append(element("p", "info-row", "Оригинальная валюта и фасовка поставщика сохранены. Разные упаковки не сравниваются как одинаковые."));
  }

  function detailRow(label, value, className) {
    var row = element("div", "detail-row" + (className ? " " + className : ""));
    row.append(element("span", "", label), element("strong", "", value));
    return row;
  }

  function safePhone(value) {
    return String(value || "").replace(/[^+\d]/g, "");
  }

  function contactLink(href, label, className) {
    var link = element("a", "contact-action " + className, label);
    link.href = href;
    if (/^https?:/i.test(href)) { link.target = "_blank"; link.rel = "noreferrer"; }
    return link;
  }

  function renderOffer(root) {
    var group = findGroup(activeView.groupKey);
    var offer = group && group.offers.find(function (item) { return item.id === activeView.offerId; });
    if (!group || !offer) return setView(group ? "comparison" : "positions", group ? { groupKey: group.key } : undefined);
    setTitle("Предложение поставщика", false);
    $("#refresh").hidden = true;
    var identity = element("section", "offer-identity");
    identity.append(element("span", "eyebrow", "Internal position"), element("h2", "", group.internalPosition), element("span", "eyebrow supplier-product-label", "Supplier product"), element("h3", "", offer.product), element("p", "", offer.supplierName + " · " + (offer.offerType || "Публичная цена")));
    root.append(identity);
    var details = element("section", "detail-card");
    details.append(
      detailRow("Цена поставщика", money(Number(offer.candidatePrice), offer.currency), "price"),
      detailRow("Фасовка", packageIdentity(offer).label + (offer.unit ? " · " + offer.unit : "")),
      detailRow("Ваша текущая цена", offer.currentPrice ? money(Number(offer.currentPrice), offer.currency) : "нет данных"),
      detailRow("Статус", statusLabel(offer.decision), "status-detail"),
      detailRow("Наличие", availabilityText(offer), "availability-detail"),
      detailRow("Минимальный заказ", offer.minimumOrder || "Не указано"),
      detailRow("Доставка", offer.delivery || "Не указано"),
      detailRow("Проверено", formatDate(offer.verifiedAt))
    );
    root.append(details);
    var contact = element("section", "contact-card");
    contact.append(element("h3", "", "Как связаться и заказать"));
    var contactActions = element("div", "contact-grid");
    if ((offer.sourceUrls || [])[0]) contactActions.append(contactLink(offer.sourceUrls[0], "Открыть товар", "source"));
    if (offer.phone) contactActions.append(contactLink("tel:" + safePhone(offer.phone), "Позвонить", "phone"));
    if (offer.email) contactActions.append(contactLink("mailto:" + offer.email, "Написать", "email"));
    if (!contactActions.children.length) contactActions.append(element("p", "muted", "Контакты на странице источника."));
    contact.append(contactActions);
    root.append(contact);
    var evidence = element("details", "evidence");
    evidence.append(element("summary", "", "Почему предложение считается подходящим"));
    var evidenceList = element("div", "evidence-list");
    evidenceList.append(detailRow("Совпадение", offer.matchEvidence || "Точный brand / product identity"));
    if (offer.sku) evidenceList.append(detailRow("SKU", offer.sku));
    if (offer.barcode) evidenceList.append(detailRow("Barcode", offer.barcode));
    evidenceList.append(detailRow("Фасовка", packageIdentity(offer).label));
    evidenceList.append(detailRow("Уверенность", offer.matchType === "exact_product" ? "Точное товарное совпадение" : "Требует проверки"));
    (offer.sourceUrls || []).forEach(function (url, index) { evidenceList.append(detailRow("Источник " + (index + 1), url)); });
    (offer.caveats || []).forEach(function (caveat) { evidenceList.append(detailRow("Ограничение", caveat)); });
    evidence.append(evidenceList);
    root.append(evidence);
    var actions = element("section", "detail-actions");
    var review = element("button", "primary-button", offer.decision === "checking" ? "Убрать из проверки" : "Добавить в проверку");
    review.type = "button";
    review.onclick = function () { changeDecision(offer, offer.decision === "checking" ? "new" : "checking", "Статус проверки сохранён"); };
    var confirmOffer = element("button", "secondary-button", offer.decision === "confirmed" ? "Подтверждено" : "Подтвердить");
    confirmOffer.type = "button";
    confirmOffer.disabled = offer.decision === "confirmed";
    confirmOffer.onclick = function () { changeDecision(offer, "confirmed", "Предложение подтверждено"); };
    var dismiss = element("button", "secondary-button", "Не подходит");
    dismiss.type = "button";
    dismiss.onclick = function () { changeDecision(offer, "dismissed", "Предложение отмечено как неподходящее", true); };
    var remove = element("button", "delete-button", "Удалить предложение");
    remove.type = "button";
    remove.onclick = function () {
      if (confirm("Удалить предложение? Оно не вернётся после следующего поиска.")) deleteOffer(offer, group.key);
    };
    actions.append(review, confirmOffer, dismiss, remove);
    root.append(actions);
  }

  function findSegmentForTarget(target) {
    return searchPlan.find(function (segment) { return normal(segment.label).indexOf(normal(target)) !== -1; });
  }

  function renderMissing(root) {
    setTitle("Без предложений", false);
    $("#refresh").hidden = true;
    var targets = currentData && Array.isArray(currentData.uncoveredTargets) ? currentData.uncoveredTargets : [];
    var intro = element("section", "missing-intro");
    intro.append(element("strong", "", targets.length + " позиций пока без подтверждённых предложений"), element("p", "", "Активные позиции имеют приоритет при следующем поиске."));
    root.append(intro);
    var tools = element("section", "missing-tools");
    var input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Найти позицию";
    input.value = query;
    input.oninput = function () { query = input.value; render(); };
    var sort = document.createElement("select");
    sort.setAttribute("aria-label", "Сортировка");
    sort.append(new Option("По алфавиту", "az"));
    tools.append(input, sort);
    root.append(tools);
    var needle = normal(query);
    var list = element("section", "missing-list");
    targets.filter(function (target) { return !needle || normal(target).indexOf(needle) !== -1; }).sort(function (a, b) { return a.localeCompare(b, "ru"); }).forEach(function (target) {
      var row = element("article", "missing-position");
      var copy = element("div", "");
      copy.append(element("strong", "", target), element("span", "", "Нет предложений"));
      var button = element("button", "secondary-button", "Запустить поиск");
      button.type = "button";
      button.disabled = searchRunning || !findSegmentForTarget(target);
      button.onclick = function () { runTargetSearch(target); };
      row.append(copy, button);
      list.append(row);
    });
    if (!list.children.length) list.append(emptyState("Ничего не найдено", "Измените поисковый запрос."));
    root.append(list);
    root.append(element("p", "info-row warning", "Поиск отправляет запрос только для группы выбранной позиции. Существующие результаты остаются сохранёнными."));
  }

  function render() {
    var root = $("#results");
    root.innerHTML = "";
    if (activeView.name === "comparison") renderComparison(root);
    else if (activeView.name === "offer") renderOffer(root);
    else if (activeView.name === "missing") renderMissing(root);
    else renderPositions(root);
  }

  async function changeDecision(offer, decision, message, returnToComparison) {
    try {
      if (localQaFixture) {
        currentData.alternatives = currentData.alternatives.map(function (item) { return item.id === offer.id ? Object.assign({}, item, { decision: decision }) : item; });
        currentData.positionGroups = groupPositions(currentData.alternatives);
      } else currentData = (await api("PATCH", { action: "decision", id: offer.id, decision: decision })).data;
      updateSnapshotStatus(message, "success");
      if (returnToComparison) setView("comparison", { groupKey: activeView.groupKey }); else render();
    } catch (error) {
      updateSnapshotStatus("Последние данные сохранены · " + error.message, "error");
    }
  }

  async function deleteOffer(offer, groupKey) {
    try {
      if (localQaFixture) {
        currentData.alternatives = currentData.alternatives.filter(function (item) { return item.id !== offer.id; });
        currentData.positionGroups = groupPositions(currentData.alternatives);
      } else currentData = (await api("PATCH", { action: "delete", id: offer.id })).data;
      updateSnapshotStatus("Предложение удалено", "success");
      setView("comparison", { groupKey: groupKey });
    } catch (error) {
      updateSnapshotStatus("Последние данные сохранены · " + error.message, "error");
    }
  }

  function setProgress(message) {
    var node = $("#search-progress");
    node.hidden = !message;
    node.textContent = message || "";
  }

  async function runTargetSearch(target) {
    var segment = findSegmentForTarget(target);
    if (!segment || searchRunning) return;
    searchRunning = true;
    setProgress("Ищем предложения для группы: " + segment.label);
    updateSnapshotStatus("Ищем новые предложения…", "searching");
    try {
      currentData = (await api("POST", { segment: segment.id, reset: false })).data;
      updateSnapshotStatus("Данные сохранены · проверено " + formatDate(currentData.generatedAt), "success");
      setView("positions");
    } catch (error) {
      updateSnapshotStatus("Показаны последние данные · поиск временно недоступен", "error");
    } finally {
      searchRunning = false;
      setProgress("");
      configureRefresh();
      render();
    }
  }

  async function runFullSearch() {
    if (searchRunning) return;
    if (!searchPlan.length) { location.href = "/catalog"; return; }
    searchRunning = true;
    configureRefresh();
    var failures = [];
    updateSnapshotStatus("Ищем новые предложения…", "searching");
    for (var index = 0; index < searchPlan.length; index += 1) {
      setProgress("Ищем предложения · " + (index + 1) + " / " + searchPlan.length + " групп · " + searchPlan[index].label);
      try {
        currentData = (await api("POST", { segment: searchPlan[index].id, reset: index === 0 })).data;
        render();
      } catch (error) {
        failures.push(error.message);
      }
    }
    searchRunning = false;
    setProgress("");
    configureRefresh();
    if (failures.length) updateSnapshotStatus("Показаны последние данные · часть поиска временно недоступна", "error");
    else updateSnapshotStatus("Данные сохранены · проверено " + formatDate(currentData && currentData.generatedAt), "success");
    render();
  }

  function configureRefresh() {
    var button = $("#refresh");
    button.disabled = searchRunning;
    if (!searchPlan.length) button.textContent = "Открыть ассортимент";
    else button.textContent = searchRunning ? "Ищем…" : (currentData ? "Обновить" : "Запустить поиск");
  }

  async function load() {
    try {
      if (localQaFixture) {
        searchPlan = Array.from({ length: 18 }, function (_, index) { return { id: "batch-" + index, label: "Тестовая группа " + (index + 1) }; });
        currentData = qaFixtureData();
      } else {
        var response = await api("GET");
        searchPlan = response.searchPlan || [];
        currentData = response.data;
      }
      configureRefresh();
      if (!searchPlan.length) updateSnapshotStatus("В ассортименте нет закупочных позиций", "error");
      else if (currentData) updateSnapshotStatus("Данные сохранены · проверено " + formatDate(currentData.generatedAt), "success");
      else updateSnapshotStatus("Сохранённых результатов пока нет", "success");
      render();
    } catch (error) {
      configureRefresh();
      updateSnapshotStatus("Не удалось загрузить сохранённые данные", "error");
      $("#results").append(emptyState("Данные временно недоступны", "Повторите загрузку. Сетевая ошибка не удаляет сохранённые предложения.", "Повторить", load));
    }
  }

  function handleInternalBack() {
    if (activeView.name === "positions") return false;
    if (activeView.name === "offer") setView("comparison", { groupKey: activeView.groupKey });
    else setView("positions");
    return true;
  }

  window.bdHandleEmbeddedBack = handleInternalBack;
  $("#back").onclick = function (event) {
    if (!handleInternalBack()) return;
    event.preventDefault();
  };
  $("#refresh").onclick = runFullSearch;
  load();
})();
