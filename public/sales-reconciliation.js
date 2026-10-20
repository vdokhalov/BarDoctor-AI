(function(){
 'use strict';
 const el=id=>document.getElementById('reconciliation-'+id),venue=localStorage.getItem('bd_active_venue_id');
 let selection=null,command=null,preview=null,busy=false,uncertain=false,downloaded=false;
 const message=text=>{el('status').textContent=text;};
 async function request(body,query=''){
  if(venue!==localStorage.getItem('bd_active_venue_id'))throw new Error('Заведение изменилось. Откройте страницу заново.');
  const response=await fetch('/api/sales-reconciliation'+query,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')||'','X-Session-Token':localStorage.getItem('bd_session_token')||'','X-Venue-Id':venue||''},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw new Error('Сервер вернул пустой или некорректный ответ (HTTP '+response.status+'). Запрос автоматически не повторяется');}if(!response.ok||!data.ok)throw new Error(data.code||'Не удалось проверить данные');return data;
 }
 function invalidate(){if(busy||uncertain)return;preview=null;command=null;downloaded=false;el('preview').hidden=true;el('backup-saved').checked=false;el('apply').disabled=true;}
 el('form').addEventListener('input',event=>{invalidate();if(event.target===el('from')||event.target===el('to')){selection=null;el('selection').replaceChildren();}});
 function lock(value){busy=value;el('form').querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=value||uncertain);el('apply').disabled=value||!preview||!downloaded||!el('backup-saved').checked;}
 function summaryLine(text,parent){const p=document.createElement('p');p.textContent=text;parent.append(p);}
 el('load').onclick=async()=>{
  if(busy||uncertain)return;invalidate();lock(true);
  try{selection=await request(null,'?from='+encodeURIComponent(el('from').value)+'&to='+encodeURIComponent(el('to').value));const host=el('selection');host.replaceChildren();
   selection.revenues.forEach(r=>{const field=document.createElement('fieldset');field.dataset.revenueId=r.id;
    const legend=document.createElement('legend');legend.textContent=r.date+' · '+r.revenue+' '+selection.currency+' · '+r.receipts+' чеков';field.append(legend);
    selection.batches.filter(b=>b.date===r.date).forEach(b=>{const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=b.id;label.append(check,document.createTextNode('Партия '+b.id+' · себестоимость '+b.cost+' '+selection.currency));field.append(label);
     summaryLine(b.lines.map(l=>(l.name||l.menuItemId)+' × '+l.quantity+' '+(l.unit||'')).join('; '),field);});host.append(field);});
   message(selection.revenues.length?'Выберите партии и укажите основание сверки.':'В выбранном периоде нет несверенных старых итогов.');
  }catch(e){selection=null;el('selection').replaceChildren();message(e.message);}finally{lock(false);}
 };
 el('form').onsubmit=async event=>{
  event.preventDefault();if(busy||uncertain||!selection)return;lock(true);
  try{const mappings=Array.from(el('selection').querySelectorAll('fieldset')).map(f=>({revenueId:f.dataset.revenueId,batchIds:Array.from(f.querySelectorAll('input:checked')).map(c=>c.value)})).filter(m=>m.batchIds.length);
   command={venueId:selection.venueId,workspaceId:selection.workspaceId,dataAccountId:selection.dataAccountId,operationId:crypto.randomUUID(),mappings,evidence:{kind:el('kind').value,reference:el('reference').value.trim(),method:el('method').value.trim(),completeCoverage:el('coverage').checked,historicalPricesAvailable:el('prices').checked}};
   preview=await request({...command,action:'preview'});const host=el('summary');host.replaceChildren();preview.summary.forEach(s=>{summaryLine(s.date+': выручка '+s.revenue+', '+s.receipts+' чеков → связанная себестоимость '+s.cost+' '+s.currency,host);s.batches.forEach(b=>summaryLine(b.lines.map(l=>(l.name||l.menuItemId)+' × '+l.quantity+' = '+l.cost).join('; '),host));});
   el('preview').hidden=false;downloaded=false;el('backup-saved').checked=false;message('Проверка готова. Скачайте копию исходных данных и проверьте результат перед подтверждением.');
  }catch(e){preview=null;message(e.message+(command?' · Операция '+command.operationId:''));}finally{lock(false);}
 };
 el('backup').onclick=()=>{if(!preview)return;const url=URL.createObjectURL(new Blob([JSON.stringify(preview,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sales-reconciliation-'+command.operationId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);downloaded=true;};
 el('backup-saved').onchange=()=>lock(busy);
 el('apply').onclick=async()=>{
  if(busy||!preview||!downloaded||!el('backup-saved').checked)return;lock(true);
  try{
   // An interrupted response must be resolved by status before any retry.
   if(uncertain){const status=await request({action:'status',venueId:command.venueId,operationId:command.operationId});if(status.state==='APPLIED'){uncertain=false;message('Связь уже сохранена. Повторного списания нет.');preview=null;el('preview').hidden=true;el('selection').replaceChildren();selection=null;return;}uncertain=false;message('Операция не выполнена. Проверьте исходные данные заново.');preview=null;el('preview').hidden=true;return;}
   uncertain=true;
   await request({...command,action:'apply',previewRevision:preview.previewRevision,backupRevision:preview.backupRevision,backupSaved:true,confirmCoverage:true});
   uncertain=false;preview=null;el('preview').hidden=true;message('Связь сохранена. Выручка, чеки и склад не изменены.');el('selection').replaceChildren();selection=null;
  }catch(e){message('Результат требует проверки: '+e.message+'. Нажмите «Проверить результат операции».');}
  finally{el('apply').textContent=uncertain?'Проверить результат операции':'Подтвердить связь';lock(false);}
 };
})();
