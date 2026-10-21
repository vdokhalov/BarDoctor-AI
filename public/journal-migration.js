(function () {
 'use strict';
 const el=id=>document.getElementById(id), actions=['prepare','step','abort','refresh'];
 const identity=()=>JSON.stringify([localStorage.getItem('bd_session'),localStorage.getItem('bd_session_token'),localStorage.getItem('bd_active_venue_id')]);
 const initialIdentity=identity(),venueId=Number(localStorage.getItem('bd_active_venue_id'));let state=null,busy=false,known=false;
 function check(){if(identity()!==initialIdentity||!Number.isSafeInteger(venueId)||venueId<1)throw Error('Контекст изменился. Вернитесь в настройки и выберите нужное заведение.');}
 function render(){
  el('controls').hidden=!known;el('status').disabled=busy;
  for(const action of actions)el(action).disabled=true;
  if(!known)return;
  const run=state.run,active=state.stock?.state==='active'||state.events?.state==='active';
  el('prepare').hidden=!!run;el('refresh').hidden=run?.phase!=='ABORTED';el('abort').hidden=!run||active||['COMPLETE','ABORTED'].includes(run.phase);el('step').hidden=!run||['COMPLETE','ABORTED'].includes(run.phase);
  el('confirmation-label').hidden=!!run&&run.phase!=='ABORTED';
  el('prepare').disabled=busy||!!run||!el('confirmation').checked;
  el('refresh').disabled=busy||run?.phase!=='ABORTED'||active||!el('confirmation').checked;
  el('abort').disabled=busy||!run||active||['COMPLETE','ABORTED'].includes(run.phase);
  el('step').disabled=busy||!run||['COMPLETE','ABORTED'].includes(run.phase);
  const pairs=[['Заведение',venueId],['Run ID',run?.run_id],['Резервная копия',run?.backup_key],['SHA-256',run?.backup_hash],['Фаза',run?.phase||'Не начат'],['Ревизия',run?.revision],['Запись приостановлена',run?String(run.paused):'—']];
  for(const [key,label] of [['stock','Склад'],['events','Продажи']]){const journal=state[key];pairs.push([label+' — состояние',journal?.state||'legacy'],[label+' — скопировано / источник',journal?journal.copied_count+' / '+journal.source_count:'—']);}
  el('details').replaceChildren();for(const [label,value] of pairs){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value==null?'—':String(value);el('details').append(dt,dd);}
  const ready=run?.phase==='COMPLETE'&&run.paused===0&&state.stock?.state==='active'&&state.events?.state==='active';
  el('readiness').textContent=ready?'Перенос завершён. Пауза снята. Можно продолжить работу.':'Запись во время паузы недоступна: перенос не подтверждён как завершённый.';
  el('log').replaceChildren();for(const row of state.log||[]){const li=document.createElement('li');li.textContent=[row.sequence,row.phase,row.created_at,row.detail].filter(x=>x!=null).join(' · ');el('log').append(li);}
 }
 async function request(action){
  if(busy)return;busy=true;render();el('notice').textContent='Проверяем состояние…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   check();const email=localStorage.getItem('bd_session'),token=localStorage.getItem('bd_session_token');const headers={'X-Venue-Id':String(venueId),'Content-Type':'application/json',...(email&&token?{'X-Session-Email':email,'X-Session-Token':token}:{})};
   const body=action?{venueId,confirmation:'JOURNAL_CUTOVER:'+venueId,action,...(state?.run?{runId:state.run.run_id}:{})}:undefined;
   const response=await fetch('/api/migration/journals',{method:action?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});
   const data=await response.json();check();
   if(!response.ok||!data.ok)throw Error(data.error||data.code||'Состояние не подтверждено.');
   if(data.scope?.venueId!==venueId||data.run&&data.run.venue_id!==venueId||data.stock&&data.stock.venue_id!==venueId||data.events&&data.events.venue_id!==venueId)throw Error('Контекст ответа не подтверждён.');
   state=data;known=true;el('confirmation').checked=false;el('notice').textContent=action?'Шаг выполнен. Состояние получено с сервера.':'Статус обновлён.';
  }catch(error){known=false;el('notice').textContent=(error.name==='AbortError'?'Ответ не получен вовремя.':error.message)+' Обновите статус перед продолжением. Не начинайте новый запуск после потери ответа.';}
  finally{clearTimeout(timer);busy=false;render();}
 }
 el('status').onclick=()=>request();el('confirmation').onchange=render;
 for(const action of actions)el(action).onclick=()=>{if(!el(action).disabled)request(action);};
 window.addEventListener('storage',()=>{if(identity()!==initialIdentity){known=false;render();el('notice').textContent='Контекст изменился. Вернитесь в настройки.';}});
 request();
})();
