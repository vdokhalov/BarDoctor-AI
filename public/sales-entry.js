(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const notice = message => { $("notice").textContent = message; };
  let payload, quote, pending, busy = false, frozen = false;
  const storageKey = () => "bd_pending_sale:" + localStorage.getItem("bd_session") + ":" + payload.venueId;
  const money = (value, currency) => value == null ? "Стоимость неизвестна" : `${Number(value).toLocaleString("ru-RU")} ${currency}`;
  async function request(body) {
    const headers = new Headers({"Content-Type":"application/json"});
    const venue = localStorage.getItem("bd_active_venue_id"), email = localStorage.getItem("bd_session"), token = localStorage.getItem("bd_session_token");
    if (email && token) { headers.set("X-Session-Email",email); headers.set("X-Session-Token",token); }
    if (venue) headers.set("X-Venue-Id",venue);
    if (frozen || body && String(payload.venueId) !== venue) throw new Error("Заведение изменилось. Обновите страницу.");
    const response = await fetch("/api/sales-events",{method:body?"POST":"GET",headers,...(body?{body:JSON.stringify({...body,venueId:payload.venueId})}:{}),signal:AbortSignal.timeout(20000)});
    const result = await response.json();
    if (venue !== localStorage.getItem("bd_active_venue_id")) throw new Error("Заведение изменилось. Обновите страницу.");
    if (!response.ok || !result.ok) {
      const error = new Error(result.error || result.code || "Не удалось выполнить действие");
      error.noWrite = response.status >= 400 && response.status < 500;
      throw error;
    }
    return result;
  }
  async function perform(fn) {
    if (busy || frozen) return;
    busy=true;
    const controls=[...document.querySelectorAll("input,select,button")].map(node=>[node,node.disabled]);
    controls.forEach(([node])=>{node.disabled=true;});
    try {await fn();} catch(error) {notice(error.message || "Не удалось выполнить действие");}
    finally {controls.forEach(([node,disabled])=>{if(node.isConnected) node.disabled=disabled;});busy=false;}
  }
  function addLine() {
    const row=document.createElement("div");row.className="grid";
    row.innerHTML=`<label>Позиция меню<select data-menu required><option value="">Выберите позицию</option>${payload.menu.map(m=>`<option value="${escape(m.id)}">${escape(m.name)} · ${escape(money(m.salePrice,m.currency))}</option>`).join("")}</select></label><label>Количество<input data-quantity type="number" min="0.000001" max="1000000" step="any" value="1" required></label><button type="button" data-remove>Убрать позицию</button>`;
    $("lines").append(row);
  }
  function invalidate() {if(!pending){quote=undefined;$("preview").hidden=true;}}
  function showQuote(event) {
    $("preview").hidden=false;
    $("quote").innerHTML=event.prices.map(p=>`<p>${escape(p.name)} × ${escape(p.quantity)} — ${escape(money(p.total,event.currency))}</p>`).join("")+
      `<p><b>Выручка: ${escape(money(event.revenue,event.currency))}</b></p><p>Себестоимость: ${escape(money(event.batch.totalTheoreticalCost,event.currency))}</p>`+
      event.batch.lines.flatMap(l=>l.recipeSnapshot.ingredients).map(i=>`<p>Расход: ${escape(i.name)} — ${escape(i.baseQuantityTotal)} ${escape(i.baseUnit)}</p>`).join("");
  }
  async function load() {
    payload=await request();
    $("work").hidden=false;$("sale").hidden=!payload.permissions.post;$("shift-actions").hidden=!payload.permissions.shifts;
    $("shift").innerHTML='<option value="">Без смены</option>'+payload.shifts.filter(s=>s.closingStatus==="open").map(s=>`<option value="${escape(s.id)}">${escape(s.shiftName)} · ${escape(s.date)}</option>`).join("");
    $("shifts").innerHTML=payload.shifts.map(s=>`<details><summary>${escape(s.shiftName)} · ${escape(s.date)} · ${s.closingStatus==="closed"?"Закрыта":"Открыта"} · ${escape(money(s.revenue,s.currency))}</summary>${s.closingStatus==="open"?`<button data-close="${escape(s.id)}">Подтвердить закрытие смены</button>`:""}</details>`).join("");
    $("events").innerHTML=payload.events.length?payload.events.map(e=>`<details><summary>${escape(e.acceptedAt)} · ${escape(money(e.revenue,e.currency))} · ${e.status==="POSTED"?"Продажа":"Возвращена"}</summary>${e.prices.map(p=>`<p>${escape(p.name)} × ${escape(p.quantity)}</p>`).join("")}<p>Себестоимость: ${escape(money(e.batch.totalTheoreticalCost,e.currency))}</p>${e.status==="POSTED"&&payload.permissions.reverse?`<details><summary>Вернуть всю продажу</summary><p>Будут возвращены все товары и отменена выручка этой продажи.</p><button data-reverse="${escape(e.id)}">Подтвердить полный возврат</button></details>`:""}</details>`).join(""):"Продаж ещё нет.";
    $("lines").replaceChildren();if(payload.permissions.post)addLine();
    const saved=sessionStorage.getItem(storageKey());
    if(saved){
      pending=JSON.parse(saved);$("sale").hidden=true;$("preview").hidden=false;$("discard").hidden=true;
      $("quote").textContent="Предыдущий запрос мог сохраниться. Проверьте результат повторным запросом — повторного списания не будет.";
      $("post").textContent="Проверить результат продажи";
    }
    notice(payload.menu.length?"Готово. Проверьте продажу перед подтверждением.":"Добавьте позиции и цены в меню, чтобы ввести продажу.");
  }
  $("add-line").onclick=()=>{if(!busy&&$("lines").children.length<100){invalidate();addLine();}};
  $("lines").onclick=event=>{if(!busy&&event.target.closest("[data-remove]")){event.target.closest(".grid").remove();invalidate();}};
  $("sale").oninput=invalidate;
  $("sale").onsubmit=event=>{event.preventDefault();perform(async()=>{
    const command={id:crypto.randomUUID(),source:"MANUAL_GRID",...($("shift").value?{shiftId:$("shift").value}:{}),lines:[...$("lines").children].map((row,i)=>({id:"line-"+i,menuItemId:row.querySelector("[data-menu]").value,quantity:Number(row.querySelector("[data-quantity]").value)}))};
    const result=await request({action:"preview",command});quote={command,previewHash:result.previewHash};showQuote(result.event);notice("Данные ещё не сохранены.");
  });};
  $("discard").onclick=()=>{if(!busy&&!pending){invalidate();notice("Проверка отменена. Продажа не сохранена.");}};
  $("post").onclick=()=>perform(async()=>{
    const retrying=Boolean(pending);
    if(!pending){if(!quote)return;pending=quote;sessionStorage.setItem(storageKey(),JSON.stringify(pending));}
    $("discard").hidden=true;$("sale").hidden=true;
    let result;
    try {result=await request({action:"post",...pending});}
    catch(error){
      if(error.noWrite&&!retrying){sessionStorage.removeItem(storageKey());pending=undefined;quote=undefined;$("preview").hidden=true;$("sale").hidden=!payload.permissions.post;$("discard").hidden=false;}
      throw error;
    }
    sessionStorage.removeItem(storageKey());pending=undefined;quote=undefined;$("preview").hidden=true;$("discard").hidden=false;$("post").textContent="Подтвердить продажу";
    await load();notice(result.duplicate?"Продажа уже была обработана. Повторного списания нет.":"Продажа сохранена.");
  });
  $("open-shift").onsubmit=event=>{event.preventDefault();perform(async()=>{await request({action:"open_shift",shiftId:crypto.randomUUID(),name:$("shift-name").value.trim()});invalidate();await load();notice("Смена открыта.");});};
  $("shifts").onclick=event=>{const button=event.target.closest("[data-close]");if(button)perform(async()=>{await request({action:"close_shift",shiftId:button.dataset.close});invalidate();await load();notice("Смена закрыта.");});};
  $("events").onclick=event=>{const button=event.target.closest("[data-reverse]");if(button)perform(async()=>{await request({action:"reverse",eventId:button.dataset.reverse});invalidate();await load();notice("Продажа возвращена полностью.");});};
  window.addEventListener("storage",event=>{if(event.key==="bd_active_venue_id"){frozen=true;$("work").hidden=true;notice("Заведение изменилось. Обновите страницу.");}});
  perform(load);
})();
