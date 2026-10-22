import {accountingCurrencyFromProfile} from '../../../../lib/bardoctor/currency';
import {getD1} from '../../../../db';
import {authenticatedEvidenceContext} from '../../../../lib/bardoctor/evidence-resolver';
import {hasPermission} from '../../../../lib/bardoctor/access-control';
import {monthCloseRevision} from '../../../../lib/bardoctor/verified-month-close';
import {FINANCE_DOCUMENT_KEYS,financialContributors} from '../../../../lib/bardoctor/finance-documents';
import {boundedJournalPage} from '../../../../lib/bardoctor/stock-journal';
import {stockJournalMarker} from '../../../../lib/bardoctor/stock-storage';
import {journalMonth} from '../../../../lib/bardoctor/journal-period';
import {derivedInputBelongs} from '../../../../lib/bardoctor/derived-input-scope';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 const c=await authenticatedEvidenceContext(request);if(!c)return reply({ok:false},401);
 if(!hasPermission(c.account,'reports.view')||!hasPermission(c.account,'inventory.view'))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const params=new URL(request.url).searchParams;let context:any;
 try{context=JSON.parse(params.get('context')??'null');}catch{return reply({ok:false},422);}
 const kind=params.get('kind'),cursor=params.get('cursor')===null?null:Number(params.get('cursor'));
 if(!context||context.venueId!==c.venueId||context.workspaceId!==c.workspaceId)return reply({ok:false,code:'SCOPE_MISMATCH'},403);
 if(!['writeoffs','stock'].includes(String(kind))||cursor!==null&&(!Number.isSafeInteger(cursor)||kind==='writeoffs'&&cursor<0))return reply({ok:false},422);
 try{
 const period=journalMonth(context.month);if(!/^\d{4}-\d{2}-\d{2}$/.test(context.through)||context.through<period.start||context.through>=period.endExclusive||new Date(context.through).toISOString().slice(0,10)!==context.through)throw Error('INVALID_PERIOD');
 period.endExclusive=new Date(Date.parse(context.through+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const db=getD1();const read=async()=>Promise.all([db.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key IN (?,?)').bind(c.account.id,...FINANCE_DOCUMENT_KEYS).all<{store_key:string;data_json:string}>(),db.prepare('SELECT restaurant_json FROM accounts WHERE id=?').bind(c.account.id).first<{restaurant_json:string}>()]);
 const [source,profile]=await read();const raw=new Map(source.results.map(r=>[r.store_key,r.data_json]));if(accountingCurrencyFromProfile(JSON.parse(profile?.restaurant_json??'{}'))!==context.currency)return reply({ok:false,code:'SOURCES_CHANGED'},409);
 const valid=async(values:Map<string,string>,profileValue:string|null|undefined)=>Array.isArray(context.revisions)&&context.revisions.length===2&&(await monthCloseRevision(profileValue??null))===context.profileRevision&&(await Promise.all(FINANCE_DOCUMENT_KEYS.map(async key=>(await monthCloseRevision(values.get(key)??null))===context.revisions.find((r:any)=>r.key===key)?.revision))).every(Boolean);
 if(!await valid(raw,profile?.restaurant_json))return reply({ok:false,code:'SOURCES_CHANGED'},409);
 const value=JSON.parse(raw.get(kind==='stock'?'bd_stock_movements':'bd_finance_expenses')??'[]');let items:any[],next:number|null;
 if(kind==='stock'&&stockJournalMarker(value)){const page=await boundedJournalPage(db,{accountId:c.account.id,venueId:c.venueId},cursor,value.revision,2_000_000,period);items=page.items;next=page.next;}
 else{if(!Array.isArray(value))throw Error('INVALID_SOURCE');const offset=cursor??0;if(offset<0)throw Error('INVALID_CURSOR');items=value.slice(offset,offset+50);next=offset+50<value.length?offset+50:null;}
 const entries=financialContributors(items,String(kind),{...context,dataAccountId:c.account.id});
 for(const entry of entries){
  (entry as any).href=null;if(!entry.documentId)continue;
  const key=kind==='stock'?'bd_inventory_snapshots':'bd_inventory_writeoffs';
  const found=await db.prepare("SELECT j.value payload FROM domain_data d,json_each(d.data_json) j WHERE d.account_id=? AND d.store_key=? AND json_extract(j.value,'$.id')=? LIMIT 2").bind(c.account.id,key,entry.documentId).all<{payload:string}>();
  if(found.results.length!==1)continue;const doc=JSON.parse(found.results[0].payload);if(!derivedInputBelongs(doc,{venueId:c.venueId,workspaceId:c.workspaceId,dataAccountId:c.account.id}))continue;
  (entry as any).href='/warehouse?'+new URLSearchParams({venue:String(c.venueId),tab:kind==='stock'?'counts':'writeoffs',[kind==='stock'?'inventory':'writeoff']:entry.documentId});
 }
 const [after,profileAfter]=await read();if(!await valid(new Map(after.results.map(r=>[r.store_key,r.data_json])),profileAfter?.restaurant_json))return reply({ok:false,code:'SOURCES_CHANGED'},409);
 return reply({ok:true,venueId:c.venueId,month:context.month,kind,entries,next});
 }catch{return reply({ok:false,code:'DOCUMENTS_UNAVAILABLE'},422);}
}
