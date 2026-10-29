import {holidayAutoSyncPaused,HOLIDAY_SYNC_PAUSED_MESSAGE} from './holiday-sync-control';
import {signedSourceEnabled,signedSourceStatus,refreshSignedSource} from './holiday-signed-source';
import {holidayFeedEnabled} from './holiday-feed';
import {cancelUnsentHolidayStatements} from './holiday-notification-guard';
import {getD1} from '../../db';
import {readStoreSnapshots,runStoreCasBatch,StoreWriteConflictError} from './store-cas';
import {holidayCountry,loadFreeHolidays,freeHolidayRaw} from './free-holiday-calendar';
import {normaliseOpportunityCalendar,OPPORTUNITY_CALENDAR_KEY,type OpportunityCalendar} from './opportunity-calendar';
import {OPPORTUNITY_HORIZON_DAYS,opportunityVenueProfileSignature,type OpportunityVenueContext} from './opportunity-baseline';
export const HOLIDAY_SYNC_KEY='bd_holiday_sync_v1';
const WEEK=7*86400000,HOUR=3600000;
type State={lastAttempt?:string;lastSuccess?:string;leaseUntil?:string;error?:string;managedIds?:string[];feedRevision?:string};
function parse<T>(value:string|null|undefined,fallback:T):T{try{const parsed=value?JSON.parse(value):null;return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:fallback}catch{return fallback}}
export function holidayAutoSupported(country:unknown){return typeof country==='string'&&Boolean(holidayCountry(country))&&(['MD','DE'].includes(holidayCountry(country)??'')||holidayFeedEnabled());}
function text(value:unknown,limit=1500){return typeof value==='string'?value.trim().slice(0,limit):'';}
function retryBlocked(state:State,now:number){return Boolean(state.error)&&Date.parse(state.lastAttempt??'')>now-HOUR;}
function due(state:State,now:number){return !(Date.parse(state.leaseUntil??'')>now)&&!(Date.parse(state.lastAttempt??'')>now-HOUR)&&!(Date.parse(state.lastSuccess??'')>now-WEEK);}
export async function holidaySyncStatus(accountId:number,country:unknown){
 if(holidayAutoSyncPaused())return {supported:holidayAutoSupported(country),due:false,paused:true,message:HOLIDAY_SYNC_PAUSED_MESSAGE};
 if(!holidayAutoSupported(country))return {supported:false,due:false,message:'Автоматический источник для этой страны не подключён. Используется встроенный справочник 2026–2027.'};
 const rows=await readStoreSnapshots(getD1(),accountId,[HOLIDAY_SYNC_KEY]);const state=parse<State>(rows[0]?.dataJson,{});
 const signed=signedSourceEnabled()&&!['MD','DE'].includes(holidayCountry(text(country,120))??'')?await signedSourceStatus():null;
 const sourceChanged=Boolean(signed?.revision&&signed.revision!==state.feedRevision);
 return {supported:true,due:Date.parse(state.leaseUntil??'')>Date.now()||retryBlocked(state,Date.now())?false:signed?(signed.due||(!signed.error&&(sourceChanged||due(state,Date.now())))):due(state,Date.now()),lastSuccess:state.lastSuccess??null,lastChecked:signed?.lastSuccess?new Date(signed.lastSuccess).toISOString():state.lastSuccess??null,error:state.error??signed?.error??null,message:(state.error||signed?.error)?'Источник недоступен. Показан сохранённый календарь.':signed?'Справочник проверяется при открытии, не чаще раза в час.':'Источник проверяется при открытии, не чаще раза в неделю.'};
}
/** Authenticated per-venue update; no background dispatcher or notification delivery. */
export async function syncHolidayAccount(accountId:number,now=new Date()){
 if(holidayAutoSyncPaused())return {status:'disabled' as const};
 const db=getD1();
 const profile=await db.prepare("SELECT a.restaurant_json,v.id AS venue_id FROM accounts a JOIN venues v ON v.data_account_id=a.id WHERE a.id=? AND v.status='active'").bind(accountId).first<{restaurant_json:string;venue_id:number}>();
 if(!profile)return {status:'inactive' as const};
 const restaurant=parse<Record<string,unknown>>(profile.restaurant_json,{});const country=holidayCountry(text(restaurant.country,120));
 if(!country||!holidayAutoSupported(country))return {status:'static' as const};
 const snapshots=await readStoreSnapshots(db,accountId,[HOLIDAY_SYNC_KEY]);const state=parse<State>(snapshots[0]?.dataJson,{});
 const signed=signedSourceEnabled()&&!['MD','DE'].includes(country)?await signedSourceStatus(now.getTime()):null;
 const sourceChanged=Boolean(signed?.revision&&signed.revision!==state.feedRevision);
 if(Date.parse(state.leaseUntil??'')>now.getTime()||retryBlocked(state,now.getTime()))return {status:'not_due' as const};
 if(!signed?.due&&!sourceChanged&&!due(state,now.getTime()))return {status:'not_due' as const};
 const attempted=now.toISOString();const leased={...state,lastAttempt:attempted,leaseUntil:new Date(now.getTime()+120000).toISOString()};
 const put=(key:string,value:unknown)=>db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(accountId,key,JSON.stringify(value),attempted);
 try{await runStoreCasBatch(db,accountId,snapshots,[put(HOLIDAY_SYNC_KEY,leased)],attempted);}catch(e){if(e instanceof StoreWriteConflictError)return {status:'busy' as const};throw e;}
 try{
  if(signed){const refreshed=await refreshSignedSource(now.getTime());if(refreshed.status==='failed'||refreshed.status==='busy')throw Error('SIGNED_SOURCE_UNAVAILABLE');}
  const feedRevision=signed?(await signedSourceStatus(now.getTime())).revision:undefined;
  const start=attempted.slice(0,10),end=new Date(now.getTime()+OPPORTUNITY_HORIZON_DAYS*86400000).toISOString().slice(0,10);
  const data=await loadFreeHolidays(country,start,end);if(data.reserve)throw Error('SOURCE_UNAVAILABLE');
  const context:OpportunityVenueContext={venueName:text(restaurant.name,1500),businessType:text(restaurant.businessType,180),venueFormat:text(restaurant.venueFormat,240),city:text(restaurant.city,120),region:text(restaurant.region,120),country:text(restaurant.country,120),openTime:text(restaurant.openTime,20),closeTime:text(restaurant.closeTime,20),workingDays:restaurant.workingDays&&typeof restaurant.workingDays==='object'&&!Array.isArray(restaurant.workingDays)?restaurant.workingDays as Record<string,unknown>:null};
  if(!context.venueName)throw Error('PROFILE_INCOMPLETE');
  for(let attempt=0;attempt<3;attempt++){
   const currentProfile=await db.prepare('SELECT restaurant_json FROM accounts WHERE id=?').bind(accountId).first<{restaurant_json:string}>();
   if(currentProfile?.restaurant_json!==profile.restaurant_json)throw Error('PROFILE_CHANGED');
   const current=await readStoreSnapshots(db,accountId,[HOLIDAY_SYNC_KEY,OPPORTUNITY_CALENDAR_KEY]);
   const currentState=parse<State>(current.find(s=>s.key===HOLIDAY_SYNC_KEY)?.dataJson,{});
   if(currentState.leaseUntil!==leased.leaseUntil||currentState.lastAttempt!==attempted)return {status:'busy' as const};
   const previous=parse<OpportunityCalendar|null>(current.find(s=>s.key===OPPORTUNITY_CALENDAR_KEY)?.dataJson,null);
   if(previous&&previous.profileSignature!==opportunityVenueProfileSignature(context))throw Error('PROFILE_CHANGED');
   const seed=freeHolidayRaw(context,start,end,data,country);
   const next=normaliseOpportunityCalendar({raw:seed.raw,sources:seed.sources,previous,venueName:context.venueName,locationLabel:[text(restaurant.address,240),context.city,context.region,context.country].filter(Boolean).join(', '),windowStart:start,windowEnd:end,generatedAt:attempted,model:data.model,venueContext:context});
   const managedIds=next.events.filter(e=>e.sourceUrls.some(url=>url.includes("openholidaysapi.org")||data.rows.some(row=>row.source===url))).map(e=>e.id);
   if(previous){
    next.events=next.events.map(event=>{const old=previous.events.find(e=>e.id===event.id);return old?{...event,sourceScheduleChanged:old.sourceScheduleChanged || old.startDate!==event.startDate || old.activationDate!==event.activationDate,decision:old.decision,decisionUpdatedAt:old.decisionUpdatedAt,potentialScore:old.potentialScore,potentialLabel:old.potentialLabel,scoreBreakdown:old.scoreBreakdown,scoreReason:old.scoreReason,impact:old.impact,assessmentAvailable:old.assessmentAvailable,notificationPlan:old.notificationPlan}:event});
    for(const old of previous.events)if(!next.events.some(e=>e.id===old.id)&&!next.deletedEventIds?.includes(old.id)){
     const removed=(currentState.managedIds?.includes(old.id)||old.sourceUrls.some(url=>url.startsWith("https://openholidaysapi.org/")))&&old.startDate>=start&&old.startDate<=end;
     next.events.push(removed?{...old,sourceMissing:true,summary:'Дата отсутствует в последнем ответе справочника. Сохранена для проверки. '+old.summary.replace(/^Дата отсутствует в последнем ответе справочника\. Сохранена для проверки\. /,'')}:old);
    }
    next.notificationSummary=previous.notificationSummary;
    next.sources=[...next.sources,...previous.sources.filter(s=>!next.sources.some(n=>n.url===s.url))];
   }
   if('conflicts' in data && data.conflicts?.length)next.events=next.events.map(event=>data.conflicts.some(c=>c.name===event.title&&c.year===event.startDate.slice(0,4))?{...event,sourceMissing:true,summary:'Дата требует проверки: в справочнике указана другая дата. Сохранена прежняя дата и ваша отметка. '+event.summary.replace(/^Дата требует проверки: в справочнике указана другая дата\. Сохранена прежняя дата и ваша отметка\. /,'')}:event);
   const profileGuard=db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?, '__bd_holiday_profile_guard__', NULL, ? WHERE NOT EXISTS(SELECT 1 FROM accounts a JOIN venues v ON v.data_account_id=a.id WHERE a.id=? AND a.restaurant_json=? AND v.status='active')").bind(accountId,attempted,accountId,profile.restaurant_json);
   try{await runStoreCasBatch(db,accountId,current,[profileGuard,...cancelUnsentHolidayStatements(profile.venue_id,next.events.filter(event=>event.sourceMissing || event.sourceScheduleChanged).map(event=>event.id),attempted),put(OPPORTUNITY_CALENDAR_KEY,next),put(HOLIDAY_SYNC_KEY,{lastAttempt:attempted,lastSuccess:attempted,managedIds,...(feedRevision?{feedRevision}:{})})],attempted);return {status:'updated' as const};}catch(e){if(!(e instanceof StoreWriteConflictError)||attempt===2)throw e;}
  }
 }catch{
  const current=await readStoreSnapshots(db,accountId,[HOLIDAY_SYNC_KEY]);const latest=parse<State>(current[0]?.dataJson,{});
  if(latest.lastAttempt===attempted&&latest.leaseUntil===leased.leaseUntil){try{await runStoreCasBatch(db,accountId,current,[put(HOLIDAY_SYNC_KEY,{...state,lastAttempt:attempted,error:'Не удалось обновить источник. Сохранённые события не изменены.'})],attempted);}catch(e){if(!(e instanceof StoreWriteConflictError))throw e;}}
  return {status:'failed' as const};
 }
 return {status:'busy' as const};
}
