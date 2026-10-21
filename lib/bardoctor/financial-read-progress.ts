import {resolveAccountingMoney} from './accounting-money';
/** Resumable verification of captured journals, not an accounting ledger.
 * Each call verifies at most one bounded journal page. Intermediate rows never
 * establish a financial result; original source CAS and scope guard every step. */
import {financialEventPage} from './sales-event-storage';
import {boundedJournalPage,journalPosition} from './stock-journal';
import {stockScope} from './stock-storage';
import {derivedInputBelongs} from './derived-input-scope';
import {runStoreCasBatch,StoreWriteConflictError,type StoreSnapshot} from './store-cas';
import {capturedBatchCost,historicalPeriodCost,reconciledLegacyRowCost,salesDocumentRowCost} from './financial-reconciliation';
import {stableSalesValue} from './sales-events';
import {bindFinancialEventCount,verifiedPeriodCost} from './financial-period-proof';
import {type JournalPeriod,belongsToJournalPeriod} from './journal-period';

type Row=Record<string,any>;
type Scope={venueId:number;workspaceId:number;dataAccountId:number};
type Job={progress_json:string|null;result_json:string|null;result_hash:string|null;id:string;phase:'EVENTS'|'STOCK'|'READY';cursor:number|null;revision:number};
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()&&Number.isFinite(Number(value))?Number(value):null;
const row=(v:any):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const round=(v:number)=>Math.round(v*100)/100;
const currency=(v:unknown)=>String(v??'').trim().toUpperCase();
const records=(v:unknown):Row[]=>Array.isArray(v)?v:[];
const active=(v:Row)=>v.status!=='cancelled'&&!v.reversedAt;
const required=(condition:unknown)=>{if(!condition)throw Error('FINANCIAL_READ_NEEDS_REVIEW');};
export type FinancialReadInput={scope:Scope;period:JournalPeriod;currency:string;profileJson:string|null;snapshots:StoreSnapshot[];stores:Record<string,Row[]>;accessGuard?:D1PreparedStatement};
function boundary(db:D1Database,input:FinancialReadInput){const s=input.scope;return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__financial_read_scope_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM venues v JOIN accounts a ON a.id=v.data_account_id WHERE v.id=? AND v.workspace_id=? AND v.data_account_id=? AND v.status='active' AND a.restaurant_json IS ?)`).bind(s.dataAccountId,s.venueId,s.workspaceId,s.dataAccountId,input.profileJson);}
function guard(db:D1Database,job:Job){return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT 0,'__financial_read_progress_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM financial_read_jobs WHERE id=? AND revision=? AND phase=? AND cursor IS ?)`).bind(job.id,job.revision,job.phase,job.cursor);}
function selected(input:FinancialReadInput,values:Row[]){return values.filter(value=>belongsToJournalPeriod(value.businessDate??value.date,input.period));}

const SOURCE_KEYS=['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents','bd_sales_batches','bd_sales_reconciliations_v1','bd_stock_movements','bd_inventory_snapshots','bd_finance_expenses','bd_payroll_entries','bd_purchase_documents','bd_finance_settings','bd_finance_gap_reasons','bd_inventory_writeoffs','bd_opening_stock_v1'];
function normalizedInput(input:FinancialReadInput):FinancialReadInput{return {...input,snapshots:SOURCE_KEYS.map(key=>input.snapshots.find(s=>s.key===key)??{key,dataJson:null,updatedAt:null})};}
async function sourceId(input:FinancialReadInput){return hash(stableSalesValue({scope:input.scope,period:input.period,currency:input.currency,profile:input.profileJson,snapshots:input.snapshots}));}
export async function financialReadExists(db:D1Database,input:FinancialReadInput){return Boolean(await db.prepare('SELECT id FROM financial_read_jobs WHERE id=? AND account_id=? AND venue_id=?').bind(await sourceId(normalizedInput(input)),input.scope.dataAccountId,input.scope.venueId).first());}
export async function continueFinancialRead(db:D1Database,input:FinancialReadInput){
 let result=await advanceFinancialRead(db,input);
 for(let i=1;i<4&&result.pending;i++)result=await advanceFinancialRead(db,input);
 return result;
}
export async function advanceFinancialRead(db:D1Database,input:FinancialReadInput){
 input=normalizedInput(input);
 const {scope,period,snapshots}=input,accountId=scope.dataAccountId;
 const sourceRevision=await sourceId(input);
 const id=sourceRevision;
 let job=await db.prepare('SELECT id,phase,cursor,revision,result_json,result_hash,progress_json FROM financial_read_jobs WHERE id=? AND account_id=? AND venue_id=?').bind(id,accountId,scope.venueId).first<Job>();
 if(!job){
  const now=new Date().toISOString();
  await runStoreCasBatch(db,accountId,snapshots,[boundary(db,input),...(input.accessGuard?[input.accessGuard]:[]),db.prepare(`INSERT INTO financial_read_jobs(id,account_id,venue_id,source_revision,start_date,end_exclusive,phase,created_at,updated_at) VALUES(?,?,?,?,?,?,'EVENTS',?,?) ON CONFLICT(id) DO NOTHING`).bind(id,accountId,scope.venueId,sourceRevision,period.start,period.endExclusive,now,now)],now);
  job=await db.prepare('SELECT id,phase,cursor,revision,result_json,result_hash,progress_json FROM financial_read_jobs WHERE id=?').bind(id).first<Job>();required(job);
 }
 const current=job!;
 const stale=await db.prepare('SELECT id FROM financial_read_jobs WHERE account_id=? AND venue_id=? AND start_date=? AND end_exclusive=? AND id<>? ORDER BY created_at LIMIT 1').bind(accountId,scope.venueId,period.start,period.endExclusive,id).first<{id:string}>();
 if(stale)await runStoreCasBatch(db,accountId,snapshots,[boundary(db,input),...(input.accessGuard?[input.accessGuard]:[]),...cleanupPage(db,stale.id),db.prepare('DELETE FROM financial_read_jobs WHERE id=? AND NOT EXISTS(SELECT 1 FROM financial_read_events WHERE job_id=?) AND NOT EXISTS(SELECT 1 FROM financial_read_movements WHERE job_id=?)').bind(stale.id,stale.id,stale.id)],new Date().toISOString());
 if(current.phase==='READY'){
  const result=await finishFinancialRead(db,input,current);
  const remaining=await db.prepare('SELECT 1 FROM financial_read_events WHERE job_id=? UNION ALL SELECT 1 FROM financial_read_movements WHERE job_id=? LIMIT 1').bind(id,id).first();
  // Finish bounded scratch cleanup before the client stops continuation.
  if(remaining)return {pending:true as const,id,phase:current.phase,revision:current.revision+1};
  return {pending:false as const,id,...result};
 }
 const raw=(key:string)=>snapshots.find(s=>s.key===key)?.dataJson;
 const journal=await stockScope(db,accountId);required(journal.venueId===scope.venueId);
 const writes:D1PreparedStatement[]=[];let next:number|null=null;
 const aggregate:Aggregate=current.progress_json?JSON.parse(current.progress_json):{summaries:[],costRows:{},adjustments:{},reasons:[]};
 const note=(reason:string)=>{if(!aggregate.reasons.includes(reason))aggregate.reasons.push(reason);};
 const legacy=legacyReferences(input);
 const day=aggregate.day??period.start, tomorrow=new Date(Date.parse(day)+86400000).toISOString().slice(0,10);
 const pagePeriod={start:day,endExclusive:tomorrow};
 if(current.phase==='EVENTS'){
  const source=raw('bd_sales_events_v1');required(source&&!Array.isArray(JSON.parse(source)));
  const page=await financialEventPage(db,accountId,source!,scope,pagePeriod,current.cursor);next=page.next;
  const revenues=selected(input,records(input.stores.bd_finance_revenue));
  const existing=(await db.prepare("SELECT DISTINCT batch_id FROM financial_read_events WHERE job_id=? AND linked=1 AND status='POSTED' AND cost IS NOT NULL AND batch_id IN (SELECT value FROM json_each(?))").bind(id,JSON.stringify(page.items.map(e=>e.batch.id))).all<{batch_id:string}>()).results;
  const seen=new Set(existing.map(e=>e.batch_id));
  for(const event of page.items){
   const e=event as unknown as Row;required(derivedInputBelongs(e,scope));
   const cost=e.status==='POSTED'?currency(e.currency)!==currency(input.currency)?{known:false,cost:null,reason:'HISTORICAL_SALES_COST_UNKNOWN'}:capturedBatchCost(e.batch,scope.venueId,e.businessDate,input.currency):{known:true,cost:0};
   const linked=revenues.some(r=>r.id===e.revenueRowId&&r.revenueSource==='sales_events_v1');
   accumulateEvent(aggregate,e,input.currency);
   if(!linked)note('SALES_REVENUE_HISTORY_MISMATCH');
   if(linked&&e.status==='POSTED'){
    if(!cost.known)note('reason' in cost?String(cost.reason):'HISTORICAL_SALES_COST_UNKNOWN');
    else if(seen.has(String(e.batch.id))||legacy.used.has(String(e.batch.id)))note('SALES_BATCH_REFERENCED_TWICE');
    else {aggregate.costRows[e.businessDate]=(aggregate.costRows[e.businessDate]??0)+Number(cost.cost);seen.add(String(e.batch.id));}
   }
   writes.push(db.prepare(`INSERT INTO financial_read_events(job_id,event_id,batch_id,revenue_id,business_date,status,currency,source,revenue,accounting_revenue,cost,cost_reason,linked,accepted_at,payments_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,e.id,String(row(e.batch).id??''),e.revenueRowId,e.businessDate,e.status,e.currency??null,e.source??null,finite(e.revenue),resolveAccountingMoney({value:e,originalAmount:e.revenue,originalCurrency:e.currency??input.currency,accountingCurrency:input.currency})?.accountingAmount??null,cost.known?cost.cost:null,'reason' in cost?cost.reason:null,linked?1:0,e.acceptedAt??null,JSON.stringify(records(e.payments))));
  }
 }else{
  const source=raw('bd_stock_movements'),marker=source&&JSON.parse(source);required(marker&&!Array.isArray(marker));
  const page=await boundedJournalPage(db,journal,current.cursor,marker.revision,2_000_000,pagePeriod);next=page.next;
  const eventReferences=(await db.prepare("SELECT DISTINCT batch_id FROM financial_read_events WHERE job_id=? AND batch_id IN (SELECT value FROM json_each(?)) AND (status='REVERSED' OR status='POSTED' AND linked=1)").bind(id,JSON.stringify(page.items.map(m=>m.salesBatchId??''))).all<{batch_id:string}>()).results;
  const references=new Set([...legacy.referenced,...legacy.reversed,...eventReferences.map(e=>e.batch_id)]);
  const existingMovements=(await db.prepare("SELECT DISTINCT movement_id FROM financial_read_movements WHERE job_id=? AND kind='inventory_adjustment' AND movement_id IN (SELECT value FROM json_each(?))").bind(id,JSON.stringify(page.items.filter(m=>m.type==='inventory_adjustment').map(m=>m.id??null))).all<{movement_id:string}>()).results;
  const movementIds=new Set(existingMovements.map(m=>m.movement_id));
  for(const movement of page.items){
   const m=movement as Row;required(derivedInputBelongs(m,scope)&&belongsToJournalPeriod(m.businessDate??m.date,period));
   const amount=finite(m.costAmount),known=amount!==null&&m.valuationStatus!=='unvalued'&&m.costStatus!=='UNKNOWN'&&(amount!==0||['KNOWN_ZERO','KNOWN'].includes(m.costStatus))&&currency(m.currency)===currency(input.currency);
   if(m.type==='sale_consumption'&&active(m)&&!references.has(String(m.salesBatchId??'')))note('UNLINKED_SALES_CONSUMPTION');
   if(m.type==='inventory_adjustment'){
    if(movementIds.has(m.id))note('DUPLICATE_FINANCIAL_HISTORY');movementIds.add(m.id);
    if(active(m)){
     if(!known)note('INVENTORY_ADJUSTMENT_COST_UNKNOWN');
     else {const date=String(m.businessDate??m.date).slice(0,10);aggregate.adjustments[date]=(aggregate.adjustments[date]??0)+Number(amount);}
    }
   }
   writes.push(db.prepare('INSERT INTO financial_read_movements(job_id,position,movement_id,batch_id,business_date,kind,active,amount,known) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,journalPosition(m),m.id??null,m.salesBatchId??null,String(m.businessDate??m.date).slice(0,10),m.type??null,active(m)?1:0,amount,known?1:0));
  }
 }
 const moreDays=next===null&&tomorrow<period.endExclusive;
 const phase=next!==null||moreDays?current.phase:current.phase==='EVENTS'?'STOCK':'READY';
 aggregate.day=next!==null?day:moreDays?tomorrow:period.start;
 // The accumulator grows with recorded shift/day/source groups, never with
 // receipt or movement count. Each page contributes once in the cursor CAS.
 const progressJson=JSON.stringify(aggregate);
 required(aggregate.summaries.length<=Math.max(1,records(input.stores.bd_finance_revenue).length)*31*12);
 writes.push(db.prepare('UPDATE financial_read_jobs SET phase=?,cursor=?,progress_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(phase,next,progressJson,new Date().toISOString(),id,current.revision));
 await runStoreCasBatch(db,accountId,snapshots,[boundary(db,input),...(input.accessGuard?[input.accessGuard]:[]),guard(db,current),...writes],new Date().toISOString());
 // Never return partial operands as a complete report, even on the final page.
 return {pending:true as const,id,phase,revision:current.revision+1};
}

async function finishFinancialRead(db:D1Database,input:FinancialReadInput,job:Job){
 if(job.result_json){required(await hash(job.result_json)===job.result_hash);await runStoreCasBatch(db,input.scope.dataAccountId,input.snapshots,[boundary(db,input),...(input.accessGuard?[input.accessGuard]:[]),guard(db,job),...cleanupPage(db,job.id),db.prepare('UPDATE financial_read_jobs SET revision=revision+1 WHERE id=? AND revision=?').bind(job.id,job.revision)],new Date().toISOString());return restoreResult(JSON.parse(job.result_json),input.period.start.slice(0,7));}
 const {scope,period,stores}=input,id=job.id,monthKey=period.start.slice(0,7),cur=currency(input.currency);
 const revenues=selected(input,records(stores.bd_finance_revenue));
 const batches=selected(input,records(stores.bd_sales_batches));
 const documents=records(stores.bd_sales_documents),reconciliations=records(stores.bd_sales_reconciliations_v1);
 const {referenced,used,reversed}=legacyReferences(input);
 const eventRefs=(await db.prepare(`SELECT DISTINCT batch_id FROM financial_read_events WHERE job_id=? AND linked=1 AND status='POSTED' AND batch_id IN (SELECT value FROM json_each(?))`).bind(id,JSON.stringify(batches.map(b=>b.id))).all<{batch_id:string}>()).results;
 const eventRefSet=new Set(eventRefs.map(r=>r.batch_id));
 const base=historicalPeriodCost({venueId:scope.venueId,monthKey,accountingCurrency:cur,revenues,events:[],movements:[],documents,batches,reconciliations});
 const reasons=new Set(base.reasons.filter(reason=>!['SALES_REVENUE_HISTORY_MISMATCH','UNLINKED_SALES_CONSUMPTION'].includes(reason)));
 if(batches.some(b=>(b.status==='POSTED'||b.status==='PARTIALLY_BLOCKED'&&Number(b.postedLineCount)>0)&&!referenced.has(String(b.id))&&!eventRefSet.has(String(b.id))))reasons.add('UNLINKED_SALES_CONSUMPTION');
 const aggregate:Aggregate=JSON.parse(job.progress_json!);
 const summaries=aggregate.summaries;
 for(const reason of aggregate.reasons)reasons.add(reason);

 for(const r of revenues.filter(r=>r.revenueSource==='sales_events_v1')){
  const linked=summaries.filter(s=>s.revenue_id===r.id),posted=linked.filter(s=>s.status==='POSTED');
  if(finite(r.revenue)===null||currency(r.currency)!==cur||linked.some(s=>!['POSTED','REVERSED'].includes(s.status)||s.business_date!==r.date)||posted.some(s=>!s.revenue_known)||round(posted.reduce((n,s)=>n+Number(s.revenue),0))!==round(Number(r.revenue))||finite(r.receipts)!==posted.reduce((n,s)=>n+s.count,0))reasons.add('SALES_REVENUE_HISTORY_MISMATCH');
 }
 const costRows=Object.entries(aggregate.costRows).map(([business_date,cost])=>({business_date,cost}));
 const adjustments=Object.entries(aggregate.adjustments).map(([business_date,amount])=>({business_date,amount,known:true}));
 let cost=base.cost,adjustment=0;const daily=base.daily;
 for(const r of costRows){cost+=Number(r.cost??0);(daily[r.business_date]??={cost:0,adjustment:0}).cost+=Number(r.cost??0);}
 for(const r of adjustments){if(!r.known)reasons.add('INVENTORY_ADJUSTMENT_COST_UNKNOWN');adjustment+=r.amount;(daily[r.business_date]??={cost:0,adjustment:0}).adjustment+=r.amount;}
 const list=[...reasons];
 const history={known:!list.length,salesCostKnown:list.every(r=>r==='INVENTORY_ADJUSTMENT_COST_UNKNOWN'),adjustmentsKnown:!list.some(r=>['INVENTORY_ADJUSTMENT_COST_UNKNOWN','DUPLICATE_FINANCIAL_HISTORY','ACCOUNTING_CURRENCY_UNKNOWN'].includes(r)),cost:round(cost),adjustment:round(adjustment),daily,reasons:list,eventCount:summaries.reduce((n,s)=>n+s.count,0)};
 // Recheck the original source revision immediately before returning trusted
 // server-local facts. A changed marker/profile never yields stale-as-current.
 const result={summaries,history,venueId:scope.venueId,currency:cur},json=JSON.stringify(result);
 await runStoreCasBatch(db,scope.dataAccountId,input.snapshots,[boundary(db,input),...(input.accessGuard?[input.accessGuard]:[]),guard(db,job),db.prepare('UPDATE financial_read_jobs SET result_json=?,result_hash=?,progress_json=NULL,revision=revision+1 WHERE id=? AND revision=?').bind(json,await hash(json),id,job.revision),...cleanupPage(db,id)],new Date().toISOString());
 return restoreResult(result,monthKey);
}

function restoreResult(value:Row,monthKey:string){
 const events=records(value.summaries).map((s,i)=>bindFinancialEventCount({id:'verified-summary-'+i,venueId:value.venueId,revenueRowId:s.revenue_id,businessDate:s.business_date,status:s.status,currency:value.currency,source:s.source,revenue:s.accounting_known?s.accounting_revenue:null,acceptedAt:s.accepted_at,payments:s.payments??[]},s.count));
 return {events,costProof:verifiedPeriodCost(monthKey,value.history),history:value.history};
}
export class FinancialReadPending extends Error {
 constructor(public readonly jobId:string,public readonly phase:string,public readonly revision:number){super('FINANCIAL_READ_PENDING');}
}

export function financialReadAccessGuard(db:D1Database,s:{dataAccountId:number;venueId:number;actorId:number;membershipId:number;role:string;permissions:string|null}){
 return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__financial_read_access_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM venues v JOIN venue_memberships m ON m.venue_id=v.id JOIN workspaces w ON w.id=v.workspace_id JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=m.account_id WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND w.status='active' AND wm.status='active' AND m.id=? AND m.account_id=? AND m.status='active' AND m.role=? AND m.permissions_json IS ?)`).bind(s.dataAccountId,s.venueId,s.dataAccountId,s.membershipId,s.actorId,s.role,s.permissions);
}

function legacyReferences(input:FinancialReadInput){
 const {scope,period,stores}=input,cur=currency(input.currency);
 const revenues=selected(input,records(stores.bd_finance_revenue)),batches=selected(input,records(stores.bd_sales_batches)),documents=records(stores.bd_sales_documents),reconciliations=records(stores.bd_sales_reconciliations_v1);
 const referenced=new Set<string>(),used=new Set<string>(),reversed=new Set(batches.filter(b=>b.status==='REVERSED').map(b=>String(b.id)));
 for(const r of revenues){
  if(r.revenueSource==='sales_documents'){
   for(const doc of documents.filter(d=>Array.isArray(r.salesDocumentIds)&&r.salesDocumentIds.includes(d.id)))if(doc.salesBatchId)referenced.add(String(doc.salesBatchId));
   const cost=salesDocumentRowCost({revenue:r,documents,batches,venueId:scope.venueId,accountingCurrency:cur});if(cost.known)for(const b of cost.batchIds)used.add(b);
  }else if(r.revenueSource!=='sales_events_v1'){
   const links=reconciliations.filter(link=>link.venueId===scope.venueId&&link.revenueId===String(r.id));
   if(links.length===1){const cost=reconciledLegacyRowCost({revenue:r,reconciliation:links[0],batches,venueId:scope.venueId,accountingCurrency:cur});if(cost.known)for(const b of cost.batchIds){referenced.add(b);used.add(b);}}
  }
 }
 return {referenced,used,reversed};
}
type Aggregate={day?:string;summaries:Row[];costRows:Record<string,number>;adjustments:Record<string,number>;reasons:string[]};
function accumulateEvent(aggregate:Aggregate,e:Row,accountingCurrency:string){
 const key={revenue_id:e.revenueRowId,business_date:e.businessDate,status:e.status,currency:e.currency??null,source:e.source??null};
 let summary=aggregate.summaries.find(s=>Object.entries(key).every(([k,v])=>s[k]===v));
 if(!summary){summary={...key,count:0,revenue:0,revenue_known:true,accounting_revenue:0,accounting_known:true,accepted_at:null,payments:[]};aggregate.summaries.push(summary);}
 summary.count++;
 const raw=finite(e.revenue),accounting=resolveAccountingMoney({value:e,originalAmount:e.revenue,originalCurrency:e.currency??accountingCurrency,accountingCurrency})?.accountingAmount;
 summary.revenue_known=summary.revenue_known&&raw!==null;summary.revenue+=raw??0;
 summary.accounting_known=summary.accounting_known&&accounting!==undefined;summary.accounting_revenue+=accounting??0;
 if(e.acceptedAt&&(!summary.accepted_at||e.acceptedAt>summary.accepted_at))summary.accepted_at=e.acceptedAt;
 if(e.status==='POSTED')for(const payment of records(e.payments)){
  let found=summary.payments.find((p:Row)=>p.method===payment.method);
  if(!found){required(summary.payments.length<16);found={method:payment.method,amount:0};summary.payments.push(found);}
  found.amount+=finite(payment.amount)??0;
 }
}

// Disposable scratch cleanup is bounded too; a large completed month never
// adds an unbounded cascading delete to its final response.
function cleanupPage(db:D1Database,id:string){return ['financial_read_events','financial_read_movements'].map(table=>db.prepare(`DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE job_id=? LIMIT 500)`).bind(id));}
