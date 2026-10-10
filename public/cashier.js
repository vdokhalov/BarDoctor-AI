(() => {
  "use strict";
  const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const uuid=()=>crypto.randomUUID(), icon=name=>`<img class="icon" src="/integration-icons/${name}.svg" alt="">`;
  const labels={owner:"Владелец",manager:"Управляющий",shift_manager:"Администратор",cashier:"Кассир",waiter:"Официант",barista:"Бариста",bartender:"Бармен"};
  const state={data:null,orders:[],rules:[],overview:null,report:null,reportLastSuccess:null,view:"cashier",orderId:null,waiter:null,detailTab:"tables",category:"all",department:"all",subcategory:"all",search:"",busy:false,frozen:false,drafts:{},quick:{id:uuid(),lines:[],comment:""},pending:null,legacy:null,lastSuccess:null,stale:false};
  let dialogSubmit=null,refreshController;
  const notice=message=>{$("notice").textContent=message;}, identity=()=>[localStorage.getItem("bd_session"),localStorage.getItem("bd_session_token")].join(":"), initialIdentity=identity();
  const selectedVenue=()=>new URLSearchParams(location.search).get("venue")||localStorage.getItem("bd_active_venue_id"), initialVenue=selectedVenue();
  const money=(amount,currency=state.data?.currency)=>amount==null?"Неизвестно":window.bdFormatAccountingMoney(amount,currency);
  const amount=value=>value==null?"—":new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(value);
  const currency=()=>state.data?.currency==="PRB"?"руб. ПМР":state.data?.currency||"";
  const date=value=>value?new Intl.DateTimeFormat("ru-RU",{dateStyle:"short",timeStyle:"short",timeZone:state.data?.timezone||"UTC"}).format(new Date(value)):"Неизвестно";
  const time=value=>value?new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:state.data?.timezone||"UTC"}).format(new Date(value)):"—";
  const senior=()=>["owner","manager","shift_manager"].includes(state.data?.actor.role), configure=()=>["owner","manager"].includes(state.data?.actor.role);
  const shiftSelectionKey=()=>`bd_pos_shift_v1:${state.data.actor.accountId}:${state.data.venueId}`;
  const selectedShift=data=>{if(!data)return;const open=data.shifts.filter(s=>s.closingStatus==="open"),saved=localStorage.getItem(`bd_pos_shift_v1:${data.actor.accountId}:${data.venueId}`);return open.find(s=>s.id===saved)||(open.length===1?open[0]:undefined);};
  const shift=()=>selectedShift(state.data), selectedOrder=()=>state.orders.find(o=>o.id===state.orderId), activeOrders=()=>state.orders.filter(o=>o.status==="OPEN" && o.shiftId===shift()?.id);
  const storageKey=()=>`bd_pos_workspace_v2:${state.data.actor.accountId}:${state.data.venueId}`;
  function clearView(name){const view=$(name+"-view");view.replaceChildren();view.hidden=true;}
  function setReport(report){state.report=report;state.reportLastSuccess=report?Date.now():null;}
  function reconcileAccess(){
    if(!senior()){
      state.overview=null;setReport(null);state.waiter=null;state.filterWaiter="";
      clearView("overview");clearView("report");$("dialog").close();$("dialog-content").replaceChildren();
      if(["overview","report"].includes(state.view))state.view="cashier";
    }
    if(!configure()){state.rules=[];clearView("discounts");if(state.view==="discounts")state.view="cashier";}
  }
  function clearSensitive(message) { state.frozen=true;state.overview=null;setReport(null);state.rules=[];state.orders=[];state.data=null;state.view="cashier";["cashier","orders","receipts","overview","report","discounts"].forEach(clearView);$("work").hidden=true;$("sales-journal").hidden=true;$("management-link").hidden=true;$("cashier-venue-host").hidden=true;$("venue-timezone-label").replaceChildren();$("navigation").replaceChildren();$("employee-name").textContent="Требуется обновление";$("employee-role").textContent="";$("dialog").close();$("dialog-content").replaceChildren();refreshController?.stop();notice(message); }
  async function request(path,body) {
    if(state.frozen)throw Error("Обновите кассу перед продолжением.");
    if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Аккаунт или заведение изменились. Обновите кассу.");throw Error("Контекст изменился");}
    const headers={"Content-Type":"application/json"};const email=localStorage.getItem("bd_session"),token=localStorage.getItem("bd_session_token");
    if(email&&token){headers["X-Session-Email"]=email;headers["X-Session-Token"]=token;}if(initialVenue)headers["X-Venue-Id"]=initialVenue;
    let response;
    try { response=await fetch(path,{method:body?"POST":"GET",headers,cache:"no-store",...(body?{body:JSON.stringify({...body,venueId:state.data.venueId})}:{}),signal:AbortSignal.timeout(20000)}); }
    catch { const error=Error("Нет связи. Запрос сохранён, если операция уже начата.");error.uncertain=true;error.network=true;throw error; }
    let data;try{data=await response.json();}catch{const error=Error("Ответ сервера получен не полностью. Сохранённый запрос можно проверить и повторить.");error.uncertain=true;throw error;}
    if(identity()!==initialIdentity||selectedVenue()!==initialVenue){clearSensitive("Контекст изменился. Обновите кассу.");throw Error("Контекст изменился");}
    if([401,403].includes(response.status)||data.code==="VENUE_CHANGED") {
      clearSensitive(response.status===401?"Сессия завершена. Войдите снова.":"Доступ или заведение изменились. Обновите кассу.");
      if(response.status===401)location.replace("/login");
    }
    if(path==="/api/sales-events"&&!body)$("sales-journal").hidden=response.headers.get("X-BD-Sales-Journal")!=="1";
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
    const current=shift();if(!current)return;
    if(!state.quick.shiftId){state.quick.shiftId=current.id;return;}
    if(state.quick.shiftId!==current.id){
      state.drafts[state.quick.shiftId]=state.quick;
      state.quick=state.drafts[current.id]||{id:uuid(),lines:[],comment:"",shiftId:current.id};
      state.orderId=null;
    }
  }
  async function load() {
    const data=await request("/api/sales-events");
    // Apply known access changes immediately, even if a later read in this refresh fails.
    if(state.data&&(state.data.actor.role!==data.actor.role||JSON.stringify(state.data.permissions)!==JSON.stringify(data.permissions))){
      state.data=data;state.orders=[];reconcileAccess();render();
    }
    const orders=await request("/api/pos-orders");
    if(data.venueId!==orders.venueId)throw Error("Заведение изменилось. Обновите кассу.");
    let overview=null;
    const current=selectedShift(data);
    if(state.view==="overview"&&["owner","manager","shift_manager"].includes(data.actor.role)&&current)overview=await request("/api/pos-overview?shiftId="+encodeURIComponent(current.id));
    let report;
    if(state.view==="report"&&["owner","manager","shift_manager"].includes(data.actor.role)&&state.report?.status==="open"){
      report=(await request("/api/sales-events?reportShiftId="+encodeURIComponent(state.report.shiftId))).report;
    }
    return {data,orders:orders.orders,overview,report};
  }
  function accept(value) { if(state.frozen)return;state.data=value.data;syncQuickShift();state.orders=value.orders;state.overview=value.overview;if(value.report!==undefined)setReport(value.report);reconcileAccess();state.lastSuccess=Date.now();state.stale=false;$("connection").textContent="На связи";render(); }
  async function reload(){accept(await load());}
  function errorView(error){state.stale=true;$("connection").textContent=error.network?"Нет соединения":"Данные устарели";notice(error.message);if(state.data)render();}
  async function working(task) {
    if(state.busy||state.frozen||refreshController?.state().running)return;
    state.busy=true;setBusy();
    try{await task();}catch(error){errorView(error);if($("dialog").open)$("dialog-error").textContent=error.message;}
    finally{state.busy=false;setBusy();renderRecovery();}
  }
  function setBusy(){document.querySelectorAll("button").forEach(b=>{if(!b.hasAttribute("data-ineligible"))b.disabled=state.busy;});$("work").setAttribute("aria-busy",String(state.busy));}
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
  function dialog(title,content,submit,label="Подтвердить") {
    $("dialog-title").textContent=title;$("dialog-content").innerHTML=content;$("dialog-error").textContent="";$("dialog-submit").textContent=label;$("dialog-submit").hidden=!submit;dialogSubmit=submit;$("dialog").showModal();
  }
  $("dialog-form").onsubmit=event=>{event.preventDefault();void working(async()=>{if(dialogSubmit)await dialogSubmit(new FormData($("dialog-form")));if(!state.frozen)$("dialog").close();});};
  const field=(name,label,type="text",value="",attrs="")=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  function renderRecovery(){
    $("recovery").hidden=!state.pending&&!state.legacy;
    $("recovery").innerHTML=state.legacy?'<strong>Есть незавершённый заказ из прежней кассы.</strong><p>Он сохранён. Новая оплата заблокирована до проверки результата.</p><button data-action="legacy">Проверить и восстановить</button>':state.pending?'<strong>Результат операции ещё не подтверждён.</strong><p>Повтор использует тот же номер операции.</p><button id="retry" data-action="retry">Проверить результат и повторить</button>':"";
  }
  function nav(){
    const items=[["cashier","Касса","grid-2x2"],["orders","Заказы","clipboard-list"],["receipts","Чеки","circle-check"],...(senior()?[["overview","Текущая смена","clock-3"],["report","Отчёт смены","activity"]]:[]),...(configure()?[["discounts","Настройка скидок","settings-2"]]:[])];
    $("navigation").innerHTML=items.map(([key,label,image])=>`<button data-view="${key}" aria-pressed="${state.view===key}">${icon(image)}${label}</button>`).join("");$("management-link").hidden=!senior();$("cashier-venue-host").hidden=!senior();
  }
  function pricing(order){return order.lines.some(l=>l.pricingUnavailable)?null:order.totals?.netAmount??order.lines.reduce((n,l)=>n+Math.round(l.total*100),0)/100;}
  function quickLines(){return state.quick.lines.map(l=>{const item=state.data.menu.find(m=>m.id===l.menuItemId);const valid=item&&typeof item.salePrice==="number"&&Number.isFinite(item.salePrice)&&Math.abs(item.salePrice*100-Math.round(item.salePrice*100))<0.000001;return {...l,name:item?.name||l.name||"Недоступная позиция",unitPrice:valid?item.salePrice:null,total:valid?Math.round(item.salePrice*100)*l.quantity/100:null};});}
  function quickTotal(){const lines=quickLines();return lines.some(l=>l.total==null)?null:lines.reduce((n,l)=>n+Math.round(l.total*100),0)/100;}
  const badge=o=>`<span class="badge ${o.precheck||o.status==="PRECHECK"?"precheck":""}">${o.precheck||o.status==="PRECHECK"?"Предчек":"Открыт"}</span>`;
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
    if(!current){$("cashier-view").innerHTML=`<section class="panel"><h2>Кассовая смена закрыта</h2><p>${state.data.permissions.shifts?"Откройте смену и укажите размен для сверки наличных.":"Попросите администратора, управляющего или владельца открыть смену."}</p>${state.data.permissions.shifts?'<button class="primary" data-action="open-shift">Открыть смену</button>':""}</section>`;return;}
    const orders=activeOrders(),lines=order?order.lines:quickLines(),total=order?pricing(order):quickTotal();
    const departments=[...new Map(state.data.menu.filter(m=>m.sectionId).map(m=>[m.sectionId,m.department||m.section||m.sectionName||m.sectionId])).entries()];
    const categoryItems=state.data.menu.filter(m=>state.department==="all"||m.sectionId===state.department);
    const categories=[...new Map(categoryItems.filter(m=>m.categoryId).map(m=>[m.categoryId,m.category])).entries()];
    const subcategories=[...new Map(categoryItems.filter(m=>m.subcategoryId&&(state.category==="all"||m.categoryId===state.category)).map(m=>[m.subcategoryId,m.subcategory])).entries()];
    const menu=visibleMenu();
    const locked=!!order?.precheck||!!order?.discount,blocked=state.pending||state.legacy||total==null||!lines.length||!state.data.permissions.post;
    $("cashier-view").innerHTML=`<div class="toolbar">${picker}<small>${esc(current.shiftName)} · ${esc(current.date)} · ${esc(state.data.timezone||"UTC")}</small>${state.data.permissions.shifts?'<div class="actions"><button data-action="cash">Кассовая операция</button><button data-action="close-shift">Закрыть смену</button></div>':""}</div>
      <div class="order-tabs"><button data-action="quick" aria-pressed="${!order}">Быстрая продажа<small>${esc(money(quickTotal()))}</small></button>${orders.map(o=>`<button data-order="${esc(o.id)}" aria-pressed="${order?.id===o.id}">Стол ${esc(o.tableNumber)}<small>${esc(money(pricing(o)))}</small></button>`).join("")}<button data-action="create-order">${icon("plus")} Заказ</button></div>
      <div class="mobile-tabs"><button data-pane="order" aria-pressed="${document.body.dataset.pane!=="menu"}">Заказ · ${lines.reduce((n,l)=>n+l.quantity,0)}</button><button data-pane="menu" aria-pressed="${document.body.dataset.pane==="menu"}">Меню</button></div>
      <div class="layout"><section class="menu-panel panel"><label><span class="muted">Цены в ${esc(currency())}</span><input id="menu-search" type="search" placeholder="Поиск по меню" value="${esc(state.search)}"></label>${departments.length?`<label>Раздел<select id="menu-department"><option value="all">Все разделы</option>${departments.map(([id,name])=>`<option value="${esc(id)}" ${state.department===id?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}<div class="categories"><button data-category="all" aria-pressed="${state.category==="all"}">Все</button>${categories.map(([id,name])=>`<button data-category="${esc(id)}" aria-pressed="${state.category===id}">${esc(name)}</button>`).join("")}</div>${subcategories.length?`<label>Подкатегория<select id="menu-subcategory"><option value="all">Все подкатегории</option>${subcategories.map(([id,name])=>`<option value="${esc(id)}" ${state.subcategory===id?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}<div class="menu-grid">${menu.length?menu.map(m=>`<button class="menu-item" data-add="${esc(m.id)}" ${locked||m.salePrice==null?'disabled data-ineligible':''}>${m.imageUrl?`<img src="${esc(m.imageUrl)}" alt="" loading="lazy">`:""}<strong>${esc(m.name)}</strong><small>${esc(m.subcategory||m.category||"")}</small><span>${esc(money(m.salePrice))}</span></button>`).join(""):'<p class="empty">Позиций по этому запросу нет.</p>'}</div></section>
      <section class="cart panel"><div class="section-head"><div><h2>${order?"Стол "+esc(order.tableNumber):"Быстрая продажа"}</h2><small>${order?esc(order.createdBy.name)+" · "+esc(time(order.createdAt)):"Выберите позиции из меню"}</small></div>${order?badge(order):""}</div><div class="lines">${lines.length?lines.map(l=>`<div class="line" data-menu-item="${esc(l.menuItemId)}"><div class="copy"><strong>${esc(l.name)}</strong><small><output>${l.quantity}</output> × ${esc(money(l.unitPrice))}</small></div><strong class="line-sum">${esc(money(l.pricingUnavailable?null:l.total))}</strong>${!order?`<div class="quantity-controls"><button data-increase-line="${esc(l.id)}" data-increase="${esc(l.menuItemId)}" aria-label="Увеличить ${esc(l.name)}" ${l.quantity>=999?"disabled data-ineligible":""}>+</button>${senior()?`<button data-decrease-line="${esc(l.id)}" data-decrease="${esc(l.menuItemId)}" aria-label="Уменьшить ${esc(l.name)}">−</button>`:""}</div>`:""}${senior()&&!locked?`<button data-cancel-line="${esc(l.id)}" data-remove="${esc(l.menuItemId)}" aria-label="Отменить позицию ${esc(l.name)}">${icon("circle-off")}</button>`:""}</div>`).join(""):'<p class="empty">Добавьте позиции из меню.</p>'}</div>
      <button data-pane="menu" class="mobile-tabs">Добавить позиции</button>${order?.comment?`<p class="muted">${esc(order.comment)}</p>`:!order?`<label>Комментарий<textarea id="quick-comment" rows="2" maxlength="500">${esc(state.quick.comment)}</textarea></label>`:""}
      <div class="cart-foot">${order?.discount?`<p class="readonly">${esc(order.discount.name)} · Скидка ${esc(money(order.discount.discountAmount))}<br><small>До скидки ${esc(money(order.discount.grossAmount))}</small></p>`:""}<div class="total"><span>Итого</span><strong>${esc(money(total))}</strong></div><div class="actions">${order&&!order.precheck?`<button data-action="precheck" ${!lines.length||total==null?'disabled data-ineligible':''}>Предчек</button>`:""}<button id="pay" class="primary" data-action="payment" ${blocked?'disabled data-ineligible':''}>К оплате · ${esc(amount(total))}</button></div>
      ${senior()?`<details class="admin-actions"><summary>Действия администратора</summary><div class="actions">${order?`${order.precheck?'<button data-action="cancel-precheck">Отмена предчека</button>':`<button data-action="split" ${order.discount?'disabled data-ineligible':''}>Разделить счёт</button><button data-action="discount">${order.discount?"Снять скидку":"Применить скидку"}</button>`}<button class="danger" data-action="cancel-order">Отменить заказ</button>`:'<button data-action="save-quick">Сохранить за столом</button>'}</div></details>`:'<div class="admin-actions"><p>Разделение счёта, отмены и скидки выполняет администратор, управляющий или владелец.</p></div>'}<p class="footnote">Предчек и печать в браузере — нефискальные. Принтер и эквайринг не подключены.</p></div></section></div>`;
  }
  function renderOrders(){ $("orders-view").innerHTML=`<div class="section-head"><div><h2>Открытые заказы</h2><p class="muted">${activeOrders().length} счетов · ${new Set(activeOrders().map(o=>o.tableNumber)).size} столов</p></div><button class="primary" data-action="create-order" ${!shift()?'disabled data-ineligible':''}>Новый заказ</button></div><div class="cards">${activeOrders().map(o=>orderCard(o)).join("")}</div>${!activeOrders().length?'<p class="empty">Нет открытых заказов.</p>':""}`; }
  const paymentLabel=e=>(e.payments||[]).map(p=>({CASH:"Наличные",CARD_EXTERNAL:"Карта · внешний терминал"})[p.method]||"Не указан").join(", ")||"Не указан";
  function receiptRows(events){return events.map(e=>`<button class="receipt-row" data-receipt="${esc(e.id)}"><span><strong>${esc(time(e.acceptedAt))} · ${e.tableNumber?"Стол "+esc(e.tableNumber):"Быстрая продажа"}</strong><small>${esc(e.orderActor?.name||e.actor?.name||"Автор неизвестен")} · ${esc(paymentLabel(e))}</small></span><strong>${esc(money(e.revenue))} ${icon("chevron-right")}</strong></button>`).join("");}
  function renderReceipts(){ $("receipts-view").innerHTML=`<h2>Оплаченные чеки</h2><p class="muted">${senior()?"Последние чеки заведения":"Только созданные или оплаченные вами чеки"} · до 100 последних записей</p><section class="panel">${receiptRows(state.data.events.filter(e=>e.status==="POSTED"))||'<p class="empty">Оплаченных чеков пока нет.</p>'}</section>`; }
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
    $("overview-view").innerHTML=`<div class="section-head"><div><h2>Текущая смена <span class="badge">Открыта</span></h2><p class="muted">${esc(o.shift.name)} · ${esc(o.shift.businessDate)} · ${esc(o.shift.timezone)}</p></div></div>${freshness()}${metrics(o.summary)}<section class="panel"><h2>Сотрудники</h2><div class="table-wrap"><table class="staff-table"><thead><tr><th>Сотрудник</th><th class="amount">Открытых столов</th><th class="amount">Не оплачено</th><th class="amount">Оплаченных чеков</th><th class="amount">Оплачено</th><th></th></tr></thead><tbody>${o.staff.map(s=>`<tr><td><div class="staff-name"><span class="avatar">${esc((s.name||"?").split(" ").map(n=>n[0]).slice(0,2).join(""))}</span><div>${esc(s.name||"Автор неизвестен")}${!s.hasActivity?'<small>Нет открытых счетов и продаж</small>':""}</div></div></td><td class="amount">${s.openTableCount}</td><td class="amount">${esc(amount(s.openNetAmount))}</td><td class="amount">${s.paidCheckCount}</td><td class="amount">${esc(amount(s.paidNetAmount))}</td><td><button data-waiter="${esc(String(s.accountId))}">Показать счета</button></td></tr>`).join("")}</tbody><tfoot><tr><td>Итого</td><td class="amount">${o.summary.openTableCount}</td><td class="amount">${esc(amount(o.summary.openNetAmount))}</td><td class="amount">${o.summary.paidCheckCount}</td><td class="amount">${esc(amount(o.summary.paidNetAmount))}</td><td></td></tr></tfoot></table></div></section><div class="section-head"><div><h2>Открытые столы</h2><p class="muted">Неоплаченные счета отдельно от оплаченных чеков</p></div><select id="waiter-filter" aria-label="Фильтр по сотруднику"><option value="">Все сотрудники</option>${o.staff.map(s=>`<option value="${esc(String(s.accountId))}" ${state.filterWaiter===String(s.accountId)?"selected":""}>${esc(s.name||"Автор неизвестен")}</option>`).join("")}</select></div><div class="cards">${filtered.flatMap(s=>s.openOrders.map(order=>orderCard(order,s.name))).join("")}</div><p class="footnote">Нулевая активность не означает присутствие сотрудника на работе. Разделённые счета одного стола считаются одним столом.</p>`;
  }
  function renderReport(){
    const r=state.report;
    const picker=`<div class="toolbar"><select id="report-picker" aria-label="Выберите смену"><option value="">Выберите смену</option>${state.data.shifts.map(s=>`<option value="${esc(s.id)}" ${r?.shiftId===s.id?"selected":""}>${esc(s.shiftName)} · ${esc(s.date)} · ${s.closingStatus==="closed"?"Закрыта":"Открыта"}</option>`).join("")}</select></div>`;
    if(!r){$("report-view").innerHTML=picker+'<p class="empty">Выберите смену для просмотра отчёта.</p>';return;}
    const m=n=>money(n,r.currency),avg=r.totals.paidReceipts?r.totals.paidRevenue/r.totals.paidReceipts:null,cash=r.payments.find(p=>p.method==="CASH"),card=r.payments.find(p=>p.method==="CARD_EXTERNAL"),proportion=r.totals.paidRevenue>0?cash.paidRevenue/r.totals.paidRevenue*100:0;
    const cashRows=[["На начало",r.cash.openingFloat],["Наличные продажи",r.cash.salesRevenue],["Внесения",r.cash.cashIn],["Выдачи",r.cash.cashOut],["Инкассация",r.cash.safeDrop],["Ожидается",r.cash.expected],["Пересчитано",r.cash.actual]];
    $("report-view").innerHTML=`<div class="report">${picker}<p class="fresh report-fresh" data-last-success="${state.reportLastSuccess||""}">${r.status==="closed"?"Исторический снимок получен":state.stale?"Данные отчёта устарели · обновлено":"Отчёт обновлён"} ${state.reportLastSuccess?esc(time(new Date(state.reportLastSuccess))):"—"}${r.status==="open"?" · каждые 15 сек.":""}</p><div class="section-head"><div><h2>Отчёт по смене</h2><span class="muted">${esc(r.shiftName)}</span> <span class="badge">${r.status==="closed"?"Закрыта":"Открыта"}</span></div><button class="primary" data-action="print">Распечатать</button></div><div class="report-meta"><span>Открыта ${esc(date(r.openedAt))} · ${esc(r.openedBy?.name||"Ответственный неизвестен")}</span><span>Закрыта ${esc(date(r.closedAt))} · ${esc(r.closedBy?.name||"Ответственный неизвестен")}</span><span>${esc(r.timezone)} · Учётная дата ${esc(r.businessDate)}</span></div><div class="metrics"><div class="metric"><small>Выручка</small><strong>${esc(m(r.totals.paidRevenue))}</strong><p>После применённых скидок</p></div><div class="metric"><small>Оплаченных чеков</small><strong>${r.totals.paidReceipts}</strong></div><div class="metric"><small>Средний чек</small><strong>${esc(m(avg))}</strong></div></div><div class="report-columns"><div><section class="panel"><h3>Продажи по официантам</h3><div class="table-wrap"><table><thead><tr><th>Сотрудник</th><th class="amount">Выручка</th><th class="amount">Чеков</th><th class="amount">Средний чек</th></tr></thead><tbody>${r.employees.map(e=>`<tr><td>${esc(e.name||"Автор неизвестен")}</td><td class="amount"><strong>${esc(m(e.paidRevenue))}</strong></td><td class="amount">${e.paidReceipts}</td><td class="amount">${esc(m(e.paidReceipts?e.paidRevenue/e.paidReceipts:null))}</td></tr>`).join("")}</tbody><tfoot><tr><td>Итого</td><td class="amount">${esc(m(r.totals.paidRevenue))}</td><td class="amount">${r.totals.paidReceipts}</td><td class="amount">${esc(m(avg))}</td></tr></tfoot></table></div></section><section class="panel"><h3>Способы оплаты</h3><div class="paybar"><span id="cash-proportion"></span><span id="card-proportion" class="card"></span></div>${r.payments.map(p=>`<div class="cash-row"><span>${esc({CASH:"Наличные",CARD_EXTERNAL:"Карта · внешний терминал",UNSPECIFIED:"Способ не указан"}[p.method])}</span><strong>${esc(m(p.paidRevenue))}</strong></div>`).join("")}</section></div><section class="panel cash-panel"><h3>Сверка кассы</h3>${cashRows.map(([label,value],i)=>`<div class="cash-row ${i>4?"emphasis":""}"><span>${label}</span><strong>${esc(m(value))}</strong></div>`).join("")}<div class="difference ${r.cash.variance===0?"good":""}"><strong>Расхождение · ${esc(m(r.cash.variance))}</strong><p>${r.cash.status==="NEGATIVE_EXPECTED"?"Ожидаемая сумма отрицательна: проверьте кассовые движения.":r.cash.variance==null?"Для сверки не хватает данных.":r.cash.variance===0?"Касса сошлась.":"Проверьте кассовые движения и пересчёт."}</p></div></section></div><section class="panel"><h3>Контроль операций</h3><div class="audit-grid"><div><small>Скидки</small><strong>${esc(m(r.totals.paidDiscountAmount))}</strong><small>До скидок ${esc(m(r.totals.paidGrossRevenue))}</small></div><div><small>Возвраты оплаты</small><strong>Недоступны</strong><small>Оплаченные возвраты через кассу пока не поддерживаются</small></div><div><small>Аннулированные продажи</small><strong>${esc(m(r.totals.reversedRevenue))}</strong><small>${r.totals.reversedReceipts} чеков исключены из выручки</small></div></div><details><summary>Кассовые движения · ${r.cash.entries?.length||0}</summary>${(r.cash.entries||[]).map(e=>`<p>${esc(date(e.at))} · ${esc(e.actor.name)} · ${esc({IN:"Внесение",OUT:"Выдача",SAFE_DROP:"Инкассация"}[e.kind])}: ${esc(m(e.amount))}<br><small>${esc(e.reason)}</small></p>`).join("")}</details></section><p class="footnote">Нефискальный управленческий отчёт. Себестоимость не включена; выручка не равна прибыли. Закрытый отчёт — исторический снимок.</p></div>`;
    $("cash-proportion").style.width=proportion+"%";$("card-proportion").style.width=(r.totals.paidRevenue>0?card.paidRevenue/r.totals.paidRevenue*100:0)+"%";
  }
  function renderDiscounts(){ $("discounts-view").innerHTML=`<div class="section-head"><div><h2>Настройка скидок</h2><p class="muted">Одна скидка на весь счёт, без накопления. Процент или фиксированная сумма.</p></div><button class="primary" data-action="new-rule">Создать</button></div><div class="rule-list">${state.rules.map(r=>`<div class="rule"><div><strong>${esc(r.name)}</strong><small>${r.kind==="PERCENT"?esc(r.value)+"%":esc(money(r.value))} · ${r.active?"Активна":"Выключена"}</small></div><button data-rule="${esc(r.id)}">Изменить</button></div>`).join("")||'<p class="empty">Правила скидок ещё не созданы.</p>'}</div>`; }
  async function changeView(view){
    if(["overview","report","discounts"].includes(view)&&!senior())return;
    state.view=view;state.waiter=null;state.filterWaiter="";
    if(view==="overview")await reload();
    else if(view==="discounts"){state.rules=(await request("/api/pos-discounts")).rules;render();}
    else if(view==="report"){const id=state.report?.shiftId||state.data.shifts.at(-1)?.id;if(id)setReport((await request("/api/sales-events?reportShiftId="+encodeURIComponent(id))).report);render();}
    else render();window.scrollTo({top:0,behavior:"instant"});
  }
  function openOrder(id){state.orderId=id;state.view="cashier";document.body.dataset.pane="order";render();window.scrollTo({top:0,behavior:"instant"});}
  async function createOrder(fromQuick=false){
    if(!shift())throw Error("Сначала откройте смену.");
    dialog("Новый заказ",field("table","Номер стола","number","","required min=1 max=9999 step=1 inputmode=numeric")+field("comment","Комментарий","text",fromQuick?state.quick.comment:"","maxlength=500"),async form=>{
      const id=uuid(),result=await mutate("/api/pos-orders",{action:"create",operationId:uuid(),orderId:id,expectedRevision:0,shiftId:shift().id,tableNumber:String(form.get("table")),comment:String(form.get("comment")),lines:fromQuick?state.quick.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity})):[]},fromQuick?quickOrigin(state.quick):undefined);
      openOrder(result.order.id);notice("Заказ сохранён. Добавьте позиции из меню.");
    },"Создать заказ");
  }
  function reasonAction(title,action,extra={}){dialog(title,field("reason","Причина","text","","required maxlength=500"),async f=>{await orderAction(action,{...extra,reason:String(f.get("reason"))});render();});}
  async function showPayment(){
    const order=selectedOrder(),sum=order?pricing(order):quickTotal();
    if(sum==null)throw Error("Цена недоступна. Проверьте позиции.");
    dialog("Оплата",`<p class="total">К оплате <strong>${esc(money(sum))}</strong></p><div class="payment-choices"><label><input type="radio" name="method" value="CASH" ${order||state.quick.method!=="CARD_EXTERNAL"?"checked":""}>Наличные</label><label><input type="radio" name="method" value="CARD_EXTERNAL" ${!order&&state.quick.method==="CARD_EXTERNAL"?"checked":""}>Внешний терминал</label></div><p class="footnote">Подтвердите фактически полученную оплату. Интеграция эквайринга и фискализация отсутствуют.</p>`,async form=>{
      notice("Выполняем оплату…");
      const method=String(form.get("method")),payment={id:uuid(),method,amount:sum};let result;
      if(order){
        const body={orderId:order.id,expectedRevision:order.revision,payment};
        const preview=await request("/api/pos-orders",{...body,action:"preview_payment",operationId:uuid()});
        result=await mutate("/api/pos-orders",{...body,action:"pay",operationId:uuid(),previewHash:preview.previewHash});
      } else {
        const command={id:state.quick.id,source:"POS_API",shiftId:shift().id,comment:state.quick.comment,payments:[payment],lines:state.quick.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,quantity:l.quantity}))};
        const preview=await request("/api/sales-events",{action:"preview",command});
        result=await mutate("/api/sales-events",{action:"post",command,previewHash:preview.previewHash});
      }
      state.orderId=null;state.view="receipts";render();notice(result.duplicate?"Оплата уже была сохранена. Повторного списания нет.":"Продажа проведена и сохранена в общем журнале.");
    },"Подтвердить оплату");
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
    if(action==="identity"){dialog("Аккаунт",`<p>${esc(state.data.actor.name)} · ${esc(labels[state.data.actor.jobTitle||state.data.actor.role])}</p><p>${esc(state.data.venueName)}</p><a href="/team-access">Мои заведения и доступ</a><p class="footnote">При смене заведения касса обновит контекст. Незавершённые запросы сохранятся.</p>`,null);return;}
    if(action==="quick"){state.orderId=null;document.body.dataset.pane="order";render();return;}
    if(action==="create-order"||action==="save-quick"){await createOrder(action==="save-quick");return;}
    if(action==="payment"){await showPayment();return;}
    if(action==="precheck"){await orderAction("precheck");notice("Предчек сохранён. Это нефискальный документ.");render();return;}
    if(action==="cancel-precheck"){reasonAction("Отмена предчека","cancel_precheck");return;}
    if(action==="cancel-order"){reasonAction("Отменить заказ","cancel_order");return;}
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
      dialog("Открыть смену",field("name","Название смены","text","","required maxlength=160")+field("float","Размен на начало","number","","min=0 step=0.01 inputmode=decimal")+'<p class="footnote">Пустое значение означает неизвестную сумму, а не ноль.</p>',async form=>{await mutate("/api/sales-events",{action:"open_shift",shiftId:uuid(),name:String(form.get("name")),...(form.get("float")!==""?{openingFloat:Number(form.get("float"))}:{})});render();notice("Смена открыта.");},"Открыть смену");return;
    }
    if(action==="close-shift"){
      if(activeOrders().length)throw Error("Перед закрытием оплатите или отмените все открытые заказы.");
      dialog("Закрыть смену",field("actual","Пересчитано наличных","number","","min=0 step=0.01 inputmode=decimal")+'<p class="footnote">Пустое значение останется неизвестным. Отчёт сохранится как исторический снимок.</p>',async form=>{const result=await mutate("/api/sales-events",{action:"close_shift",shiftId:shift().id,...(form.get("actual")!==""?{actualCash:Number(form.get("actual"))}:{})});setReport(result.report);state.view="report";render();notice("Смена закрыта. Итоговый отчёт сохранён.");},"Закрыть смену");return;
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
        state.quick={id:draft.id,lines:draft.lines.map((l,i)=>({...l,id:"line-"+(i+1)})),comment:draft.comment||""};saveLocal();localStorage.removeItem(old.key);state.legacy=null;render();notice("Черновик восстановлен. Проверьте актуальные цены.");
      }return;
    }
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button||button.disabled)return;
    if(button.id==="dialog-submit")return; // The form submit handler owns this transaction.
    if(button.dataset.action==="dismiss"){$("dialog").close();return;}
    if(button.dataset.pane){document.body.dataset.pane=button.dataset.pane;render();window.scrollTo({top:0,behavior:"instant"});return;}
    void working(async()=>{
      if(button.dataset.view)await changeView(button.dataset.view);
      else if(button.dataset.order)openOrder(button.dataset.order);
      else if(button.dataset.category){state.category=button.dataset.category;state.subcategory="all";render();}
      else if(button.dataset.add){
        if(state.pending||state.legacy)throw Error("Сначала проверьте сохранённую операцию.");
        const item=state.data.menu.find(m=>m.id===button.dataset.add);if(!item)return;
        const order=selectedOrder();
        if(order){await orderAction("add_items",{lines:[{id:uuid(),menuItemId:item.id,quantity:1}]});render();}
        else{const existing=state.quick.lines.find(l=>l.menuItemId===item.id);if(existing){if(existing.quantity>=999)return;existing.quantity++;}else{if(state.quick.lines.length>=100)throw Error("В одном чеке до 100 позиций.");state.quick.lines.push({id:uuid(),menuItemId:item.id,quantity:1,name:item.name});}saveLocal();render();notice("Позиция добавлена.");}
      }else if(button.dataset.increaseLine||button.dataset.decreaseLine){
        if(selectedOrder()||state.pending||state.legacy)return;
        const line=state.quick.lines.find(l=>l.id===(button.dataset.increaseLine||button.dataset.decreaseLine));if(!line)return;
        if(button.dataset.decreaseLine){if(!senior())return;if(line.quantity===1)state.quick.lines=state.quick.lines.filter(l=>l!==line);else line.quantity--;}
        else{if(line.quantity>=999)return;line.quantity++;}
        saveLocal();render();
      }else if(button.dataset.cancelLine){if(!senior())return;if(selectedOrder())reasonAction("Отменить позицию","cancel_item",{lineId:button.dataset.cancelLine});else{state.quick.lines=state.quick.lines.filter(l=>l.id!==button.dataset.cancelLine);saveLocal();render();}}
      else if(button.dataset.waiter!==undefined){state.waiter=button.dataset.waiter;state.detailTab="tables";render();window.scrollTo({top:0,behavior:"instant"});}
      else if(button.dataset.detail){state.detailTab=button.dataset.detail;render();}
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
    if(event.target.id==="shift-picker")void working(async()=>{if(state.pending||state.legacy)throw Error("Сначала проверьте сохранённую операцию.");saveLocal();localStorage.setItem(shiftSelectionKey(),event.target.value);syncQuickShift();saveLocal();render();});
    if(event.target.name==="method"&&!selectedOrder()){state.quick.method=event.target.value;try{saveLocal();}catch(error){errorView(error);}}
    if(event.target.id==="menu-department"){state.department=event.target.value;state.category="all";state.subcategory="all";renderCashier();}
    if(event.target.id==="menu-subcategory"){state.subcategory=event.target.value;renderCashier();}
    if(event.target.id==="waiter-filter"){state.filterWaiter=event.target.value;renderOverview();}
    if(event.target.id==="report-picker"&&event.target.value)void working(async()=>{setReport((await request("/api/sales-events?reportShiftId="+encodeURIComponent(event.target.value))).report);render();});
  });
  window.addEventListener("storage",event=>{if(["bd_session","bd_session_token","bd_active_venue_id",state.data?storageKey():""].includes(event.key))clearSensitive("Аккаунт, заведение или черновик изменились в другой вкладке. Обновите кассу.");});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refreshController?.refresh(true);});
  window.addEventListener("pagehide",()=>refreshController?.stop());
  window.addEventListener("pageshow",event=>{if(event.persisted&&!state.frozen){refreshController?.start();void refreshController?.refresh(true);}});
  document.body.dataset.pane="order";
  void (async()=>{
    try{
      const value=await load();state.data=value.data;state.orders=value.orders;restoreLocal();accept(value);
      notice(state.pending||state.legacy?"Проверьте сохранённую операцию перед новой оплатой.":"Касса готова. Выберите заказ или начните быструю продажу.");
      refreshController=window.bdPosRefresh({load,onSuccess:accept,onError:errorView,isVisible:()=>!document.hidden,canRun:()=>!state.busy&&!state.frozen&&!$("dialog").open&&!state.pending&&!state.legacy&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||""),intervalMs:15000});refreshController.start();
    }catch(error){errorView(error);}
  })();
})();
