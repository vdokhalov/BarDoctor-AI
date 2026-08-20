(function () {
  "use strict";

  var assortment = { menuItems: [], recipes: [], stockBalances: [] };
  var draft = null;
  var fileInput = document.getElementById("file");
  var review = document.getElementById("review");
  var statusNode = document.getElementById("status");

  function sessionHeaders(extra) {
    var headers = new Headers(extra || {});
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venue = localStorage.getItem("bd_active_venue_id");
    if (email && token) {
      headers.set("X-Session-Email", email);
      headers.set("X-Session-Token", token);
      if (venue) headers.set("X-Venue-Id", venue);
    }
    return headers;
  }

  function cacheKey(storeKey) {
    var email = localStorage.getItem("bd_session");
    var venue = localStorage.getItem("bd_active_venue_id");
    if (!email) return storeKey + "_cache";
    return storeKey + "_cache__" + email + (venue ? "__venue_" + venue : "");
  }

  function cache(storeKey, value) {
    try { localStorage.setItem(cacheKey(storeKey), JSON.stringify(value)); } catch { /* no-op */ }
  }

  function normal(value) {
    return String(value || "").toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
  }

  function activeMenu() {
    return (assortment.menuItems || []).filter(function (item) {
      return item && item.active !== false && item.type !== "service";
    });
  }

  function recipeFor(menuItemId) {
    return (assortment.recipes || []).find(function (recipe) {
      return recipe && recipe.menuItemId === menuItemId;
    });
  }

  function mappingState(item) {
    if (!item.menuItemId) return { ok: false, text: "Выберите точную позицию из меню" };
    var menuItem = activeMenu().find(function (candidate) { return candidate.id === item.menuItemId; });
    if (!menuItem) return { ok: false, text: "Выбранной позиции больше нет в активном меню" };
    var recipe = recipeFor(item.menuItemId);
    if (!recipe || recipe.status !== "confirmed") {
      return { ok: false, text: "У позиции нет подтверждённой техкарты" };
    }
    var ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (!ingredients.length) return { ok: false, text: "В техкарте нет ингредиентов" };
    var unlinked = ingredients.filter(function (ingredient) {
      return !ingredient || !ingredient.purchaseProductKey;
    });
    if (unlinked.length) {
      return { ok: false, text: "Свяжите со складом ингредиенты: " + unlinked.map(function (item) { return item.name; }).join(", ") };
    }
    return { ok: true, text: "Готово: " + ingredients.length + " ингредиентов спишутся по норме техкарты" };
  }

  function autoMap(item) {
    if (item.menuItemId && activeMenu().some(function (candidate) { return candidate.id === item.menuItemId; })) return;
    var matches = activeMenu().filter(function (candidate) {
      return normal(candidate.name) === normal(item.name);
    });
    if (matches.length === 1) item.menuItemId = matches[0].id;
  }

  function setStatus(message, isError) {
    statusNode.textContent = message || "";
    statusNode.setAttribute("role", isError ? "alert" : "status");
  }

  function setStep(step) {
    document.querySelectorAll(".steps li").forEach(function (node, index) {
      node.classList.toggle("active", index + 1 === step);
      node.classList.toggle("done", index + 1 < step);
    });
  }

  function loading(title, copy) {
    var overlay = document.createElement("div");
    overlay.className = "loading";
    overlay.innerHTML = '<section><div class="spinner"></div><b></b><p></p></section>';
    overlay.querySelector("b").textContent = title;
    overlay.querySelector("p").textContent = copy;
    document.body.appendChild(overlay);
    return function () { overlay.remove(); };
  }

  function formatAmount(value, unit) {
    var amount = Number(value) || 0;
    var label = unit === "ml" ? "мл" : unit === "g" ? "г" : unit === "pcs" ? "шт." : unit || "ед.";
    return amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " " + label;
  }

  function renderStock() {
    var root = document.getElementById("stock-list");
    var balances = (assortment.stockBalances || []).filter(function (item) {
      return item && item.key;
    }).sort(function (left, right) {
      return String(left.name || "").localeCompare(String(right.name || ""), "ru");
    });
    document.getElementById("stock-count").textContent = balances.length + " поз.";
    root.innerHTML = "";
    if (!balances.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Складских позиций пока нет. Загрузите и подтвердите первую накладную или чек в разделе «Поставщики».";
      root.appendChild(empty);
      return;
    }
    balances.forEach(function (balance) {
      var item = document.createElement("article");
      item.className = "stock-item" + (Number(balance.current) < 0 ? " negative" : "");
      var name = document.createElement("b");
      var amount = document.createElement("strong");
      var details = document.createElement("span");
      name.textContent = balance.name || "Складская позиция";
      amount.textContent = formatAmount(balance.current, balance.unit);
      details.textContent = balance.lastPurchaseAt
        ? "Последний приход: " + new Date(balance.lastPurchaseAt + "T12:00:00").toLocaleDateString("ru-RU")
        : "Приход ещё не проводился";
      item.append(name, amount, details);
      root.appendChild(item);
    });
  }

  function inputField(label, value, type, onChange) {
    var root = document.createElement("label");
    root.className = "field";
    var caption = document.createElement("span");
    var input = document.createElement("input");
    caption.textContent = label;
    input.type = type || "text";
    input.value = value == null ? "" : value;
    input.addEventListener("change", function () { onChange(input.value); });
    root.append(caption, input);
    return root;
  }

  function renderReview() {
    if (!draft) {
      review.hidden = true;
      return;
    }
    draft.items.forEach(autoMap);
    review.hidden = false;
    review.innerHTML = '<div class="review-head"><div><small>ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА</small><h2>Сопоставьте продажи с меню</h2></div><span></span></div><div class="meta-grid"></div><ul class="warning-list"></ul><div class="sales-list"></div><ul class="blocker-list"></ul><div class="review-actions"><p>После подтверждения действие нельзя повторить: отчёт сохранится, а ингредиенты спишутся по каждой техкарте. Повторная загрузка того же отчёта не создаст двойное списание.</p><div class="action-buttons"><button class="secondary" type="button">Отменить</button><button class="primary" type="button">Провести продажи</button></div></div>';
    review.querySelector(".review-head span").textContent = draft.items.length + " позиций";

    var meta = review.querySelector(".meta-grid");
    meta.append(
      inputField("Дата отчёта", draft.date, "date", function (value) { draft.date = value; }),
      inputField("Касса / POS", draft.sourceSystem, "text", function (value) { draft.sourceSystem = value; }),
      inputField("Номер отчёта", draft.reportNumber || "", "text", function (value) { draft.reportNumber = value; }),
      inputField("Выручка", draft.totalRevenue || "", "number", function (value) { draft.totalRevenue = Number(value) || 0; })
    );

    var warningRoot = review.querySelector(".warning-list");
    (draft.warnings || []).forEach(function (warning) {
      var row = document.createElement("li");
      row.textContent = warning;
      warningRoot.appendChild(row);
    });

    var list = review.querySelector(".sales-list");
    var blockers = [];
    draft.items.forEach(function (item, index) {
      var state = mappingState(item);
      if (!state.ok) blockers.push((index + 1) + ". " + item.name + " — " + state.text);
      var row = document.createElement("article");
      row.className = "sales-row " + (state.ok ? "ready" : "blocked");

      var name = inputField("Позиция в отчёте", item.name, "text", function (value) {
        item.name = value.trim();
        if (!item.menuItemId) autoMap(item);
        renderReview();
      });
      var quantity = inputField("Продано", item.quantity, "number", function (value) {
        item.quantity = Math.max(0, Number(value) || 0);
        renderReview();
      });
      quantity.querySelector("input").min = "0";
      quantity.querySelector("input").step = "0.001";

      var mapping = document.createElement("label");
      mapping.className = "field mapping";
      var mappingLabel = document.createElement("span");
      var select = document.createElement("select");
      mappingLabel.textContent = "Точная позиция меню";
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Выберите позицию";
      select.appendChild(empty);
      activeMenu().forEach(function (menuItem) {
        var option = document.createElement("option");
        option.value = menuItem.id;
        option.textContent = menuItem.name;
        option.selected = menuItem.id === item.menuItemId;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        item.menuItemId = select.value || undefined;
        renderReview();
      });
      mapping.append(mappingLabel, select);

      var message = document.createElement("p");
      message.className = "mapping-state " + (state.ok ? "ok" : "error");
      message.textContent = state.ok ? "✓ " + state.text : "Нужно исправить: " + state.text;
      row.append(name, quantity, mapping, message);
      list.appendChild(row);
    });

    var blockerRoot = review.querySelector(".blocker-list");
    blockers.forEach(function (blocker) {
      var row = document.createElement("li");
      row.textContent = blocker;
      blockerRoot.appendChild(row);
    });

    var buttons = review.querySelectorAll(".review-actions button");
    buttons[0].addEventListener("click", cancelDraft);
    buttons[1].disabled = blockers.length > 0 || !draft.items.length;
    buttons[1].textContent = blockers.length
      ? "Сначала исправьте " + blockers.length
      : "Провести " + draft.items.length + " позиций";
    buttons[1].addEventListener("click", confirmDraft);
    setStep(2);
  }

  async function cancelDraft() {
    var sourceFileId = draft && draft.sourceFileId;
    draft = null;
    renderReview();
    setStep(1);
    setStatus("Черновик удалён. Остатки не изменились.", false);
    if (sourceFileId) {
      await fetch("/api/sales/files/" + encodeURIComponent(sourceFileId), {
        method: "DELETE",
        headers: sessionHeaders(),
      }).catch(function () {});
    }
  }

  async function confirmDraft() {
    if (!draft) return;
    var stop = loading("Провожу продажи", "Списываю только подтверждённые позиции по нормам техкарт.");
    try {
      var response = await fetch("/api/sales/confirm", {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ document: draft }),
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) {
        var unresolved = Array.isArray(result.unresolvedLines)
          ? " " + result.unresolvedLines.map(function (item) { return item.name + ": " + item.reason; }).join("; ")
          : "";
        throw new Error((result.error || "Не удалось провести продажи.") + unresolved);
      }
      assortment = result.assortment || assortment;
      cache("bd_assortment_v1", assortment);
      if (Array.isArray(result.documents)) cache("bd_sales_documents", result.documents);
      if (Array.isArray(result.stockMovements)) cache("bd_stock_movements", result.stockMovements);
      if (Array.isArray(result.revenues)) cache("bd_finance_revenue", result.revenues);
      var summary = result.inventorySummary || {};
      draft = null;
      renderReview();
      renderStock();
      setStep(3);
      setStatus(result.duplicate
        ? "Этот отчёт уже был проведён. Повторного списания не создано."
        : "Готово: проведено " + (summary.matchedSalesLines || 0) + " позиций, списано " + (summary.movementCount || 0) + " ингредиентов.", false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось провести продажи.", true);
    } finally {
      stop();
    }
  }

  function prepareImage(file) {
    if (!file.type.startsWith("image/") || (file.size <= 7.5 * 1024 * 1024 && !/hei[cf]/i.test(file.type))) {
      return Promise.resolve(file);
    }
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var url = URL.createObjectURL(file);
      image.onload = function () {
        try {
          var scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          var context = canvas.getContext("2d");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error("Не удалось подготовить фотографию"));
            resolve(new File([blob], (file.name || "sales-report").replace(/\.[^.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: file.lastModified,
            }));
          }, "image/jpeg", .82);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Формат фотографии не поддерживается. Сохраните её как JPEG."));
      };
      image.src = url;
    });
  }

  async function scan(file) {
    var stop = loading("Распознаю отчёт продаж", "Извлекаю названия и количество. Перед списанием появится обязательная проверка.");
    setStatus("", false);
    try {
      var prepared = await prepareImage(file);
      var form = new FormData();
      form.append("file", prepared, prepared.name || "sales-report");
      var response = await fetch("/api/sales/scan", {
        method: "POST",
        headers: sessionHeaders(),
        body: form,
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось распознать отчёт");
      draft = result.draft;
      if (!draft || !Array.isArray(draft.items) || !draft.items.length) {
        throw new Error("В отчёте не найдены продажи по отдельным позициям. Загрузите детальный товарный отчёт, а не только Z-итог.");
      }
      renderReview();
      review.scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus("Распознано " + draft.items.length + " позиций. Проверьте строки, отмеченные красным.", false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось распознать отчёт", true);
    } finally {
      stop();
    }
  }

  async function load() {
    try {
      var response = await fetch("/api/store", { headers: sessionHeaders() });
      var result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось загрузить склад");
      assortment = result.entries && result.entries.bd_assortment_v1
        ? result.entries.bd_assortment_v1.data
        : assortment;
      if (!assortment || typeof assortment !== "object") assortment = { menuItems: [], recipes: [], stockBalances: [] };
      assortment.menuItems = Array.isArray(assortment.menuItems) ? assortment.menuItems : [];
      assortment.recipes = Array.isArray(assortment.recipes) ? assortment.recipes : [];
      assortment.stockBalances = Array.isArray(assortment.stockBalances) ? assortment.stockBalances : [];
      renderStock();
      if (!activeMenu().length) {
        setStatus("Сначала добавьте активные позиции меню. Без них отчёт продаж невозможно безопасно сопоставить.", true);
        document.getElementById("choose").disabled = true;
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось загрузить данные заведения", true);
    }
  }

  document.getElementById("choose").addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (file) scan(file);
  });
  load();
})();
