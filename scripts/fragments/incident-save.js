// Explicit incident save. No provider calls and no background retry on mount.
var bdIncidentSaveFlights=new Map();
function bdIncidentScope(){return JSON.stringify([Ot(),localStorage.getItem('bd_active_venue_id')])}
function bdIncidentDraftKey(category){return 'bd_incident_draft_v1:'+bdIncidentScope()+':'+category}
function bdIncidentDraftRead(key){try{return JSON.parse(sessionStorage.getItem(key)||'null')||{}}catch{return {}}}
async function bdIncidentRequest(headers,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch('/api/store/bd_events',{...options,headers,signal:controller.signal}),body=await response.json();if(!response.ok||body.ok!==true)throw Error('Сохранение не подтверждено. Повторите сохранение.');if(body.data!=null&&!Array.isArray(body.data))throw Error('Не удалось проверить сохранение.');return body.data??[]}finally{clearTimeout(timer)}
}
function bdIncidentSave(event,scope){
 const key=scope+':'+event.id;if(bdIncidentSaveFlights.has(key))return bdIncidentSaveFlights.get(key);
 const run=(async()=>{
  if(scope!==bdIncidentScope()||!Ot())throw Error('Заведение или аккаунт изменились. Откройте форму заново.');
  const headers={...ca(Ot()),'X-Venue-Id':localStorage.getItem('bd_active_venue_id')||'','Content-Type':'application/json'};
  const current=await bdIncidentRequest(headers);
  if(scope!==bdIncidentScope())throw Error('Заведение или аккаунт изменились.');
  const existing=current.find(row=>row.id===event.id);
  if(existing){if(JSON.stringify(existing)!==JSON.stringify(event))throw Error('Запись уже сохранена с другими данными. Проверьте список событий.');return current}
  const saved=await bdIncidentRequest(headers,{method:'PUT',body:JSON.stringify({data:[event,...current],baseData:current})});
  if(!saved.some(row=>row.id===event.id))throw Error('Сервер не подтвердил сохранение.');
  return saved;
 })().finally(()=>bdIncidentSaveFlights.delete(key));bdIncidentSaveFlights.set(key,run);return run;
}
