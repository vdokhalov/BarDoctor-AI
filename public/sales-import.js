(function () {
  "use strict";

  var state = { payload: null, batch: null, mode: "preview", manualView: "previous", quantities: {}, dirty: false, busy: false, pendingFile: null, mappingResponse: null, autosaveTimer: null };
  var editor = document.getElementById("editor-dialog");
  var editorBody = document.getElementById("editor-body");
  var editorFooter = document.getElementById("editor-footer");
  var sourceDialog = document.getElementById("source-dialog");
  var confirmDialog = document.getElementById("confirm-dialog");

  function h(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char];
    });
  }
  function normal(value) { return String(value || "").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim(); }
  function number(value) { var parsed = Number(String(value == null ? "" : value).replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function formatDateShort(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
  }
  function formatQuantity(value) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number(value));
  }
  function unitLabel(value) {
    var key = String(value || "").toLowerCase();
    return ({ ml: "мл", l: "л", g: "г", kg: "кг", pcs: "шт.", pc: "шт.", piece: "шт." })[key] || value || "";
  }
  function plural(value, one, few, many) {
    var n = Math.abs(Number(value)) % 100; var n1 = n % 10;
    return n > 10 && n < 20 ? many : n1 > 1 && n1 < 5 ? few : n1 === 1 ? one : many;
  }
  function departmentLabel(value) {
    var key = normal(value);
    return ({ bar: "Бар", kitchen: "Кухня", hookah: "Кальян", other: "Другое", beverage: "Бар", food: "Кухня" })[key] || value || "Меню";
  }
  function money(value, currency) {
    if (value == null) return "не оценено";
    try { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: currency || "MDL", maximumFractionDigits: 2 }).format(value); }
    catch { return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " " + (currency || ""); }
  }
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
  function request(url, options) {
    options = options || {};
    options.headers = sessionHeaders(options.headers);
    return fetch(url, options).then(async function (response) {
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok === false) {
        var error = new Error(data.error || "Не удалось выполнить действие");
        error.code = data.code;
        throw error;
      }
      return data;
    });
  }
  function notice(message, kind) {
    var node = document.getElementById("notice");
    node.hidden = !message;
    node.className = "notice " + (kind || "info");
    node.textContent = message || "";
  }
  function setBusy(value, label) {
    state.busy = value;
    document.body.classList.toggle("is-busy", value);
    document.querySelectorAll("button").forEach(function (button) {
      if (value) {
        if (button.disabled) button.dataset.bdWasDisabled = "true";
        button.disabled = true;
      } else if (button.dataset.bdWasDisabled) {
        delete button.dataset.bdWasDisabled;
      } else button.disabled = false;
    });
    if (value && label) notice(label, "info");
  }
  function sourceLabel(source) {
    return ({ MANUAL_GRID: "Вручную", TEXT_IMPORT: "Текст", FILE_IMPORT: "Файл", IMAGE_IMPORT: "Фото / PDF", VOICE_IMPORT: "Голос", POS_API: "Кассовая система", ONE_C: "1С", LOCAL_CONNECTOR: "Подключение", OTHER_API: "Интеграция" })[source] || "Импорт";
  }
  function statusLabel(status) {
    return ({ DRAFT: "Черновик", READY: "Готово к проведению", PARTIALLY_BLOCKED: "Требует внимания", POSTED: "Проведено", REVERSED: "Отменено", CANCELLED: "Отменено" })[status] || "В обработке";
  }
  function statusClass(status) {
    if (status === "POSTED") return "success";
    if (status === "REVERSED" || status === "CANCELLED") return "muted";
    if (status === "PARTIALLY_BLOCKED") return "warning";
    return "info";
  }

  function renderHome() {
    var payload = state.payload || { batches: [], kpis: {}, dataQuality: { issues: [] } };
    var k = payload.kpis || {};
    document.getElementById("kpi-loaded").textContent = k.loadedQuantity || 0;
    document.getElementById("kpi-posted").textContent = k.reflectedQuantity || 0;
    document.getElementById("kpi-mapping").textContent = k.needsMapping || 0;
    document.getElementById("kpi-recipe").textContent = k.noRecipe || 0;
    document.getElementById("kpi-errors").textContent = k.errors || 0;
    document.getElementById("kpi-cost").textContent = k.batches ? money(k.theoreticalCost, "MDL") : "—";
    document.getElementById("coverage-title").textContent = "Продажи за смены";
    document.getElementById("coverage-copy").textContent = k.loadedQuantity
      ? ((k.reflectedPercent || 0) + "% продаж отражено на складе. Добавьте следующую смену или откройте документ для проверки.")
      : "Загрузите итоги смены — BarDoctor сам разложит позиции по техкартам и покажет складской расход до проведения.";
    document.body.classList.toggle("has-sales-documents", Boolean((payload.batches || []).length));
    renderBatches(payload.batches || []);
    renderQuality(payload.dataQuality || { issues: [] });
    document.getElementById("add-sales").hidden = !(payload.capabilities && payload.capabilities.create);
  }
  function renderBatches(batches) {
    var node = document.getElementById("batch-list");
    if (!batches.length) {
      node.innerHTML = '<div class="empty-state"><img src="/integration-icons/clipboard-list.svg" alt=""><h3>Продаж за смены пока нет</h3><p>Добавьте итоги вручную, вставьте текст или загрузите отчёт.</p><button type="button" data-open-source>+ Добавить продажи</button></div>';
      return;
    }
    var shifts = (state.payload && state.payload.shifts) || [];
    node.innerHTML = batches.map(function (batch) {
      var shift = shifts.find(function (item) { return item.id === batch.shiftId; });
      var portions = batch.lines.reduce(function (sum, line) { return sum + number(line.quantity); }, 0);
      var shiftName = shift ? shift.label + ((shift.startTime || shift.endTime) ? " · " + (shift.startTime || "—") + "–" + (shift.endTime || "—") : "") : batch.shiftId ? "Смена" : "Без привязки к смене";
      return '<button class="batch-row" type="button" data-batch="' + h(batch.id) + '"><span class="batch-date"><b>' + h(formatDateShort(batch.businessDate)) + ' · ' + h(shiftName) + '</b><small>' + h(sourceLabel(batch.source)) + '</small></span><span class="batch-progress"><b>' + batch.lines.length + ' ' + plural(batch.lines.length, "позиция", "позиции", "позиций") + ' · ' + h(formatQuantity(portions)) + ' ' + plural(portions, "порция", "порции", "порций") + '</b><small>' + (batch.blockedLineCount ? batch.blockedLineCount + ' требуют исправления' : 'Себестоимость ' + h(money(batch.totalTheoreticalCost, batch.lines[0] && batch.lines[0].currency))) + '</small></span><span class="status-pill ' + statusClass(batch.status) + '">' + h(statusLabel(batch.status)) + '</span><img class="chevron" src="/integration-icons/chevron-right.svg" alt=""></button>';
    }).join("");
  }
  function renderQuality(quality) {
    var issues = quality.issues || [];
    document.getElementById("quality-count").textContent = issues.length;
    var hasDocuments = Boolean(state.payload && state.payload.batches && state.payload.batches.length);
    document.getElementById("quality-impact").textContent = issues.length ? ((quality.affectedLineCount || issues.length) + " позиций / " + (quality.affectedQuantity || 0) + " порций не отражено на складе") : hasDocuments ? "Нет нерешённых ошибок." : "После загрузки продаж здесь появятся позиции, которые требуют внимания.";
    document.getElementById("quality-list").innerHTML = issues.length ? issues.slice(0, 12).map(function (issue) {
      return '<button type="button" data-batch="' + h(issue.batchId) + '"><b>' + h(issue.label) + '</b><span>' + h(issue.impact) + '</span><small>Открыть и исправить</small></button>';
    }).join("") : hasDocuments ? '<div class="quality-ok"><img src="/integration-icons/circle-check.svg" alt=""> Нет нерешённых ошибок</div>' : '';
  }
  function load() {
    notice("", "");
    return request("/api/sales-batches").then(function (data) {
      state.payload = data;
      renderHome();
      var requested = new URL(location.href).searchParams.get("batch");
      if (requested && !editor.open) openBatch(requested);
    }).catch(function (error) { notice(error.message, "error"); });
  }

  function setDirty(value) {
    state.dirty = value;
    var panel = editor.querySelector(".editor-panel");
    if (panel) panel.dataset.bdUnsavedChanges = String(value);
  }
  function showEditor() {
    if (!editor.open) editor.showModal();
    if (!(history.state && history.state.salesEditor)) history.pushState({ salesEditor: true }, "", location.href);
  }
  function closeEditor(force) {
    if (state.dirty && !force && !confirm("Есть несохранённые изменения. Закрыть без сохранения?")) return;
    setDirty(false); state.batch = null; state.mode = "preview";
    if (editor.open) editor.close();
  }
  function header(title, kicker, status) {
    document.getElementById("editor-title").textContent = title;
    document.getElementById("editor-kicker").textContent = kicker;
    var pill = document.getElementById("editor-status");
    pill.textContent = statusLabel(status || "DRAFT");
    pill.className = "status-pill " + statusClass(status || "DRAFT");
  }
  function businessContext() {
    var params = new URL(location.href).searchParams;
    return { businessDate: params.get("businessDate") || today(), shiftId: params.get("shiftId") || undefined };
  }
  function shiftOptions(selectedId) {
    var shifts = (state.payload && state.payload.shifts) || [];
    var selectedExists = !selectedId || shifts.some(function (item) { return item.id === selectedId; });
    return '<option value="">Без привязки к смене</option>' + (!selectedExists ? '<option value="' + h(selectedId) + '" selected>Смена из закрытия</option>' : '') + shifts.map(function (shift) {
      var title = (shift.label || "Смена") + (shift.date ? " · " + formatDateShort(shift.date) : "") + ((shift.startTime || shift.endTime) ? " · " + (shift.startTime || "—") + "–" + (shift.endTime || "—") : "");
      return '<option value="' + h(shift.id) + '"' + (shift.id === selectedId ? ' selected' : '') + '>' + h(title) + '</option>';
    }).join("");
  }
  function menuSearchText(item) {
    var aliases = (item.aliases || []).concat(((state.payload && state.payload.mappings) || []).filter(function (mapping) { return mapping.menuItemId === item.id && mapping.status !== "REVOKED"; }).map(function (mapping) { return mapping.rawName; }));
    return normal([item.name, item.category, departmentLabel(item.department)].concat(aliases).join(" "));
  }

  function openManual(template) {
    state.mode = "manual"; state.batch = null; state.quantities = {};
    (template || []).forEach(function (item) { state.quantities[item.menuItemId] = ""; });
    state.manualView = state.payload && state.payload.latestTemplate ? "previous" : (state.payload && state.payload.frequentItems && state.payload.frequentItems.length ? "frequent" : "all");
    header("Быстрый ввод", "НОВЫЙ ДОКУМЕНТ", "DRAFT");
    renderManual(); showEditor();
  }
  function renderManual() {
    var menu = (state.payload && state.payload.menu) || [];
    var categories = Array.from(new Set(menu.map(function (item) { return item.category || item.department || "Без категории"; }))).sort();
    var context = businessContext();
    editorBody.innerHTML = '<section class="context-row"><label><span>Дата продаж</span><input id="manual-date" type="date" value="' + h(context.businessDate) + '"></label><label><span>Смена</span><select id="manual-shift">' + shiftOptions(context.shiftId || "") + '</select></label></section><section class="entry-modes" role="tablist" aria-label="Набор позиций"><button type="button" role="tab" data-manual-view="previous" aria-selected="' + (state.manualView === "previous") + '">Прошлая смена</button><button type="button" role="tab" data-manual-view="frequent" aria-selected="' + (state.manualView === "frequent") + '">Частые</button><button type="button" role="tab" data-manual-view="all" aria-selected="' + (state.manualView === "all") + '">Всё меню</button></section><section class="manual-tools"><label class="search-box"><img src="/integration-icons/activity.svg" alt=""><input id="menu-search" type="search" placeholder="Найти позицию" aria-label="Найти позицию" autocomplete="off"></label><select id="menu-category" aria-label="Категория"><option value="">Все категории</option>' + categories.map(function (name) { return '<option>' + h(name) + '</option>'; }).join("") + '</select></section><p id="input-hint" class="input-hint"></p><div id="menu-grid" class="menu-grid"></div>';
    editorFooter.innerHTML = '<div><b id="manual-count">0 позиций · 0 порций</b><span>Черновик сохраняется автоматически</span></div><button id="save-manual" class="primary" type="button">Проверить продажи</button>';
    renderMenuGrid();
  }
  function renderMenuGrid() {
    var menu = (state.payload && state.payload.menu) || [];
    var search = normal((document.getElementById("menu-search") || {}).value);
    var category = (document.getElementById("menu-category") || {}).value || "";
    var template = (state.payload && state.payload.latestTemplate && state.payload.latestTemplate.items) || [];
    var frequent = (state.payload && state.payload.frequentItems) || [];
    var selectedIds = new Set((state.manualView === "previous" ? template : state.manualView === "frequent" ? frequent : []).map(function (item) { return item.menuItemId; }));
    if (state.manualView === "frequent" && !selectedIds.size) menu.slice(0, 30).forEach(function (item) { selectedIds.add(item.id); });
    var filtered = menu.filter(function (item) { return (!search && state.manualView !== "all" ? selectedIds.has(item.id) : true) && (!search || menuSearchText(item).includes(search)) && (!category || (item.category || item.department || "Без категории") === category); }).slice(0, 300);
    var grouped = {};
    filtered.forEach(function (item) { var group = item.category || item.department || "Без категории"; (grouped[group] || (grouped[group] = [])).push(item); });
    document.getElementById("menu-grid").innerHTML = Object.keys(grouped).map(function (group) {
      var displayGroup = departmentLabel(group);
      return '<section class="menu-group"><h3>' + h(displayGroup) + '<span>' + grouped[group].length + '</span></h3>' + grouped[group].map(function (item) {
        var value = state.quantities[item.id] == null ? "" : state.quantities[item.id];
        return '<label class="menu-line"><span><b>' + h(item.name) + '</b></span><span class="quantity-wrap"><input inputmode="decimal" pattern="[0-9.,]*" enterkeyhint="next" aria-label="Количество, ' + h(item.name) + '" data-menu-id="' + h(item.id) + '" value="' + h(value) + '" placeholder="0"></span></label>';
      }).join("") + '</section>';
    }).join("") || '<div class="empty-state compact"><p>' + (state.manualView === "previous" ? "В прошлой смене нет сохранённого набора. Перейдите в «Частые» или «Всё меню»." : "По этому фильтру позиций нет.") + '</p></div>';
    var hint = document.getElementById("input-hint");
    if (hint) hint.textContent = state.manualView === "previous" ? "Набор позиций из прошлой смены. Количества не копируются." : state.manualView === "frequent" ? "Позиции, которые чаще всего встречаются в продажах." : "Полный каталог меню. В документ попадут только ненулевые количества.";
    updateManualCount();
  }
  function updateManualCount() {
    var values = Object.keys(state.quantities).map(function (id) { return number(state.quantities[id]); }).filter(function (value) { return value > 0; });
    var count = values.length; var total = values.reduce(function (sum, value) { return sum + value; }, 0);
    var node = document.getElementById("manual-count"); if (node) node.textContent = count + " " + plural(count, "позиция", "позиции", "позиций") + " · " + formatQuantity(total) + " " + plural(total, "порция", "порции", "порций");
  }
  function manualLines() {
    Array.from(editorBody.querySelectorAll("input[data-menu-id]")).forEach(function (input) { state.quantities[input.dataset.menuId] = input.value; });
    var menu = (state.payload && state.payload.menu) || [];
    var byId = new Map(menu.map(function (item) { return [item.id, item]; }));
    return Object.keys(state.quantities).filter(function (id) { return number(state.quantities[id]) > 0; }).map(function (id) { return { id: "manual:" + id, menuItemId: id, rawName: (byId.get(id) || {}).name || id, quantity: number(state.quantities[id]) }; });
  }
  function manualDraft() {
    return { source: "MANUAL_GRID", businessDate: document.getElementById("manual-date").value, shiftId: document.getElementById("manual-shift").value || undefined, lines: manualLines() };
  }
  function scheduleManualAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(function () {
      var draft = manualDraft();
      if (!draft.lines.length || state.busy || state.mode !== "manual") return;
      request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", id: state.batch && state.batch.id, draft: draft }) })
        .then(function (data) {
          state.batch = data.batch;
          setDirty(false);
          var note = editorFooter.querySelector("span");
          if (note) note.textContent = "Черновик сохранён на сервере";
        }).catch(function (error) {
          setDirty(true);
          notice("Черновик пока не сохранён: " + error.message, "error");
        });
    }, 700);
  }
  function saveManual() {
    clearTimeout(state.autosaveTimer);
    var lines = manualLines();
    if (!lines.length) return notice("Введите количество хотя бы у одной позиции", "error");
    var draft = manualDraft();
    draft.lines = lines;
    saveDraft(draft);
  }

  function openText(voice) {
    state.mode = voice ? "voice" : "text"; state.batch = null;
    header(voice ? "Продиктовать продажи" : "Вставить список продаж", "НОВЫЙ ДОКУМЕНТ", "DRAFT");
    var speechAvailable = voice && (window.SpeechRecognition || window.webkitSpeechRecognition);
    var context = businessContext();
    editorBody.innerHTML = '<section class="context-row"><label><span>Дата продаж</span><input id="text-date" type="date" value="' + h(context.businessDate) + '"></label><label><span>Смена</span><select id="text-shift">' + shiftOptions(context.shiftId || "") + '</select></label></section><section class="text-entry"><label for="sales-text">Одна позиция в строке</label><textarea id="sales-text" autofocus placeholder="Мохито 12\nАпероль 9\nБоржоми 23"></textarea>' + (voice ? '<div class="voice-help"><button id="start-voice" type="button" class="voice-button"' + (speechAvailable ? "" : " disabled") + '>Начать диктовку</button><p>' + (speechAvailable ? "Речь преобразуется в текст. Перед проведением вы проверите результат." : "Используйте микрофон системной клавиатуры. Перед проведением вы проверите результат.") + '</p></div>' : "") + '</section>';
    editorFooter.innerHTML = '<div><b>Продажи пока не проведены</b><span>Сначала вы проверите распознанные позиции</span></div><button id="parse-text" class="primary" type="button">Проверить список</button>';
    showEditor();
  }
  function parseText() {
    var value = document.getElementById("sales-text").value.trim();
    if (!value) return notice("Вставьте или продиктуйте список продаж", "error");
    setBusy(true, "Распознаю позиции и сопоставляю с меню…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: state.mode === "voice" ? "import_voice" : "import_text", text: value, businessDate: document.getElementById("text-date").value, shiftId: document.getElementById("text-shift").value || undefined }) })
      .then(function (data) { setDirty(false); state.batch = data.batch; renderPreview(); load(); })
      .catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function startVoice() {
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Recognition) return;
    var recognition = new Recognition(); recognition.lang = "ru-RU"; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = function (event) { document.getElementById("sales-text").value = Array.from(event.results).map(function (result) { return result[0].transcript; }).join("\n"); setDirty(true); };
    recognition.onerror = function () { notice("Диктовка недоступна. Можно использовать микрофон системной клавиатуры.", "error"); };
    recognition.start(); notice("Слушаю. Произнесите позиции и количества.", "info");
  }

  function saveDraft(draft) {
    setBusy(true, "Сохраняю черновик…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", id: state.batch && state.batch.id, draft: draft }) })
      .then(function (data) { setDirty(false); state.batch = data.batch; renderPreview(); return load(); })
      .catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function openBatch(id) {
    var batch = (state.payload && state.payload.batches || []).find(function (item) { return item.id === id; }); if (!batch) return;
    state.batch = batch; state.mode = "preview"; renderPreview(); showEditor();
  }
  function lineState(line) {
    if (line.processingStatus === "POSTED") return { icon: "/integration-icons/circle-check.svg", label: "Отражено на складе", cls: "success" };
    if (line.processingStatus === "REVERSED") return { icon: "/integration-icons/circle-off.svg", label: "Отменено", cls: "muted" };
    if (line.processingStatus === "READY") return { icon: "/integration-icons/circle-check.svg", label: "Готово", cls: "success" };
    var labels = { NEEDS_MAPPING: "Нужно сопоставить", NO_RECIPE: "Нет техкарты", INVALID_QUANTITY: "Проверьте количество", UNIT_ERROR: "Ошибка единиц", WAREHOUSE_MAPPING_REQUIRED: "Не выбран склад", NOMENCLATURE_MAPPING_REQUIRED: "Ингредиент не связан со складом" };
    return { icon: "/integration-icons/triangle-alert.svg", label: labels[line.errorCode] || line.errorMessage || "Нужно исправить", cls: "warning" };
  }
  function lineIssueAction(line) {
    if (line.errorCode === "NO_RECIPE") return '<button type="button" class="line-action" data-open-route="/catalog?tab=recipes&amp;itemId=' + encodeURIComponent(line.menuItemId || "") + '">Открыть техкарту</button>';
    if (["UNIT_ERROR", "NOMENCLATURE_MAPPING_REQUIRED"].includes(line.errorCode)) return '<button type="button" class="line-action" data-open-route="/nomenclature?view=attention">Исправить номенклатуру</button>';
    if (line.errorCode === "WAREHOUSE_MAPPING_REQUIRED") return '<button type="button" class="line-action" data-open-route="/warehouse?tab=stock">Выбрать склад</button>';
    return "";
  }
  function renderPreview() {
    var batch = state.batch; if (!batch) return;
    header("Проверка продаж", "ПРОДАЖИ ЗА " + formatDateShort(batch.businessDate).toUpperCase(), batch.status);
    var menu = (state.payload && state.payload.menu) || [];
    var canMap = state.payload && state.payload.capabilities && state.payload.capabilities.manageMapping;
    var mappingCount = batch.lines.filter(function (line) { return line.errorCode === "NEEDS_MAPPING"; }).length;
    var noRecipeCount = batch.lines.filter(function (line) { return line.errorCode === "NO_RECIPE"; }).length;
    var readyCount = batch.readyLineCount + batch.postedLineCount;
    editorBody.innerHTML = '<section class="preview-summary"><div><strong>' + batch.lines.length + '</strong><span>распознано</span></div><div class="positive"><strong>' + readyCount + '</strong><span>готовы</span></div><div class="warning"><strong>' + mappingCount + '</strong><span>требуют сопоставления</span></div><div class="danger"><strong>' + noRecipeCount + '</strong><span>без техкарты</span></div></section>' + (batch.blockedLineCount ? '<div class="partial-warning"><b>' + readyCount + ' из ' + batch.lines.length + ' позиций готовы к отражению.</b><span>' + batch.blockedLineCount + ' требуют исправления — документ не будет показан как полностью проведённый.</span></div>' : "") + '<div class="preview-table"><div class="preview-head"><span>Позиция</span><span>Кол-во</span><span>Статус</span></div>' + batch.lines.map(function (line) {
      var lineStatus = lineState(line); var selected = line.menuItemId || line.suggestedMenuItemId || "";
      var mapping = line.processingStatus === "BLOCKED" && line.errorCode === "NEEDS_MAPPING" && canMap ? '<label class="mapping-select">Сопоставить<select data-map-line="' + h(line.id) + '" data-raw-name="' + h(line.rawName) + '"><option value="">Выберите позицию</option>' + menu.map(function (item) { return '<option value="' + h(item.id) + '"' + (item.id === selected ? " selected" : "") + '>' + h(item.name) + '</option>'; }).join("") + '</select></label>' : '<b>' + h((line.recipeSnapshot && line.recipeSnapshot.menuItem.name) || (menu.find(function (item) { return item.id === line.menuItemId; }) || {}).name || "Не сопоставлено") + '</b>';
      var details = line.recipeSnapshot ? line.recipeSnapshot.ingredients.map(function (item) { return h(item.name + " · " + item.baseQuantityTotal + " " + unitLabel(item.baseUnit)); }).join(" · ") : "";
      return '<article class="preview-line"><div><small>' + h(line.rawName) + '</small>' + mapping + (details ? '<span class="line-details">' + details + '</span>' : '') + '</div><div><b>' + h(formatQuantity(line.quantity)) + '</b></div><div><span class="line-state ' + lineStatus.cls + '"><img src="' + lineStatus.icon + '" alt="">' + h(lineStatus.label) + '</span>' + lineIssueAction(line) + '</div></article>';
    }).join("") + '</div>';
    var caps = state.payload && state.payload.capabilities || {}; var editable = ["DRAFT", "READY", "PARTIALLY_BLOCKED"].includes(batch.status);
    editorFooter.innerHTML = '<div><b>' + readyCount + ' из ' + batch.lines.length + ' позиций готовы</b><span>Складской расход и себестоимость будут рассчитаны при проведении</span></div><div class="footer-actions">' + (editable ? '<button id="save-preview" class="secondary" type="button">Сохранить черновик</button>' : "") + (batch.postedLineCount && batch.status !== "REVERSED" && caps.reverse ? '<button id="reverse-batch" class="secondary danger-text" type="button">Отменить проведение</button>' : "") + (editable && batch.readyLineCount && caps.post ? '<button id="post-batch" class="primary" type="button">Провести продажи</button>' : "") + '</div>';
  }
  function mapLine(select) {
    if (!select.value) return;
    setBusy(true, "Сохраняю сопоставление…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "map", batchId: state.batch.id, lineId: select.dataset.mapLine, source: state.batch.source, rawName: select.dataset.rawName, menuItemId: select.value }) })
      .then(function (data) { state.batch = data.batch; renderPreview(); return load(); }).catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function confirmAction(title, copy, action) {
    document.getElementById("confirm-title").textContent = title; document.getElementById("confirm-copy").textContent = copy;
    document.getElementById("confirm-action").onclick = function (event) { event.preventDefault(); confirmDialog.close(); action(); };
    confirmDialog.showModal();
  }
  function batchAction(action) {
    setBusy(true, action === "post" ? "Рассчитываю складской расход…" : "Возвращаю остатки на склад…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action, id: state.batch.id }) })
      .then(function (data) { state.batch = data.batch; renderPreview(); notice(action === "post" ? (data.idempotent ? "Документ уже был проведён — повторного расхода нет." : "Продажи отражены на складе.") : action === "reverse" ? "Проведение отменено. Исходная история сохранена." : "Черновик отменён. Склад не изменён.", "success"); return load(); })
      .catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }

  function importStructured(file, mapping) {
    var form = new FormData(); form.set("file", file); form.set("businessDate", businessContext().businessDate);
    if (mapping) Object.keys(mapping).forEach(function (key) { form.set(key, mapping[key]); });
    setBusy(true, "Читаю таблицу и определяю колонки…");
    request("/api/sales-batches/import", { method: "POST", body: form }).then(function (data) {
      if (data.columnMappingRequired) return renderColumnMapping(data, file);
      state.batch = data.batch; renderPreview(); showEditor(); return load();
    }).catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function renderColumnMapping(data, file) {
    state.pendingFile = file; state.mappingResponse = data; header("Сопоставьте колонки", "НОВЫЙ ДОКУМЕНТ", "DRAFT");
    editorBody.innerHTML = '<div class="column-mapping"><p>Автоматическое определение неуверенное. Выберите колонки вручную — склад пока не изменяется.</p><label>Название позиции<select id="name-column"><option value="">Выберите</option>' + data.columns.map(function (col) { return '<option value="' + col.index + '">' + h(col.label) + '</option>'; }).join("") + '</select></label><label>Количество<select id="quantity-column"><option value="">Выберите</option>' + data.columns.map(function (col) { return '<option value="' + col.index + '">' + h(col.label) + '</option>'; }).join("") + '</select></label><details><summary>Первые строки файла</summary><div class="raw-preview">' + data.previewRows.map(function (row) { return '<div>' + row.map(function (cell) { return '<span>' + h(cell) + '</span>'; }).join("") + '</div>'; }).join("") + '</div></details></div>';
    editorFooter.innerHTML = '<div><b>' + h(file.name) + '</b><span>CSV / Excel</span></div><button id="apply-columns" class="primary" type="button">Применить колонки</button>'; showEditor();
  }
  function importVisual(file) {
    var form = new FormData(); form.set("file", file); setBusy(true, "Распознаю отчёт. Перед проведением вы проверите результат…");
    request("/api/sales/scan", { method: "POST", body: form }).then(function (data) {
      var scanned = data.draft;
      return request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", draft: { source: "IMAGE_IMPORT", sourceReference: scanned.sourceFileName, businessDate: scanned.date || today(), lines: (scanned.items || []).map(function (item) { return { id: item.id, rawName: item.name, menuItemId: item.menuItemId, quantity: item.quantity }; }) } }) });
    }).then(function (data) { state.batch = data.batch; renderPreview(); showEditor(); return load(); }).catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }

  function openSourceDialog() {
    sourceDialog.showModal();
    if (!(history.state && history.state.salesSource)) history.pushState({ salesSource: true }, "", location.href);
  }
  document.getElementById("add-sales").addEventListener("click", openSourceDialog);
  document.getElementById("refresh").addEventListener("click", load);
  document.getElementById("editor-close").addEventListener("click", function () { closeEditor(false); });
  document.querySelectorAll("[data-source]").forEach(function (button) {
    button.addEventListener("click", function () {
      sourceDialog.close();
      if (button.dataset.source === "manual") openManual();
      if (button.dataset.source === "text") openText(false);
      if (button.dataset.source === "voice") openText(true);
      if (button.dataset.source === "file") confirmAction("Выберите отчёт", "Можно загрузить CSV, Excel, PDF или фотографию. Перед проведением BarDoctor покажет распознанные позиции.", function () { document.getElementById("structured-file").click(); });
    });
  });
  document.getElementById("structured-file").addEventListener("change", function (event) { var file = event.target.files[0]; event.target.value = ""; if (!file) return; if (/\.(csv|tsv|xls|xlsx)$/i.test(file.name)) importStructured(file); else importVisual(file); });
  document.querySelector(".confirm-dialog form").addEventListener("submit", function (event) { if (!(event.submitter && event.submitter.value === "cancel")) event.preventDefault(); });
  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-open-source]")) openSourceDialog();
    var batchButton = event.target.closest("[data-batch]"); if (batchButton) openBatch(batchButton.dataset.batch);
    if (event.target.id === "save-manual") saveManual();
    if (event.target.id === "parse-text") parseText();
    if (event.target.id === "start-voice") startVoice();
    var mode = event.target.closest("[data-manual-view]");
    if (mode) { state.manualView = mode.dataset.manualView; document.querySelectorAll("[data-manual-view]").forEach(function (button) { button.setAttribute("aria-selected", String(button === mode)); }); renderMenuGrid(); }
    var route = event.target.closest("[data-open-route]");
    if (route) {
      if (window.bdNavigate) window.bdNavigate(route.dataset.openRoute);
      else location.assign(route.dataset.openRoute);
    }
    if (event.target.id === "apply-columns") { var nameColumn = document.getElementById("name-column").value; var quantityColumn = document.getElementById("quantity-column").value; if (nameColumn === "" || quantityColumn === "") return notice("Выберите обе колонки", "error"); importStructured(state.pendingFile, { nameColumn: nameColumn, quantityColumn: quantityColumn, headerRow: "0", sheetName: state.mappingResponse.sheetName }); }
    if (event.target.id === "save-preview") { notice("Черновик сохранён. К нему можно вернуться из списка документов.", "success"); closeEditor(true); load(); }
    if (event.target.id === "post-batch") confirmAction("Провести продажи?", state.batch.readyLineCount + " позиций будут отражены на складе. " + state.batch.blockedLineCount + " останутся в блоке «Что не попало на склад» до исправления.", function () { batchAction("post"); });
    if (event.target.id === "reverse-batch") confirmAction("Отменить проведение?", "Склад получит обратные движения. Исходная история сохранится.", function () { batchAction("reverse"); });
    if (event.target.id === "cancel-batch") confirmAction("Отменить черновик?", "Склад не изменится. Документ сохранится в аудите как отменённый.", function () { batchAction("cancel"); });
  });
  document.addEventListener("change", function (event) { if (event.target.id === "menu-category") renderMenuGrid(); if (event.target.matches("select[data-map-line]")) mapLine(event.target); if (editor.open && event.target.matches("input, textarea, select")) setDirty(true); if (state.mode === "manual" && ["manual-date", "manual-shift"].includes(event.target.id)) scheduleManualAutosave(); });
  document.addEventListener("input", function (event) { if (event.target.id === "menu-search") return renderMenuGrid(); if (event.target.matches("input[data-menu-id]")) { state.quantities[event.target.dataset.menuId] = event.target.value; updateManualCount(); setDirty(true); scheduleManualAutosave(); } if (editor.open && event.target.matches("textarea, input")) setDirty(true); });
  document.addEventListener("keydown", function (event) { if (event.key === "Enter" && event.target.matches("input[data-menu-id]")) { event.preventDefault(); var inputs = Array.from(document.querySelectorAll("input[data-menu-id]")); var next = inputs[inputs.indexOf(event.target) + 1]; if (next) { next.focus(); next.select(); } else document.getElementById("save-manual").focus(); } });
  document.addEventListener("focusin", function (event) {
    if (!event.target.matches("input[data-menu-id]")) return;
    setTimeout(function () { event.target.scrollIntoView({ block: "center", behavior: "smooth" }); }, 120);
  });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { document.body.classList.toggle("sales-keyboard-open", window.visualViewport.height < window.innerHeight * .72); });
  window.addEventListener("beforeunload", function (event) { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("popstate", function () { if (sourceDialog.open) sourceDialog.close(); else if (editor.open) closeEditor(true); });
  sourceDialog.addEventListener("close", function () { if (history.state && history.state.salesSource) history.replaceState({}, "", location.href); });
  editor.addEventListener("cancel", function (event) { event.preventDefault(); closeEditor(false); });
  load();
}());
