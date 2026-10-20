import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';
import {SALES_RECONCILIATION_KEY as KEY} from '../lib/bardoctor/sales-reconciliation-contract';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access';

const matrix=[[1600,24,20,10,12,350],[1725,26,22,10,13,378],[2300,34,30,10,20,520],[2400,36,32,10,20,538],[1600,24,20,10,12,350],[1450,22,18,10,10,312],[1525,23,18,10,13,342]];
test('explicit legacy reconciliation: actual auth, CAS, audit, Finance and Health',async t=>{
 const now='2026-10-20T19:00:00Z';
 const r=await lifecycleRuntime({reconcile:'./app/api/sales-reconciliation/route',month:'./app/api/month-close/route',health:'./lib/bardoctor/canonical-health-inputs',authReader:'./lib/bardoctor/auth',store:'./app/api/store/[key]/route'},{now});t.after(r.close);
 const owner=await r.register('reconcile@isolated.test'),other=await r.register('other-reconcile@isolated.test');
 const venueId=owner.activeVenueId,v=r.sqlite.prepare('SELECT data_account_id,workspace_id FROM venues WHERE id=?').get(venueId)!;
 const accountId=Number(v.data_account_id),workspaceId=Number(v.workspace_id),scope={venueId,workspaceId,dataAccountId:accountId};
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId,key,JSON.stringify(value),now);
 for(const key of new Set([...HEALTH_OPERATIONS_KEYS,...Object.values(VENUE_CONTEXT_SOURCES).flat()]))put(key,key==='bd_assortment_v1'?{stockBalances:[]}:[]);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Isolated fixture',currency:'PMR_RUB',timezone:'UTC'}),accountId);
 const revenues=matrix.map((x,i)=>({id:'legacy-'+i,venueId,date:'2026-10-'+String(i+2).padStart(2,'0'),revenue:x[0],receipts:x[1],closingStatus:'closed'}));
 const batches=matrix.map((x,i)=>({id:'batch-'+i,venueId,shiftId:revenues[i].id,businessDate:revenues[i].date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:x[5],movementIds:['missing-'+i],lines:[2,3,4].map((j,k)=>({id:'line-'+i+'-'+k,salesBatchId:'batch-'+i,rawName:['Cappuccino','Espresso','Croissant'][k],menuItemId:'menu-'+k,quantity:x[j],unit:'portion',processingStatus:'POSTED',currency:'PMR_RUB',theoreticalCost:x[j]*[9,5,10][k],recipeSnapshot:{recipeId:'recipe-'+k,capturedAt:now,ingredients:[{productKey:'ingredient-'+k,baseQuantityTotal:x[j],unitCost:[9,5,10][k],totalCost:x[j]*[9,5,10][k],costStatus:'KNOWN_VALUE',currency:'PMR_RUB'}]}}))}));
 put('bd_finance_revenue',revenues);put('bd_sales_batches',batches);put('bd_stock_movements',[]);put('bd_month_closings',[]);
 put('bd_operational_reports_v1',revenues.map(x=>({id:'report-'+x.id,venueId,date:x.date,closingStatus:'closed',payrollBreakdown:{total:0}})));
 const base={...scope,operationId:'fixture-seven-days-2026',mappings:revenues.map((x,i)=>({revenueId:x.id,batchIds:[batches[i].id]})),evidence:{kind:'SYNTHETIC_FIXTURE',reference:'Original QA weekly report 9 October 2026',method:'Original weekly quantities and seven daily quantities reconciled against current menu; historical selling prices were not retained.',completeCoverage:true,historicalPricesAvailable:false}};
 const api=r.api as any;
 const post=async(body:any,who=owner)=>{const res=await api.reconcile.POST(r.request(who,'/api/sales-reconciliation','POST',body));return {status:res.status,data:await res.json()};};
 const sources=()=>JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data WHERE account_id=? AND store_key<>? ORDER BY store_key').all(accountId,KEY));
 const history=(links:any[]=[],bs:any[]=batches)=>historicalPeriodCost({venueId,monthKey:'2026-10',accountingCurrency:'PMR_RUB',revenues,events:[],movements:[],documents:[],batches:bs,reconciliations:links});
 const before=sources();let preview:any;
 await t.test('preview read-only, seven exact operands and backup',async()=>{
  assert.deepEqual(history().reasons.sort(),['HISTORICAL_SALES_COST_MISSING','UNLINKED_SALES_CONSUMPTION']);
  const p=await post({...base,action:'preview'});assert.equal(p.status,200,JSON.stringify(p.data));preview=p.data;
  assert.equal(preview.summary.reduce((s:number,x:any)=>s+x.cost,0),2790);assert.equal(preview.summary.reduce((s:number,x:any)=>s+x.revenue,0),12600);assert.equal(preview.summary.reduce((s:number,x:any)=>s+x.receipts,0),189);assert.deepEqual(preview.backup.before.map((x:any)=>x.batches[0]),batches);assert.equal(sources(),before);
 });
 await t.test('no coverage, invalid ownership, foreign tenant, duplicate batches rejected',async()=>{
  assert.equal((await post({...base,action:'preview',evidence:{...base.evidence,completeCoverage:false}})).data.code,'COVERAGE_EVIDENCE_REQUIRED');
  assert.notEqual((await post({...base,action:'preview'},other)).status,200);
  assert.equal((await post({...base,action:'preview',evidence:{...base.evidence,nested:{dataAccountId:999999}}})).data.code,'SCOPE_MISMATCH');
  put('bd_finance_revenue',[{...revenues[0],receipts:false},...revenues.slice(1)]);assert.equal((await post({...base,action:'preview'})).data.code,'LEGACY_REVENUE_REQUIRED');put('bd_finance_revenue',revenues);
  for(const key of ['venueId','workspaceId','dataAccountId']){put('bd_sales_batches',[{...batches[0],nested:{[key]:999999}},...batches.slice(1)]);assert.equal((await post({...base,action:'preview'})).data.code,'SOURCE_SCOPE_MISMATCH');}put('bd_sales_batches',batches);
  assert.equal((await post({...base,action:'preview',mappings:[{revenueId:revenues[0].id,batchIds:[batches[0].id,batches[0].id]}]})).data.code,'BATCH_ALREADY_LINKED');
  const req=r.request(owner,'/api/store/'+KEY,'PUT',{data:[]});assert.notEqual((await api.store.PUT(req,{params:Promise.resolve({key:KEY})})).status,200);
 });
 await t.test('malformed, oversized, linked and incomplete captures fail closed',async()=>{
  for(const bad of [{...batches[0],lines:[null]}, {...batches[0],costStatus:'PARTIAL'},{...batches[0],totalTheoreticalCost:1}]){put('bd_sales_batches',[bad,...batches.slice(1)]);assert.notEqual((await post({...base,action:'preview'})).status,200);}put('bd_sales_batches',batches);
  put('bd_sales_documents',[{id:'already',venueId,salesBatchId:batches[0].id}]);assert.equal((await post({...base,action:'preview'})).data.code,'BATCH_ALREADY_LINKED');put('bd_sales_documents',[]);
  put('bd_sales_batches',[{...batches[0],note:'x'.repeat(2000001)}]);assert.equal((await post({...base,action:'preview'})).data.code,'SOURCE_MALFORMED_OR_OVERSIZED');put('bd_sales_batches',batches);
 });
 await t.test('closed month and stale preview fail without writes',async()=>{
  put('bd_month_closings',[{id:'closed',venueId,monthKey:'2026-10',status:'closed'}]);assert.equal((await post({...base,action:'preview'})).data.code,'MONTH_LOCKED');put('bd_month_closings',[]);
  put('bd_finance_revenue',[{...revenues[0],revenue:1601},...revenues.slice(1)]);
  const p=await post({...base,action:'apply',previewRevision:preview.previewRevision,backupRevision:preview.backupRevision,backupSaved:true,confirmCoverage:true});assert.equal(p.data.code,'PREVIEW_OR_BACKUP_CHANGED');put('bd_finance_revenue',revenues);
 });
 await t.test('roles, mid-flight revocation, CAS conflict and transaction rollback',async()=>{
  const member=r.sqlite.prepare('SELECT * FROM venue_memberships WHERE venue_id=? AND account_id=?').get(venueId,owner.userId)!;
  r.sqlite.prepare("UPDATE venue_memberships SET role='cashier' WHERE id=?").run(member.id);
  assert.equal((await post({...base,action:'preview'})).status,403);
  r.sqlite.prepare("UPDATE venue_memberships SET role='manager' WHERE id=?").run(member.id);
  assert.equal((await post({...base,action:'preview'})).status,200);
  r.sqlite.prepare("UPDATE venue_memberships SET role='owner' WHERE id=?").run(member.id);
  const p=(await post({...base,action:'preview'})).data;
  const command={...base,action:'apply',previewRevision:p.previewRevision,backupRevision:p.backupRevision,backupSaved:true,confirmCoverage:true};
  r.beforeNextBatch(()=>{put('bd_finance_revenue',[{...revenues[0],revenue:999},...revenues.slice(1)]);});
  assert.equal((await post(command)).data.code,'INPUTS_CHANGED');put('bd_finance_revenue',revenues);
  r.beforeNextBatch(()=>{r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE id=?").run(member.id);});
  assert.equal((await post(command)).data.code,'INPUTS_CHANGED');r.sqlite.prepare("UPDATE venue_memberships SET status='active' WHERE id=?").run(member.id);
  r.failDatabase();await assert.rejects(()=>post(command),/injected database failure/);
  assert.deepEqual(JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,KEY)!.data_json)),[]);
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE account_id=? AND action='legacy_sales.reconcile'").get(accountId)!.n,0);
 });
 await t.test('apply atomic links/audit only; repeat idempotent; missing movements unchanged',async()=>{
  preview=(await post({...base,action:'preview'})).data;
  const command={...base,action:'apply',previewRevision:preview.previewRevision,backupRevision:preview.backupRevision,backupSaved:true,confirmCoverage:true};
  assert.equal((await post({...command,backupSaved:false})).data.code,'PREVIEW_OR_BACKUP_CHANGED');
  const applied=await post(command);assert.equal(applied.status,201,JSON.stringify(applied.data));assert.equal(sources(),before);
  assert.equal(history(applied.data.links).cost,2790);assert.equal(history(applied.data.links).known,true);
  const repeated=await post(command);assert.equal(repeated.data.duplicate,true);assert.equal(repeated.data.links.length,7);
  assert.equal((await post({...base,action:'status'})).data.state,'APPLIED');
  assert.equal((await post({...command,evidence:{...base.evidence,reference:'Different reference'}})).data.code,'OPERATION_ID_REUSED');
  assert.equal((await post({...base,operationId:'another-operation-2026',action:'preview'})).data.code,'REVENUE_AMBIGUOUS_OR_LINKED');
  const audits=r.sqlite.prepare('SELECT * FROM audit_log WHERE account_id=? AND action=?').all(accountId,'legacy_sales.reconcile');assert.equal(audits.length,1);assert.deepEqual(JSON.parse(String(audits[0].before_json)),preview.backup);
  const changed=structuredClone(batches);changed[0].lines[0].quantity++;assert(history(applied.data.links,changed).reasons.includes('RECONCILIATION_INPUT_CHANGED'));
  const links=structuredClone(applied.data.links);links[0].evidence.completeCoverage=false;assert.equal(history(links).known,false);
 });
 await t.test('Finance and Health read same linked COGS; unknown extra batch still blocks score',async()=>{
  const month=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));const data=await month.json();assert.equal(month.status,200,JSON.stringify(data));assert.equal(data.report.costOfGoods,2790);assert.equal(data.report.revenue,12600);assert.equal(data.report.resultAfterCost,9810);
  const account=await api.authReader.authenticateReadOnlyRequest(r.request(owner,'/api/business-health'));
  const healthy=await api.health.loadCanonicalHealthInputs(account,now);assert.equal(healthy.context.promptData.performanceHistory.period.inputContract.costOfGoods,2790);
  put('bd_sales_batches',[...batches,{...batches[0],id:'unlinked-extra'}]);
  const health=await api.health.loadCanonicalHealthInputs(account,now);const finance=health.context.promptData.performanceHistory.period.inputContract;assert.equal(finance.resultAfterCost,null);assert(finance.costReasons.includes('UNLINKED_SALES_CONSUMPTION'));assert.equal(health.intelligence.businessHealth.components.find((x:any)=>x.id==='finance').score,null);put('bd_sales_batches',batches);
 });
});
