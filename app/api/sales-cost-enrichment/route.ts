import { authenticatedEvidenceContext } from "../../../lib/bardoctor/evidence-resolver";
import { getD1 } from "../../../db";
import { unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { derivedInputBelongs } from "../../../lib/bardoctor/derived-input-scope";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, StoreWriteConflictError } from "../../../lib/bardoctor/store-cas";
import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { readSalesEvents } from "../../../lib/bardoctor/sales-event-storage";
import { readStockHistory } from "../../../lib/bardoctor/stock-storage";
import { COST_ENRICHMENT_KEY, prepareCostEnrichment } from "../../../lib/bardoctor/cost-enrichment";

const keys=[COST_ENRICHMENT_KEY,'bd_sales_events_v1','bd_stock_movements','bd_purchase_documents'];
const limit={rows:10000,bytes:2_000_000};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
/** Explicit, bounded command. Only the supplemental cost ledger is written. */
export async function POST(request:Request){
 const context=await authenticatedEvidenceContext(request);if(!context)return unauthorized();
 const {account}=context;
 if(!['owner','manager'].includes(account.role)||!['finance.manage','sales.view','shifts.view','inventory.view'].every(p=>hasPermission(account,p as any)))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const parsed=await readJsonRequest<Record<string,unknown>>(request,{maxBytes:4096});if(!parsed.ok)return parsed.response;
 const body=parsed.data,scope={venueId:context.venueId,workspaceId:context.workspaceId,dataAccountId:account.id};
 if(body.venueId!==scope.venueId||!derivedInputBelongs(body,scope))return reply({ok:false,code:'SCOPE_MISMATCH'},409);
 if(body.action!=='enrich_unknown'||typeof body.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month))return reply({ok:false,code:'COMMAND_INVALID'},422);
 const db=getD1(),now=new Date().toISOString();
 try{
  const snapshots=await readStoreSnapshots(db,account.id,keys);
  if(snapshots.some(s=>(s.dataJson?.length??0)>limit.bytes))return reply({ok:false,code:'SOURCE_READ_LIMIT'},422);
  const raw=(key:string)=>snapshots.find(s=>s.key===key)?.dataJson??null;
  const list=(key:string)=>{const data=JSON.parse(raw(key)??'[]');if(!Array.isArray(data)||data.length>limit.rows||!derivedInputBelongs(data,scope))throw Error('SOURCE_INVALID');return data;};
  const ledger=list(COST_ENRICHMENT_KEY),documents=list('bd_purchase_documents');
  const events=await readSalesEvents(db,account.id,raw('bd_sales_events_v1'),undefined,limit),movements=await readStockHistory(db,account.id,raw('bd_stock_movements'),limit);
  if(!derivedInputBelongs([events,movements],scope))throw Error('SOURCE_INVALID');
  const currency=accountingCurrencyFromRestaurantJson(account.restaurantJson);if(!currency)return reply({ok:false,code:'CURRENCY_UNKNOWN'},422);
  const selected=events.filter(e=>String(e.businessDate).slice(0,7)===body.month&&e.status==='POSTED');
  const additions=[],reasons:Record<string,number>={};let unchanged=0;
  for(const event of selected){
   if(event.currency!==currency){reasons.CURRENCY_MISMATCH=(reasons.CURRENCY_MISMATCH??0)+1;continue;}
   const result=await prepareCostEnrichment({event,documents,movements,scope,now});
   if(!result.entry){reasons[result.reason]=(reasons[result.reason]??0)+1;continue;}
   if(ledger.some(e=>e.id===result.entry!.id)){unchanged++;continue;}
   additions.push({...result.entry,});
  }
  // A new proof replaces only this sale's previous supplemental proof, never source history.
  const changedSales=new Set(additions.map(e=>e.saleId));
  const next=[...ledger.filter(e=>!changedSales.has(e.saleId)),...additions];
  if(JSON.stringify(next).length>limit.bytes)return reply({ok:false,code:'ENRICHMENT_CAPACITY'},422);
  if(additions.length){
   const profileGuard=db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,'__bd_cost_profile_guard__',NULL,? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?)`).bind(account.id,now,account.id,account.restaurantJson);
   await runStoreCasBatch(db,account.id,snapshots,[posMembershipGuard(db,account,now),profileGuard,
    db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,COST_ENRICHMENT_KEY,JSON.stringify(next),now),
    db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,before_json,after_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(account.id,COST_ENRICHMENT_KEY,'sales.cost_enriched',body.month,'Дорасчёт неизвестной себестоимости',JSON.stringify(ledger.filter(e=>changedSales.has(e.saleId))),JSON.stringify({ids:additions.map(e=>e.id),count:additions.length}),String(account.actorAccountId),account.role,'Подтверждённые приходы до продажи',now)
   ],now);
  }
  return reply({ok:true,venueId:scope.venueId,updated:additions.length,unchanged,reasons},additions.length?201:200);
 }catch(error){
  if(error instanceof StoreWriteConflictError)return reply({ok:false,code:'INPUTS_CHANGED'},409);
  if(error instanceof SyntaxError||error instanceof Error&&/SOURCE_INVALID|READ_LIMIT|NEEDS_REVIEW|SCOPE_MISMATCH/.test(error.message))return reply({ok:false,code:'SOURCES_NEED_REVIEW'},422);
  throw error;
 }
}
