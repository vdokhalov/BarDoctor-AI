import {freshVenueJournalStatements} from '../../lib/bardoctor/fresh-venue-journals';
import {salesEventStatements,readSalesEvents} from '../../lib/bardoctor/sales-event-storage';
import {appendJournalStatements} from '../../lib/bardoctor/stock-journal';
import {readStockHistory} from '../../lib/bardoctor/stock-storage';
import {posOrderStatements} from '../../lib/bardoctor/pos-order-storage';
import {currentFinance} from '../../lib/bardoctor/current-finance';
const profile={name:'Local native recovery',currency:'MDL',timezone:'UTC'},date='2026-10-20',now='2026-10-21T12:00:00Z',scope={accountId:1,venueId:71};
export async function seedRecoveryBusiness(db:D1Database){
 await db.batch([...freshVenueJournalStatements(db,1,1,now),db.prepare('UPDATE accounts SET restaurant_json=? WHERE id=1').bind(JSON.stringify(profile))]);

 const marker=JSON.stringify({format:'bardoctor-pos-orders-v1',revision:0});
 await db.batch([db.prepare("INSERT INTO pos_order_journals(account_id,venue_id,state,source_hash,source_count,copied_count,revision,next_position,backup_key,backup_hash) VALUES(1,71,'active',?,0,0,0,0,'local-fixture',?)").bind('0'.repeat(64),'0'.repeat(64)),db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'bd_pos_orders_v1',?)").bind(marker)]);
 const actor={accountId:1,name:'Local owner',role:'owner' as const};
 await db.batch(await posOrderStatements(db,scope,marker,[],[{id:'open-order',venueId:71,shiftId:'shift',tableNumber:'1',status:'OPEN',revision:1,lines:[],comment:'',createdAt:now,updatedAt:now,createdBy:actor,updatedBy:actor,precheck:null,operations:[{id:'created',action:'create',fingerprint:'fixture',at:now,actor,details:{}}]}],now));
 const batch={id:'cost-capture',venueId:71,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:30,lines:[{id:'line',salesBatchId:'cost-capture',quantity:3,processingStatus:'POSTED',currency:'MDL',theoreticalCost:30,recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[{productKey:'p',baseQuantityTotal:3,unitCost:10,totalCost:30,currency:'MDL',costStatus:'KNOWN_VALUE'}]}}]};
 await db.batch(await salesEventStatements(db,scope,0,[],[{id:'event',externalId:'external',fingerprint:'fingerprint',venueId:71,businessDate:date,revenueRowId:'shift',status:'POSTED',source:'POS_API',currency:'MDL',revenue:100,prices:[],originalMovements:[],batch} as any]));
 await db.batch(await appendJournalStatements(db,scope,0,[
 {id:'receipt',venueId:71,businessDate:date,type:'receipt',productKey:'p',amount:10,costAmount:100,costStatus:'KNOWN',currency:'MDL'},
 {id:'consumption',venueId:71,businessDate:date,type:'sale_consumption',productKey:'p',amount:-3,costAmount:30,costStatus:'KNOWN',currency:'MDL',salesBatchId:'cost-capture',recipeSnapshot:batch.lines[0].recipeSnapshot},
 {id:'adjustment',venueId:71,businessDate:date,type:'inventory_adjustment',productKey:'p',amount:0,costAmount:-1,costStatus:'KNOWN',currency:'MDL'}]));
 const revenue={id:'legacy',venueId:71,date,revenue:10,receipts:1,currency:'MDL'};
 const legacyBatch={id:'legacy-capture',venueId:71,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:0,lines:[{id:'legacy-line',salesBatchId:'legacy-capture',quantity:1,processingStatus:'POSTED',theoreticalCost:0,recipeSnapshot:{recipeId:'service',capturedAt:now,consumptionMode:'NONE',ingredients:[]}}]};
 const reconciliation={contractVersion:1,status:'CONFIRMED',venueId:71,operationId:'synthetic-link',previewRevision:'fixture',date,currency:'MDL',revenueId:'legacy',cost:0,before:{revenue,batches:[legacyBatch]},evidence:{kind:'SYNTHETIC_FIXTURE',reference:'Native recovery fixture',method:'Explicit complete synthetic coverage for this local test.',completeCoverage:true,historicalPricesAvailable:false}};
 const stores={
  bd_finance_revenue:[{id:'shift',venueId:71,date,revenueSource:'sales_events_v1',revenue:100,receipts:1,currency:'MDL',closingStatus:'closed'},revenue],
  bd_operational_reports_v1:[{id:'report',venueId:71,date,closingStatus:'closed',payrollBreakdown:{total:5}}],
  bd_payroll_entries:[{id:'bonus',venueId:71,date,type:'bonus',amount:1,currency:'MDL'}],
  bd_finance_expenses:[{id:'expense',venueId:71,date,amount:2,currency:'MDL',category:'other'}],
  bd_sales_batches:[legacyBatch],bd_sales_reconciliations_v1:[reconciliation],bd_sales_documents:[],
  bd_opening_stock_v1:[{id:'opening',venueId:71,date:'2026-10-01',productKey:'p',quantity:0}],
  bd_inventory_snapshots:[{id:'anchor',venueId:71,date:'2026-10-01',total:0,currency:'MDL'}]
 };
 for(const [key,value] of Object.entries(stores))await db.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').bind(key,JSON.stringify(value)).run();
}
export async function recoveredFinance(db:D1Database){
 const rows=(await db.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=1').all<{store_key:string;data_json:string}>()).results;
 const stores=Object.fromEntries(rows.map(r=>[r.store_key,JSON.parse(r.data_json)]));
 const events=(await readSalesEvents(db,1,JSON.stringify(stores.bd_sales_events_v1)));
 const movements=(await readStockHistory(db,1,JSON.stringify(stores.bd_stock_movements)));
 return currentFinance({profile,venueId:71,workspaceId:1,dataAccountId:1,currency:'MDL',asOf:now,startDate:'2026-10-01',endDate:'2026-10-21',revenues:stores.bd_finance_revenue,reports:stores.bd_operational_reports_v1,payrollEntries:stores.bd_payroll_entries,expenses:stores.bd_finance_expenses,events,movements,batches:stores.bd_sales_batches,reconciliations:stores.bd_sales_reconciliations_v1,documents:stores.bd_sales_documents,costInputsAvailable:true});
}
