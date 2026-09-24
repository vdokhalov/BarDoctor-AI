(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const text = (id, value) => { $(id).textContent = value; };
  let data, activeShift, cart = new Map(), department = "all", category = "all", busy = false, pending = null, frozen = false;
  const departmentKey = raw => { const key=String(raw||"other").toLocaleLowerCase("ru-RU"); return ({"бар":"bar","кухня":"kitchen","кальяны":"hookah","кальян":"hookah"})[key]||key; };
  const money = amount => window.bdFormatAccountingMoney(amount,data?.currency);
  const sessionKey = () => `bd_pos_pending:${localStorage.getItem("bd_session")}:${data.venueId}`;
  const notice = message => text("notice",message);
  const currentVenue = () => new URLSearchParams(location.search).get("venue") || localStorage.getItem("bd_active_venue_id");
  const online = value => text("connection",value ? "● На связи" : "● Нет соединения");
  const initialIdentity = [localStorage.getItem("bd_session"),localStorage.getItem("bd_session_token")].join(":");
  async function request(body, externalId) {
    if (frozen) throw Error("Заведение изменилось. Обновите кассу.");
    const venue = currentVenue(), email = localStorage.getItem("bd_session"), token = localStorage.getItem("bd_session_token");
    if (data && String(data.venueId) !== venue) throw Error("Заведение изменилось. Обновите кассу.");
    const headers = new Headers({"Content-Type":"application/json"});
    if (email && token) { headers.set("X-Session-Email",email); headers.set("X-Session-Token",token); }
    if (venue) headers.set("X-Venue-Id",venue);
    let response;
    try { response = await fetch("/api/sales-events"+(externalId?"?externalId="+encodeURIComponent(externalId):""), { method:body?"POST":"GET", headers, ...(body?{body:JSON.stringify({...body,venueId:data.venueId})}:{}), signal:AbortSignal.timeout(20000) }); }
    catch { online(false); throw Error("Соединение недоступно. Проверьте сеть и повторите запрос."); }
    online(true);
    const result = await response.json().catch(() => ({}));
    if (venue !== currentVenue() || initialIdentity !== [localStorage.getItem("bd_session"),localStorage.getItem("bd_session_token")].join(":")) { frozen=true; throw Error("Заведение изменилось. Обновите кассу."); }
    if (!response.ok || !result.ok) { const error = Error(result.error || ({SALES_EVENT_CONSUMPTION_NEEDS_REVIEW:"Для этой позиции не настроено безопасное складское списание. Проверьте режим и техкарту.",SALES_EVENT_SHIFT_CLOSED_OR_DATE_MISMATCH:"Смена закрыта. Выберите открытую смену.",SALES_EVENT_POS_PAYMENT_MISMATCH:"Сумма оплаты не совпадает с суммой заказа."})[result.code] || "Операция не выполнена. Ничего не изменено."); error.status=response.status; throw error; }
    return result;
  }
  let draftKey=null, draftRevision=null, orderId=null, storageFailed=false;
  const selectionKey=()=>"bd_pos_shift_v1:"+data.actor.accountId+":"+data.venueId;
  function draftIdentity(shiftId) {return window.bdPosDraft.key(data.actor.accountId,data.venueId,shiftId);}
  function persistDraft() {
    if(!data||!activeShift||frozen||draftKey!==draftIdentity(activeShift.id))return false;
    try {
      const current=window.bdPosDraft.read(localStorage,draftKey);
      if((current?.revision||null)!==draftRevision) {frozen=true;throw Error("Заказ изменён в другой вкладке. Откройте кассу заново.");}
      orderId ||= crypto.randomUUID();
      const draft={version:1,id:orderId,revision:crypto.randomUUID(),lines:[...cart.values()].map(row=>({menuItemId:String(row.item.id),quantity:row.quantity,name:row.item.name})),comment:$("comment").value,method:document.querySelector('input[name="payment"]:checked').value,pending};
      localStorage.setItem(draftKey,JSON.stringify(draft));draftRevision=draft.revision;storageFailed=false;return true;
    } catch(error) {storageFailed=true;notice(error.message || "Не удалось сохранить заказ в браузере. Проверьте доступ к хранилищу и повторите изменение.");renderButtons();return false;}
  }
  function restoreDraft() {
    cart.clear();pending=null;orderId=null;draftRevision=null;$("comment").value="";document.querySelector('input[name="payment"][value="CASH"]').checked=true;
    draftKey=activeShift?draftIdentity(activeShift.id):null;
    if(!draftKey)return;
    localStorage.setItem(selectionKey(),activeShift.id);
    const draft=window.bdPosDraft.read(localStorage,draftKey);
    if(!draft)return;
    orderId=draft.id;draftRevision=draft.revision;pending=draft.pending||null;
    for(const line of draft.lines){const item=data.menu.find(item=>String(item.id)===line.menuItemId)||{id:line.menuItemId,name:line.name||"Недоступная позиция",salePrice:null,unavailable:true};cart.set(String(item.id),{item,quantity:line.quantity});}
    $("comment").value=String(draft.comment||"").slice(0,500);document.querySelector('input[name="payment"][value="'+(draft.method==="CARD_EXTERNAL"?"CARD_EXTERNAL":"CASH")+'"]').checked=true;
    if(cart.size)notice("Незавершённый заказ восстановлен. Проверьте позиции и текущие цены перед оплатой.");
  }
  function complete(event,duplicate) {
    // Clear before displaying a receipt; a retained pending key is also safe if storage removal fails.
    try{if(draftKey)localStorage.removeItem(draftKey);sessionStorage.removeItem(sessionKey());}catch{}
    pending=null;cart.clear();orderId=null;draftRevision=null;$("comment").value="";showReceipt(event,duplicate);
  }
  function working(task) { if (busy || frozen) return; busy=true; renderButtons(); Promise.resolve().then(task).catch(error => notice(error.message || "Операция не выполнена")).finally(() => {busy=false;renderButtons();}); }
  function openShifts() { return data.shifts.filter(shift => shift.closingStatus === "open"); }
  function updateJump() {const bounds=$("cart").getBoundingClientRect();$("order-jump").hidden=!(activeShift&&data?.permissions.post&&$("receipt").hidden&&!(bounds.top<innerHeight-80&&bounds.bottom>80));}
  function renderShift() {
    const shifts = openShifts();
    if (activeShift && !pending && !shifts.some(shift => shift.id === activeShift.id)) activeShift=null;
    if (!activeShift && shifts.length === 1) activeShift=shifts[0];
    if(activeShift&&draftKey!==draftIdentity(activeShift.id))restoreDraft();
    const ready=Boolean(activeShift && data.permissions.post);
    $("shift-gate").hidden=ready; $("cashier").hidden=!ready;updateJump();
    if (!ready) {
      const message=!data.permissions.post?"У вашей роли нет права проводить продажи в кассе.":shifts.length?"Выберите открытую смену для этой продажи.":"Открытых смен нет. Откройте смену согласно вашим правам.";
      text("shift-message",message);
      $("shift-picker-label").hidden=shifts.length === 0 || !data.permissions.post;
      $("shift-picker").innerHTML=`<option value="">Выберите смену</option>`+shifts.map(shift=>`<option value="${esc(shift.id)}">${esc(shift.shiftName)} · ${esc(shift.date)}</option>`).join("");
      $("open-shift").hidden=!data.permissions.shifts || shifts.length>0;
    }
    if (activeShift) text("shift-title",`${activeShift.shiftName} · ${activeShift.date}`);
    renderButtons();
  }
  function visibleMenu() {
    const query=$("search").value.trim().toLocaleLowerCase("ru-RU");
    return data.menu.filter(item=>item.name && item.salePrice != null && Number.isFinite(Number(item.salePrice)) && (department==="all" || departmentKey(item.department)===department) && (category==="all" || String(item.categoryId||item.category)===category) && (!query || String(item.name).toLocaleLowerCase("ru-RU").includes(query)));
  }
  function renderMenu() {
    const departments=[...["bar","kitchen","hookah"],...new Set(data.menu.map(item=>departmentKey(item.department)).filter(key=>!["bar","kitchen","hookah"].includes(key)))];
    const labels={all:"Все",bar:"Бар",kitchen:"Кухня",hookah:"Кальяны",other:"Другое"};
    $("departments").innerHTML=`<button type="button" data-department="all" aria-pressed="${department==="all"}">Все</button>`+departments.map(key=>`<button type="button" data-department="${esc(key)}" aria-pressed="${department===key}">${esc(labels[key]||key)}</button>`).join("");
    const categoryMap=new Map(data.menu.filter(item=>department==="all"||departmentKey(item.department)===department).map(item=>[String(item.categoryId||item.category),item.category]));
    const categories=[...categoryMap.keys()];
    if(category!=="all"&&!categories.includes(category))category="all";
    $("categories").innerHTML=`<button type="button" data-category="all" aria-pressed="${category==="all"}">Все категории</button>`+categories.map(name=>`<button type="button" data-category="${esc(name)}" aria-pressed="${category===name}">${esc(categoryMap.get(name))}</button>`).join("");
    const items=visibleMenu();
    $("menu").innerHTML=items.length?items.map(item=>`<button type="button" class="pos-item" data-add="${esc(item.id)}"><strong>${esc(item.name)}</strong><span><small>${esc(item.category||"")}</small><br><span class="pos-item-price">${esc(money(item.salePrice))} · +1</span></span></button>`).join(""):`<p class="pos-empty">Позиций по этому запросу нет.</p>`;
  }
  function total() {if([...cart.values()].some(row=>row.item.unavailable))return null;return Math.round([...cart.values()].reduce((sum,row)=>sum+Number(row.item.salePrice)*row.quantity,0)*100)/100;}
  function renderCart() {
    const rows=[...cart.values()]; text("cart-count",`${rows.reduce((sum,row)=>sum+row.quantity,0)} шт.`);
    $("cart-lines").innerHTML=rows.length?rows.map(row=>`<div class="pos-line"><div><strong>${esc(row.item.name)}</strong><small>${esc(money(row.item.salePrice))} × ${row.quantity} = ${esc(row.item.unavailable?"Позиция недоступна":money(Number(row.item.salePrice)*row.quantity))}</small></div><div class="pos-qty"><button type="button" data-decrease="${esc(row.item.id)}" aria-label="Уменьшить ${esc(row.item.name)}">−</button><output>${row.quantity}</output><button type="button" data-increase="${esc(row.item.id)}" aria-label="Увеличить ${esc(row.item.name)}">+</button><button type="button" class="pos-remove" data-remove="${esc(row.item.id)}" aria-label="Убрать ${esc(row.item.name)}">×</button></div></div>`).join(""):`<p class="pos-empty">Нажмите на позицию меню, чтобы добавить её в заказ.</p>`;
    text("total",money(total()));text("jump-count",`${rows.reduce((sum,row)=>sum+row.quantity,0)} шт.`);text("jump-total",money(total()));renderButtons();updateJump();
  }
  function renderButtons() {$("pay").textContent=busy?"Проводим…":"Оплатить";$("pay").disabled=busy||frozen||storageFailed||[...cart.values()].some(row=>row.item.unavailable)||Boolean(pending)||!activeShift||cart.size===0||!data?.permissions.post;$("retry").hidden=!pending;$("retry").disabled=busy||frozen;$("comment").disabled=busy||Boolean(pending);document.querySelectorAll('input[name="payment"]').forEach(input=>input.disabled=busy||Boolean(pending));}
  function showReceipt(event, duplicate=false) {
    $("cashier").hidden=true;$("shift-gate").hidden=true;$("order-jump").hidden=true;$("receipt").hidden=false;
    const details=event.prices.map(line=>`<p>${esc(line.name)} × ${line.quantity} — ${esc(money(line.total))}</p>`).join("");
    const cost=event.batch.totalTheoreticalCost == null?"Себестоимость неизвестна":money(event.batch.totalTheoreticalCost);
    $("receipt-detail").innerHTML=details+`<p><strong>Выручка: ${esc(money(event.revenue))}</strong></p><p>Себестоимость: ${esc(cost)}</p><p>Смена: ${esc(event.shiftId||"")}</p><p>Сотрудник: ${esc(event.actor?.name||event.batch.createdBy?.name||"")}</p>`;
    notice(duplicate?"Продажа уже проведена. Повторного списания нет.":"Продажа проведена и сохранена.");
  }
  async function refresh() {
    data=await request();text("venue-name",data.venueName||"Заведение");text("employee-name",data.actor?.name||"Сотрудник");
    $("work").hidden=false;
    const selected=localStorage.getItem(selectionKey());activeShift=data.shifts.find(shift=>shift.id===selected&&shift.closingStatus==="open")||null;
    const legacy=sessionStorage.getItem(sessionKey());
    if(legacy){const saved=JSON.parse(legacy);activeShift=data.shifts.find(shift=>shift.id===saved.command.shiftId)||activeShift;if(activeShift){restoreDraft();pending=saved;orderId=saved.command.id;cart=new Map(saved.command.lines.map(line=>{const item=data.menu.find(item=>item.id===line.menuItemId)||{id:line.menuItemId,name:"Недоступная позиция",salePrice:null,unavailable:true};return[String(item.id),{item,quantity:line.quantity}];}));$("comment").value=saved.command.comment||"";if(!persistDraft())throw Error("Не удалось сохранить предыдущий запрос оплаты.");sessionStorage.removeItem(sessionKey());}}
    else if(activeShift)restoreDraft();
    else if(selected){const old=window.bdPosDraft.read(localStorage,draftIdentity(selected));if(old?.pending){activeShift=data.shifts.find(shift=>shift.id===selected)||{id:selected};restoreDraft();}}

    if(pending){const checked=await request(undefined,pending.command.id);const event=checked.events.find(event=>event.externalId===pending.command.id&&event.source==="POS_API");if(event){complete(event,true);return;}notice("Результат оплаты не подтверждён. Проверьте его повторным запросом.");}
    renderShift();renderMenu();renderCart();if(!pending&&!cart.size)notice("Выберите позиции и способ оплаты.");
  }
  async function submitPending() {
    if(!pending)return;
    const existing=data.events.find(event=>event.externalId===pending.command.id&&event.source==="POS_API");
    if(existing){complete(existing,true);return;}
    const preview=await request({action:"preview",command:pending.command});
    if(preview.duplicate){complete(preview.event,true);return;}
    const result=await request({action:"post",command:pending.command,previewHash:preview.previewHash});
    complete(result.event,Boolean(result.duplicate));
  }
  $("departments").onclick=event=>{const button=event.target.closest("[data-department]");if(button&&!busy){department=button.dataset.department;category="all";renderMenu();}};
  $("categories").onclick=event=>{const button=event.target.closest("[data-category]");if(button&&!busy){category=button.dataset.category;renderMenu();}};
  $("search").oninput=renderMenu;
  $("menu").onclick=event=>{const button=event.target.closest("[data-add]");if(!button||busy||pending)return;const item=data.menu.find(item=>String(item.id)===button.dataset.add);if(!item)return;const row=cart.get(String(item.id));if(!row&&cart.size>=100){notice("В одном заказе может быть до 100 позиций.");return;}cart.set(String(item.id),{item,quantity:Math.min(999,(row?.quantity||0)+1)});persistDraft();renderCart();};
  $("cart-lines").onclick=event=>{const button=event.target.closest("[data-increase],[data-decrease],[data-remove]");if(!button||busy||pending)return;const id=button.dataset.increase??button.dataset.decrease??button.dataset.remove,row=cart.get(id);if(!row)return;if(button.hasAttribute("data-remove"))cart.delete(id);else{row.quantity+=button.hasAttribute("data-increase")?1:-1;if(row.quantity<=0)cart.delete(id);else row.quantity=Math.min(row.quantity,999);}persistDraft();renderCart();};
  $("shift-picker").onchange=()=>{activeShift=openShifts().find(shift=>shift.id===$("shift-picker").value)||null;restoreDraft();renderShift();renderCart();};
  $("open-shift").onsubmit=event=>{event.preventDefault();working(async()=>{await request({action:"open_shift",shiftId:crypto.randomUUID(),name:$("shift-name").value.trim()});data=await request();renderShift();notice("Смена открыта.");});};
  async function handlePendingFailure(error) {
    if(error.status>=400&&error.status<500&&pending){
      try{
        data=await request(undefined,pending.command.id);
        const saved=data.events.find(event=>event.externalId===pending.command.id&&event.source==="POS_API");
        if(saved){complete(saved,true);return;}
        pending=null;persistDraft();renderShift();renderCart();
        notice(`${error.message} Исправьте заказ и повторите оплату.`);return;
      }catch{ /* The server could not confirm the result; retain the original idempotency key. */ }
    }
    notice(`${error.message} Заказ сохранён для безопасного повтора.`);
  }
  $("pay").onclick=()=>working(async()=>{
    if(!activeShift||!cart.size||pending||!persistDraft())return;
    const amount=total(),method=document.querySelector('input[name="payment"]:checked').value;
    pending={command:{id:orderId,source:"POS_API",shiftId:activeShift.id,comment:$("comment").value,lines:[...cart.values()].map((row,i)=>({id:`line-${i+1}`,menuItemId:row.item.id,quantity:row.quantity})),payments:[{id:"payment-1",method,amount}]}};
    if(!persistDraft()){pending=null;return;}
    try{await submitPending();}catch(error){await handlePendingFailure(error);}
  });
  $("comment").oninput=()=>{if(!busy&&!pending)persistDraft();};
  $("payment").onchange=()=>{if(!busy&&!pending)persistDraft();};
  $("order-jump").onclick=()=>$("cart").scrollIntoView({behavior:"smooth",block:"start"});
  $("retry").onclick=()=>working(async()=>{try{data=await request(undefined,pending?.command.id);await submitPending();}catch(error){await handlePendingFailure(error);}});
  $("new-order").onclick=()=>{cart.clear();$("comment").value="";$("receipt").hidden=true;working(refresh);};
  window.addEventListener("scroll",updateJump,{passive:true});window.addEventListener("resize",updateJump);
  window.addEventListener("online",()=>online(true));window.addEventListener("offline",()=>online(false));
  window.addEventListener("storage",event=>{if(event.key===draftKey||["bd_active_venue_id","bd_session","bd_session_token"].includes(event.key)){frozen=true;$("work").hidden=true;notice("Заведение или аккаунт изменились. Обновите кассу.");}});
  working(refresh);
})();
