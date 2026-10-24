import {loadCanonicalHealthInputs} from './canonical-health-inputs';
import {readStoreSnapshots,StoreWriteConflictError,type StoreSnapshot} from './store-cas';
import {FinancialReadPending} from './financial-read-progress';
import {hasPermission,type AuthenticatedAccount} from './access-control';
import {venueDate,venueTimeFromJson} from './venue-time';
import {getD1} from '../../db';
type Row=Record<string,unknown>;
export const closedHealthKey=(venueId:number)=>`__bd_closed_health_v1__:${venueId}`;
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export async function readClosedHealth(account:AuthenticatedAccount){
 const result=await getD1().prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').bind(account.id,closedHealthKey(account.venueId)).first<{data_json:string}>();
 if(!result)return null;
 try{const saved=JSON.parse(result.data_json);if(saved.venueId!==account.venueId||saved.accountId!==account.id||typeof saved.payload!=='string'||await digest(saved.payload)!==saved.hash)return null;return JSON.parse(saved.payload);}catch{return null;}
}
/** Preparation never writes business data. The caller commits these statements
 * in the same D1 batch as the closed report and idempotency receipt. */
export async function prepareClosedHealth(account:AuthenticatedAccount,next:Row,expected:StoreSnapshot[],now:string){
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
   const future=typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(Date.parse(r.date+'T00:00:00Z'))&&new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)===r.date;
   const emptySales=sales?.state==='AVAILABLE'&&Array.isArray(sales.data)&&!sales.data.some((event:Row)=>event.status==='POSTED'&&(event.revenueRowId===r.id||String(event.businessDate)>date));
   return !(future&&emptySales&&r.closingStatus==='closed'&&r.revenue===0&&r.receipts===0);
  }
  return r.closingStatus==='open';
 }))return null;
 const finance=candidate.intelligence.businessHealth.components.find(x=>x.id==='finance');
 if(finance?.score==null)return null;
 const key=closedHealthKey(account.venueId),saved=await readStoreSnapshots(db,account.id,[key]);
 const previous=saved[0].dataJson?JSON.parse(saved[0].dataJson):null;
 if(previous?.businessDate>date)return null;
 // Generation time is capture time, even for an overnight business date.
 candidate.intelligence.generatedAt=now;candidate.snapshot.generatedAt=now;
 const payload=JSON.stringify({success:true,generatedAt:now,context:{venueId:account.venueId,dataAccountId:account.id,version:candidate.context.version,sourceUpdatedAt:candidate.snapshot.dataFreshness.latestUpdatedAt},data:{contextVersion:candidate.context.version,intelligence:candidate.intelligence,businessHealth:candidate.intelligence.businessHealth,businessHealthSnapshot:{...candidate.snapshot,closedWorkdayCapture:true}}});
 if(new TextEncoder().encode(payload).length>750_000)return null;
 const value=JSON.stringify({version:1,accountId:account.id,venueId:account.venueId,businessDate:date,workdayId:next.id,workdayRevision:next.workdayRevision,capturedAt:now,hash:await digest(payload),payload});
 const profileGuard=db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_closed_health_profile_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?)").bind(account.id,account.id,candidate.profileJson);
 return {snapshots:[...candidate.sourceSnapshots,...saved],statements:[profileGuard,db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,key,value,now)]};
}
export {FinancialReadPending};
