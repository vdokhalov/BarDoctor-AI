import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access';

test('Health and month-close agree after reconciliation with large normalized POS and stock history',async t=>{
 const now='2026-10-21T04:56:20Z';
 const r=await lifecycleRuntime({health:'./lib/bardoctor/canonical-health-inputs',month:'./app/api/month-close/route',reconcile:'./app/api/sales-reconciliation/route',events:'./lib/bardoctor/sales-event-storage',stock:'./lib/bardoctor/stock-journal',stockReader:'./lib/bardoctor/stock-storage',database:'./db'},{now,...(process.env.HEALTH_PROFILE_BASELINE?{plugins:[{name:'profile-baseline',setup(build:any){build.onLoad({filter:/sales-event-storage\.ts$/},()=>({contents:execFileSync('git',['show','5d71df1d36d69e4572c68093d8f84a1ed1dd12a9:lib/bardoctor/sales-event-storage.ts'],{encoding:'utf8'}),loader:'ts'}));}}]}:{})});t.after(r.close);
 const owner=await r.register('health-linked@isolated.test'),venueId=owner.activeVenueId,accountId=owner.userId;
 const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id),scope={venueId,workspaceId,dataAccountId:accountId},journal={venueId,accountId},api=r.api as any,db=api.database.getD1();
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId,key,JSON.stringify(value),now);
 const raw=(key:string)=>String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,key)?.data_json??'[]');
 for(const key of new Set([...HEALTH_OPERATIONS_KEYS,...Object.values(VENUE_CONTEXT_SOURCES).flat(),'bd_month_closings']))if(!['bd_sales_events_v1','bd_stock_movements'].includes(key))put(key,key==='bd_assortment_v1'?{stockBalances:[]}:[]);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Health linked fixture',currency:'PMR_RUB',timezone:'UTC'}),accountId);
 const matrix=[[1600,24,350],[1725,26,378],[2300,34,520],[2400,36,538],[1600,24,350],[1450,22,312],[1525,23,342]];
 const revenues=matrix.map((m,i)=>({id:'legacy-'+i,venueId,date:'2026-10-0'+(i+2),revenue:m[0],receipts:m[1]}));
 const batch=(id:string,date:string,cost:number)=>({id,venueId,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:cost,lines:[{id:id+'-line',salesBatchId:id,menuItemId:'menu',rawName:'Fixture item',quantity:1,processingStatus:'POSTED',theoreticalCost:cost,currency:'PMR_RUB',recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[{productKey:'product',baseQuantityTotal:1,unitCost:cost,totalCost:cost,currency:'PMR_RUB',costStatus:'KNOWN_VALUE'}]}}]});
 const batches=matrix.map((m,i)=>({...batch('legacy-batch-'+i,revenues[i].date,m[2]),shiftId:revenues[i].id}));put('bd_sales_batches',batches);put('bd_finance_revenue',revenues);
 // Fresh signup already owns active empty normalized journals.
 for(let i=0;i<47;i++)await db.batch(await api.events.salesEventStatements(db,journal,i,[],[{id:'pos-'+i,externalId:'external-'+i,fingerprint:'fingerprint-'+i,venueId,businessDate:'2026-10-20',status:'POSTED',revenueRowId:'pos-shift',source:'POS_API',currency:'PMR_RUB',revenue:i===46?87.4:400,prices:[],batch:batch('pos-batch-'+i,'2026-10-20',i===46?436.69:100),originalMovements:[{id:'original-'+i,venueId,recipeSnapshot:{evidence:'x'.repeat(60000)}}]}]));
 const allRevenue=[...revenues,{id:'pos-shift',venueId,date:'2026-10-20',revenueSource:'sales_events_v1',revenue:18487.4,receipts:47,currency:'PMR_RUB',closingStatus:'closed'}];put('bd_finance_revenue',allRevenue);
 put('bd_operational_reports_v1',allRevenue.map(x=>({id:'report-'+x.id,venueId,date:x.date,closingStatus:'closed',payrollBreakdown:{total:x.id==='pos-shift'?9035:0}})));
 put('bd_payroll_entries',[{id:'bonus',venueId,date:'2026-10-20',type:'bonus',amount:100,currency:'PMR_RUB'}]);put('bd_finance_expenses',[{id:'expense',venueId,date:'2026-10-20',amount:480.75,currency:'PMR_RUB',category:'other'}]);
 const movements=Array.from({length:560},(_,i)=>({id:'stock-'+i,venueId,type:i===559?'inventory_adjustment':'receipt',businessDate:'2026-10-20',productKey:'product',amount:1,costAmount:i===559?-12:1,costStatus:'KNOWN',currency:'PMR_RUB',recipeSnapshot:{evidence:'x'.repeat(6000)}}));for(let i=0;i<movements.length;i+=100){const state=await api.stock.journalState(db,journal);await db.batch(await api.stock.appendJournalStatements(db,journal,state.revision,movements.slice(i,i+100)));}
 const command={venueId,operationId:'health-seven-reconciliation',mappings:revenues.map((x,i)=>({revenueId:x.id,batchIds:[batches[i].id]})),evidence:{kind:'SYNTHETIC_FIXTURE',reference:'Original synthetic weekly report',method:'Explicit complete fixture coverage verified from original quantities.',completeCoverage:true,historicalPricesAvailable:false}};
 const post=async(body:any)=>{const response=await api.reconcile.POST(r.request(owner,'/api/sales-reconciliation','POST',body));assert(response.ok,await response.clone().text());return response.json();};
 const preview=await post({...command,action:'preview'});await post({...command,action:'apply',previewRevision:preview.previewRevision,backupRevision:preview.backupRevision,backupSaved:true,confirmCoverage:true});
 await assert.rejects(()=>api.events.readSalesEvents(db,accountId,raw('bd_sales_events_v1'),undefined,{rows:10000,bytes:2000000}),/READ_LIMIT/);
 await assert.rejects(()=>api.stockReader.readStockHistory(db,accountId,raw('bd_stock_movements'),{rows:10000,bytes:2000000}),/READ_LIMIT/);
 const account=await api.auth.authenticateReadOnlyRequest(r.request(owner,'/api/business-health'));
 const health=()=>api.health.loadCanonicalHealthInputs(account,now);
 const persisted=()=>JSON.stringify(Object.fromEntries(['domain_data','sales_event_journals','sales_event_records','sales_event_chunks','sales_event_totals','stock_journals','stock_journal_movements','stock_recipe_snapshots'].map(table=>[table,r.sqlite.prepare('SELECT * FROM '+table+' WHERE account_id=? ORDER BY rowid').all(accountId)])));
 const reads:string[]=[];r.onRead(async sql=>{reads.push(sql);if(process.env.HEALTH_PROFILE_DELAY)await new Promise(resolve=>setTimeout(resolve,Number(process.env.HEALTH_PROFILE_DELAY)));});const started=performance.now();
 const before=persisted(),h=await health();r.onRead(null);console.log(JSON.stringify({healthReadCount:reads.length,posChunkReads:reads.filter(sql=>sql.includes('FROM sales_event_chunks')).length,stockPageReads:reads.filter(sql=>sql.includes('total_bytes')).length,localMs:Math.round(performance.now()-started)}));if(!process.env.HEALTH_PROFILE_BASELINE)assert.equal(reads.filter(sql=>sql.includes('FROM sales_event_chunks')).length,4);const response=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current')),m=await response.json();assert.equal(response.status,200);
 const f=h.context.promptData.performanceHistory.period.inputContract;
 for(const key of ['bd_sales_events_v1','bd_stock_movements','bd_sales_batches','bd_sales_reconciliations_v1'])assert.equal(h.snapshot.inputManifest.sources.find((s:any)=>s.key===key).state,'AVAILABLE',key);
 for(const key of ['revenue','payroll','costOfGoods','resultBeforeCost','resultAfterCost','inventoryAdjustmentNet'])assert.equal(f[key],m.report[key],key);
 assert.equal(f.revenue,31087.4);assert.equal(f.payroll,9135);assert.equal(f.costOfGoods,7826.69);assert.equal(f.resultAfterCost,13632.96);assert.deepEqual(f.costReasons,[]);assert.notEqual(h.intelligence.businessHealth.components.find((x:any)=>x.id==='finance').score,null);assert.equal(persisted(),before);
 await t.test('old normalized history beyond both row/byte limits does not erase current finance or prior-period links',async()=>{
  // Local fixture only: retained old captures, no production data or new venue.
  const eventInsert=r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)');
  const chunkInsert=r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)');
  const stockInsert=r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,payload_json) VALUES(?,?,?,?,?,?,?)');
  r.sqlite.exec('BEGIN');
  for(let i=0;i<10001;i++){
   const id='old-'+i,date='2025-09-15',event={id,externalId:id,fingerprint:id,source:'POS_API',venueId,businessDate:date,status:'POSTED',revenueRowId:'old-shift',currency:'PMR_RUB',revenue:1,prices:[],originalMovements:[],batch:batch('old-batch-'+i,date,1)};
   const payload=JSON.stringify(event);eventInsert.run(accountId,id,47+i,id,'POS_API',date,'old-shift',id,createHash('sha256').update(payload).digest('hex'));chunkInsert.run(accountId,id,payload);
   stockInsert.run(accountId,560+i,id,'product','receipt',date,JSON.stringify({id,venueId,type:'receipt',productKey:'product',businessDate:date,amount:1,currency:'PMR_RUB',evidence:'x'.repeat(250)}));
  }
  r.sqlite.prepare('UPDATE sales_event_journals SET next_position=10048 WHERE account_id=?').run(accountId);
  r.sqlite.exec('COMMIT');
  const unchanged=persisted();
  const value=await health(),finance=value.context.promptData.performanceHistory.period.inputContract;
  for(const key of ['bd_sales_events_v1','bd_stock_movements']){
   assert.equal(value.snapshot.inputManifest.sources.find((x:any)=>x.key===key).state,'PARTIAL','full history must not be relabelled complete');
   assert.equal(value.snapshot.inputManifest.financePeriod.sources.find((x:any)=>x.key===key).state,'AVAILABLE');
  }
  assert.equal(finance.costOfGoods,7826.69);assert.equal(finance.resultAfterCost,13632.96);assert.deepEqual(finance.costReasons,[]);
  assert.notEqual(value.intelligence.businessHealth.components.find((x:any)=>x.id==='finance').score,null);
  const monthly=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(monthly.status,200);const report=(await monthly.json()).report;assert.equal(report.costOfGoods,7826.69);assert.equal(report.resultAfterCost,13632.96);
  assert.equal(persisted(),unchanged,'readers do not rewrite history, links, markers or balances');
  const november={start:'2026-11-01',endExclusive:'2026-12-01'};
  assert.deepEqual(await api.events.readHealthSalesEvents(db,accountId,raw('bd_sales_events_v1'),scope,undefined,november),[]);
  assert.deepEqual(await api.stockReader.readHealthStockHistory(db,accountId,raw('bd_stock_movements'),scope,undefined,november),[]);
  // Financial boundary captures remain available; the reader does not filter
  // snapshots, payroll carry-in, documents or explicit reconciliations.
  const october={start:'2026-10-01',endExclusive:'2026-11-01'};
  assert.equal((await api.events.readHealthSalesEvents(db,accountId,raw('bd_sales_events_v1'),scope,undefined,october)).length,47);
  assert.equal((await api.stockReader.readHealthStockHistory(db,accountId,raw('bd_stock_movements'),scope,undefined,october)).length,560);
  const nextMonth=await api.health.loadCanonicalHealthInputs(account,'2026-11-01T00:00:01Z');
  const nextFinance=nextMonth.context.promptData.performanceHistory.period.inputContract;
  assert.equal(nextFinance.startDate,'2026-11-01');assert.equal(nextFinance.resultAfterCost,null);assert(nextFinance.missing.includes('NO_CURRENT_ACTIVITY'));
  put('bd_inventory_snapshots',[{id:'opening',venueId,date:'2026-10-01',total:100,sections:{bar:100},currency:'PMR_RUB'},{id:'closing',venueId,date:'2026-11-01',total:80,sections:{bar:80},currency:'PMR_RUB'}]);
  const withBoundaries=await api.month.GET(r.request(owner,'/api/month-close?monthKey=2026-10'));assert.equal(withBoundaries.status,200);
  const boundaryReport=(await withBoundaries.json()).report;assert.equal(boundaryReport.openingInventory,100);assert.equal(boundaryReport.closingInventory,80);assert.equal(boundaryReport.costOfGoods,7826.69);
  put('bd_inventory_snapshots',[]);

 });
 const assertUnknown=async(key:string)=>{
  // These corruption fixtures deliberately bypass canonical journal revisions.
  // Start a fresh verifier for each fixture rather than reuse an earlier proof.
  r.sqlite.exec('DELETE FROM financial_read_jobs');
  let value:any;
  for(let attempt=0;attempt<60;attempt++){try{value=await health();break;}catch(error){if((error as Error).message!=='FINANCIAL_READ_PENDING')throw error;}}
  assert(value,'verification must terminate with honest UNKNOWN');assert.equal(value.snapshot.inputManifest.sources.find((s:any)=>s.key===key).state,'PARTIAL');const finance=value.context.promptData.performanceHistory.period.inputContract;assert.equal(finance.resultAfterCost,null);assert(finance.costReasons.includes('COST_SOURCE_UNAVAILABLE'));};
 await t.test('nested foreign marker in omitted movement remains unknown',async()=>{const snapshot=r.sqlite.prepare('SELECT snapshot_hash,snapshot_json FROM stock_recipe_snapshots WHERE account_id=? LIMIT 1').get(accountId)!;const bad=JSON.stringify({workspaceId:999999});const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bad));const hex=Buffer.from(hash).toString('hex');r.sqlite.prepare('INSERT INTO stock_recipe_snapshots(account_id,snapshot_hash,snapshot_json) VALUES(?,?,?)').run(accountId,hex,bad);r.sqlite.prepare('UPDATE stock_journal_movements SET snapshot_hash=? WHERE account_id=? AND snapshot_hash=?').run(hex,accountId,snapshot.snapshot_hash);await assertUnknown('bd_stock_movements');r.sqlite.prepare('UPDATE stock_journal_movements SET snapshot_hash=? WHERE account_id=? AND snapshot_hash=?').run(snapshot.snapshot_hash,accountId,hex);r.sqlite.prepare('DELETE FROM stock_recipe_snapshots WHERE account_id=? AND snapshot_hash=?').run(accountId,hex);});
 await t.test('omitted POS evidence still enforces nested ownership and original byte limit',async()=>{
  const event={id:'legacy-event',venueId,batch:batch('legacy-event-batch','2026-10-20',100),originalMovements:[{workspaceId:999999}]};
  await assert.rejects(()=>api.events.readHealthSalesEvents(db,accountId,JSON.stringify([event]),scope),/SCOPE_MISMATCH/);
  await assert.rejects(()=>api.events.readHealthSalesEvents(db,accountId,JSON.stringify([{...event,originalMovements:[{evidence:'x'.repeat(2000000)}]}]),scope),/READ_LIMIT/);
 });
 await t.test('single oversized normalized stock snapshot is rejected before hydration',async()=>{
  const snapshot=r.sqlite.prepare('SELECT snapshot_hash,snapshot_json FROM stock_recipe_snapshots WHERE account_id=? LIMIT 1').get(accountId)!;
  r.sqlite.prepare('UPDATE stock_recipe_snapshots SET snapshot_json=? WHERE account_id=? AND snapshot_hash=?').run(JSON.stringify({evidence:'x'.repeat(2000000)}),accountId,snapshot.snapshot_hash);
  await assert.rejects(()=>api.stockReader.readHealthStockHistory(db,accountId,raw('bd_stock_movements'),scope),/READ_LIMIT/);
  await assertUnknown('bd_stock_movements');
  r.sqlite.prepare('UPDATE stock_recipe_snapshots SET snapshot_json=? WHERE account_id=? AND snapshot_hash=?').run(snapshot.snapshot_json,accountId,snapshot.snapshot_hash);
 });
 await t.test('hash tampering remains unknown',async()=>{const part=r.sqlite.prepare("SELECT payload FROM sales_event_chunks WHERE account_id=? AND event_id='pos-0' AND ordinal=0").get(accountId)!;r.sqlite.prepare("UPDATE sales_event_chunks SET payload='{}' WHERE account_id=? AND event_id='pos-0' AND ordinal=0").run(accountId);await assertUnknown('bd_sales_events_v1');r.sqlite.prepare("UPDATE sales_event_chunks SET payload=? WHERE account_id=? AND event_id='pos-0' AND ordinal=0").run(part.payload,accountId);});
 for(const [field,bad] of [['version',1],['chunk_count',1]] as const)await t.test('projected POS '+field+' mismatch remains unknown',async()=>{
  const previous=r.sqlite.prepare('SELECT '+field+' FROM sales_event_records WHERE account_id=? AND event_id=?').get(accountId,'pos-0')!;
  r.sqlite.prepare('UPDATE sales_event_records SET '+field+'=? WHERE account_id=? AND event_id=?').run(bad,accountId,'pos-0');await assertUnknown('bd_sales_events_v1');
  r.sqlite.prepare('UPDATE sales_event_records SET '+field+'=? WHERE account_id=? AND event_id=?').run(previous[field],accountId,'pos-0');
 });
 await t.test('projected POS revision race remains unknown',async()=>{let changed=false;r.onRead(sql=>{if(!changed&&sql.includes('FROM sales_event_chunks')){changed=true;r.sqlite.prepare('UPDATE sales_event_journals SET revision=revision+1 WHERE account_id=?').run(accountId);}});await assertUnknown('bd_sales_events_v1');r.onRead(null);r.sqlite.prepare('UPDATE sales_event_journals SET revision=revision-1 WHERE account_id=?').run(accountId);});
 await t.test('journal revision race remains unknown',async()=>{let changed=false;r.onRead(sql=>{if(!changed&&sql.includes('total_bytes')){changed=true;r.sqlite.prepare('UPDATE stock_journals SET revision=revision+1 WHERE account_id=?').run(accountId);}});await assertUnknown('bd_stock_movements');r.onRead(null);r.sqlite.prepare('UPDATE stock_journals SET revision=revision-1 WHERE account_id=?').run(accountId);});
});
