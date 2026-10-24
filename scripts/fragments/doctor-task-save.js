// The saved result is retried with stable IDs, independently of paid diagnosis.
var bdDoctorSaveFlights=new Map(),bdDoctorSaveMemory=new Map();
function bdDoctorSaveKey(){return 'bd_doctor_task_save_v1__'+bdStorageContext()}
function bdDoctorSaveRead(key=bdDoctorSaveKey()){try{return JSON.parse(localStorage.getItem(key)||'null')||bdDoctorSaveMemory.get(key)||null}catch{return bdDoctorSaveMemory.get(key)||null}}
function bdDoctorSaveNotify(){window.dispatchEvent(new Event('bd:doctor-save'))}
function bdDoctorSaveStore(key,value){bdDoctorSaveMemory.set(key,value);localStorage.setItem(key,JSON.stringify(value));bdDoctorSaveNotify()}
function bdDoctorSavePending(){return !!bdDoctorSaveRead()}
async function bdDoctorSaveRequest(url,options){const control=new AbortController(),timer=setTimeout(()=>control.abort(),10000);try{const response=await fetch(url,{...options,signal:control.signal}),body=await response.json();if(!response.ok||body.ok!==true)throw Error('Task save refused');return body.data??[]}finally{clearTimeout(timer)}}
function bdDoctorSaveRetry(onSuccess){
 const key=bdDoctorSaveKey();if(bdDoctorSaveFlights.has(key))return bdDoctorSaveFlights.get(key);
 const pending=bdDoctorSaveRead(key);if(!pending)return Promise.resolve(false);
 const context=bdStorageContext(),headers={...ca(Ot()),'X-Venue-Id':localStorage.getItem('bd_active_venue_id')||'','Content-Type':'application/json'};
 const run=(async()=>{try{
  for(const change of pending.changes){
   if(context!==bdStorageContext())throw Error('Context changed');
   const url='/api/store/'+encodeURIComponent(change.key),current=await bdDoctorSaveRequest(url,{headers});
   if(!Array.isArray(current))throw Error('Invalid task store');
   const merged=Wse(change.key,change.base,change.next,current);
   if(merged.conflicts.length)throw Error('Task conflict');
   const saved=JSON.stringify(merged.merged)===JSON.stringify(current)?current:await bdDoctorSaveRequest(url,{method:'PUT',headers,body:JSON.stringify({data:merged.merged,baseData:current})});
   if(context===bdStorageContext())Kse(change.key,saved);
  }
  localStorage.removeItem(key);bdDoctorSaveMemory.delete(key);
  if(context===bdStorageContext()&&onSuccess)onSuccess();return true;
 }catch{return false}finally{bdDoctorSaveFlights.delete(key);bdDoctorSaveNotify()}})();
 bdDoctorSaveFlights.set(key,run);bdDoctorSaveNotify();return run;
}
function bdDoctorQueueTasks(changes,onSuccess){const key=bdDoctorSaveKey();if(!bdDoctorSaveRead(key)){try{bdDoctorSaveStore(key,{changes})}catch{bdDoctorSaveNotify();return false}}void bdDoctorSaveRetry(onSuccess);return true}
function bdDoctorTaskSaveNotice(){const[,update]=S.useState(0);S.useEffect(()=>{const refresh=()=>update(v=>v+1);window.addEventListener('bd:doctor-save',refresh);const timer=setInterval(refresh,1000);return()=>{clearInterval(timer);window.removeEventListener('bd:doctor-save',refresh)}},[]);if(!bdDoctorSavePending())return null;const busy=bdDoctorSaveFlights.has(bdDoctorSaveKey());return i.jsxs('section',{'data-doctor-save-status':'',role:'status',className:'bd-ai-section',children:[i.jsx('p',{children:busy?'Сохраняю поручения…':'Поручения не сохранены'}),i.jsx('button',{type:'button',className:'bd-ai-secondary-action',disabled:busy,onClick:()=>{void bdDoctorSaveRetry()},children:busy?'Сохранение…':'Повторить сохранение'})]})}
