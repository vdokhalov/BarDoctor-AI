(function () {
  "use strict";
  var state = null, saved = null, pendingMode = null, busy = false, saveRequest = null, modeOperation = null, pendingImport = null;
  var renderedDate = null, renderedShift = "", pendingSelection = null, savedFields = null, openOperation = null;
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
  function formFields() {
    return JSON.stringify(["cash", "card", "receipts", "cogs", "reason"].map(function (key) { return byId("totals-" + key).value; }));
  }
  function canWrite() { return state?.canManage && saved?.manualTotalsVersion === 2 && !state.closedDates.includes(saved.date); }
  function renderDate() {
    var date = byId("totals-date").value, select = byId("totals-shift"), chosen = select.value;
    var sessions = state.totals.filter(function(x){ return x.date === date; });
    select.replaceChildren();
    sessions.forEach(function(x){var option=document.createElement("option");option.value=x.id;
      option.textContent=x.manualTotalsVersion===1?"Исторический итог всего дня · только просмотр":(x.shiftName||"Ручная смена")+" · "+new Date(x.openedAt).toLocaleTimeString("ru-RU",{timeZone:state.timezone,hour:"2-digit",minute:"2-digit"})+" · "+(x.closingStatus==="open"?"открыта":"закрыта");select.append(option);});
    if(sessions.some(function(x){return x.id===chosen;}))select.value=chosen;
    else select.value=(sessions.find(function(x){return x.closingStatus==="open";})||sessions.at(-1))?.id||"";
    select.disabled=!state.canManage||!sessions.length;
    saved=sessions.find(function(x){return x.id===select.value;})||null;
    ["cash","card"].forEach(function(key){var method=key==="cash"?"CASH":"CARD_EXTERNAL";byId("totals-"+key).value=saved?.payments?.find(function(x){return x.method===method;})?.amount??"";});
    byId("totals-receipts").value=saved?.receipts??"";byId("totals-cogs").value=saved?.declaredCost??"";byId("totals-reason").value="";
    var correction=Boolean(saved?.manualRevision);byId("totals-reason-label").hidden=!correction;byId("totals-reason").required=correction;
    byId("totals-save").textContent=correction?"Сохранить исправление":"Закрыть смену и сохранить итоги";
    byId("accounting-totals").querySelectorAll("input:not([type=date]),textarea,button").forEach(function(el){el.disabled=!canWrite();});
    var history=byId("totals-history");history.hidden=!saved?.manualRevisions?.length;history.querySelector("div").replaceChildren();
    (saved?.manualRevisions||[]).slice().reverse().forEach(function(revision){var p=document.createElement("p");p.textContent="Версия "+revision.revision+" · "+new Date(revision.recordedAt).toLocaleString("ru-RU",{timeZone:state.timezone})+" · "+format(revision.values.cash+revision.values.card)+". "+revision.reason;history.querySelector("div").append(p);});
    updateSum();saveRequest=null;renderedDate=date;renderedShift=select.value;savedFields=formFields();
    status(!state.canManage?"Ручные итоги доступны владельцу.":!saved?"Выберите ручную смену или откройте новую в текущем рабочем дне.":saved.manualTotalsVersion===1?"Исторический итог всего дня сохранён без изменений. Он не является итогом отдельной смены.":!canWrite()?"Рабочий день закрыт. Итоги доступны только для просмотра.":"");
  }
  async function load() {
    try {
      state = await request();
      document.querySelectorAll("[data-mode]").forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
        button.disabled = !state.canManage || state.shiftBased && button.dataset.mode === state.mode;
      });
      byId("accounting-pending").hidden=false;
      byId("accounting-pending").textContent=state.legacyPending?"Есть прежний переход по дате: "+state.legacyPending.effectiveDate+". Подтвердите замену настройкой следующей смены.":state.shiftBased?(state.mode==="MANUAL"?"Ручной ввод":"Касса BarDoctor")+" — для следующей открываемой смены. Текущая смена не изменится.":"Подтвердите способ учёта следующей смены. Исторические дни сохранятся.";
      byId("totals-date").max=state.today;
      if(!byId("totals-date").value)byId("totals-date").value=state.activeWorkday[0]?.date||state.today;
      byId("totals-date").disabled=!state.canManage;
      byId("manual-shift-open").disabled=!state.canManage||!state.shiftBased||state.mode!=="MANUAL"||!state.activeWorkday.length||state.totals.some(function(x){return x.closingStatus==="open";});
      document.querySelectorAll("[data-accounting-currency]").forEach(function (el) { el.textContent = state.currency || ""; });
      byId("accounting-retry").hidden = true;
      var imports = byId("accounting-imports"); imports.hidden = !state.pendingImports?.length;
      imports.querySelector("div").replaceChildren();
      (state.pendingImports || []).forEach(function(item){
        var row=document.createElement("article"), p=document.createElement("p"), button=document.createElement("button");
        p.textContent=item.date+" · "+format(item.totalRevenue,item.currency);row.append(p);
        var previous=state.totals.find(function(x){return x.date===item.date;});
        if(previous && previous.manualTotalsVersion===1 && item.currency===state.currency){button.className="secondary";button.textContent="Сверить с ручными итогами";button.onclick=function(){
          pendingImport={item:item,previous:previous};pendingMode=null;byId("legacy-schedule-label").hidden=true;
          byId("accounting-confirm-title").textContent="Заменить итоги импортом?";
          byId("accounting-confirm-copy").textContent="Ручные итоги: "+format(previous.revenue)+". Импорт: "+format(item.totalRevenue,item.currency)+". Будет учтён только импорт. Склад спишется по его позициям после проверки. Прежние итоги останутся в истории.";
          byId("accounting-effective").textContent="Замена касается только "+item.date+". Способ учёта следующих дней не меняется.";
          byId("accounting-confirm").querySelector(".accounting-notice").firstChild.textContent="Замена источника выручки";
          byId("import-reason-label").hidden=false;byId("import-reason").value="";
          byId("accounting-confirm-save").textContent="Заменить ручные итоги";byId("accounting-confirm-cancel").textContent="Оставить итоги";
          byId("accounting-confirm-error").textContent="";byId("accounting-confirm").showModal();
        };row.append(button);}else{var note=document.createElement("p");note.className="accounting-help";note.textContent="Дневной импорт требует сверки покрытия всех смен. Он не прибавляется к выручке и не заменяет отдельную смену.";row.append(note);}
        imports.querySelector("div").append(row);
      });
      if (document.body.dataset.salesAccounting === "totals") renderDate();
      else status(!state.canManage ? "Способ учёта меняет владелец заведения." : state.mode === "LEGACY" ? "Существующий способ учёта сохранён. Новый режим изменит только будущие рабочие дни." : "");
    } catch (error) { status(error.message, true); byId("accounting-retry").hidden = false; }
  }
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      pendingImport=null;byId("import-reason-label").hidden=true;byId("accounting-confirm").querySelector(".accounting-notice").firstChild.textContent="Со следующей открываемой смены";
      pendingMode = button.dataset.mode; modeOperation = crypto.randomUUID();
      byId("legacy-schedule-label").hidden=!state.legacyPending;byId("legacy-schedule-accept").checked=false;
      var manual = pendingMode === "MANUAL";
      byId("accounting-confirm-title").textContent = manual ? "Перейти на ручной ввод?" : "Перейти на кассу BarDoctor?";
      byId("accounting-confirm-copy").textContent = manual
        ? "Ручной ввод начнёт действовать со следующей открываемой смены, в том числе сегодня. Итоги вводятся за конкретную смену. Продажи по позициям и автоматическое списание со склада не ведутся. Уже открытая смена и история сохраняются."
        : "Следующая открываемая смена будет работать через кассу BarDoctor. Списание со склада выполняется по настройкам проданных позиций. Уже открытая смена и история сохраняются.";
      byId("accounting-confirm-save").textContent = manual ? "Перейти на ручной ввод" : "Перейти на кассу";
      byId("accounting-confirm-cancel").textContent = manual ? "Оставить кассу" : "Оставить текущий режим";
      byId("accounting-effective").textContent = "Новая смена доступна после закрытия текущей смены и незавершённых заказов. Рабочий день может оставаться открытым.";
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
      }else { if(state.legacyPending&&!byId("legacy-schedule-accept").checked)throw new Error("Подтвердите замену прежнего перехода по дате."); await request({ action: "set_mode", venueId: state.venueId, mode: pendingMode, operationId: modeOperation, acceptLegacySchedule:byId("legacy-schedule-accept").checked }); }
      byId("accounting-confirm").close(); await load();
    } catch (error) { byId("accounting-confirm-error").textContent = error.message; }
    finally { busy = false; this.disabled = false; }
  });
  function changeSelection() {
    var next={date:byId("totals-date").value,shift:byId("totals-shift").value};
    if(busy){byId("totals-date").value=renderedDate;byId("totals-shift").value=renderedShift;return;}
    if(savedFields!==null&&formFields()!==savedFields){pendingSelection=next;byId("totals-date").value=renderedDate;byId("totals-shift").value=renderedShift;showUnsavedConfirm(false);}
    else renderDate();
  }
  function showUnsavedConfirm(leaving) {
    byId("accounting-date-title").textContent=leaving?"Выйти без сохранения?":"Перейти к другой смене?";
    byId("accounting-date-copy").textContent="Введённые изменения не сохранены и будут потеряны. Сохранённые итоги останутся без изменений.";
    byId("accounting-date-confirm").showModal();byId("accounting-date-cancel").focus();
  }
  document.addEventListener("click",function(event){
    var link=event.target.closest?.("a[data-bd-back]");
    if(!link||document.body.dataset.salesAccounting!=="totals")return;
    if(busy||savedFields!==null&&formFields()!==savedFields){
      event.preventDefault();event.stopImmediatePropagation();
      if(!busy){pendingSelection={href:link.href};showUnsavedConfirm(true);}
    }
  },true);
  byId("totals-date").addEventListener("change",changeSelection);byId("totals-shift").addEventListener("change",changeSelection);
  byId("accounting-date-discard").addEventListener("click",function(){if(!pendingSelection)return;if(pendingSelection.href){var href=pendingSelection.href;pendingSelection=null;byId("accounting-date-confirm").close();location.assign(href);return;}byId("totals-date").value=pendingSelection.date;byId("totals-shift").value=pendingSelection.shift;pendingSelection=null;byId("accounting-date-confirm").close();renderDate();});
  byId("accounting-date-confirm").addEventListener("close",function(){if(!this.open)pendingSelection=null;});
  byId("accounting-totals").addEventListener("input",function(event){if(!["totals-date","totals-shift"].includes(event.target.id)){updateSum();saveRequest=null;}});
  byId("manual-shift-open").addEventListener("click",async function(){
    if(busy)return;
    if(savedFields!==null&&formFields()!==savedFields){status("Сначала сохраните введённые итоги или отмените изменения выбором смены.",true);return;}
    busy=true;this.disabled=true;openOperation=openOperation||crypto.randomUUID();
    try{var result=await request({action:"open_manual_shift",venueId:state.venueId,operationId:openOperation});openOperation=null;byId("totals-date").value=result.total.date;await load();byId("totals-shift").value=result.total.id;renderDate();}
    catch(error){status(error.message,true);}finally{busy=false;this.disabled=!state?.canManage||state.mode!=="MANUAL"||state.totals.some(function(x){return x.closingStatus==="open";});}
  });
  byId("accounting-totals").addEventListener("submit", async function (event) {
    event.preventDefault(); if (busy) return;
    var optional = function (id) { return byId(id).value === "" ? null : Number(byId(id).value); };
    saveRequest = saveRequest || { action: "save_totals", venueId: state.venueId, date: byId("totals-date").value, shiftId:saved?.id,
      cash: Number(byId("totals-cash").value), card: Number(byId("totals-card").value),
      receipts: optional("totals-receipts"), cogs: optional("totals-cogs"), expectedRevision: saved?.manualRevision || 0,
      reason: byId("totals-reason").value.trim(), operationId: crypto.randomUUID() };
    busy = true; byId("totals-save").disabled = true; status("Сохраняем…");
    try { await request(saveRequest); await load(); status("Итоги смены сохранены. Финансовый отчёт обновлён."); }
    catch (error) { status(error.message, true); }
    finally { busy = false; byId("totals-save").disabled = !canWrite(); }
  });
  byId("accounting-retry").addEventListener("click", load);
  load();
})();
