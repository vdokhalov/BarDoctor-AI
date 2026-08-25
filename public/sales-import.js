(function () {
  "use strict";

  var state = { payload: null, batch: null, mode: "preview", quantities: {}, dirty: false, busy: false, pendingFile: null, mappingResponse: null, autosaveTimer: null };
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
  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T12:00:00"));
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
    return ({ MANUAL_GRID: "Ручной grid", TEXT_IMPORT: "Текст", FILE_IMPORT: "Файл", IMAGE_IMPORT: "Фото / PDF", VOICE_IMPORT: "Голос", POS_API: "POS API", ONE_C: "1С", LOCAL_CONNECTOR: "Локальный коннектор", OTHER_API: "API" })[source] || source;
  }
  function statusLabel(status) {
    return ({ DRAFT: "Черновик", READY: "Готов", PARTIALLY_BLOCKED: "Частично отражён", POSTED: "Проведён", REVERSED: "Сторнирован", CANCELLED: "Отменён" })[status] || status;
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
    document.getElementById("coverage-title").textContent = k.loadedQuantity ? (k.reflectedPercent + "% продаж отражено на складе") : "Продажи ещё не загружены";
    document.getElementById("coverage-copy").textContent = k.loadedQuantity
      ? ((k.reflectedQuantity || 0) + " из " + k.loadedQuantity + " порций отражено canonical движениями. Источник истины — складской ledger.")
      : "Добавьте итоги смены — BarDoctor разложит позиции по техкартам и покажет складской расход до проведения.";
    renderBatches(payload.batches || []);
    renderQuality(payload.dataQuality || { issues: [] });
    document.getElementById("add-sales").hidden = !(payload.capabilities && payload.capabilities.create);
  }
  function renderBatches(batches) {
    var node = document.getElementById("batch-list");
    if (!batches.length) {
      node.innerHTML = '<div class="empty-state"><span>⇄</span><h3>Нет SalesBatch</h3><p>Можно начать с ручного grid, текста, CSV/Excel или фото отчёта.</p></div>';
      return;
    }
    node.innerHTML = batches.map(function (batch) {
      return '<button class="batch-row" type="button" data-batch="' + h(batch.id) + '"><span class="batch-date"><b>' + h(formatDate(batch.businessDate)) + '</b><small>' + h(sourceLabel(batch.source)) + (batch.shiftId ? " · смена " + h(batch.shiftId) : "") + '</small></span><span class="batch-progress"><b>' + (batch.postedLineCount || 0) + ' / ' + batch.lines.length + ' строк</b><small>' + h(batch.unresolvedQuantity || 0) + ' порций требуют исправления</small></span><span class="batch-cost"><b>' + h(money(batch.totalTheoreticalCost, batch.lines[0] && batch.lines[0].currency)) + '</b><small>теор. себестоимость</small></span><span class="status-pill ' + statusClass(batch.status) + '">' + h(statusLabel(batch.status)) + '</span><span class="chevron">›</span></button>';
    }).join("");
  }
  function renderQuality(quality) {
    var issues = quality.issues || [];
    document.getElementById("quality-count").textContent = issues.length;
    document.getElementById("quality-impact").textContent = issues.length ? ((quality.affectedLineCount || issues.length) + " позиций / " + (quality.affectedQuantity || 0) + " порций не отражено на складе") : "Все продажи отражены корректно.";
    document.getElementById("quality-list").innerHTML = issues.length ? issues.slice(0, 12).map(function (issue) {
      return '<button type="button" data-batch="' + h(issue.batchId) + '"><b>' + h(issue.label) + '</b><span>' + h(issue.impact) + '</span><code>' + h(issue.code) + '</code></button>';
    }).join("") : '<div class="quality-ok">✓ Нет нерешённых ошибок</div>';
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

  function openManual(template) {
    state.mode = "manual"; state.batch = null; state.quantities = {};
    (template || []).forEach(function (item) { state.quantities[item.menuItemId] = ""; });
    header("Быстрый ввод", "НОВЫЙ SALESBATCH", "DRAFT");
    renderManual(); showEditor();
  }
  function renderManual() {
    var menu = (state.payload && state.payload.menu) || [];
    var latest = state.payload && state.payload.latestTemplate;
    var categories = Array.from(new Set(menu.map(function (item) { return item.category || item.department || "Без категории"; }))).sort();
    editorBody.innerHTML = '<section class="context-row"><label>Дата продаж<input id="manual-date" type="date" value="' + h(businessContext().businessDate) + '"></label><label>Смена (необязательно)<input id="manual-shift" value="' + h(businessContext().shiftId || "") + '" placeholder="ID смены"></label></section><section class="manual-tools"><label class="search-box">⌕<input id="menu-search" type="search" placeholder="Найти позицию"></label><select id="menu-category"><option value="">Все категории</option>' + categories.map(function (name) { return '<option>' + h(name) + '</option>'; }).join("") + '</select>' + (latest ? '<button id="use-template" class="template-button" type="button">Последняя смена · ' + h(formatDate(latest.businessDate)) + '</button>' : "") + '</section><p class="input-hint">Введите только проданные количества. Нулевые строки в документ не попадут. Enter переводит на следующее поле.</p><div id="menu-grid" class="menu-grid"></div>';
    editorFooter.innerHTML = '<div><b id="manual-count">0 позиций</b><span>Черновик сохранится на сервере</span></div><button id="save-manual" class="primary" type="button">Проверить продажи</button>';
    renderMenuGrid();
  }
  function renderMenuGrid() {
    var menu = (state.payload && state.payload.menu) || [];
    var search = normal((document.getElementById("menu-search") || {}).value);
    var category = (document.getElementById("menu-category") || {}).value || "";
    var filtered = menu.filter(function (item) { return (!search || normal(item.name).includes(search)) && (!category || (item.category || item.department || "Без категории") === category); }).slice(0, 300);
    var grouped = {};
    filtered.forEach(function (item) { var group = item.category || item.department || "Без категории"; (grouped[group] || (grouped[group] = [])).push(item); });
    document.getElementById("menu-grid").innerHTML = Object.keys(grouped).map(function (group) {
      return '<section class="menu-group"><h3>' + h(group) + '<span>' + grouped[group].length + '</span></h3>' + grouped[group].map(function (item) {
        var value = state.quantities[item.id] == null ? "" : state.quantities[item.id];
        return '<label class="menu-line"><span><b>' + h(item.name) + '</b><small>' + h(item.department || "Меню") + '</small></span><span class="quantity-wrap"><input inputmode="decimal" pattern="[0-9.,]*" enterkeyhint="next" aria-label="Продано ' + h(item.name) + '" data-menu-id="' + h(item.id) + '" value="' + h(value) + '" placeholder="0"><button type="button" data-clear="' + h(item.id) + '" aria-label="Очистить">×</button></span></label>';
      }).join("") + '</section>';
    }).join("") || '<div class="empty-state compact"><p>По этому фильтру позиций нет.</p></div>';
    updateManualCount();
  }
  function updateManualCount() {
    var count = Object.keys(state.quantities).filter(function (id) { return number(state.quantities[id]) > 0; }).length;
    var node = document.getElementById("manual-count"); if (node) node.textContent = count + " позиций";
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
    header(voice ? "Продиктовать продажи" : "Вставить список продаж", voice ? "VOICE ADAPTER" : "TEXT ADAPTER", "DRAFT");
    var speechAvailable = voice && (window.SpeechRecognition || window.webkitSpeechRecognition);
    editorBody.innerHTML = '<section class="context-row"><label>Дата продаж<input id="text-date" type="date" value="' + h(businessContext().businessDate) + '"></label><label>Смена (необязательно)<input id="text-shift" value="' + h(businessContext().shiftId || "") + '" placeholder="ID смены"></label></section><section class="text-entry"><label for="sales-text">Одна позиция в строке</label><textarea id="sales-text" autofocus placeholder="Мохито 12\n12 x Mojito\nAperol - 9\nБоржоми 0.5 23"></textarea>' + (voice ? '<div class="voice-help"><button id="start-voice" type="button" class="voice-button"' + (speechAvailable ? "" : " disabled") + '>● Начать диктовку</button><p>' + (speechAvailable ? "Речь преобразуется в текст и всегда показывается перед сохранением." : "В браузере нет надёжного Speech-to-Text. Используйте системную диктовку клавиатуры — preview остаётся обязательным.") + '</p></div>' : "") + '</section>';
    editorFooter.innerHTML = '<div><b>Ничего не проводится автоматически</b><span>Сначала единый preview</span></div><button id="parse-text" class="primary" type="button">Распознать список</button>';
    showEditor();
  }
  function parseText() {
    var value = document.getElementById("sales-text").value.trim();
    if (!value) return notice("Вставьте или продиктуйте список продаж", "error");
    setBusy(true, "Разбираю строки и сопоставляю с меню…");
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
    setBusy(true, "Сохраняю canonical черновик…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", id: state.batch && state.batch.id, draft: draft }) })
      .then(function (data) { setDirty(false); state.batch = data.batch; renderPreview(); return load(); })
      .catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function openBatch(id) {
    var batch = (state.payload && state.payload.batches || []).find(function (item) { return item.id === id; }); if (!batch) return;
    state.batch = batch; state.mode = "preview"; renderPreview(); showEditor();
  }
  function lineState(line) {
    if (line.processingStatus === "POSTED") return { icon: "✓", label: "Отражено", cls: "success" };
    if (line.processingStatus === "REVERSED") return { icon: "↶", label: "Сторнировано", cls: "muted" };
    if (line.processingStatus === "READY") return { icon: "✓", label: "Готово", cls: "success" };
    return { icon: "!", label: line.errorMessage || "Нужно исправить", cls: "warning" };
  }
  function renderPreview() {
    var batch = state.batch; if (!batch) return;
    header("Продажи за " + formatDate(batch.businessDate), sourceLabel(batch.source), batch.status);
    var menu = (state.payload && state.payload.menu) || [];
    var canMap = state.payload && state.payload.capabilities && state.payload.capabilities.manageMapping;
    editorBody.innerHTML = '<section class="preview-summary"><div><strong>' + batch.lines.length + '</strong><span>строк</span></div><div><strong>' + batch.postedLineCount + '</strong><span>отражено</span></div><div><strong>' + batch.readyLineCount + '</strong><span>готово</span></div><div class="warning"><strong>' + batch.blockedLineCount + '</strong><span>исправить</span></div><div><strong>' + h(money(batch.totalTheoreticalCost, batch.lines[0] && batch.lines[0].currency)) + '</strong><span>себестоимость</span></div></section>' + (batch.status === "PARTIALLY_BLOCKED" ? '<div class="partial-warning"><b>' + batch.postedLineCount + ' из ' + batch.lines.length + ' строк отражено на складе.</b><span>' + batch.blockedLineCount + ' требуют исправления; вся смена не считается полностью проведённой.</span></div>' : "") + '<div class="preview-table"><div class="preview-head"><span>Источник → меню</span><span>Количество</span><span>Техкарта / склад</span><span>Статус</span></div>' + batch.lines.map(function (line) {
      var lineStatus = lineState(line); var selected = line.menuItemId || line.suggestedMenuItemId || "";
      var mapping = line.processingStatus === "BLOCKED" && line.errorCode === "NEEDS_MAPPING" && canMap ? '<label class="mapping-select">Сопоставить<select data-map-line="' + h(line.id) + '" data-raw-name="' + h(line.rawName) + '"><option value="">Выберите позицию</option>' + menu.map(function (item) { return '<option value="' + h(item.id) + '"' + (item.id === selected ? " selected" : "") + '>' + h(item.name) + '</option>'; }).join("") + '</select></label>' : '<b>' + h((line.recipeSnapshot && line.recipeSnapshot.menuItem.name) || (menu.find(function (item) { return item.id === line.menuItemId; }) || {}).name || "Не сопоставлено") + '</b>';
      var ingredients = line.recipeSnapshot ? line.recipeSnapshot.ingredients.map(function (item) { return h(item.name + " · " + item.baseQuantityTotal + " " + item.baseUnit + " · " + item.warehouseId); }).join("<br>") : h(line.errorMessage || "Техкарта не определена");
      return '<article class="preview-line"><div><small>' + h(line.rawName) + '</small><span class="arrow">→</span>' + mapping + '</div><div><b>' + h(line.quantity) + ' шт</b></div><div><span>' + ingredients + '</span>' + (line.recipeVersionId ? '<small>v' + h(line.recipeSnapshot && line.recipeSnapshot.recipeVersion) + ' · ' + h(money(line.theoreticalCost, line.currency)) + '</small>' : "") + '</div><div><span class="line-state ' + lineStatus.cls + '">' + lineStatus.icon + ' ' + h(lineStatus.label) + '</span></div></article>';
    }).join("") + '</div>';
    var caps = state.payload && state.payload.capabilities || {}; var editable = ["DRAFT", "READY", "PARTIALLY_BLOCKED"].includes(batch.status);
    editorFooter.innerHTML = '<div><b>' + (batch.postedLineCount + batch.readyLineCount) + ' из ' + batch.lines.length + ' строк могут быть отражены</b><span>Проведение создаёт immutable SALE_CONSUMPTION</span></div><div class="footer-actions">' + (editable && !batch.postedLineCount ? '<button id="cancel-batch" class="secondary danger-text" type="button">Отменить черновик</button>' : "") + (batch.postedLineCount && batch.status !== "REVERSED" && caps.reverse ? '<button id="reverse-batch" class="secondary danger-text" type="button">Сторнировать</button>' : "") + (editable && batch.readyLineCount && caps.post ? '<button id="post-batch" class="primary" type="button">Провести ' + batch.readyLineCount + ' строк</button>' : "") + '</div>';
  }
  function mapLine(select) {
    if (!select.value) return;
    setBusy(true, "Сохраняю venue-scoped сопоставление…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "map", batchId: state.batch.id, lineId: select.dataset.mapLine, source: state.batch.source, rawName: select.dataset.rawName, menuItemId: select.value }) })
      .then(function (data) { state.batch = data.batch; renderPreview(); return load(); }).catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }
  function confirmAction(title, copy, action) {
    document.getElementById("confirm-title").textContent = title; document.getElementById("confirm-copy").textContent = copy;
    document.getElementById("confirm-action").onclick = function (event) { event.preventDefault(); confirmDialog.close(); action(); };
    confirmDialog.showModal();
  }
  function batchAction(action) {
    setBusy(true, action === "post" ? "Создаю складские движения…" : "Создаю компенсирующие движения…");
    request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action, id: state.batch.id }) })
      .then(function (data) { state.batch = data.batch; renderPreview(); notice(action === "post" ? (data.idempotent ? "Документ уже был проведён — повторного расхода нет." : "Продажи отражены immutable движениями склада.") : action === "reverse" ? "Сторно создано. Исходные движения сохранены." : "Черновик отменён. Склад не изменён.", "success"); return load(); })
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
    state.pendingFile = file; state.mappingResponse = data; header("Сопоставьте колонки", "FILE ADAPTER", "DRAFT");
    editorBody.innerHTML = '<div class="column-mapping"><p>Автоматическое определение неуверенное. Выберите колонки вручную — склад пока не изменяется.</p><label>Название позиции<select id="name-column"><option value="">Выберите</option>' + data.columns.map(function (col) { return '<option value="' + col.index + '">' + h(col.label) + '</option>'; }).join("") + '</select></label><label>Количество<select id="quantity-column"><option value="">Выберите</option>' + data.columns.map(function (col) { return '<option value="' + col.index + '">' + h(col.label) + '</option>'; }).join("") + '</select></label><details><summary>Первые строки файла</summary><div class="raw-preview">' + data.previewRows.map(function (row) { return '<div>' + row.map(function (cell) { return '<span>' + h(cell) + '</span>'; }).join("") + '</div>'; }).join("") + '</div></details></div>';
    editorFooter.innerHTML = '<div><b>' + h(file.name) + '</b><span>CSV / Excel</span></div><button id="apply-columns" class="primary" type="button">Применить колонки</button>'; showEditor();
  }
  function importVisual(file) {
    var form = new FormData(); form.set("file", file); setBusy(true, "Распознаю отчёт. Результат обязательно попадёт в preview…");
    request("/api/sales/scan", { method: "POST", body: form }).then(function (data) {
      var scanned = data.draft;
      return request("/api/sales-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_draft", draft: { source: "IMAGE_IMPORT", sourceReference: scanned.sourceFileName, businessDate: scanned.date || today(), lines: (scanned.items || []).map(function (item) { return { id: item.id, rawName: item.name, menuItemId: item.menuItemId, quantity: item.quantity }; }) } }) });
    }).then(function (data) { state.batch = data.batch; renderPreview(); showEditor(); return load(); }).catch(function (error) { notice(error.message, "error"); }).finally(function () { setBusy(false); });
  }

  document.getElementById("add-sales").addEventListener("click", function () { sourceDialog.showModal(); });
  document.getElementById("refresh").addEventListener("click", load);
  document.getElementById("editor-close").addEventListener("click", function () { closeEditor(false); });
  document.querySelectorAll("[data-source]").forEach(function (button) {
    button.addEventListener("click", function () {
      sourceDialog.close();
      if (button.dataset.source === "manual") openManual();
      if (button.dataset.source === "text") openText(false);
      if (button.dataset.source === "voice") openText(true);
      if (button.dataset.source === "file") confirmAction("Выберите тип отчёта", "Структурированные CSV/Excel разбираются без AI. Для PDF и фото используется ingestion adapter с обязательным preview.", function () { document.getElementById("structured-file").click(); });
    });
  });
  document.getElementById("structured-file").addEventListener("change", function (event) { var file = event.target.files[0]; event.target.value = ""; if (!file) return; if (/\.(csv|tsv|xls|xlsx)$/i.test(file.name)) importStructured(file); else importVisual(file); });
  document.querySelector(".confirm-dialog form").addEventListener("submit", function (event) { if (!(event.submitter && event.submitter.value === "cancel")) event.preventDefault(); });
  document.addEventListener("click", function (event) {
    var batchButton = event.target.closest("[data-batch]"); if (batchButton) openBatch(batchButton.dataset.batch);
    if (event.target.id === "save-manual") saveManual();
    if (event.target.id === "parse-text") parseText();
    if (event.target.id === "start-voice") startVoice();
    if (event.target.id === "use-template") { (state.payload.latestTemplate.items || []).forEach(function (item) { state.quantities[item.menuItemId] = ""; }); renderMenuGrid(); notice("Скопирован только набор позиций. Количества остались пустыми.", "success"); }
    var clear = event.target.closest("[data-clear]");
    if (clear) { state.quantities[clear.dataset.clear] = ""; var input = document.querySelector('input[data-menu-id="' + CSS.escape(clear.dataset.clear) + '"]'); if (input) input.value = ""; updateManualCount(); setDirty(true); }
    if (event.target.id === "apply-columns") { var nameColumn = document.getElementById("name-column").value; var quantityColumn = document.getElementById("quantity-column").value; if (nameColumn === "" || quantityColumn === "") return notice("Выберите обе колонки", "error"); importStructured(state.pendingFile, { nameColumn: nameColumn, quantityColumn: quantityColumn, headerRow: "0", sheetName: state.mappingResponse.sheetName }); }
    if (event.target.id === "post-batch") confirmAction("Провести продажи?", state.batch.readyLineCount + " строк создадут SALE_CONSUMPTION. " + state.batch.blockedLineCount + " проблемных строк останутся в Data Quality.", function () { batchAction("post"); });
    if (event.target.id === "reverse-batch") confirmAction("Сторнировать документ?", "Будут созданы SALE_REVERSAL для исходных движений. История не удалится.", function () { batchAction("reverse"); });
    if (event.target.id === "cancel-batch") confirmAction("Отменить черновик?", "Склад не изменится. Документ сохранится в аудите как отменённый.", function () { batchAction("cancel"); });
  });
  document.addEventListener("change", function (event) { if (event.target.id === "menu-category") renderMenuGrid(); if (event.target.matches("select[data-map-line]")) mapLine(event.target); if (editor.open && event.target.matches("input, textarea, select")) setDirty(true); if (state.mode === "manual" && ["manual-date", "manual-shift"].includes(event.target.id)) scheduleManualAutosave(); });
  document.addEventListener("input", function (event) { if (event.target.id === "menu-search") return renderMenuGrid(); if (event.target.matches("input[data-menu-id]")) { state.quantities[event.target.dataset.menuId] = event.target.value; updateManualCount(); setDirty(true); scheduleManualAutosave(); } if (editor.open && event.target.matches("textarea, input")) setDirty(true); });
  document.addEventListener("keydown", function (event) { if (event.key === "Enter" && event.target.matches("input[data-menu-id]")) { event.preventDefault(); var inputs = Array.from(document.querySelectorAll("input[data-menu-id]")); var next = inputs[inputs.indexOf(event.target) + 1]; if (next) { next.focus(); next.select(); } else document.getElementById("save-manual").focus(); } });
  window.addEventListener("beforeunload", function (event) { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("popstate", function () { if (editor.open) closeEditor(true); });
  editor.addEventListener("cancel", function (event) { event.preventDefault(); closeEditor(false); });
  load();
}());
