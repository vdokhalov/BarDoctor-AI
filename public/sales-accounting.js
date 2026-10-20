(function () {
  "use strict";
  var state = null, saved = null, pendingMode = null, busy = false, saveRequest = null, modeOperation = null, pendingImport = null;
  var venue = localStorage.getItem("bd_active_venue_id");
  var byId = function (id) { return document.getElementById(id); };
  var status = function (message, error) { byId("accounting-status").textContent = message; byId("accounting-status").dataset.error = String(Boolean(error)); };
  function sessionHeaders() {
    return { "Content-Type": "application/json", "X-Session-Email": localStorage.getItem("bd_session") || "",
      "X-Session-Token": localStorage.getItem("bd_session_token") || "", "X-Venue-Id": venue || "" };
  }
  async function request(body) {
    if (venue !== localStorage.getItem("bd_active_venue_id")) throw new Error("Заведение изменилось. Откройте страницу заново.");
    var response = await fetch("/api/sales-accounting", { method: body ? "POST" : "GET", headers: sessionHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
    var data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || "Не удалось сохранить данные. Повторите попытку.");
    return data;
  }
  function mode(date) {
    return state.changes.filter(function (x) { return x.effectiveDate <= date; }).at(-1)?.mode || "LEGACY";
  }
  function format(value, currency) {
    if (value == null) return "—";
    return window.bdFormatAccountingMoney ? window.bdFormatAccountingMoney(value, currency || state.currency) : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " " + (currency || state.currency);
  }
  function updateSum() {
    var cash = byId("totals-cash").value, card = byId("totals-card").value;
    byId("totals-sum").textContent = cash === "" || card === "" ? "—" : format(Number(cash) + Number(card));
  }
  function renderDate() {
    var date = byId("totals-date").value;
    saved = state.totals.find(function (x) { return x.date === date; }) || null;
    var canWrite = state.canManage && mode(date) === "MANUAL" && !state.occupiedDates?.includes(date);
    ["cash", "card"].forEach(function (key) {
      var method = key === "cash" ? "CASH" : "CARD_EXTERNAL";
      byId("totals-" + key).value = saved ? saved.payments.find(function (x) { return x.method === method; })?.amount ?? "" : "";
    });
    byId("totals-receipts").value = saved?.receipts ?? "";
    byId("totals-cogs").value = saved?.declaredCost ?? "";
    byId("totals-reason").value = "";
    byId("totals-reason-label").hidden = !saved;
    byId("totals-reason").required = Boolean(saved);
    byId("totals-save").textContent = saved ? "Сохранить исправление" : "Сохранить итоги дня";
    byId("accounting-totals").querySelectorAll("input:not([type=date]),textarea,button").forEach(function (el) { el.disabled = !canWrite; });
    var history = byId("totals-history");
    history.hidden = !saved?.manualRevisions?.length;
    history.querySelector("div").replaceChildren();
    (saved?.manualRevisions || []).slice().reverse().forEach(function (revision) {
      var p = document.createElement("p");
      p.textContent = "Версия " + revision.revision + " · " + new Date(revision.recordedAt).toLocaleString("ru-RU", { timeZone: state.timezone }) + " · " + format(revision.values.cash + revision.values.card) + ". " + revision.reason;
      history.querySelector("div").append(p);
    });
    updateSum(); saveRequest = null;
    if (!state.canManage) status("Ручные итоги доступны владельцу заведения.");
    else if (!canWrite) status(state.occupiedDates?.includes(date) ? "За этот день уже учтена выручка другого источника. Итоги доступны в журнале продаж." : "Для выбранного дня ручной ввод не включён. История и прежний способ учёта сохраняются.");
    else status("");
  }
  async function load() {
    try {
      state = await request();
      document.querySelectorAll("[data-mode]").forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
        button.disabled = !state.canManage || button.dataset.mode === state.mode || state.changes.some(function (x) { return x.effectiveDate > state.today; });
      });
      var pending = state.changes.find(function (x) { return x.effectiveDate > state.today; });
      byId("accounting-pending").hidden = !pending;
      if (pending) byId("accounting-pending").textContent = (pending.mode === "MANUAL" ? "Ручной ввод" : "Касса BarDoctor") + " начнёт действовать " + pending.effectiveDate + ".";
      byId("totals-date").max = state.today;
      if (!byId("totals-date").value) byId("totals-date").value = state.today;
      byId("totals-date").disabled = !state.canManage;
      document.querySelectorAll("[data-accounting-currency]").forEach(function (el) { el.textContent = state.currency || ""; });
      byId("accounting-retry").hidden = true;
      var imports = byId("accounting-imports"); imports.hidden = !state.pendingImports?.length;
      imports.querySelector("div").replaceChildren();
      (state.pendingImports || []).forEach(function(item){
        var row=document.createElement("article"), p=document.createElement("p"), button=document.createElement("button");
        p.textContent=item.date+" · "+format(item.totalRevenue,item.currency);row.append(p);
        var previous=state.totals.find(function(x){return x.date===item.date;});
        if(previous && item.currency===state.currency){button.className="secondary";button.textContent="Сверить с ручными итогами";button.onclick=function(){
          pendingImport={item:item,previous:previous};pendingMode=null;
          byId("accounting-confirm-title").textContent="Заменить итоги импортом?";
          byId("accounting-confirm-copy").textContent="Ручные итоги: "+format(previous.revenue)+". Импорт: "+format(item.totalRevenue,item.currency)+". Будет учтён только импорт. Склад спишется по его позициям после проверки. Прежние итоги останутся в истории.";
          byId("accounting-effective").textContent="Замена касается только "+item.date+". Способ учёта следующих дней не меняется.";
          byId("accounting-confirm").querySelector(".accounting-notice").firstChild.textContent="Замена источника выручки";
          byId("import-reason-label").hidden=false;byId("import-reason").value="";
          byId("accounting-confirm-save").textContent="Заменить ручные итоги";byId("accounting-confirm-cancel").textContent="Оставить итоги";
          byId("accounting-confirm-error").textContent="";byId("accounting-confirm").showModal();
        };row.append(button);}else{var note=document.createElement("p");note.className="accounting-help";note.textContent="Для этого дня нет ручных итогов для замены. Импорт остаётся сохранённым до сверки покрытия.";row.append(note);}
        imports.querySelector("div").append(row);
      });
      if (document.body.dataset.salesAccounting === "totals") renderDate();
      else status(!state.canManage ? "Способ учёта меняет владелец заведения." : state.mode === "LEGACY" ? "Существующий способ учёта сохранён. Новый режим изменит только будущие рабочие дни." : "");
    } catch (error) { status(error.message, true); byId("accounting-retry").hidden = false; }
  }
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      pendingImport=null;byId("import-reason-label").hidden=true;byId("accounting-confirm").querySelector(".accounting-notice").firstChild.textContent="Со следующего рабочего дня";
      pendingMode = button.dataset.mode; modeOperation = crypto.randomUUID();
      var manual = pendingMode === "MANUAL";
      byId("accounting-confirm-title").textContent = manual ? "Перейти на ручной ввод?" : "Перейти на кассу BarDoctor?";
      byId("accounting-confirm-copy").textContent = manual
        ? "Вы вводите итоги смены самостоятельно. Продажи по позициям и автоматическое списание со склада в этом режиме не ведутся. История сохраняется."
        : "Продажи будут учитываться через кассу BarDoctor. Списание со склада выполняется по настройкам проданных позиций. История сохраняется.";
      byId("accounting-confirm-save").textContent = manual ? "Перейти на ручной ввод" : "Перейти на кассу";
      byId("accounting-confirm-cancel").textContent = manual ? "Оставить кассу" : "Оставить текущий режим";
      byId("accounting-effective").textContent = "Переход доступен после закрытия текущего рабочего дня, касс и заказов.";
      byId("accounting-confirm-error").textContent = "";
      byId("accounting-confirm").showModal();
    });
  });
  byId("accounting-confirm-save").addEventListener("click", async function () {
    if (busy) return; busy = true; this.disabled = true;
    try {
      if(pendingImport){
        var reason=byId("import-reason").value.trim();if(!reason)throw new Error("Укажите причину замены источника.");
        await request({action:"resolve_import",venueId:state.venueId,stagedId:pendingImport.item.id,revenueId:pendingImport.previous.id,expectedRevision:pendingImport.previous.manualRevision,reason:reason});
      }else await request({ action: "set_mode", venueId: state.venueId, mode: pendingMode, operationId: modeOperation });
      byId("accounting-confirm").close(); await load();
    } catch (error) { byId("accounting-confirm-error").textContent = error.message; }
    finally { busy = false; this.disabled = false; }
  });
  byId("totals-date").addEventListener("change", renderDate);
  byId("accounting-totals").addEventListener("input", function () { updateSum(); saveRequest = null; });
  byId("accounting-totals").addEventListener("submit", async function (event) {
    event.preventDefault(); if (busy) return;
    var optional = function (id) { return byId(id).value === "" ? null : Number(byId(id).value); };
    saveRequest = saveRequest || { action: "save_totals", venueId: state.venueId, date: byId("totals-date").value,
      cash: Number(byId("totals-cash").value), card: Number(byId("totals-card").value),
      receipts: optional("totals-receipts"), cogs: optional("totals-cogs"), expectedRevision: saved?.manualRevision || 0,
      reason: byId("totals-reason").value.trim(), operationId: crypto.randomUUID() };
    busy = true; byId("totals-save").disabled = true; status("Сохраняем…");
    try { await request(saveRequest); await load(); status("Итоги сохранены. Финансовый отчёт обновлён."); }
    catch (error) { status(error.message, true); }
    finally { busy = false; byId("totals-save").disabled = !state?.canManage || mode(byId("totals-date").value) !== "MANUAL" || state.occupiedDates?.includes(byId("totals-date").value); }
  });
  byId("accounting-retry").addEventListener("click", load);
  load();
})();
