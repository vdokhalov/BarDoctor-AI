(() => {
  "use strict";
  const pinMode=document.body.dataset.pinMode==="true";
  const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const uuid=()=>crypto.randomUUID(), icon=name=>`<img class="icon" src="/integration-icons/${name}.svg" alt="">`;
  const labels={owner:"Владелец",manager:"Управляющий",shift_manager:"Администратор",cashier:"Кассир",waiter:"Официант",barista:"Бариста",bartender:"Бармен"};
  const state={data:null,orders:[],rules:[],overview:null,report:null,reportLastSuccess:null,workday:null,adminActionsOpen:false,noticeKind:null,reportId:null,reportContextReady:false,view:["orders","receipts","report"].includes(new URLSearchParams(location.search).get("view"))?new URLSearchParams(location.search).get("view"):"cashier",historyMode:new URLSearchParams(location.search).get("history")==="cancelled"?"cancelled":"paid",historyLimit:20,unpaidOrderId:null,unpaidReasons:{},orderId:null,waiter:null,detailTab:"tables",category:"all",department:"all",subcategory:"all",search:"",busy:false,frozen:false,drafts:{},quick:{id:uuid(),lines:[],comment:""},pending:null,legacy:null,lastSuccess:null,stale:false};
  let dialogSubmit=null,dialogDraft=null,refreshController,navigationGeneration=0,navigationLoading=false,loadGeneration=0;
  const notice=(message,kind="operation")=>{state.noticeKind=kind;$("notice").textContent=message;}, identity=()=>[localStorage.getItem("bd_pos_identity"),localStorage.getItem("bd_session"),localStorage.getItem("bd_session_token")].join(":"), initialIdentity=identity();
  const selectedVenue=()=>new URLSearchParams(location.search).get("venue")||localStorage.getItem("bd_active_venue_id"), initialVenue=selectedVenue();
  const reportContextKey=data=>`bd_cash_report_context_v1:${data.actor.accountId}:${data.venueId}`;
  function restoreReportContext(data,fromHistory=false){
    const params=new URLSearchParams(location.search);let saved={};
    if(!fromHistory&&!params.has('view'))try{saved=JSON.parse(sessionStorage.getItem(reportContextKey(data))||'{}');}catch{}
    const view=params.get('view')||saved.view||'cashier',id=params.get('reportShift')||saved.reportId||null;
    state.view=['cashier','orders','receipts','report'].includes(view)?view:'cashier';
    if(state.reportId!==id)setReport(null);state.reportId=id;state.reportContextReady=true;
  }
  function persistReportContext(push=false){
    if(!state.data||state.frozen)return;
    const url=new URL(location.href);url.searchParams.set('view',state.view);
    if(state.reportId)url.searchParams.set('reportShift',state.reportId);else url.searchParams.delete('reportShift');
    try{sessionStorage.setItem(reportContextKey(state.data),JSON.stringify({view:state.view,reportId:state.reportId}));}catch{}
    if(url.href!==location.href)history[push?'pushState':'replaceState'](history.state,'',url);
    try{if(window.parent!==window&&window.parent.location.origin===location.origin&&window.parent.location.pathname==='/cashier'){
      const outer=new URL(window.parent.location.href);outer.searchParams.set('view',state.view);if(state.reportId)outer.searchParams.set('reportShift',state.reportId);else outer.searchParams.delete('reportShift');window.parent.history.replaceState(window.parent.history.state,'',outer);
    }}catch{}
  }
  window.addEventListener('popstate',()=>{if(state.frozen||!state.data)return;restoreReportContext(state.data,true);void changeView(state.view,false);});
  const money=(amount,currency=state.data?.currency)=>amount==null?"Неизвестно":window.bdFormatAccountingMoney(amount,currency);
  const amount=value=>value==null?"—":new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(value);
  const currency=()=>state.data?.currency==="PRB"?"руб. ПМР":state.data?.currency||"";
  const date=value=>value?new Intl.DateTimeFormat("ru-RU",{dateStyle:"short",timeStyle:"short",timeZone:state.data?.timezone||"UTC"}).format(new Date(value)):"Неизвестно";
  const time=value=>value?new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:state.data?.timezone||"UTC"}).format(new Date(value)):"—";
  const senior=()=>["owner","manager","shift_manager"].includes(state.data?.actor.role), configure=()=>["owner","manager"].includes(state.data?.actor.role);
  const shiftSelectionKey=()=>`bd_pos_shift_v1:${state.data.actor.accountId}:${state.data.venueId}`;
  const selectedShift=data=>{if(!data)return;const open=data.shifts.filter(s=>s.closingStatus==="open"),saved=localStorage.getItem(`bd_pos_shift_v1:${data.actor.accountId}:${data.venueId}`);return open.find(s=>s.id===saved)||(open.length===1?open[0]:undefined);};
  const shift=()=>selectedShift(state.data), selectedOrder=()=>state.orders.find(o=>o.id===state.orderId&&o.status==="OPEN"), activeOrders=()=>state.orders.filter(o=>o.status==="OPEN" && o.shiftId===shift()?.id);
  const storageKey=()=>`bd_pos_workspace_v2:${state.data.actor.accountId}:${state.data.venueId}`;
  function clearView(name){const view=$(name+"-view");view.replaceChildren();view.hidden=true;}
  function setReport(report){if(state.report?.businessDate!==report?.businessDate)state.workday=null;state.report=report;if(report)state.reportId=report.shiftId;state.reportLastSuccess=report?Date.now():null;}
  function reconcileAccess(){
    if(!state.data?.permissions.managementDay){state.workday=null;document.querySelectorAll("[data-management-workday]").forEach(node=>node.remove());}
    if(!senior()){
      state.overview=null;state.workday=null;state.adminActionsOpen=false;setReport(null);state.waiter=null;state.filterWaiter="";
      clearView("overview");clearView("report");
      if(["overview","report"].includes(state.view))state.view="cashier";
    }
    if(!configure()){state.rules=[];clearView("discounts");if(state.view==="discounts")state.view="cashier";}
  }
  function clearSensitive(message) { clearDialogDraft(true);++loadGeneration;++navigationGeneration;navigationLoading=false;state.frozen=true;state.workday=null;state.adminActionsOpen=false;state.overview=null;setReport(null);state.rules=[];state.orders=[];state.data=null;state.view="cashier";["cashier","orders","receipts","overview","report","discounts"].forEach(clearView);$("work").hidden=true;$("sales-journal").hidden=true;$("management-link").hidden=true;$("cashier-venue-host").hidden=true;$("venue-timezone-label").replaceChildren();$("navigation").replaceChildren();$("employee-name").textContent="Требуется обновление";$("employee-role").textContent="";$("dialog").close();$("dialog-content").replaceChildren();refreshController?.stop();notice(message); }
  function assertCurrentLoad(generation){if(generation!==undefined&&(generation!==loadGeneration||state.frozen)){const error=Error("Устаревшее обновление пропущено.");error.stale=true;throw error;}}
  async function request(path,body,generation) {
    assertCurrentLoad(generation);
    if(state.frozen)throw Error("Обновите кассу перед продолжением.");
    if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Аккаунт или заведение изменились. Обновите кассу.");throw Error("Контекст изменился");}
    const headers={"Content-Type":"application/json"};const email=localStorage.getItem("bd_session"),token=localStorage.getItem("bd_session_token");
    if(pinMode&&state.data)headers["X-POS-Actor"]=String(state.data.actor.accountId);
    if(!pinMode&&email&&token){headers["X-Session-Email"]=email;headers["X-Session-Token"]=token;}if(initialVenue)headers["X-Venue-Id"]=initialVenue;
    let response;
    try { response=await fetch(path,{method:body?"POST":"GET",headers,cache:"no-store",...(body?{body:JSON.stringify({...body,venueId:state.data.venueId})}:{}),signal:AbortSignal.timeout(20000)}); }
    catch { assertCurrentLoad(generation);const error=Error("Нет связи. Запрос сохранён, если операция уже начата.");error.uncertain=true;error.network=true;throw error; }
    if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Контекст изменился. Обновите кассу.");throw Error("Контекст изменился");}
    assertCurrentLoad(generation);
    if([401,403].includes(response.status)) {
      clearSensitive(response.status===401?"Сессия завершена. Войдите снова.":"Доступ или заведение изменились. Обновите кассу.");
      if(response.status===401){
        // Match the shared expired-session contract; retain venue-scoped drafts.
        for(const key of ["bd_session","bd_session_token","bd_session_userid"])localStorage.removeItem(key);
        location.replace(pinMode?"/login":"/login");
      }
    }
    let data,malformed=false;try{data=await response.json();if(!data||typeof data!=="object"||Array.isArray(data)){data={};malformed=true;}}catch{data={};malformed=true;}
    if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Контекст изменился. Обновите кассу.");throw Error("Контекст изменился");}
    assertCurrentLoad(generation);
    if(data.code==="VENUE_CHANGED"&&!state.frozen)clearSensitive("Доступ или заведение изменились. Обновите кассу.");
    if(malformed){const error=Error("Ответ сервера получен не полностью. Сохранённый запрос можно проверить и повторить.");error.uncertain=true;throw error;}
    if(path==="/api/sales-events"&&!body&&!state.frozen)$("sales-journal").hidden=response.headers.get("X-BD-Sales-Journal")!=="1";
    if(!response.ok||!data.ok){const error=Error(data.error||({POS_ORDER_SHIFT_HAS_OPEN_ORDERS:"Перед закрытием завершите или отмените все открытые заказы.",POS_CASH_NEEDS_REVIEW:"Проверьте кассовые суммы и причину операции."})[data.code]||"Операция не выполнена. Обновите данные и проверьте запрос.");error.status=response.status;error.code=data.code;error.uncertain=response.status>=500;throw error;}
    return data;
  }
  function saveLocal() { try {if(state.quick.shiftId)state.drafts[state.quick.shiftId]=state.quick;localStorage.setItem(storageKey(),JSON.stringify({quick:state.quick,pending:state.pending,byShift:state.drafts}));}catch{throw Error("Не удалось сохранить запрос в браузере. Оплата заблокирована до восстановления хранилища.");} }
  function restoreLocal() {
    const raw=localStorage.getItem(storageKey());
    if(raw){const saved=JSON.parse(raw);if(!saved.quick||!Array.isArray(saved.quick.lines))throw Error("Локальный черновик повреждён. Сохранённые данные не удалены.");state.quick=saved.quick;state.pending=saved.pending||null;state.drafts=saved.byShift||{};}
    const prefix=`bd_pos_draft_v1:${encodeURIComponent(state.data.actor.accountId)}:${encodeURIComponent(state.data.venueId)}:`;
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix)){const draft=window.bdPosDraft.read(localStorage,key);if(draft?.pending||draft?.lines?.length){state.legacy={key,draft,storage:"local"};break;}}}
    const legacyKey=`bd_pos_pending:${localStorage.getItem("bd_session")}:${state.data.venueId}`,old=sessionStorage.getItem(legacyKey);
    if(old&&!state.legacy)state.legacy={key:legacyKey,draft:JSON.parse(old),storage:"session"};
  }
  function syncQuickShift(){
    const current=shift();if(!current||state.pending||state.legacy)return;
    // An unbound populated draft has no proven source shift. Keep it for explicit recovery.
    if(!state.quick.shiftId&&state.quick.lines.length){state.legacy={draft:state.quick,storage:"workspace"};return;}
    if(!state.quick.shiftId){state.quick.shiftId=current.id;return;}
    if(state.quick.shiftId!==current.id){
      state.drafts[state.quick.shiftId]=state.quick;
      state.quick=state.drafts[current.id]||{id:uuid(),lines:[],comment:"",shiftId:current.id};
      state.orderId=null;
    }
  }
  async function load(view=state.view) {
    const generation=++loadGeneration,read=path=>request(path,undefined,generation);
    const dataPromise=read("/api/sales-events").then(data=>{
      assertCurrentLoad(generation);
      // Revoke cached management data even if the independent orders request fails first.
      if(state.data&&(state.data.actor.role!==data.actor.role||JSON.stringify(state.data.permissions)!==JSON.stringify(data.permissions))){clearDialogDraft();$("dialog").close();$("dialog-content").replaceChildren();state.data=data;state.orders=[];reconcileAccess();render();}
      return data;
    });
    const [data,orders]=await Promise.all([dataPromise,read("/api/pos-orders")]);
    if(data.venueId!==orders.venueId||(initialVenue&&String(data.venueId)!==String(initialVenue)))throw Error("Заведение изменилось. Обновите кассу.");
    if(!state.reportContextReady){restoreReportContext(data);view=state.view;}
    const current=selectedShift(data),management=["owner","manager","shift_manager"].includes(data.actor.role),reportId=state.reportId||state.report?.shiftId||data.shifts.at(-1)?.id;
    const reportAllowed=!!reportId&&data.shifts.some(s=>s.id===reportId);
    const [overview,reportResult,days]=await Promise.all([
      view==="overview"&&management&&current?read("/api/pos-overview?shiftId="+encodeURIComponent(current.id)):null,
      view==="report"&&management&&reportAllowed&&(state.report?.status!=="closed"||state.report.shiftId!==reportId)?read("/api/sales-events?reportShiftId="+encodeURIComponent(reportId)):null,
      data.permissions.managementDay&&["report","overview"].includes(view)?read("/api/operational-days"):null
    ]);
    const report=view==="report"&&!reportAllowed?null:reportResult?.report;
    if(report&&(report.shiftId!==reportId||(report.venueId!=null&&String(report.venueId)!==String(data.venueId))))throw Error("Ответ относится к другой смене. Обновите отчёт.");
    const businessDate=view==="report"?(report||state.report)?.businessDate:view==="overview"?current?.date:null;
    if(days&&days.venueId!==data.venueId)throw Error("Заведение изменилось. Обновите кассу.");
    const workday=days?.days.find(day=>day.businessDate===businessDate)||null;
    assertCurrentLoad(generation);
    return {generation,data,orders:orders.orders,overview,report,workday};
  }
  function accept(value,restoreWorkspace=false) { if(state.frozen||value.generation!==loadGeneration)return false;if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Контекст изменился. Обновите кассу.");return false;}state.data=value.data;if(restoreWorkspace)restoreLocal();syncQuickShift();if(restoreWorkspace)saveLocal();state.orders=value.orders;if(state.orderId&&!selectedOrder())state.orderId=null;state.overview=value.overview;if(value.report!==undefined)setReport(value.report);state.workday=value.workday||null;reconcileAccess();if(state.view==="report"&&state.report)state.reportId=state.report.shiftId;persistReportContext(false);state.lastSuccess=Date.now();state.stale=false;$("connection").textContent="На связи";if(state.noticeKind==="connection")notice("");render();return true; }
  async function reload(){accept(await load());}
  function errorView(error){if(error.stale)return;state.stale=true;$("connection").textContent=error.network?"Нет соединения":error.code==="STOCK_EVIDENCE_CAPACITY_REACHED"?"История склада заполнена":"Данные устарели";notice(error.message,error.network&&!state.pending&&!state.legacy?"connection":"operation");if(state.data)render();}
  async function working(task) {
    if(state.busy||navigationLoading||state.frozen||refreshController?.state().running)return;
    state.busy=true;setBusy();
    try{await task();}catch(error){errorView(error);if($("dialog").open)$("dialog-error").textContent=error.message;}
    finally{state.busy=false;setBusy();renderRecovery();}
  }
  function setBusy(){document.querySelectorAll("button").forEach(b=>{if(!b.hasAttribute("data-ineligible"))b.disabled=b.dataset.view?false:state.busy||navigationLoading;});$("work").setAttribute("aria-busy",String(state.busy||navigationLoading));}
  // Exact canonical draft fingerprint; provenance stays client-side, outside the server command.
  function quickOrigin(draft){return {kind:"quick_to_table",draftId:draft.id,fingerprint:JSON.stringify({id:draft.id,comment:draft.comment||"",lines:draft.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity}))})};}
  function matchesQuick(draft,origin){return !!draft&&Array.isArray(draft.lines)&&draft.id===origin.draftId&&quickOrigin(draft).fingerprint===origin.fingerprint;}
  async function mutate(path,body,origin) {
    if(state.pending||state.legacy)throw Error("Сначала проверьте сохранённую операцию.");
    state.pending={path,body,...(origin?{origin}:{})};saveLocal();
    return sendPending();
  }
  function confirmPending(saved,key){
    try{
      const durable=JSON.parse(localStorage.getItem(key)||"null");
      if(!durable?.quick||!Array.isArray(durable.quick.lines)||durable.pending&&JSON.stringify(durable.pending)!==JSON.stringify(saved))throw Error("Локальный запрос изменился");
      let quick=durable.quick;
      if(saved.origin?.kind==="quick_to_table"&&saved.body.action==="create"){
        // A different draft (including a concurrent localStorage edit) is never consumed.
        if(matchesQuick(durable.quick,saved.origin))quick=matchesQuick(state.quick,saved.origin)?{id:uuid(),lines:[],comment:"",shiftId:state.quick.shiftId}:state.quick;
      }else if(saved.body.action==="post")quick={id:uuid(),lines:[],comment:"",shiftId:saved.body.command?.shiftId||state.quick.shiftId};
      // Persist acknowledgement and consumption together, before any network reload.
      const byShift={...(durable.byShift||{}),...(quick.shiftId?{[quick.shiftId]:quick}:{})};
      localStorage.setItem(key,JSON.stringify({...durable,quick,pending:null,byShift}));state.quick=quick;state.drafts=byShift;state.pending=null;
    }catch{
      const error=Error("Операция подтверждена сервером, но локальное подтверждение не сохранено. Обновите кассу и проверьте сохранённый запрос.");error.uncertain=true;throw error;
    }
  }
  async function sendPending(){
    if(!state.pending)return;
    const saved=state.pending,key=storageKey();let result;
    try{result=await request(saved.path,saved.body);}
    catch(error){if(!error.uncertain&&!state.frozen){state.pending=null;saveLocal();await reload().catch(()=>{});}throw error;}
    confirmPending(saved,key);await reload();return result;
  }
  async function orderAction(action,extra={}) {
    const order=selectedOrder();if(!order)throw Error("Выберите заказ.");
    const result=await mutate("/api/pos-orders",{action,orderId:order.id,expectedRevision:order.revision,operationId:uuid(),...extra});
    notice("Заказ сохранён.");return result;
  }
  // Session-only form recovery; never restore a command, preview hash or submission.
  const dialogDraftKey=()=>state.data?storageKey()+":dialog":null;
  function dialogContext(orderId=state.orderId){
    const order=orderId?state.orders.find(o=>o.id===orderId&&o.status==="OPEN"):null;
    return {actor:state.data.actor.accountId,role:state.data.actor.role,permissions:state.data.permissions,venue:state.data.venueId,currency:state.data.currency,shift:shift()?.id||null,orderId:orderId||null,order:order?{id:order.id,revision:order.revision,shiftId:order.shiftId}:null,quick:orderId?null:{id:state.quick.id,shiftId:state.quick.shiftId,comment:state.quick.comment,lines:state.quick.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity}))},menu:state.data.menu.map(m=>({id:m.id,price:m.salePrice}))};
  }
  function clearDialogDraft(all=false){const key=dialogDraftKey();dialogDraft=null;try{if(all){for(let i=sessionStorage.length-1;i>=0;i--){const candidate=sessionStorage.key(i);if(candidate?.startsWith("bd_pos_workspace_v2:")&&candidate.endsWith(":dialog"))sessionStorage.removeItem(candidate);}}else if(key)sessionStorage.removeItem(key);}catch{}}
  function saveDialogDraft(){
    if(!dialogDraft||!$("dialog").open||state.frozen)return;
    const values={};for(const input of $("dialog-form").querySelectorAll('[name="quantity"],[name="method"]'))if(input.type!=="radio"||input.checked)values[input.name]=input.value;
    try{sessionStorage.setItem(dialogDraftKey(),JSON.stringify({...dialogDraft,values}));}catch{ /* Editing and the existing durable transaction guard still work. */ }
  }
  function restoreDialogDraft(){
    let saved;try{saved=JSON.parse(sessionStorage.getItem(dialogDraftKey())||"null");}catch{return;}
    if(!saved)return;clearDialogDraft();
    if(state.frozen||state.pending||state.legacy||!saved.context?.shift||JSON.stringify(saved.context)!==JSON.stringify(dialogContext(saved.context.orderId)))return;
    if(!["add","quantity","payment"].includes(saved.kind))return;
    state.orderId=saved.context.orderId;state.view="cashier";render();
    const selector=saved.kind==="add"?'[data-add]':saved.kind==="quantity"?'[data-edit-quantity]':'[data-action="payment"]';
    const button=Array.from(document.querySelectorAll(selector)).find(b=>saved.kind==="payment"||(saved.kind==="add"?b.dataset.add:b.dataset.editQuantity)===saved.id);
    if(!button||button.disabled)return;button.click();
    if(!dialogDraft||!$("dialog").open)return;
    for(const input of $("dialog-form").querySelectorAll('[name="quantity"],[name="method"]')){
      if(typeof saved.values?.[input.name]!=="string")continue;
      if(input.type==="radio")input.checked=input.value===saved.values[input.name];else input.value=saved.values[input.name];
    }
    saveDialogDraft();notice("Незавершённый ввод восстановлен. Проверьте данные перед подтверждением.");
  }
  function dialog(title,content,submit,label="Подтвердить",draft=null) {
    clearDialogDraft();if(draft){saveLocal();dialogDraft={...draft,context:dialogContext()};}
    $("dialog-title").textContent=title;$("dialog-content").innerHTML=content;$("dialog-error").textContent="";$("dialog-submit").textContent=label;$("dialog-submit").hidden=!submit;dialogSubmit=submit;$("dialog").showModal();saveDialogDraft();
  }
  $("dialog-form").addEventListener("input",saveDialogDraft);$("dialog-form").addEventListener("change",saveDialogDraft);
  $("dialog").addEventListener("close",()=>{if(!$("dialog").open){clearDialogDraft();delete $("dialog").dataset.cancelRestriction;if($("dialog").dataset.cancelHistory){delete $("dialog").dataset.cancelHistory;const url=new URL(location.href);url.searchParams.delete("cancelledOrder");history.replaceState(null,"",url);}}});
  $("dialog-form").onsubmit=event=>{event.preventDefault();void working(async()=>{if(dialogDraft&&JSON.stringify(dialogDraft.context)!==JSON.stringify(dialogContext())){clearDialogDraft();$("dialog").close();throw Error("Данные заказа изменились. Проверьте заказ и откройте действие снова.");}if(dialogSubmit)await dialogSubmit(new FormData($("dialog-form")));if(!state.frozen){clearDialogDraft();$("dialog").close();}});};
  const field=(name,label,type="text",value="",attrs="")=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const sentLines=order=>new Set((order?.preparationTickets||[]).flatMap(ticket=>ticket.lines.map(line=>line.lineId)));
  const wholeOrderCancellationBlocked=order=>Boolean(order?.lines.some(line=>sentLines(order).has(line.id)));
  const wholeOrderCancellationMessage="Подтверждённые блюда отменяйте по отдельности.";
  function preparationHistory(order){return (order?.preparationTickets||[]).length?`<details><summary>Бегунки (${order.preparationTickets.length})</summary>${order.preparationTickets.map(t=>`<article class="readonly"><strong>${t.kind==='CANCELLATION'?'ОТМЕНА · ':''}${esc(t.sectionName)} · ${esc(date(t.createdAt))}</strong><p>${t.kind==='CANCELLATION'?`Заказ ${esc(t.orderId)} · исходный бегунок ${esc(t.originalTicketId)}<br>Причина: ${esc(t.reason)}<br>${t.stockDecision==='WRITE_OFF'?'Списано со склада':t.stockDecision==='NO_WRITE_OFF'?'Без списания':'Складское решение ранее не фиксировалось'}<br>`:''}${t.status==='unconfigured'?'Принтер не настроен':'Маршрут · '+esc(t.printerName)}</p>${t.lines.map(l=>`<div>${esc(l.name)} × ${l.quantity}</div>`).join('')}<small>Подтверждено: ${esc(t.createdBy.name)}. Статус доставки — в очереди печати.</small></article>`).join('')}</details>`:'';}
  async function showPrintQueue(){
    const data=await request('/api/print-management');
    const labels={queued:'В очереди',leased:'Получено узлом',sending:'Отправка начата',accepted_by_transport:'Принято транспортом · бумага не подтверждена',failed_before_send:'Отказ до отправки',outcome_unknown:'Исход неизвестен · проверьте бумагу и очередь Windows',operator_confirmed:'Оператор подтвердил бумагу',operator_resolved:'Оператор запросил копию',unconfigured:'Нет маршрута',replacement_review:'После замены узла · нужна ручная сверка, без перепечатки',blocked_history:'Отмена старого бегунка · нужен разбор руководителя'};
    dialog('Принтеры и очередь',`<p>${data.active?'Узел подключён':'Узел не активен'} · последняя связь: ${esc(date(data.node?.lastSeen))}</p><p>Компьютер должен быть включён, агент — запущен. Приём транспортом не подтверждает бумагу.</p><div class="actions"><button type="button" data-action="print-refresh">Обновить</button><button type="button" data-action="preparation-routes">Привязать подразделения</button>${!data.node?'<button type="button" data-action="print-pair">Создать код подключения на 10 минут</button>':data.active?'<button type="button" data-action="print-test">Тест печати</button><button type="button" class="danger" data-action="print-revoke">Отозвать доступ компьютера</button>':''}</div>${(data.node?.printers||[]).map(p=>`<p>${esc(p.name)} (${esc(p.id)})</p>`).join('')}<p>В архиве: ${data.archivedCount||0}. Ожидают места в активной очереди: ${data.backlog||0}. Слишком большие задания: ${data.oversized||0}.</p><button type="button" data-action="print-history:">Архив отправок</button>${data.node?'<button type="button" data-action="print-replace">Заменить компьютер</button>':''}<h3>Активные задания (${data.jobs.length})</h3>${data.jobs.length?data.jobs.slice(-100).reverse().map(j=>`<article class="readonly"><strong>${j.kind==='CANCELLATION'?'ОТМЕНА · ':''}${esc(j.sectionName)}</strong><p>Заказ ${esc(j.orderId)} · ${esc(j.printerId||'нет принтера')}</p><p>${esc(labels[j.status]||j.status)}</p><small>${esc(j.detail||'')}</small>${['replacement_review','blocked_history','unconfigured'].includes(j.status)?`<button type="button" data-action="print-resolve:${encodeURIComponent(j.id)}">Сверить вручную</button>`:''}</article>`).join(''):'<p>Новых заданий нет. Старые заказы при подключении автоматически не печатаются.</p>'}<p>Для спорного результата проверьте бумагу и spooler. Копия запрашивается явно на компьютере агента и печатается с отметкой «КОПИЯ».</p>`,null);
  }
  function showPairingData(pairing){dialog('Подключение компьютера',`<p>Данные действуют до ${esc(date(pairing.expires))}. Передайте их агенту через stdin. Для замены используйте новый пустой каталог состояния; старый журнал сохраните.</p><label>Данные сопряжения<textarea readonly rows="5">${esc(JSON.stringify(pairing))}</textarea></label>`,null);}
  async function replacePrint(){const current=await request('/api/print-management');dialog('Замена компьютера',`<p>Доступ старого узла будет отозван. Уже выданные ему задания не будут автоматически перепечатаны: их нужно сверить и обработать вручную. Завершённые отправки останутся в архиве.</p>${field('reason','Причина замены','text','','required maxlength=500')}<label><input type="checkbox" name="reviewed" required>Понимаю: неизвестные задания нужно сверить, без автоматического повтора</label>`,async form=>{const result=await request('/api/print-management',{action:'replace',expectedRevision:current.revision,nodeId:current.node.id,acknowledgeUncertain:form.get('reviewed')==='on',reason:String(form.get('reason'))});setTimeout(()=>{if(!state.frozen)showPairingData(result.pairing)},0);},'Отозвать старый узел и заменить');}
  async function resolvePrint(id){const current=await request('/api/print-management');dialog('Ручная сверка задания',`<p>Проверьте бумагу, старый компьютер и очередь принтера. Эта операция отметит задание обработанным вручную и НЕ отправит его повторно.</p>${field('reason','Что проверено и как обработано','text','','required maxlength=500')}<label><input type="checkbox" name="reviewed" required>Сверено и обработано вручную; не перепечатывать</label>`,async form=>{await request('/api/print-management',{action:'resolve',expectedRevision:current.revision,jobId:id,reason:String(form.get('reason')),acknowledgeUncertain:form.get('reviewed')==='on'});notice('Ручная обработка зафиксирована в архиве. Повторная отправка не создана.');},'Зафиксировать сверку');}
  async function showPrintHistory(cursor){const data=await request('/api/print-management?archive=1'+(cursor?'&cursor='+encodeURIComponent(cursor):''));dialog('Архив отправок',`<p>Архив хранит результат доставки, а не обещание физической печати.</p>${data.jobs.map(j=>`<article class="readonly"><strong>${esc(j.sectionName)} · заказ ${esc(j.orderId)}</strong><p>${esc(j.status)}</p><small>${esc(j.detail||'')} · ${esc(date(j.archivedAt))}</small></article>`).join('')}${data.nextCursor?`<button type="button" data-action="print-history:${encodeURIComponent(data.nextCursor)}">Следующая страница</button>`:''}`,null);}
  async function showPrintPair(){
    const current=await request('/api/print-management');const result=await request('/api/print-management',{action:'pair',expectedRevision:current.revision});
    dialog('Подключение компьютера',`<p>На Windows-компьютере запустите подготовленный агент по инструкции и передайте этот одноразовый код. Действует до ${esc(date(result.pairing.expires))}. Не отправляйте его посторонним.</p><label>Данные сопряжения<textarea readonly rows="5">${esc(JSON.stringify(result.pairing))}</textarea></label><p>После подключения обновите очередь и привяжите подразделения.</p>`,null);
  }
  async function testPrint(){const current=await request('/api/print-management');dialog('Тест печати',`<p>Будет отправлен один тестовый бегунок. Проверьте бумагу, кириллицу и ширину.</p><label>Принтер<select name="printerId">${(current.node?.printers||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>`,async form=>{await mutate('/api/print-management',{action:'test',operationId:uuid(),expectedRevision:current.revision,printerId:String(form.get('printerId'))});notice('Тест поставлен в очередь. Проверьте результат на принтере.');},'Отправить тест');}
  async function revokePrint(){const current=await request('/api/print-management');dialog('Отозвать доступ компьютера',`<p>Новые отправки будут запрещены. Уже переданные принтеру задания отменить удалённо невозможно. Повторное подключение потребует проверки очереди.</p>`,async()=>{await request('/api/print-management',{action:'revoke',expectedRevision:current.revision});notice('Доступ узла отозван. Проверьте незавершённые отправки.');},'Отозвать доступ');}
  async function showPreparationRoutes(){
    const [data,cloud]=await Promise.all([request('/api/pos-preparation'),request('/api/print-management')]);
    const printers=cloud.node?.printers||[];
    dialog('Маршрутизация бегунков',`<p>Выберите подразделение меню и принтер подключённого компьютера. Изменение влияет только на новые бегунки; отмена сохраняет исходный маршрут.</p><label>Подразделение<select name="sectionId">${data.sections.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>Принтер<select name="printerId"><option value="">Не назначен</option>${printers.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>${!cloud.active?'<p>Сначала подключите компьютер в разделе «Принтеры и очередь».</p>':''}${data.config.routes.map(r=>`<p>${esc(data.sections.find(s=>s.id===r.sectionId)?.name||r.sectionId)} → ${esc(r.printerName)}</p>`).join('')}`,async form=>{
      const id=String(form.get('printerId')),printer=printers.find(p=>p.id===id);
      await mutate('/api/pos-preparation',{operationId:uuid(),expectedRevision:data.config.revision,sectionId:String(form.get('sectionId')),printerId:id,printerName:printer?.name||''});notice('Маршрут сохранён. Результаты отправки смотрите в очереди.');
    },'Сохранить маршрут');
  }
  function renderRecovery(){
    $("recovery").hidden=!state.pending&&!state.legacy;
    $("recovery").innerHTML=state.legacy?'<strong>Есть незавершённый заказ из прежней кассы.</strong><p>Он сохранён. Новая оплата заблокирована до проверки результата.</p><button data-action="legacy">Проверить и восстановить</button>':state.pending?'<strong>Результат операции ещё не подтверждён.</strong><p>Повтор использует тот же номер операции.</p><button id="retry" data-action="retry">Проверить результат и повторить</button>':"";
  }
  function nav(){
    const items=[["cashier","Касса","grid-2x2"],["orders","Незакрытые счета","clipboard-list"],["receipts","Чеки","circle-check"],...(senior()?[["overview","Текущая смена","clock-3"],["report","Отчёт смены","activity"]]:[]),...(configure()?[["discounts","Настройка скидок","settings-2"]]:[])];
    $("navigation").innerHTML=items.map(([key,label,image])=>`<button data-view="${key}" aria-pressed="${state.view===key}">${icon(image)}${label}</button>`).join("");$("management-link").hidden=!senior();$("cashier-venue-host").hidden=!senior();
  }
  function pricing(order){return order.lines.some(l=>l.pricingUnavailable)?null:order.totals?.netAmount??order.lines.reduce((n,l)=>n+Math.round(l.total*100),0)/100;}
  function quickLines(){return state.quick.lines.map(l=>{const item=state.data.menu.find(m=>m.id===l.menuItemId);const valid=item&&typeof item.salePrice==="number"&&Number.isFinite(item.salePrice)&&Math.abs(item.salePrice*100-Math.round(item.salePrice*100))<0.000001;return {...l,name:item?.name||l.name||"Недоступная позиция",unitPrice:valid?item.salePrice:null,total:valid?Math.round(item.salePrice*100)*l.quantity/100:null};});}
  function quickTotal(){const lines=quickLines();return lines.some(l=>l.total==null)?null:lines.reduce((n,l)=>n+Math.round(l.total*100),0)/100;}
  const badge=o=>`<span class="badge ${o.precheck||o.status==="PRECHECK"?"precheck":""}">${o.status==="CANCELLED"?"Отменён":o.status==="PAID"?"Оплачен":o.precheck||o.status==="PRECHECK"?"Предчек":"Открыт"}</span>`;
  function orderCard(o,owner){const total=o.totals?.netAmount===null?null:o.totals?.netAmount??pricing(o);return `<button class="order-card" data-order="${esc(o.id)}"><strong>Стол ${esc(o.tableNumber)}</strong><span class="muted">${esc(owner||o.createdBy?.name||"")}</span><b>${esc(amount(total))} <span class="currency">${esc(currency())}</span></b>${badge(o)}<span class="card-arrow">${icon("chevron-right")}</span></button>`;}
  function render(){
    if(!state.data||state.frozen)return;
    $("work").hidden=false;$("venue-name").textContent=state.data.venueName||"Заведение";$("employee-name").textContent=state.data.actor.name;$("employee-role").textContent=labels[state.data.actor.jobTitle||state.data.actor.role]||"Сотрудник";
    nav();for(const v of ["cashier","orders","receipts","overview","report","discounts"])$(v+"-view").hidden=state.view!==v;
    $("shift-gate").hidden=true;
    if(state.view==="cashier")renderCashier();if(state.view==="orders")renderOrders();if(state.view==="receipts")renderReceipts();if(state.view==="overview")renderOverview();if(state.view==="report")renderReport();if(state.view==="discounts")renderDiscounts();
    renderRecovery();setBusy();
  }
  function visibleMenu() {
    const query=state.search.trim().toLocaleLowerCase("ru");
    return state.data.menu.filter(m=>query ? m.name.toLocaleLowerCase("ru").includes(query)
      : (state.department==="all"||m.sectionId===state.department)
        && (state.category==="all"||m.categoryId===state.category)
        && (state.subcategory==="all"||m.subcategoryId===state.subcategory));
  }
  function renderCashier(){
    const timezoneLabel=$("venue-timezone-label");timezoneLabel.dataset.configured=String(state.data.timezoneConfigured===true);
    timezoneLabel.innerHTML=state.data.timezoneConfigured?`Часовой пояс: ${esc(state.data.timezone)}`:`Часовой пояс не настроен. Учётная дата около полуночи может отличаться.${senior()?` <a href="/profile/venue?venue=${encodeURIComponent(state.data.venueId)}">Настроить часовой пояс</a>`:""}`;
    const current=shift(),order=selectedOrder(),open=state.data.shifts.filter(s=>s.closingStatus==="open");
    const picker=open.length>1?`<label id="shift-picker-label">Кассовая смена<select id="shift-picker" ${state.pending||state.legacy?"disabled":""}><option value="">Выберите смену</option>${open.map(s=>`<option value="${esc(s.id)}" ${current?.id===s.id?"selected":""}>${esc(s.shiftName)} · ${esc(s.date)}</option>`).join("")}</select></label>`:"";
    if(!current&&open.length>1){$("cashier-view").innerHTML=`<section class="panel"><h2>Выберите открытую смену</h2><p>Обнаружены ранее открытые параллельные смены. Черновики и оплаты учитываются раздельно.</p>${picker}</section>`;return;}
    const dayGate=state.data.workday,linked=dayGate?.ok&&(!current||dayGate.date===current.date);
    if(!linked){
      const day=current?.date||dayGate?.date,href="/shifts?venue="+encodeURIComponent(state.data.venueId)+(day?"&workday="+encodeURIComponent(day)+"&month="+day.slice(0,7):""),outstanding=current?activeOrders().length:0;
      const closure=current&&state.data.permissions.shifts?`<section data-legacy-cash-close><h3>${esc(current.shiftName)} · ${esc(current.date)}</h3>${outstanding?`<p role="status">Закрытие кассы недоступно: незакрытых заказов — ${outstanding}. Оплата недоступна: для этой даты нет открытого рабочего дня с командой. Руководитель может проверить незакрытые счета и отменить неоплаченный счёт с указанием причины.</p>`:'<p>Незакрытых заказов нет. Существующую кассу можно закрыть без открытия рабочего дня.</p><button data-action="close-shift">Закрыть смену</button>'}<button data-view="orders">Незакрытые счета</button><button data-view="report">Просмотреть отчёт кассы</button></section>`:"";
      $("cashier-view").innerHTML=`<section class="panel" data-workday-required><h2>Сначала откройте рабочий день</h2><p>${current?"Касса и заказы сохранены. Для новых продаж нужен открытый рабочий день с той же датой. ":""}${state.data.permissions.managementDay?"Проверьте рабочий день и команду в разделе «Смены».":"Попросите руководителя открыть рабочий день и кассу."}</p>${state.data.permissions.managementDay?`<a class="primary" href="${esc(href)}">Перейти в Смены</a>`:""}${closure}</section>`;return;
    }
    if(!current){$("cashier-view").innerHTML=`<section class="panel"><h2>Кассовая смена закрыта</h2><p>${state.data.permissions.shifts?"Откройте смену и укажите размен для сверки наличных.":"Попросите администратора, управляющего или владельца открыть смену."}</p>${state.data.permissions.shifts?'<button class="primary" data-action="open-shift">Открыть смену</button>':""}</section>`;return;}
    const orders=activeOrders(),lines=order?order.lines:quickLines(),total=order?pricing(order):quickTotal();
    const departments=[...new Map(state.data.menu.filter(m=>m.sectionId).map(m=>[m.sectionId,m.department||m.section||m.sectionName||m.sectionId])).entries()];
    const categoryItems=state.data.menu.filter(m=>state.department==="all"||m.sectionId===state.department);
    const categories=[...new Map(categoryItems.filter(m=>m.categoryId).map(m=>[m.categoryId,m.category])).entries()];
    const subcategories=[...new Map(categoryItems.filter(m=>m.subcategoryId&&(state.category==="all"||m.categoryId===state.category)).map(m=>[m.subcategoryId,m.subcategory])).entries()];
    const menu=visibleMenu();
    const confirmed=sentLines(order),locked=!!order?.precheck||!!order?.discount,blocked=state.pending||state.legacy||total==null||!lines.length||!state.data.permissions.post;
    $("cashier-view").innerHTML=`<div class="toolbar">${picker}<small>${esc(current.shiftName)} · ${esc(current.date)} · ${esc(state.data.timezone||"UTC")}</small>${state.data.permissions.shifts?'<div class="actions"><button data-action="cash">Кассовая операция</button><button data-action="close-shift">Закрыть смену</button></div>':""}</div>
      <div class="order-tabs"><button data-action="quick" aria-pressed="${!order}">Быстрая продажа<small>${esc(money(quickTotal()))}</small></button>${orders.map(o=>`<button data-order="${esc(o.id)}" aria-pressed="${order?.id===o.id}">Стол ${esc(o.tableNumber)}<small>${esc(money(pricing(o)))}</small></button>`).join("")}<button data-action="create-order">${icon("plus")} Заказ</button></div>
      <div class="mobile-tabs"><button data-pane="order" aria-pressed="${document.body.dataset.pane!=="menu"}">Заказ · ${lines.reduce((n,l)=>n+l.quantity,0)}</button><button data-pane="menu" aria-pressed="${document.body.dataset.pane==="menu"}">Меню</button></div>
      <div class="layout"><section class="menu-panel panel"><label><span class="muted">Цены в ${esc(currency())}</span><input id="menu-search" type="search" placeholder="Поиск по меню" value="${esc(state.search)}"></label>${departments.length?`<label>Раздел<select id="menu-department"><option value="all">Все разделы</option>${departments.map(([id,name])=>`<option value="${esc(id)}" ${state.department===id?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}<div class="categories"><button data-category="all" aria-pressed="${state.category==="all"}">Все</button>${categories.map(([id,name])=>`<button data-category="${esc(id)}" aria-pressed="${state.category===id}">${esc(name)}</button>`).join("")}</div>${subcategories.length?`<label>Подкатегория<select id="menu-subcategory"><option value="all">Все подкатегории</option>${subcategories.map(([id,name])=>`<option value="${esc(id)}" ${state.subcategory===id?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}<div class="menu-grid">${menu.length?menu.map(m=>`<button class="menu-item" data-add="${esc(m.id)}" ${locked||m.salePrice==null?'disabled data-ineligible':''}>${m.imageUrl?`<img src="${esc(m.imageUrl)}" alt="" loading="lazy">`:""}<strong>${esc(m.name)}</strong><small>${esc(m.subcategory||m.category||"")}</small><span>${esc(money(m.salePrice))}</span></button>`).join(""):'<p class="empty">Позиций по этому запросу нет.</p>'}</div></section>
      <section class="cart panel"><div class="section-head"><div><h2>${order?"Стол "+esc(order.tableNumber):"Быстрая продажа"}</h2><small>${order?esc(order.createdBy.name)+" · "+esc(time(order.createdAt)):"Выберите позиции из меню"}</small></div>${order?badge(order):""}</div><div class="lines">${lines.length?lines.map(l=>`<div class="line" data-menu-item="${esc(l.menuItemId)}"><div class="copy"><strong>${esc(l.name)}</strong><small><output>${l.quantity}</output> × ${esc(money(l.unitPrice))}</small></div><strong class="line-sum">${esc(money(l.pricingUnavailable?null:l.total))}</strong><div class="quantity-controls"><button data-decrease-line="${esc(l.id)}" data-decrease="${esc(l.menuItemId)}" aria-label="Уменьшить ${esc(l.name)}" ${locked||confirmed.has(l.id)?'disabled data-ineligible':''}>−</button><button data-edit-quantity="${esc(l.id)}" aria-label="Количество ${esc(l.name)}" ${locked||confirmed.has(l.id)?'disabled data-ineligible':''}>${l.quantity} шт.</button><button data-increase-line="${esc(l.id)}" data-increase="${esc(l.menuItemId)}" aria-label="Увеличить ${esc(l.name)}" ${locked||confirmed.has(l.id)||l.quantity>=999?'disabled data-ineligible':''}>+</button>${senior()&&!locked?`<button data-cancel-line="${esc(l.id)}" data-remove="${esc(l.menuItemId)}" aria-label="Отменить позицию ${esc(l.name)}">${icon("circle-off")}</button>`:""}</div></div>`).join(""):'<p class="empty">Добавьте позиции из меню.</p>'}</div>
      <button data-pane="menu" class="mobile-tabs">Добавить позиции</button>${order?.comment?`<p class="muted">${esc(order.comment)}</p>`:!order?`<label>Комментарий<textarea id="quick-comment" rows="2" maxlength="500">${esc(state.quick.comment)}</textarea></label>`:""}
      <div class="cart-foot">${preparationHistory(order)}${order?`<p>${lines.filter(l=>!confirmed.has(l.id)).length} новых позиций · ${confirmed.size} подтверждено</p><button data-action="confirm-order" ${locked||!lines.some(l=>!confirmed.has(l.id))?'disabled data-ineligible':''}>✅ Подтвердить новые позиции</button>`:''}${order?.discount?`<p class="readonly">${esc(order.discount.name)} · Скидка ${esc(money(order.discount.discountAmount))}<br><small>До скидки ${esc(money(order.discount.grossAmount))}</small></p>`:""}<div class="total"><span>Итого</span><strong>${esc(money(total))}</strong></div><div class="actions">${order&&!order.precheck?`<button data-action="precheck" ${!lines.length||total==null?'disabled data-ineligible':''}>Предчек</button>`:""}<button id="pay" class="primary" data-action="payment" ${blocked?'disabled data-ineligible':''}>К оплате · ${esc(amount(total))}</button></div>
      ${senior()?`<details class="admin-actions" ${state.adminActionsOpen?"open":""}><summary>Действия администратора</summary><div class="actions"><button data-action="print-refresh">Принтеры и очередь</button>${order?`${order.precheck?'<button data-action="cancel-precheck">Отмена предчека</button>':`<button data-action="split" ${order.discount?'disabled data-ineligible':''}>Разделить счёт</button><button data-action="discount">${order.discount?"Снять скидку":"Применить скидку"}</button>`}<button class="danger" data-action="cancel-order">Отменить заказ</button>`:'<button data-action="save-quick">Сохранить за столом</button>'}</div></details>`:'<div class="admin-actions"><p>Разделение счёта, отмену предчека и скидки выполняет руководитель. Количество можно менять до подтверждения позиций или предчека.</p></div>'}<p class="footnote">Предчек и печать в браузере — нефискальные. Печать зависит от подключённого узла. Эквайринг не подключён.</p></div></section></div>`;
  }
  const accountTotal=o=>o.lines.some(l=>l.pricingUnavailable)?null:o.totals?.netAmount??o.lines.reduce((sum,l)=>sum+Math.round(l.total*100),0)/100;
  const accountCurrency=o=>o.totals?.currency||o.lines[0]?.currency||state.data.currency;
  const accountTitle=o=>/^\d+$/.test(o.id)?"Счёт №"+o.id:"Счёт "+o.id.slice(0,8);
  const accountDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||"")?value.split("-").reverse().join("."):"Дата не определена";
  function saveUnpaidView(){try{sessionStorage.setItem(storageKey()+":unpaid",JSON.stringify({orderId:state.unpaidOrderId,reasons:state.unpaidReasons}));}catch{notice("Причина пока сохранена только на этом экране.");}}
  function accountCard(order){const context=order.accountContext,source=context?.shift,group=context?.group||"REVIEW";return `<button class="unpaid-card ${group.toLowerCase()}" data-unpaid-order="${esc(order.id)}" title="${esc(order.id)}"><span class="unpaid-card-heading"><strong>${esc(accountTitle(order))}</strong><span class="badge">${group==="CURRENT"?(order.precheck?"Предчек":"Открыт"):group==="PAST"?"Прошлая смена":"Требует проверки"}</span></span><span>Стол ${esc(order.tableNumber)} · ${esc(order.createdBy.name)}</span><span class="unpaid-card-bottom"><small>${esc(accountDate(source?.date))} · ${esc(source?.name||"Смена не определена")}</small><b>${esc(money(accountTotal(order),accountCurrency(order)))}</b></span>${group!=="CURRENT"?'<span class="unpaid-alert">Не закрыт</span>':""}</button>`;}
  function renderOrders(){
    const orders=state.orders.filter(o=>o.status==="OPEN"),selected=orders.find(o=>o.id===state.unpaidOrderId),currencies=new Set(orders.map(accountCurrency)),total=orders.some(o=>accountTotal(o)===null)?null:orders.reduce((sum,o)=>sum+Math.round(accountTotal(o)*100),0)/100;
    const groups=[["CURRENT","Текущая смена"],["PAST","Прошлые смены"],["REVIEW","Требует проверки"]];
    const list=`<section class="unpaid-list"><div class="section-head"><div><h2>Незакрытые счета</h2><p class="muted">Все смены · ${currencies.size>1?"Разные валюты":esc(money(total,[...currencies][0]||state.data.currency))}</p></div><span class="unpaid-count">${orders.length}</span></div>${groups.map(([key,label])=>{const rows=orders.filter(o=>(o.accountContext?.group||"REVIEW")===key);if(!rows.length)return "";return `<section class="unpaid-group panel" data-unpaid-group="${key}"><h3>${label}<span class="unpaid-count">${rows.length}</span></h3>${key==="CURRENT"?'<p class="unpaid-hint">Смена ещё открыта — после полуночи она остаётся текущей.</p>':key==="REVIEW"?'<p class="unpaid-hint warning">Связь с исходной сменой неоднозначна. Оплата и отмена недоступны.</p>':""}<div class="unpaid-cards">${rows.map(accountCard).join("")}</div></section>`}).join("")}${!orders.length?'<section class="panel empty">Незакрытых счетов нет.</section>':""}</section>`;
    let detail='<section class="unpaid-detail unpaid-placeholder panel">Выберите счёт, чтобы посмотреть состав и исходную смену.</section>';
    if(selected){const c=selected.accountContext||{},source=c.shift,canCancel=senior()&&c.canCancel&&!wholeOrderCancellationBlocked(selected),reason=state.unpaidReasons[selected.id]||"",blocked={POS_ORDER_WORKDAY_REQUIRED:"Для открытой кассы не найден однозначный рабочий день. Требуется проверка руководителем.",SALES_EVENT_MONTH_LOCKED:"Месяц закрыт. Отмена недоступна.",POS_ORDER_CANCELLATION_HAS_PAYMENT:"Есть признаки оплаты. Отмена неоплаченного счёта недоступна; возврат — отдельная операция.",POS_ORDER_SHIFT_NEEDS_REVIEW:"Исходная смена не определена однозначно. Требуется проверка."}[c.cancelCode]||"Отмена недоступна. Проверьте права и состояние счёта.";
      detail=`<section class="unpaid-detail" data-unpaid-detail="${esc(selected.id)}"><button class="back-link" data-action="unpaid-back">${icon("arrow-left")} Незакрытые счета</button><div class="section-head"><h2>${esc(accountTitle(selected))}</h2><span class="badge ${c.group==="PAST"?"past":c.group==="REVIEW"?"review":""}">${c.group==="CURRENT"?"Текущая смена":c.group==="PAST"?"Прошлая смена":"Требует проверки"}</span></div>${c.group!=="CURRENT"?'<section class="unpaid-history warning"><strong>Исторический незакрытый счёт</strong><p>Проверьте состав и причину перед отменой. Счёт остаётся в исходной смене.</p></section>':""}<section class="panel"><dl class="unpaid-facts"><dt>Рабочий день</dt><dd>${esc(accountDate(source?.date))}</dd><dt>Смена</dt><dd title="${esc(source?.id)}">${esc(source?.name||"Не определена")} · ${source?.status==="open"?"касса открыта":source?.status==="closed"?"касса закрыта":"требует проверки"}<small>ID: ${esc(source?.id||selected.shiftId)}</small></dd><dt>Стол</dt><dd>${esc(selected.tableNumber)}</dd><dt>Сотрудник</dt><dd>${esc(selected.createdBy.name)}</dd><dt>Статус счёта</dt><dd class="unpaid-alert">Не закрыт${selected.precheck?" · предчек выдан":""}</dd></dl></section><section class="panel"><h3>Состав счёта</h3>${selected.lines.map(line=>`<div class="unpaid-line"><span><b>${esc(line.name)}</b><small>${line.quantity} × ${esc(money(line.unitPrice,accountCurrency(selected)))}</small></span><b>${esc(money(line.total,accountCurrency(selected)))}</b></div>`).join("")}${selected.discount?`<p>Скидка · ${esc(money(selected.discount.discountAmount,accountCurrency(selected)))}</p>`:""}<div class="unpaid-total"><b>Итого</b><strong>${esc(money(accountTotal(selected),accountCurrency(selected)))}</strong></div></section>${c.group==="CURRENT"&&shift()?.id===selected.shiftId?`<button class="primary" data-work-unpaid="${esc(selected.id)}">Открыть счёт в кассе</button>`:""}<section class="panel unpaid-cancel"><p class="unpaid-hint">Отмена · только руководителю</p>${canCancel?`<label><span>Причина отмены <span aria-hidden="true">*</span></span><textarea id="unpaid-reason" required maxlength="500" placeholder="Укажите, почему счёт отменяется">${esc(reason)}</textarea></label><button class="danger" data-action="cancel-unpaid" ${!reason.trim()?'disabled data-ineligible':''}>Отменить счёт</button><small>Отмена не меняет выручку, остатки и закрытый итог смены.</small>`:`<p>${senior()?esc(wholeOrderCancellationBlocked(selected)?wholeOrderCancellationMessage:blocked):"Для отмены обратитесь к руководителю."}</p>`}</section></section>`;
    }
    $("orders-view").innerHTML=`<div class="unpaid-workspace ${selected?"has-detail":""}">${list}${detail}</div>`;
  }
  const paymentLabel=e=>(e.payments||[]).map(p=>({CASH:"Наличные",CARD_EXTERNAL:"Карта · внешний терминал"})[p.method]||"Не указан").join(", ")||"Не указан";
  function receiptRows(events){return events.map(e=>`<button class="receipt-row" data-receipt="${esc(e.id)}"><span><strong>${esc(time(e.acceptedAt))} · ${e.tableNumber?"Стол "+esc(e.tableNumber):"Быстрая продажа"}</strong><small>${esc(e.orderActor?.name||e.actor?.name||"Автор неизвестен")} · ${esc(paymentLabel(e))}</small></span><strong>${esc(money(e.revenue))} ${icon("chevron-right")}</strong></button>`).join("");}
  function cancelledOrders(){return window.bdPosCancellationHistory(state.orders,state.data.venueId);}
  function cancellationFact(order){return order.fact;}
  function cancellationMoney(order){return order.amount==null?"—":money(order.amount,order.currency);}
  function cancellationDate(order){return Number.isFinite(Date.parse(order.cancelledAt))?date(order.cancelledAt):"Время не сохранено";}
  function renderReceipts(){
    const cancelled=state.historyMode==="cancelled",orders=cancelledOrders();
    const picker=`<label class="history-picker"><select id="receipt-history" aria-label="История кассы"><option value="paid" ${cancelled?"":"selected"}>Оплаченные чеки</option><option value="cancelled" ${cancelled?"selected":""}>Отмены</option></select></label>`;
    if(!cancelled){$("receipts-view").innerHTML=`<h2>История</h2>${picker}<p class="muted">${senior()?"Последние чеки заведения":"Только созданные или оплаченные вами чеки"} · до 100 последних записей</p><section class="panel">${receiptRows(state.data.events.filter(e=>e.status==="POSTED"))||'<p class="empty">Оплаченных чеков пока нет.</p>'}</section>`;return;}
    $("receipts-view").innerHTML=`<h2>История</h2>${picker}<section class="panel">${orders.slice(0,state.historyLimit).map(o=>{const fact=cancellationFact(o);return `<button class="receipt-row cancelled-order-row" data-cancelled-order="${esc(o.id)}"><span><strong>Стол ${esc(o.tableNumber)} · ${esc(cancellationDate(o))}</strong><small>${o.kind==="item"?"Отмена позиции":"Отмена заказа"}</small><small>${esc(fact?.details?.reason||"Причина не сохранена")}</small></span><strong>${esc(cancellationMoney(o))} ${icon("chevron-right")}</strong></button>`;}).join("")||'<p class="empty">Отменённых заказов пока нет.</p>'}</section>${orders.length>state.historyLimit?'<button data-action="more-cancelled">Показать ещё</button>':""}`;
    const requested=new URLSearchParams(location.search).get("cancelledOrder");if(requested&&!$("dialog").open)showCancelledOrder(requested);
  }
  function cancellationChain(order){
    const events=Array.isArray(order.history)?order.history:[];
    if(!events.length)return '<p class="muted">История не сохранена.</p>';
    return `<details class="cancellation-chain"><summary>История заказа</summary>${events.map(e=>`<article class="readonly"><strong>${e.kind==="preparation"?"Бегунок":e.kind==="item"?"Отмена позиции":"Отмена заказа"}${e.sectionName?' · '+esc(e.sectionName):''}</strong><p class="muted">${esc(cancellationDate({cancelledAt:e.at}))} · ${esc(e.actor?.name||"Сотрудник не указан")}</p>${e.lines.map(line=>`<div>${esc(line.name||"Название не сохранено")} × ${esc(line.quantity)}</div>`).join('')}${e.kind!=="preparation"?`<p class="cancel-reason">${esc(e.reason||"Причина не сохранена")}</p>`:''}${e.kind==="item"?`<p>${e.stockDecision==="NO_WRITE_OFF"?"Не списывать":e.stockDecision==="WRITE_OFF"?"Списать со склада":"Решение о списании не сохранено"}</p>${!e.originalAvailable?'<p class="muted">Исходный бегунок недоступен.</p>':''}`:''}${e.id?`<details><summary>Номер документа</summary><p class="long-id">${esc(e.id)}</p>${e.originalTicketId?`<p class="long-id">Исходный: ${esc(e.originalTicketId)}</p>`:''}</details>`:''}</article>`).join('')}</details>`;
  }
  function showCancelledOrder(id){
    const order=cancelledOrders().find(o=>o.id===id);if(!order)return;
    const fact=cancellationFact(order),url=new URL(location.href);url.searchParams.set("cancelledOrder",id);history.replaceState(null,"",url);
    dialog(order.kind==="item"?"Отменённое блюдо":"Отменённый заказ",`<p class="muted">Стол ${esc(order.tableNumber)} · ${esc(cancellationDate(order))}</p>${order.lines.map(line=>`<div class="cash-row"><span>${esc(line.name||"Название не сохранено")} × ${esc(line.quantity)}</span><strong>${line.total==null?"—":esc(money(line.total,line.currency))}</strong></div>`).join("")||'<p>Позиций нет.</p>'}${order.lines.length?`<p class="total">Сумма отмены <strong>${esc(cancellationMoney(order))}</strong></p>`:''}<h3>Причина отмены</h3><p class="cancel-reason">${esc(fact?.details?.reason||"Причина не сохранена")}</p>${order.kind==="item"?`<p><strong>${order.stockDecision==="NO_WRITE_OFF"?"Не списывать":order.stockDecision==="WRITE_OFF"?"Списать со склада":"Решение о списании не сохранено"}</strong></p>`:""}<p class="muted">Отменил: ${esc(fact?.actor?.name||"Сотрудник не указан")}</p>${cancellationChain(order)}<details><summary>Номер заказа</summary><p class="long-id">${esc(order.orderId)}</p></details>`,null);
    $("dialog").dataset.cancelHistory=id;

  }
  function metrics(s,detail=false){return `<div class="metrics ${detail?"detail-metrics":""}"><div class="metric"><small>Открытых столов</small><strong>${s.openTableCount}</strong>${detail?`<p>${esc(money(s.openNetAmount))} не оплачено</p>`:""}</div><div class="metric"><small>${detail?"Оплаченных чеков":"Неоплаченные счета"}</small><strong>${detail?s.paidCheckCount:esc(amount(s.openNetAmount))}</strong>${detail?`<p>${esc(money(s.paidNetAmount))}</p>`:`<p>${esc(currency())}</p>`}</div><div class="metric"><small>Оплаченных чеков</small><strong>${s.paidCheckCount}</strong></div><div class="metric"><small>Оплачено</small><strong>${esc(amount(s.paidNetAmount))}</strong><p>${esc(currency())}</p></div></div>`;}
  function freshness(){return `<p class="fresh ${state.stale?"stale":""}">${state.stale?"Данные устарели · ":""}Обновлено ${state.lastSuccess?esc(time(new Date(state.lastSuccess))):"—"} · каждые 15 сек.</p>`;}
  function renderOverview(){
    const o=state.overview;
    if(!o){$("overview-view").innerHTML=`<h2>Текущая смена</h2><p class="empty">${shift()?"Загружаем обзор…":"Открытой кассовой смены нет."}</p>`;return;}
    const staff=state.waiter===null?null:o.staff.find(s=>String(s.accountId)===state.waiter);
    if(staff){
      $("overview-view").innerHTML=`<button class="back-link" data-action="all-staff">${icon("arrow-left")} Все сотрудники</button><div class="section-head detail-heading"><div><h2>${esc(staff.name||"Автор неизвестен")}</h2><p class="muted">Текущая смена · ${esc(labels[staff.jobTitle||staff.role]||"Сотрудник")}</p></div></div>${freshness()}${metrics(staff,true)}<div class="detail-tabs"><button data-detail="tables" aria-pressed="${state.detailTab==="tables"}">Столы · ${staff.openTableCount}</button><button data-detail="paid" aria-pressed="${state.detailTab==="paid"}">Оплачено · ${staff.paidCheckCount}</button></div>${state.detailTab==="tables"?`<h2>Открытые столы</h2><div class="detail-list">${staff.openOrders.map(order=>orderCard(order,staff.name)).join("")}</div>${!staff.openOrders.length?'<p class="empty">Нет открытых счетов.</p>':""}`:`<h2>Оплаченные чеки</h2><section class="panel">${receiptRows(staff.paidReceipts)||'<p class="empty">Оплаченных чеков нет.</p>'}</section>`}<p class="footnote">Активность по заказам и продажам не подтверждает присутствие на работе.</p>`;return;
    }
    const filtered=state.filterWaiter?o.staff.filter(s=>String(s.accountId)===state.filterWaiter):o.staff;
    $("overview-view").innerHTML=`<div class="section-head"><div><h2>Текущая смена <span class="badge">Открыта</span></h2><p class="muted">${esc(o.shift.name)} · ${esc(o.shift.businessDate)} · ${esc(o.shift.timezone)}</p></div></div>${freshness()}${managementDayCard()}${metrics(o.summary)}<section class="panel"><h2>Сотрудники</h2><div class="table-wrap"><table class="staff-table"><thead><tr><th>Сотрудник</th><th class="amount">Открытых столов</th><th class="amount">Не оплачено</th><th class="amount">Оплаченных чеков</th><th class="amount">Оплачено</th><th></th></tr></thead><tbody>${o.staff.map(s=>`<tr><td><div class="staff-name"><span class="avatar">${esc((s.name||"?").split(" ").map(n=>n[0]).slice(0,2).join(""))}</span><div>${esc(s.name||"Автор неизвестен")}${!s.hasActivity?'<small>Нет открытых счетов и продаж</small>':""}</div></div></td><td class="amount">${s.openTableCount}</td><td class="amount">${esc(amount(s.openNetAmount))}</td><td class="amount">${s.paidCheckCount}</td><td class="amount">${esc(amount(s.paidNetAmount))}</td><td><button data-waiter="${esc(String(s.accountId))}">Показать счета</button></td></tr>`).join("")}</tbody><tfoot><tr><td>Итого</td><td class="amount">${o.summary.openTableCount}</td><td class="amount">${esc(amount(o.summary.openNetAmount))}</td><td class="amount">${o.summary.paidCheckCount}</td><td class="amount">${esc(amount(o.summary.paidNetAmount))}</td><td></td></tr></tfoot></table></div></section><div class="section-head"><div><h2>Открытые столы</h2><p class="muted">Неоплаченные счета отдельно от оплаченных чеков</p></div><select id="waiter-filter" aria-label="Фильтр по сотруднику"><option value="">Все сотрудники</option>${o.staff.map(s=>`<option value="${esc(String(s.accountId))}" ${state.filterWaiter===String(s.accountId)?"selected":""}>${esc(s.name||"Автор неизвестен")}</option>`).join("")}</select></div><div class="cards">${filtered.flatMap(s=>s.openOrders.map(order=>orderCard(order,s.name))).join("")}</div><p class="footnote">Нулевая активность не означает присутствие сотрудника на работе. Разделённые счета одного стола считаются одним столом.</p>`;
  }
  function managementDayCard(){
    const day=state.workday;if(!senior()||!state.data.permissions.managementDay||!day?.management)return "";
    const href="/shifts?venue="+encodeURIComponent(state.data.venueId)+"&month="+day.businessDate.slice(0,7)+"&workday="+encodeURIComponent(day.businessDate);
    return `<section class="panel" data-management-workday><h2>Рабочий день · ${esc(day.businessDate)}</h2><p>Продажи всех кассовых смен, команда и ФОТ дня. ФОТ учитывается один раз за день, без распределения по кассам.</p><div class="metrics"><div class="metric"><small>Продажи дня</small><strong>${esc(money(day.revenue.amount,day.revenue.currency))}</strong><p>${day.revenue.status==="FINAL"?"Итог":"Предварительно / требует проверки"}</p></div><div class="metric"><small>ФОТ дня · сохранённый</small><strong>${esc(money(day.payroll.amount,day.revenue.currency))}</strong></div></div><p>${day.cashShifts.length} кассовых смен · ${day.cashShifts.filter(s=>s.status==="OPEN").length} открыто</p><ul>${day.cashShifts.map(s=>`<li>${esc(state.data.shifts.find(row=>row.id===s.id)?.shiftName||"Кассовая смена")} · ${s.status==="OPEN"?"Открыта":"Закрыта"} · ${esc(date(s.openedAt))}${s.closedAt?" — "+esc(date(s.closedAt)):""}</li>`).join("")}</ul><div class="table-wrap"><table><thead><tr><th>Команда дня</th><th>Часы</th><th>Сохранённый ФОТ</th></tr></thead><tbody>${day.management.people.map(p=>`<tr><td>${esc(p.name)}${(p.missing.length||p.notes.length)?`<br><small>${esc([...p.missing,...p.notes].join(". "))}</small>`:""}</td><td>${esc(amount(p.hours))}</td><td>${esc(money(p.recordedPayroll,day.revenue.currency))}</td></tr>`).join("")}</tbody></table></div>${day.management.missing.length?`<p class="warning">${esc(day.management.missing.join(". "))}. Укажите команду и исходные данные в операционном отчёте.</p>`:""}<a href="${esc(href)}">Открыть рабочий день и заполнить операционные данные</a><p class="footnote">Актуальные данные рабочего дня; кассовый отчёт ниже остаётся историческим снимком. Продажи не нужно вводить повторно.</p></section>`;
  }
  function renderReport(){
    const r=state.report;
    const picker=`<div class="toolbar"><select id="report-picker" aria-label="Выберите смену"><option value="">Выберите смену</option>${state.data.shifts.map(s=>`<option value="${esc(s.id)}" ${(state.reportId||r?.shiftId)===s.id?"selected":""}>${esc(s.shiftName)} · ${esc(s.date)} · ${s.closingStatus==="closed"?"Закрыта":"Открыта"}</option>`).join("")}</select></div>`;
    if(!r){$("report-view").innerHTML=picker+'<p class="empty" role="status">'+(navigationLoading&&state.reportId?'Загрузка…':'Выберите смену для просмотра отчёта.')+'</p>';return;}
    const m=n=>money(n,r.currency),avg=r.totals.paidReceipts?r.totals.paidRevenue/r.totals.paidReceipts:null,cash=r.payments.find(p=>p.method==="CASH"),card=r.payments.find(p=>p.method==="CARD_EXTERNAL"),proportion=r.totals.paidRevenue>0?cash.paidRevenue/r.totals.paidRevenue*100:0;
    const cashRows=[["На начало",r.cash.openingFloat],["Наличные продажи",r.cash.salesRevenue],["Внесения",r.cash.cashIn],["Выдачи",r.cash.cashOut],["Инкассация",r.cash.safeDrop],["Ожидается",r.cash.expected],["Пересчитано",r.cash.actual]];
    $("report-view").innerHTML=`<div class="report">${picker}${managementDayCard()}<p class="fresh report-fresh" data-last-success="${state.reportLastSuccess||""}">${r.status==="closed"?"Исторический снимок получен":state.stale?"Данные отчёта устарели · обновлено":"Отчёт обновлён"} ${state.reportLastSuccess?esc(time(new Date(state.reportLastSuccess))):"—"}${r.status==="open"?" · каждые 15 сек.":""}</p><div class="section-head"><div><h2>Отчёт по смене</h2><span class="muted">${esc(r.shiftName)}</span> <span class="badge">${r.status==="closed"?"Закрыта":"Открыта"}</span></div><button class="primary" data-action="print">Распечатать</button></div><div class="report-meta"><span>Открыта ${esc(date(r.openedAt))} · ${esc(r.openedBy?.name||"Ответственный неизвестен")}</span><span>Закрыта ${esc(date(r.closedAt))} · ${esc(r.closedBy?.name||"Ответственный неизвестен")}</span><span>${esc(r.timezone)} · Учётная дата ${esc(r.businessDate)}</span></div><div class="metrics"><div class="metric"><small>Выручка</small><strong>${esc(m(r.totals.paidRevenue))}</strong><p>После применённых скидок</p></div><div class="metric"><small>Оплаченных чеков</small><strong>${r.totals.paidReceipts}</strong></div><div class="metric"><small>Средний чек</small><strong>${esc(m(avg))}</strong></div></div><div class="report-columns"><div><section class="panel"><h3>Продажи по официантам</h3><div class="table-wrap"><table><thead><tr><th>Сотрудник</th><th class="amount">Выручка</th><th class="amount">Чеков</th><th class="amount">Средний чек</th></tr></thead><tbody>${r.employees.map(e=>`<tr><td>${esc(e.name||"Автор неизвестен")}</td><td class="amount"><strong>${esc(m(e.paidRevenue))}</strong></td><td class="amount">${e.paidReceipts}</td><td class="amount">${esc(m(e.paidReceipts?e.paidRevenue/e.paidReceipts:null))}</td></tr>`).join("")}</tbody><tfoot><tr><td>Итого</td><td class="amount">${esc(m(r.totals.paidRevenue))}</td><td class="amount">${r.totals.paidReceipts}</td><td class="amount">${esc(m(avg))}</td></tr></tfoot></table></div></section><section class="panel"><h3>Способы оплаты</h3><div class="paybar"><span id="cash-proportion"></span><span id="card-proportion" class="card"></span></div>${r.payments.map(p=>`<div class="cash-row"><span>${esc({CASH:"Наличные",CARD_EXTERNAL:"Карта · внешний терминал",UNSPECIFIED:"Способ не указан"}[p.method])}</span><strong>${esc(m(p.paidRevenue))}</strong></div>`).join("")}</section></div><section class="panel cash-panel"><h3>Сверка кассы</h3>${cashRows.map(([label,value],i)=>`<div class="cash-row ${i>4?"emphasis":""}"><span>${label}</span><strong>${esc(m(value))}</strong></div>`).join("")}<div class="difference ${r.cash.variance===0?"good":""}"><strong>Расхождение · ${esc(m(r.cash.variance))}</strong><p>${r.cash.status==="NEGATIVE_EXPECTED"?"Ожидаемая сумма отрицательна: проверьте кассовые движения.":r.cash.variance==null?"Для сверки не хватает данных.":r.cash.variance===0?"Касса сошлась.":"Проверьте кассовые движения и пересчёт."}</p></div></section></div><section class="panel"><h3>Контроль операций</h3><div class="audit-grid"><div><small>Скидки</small><strong>${esc(m(r.totals.paidDiscountAmount))}</strong><small>До скидок ${esc(m(r.totals.paidGrossRevenue))}</small></div><div><small>Возвраты оплаты</small><strong>Недоступны</strong><small>Оплаченные возвраты через кассу пока не поддерживаются</small></div><div><small>Аннулированные продажи</small><strong>${esc(m(r.totals.reversedRevenue))}</strong><small>${r.totals.reversedReceipts} чеков исключены из выручки</small></div></div><details><summary>Кассовые движения · ${r.cash.entries?.length||0}</summary>${(r.cash.entries||[]).map(e=>`<p>${esc(date(e.at))} · ${esc(e.actor.name)} · ${esc({IN:"Внесение",OUT:"Выдача",SAFE_DROP:"Инкассация"}[e.kind])}: ${esc(m(e.amount))}<br><small>${esc(e.reason)}</small></p>`).join("")}</details></section><p class="footnote">Нефискальный управленческий отчёт. Себестоимость не включена; выручка не равна прибыли. Закрытый отчёт — исторический снимок.</p></div>`;
    $("cash-proportion").style.width=proportion+"%";$("card-proportion").style.width=(r.totals.paidRevenue>0?card.paidRevenue/r.totals.paidRevenue*100:0)+"%";
  }
  function renderDiscounts(){ $("discounts-view").innerHTML=`<div class="section-head"><div><h2>Настройка скидок</h2><p class="muted">Одна скидка на весь счёт, без накопления. Процент или фиксированная сумма.</p></div><button class="primary" data-action="new-rule">Создать</button></div><div class="rule-list">${state.rules.map(r=>`<div class="rule"><div><strong>${esc(r.name)}</strong><small>${r.kind==="PERCENT"?esc(r.value)+"%":esc(money(r.value))} · ${r.active?"Активна":"Выключена"}</small></div><button data-rule="${esc(r.id)}">Изменить</button></div>`).join("")||'<p class="empty">Правила скидок ещё не созданы.</p>'}</div>`; }
  async function changeView(view,persist=true){
    if(state.frozen||state.busy||["overview","report","discounts"].includes(view)&&!senior())return;
    const generation=++navigationGeneration;++loadGeneration;state.view=view;if(persist)persistReportContext(true);state.waiter=null;state.filterWaiter="";
    navigationLoading=["overview","report","discounts"].includes(view);render();window.scrollTo({top:0,behavior:"instant"});
    if(!navigationLoading)return;
    $("connection").textContent="Обновляем данные…";
    try{if(view==="discounts"){const value=await request("/api/pos-discounts",undefined,++loadGeneration);if(generation===navigationGeneration&&!state.frozen){state.rules=value.rules;render();}}else{const value=await load(view);if(generation===navigationGeneration)accept(value);}}
    catch(error){if(generation===navigationGeneration)errorView(error);}
    finally{if(generation===navigationGeneration){navigationLoading=false;setBusy();if(state.view==="report"&&state.data)renderReport();}}
  }
  function openOrder(id){state.orderId=id;state.view="cashier";document.body.dataset.pane="order";render();window.scrollTo({top:0,behavior:"instant"});}
  async function createOrder(fromQuick=false){
    if(!shift())throw Error("Сначала откройте смену.");if(fromQuick)assertQuickShift();
    dialog("Новый заказ",field("table","Номер стола","number","","required min=1 max=9999 step=1 inputmode=numeric")+field("comment","Комментарий","text",fromQuick?state.quick.comment:"","maxlength=500"),async form=>{
      if(fromQuick)assertQuickShift();
      const id=uuid(),result=await mutate("/api/pos-orders",{action:"create",operationId:uuid(),orderId:id,expectedRevision:0,shiftId:shift().id,tableNumber:String(form.get("table")),comment:String(form.get("comment")),lines:fromQuick?state.quick.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity})):[]},fromQuick?quickOrigin(state.quick):undefined);
      openOrder(result.order.id);notice("Заказ сохранён. Добавьте позиции из меню.");
    },"Создать заказ");
  }
  function reasonAction(title,action,extra={}){dialog(title,field("reason","Причина","text","","required maxlength=500"),async f=>{await orderAction(action,{...extra,reason:String(f.get("reason"))});render();});}
  function assertQuickShift(){
    const current=shift();
    if(state.frozen||!current||state.quick.shiftId!==current.id){
      clearSensitive("Смена черновика изменилась. Обновите кассу перед продолжением.");
      throw Error("Смена черновика не совпадает с выбранной сменой.");
    }
    return current;
  }
  async function showPayment(){
    const order=selectedOrder();if(!order)assertQuickShift();const sum=order?pricing(order):quickTotal();
    if(sum==null)throw Error("Цена недоступна. Проверьте позиции.");
    dialog("Оплата",`<p class="total">К оплате <strong>${esc(money(sum))}</strong></p><div class="payment-choices"><label><input type="radio" name="method" value="CASH" ${order||state.quick.method!=="CARD_EXTERNAL"?"checked":""}>Наличные</label><label><input type="radio" name="method" value="CARD_EXTERNAL" ${!order&&state.quick.method==="CARD_EXTERNAL"?"checked":""}>Внешний терминал</label></div><p class="footnote">Подтвердите фактически полученную оплату. Интеграция эквайринга и фискализация отсутствуют.</p>`,async form=>{
      notice("Выполняем оплату…");
      const method=String(form.get("method")),payment={id:uuid(),method,amount:sum};let result;
      if(order){
        const body={orderId:order.id,expectedRevision:order.revision,payment};
        const preview=await request("/api/pos-orders",{...body,action:"preview_payment",operationId:uuid()});
        result=await mutate("/api/pos-orders",{...body,action:"pay",operationId:uuid(),previewHash:preview.previewHash});
      } else {
        const command={id:state.quick.id,source:"POS_API",shiftId:assertQuickShift().id,comment:state.quick.comment,payments:[payment],lines:state.quick.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity}))};
        const preview=await request("/api/sales-events",{action:"preview",command});
        assertQuickShift();
        result=await mutate("/api/sales-events",{action:"post",command,previewHash:preview.previewHash});
      }
      state.orderId=null;state.view="receipts";render();notice(result.duplicate?"Оплата уже была сохранена. Повторного списания нет.":"Продажа проведена и сохранена в общем журнале.");
    },"Подтвердить оплату",{kind:"payment"});
  }
  function showReceipt(id){
    const event=state.data.events.find(e=>e.id===id)||state.overview?.staff.flatMap(s=>s.paidReceipts).find(e=>e.id===id);if(!event)return;
    dialog("Оплаченный чек",`<p class="success-title">Оплачено · ${esc(date(event.acceptedAt))}</p><p>${esc(event.tableNumber?"Стол "+event.tableNumber:"Быстрая продажа")} · ${esc(paymentLabel(event))}</p>${event.prices.map(l=>`<div class="cash-row"><span>${esc(l.name)} × ${l.quantity}</span><strong>${esc(money(l.total))}</strong></div>`).join("")}<div class="cash-row"><span>До скидки</span><strong>${esc(money(event.grossAmount))}</strong></div><div class="cash-row"><span>Скидка</span><strong>${esc(money(event.discountAmount))}</strong></div><p class="total">Оплачено <strong>${esc(money(event.revenue))}</strong></p><p class="muted">Официант: ${esc(event.orderActor?.name||event.waiter?.name||event.actor?.name||"Неизвестно")}<br>Оплату принял: ${esc(event.actor?.name||"Неизвестно")}</p>${senior()&&!$("sales-journal").hidden?`<a id="receipt-sale" href="/sales-import?venue=${encodeURIComponent(state.data.venueId)}&batch=${encodeURIComponent(event.id)}">Документ продажи</a>`:""}<p class="footnote long-id">Номер: ${esc(event.id)}<br>Нефискальное подтверждение. Оплаченные возвраты пока недоступны.</p>`,null);
  }
  function showRule(id){const rule=state.rules.find(r=>r.id===id);dialog(rule?"Изменить скидку":"Новая скидка",field("name","Название","text",rule?.name||"","required maxlength=120")+`<label>Тип<select name="kind"><option value="PERCENT" ${rule?.kind!=="FIXED"?"selected":""}>Процент</option><option value="FIXED" ${rule?.kind==="FIXED"?"selected":""}>Фиксированная сумма</option></select></label>`+field("value","Значение","number",rule?.value??"","required min=0 step=0.01 inputmode=decimal")+`<label>Состояние<select name="active"><option value="true" ${rule?.active!==false?"selected":""}>Активна</option><option value="false" ${rule?.active===false?"selected":""}>Выключена</option></select></label>`,async form=>{
    await mutate("/api/pos-discounts",{action:"save",ruleId:rule?.id||uuid(),expectedRevision:rule?.revision||0,operationId:uuid(),rule:{name:String(form.get("name")),kind:String(form.get("kind")),value:Number(form.get("value")),active:form.get("active")==="true"}});state.rules=(await request("/api/pos-discounts")).rules;render();notice("Правило сохранено. Оплаченные чеки не изменены.");
  },"Сохранить");}
  async function handleAction(action){
    if(action==="dismiss"){$("dialog").close();return;}
    if(action==="identity"&&pinMode){dialog("Сотрудник",`<p>${esc(state.data.actor.name)}</p><p>Черновики сохранятся отдельно для этого сотрудника.</p><button type="button" data-action="pin-logout">Выйти / сменить сотрудника</button>`,null);return;}
    if(action==="pin-logout"&&pinMode){saveLocal();const response=await fetch("/api/staff-pin/session",{method:"DELETE"});if(!response.ok)throw Error("Выход не подтверждён. Повторите при восстановлении связи.");localStorage.setItem("bd_pos_identity",crypto.randomUUID());clearSensitive("Сессия завершена");location.replace("/login");return;}
    if(action==="identity"){dialog("Аккаунт",`<p>${esc(state.data.actor.name)} · ${esc(labels[state.data.actor.jobTitle||state.data.actor.role])}</p><p>${esc(state.data.venueName)}</p><a href="/team-access">Мои заведения и доступ</a><p class="footnote">При смене заведения касса обновит контекст. Незавершённые запросы сохранятся.</p>`,null);return;}
    if(action==="quick"){state.orderId=null;document.body.dataset.pane="order";render();return;}
    if(action==="create-order"||action==="save-quick"){await createOrder(action==="save-quick");return;}
    if(action==='print-replace'){await replacePrint();return;}
    if(action.startsWith('print-resolve:')){await resolvePrint(decodeURIComponent(action.slice(14)));return;}
    if(action.startsWith('print-history:')){await showPrintHistory(decodeURIComponent(action.slice(14)));return;}
    if(action==='print-refresh'){await showPrintQueue();return;}
    if(action==='print-pair'){await showPrintPair();return;}
    if(action==='print-test'){await testPrint();return;}
    if(action==='print-revoke'){await revokePrint();return;}
    if(action==='preparation-routes'){await showPreparationRoutes();return;}
    if(action==='confirm-order'){
      const order=selectedOrder();if(!order)return;const sent=sentLines(order),pending=order.lines.filter(l=>!sent.has(l.id));
      dialog('Подтвердить новые позиции',`<p>Стол ${esc(order.tableNumber)}</p>${pending.map(l=>`<div class="cash-row">${esc(l.name)} × ${l.quantity}</div>`).join('')}<p>После подтверждения эти позиции нельзя изменить. Бегунки сохранятся по разделам меню. Физическая печать пока не подключена.</p>`,async()=>{if(selectedOrder()?.id!==order.id||selectedOrder()?.revision!==order.revision)throw Error('Заказ изменился. Проверьте новые позиции.');await orderAction('confirm');render();notice('Позиции подтверждены. Бегунки сохранены; не напечатаны.');},'✅ Подтвердить', {kind:'confirm'});return;
    }
    if(action==="payment"){await showPayment();return;}
    if(action==="precheck"){await orderAction("precheck");notice("Предчек сохранён. Это нефискальный документ.");render();return;}
    if(action==="cancel-precheck"){reasonAction("Отмена предчека","cancel_precheck");return;}
    if(action==="unpaid-back"){state.unpaidOrderId=null;saveUnpaidView();renderOrders();return;}
    if(action==="cancel-unpaid"){
      const order=state.orders.find(o=>o.id===state.unpaidOrderId&&o.status==="OPEN"),reason=(state.unpaidReasons[state.unpaidOrderId]||"").trim();
      if(wholeOrderCancellationBlocked(order))throw Error(wholeOrderCancellationMessage);
      if(!order||!senior()||!order.accountContext?.canCancel||!reason)throw Error("Для отмены нужны права руководителя и причина.");
      await mutate("/api/pos-orders",{action:"cancel_order",orderId:order.id,expectedRevision:order.revision,operationId:uuid(),reason});delete state.unpaidReasons[order.id];state.unpaidOrderId=null;saveUnpaidView();state.view="orders";render();notice("Неоплаченный счёт отменён. История, выручка и остатки сохранены.");return;
    }
    if(action==="cancel-order"){if(wholeOrderCancellationBlocked(selectedOrder())){$("dialog").dataset.cancelRestriction="true";dialog("Отменить заказ",`<p>${wholeOrderCancellationMessage}</p>`,null);return;}reasonAction("Отменить заказ","cancel_order");return;}
    if(action==="split"){
      const order=selectedOrder();dialog("Разделить счёт",`<p class="muted">Выберите количество для нового счёта. Исходный официант и номер стола сохранятся.</p>${order.lines.map(l=>`<label class="split-line">${esc(l.name)} · ${l.quantity} шт.<input name="${esc(l.id)}" type="number" min="0" max="${l.quantity}" step="1" value="0"></label>`).join("")}`,async form=>{const lines=order.lines.map(l=>({lineId:l.id,quantity:Number(form.get(l.id))})).filter(l=>l.quantity>0);await orderAction("split",{newOrderId:uuid(),lines});render();});return;
    }
    if(action==="discount"){
      const order=selectedOrder();if(order.discount){reasonAction("Снять скидку","remove_discount");return;}
      state.rules=(await request("/api/pos-discounts")).rules;const active=state.rules.filter(r=>r.active);
      if(!active.length)throw Error("Нет активных правил скидок. Их настраивает владелец или управляющий.");
      dialog("Применить скидку",`<label>Правило<select name="rule">${active.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} · ${r.kind==="PERCENT"?esc(r.value)+"%":esc(money(r.value))}</option>`).join("")}</select></label>`+field("reason","Причина","text","","required maxlength=500")+'<p class="footnote">Скидка применяется на весь счёт. Перед изменением позиций или разделением старший должен снять её.</p>',async form=>{const rule=active.find(r=>r.id===form.get("rule"));await orderAction("apply_discount",{ruleId:rule.id,ruleRevision:rule.revision,reason:String(form.get("reason"))});render();});return;
    }
    if(action==="open-shift"){
      if(!state.data.workday?.ok)return notice("Сначала откройте рабочий день с командой в разделе «Смены».");
      dialog("Открыть смену",field("name","Название смены","text","","required maxlength=160")+field("float","Размен на начало","number","","min=0 step=0.01 inputmode=decimal")+'<p class="footnote">Пустое значение означает неизвестную сумму, а не ноль.</p>',async form=>{await mutate("/api/sales-events",{action:"open_shift",shiftId:uuid(),name:String(form.get("name")),...(form.get("float")!==""?{openingFloat:Number(form.get("float"))}:{})});render();notice("Смена открыта.");},"Открыть смену");return;
    }
    if(action==="close-shift"){
      if(activeOrders().length)throw Error("Перед закрытием оплатите или отмените все открытые заказы.");
      dialog("Закрыть смену",field("actual","Пересчитано наличных","number","","min=0 step=0.01 inputmode=decimal")+'<p class="footnote">Пустое значение останется неизвестным. Отчёт сохранится как исторический снимок.</p>',async form=>{const result=await mutate("/api/sales-events",{action:"close_shift",shiftId:shift().id,...(form.get("actual")!==""?{actualCash:Number(form.get("actual"))}:{})});setReport(result.report);state.view="report";await reload();notice("Кассовая смена закрыта. Итоговый отчёт сохранён. Проверьте команду и ФОТ рабочего дня.");},"Закрыть смену");return;
    }
    if(action==="cash"){
      dialog("Кассовая операция",`<label>Операция<select name="kind"><option value="IN">Внесение</option><option value="OUT">Выдача</option><option value="SAFE_DROP">Инкассация</option></select></label>`+field("amount","Сумма","number","","required min=0.01 step=0.01 inputmode=decimal")+field("reason","Причина","text","","required maxlength=500"),async form=>{await mutate("/api/sales-events",{action:"cash",shiftId:shift().id,cash:{operationId:uuid(),kind:String(form.get("kind")),amount:Number(form.get("amount")),reason:String(form.get("reason"))}});notice("Кассовое движение сохранено.");});return;
    }
    if(action==="all-staff"){state.waiter=null;render();return;}
    if(action==="print"){window.print();return;}
    if(action==="new-rule"){showRule();return;}
    if(action==="retry"){const saved=state.pending;const result=await sendPending();if(result?.report){setReport(result.report);state.view="report";}else if(result?.event){state.orderId=null;state.view="receipts";}else if(saved?.body.action==="create")state.orderId=result?.order.id;render();notice("Результат подтверждён. Операция учтена один раз.");return;}
    if(action==="legacy"){
      const old=state.legacy,draft=old.draft,pending=draft.pending||draft,command=pending.command;
      if(old.storage==="workspace")throw Error("Исходная смена черновика неизвестна. Черновик сохранён для проверки; автоматический перенос в новую смену запрещён.");
      if(command){
        const result=await request("/api/sales-events?externalId="+encodeURIComponent(command.id));
        const found=result.events.find(e=>e.externalId===command.id&&e.source==="POS_API");
        if(found){(old.storage==="session"?sessionStorage:localStorage).removeItem(old.key);state.legacy=null;await reload();state.view="receipts";render();notice("Прежняя оплата уже сохранена. Повтор не нужен.");return;}
        dialog("Восстановить прежнюю оплату",`<p>Сохранённая сумма: ${esc(money(command.payments?.[0]?.amount))}</p><p>Сервер пока не нашёл этот чек. Повтор сохранит исходный номер операции.</p>`,async()=>{
          const preview=await request("/api/sales-events",{action:"preview",command});await request("/api/sales-events",{action:"post",command,previewHash:preview.previewHash});
          (old.storage==="session"?sessionStorage:localStorage).removeItem(old.key);state.legacy=null;await reload();state.view="receipts";render();notice("Прежняя оплата восстановлена.");
        },"Повторить исходную оплату");
      } else {
        if(state.quick.lines.length)throw Error("Есть ещё один быстрый черновик. Старый заказ сохранён и требует отдельной проверки.");
        const originalShiftId=old.storage==="local"?decodeURIComponent(old.key.split(":").at(-1)):draft.shiftId;
        const originalShift=state.data.shifts.find(s=>s.id===originalShiftId&&s.closingStatus==="open");
        if(!originalShift)throw Error("Исходная смена сохранённого черновика недоступна. Черновик сохранён; не переносите его в другую смену.");
        localStorage.setItem(shiftSelectionKey(),originalShift.id);
        state.quick={id:draft.id,shiftId:originalShift.id,lines:draft.lines.map((l,i)=>({...l,id:"line-"+(i+1)})),comment:draft.comment||""};saveLocal();localStorage.removeItem(old.key);state.legacy=null;render();notice("Черновик восстановлен. Проверьте актуальные цены.");
      }return;
    }
  }
  document.addEventListener("input",event=>{if(event.target.id==="unpaid-reason"){state.unpaidReasons[state.unpaidOrderId]=event.target.value;saveUnpaidView();const button=document.querySelector('[data-action="cancel-unpaid"]');if(button){button.toggleAttribute("data-ineligible",!event.target.value.trim());button.disabled=state.busy||navigationLoading||!event.target.value.trim();}}});
  document.addEventListener("toggle",event=>{if(event.target.matches?.("details.admin-actions")&&event.target.isConnected)state.adminActionsOpen=event.target.open;},true);
  document.addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button||button.disabled)return;
    if(button.id==="dialog-submit")return; // The form submit handler owns this transaction.
    if(button.dataset.action==="dismiss"){$("dialog").close();return;}
    if(button.dataset.pane){document.body.dataset.pane=button.dataset.pane;render();window.scrollTo({top:0,behavior:"instant"});return;}
    if(button.dataset.view){void changeView(button.dataset.view);return;}
    void working(async()=>{
      if(button.dataset.unpaidOrder){state.unpaidOrderId=button.dataset.unpaidOrder;saveUnpaidView();renderOrders();window.scrollTo({top:0,behavior:"instant"});}
      else if(button.dataset.workUnpaid)openOrder(button.dataset.workUnpaid);
      else if(button.dataset.order)openOrder(button.dataset.order);
      else if(button.dataset.category){state.category=button.dataset.category;state.subcategory="all";render();}
      else if(button.dataset.add){
        if(state.pending||state.legacy)throw Error("Сначала проверьте сохранённую операцию.");
        const item=state.data.menu.find(m=>m.id===button.dataset.add);if(!item)return;
        dialog("Добавить · "+item.name,field("quantity","Количество, шт.","number","1","required min=1 max=999 step=1 inputmode=numeric"),async form=>{
          const count=Number(form.get("quantity"));if(!Number.isSafeInteger(count)||count<1||count>999)throw Error("Укажите целое количество от 1 до 999.");
          if(selectedOrder())await orderAction("add_items",{lines:[{id:uuid(),menuItemId:item.id,quantity:count}]});
          else{const existing=state.quick.lines.find(l=>l.menuItemId===item.id);if(existing){if(existing.quantity+count>999)throw Error("В одной позиции до 999 штук.");existing.quantity+=count;}else{if(state.quick.lines.length>=100)throw Error("В одном чеке до 100 позиций.");state.quick.lines.push({id:uuid(),menuItemId:item.id,quantity:count,name:item.name});}saveLocal();}
          render();notice("Позиция добавлена.");
        },"Добавить",{kind:"add",id:item.id});
      }else if(button.dataset.increaseLine||button.dataset.decreaseLine||button.dataset.editQuantity){
        if(state.pending||state.legacy)return;
        const id=button.dataset.increaseLine||button.dataset.decreaseLine||button.dataset.editQuantity,order=selectedOrder(),line=(order?order.lines:state.quick.lines).find(l=>l.id===id);if(!line)return;
        if(sentLines(order).has(id))throw Error('Позиция подтверждена. Руководитель может оформить отдельную отмену с причиной.');
        if(order?.precheck||order?.discount)throw Error("Перед изменением руководитель должен снять предчек или скидку.");
        const apply=async count=>{
          if(!Number.isSafeInteger(count)||count<0||count>999)throw Error("Укажите целое количество от 0 до 999.");
          if(selectedOrder())await orderAction("set_quantity",{lineId:id,quantity:count});
          else{state.quick.lines=state.quick.lines.flatMap(l=>l.id!==id?[l]:count?[{...l,quantity:count}]:[]);saveLocal();}
          render();notice(count?"Количество сохранено.":"Позиция удалена до предчека.");
        };
        if(button.dataset.editQuantity)dialog("Количество · "+line.name,field("quantity","Количество, шт.","number",line.quantity,"required min=0 max=999 step=1 inputmode=numeric")+'<p>Ноль удалит неоплаченную позицию. После выдачи предчека сначала нужна его отмена руководителем.</p>',async form=>apply(Number(form.get("quantity"))),"Сохранить количество",{kind:"quantity",id});
        else await apply(line.quantity+(button.dataset.increaseLine?1:-1));
      }else if(button.dataset.cancelLine){if(!senior())return;if(selectedOrder()){
        const order=selectedOrder(),line=order.lines.find(l=>l.id===button.dataset.cancelLine);if(!line)return;
        const original=(order.preparationTickets||[]).find(t=>t.kind!=='CANCELLATION'&&t.lines.some(l=>l.lineId===line.id))?.lines.find(l=>l.lineId===line.id);
        const available=state.data.permissions.inventoryWriteOff&&original?.consumptionAvailable===true;
        const stockChoice='<label>Склад<select name="stockDecision" required><option value="">Выберите действие</option><option value="NO_WRITE_OFF">Не списывать</option><option value="WRITE_OFF" '+(available?'':'disabled')+'>Списать со склада</option></select></label>'+(available?'<p>Списание использует состав и складской источник, сохранённые при подтверждении. Нехватка остатка остановит всю отмену.</p>':'<p>Списание недоступно: нет права, сохранённого состава или складского потребления. Автоматический выбор не выполняется.</p>');
        dialog('Отменить позицию',`<p>${esc(line.name)} · доступно ${line.quantity}</p>`+field('quantity','Количество отмены','number',line.quantity,`required min=1 max=${line.quantity} step=1`)+field('reason','Причина','text','','required maxlength=500')+stockChoice+(sentLines(order).has(line.id)?'<p>Будет сохранён отдельный бегунок «ОТМЕНА» по исходному маршруту. Физическая печать не подключена.</p>':''),async f=>{if(selectedOrder()?.id!==order.id||selectedOrder()?.revision!==order.revision)throw Error('Заказ изменился. Проверьте позиции.');await orderAction('cancel_item',{lineId:line.id,quantity:Number(f.get('quantity')),reason:String(f.get('reason')),stockDecision:String(f.get('stockDecision'))});render();},'Подтвердить отмену');
      }else{state.quick.lines=state.quick.lines.filter(l=>l.id!==button.dataset.cancelLine);saveLocal();render();}}
      else if(button.dataset.waiter!==undefined){state.waiter=button.dataset.waiter;state.detailTab="tables";render();window.scrollTo({top:0,behavior:"instant"});}
      else if(button.dataset.detail){state.detailTab=button.dataset.detail;render();}
      else if(button.dataset.cancelledOrder)showCancelledOrder(button.dataset.cancelledOrder);
      else if(button.dataset.action==="more-cancelled"){state.historyLimit+=20;renderReceipts();}
      else if(button.dataset.receipt)showReceipt(button.dataset.receipt);
      else if(button.dataset.rule)showRule(button.dataset.rule);
      else if(button.dataset.action)await handleAction(button.dataset.action);
    });
  });
  document.addEventListener("input",event=>{
    if(event.target.id==="menu-search"){const caret=event.target.selectionStart;state.search=event.target.value;renderCashier();$("menu-search").focus();$("menu-search").setSelectionRange?.(caret,caret);}
    if(event.target.id==="quick-comment"){state.quick.comment=event.target.value;try{saveLocal();}catch(error){errorView(error);}}
  });
  document.addEventListener("change",event=>{
    if(event.target.id==="receipt-history"){state.historyMode=event.target.value==="cancelled"?"cancelled":"paid";state.historyLimit=20;const url=new URL(location.href);url.searchParams.set("view","receipts");url.searchParams.set("history",state.historyMode);history.replaceState(null,"",url);renderReceipts();}
    if(event.target.id==="shift-picker")void working(async()=>{if(state.pending||state.legacy)throw Error("Сначала проверьте сохранённую операцию.");saveLocal();localStorage.setItem(shiftSelectionKey(),event.target.value);syncQuickShift();saveLocal();render();});
    if(event.target.name==="method"&&!selectedOrder()){state.quick.method=event.target.value;try{saveLocal();}catch(error){errorView(error);}}
    if(event.target.id==="menu-department"){state.department=event.target.value;state.category="all";state.subcategory="all";renderCashier();}
    if(event.target.id==="menu-subcategory"){state.subcategory=event.target.value;renderCashier();}
    if(event.target.id==="waiter-filter"){state.filterWaiter=event.target.value;renderOverview();}
    if(event.target.id==="report-picker"&&event.target.value){state.reportId=event.target.value;setReport(null);persistReportContext(true);void changeView("report",false);}
  });
  window.addEventListener("storage",event=>{if(["bd_pos_identity","bd_session","bd_session_token","bd_active_venue_id",state.data?storageKey():"",state.data?shiftSelectionKey():""].includes(event.key))clearSensitive("Аккаунт, заведение, смена или черновик изменились в другой вкладке. Обновите кассу.");});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refreshController?.refresh(true);});
  window.addEventListener("pagehide",()=>refreshController?.stop());
  window.addEventListener("pageshow",event=>{if(event.persisted&&!state.frozen){refreshController?.start();void refreshController?.refresh(true);}});
  document.body.dataset.pane="order";
  void (async()=>{
    try{
      const value=await load();if(!accept(value,true))return;try{const view=JSON.parse(sessionStorage.getItem(storageKey()+":unpaid")||"null");if(view){state.unpaidOrderId=view.orderId;state.unpaidReasons=view.reasons||{}}}catch{}render();
      notice(state.pending||state.legacy?"Проверьте сохранённую операцию перед новой оплатой.":"");restoreDialogDraft();
      refreshController=window.bdPosRefresh({load,onSuccess:accept,onError:errorView,isVisible:()=>!document.hidden,canRun:()=>!state.busy&&!navigationLoading&&!state.frozen&&!$("dialog").open&&!state.pending&&!state.legacy&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||""),intervalMs:15000});refreshController.start();
    }catch(error){errorView(error);}
  })();
})();
