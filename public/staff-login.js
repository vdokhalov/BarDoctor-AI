(()=>{
 const form=document.getElementById('pin-form'),input=document.getElementById('pin'),message=document.getElementById('message');
 document.getElementById('manager').onclick=async()=>{const response=await fetch('/api/staff-pin/session',{method:'DELETE'});if(response.ok){localStorage.setItem('bd_pos_identity',crypto.randomUUID());location.replace('/login');}else message.textContent='Выход не подтверждён. Повторите.';};
 const enter=()=>{localStorage.setItem('bd_pos_identity',crypto.randomUUID());location.replace('/cashier?embedded=1');};
 fetch('/api/staff-pin/session',{cache:'no-store'}).then(r=>{if(r.ok)enter();}).catch(()=>{});
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;message.textContent='Проверяем PIN…';
 try{const response=await fetch('/api/staff-pin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:input.value})});input.value='';const result=await response.json();if(!response.ok)throw Error(result.error||'Вход не выполнен');
 // Clear managerial UI context; session credentials never enter localStorage.
 for(const key of ['bd_session','bd_session_token','bd_session_userid','bd_active_role','bd_active_venue_id'])localStorage.removeItem(key);
 localStorage.setItem('bd_active_venue_id',String(result.venueId));enter();
 }catch(error){message.textContent=error.message||'Нет связи. Повторите вход.';}finally{button.disabled=false;}});
})();
