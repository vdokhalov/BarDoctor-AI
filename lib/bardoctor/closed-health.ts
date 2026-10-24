import {posMembershipGuard} from './pos-auth-guard';
import {derivedInputBelongs} from './derived-input-scope';
import {loadCanonicalHealthInputs} from './canonical-health-inputs';
import {readStoreSnapshots,runStoreCasBatch,storeCasGuard,StoreWriteConflictError,type StoreSnapshot} from './store-cas';
import {FinancialReadPending} from './financial-read-progress';
import {hasPermission,type AuthenticatedAccount} from './access-control';
import {venueDate,venueTimeFromJson} from './venue-time';
import {getD1} from '../../db';
type Row=Record<string,unknown>;
const validBusinessDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export const closedHealthKey=(venueId:number)=>`__bd_closed_health_v1__:${venueId}`;
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export async function readClosedHealth(account:AuthenticatedAccount){
 const result=await getD1().prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').bind(account.id,closedHealthKey(account.venueId)).first<{data_json:string}>();
 if(!result)return null;
 try{const saved=JSON.parse(result.data_json);if(saved.venueId!==account.venueId||saved.accountId!==account.id||typeof saved.payload!=='string'||await digest(saved.payload)!==saved.hash)return null;return JSON.parse(saved.payload);}catch{return null;}
}
/** Preparation never writes business data. The caller commits these statements
 * in the same D1 batch as the closed report and idempotency receipt. */
export async function prepareClosedHealth(account:AuthenticatedAccount,next:Row,expected:StoreSnapshot[],now:string,recalculated=false){
 const db=getD1();
 if(!hasPermission(account,'shifts.manage')||!hasPermission(account,'team.view'))return null;
 const timezone=venueTimeFromJson(account.restaurantJson).timezone,date=String(next.date);
 // Overnight workdays belong to their business date. This is a snapshot taken
 // now; do not seed history for arbitrary older reports from today's balances.
 const today=venueDate(now,timezone),yesterday=new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 if(date!==today&&date!==yesterday)return null;
 let cutoff=now;
 if(date!==today){let t=Date.parse(date+'T12:00:00Z');for(let i=0;i<3&&venueDate(new Date(t).toISOString(),timezone)!==date;i++)t+=venueDate(new Date(t).toISOString(),timezone)>date?-86400000:86400000;cutoff=new Date(t).toISOString();}
 const candidate=await loadCanonicalHealthInputs(account,cutoff,next);
 if(!candidate||candidate.restricted)return null;
 if(candidate.sourceSnapshots.some(x=>x.dataJson===null&&candidate.sources.some(source=>source.key===x.key&&source.state==='PARTIAL')))return null;
 for(const old of expected){const read=candidate.sourceSnapshots.find(x=>x.key===old.key);if(read&&(read.dataJson!==old.dataJson||read.updatedAt!==old.updatedAt))throw new StoreWriteConflictError();}
 const reports=candidate.sources.find(x=>x.key==='bd_operational_reports_v1')?.data;
 if(!Array.isArray(reports)||reports.some((r:Row)=>r.workdayStatus==='OPEN'))return null;
 const revenues=candidate.sources.find(x=>x.key==='bd_finance_revenue')?.data;
 const sales=candidate.sources.find(x=>x.key==='bd_sales_events_v1');
 if(!Array.isArray(revenues)||revenues.some((r:Row)=>{
  // A future, explicitly closed empty cash shift has no sales to capture.
  // Unknown/nonzero future activity must not be treated as a harmless test day:
  // its stock effects may already be reflected in current balances.
  if(String(r.date)>date){
   const future=validBusinessDate(r.date);
   const emptySales=sales?.state==='AVAILABLE'&&Array.isArray(sales.data)&&!sales.data.some((event:Row)=>event.status==='POSTED'&&(event.revenueRowId===r.id||String(event.businessDate)>date));
   return !(future&&emptySales&&r.closingStatus==='closed'&&r.revenue===0&&r.receipts===0);
  }
  return r.closingStatus==='open';
 }))return null;
 if(recalculated){
  // Current stock balances cannot be rewound past future movements. A partial
  // journal cannot prove that later activity is absent either.
  const movements=candidate.sources.find(x=>x.key==='bd_stock_movements');
  if(movements?.state!=='AVAILABLE'||!Array.isArray(movements.data)||movements.data.some((row:Row)=>!validBusinessDate(String(row.businessDate??row.date).slice(0,10))||String(row.businessDate??row.date).slice(0,10)>date))return null;
  if(sales?.state!=='AVAILABLE'||!Array.isArray(sales.data)||sales.data.some((row:Row)=>row.status==='POSTED'&&(!validBusinessDate(row.businessDate)||row.businessDate>date)))return null;
  if(revenues.some((row:Row)=>row.revenueSource==='sales_events_v1'&&String(row.date)<=date&&row.closingStatus!=='closed'))return null;
 }
 const finance=candidate.intelligence.businessHealth.components.find(x=>x.id==='finance');
 if(finance?.score==null)return null;
 const key=closedHealthKey(account.venueId),saved=await readStoreSnapshots(db,account.id,[key]);
 const previous=saved[0].dataJson?JSON.parse(saved[0].dataJson):null;
 if(previous?.businessDate>date)return null;
 // Generation time is capture time, even for an overnight business date.
 candidate.intelligence.generatedAt=now;candidate.snapshot.generatedAt=now;
 const payload=JSON.stringify({success:true,generatedAt:now,context:{venueId:account.venueId,dataAccountId:account.id,version:candidate.context.version,sourceUpdatedAt:candidate.snapshot.dataFreshness.latestUpdatedAt},data:{contextVersion:candidate.context.version,intelligence:candidate.intelligence,businessHealth:candidate.intelligence.businessHealth,businessHealthSnapshot:{...candidate.snapshot,closedWorkdayCapture:true,captureMode:recalculated?'RECALCULATED_CLOSED_PERIOD':'AT_CLOSE',closedWorkdayId:next.id,closedWorkdayDate:date,closedWorkdayClosedAt:next.workdayClosedAt??null}}});
 if(new TextEncoder().encode(payload).length>750_000)return null;
 const value=JSON.stringify({version:1,accountId:account.id,venueId:account.venueId,businessDate:date,workdayId:next.id,workdayRevision:next.workdayRevision,capturedAt:now,captureMode:recalculated?'RECALCULATED_CLOSED_PERIOD':'AT_CLOSE',hash:await digest(payload),payload});
 const profileGuard=db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_closed_health_profile_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?)").bind(account.id,account.id,candidate.profileJson);
 return {snapshots:[...candidate.sourceSnapshots,...saved],statements:[profileGuard,db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,key,value,now)]};
}
export {FinancialReadPending};

/** Repair only the derived capture. Never replay a close, or reconstruct a
 * historical timestamp from current balances. Open activity prevents recovery. */
export async function refreshClosedHealth(account:AuthenticatedAccount,now=new Date().toISOString()){
 const saved=await readClosedHealth(account);
 const retain=(_reason:string)=>saved;
 if(!hasPermission(account,'analysis.run')||!hasPermission(account,'shifts.manage')||!hasPermission(account,'team.view'))return retain('ACCESS_LIMIT');
 try{
  const db=getD1(),key=closedHealthKey(account.venueId);
  const before=await readStoreSnapshots(db,account.id,['bd_operational_reports_v1',key]);
  const raw=JSON.parse(before[0].dataJson??'null');
  if(!Array.isArray(raw)||raw.some(row=>!row||typeof row!=='object'))return retain('WORKDAYS_UNAVAILABLE');
  const rows=raw.filter(row=>derivedInputBelongs(row,{venueId:account.venueId,dataAccountId:account.id}));
  if(rows.some(row=>row.workdayStatus==='OPEN'))return retain('OPEN_WORKDAY');
  const timezone=venueTimeFromJson(account.restaurantJson).timezone,today=venueDate(now,timezone);
  const eligible=rows.filter(row=>row.workdayStatus==='CLOSED'&&validBusinessDate(row.date)&&row.date<=today&&Number.isFinite(Date.parse(row.workdayClosedAt))&&Date.parse(row.workdayClosedAt)<=Date.parse(now)&&venueDate(row.workdayClosedAt,timezone)>=row.date);
  eligible.sort((a,b)=>b.date.localeCompare(a.date)||Number(b.workdaySequence||1)-Number(a.workdaySequence||1)||Date.parse(b.workdayClosedAt)-Date.parse(a.workdayClosedAt));
  const latest=eligible[0];if(!latest)return retain('NO_ELIGIBLE_CLOSED_WORKDAY');
  const previous=before[1].dataJson?JSON.parse(before[1].dataJson):null;
  if(saved&&previous?.workdayId===latest.id&&previous.workdayRevision===latest.workdayRevision)return saved;
  const prepared=await prepareClosedHealth(account,latest,before,now,true);
  if(!prepared)return retain('CLOSED_PERIOD_NOT_PROVEN');
  const captured=prepared.snapshots.find(row=>row.key===key);
  if(captured?.dataJson!==before[1].dataJson||captured?.updatedAt!==before[1].updatedAt)throw new StoreWriteConflictError();
  const guards=[];for(let offset=0;offset<prepared.snapshots.length;offset+=16)guards.push(storeCasGuard(db,account.id,prepared.snapshots.slice(offset,offset+16),now));
  await runStoreCasBatch(db,account.id,[],[posMembershipGuard(db,account,now),...guards,...prepared.statements],now);
  return await readClosedHealth(account);
 }catch(error){
  if(error instanceof StoreWriteConflictError)return await readClosedHealth(account)??retain('SOURCE_CHANGED');
  if(saved)return retain(error instanceof FinancialReadPending?'PREPARATION_PENDING':'REFRESH_FAILED');
  throw error;
 }
}
