import {holidayAutoSyncPaused} from './holiday-sync-control';
import {env}from'cloudflare:workers';
import {readCurrent,updateFromSource}from'./signed-feed/runtime.mjs';
import {validateHolidayFeed}from'./holiday-feed';
const KEY='calendar-sources/signed-holidays-v2/refresh.json',HOUR=3600000;
type State={lastAttempt?:number;lastSuccess?:number;leaseUntil?:number;error?:boolean};
type Config={source:{payloadUrl?:string;bundleUrl?:string;releaseFeed?:boolean};policy:Record<string,unknown>;root:Record<string,unknown>};
export function signedSourceConfig():Config|null{try{const raw=(env as unknown as {HOLIDAY_SIGNED_SOURCE?:string}).HOLIDAY_SIGNED_SOURCE;if(!raw)return null;const c=JSON.parse(raw);return (c?.source?.releaseFeed===true||(c?.source?.payloadUrl&&c?.source?.bundleUrl))&&c.policy&&c.root?c:null}catch{return null}}
function bucket(){const b=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!b)throw Error('SOURCE_STORAGE');return b}
export function signedSourceEnabled(){return Boolean(signedSourceConfig())}
async function policyId(){const bytes=new TextEncoder().encode(JSON.stringify(signedSourceConfig()?.policy));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')}
async function checkedCurrent(){
 const current=await readCurrent(bucket(),validateHolidayFeed);
 if(current&&current.checkpoint.policyId!==await policyId())throw Error('TRUST_POLICY_CHANGED');
 return current;
}
async function state(){const o=await bucket().get(KEY);return {o,s:o?JSON.parse(await o.text()) as State:{}}}
function due(s:State,now:number){return !(s.leaseUntil&&s.leaseUntil>now)&&!(s.lastAttempt&&s.lastAttempt>now-HOUR)&&!(s.lastSuccess&&s.lastSuccess>now-HOUR)}
export async function signedSourceStatus(now=Date.now()){
 if(!signedSourceConfig())return {enabled:false,due:false,error:false,revision:null as string|null};
 try{const current=await checkedCurrent(),{s}=await state();return {enabled:true,due:!holidayAutoSyncPaused()&&due(s,now),error:Boolean(s.error),revision:current?.checkpoint.digest??null,lastSuccess:s.lastSuccess??null};}
 catch{return {enabled:true,due:false,error:true,revision:null};}
}
export async function readSignedSource(){
 if(!signedSourceConfig())return null;
 try{const current=await checkedCurrent();if(!current)return null;const checkedAt=(await state()).s.lastSuccess??current.checkpoint.signedAt;
 return {feed:current.feed as Awaited<ReturnType<typeof validateHolidayFeed>>,revision:current.checkpoint.digest,checkedAt:new Date(checkedAt).toISOString()};}catch{return null}
}
export async function refreshSignedSource(now=Date.now()){
 if(holidayAutoSyncPaused())return {status:'disabled'};
 const c=signedSourceConfig();if(!c)return {status:'disabled'};
 const {o,s}=await state();if(s.leaseUntil&&s.leaseUntil>now)return {status:'busy'};if(!due(s,now))return {status:s.error?'failed':'not_due'};
 const lease={...s,lastAttempt:now,leaseUntil:now+120000};
 const claimed=await bucket().put(KEY,JSON.stringify(lease),{onlyIf:o?{etagMatches:o.etag}:{etagDoesNotMatch:'*'}});if(!claimed)return {status:'busy'};
 let status='failed';
 try{const result=await updateFromSource(bucket(),{...c,validate:validateHolidayFeed,now});status=result.status;}catch{}
 const after=await state();
 if(after.s.lastAttempt===now&&after.s.leaseUntil===lease.leaseUntil&&after.o){
  const next:State={lastAttempt:now,lastSuccess:status==='failed'?s.lastSuccess:now,error:status==='failed'};
  await bucket().put(KEY,JSON.stringify(next),{onlyIf:{etagMatches:after.o.etag}});
 }
 return {status};
}
