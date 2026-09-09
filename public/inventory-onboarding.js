(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const labels = { pcs: "шт.", l: "л", kg: "кг", ml: "мл", g: "г" };
  const fields = { name: "Название", productKey: "ID существующей номенклатуры", stockUnit: "Складская единица (шт./л/кг)", sectionId: "Раздел", taxonomyCategoryId: "Категория", subcategoryId: "Подкатегория", quantity: "Начальное количество", unit: "Единица количества", packageQuantity: "Количество в упаковке", packageUnit: "Единица содержимого", openingUnitCost: "Начальная стоимость за складскую единицу", costSource: "Источник стоимости" };
  let payload, csv, inputs = [], preview = [], commandId = "", busy = false, epoch = 0;
  const notice = message => { $("notice").textContent = message; };
  async function request(body) {
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = localStorage.getItem("bd_session_token"), email = localStorage.getItem("bd_session"), venue = localStorage.getItem("bd_active_venue_id");
    if (token && email) { headers.set("X-Session-Email", email); headers.set("X-Session-Token", token); }
    if (venue) headers.set("X-Venue-Id", venue);
    if (body && String(payload.venueId) !== String(venue)) throw new Error("Заведение изменилось. Обновите страницу перед вводом данных.");
    const response = await fetch("/api/inventory/opening", { method: body ? "POST" : "GET", headers, ...(body ? { body: JSON.stringify({ ...body, venueId: payload.venueId }) } : {}), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || result.code || "Не удалось выполнить действие");
    if (venue !== localStorage.getItem("bd_active_venue_id")) throw new Error("Заведение изменилось. Обновите страницу.");
    return result;
  }
  async function perform(fn) {
    if (busy) return;
    busy = true;
    const controls = [...document.querySelectorAll("button,input,select")].map(node => [node, node.disabled]);
    controls.forEach(([node]) => { node.disabled = true; });
    try { await fn(); } catch (error) { notice(error.message || "Не удалось выполнить действие"); }
    finally { controls.forEach(([node, disabled]) => { if (node.isConnected) node.disabled = disabled; }); busy = false; }
  }
  const options = nodes => '<option value="">Не выбрано</option>' + nodes.filter(v => v.active).map(v => `<option value="${escape(v.id)}">${escape(v.name)} · ${escape(v.id)}</option>`).join("");
  function categories() { $("category").innerHTML = options(payload.taxonomy.categories.filter(v => v.parentId === $("section").value)); subcategories(); }
  function subcategories() { $("subcategory").innerHTML = options(payload.taxonomy.subcategories.filter(v => v.parentId === $("category").value)); }
  function discard() { inputs = []; preview = []; commandId = ""; epoch++; $("preview").hidden = true; $("rows").replaceChildren(); }
  function selection() {
    const selected = [...document.querySelectorAll("[data-row]:checked")];
    $("selection-summary").textContent = `Сохранить: ${selected.length}. Пропустить: ${preview.length - selected.length}. Все выбранные строки сохраняются вместе.`;
  }
  async function showPreview(nextInputs) {
    const version = epoch;
    const result = await request({ action: "preview", inputs: nextInputs });
    if (version !== epoch) return;
    inputs = nextInputs; preview = result.rows; commandId = crypto.randomUUID();
    $("rows").innerHTML = preview.map(row => `<article class="preview-row"><label class="check"><input type="checkbox" data-row="${escape(row.rowId)}" checked>${escape(row.name || row.rowId)}</label><div>${row.quantity === null ? "Без начального остатка" : `${escape(row.quantity)} ${escape(labels[row.stockUnit])}`} · ${row.unitCost === null ? "Стоимость неизвестна" : `Начальная стоимость: ${escape(row.unitCost)} ${escape(payload.currency)} / ${escape(labels[row.stockUnit])}`}</div>${row.errors.map(error => `<p class="error">${escape(error)}</p>`).join("")}</article>`).join("");
    $("preview").hidden = false; selection(); notice("Проверьте количество и выбранные строки. Данные ещё не сохранены.");
  }
  async function load() {
    payload = await request();
    $("work").hidden = false;
    $("manual").hidden = !payload.canManage; $("import-section").hidden = !payload.canManage || !payload.canImport;
    $("product").innerHTML = '<option value="">Новый товар</option>' + payload.nomenclature.map(v => `<option value="${escape(v.productKey)}">${escape(v.name)} · ${escape(labels[v.unit] || v.unit)}</option>`).join("");
    $("section").innerHTML = options(payload.taxonomy.sections); categories();
    $("history").innerHTML = payload.documents.length ? payload.documents.slice().reverse().map(doc => `<details><summary>${escape(doc.createdAt)} · ${doc.items.length} строк</summary>${doc.items.map(row => `<p>${escape(row.name)}: ${row.quantity === null ? "Без остатка" : `${escape(row.quantity)} ${escape(labels[row.stockUnit])}`} · ${row.unitCost === null ? "Стоимость неизвестна" : `Начальная стоимость ${escape(row.unitCost)} ${escape(doc.currency)} / ${escape(labels[row.stockUnit])}`}</p>`).join("")}</details>`).join("") : "Начальные документы ещё не создавались.";
    notice("Готово. Закупка и цена закупки для начала работы не требуются.");
  }
  $("section").onchange = categories; $("category").onchange = subcategories;
  $("stockUnit").onchange = () => { $("cost-unit").textContent = labels[$("stockUnit").value]; $("unit").value = $("stockUnit").value; };
  $("packaged").onchange = () => { $("package-fields").hidden = !$("packaged").checked; };
  $("product").onchange = () => {
    const product = payload.nomenclature.find(v => v.productKey === $("product").value);
    for (const id of ["name", "stockUnit", "section", "category", "subcategory"]) $(id).closest("label").hidden = Boolean(product);
    if (product) { $("unit").value = product.unit; $("cost-unit").textContent = labels[product.unit]; }
    else $("stockUnit").onchange();
  };
  $("manual").onsubmit = event => { event.preventDefault(); perform(async () => {
    const row = { rowId: "manual", ...Object.fromEntries(Object.keys(fields).filter(id => $(id)).map(id => [id, $(id).value])), sectionId: $("section").value, taxonomyCategoryId: $("category").value, subcategoryId: $("subcategory").value };
    if ($("product").value) row.productKey = $("product").value;
    if ($("packaged").checked) { row.packageContent = { quantity: $("packageQuantity").value, unit: $("packageUnit").value }; row.unit = "package"; }
    await showPreview([row]);
  }); };
  $("csv").onchange = () => perform(async () => {
    const file = $("csv").files[0]; if (!file) return;
    if (file.size > 512000 || !/\.csv$/i.test(file.name)) throw new Error("Выберите CSV до 512 КБ.");
    csv = await request({ action: "parse_csv", csv: await file.text() });
    $("mapping").innerHTML = Object.entries(fields).map(([key, label]) => `<label>${escape(label)}<select data-map="${key}"><option value="">Не задано</option>${csv.columns.map((column, index) => `<option value="${index}"${column === key || column === label ? " selected" : ""}>${escape(column)}</option>`).join("")}</select></label>`).join("");
    $("preview-csv").hidden = false; discard(); notice(`Прочитано ${csv.rows.length} строк. Сопоставьте столбцы. Раздел, категория и подкатегория принимают точное название или ID.`);
  });
  $("preview-csv").onclick = () => perform(async () => {
    const mapping = [...document.querySelectorAll("[data-map]")].filter(v => v.value !== "");
    const next = csv.rows.map((values, index) => {
      const row = { rowId: `csv-${index + 1}` };
      mapping.forEach(field => { row[field.dataset.map] = values[Number(field.value)]; });
      if (row.packageQuantity || row.packageUnit) row.packageContent = { quantity: row.packageQuantity, unit: row.packageUnit };
      return row;
    });
    await showPreview(next);
  });
  $("rows").onchange = selection;
  $("discard").onclick = () => { discard(); notice("Проверка отменена. Начальные данные не сохранены."); };
  $("confirm").onclick = () => perform(async () => {
    const selectedRowIds = [...document.querySelectorAll("[data-row]:checked")].map(v => v.dataset.row);
    if (!selectedRowIds.length || preview.some(v => selectedRowIds.includes(v.rowId) && v.errors.length)) throw new Error("Исправьте выбранные строки с ошибками или явно исключите их.");
    const result = await request({ action: "confirm", id: commandId, inputs, selectedRowIds });
    discard(); await load(); notice(`Сохранено ${result.document.items.length} строк. Пропущено ${result.document.skippedRowIds.length}. Закупки не создавались.`);
  });
  window.addEventListener("storage", event => { if (event.key === "bd_active_venue_id") { discard(); $("work").hidden = true; notice("Заведение изменилось. Обновите страницу."); } });
  perform(load);
})();
