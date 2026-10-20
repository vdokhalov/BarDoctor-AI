import { authenticatedEvidenceContext } from "../../../lib/bardoctor/evidence-resolver";
import { getD1 } from '../../../db';
import { unauthorized } from '../../../lib/bardoctor/auth';
import { hasPermission } from '../../../lib/bardoctor/access-control';
import { accountingCurrencyFromRestaurantJson } from '../../../lib/bardoctor/currency';
import { derivedInputBelongs } from '../../../lib/bardoctor/derived-input-scope';
import { activeBusinessRow } from '../../../lib/bardoctor/business-day-rows';
import { readJsonRequest } from '../../../lib/bardoctor/http';
import { closedMonthsFromStore } from '../../../lib/bardoctor/data-trust';
import { readStoreSnapshots, runStoreCasBatch, StoreWriteConflictError } from '../../../lib/bardoctor/store-cas';
import { posMembershipGuard } from '../../../lib/bardoctor/pos-auth-guard';
import { readSalesEventBatchReferences } from '../../../lib/bardoctor/sales-event-storage';
import { capturedBatchCost } from '../../../lib/bardoctor/financial-reconciliation';
import { SALES_RECONCILIATION_KEY as KEY, canonicalReconciliationValue, validReconciliationEvidence } from '../../../lib/bardoctor/sales-reconciliation-contract';

type Row = Record<string, any>;
const keys = ['bd_finance_revenue','bd_sales_batches','bd_sales_documents','bd_sales_events_v1','bd_month_closings',KEY];
const MAX_BYTES = 2_000_000;
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
class ReconciliationError extends Error { constructor(public code:string,public status=422){super(code);} }
const reject=(code:string):never=>{throw new ReconciliationError(code);};
const object=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x);
const list=(x:unknown):Row[]=>Array.isArray(x)&&x.length<=10000&&x.every(object)?x:reject('SOURCE_MALFORMED_OR_OVERSIZED');
const checkedLinks=(value:Row[])=>{if(value.some(l=>l.contractVersion!==1||l.status!=='CONFIRMED'||typeof l.revenueId!=='string'||typeof l.operationId!=='string'||!object(l.before)||!object(l.before.revenue)||!Array.isArray(l.before.batches)||!l.before.batches.length||!l.before.batches.every(object)||!validReconciliationEvidence(l.evidence)))reject('RECONCILIATION_LEDGER_INVALID');return value;};
async function digest(value:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalReconciliationValue(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');}

/** Preview is read-only. Apply writes only a reconciliation ledger and its audit. */
export async function POST(request:Request):Promise<Response>{
 const context=await authenticatedEvidenceContext(request);if(!context)return unauthorized();const {account}=context;
 if(!['owner','manager'].includes(account.role)||!['finance.manage','sales.view','shifts.view','inventory.view'].every(p=>hasPermission(account,p as any)))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const parsed=await readJsonRequest<Row>(request,{maxBytes:65536});if(!parsed.ok)return parsed.response;
 const body=parsed.data,scope={venueId:account.venueId,workspaceId:context.workspaceId,dataAccountId:account.id};
 if(!derivedInputBelongs(body,scope)||body.venueId!==scope.venueId||body.workspaceId!=null&&body.workspaceId!==scope.workspaceId||body.dataAccountId!=null&&body.dataAccountId!==scope.dataAccountId)return reply({ok:false,code:'SCOPE_MISMATCH'},409);
 try {
  if(!['preview','apply','status'].includes(body.action)||!(/^[A-Za-z0-9_-]{16,100}$/).test(body.operationId))reject('COMMAND_INVALID');
  const db=getD1(),snapshots=await readStoreSnapshots(db,account.id,keys);
  if(snapshots.some(s=>(s.dataJson?.length??0)>MAX_BYTES))reject('SOURCE_MALFORMED_OR_OVERSIZED');
  const read=(key:string)=>list(JSON.parse(snapshots.find(s=>s.key===key)?.dataJson??'[]'));
  const links=checkedLinks(read(KEY));
  if(!derivedInputBelongs(links,scope))reject('SOURCE_SCOPE_MISMATCH');
  const existing=links.filter(x=>x.operationId===body.operationId);
  if(body.action==='status')return reply({ok:true,operationId:body.operationId,state:existing.length?'APPLIED':'NOT_APPLIED',links:existing});
  const input={mappings:body.mappings,evidence:body.evidence};
  if(!validReconciliationEvidence(body.evidence)||!Array.isArray(body.mappings)||!body.mappings.length||body.mappings.length>31)reject('COVERAGE_EVIDENCE_REQUIRED');
  const commandRevision=await digest(input);
  if(existing.length){if(existing.some(x=>x.commandRevision!==commandRevision))reject('OPERATION_ID_REUSED');return reply({ok:true,duplicate:true,state:'APPLIED',links:existing});}
  const revenues=read('bd_finance_revenue'),batches=read('bd_sales_batches'),documents=read('bd_sales_documents'),closings=read('bd_month_closings');
  const events=list(await readSalesEventBatchReferences(db,account.id,snapshots.find(s=>s.key==='bd_sales_events_v1')?.dataJson??null,scope,{rows:10000,bytes:MAX_BYTES}));
  if(![revenues,batches,documents,events,closings].every(x=>derivedInputBelongs(x,scope)))reject('SOURCE_SCOPE_MISMATCH');
  const currency=accountingCurrencyFromRestaurantJson(account.restaurantJson);if(!currency)reject('CURRENCY_UNKNOWN');
  const closed=closedMonthsFromStore(closings),seenRevenue=new Set<string>(),seenBatch=new Set<string>();
  const planned:Row[]=[];
  for(const mapping of body.mappings){
   if(!object(mapping)||typeof mapping.revenueId!=='string'||!Array.isArray(mapping.batchIds)||!mapping.batchIds.length||mapping.batchIds.length>31||mapping.batchIds.some((x:unknown)=>typeof x!=='string'||!x))reject('MAPPING_INVALID');
   const matches=revenues.filter(r=>String(r.id)===mapping.revenueId);
   if(matches.length!==1||seenRevenue.has(mapping.revenueId)||links.some(x=>x.revenueId===mapping.revenueId))reject('REVENUE_AMBIGUOUS_OR_LINKED');
   const revenue=matches[0];seenRevenue.add(mapping.revenueId);
   if(!activeBusinessRow(revenue)||revenue.revenueSource!=null&&revenue.revenueSource!==''||revenue.manualTotalsVersion!=null||revenue.salesDocumentIds!=null||!validDate(revenue.date)||!Number.isFinite(Number(revenue.revenue))||Number(revenue.revenue)<0||!['number','string'].includes(typeof revenue.revenue)||String(revenue.revenue).trim()===''||!Number.isSafeInteger(Number(revenue.receipts))||Number(revenue.receipts)<0||!['number','string'].includes(typeof revenue.receipts)||String(revenue.receipts).trim()==='')reject('LEGACY_REVENUE_REQUIRED');
   if(revenue.currency!=null&&revenue.currency!==currency)reject('CURRENCY_MISMATCH');
   if(closed.has(revenue.date.slice(0,7)))reject('MONTH_LOCKED');
   const chosen:Row[]=[];let cost=0;
   for(const id of mapping.batchIds){
    if(seenBatch.has(id)||links.some(l=>l.before?.batches?.some((b:Row)=>b.id===id))||documents.some(d=>d.salesBatchId===id)||events.some(e=>e.batch?.id===id))reject('BATCH_ALREADY_LINKED');
    const bs=batches.filter(b=>b.id===id);if(bs.length!==1)reject('BATCH_AMBIGUOUS');
    const b=bs[0],captured=capturedBatchCost(b,scope.venueId,revenue.date,currency!);
    if(!captured.known)throw new ReconciliationError(captured.reason);
    if(b.shiftId!=null&&String(b.shiftId)!==mapping.revenueId)reject('BATCH_SHIFT_MISMATCH');
    seenBatch.add(id);chosen.push(b);cost+=captured.cost;
   }
   planned.push({contractVersion:1,id:body.operationId+':'+planned.length,...scope,operationId:body.operationId,commandRevision,status:'CONFIRMED',date:revenue.date,currency,revenueId:mapping.revenueId,cost:Math.round(cost*100)/100,evidence:body.evidence,before:{revenue,batches:chosen}});
  }
  const profileRevision=await digest(account.restaurantJson);
  const previewRevision=await digest({scope,input,snapshots,profileRevision});
  const backup={contractVersion:1,scope,operationId:body.operationId,previewRevision,sources:snapshots.map(s=>({key:s.key,updatedAt:s.updatedAt})),before:planned.map(p=>p.before),previousLinks:links};
  const backupRevision=await digest(backup);
  for(const link of planned){link.previewRevision=previewRevision;link.backupRevision=backupRevision;}
  if(JSON.stringify([...links,...planned]).length>MAX_BYTES||links.length+planned.length>10000)reject('RECONCILIATION_CAPACITY');
  const summary=planned.map(p=>({revenueId:p.revenueId,date:p.date,revenue:p.before.revenue.revenue,receipts:p.before.revenue.receipts,currency,cost:p.cost,batches:p.before.batches.map((b:Row)=>({id:b.id,shiftId:b.shiftId,lines:b.lines.map((l:Row)=>({id:l.id,menuItemId:l.menuItemId,name:l.rawName,quantity:l.quantity,unit:l.unit,cost:l.theoreticalCost}))}))}));
  if(body.action==='preview')return reply({ok:true,scope,operationId:body.operationId,previewRevision,backupRevision,backup,summary,notice:'Подтверждается заявленная полнота покрытия. Исторические цены не восстанавливаются. Склад, выручка, чеки и captures сохраняются.'});
  if(body.previewRevision!==previewRevision||body.backupRevision!==backupRevision||body.backupSaved!==true||body.confirmCoverage!==true)reject('PREVIEW_OR_BACKUP_CHANGED');
  const now=new Date().toISOString();for(const link of planned){link.confirmedAt=now;link.confirmedBy=account.actorAccountId;link.confirmedRole=account.role;}
  const guard=db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,'__bd_reconciliation_profile_guard__',NULL,? WHERE NOT EXISTS(SELECT 1 FROM accounts a JOIN venues v ON v.data_account_id=a.id WHERE a.id=? AND a.restaurant_json IS ? AND v.id=? AND v.workspace_id=?)`).bind(account.id,now,account.id,account.restaurantJson,account.venueId,context.workspaceId);
  await runStoreCasBatch(db,account.id,snapshots,[posMembershipGuard(db,account,now),guard,
   db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,KEY,JSON.stringify([...links,...planned]),now),
   db.prepare(`INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,before_json,after_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id,KEY,'legacy_sales.reconcile',body.operationId,'Явная сверка исторических продаж',JSON.stringify(backup),JSON.stringify(planned),String(account.actorAccountId),account.role,body.evidence.reference,now)
  ],now);
  return reply({ok:true,state:'APPLIED',operationId:body.operationId,links:planned},201);
 }catch(error){
  if(error instanceof StoreWriteConflictError)return reply({ok:false,code:'INPUTS_CHANGED'},409);
  if(error instanceof ReconciliationError)return reply({ok:false,code:error.code},error.status);
  if(error instanceof Error&&['SALES_EVENT_READ_LIMIT','SALES_EVENT_STORE_NEEDS_REVIEW','SALES_EVENT_SCOPE_MISMATCH'].includes(error.message))return reply({ok:false,code:error.message},422);
  if(error instanceof SyntaxError)return reply({ok:false,code:'SOURCE_MALFORMED'},422);
  throw error;
 }
}

/** Bounded, account-scoped selection within the existing sales journal. */
export async function GET(request:Request):Promise<Response>{
 const context=await authenticatedEvidenceContext(request);if(!context)return unauthorized();const {account}=context;
 if(!['owner','manager'].includes(account.role)||!['finance.manage','sales.view','shifts.view','inventory.view'].every(p=>hasPermission(account,p as any)))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const url=new URL(request.url),from=url.searchParams.get('from')??'',to=url.searchParams.get('to')??'';
 if(!validDate(from)||!validDate(to)||from>to||Date.parse(to)-Date.parse(from)>30*86400000)return reply({ok:false,code:'DATE_RANGE_INVALID'},422);
 const snapshots=await readStoreSnapshots(getD1(),account.id,['bd_finance_revenue','bd_sales_batches',KEY]);
 try{
  if(snapshots.some(s=>(s.dataJson?.length??0)>MAX_BYTES))reject('SOURCE_MALFORMED_OR_OVERSIZED');
  const scope={venueId:account.venueId,workspaceId:context.workspaceId,dataAccountId:account.id};
  const read=(key:string)=>{const data=list(JSON.parse(snapshots.find(s=>s.key===key)?.dataJson??'[]'));if(!derivedInputBelongs(data,scope))reject('SOURCE_SCOPE_MISMATCH');return data;};
  const links=checkedLinks(read(KEY)),revenues=read('bd_finance_revenue').filter(r=>r.date>=from&&r.date<=to&&activeBusinessRow(r)&&!r.revenueSource&&!links.some(l=>l.revenueId===String(r.id)));
  const batches=read('bd_sales_batches').filter(b=>b.businessDate>=from&&b.businessDate<=to&&b.status==='POSTED'&&!links.some(l=>l.before?.batches?.some((x:Row)=>x.id===b.id)));
  return reply({ok:true,...scope,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson),revenues:revenues.map(r=>({id:String(r.id),date:r.date,revenue:r.revenue,receipts:r.receipts})),batches:batches.map(b=>({id:b.id,date:b.businessDate,shiftId:b.shiftId,cost:b.totalTheoreticalCost,costStatus:b.costStatus,lines:list(b.lines).map(l=>({id:l.id,name:l.rawName,menuItemId:l.menuItemId,quantity:l.quantity,unit:l.unit,cost:l.theoreticalCost}))}))});
 }catch(error){if(error instanceof ReconciliationError||error instanceof SyntaxError)return reply({ok:false,code:error instanceof ReconciliationError?error.code:'SOURCE_MALFORMED'},422);throw error;}
}
