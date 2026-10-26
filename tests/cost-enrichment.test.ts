import test from 'node:test';
import assert from 'node:assert/strict';
import {unknownCostFixture as setup} from './helpers/cost-enrichment-fixture';
import {prepareCostEnrichment,validateCostEnrichments,enrichmentForBatch} from '../lib/bardoctor/cost-enrichment';
import {buildAssortmentAnalytics} from '../lib/bardoctor/assortment-analytics';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';
const scope={venueId:1,workspaceId:1,dataAccountId:7};
for(const [unit,q] of [['kg',.1],['g',100]] as const)test('unknown supplement '+unit+' keeps original snapshot, same item/period values',async()=>{
 const f=await setup(unit,q),before=JSON.stringify(f.input);const result=await prepareCostEnrichment(f.input);assert.equal(result.reason,'RESOLVED');assert.equal(result.entry?.cost,34);
 assert.equal(JSON.stringify(f.input),before);const entries=await validateCostEnrichments([JSON.parse(JSON.stringify(result.entry))],[f.input.event],f.input.documents,f.input.movements,scope);
 assert.equal(entries.length,1);assert.equal(enrichmentForBatch(f.input.event.batch,entries,1,'MDL')?.cost,34);
 assert.equal(enrichmentForBatch(f.input.event.batch,[result.entry],1,'MDL'),null,'unvalidated data is not trusted');
 const analytics=buildAssortmentAnalytics({...f.input,assortment:f.sale.assortment,purchaseDocuments:f.input.documents,stockMovements:f.input.movements,salesEvents:[f.input.event],costEnrichments:entries,venueId:1,period:'2026-10',now:new Date(f.input.now)});
 assert.equal(analytics.menuItems[0].sales?.costOfGoods,34);assert.equal(analytics.menuItems[0].sales?.grossProfit,56);assert.equal(analytics.menuItems[0].sales?.quantity,2);
 const period=historicalPeriodCost({venueId:1,monthKey:'2026-10',accountingCurrency:'MDL',revenues:f.sale.revenues,events:[f.input.event],movements:f.input.movements,documents:[],batches:[],costEnrichments:entries});assert.equal(period.known,true,JSON.stringify(period));if(period.known)assert.equal(period.cost,34);
});
for(const change of ['late','missing-time','missing-offset','equal-time','foreign','cancel','currency','ambiguous','unit','changed','known','manual'] as const)test('reject '+change,async()=>{
 const f=await setup(),x=f.input;
 if(change==='late')x.documents[0].confirmedAt='2026-10-26T00:00:00Z';
 if(change==='missing-time')delete x.documents[0].confirmedAt;
 if(change==='missing-offset')x.documents[0].confirmedAt='2026-10-25T22:07:03.774';
 if(change==='equal-time')x.documents[0].confirmedAt=x.event.acceptedAt;
 if(change==='foreign')x.documents[0].venueId=2;
 if(change==='cancel')x.documents[0].status='cancelled';
 if(change==='currency')x.event.currency='EUR';
 if(change==='ambiguous')x.movements.push({...x.movements.find(m=>m.type==='receipt'&&m.productKey==='lemon-key'),id:'duplicate'});
 if(change==='unit')x.event.batch.lines[0].recipeSnapshot.ingredients[0].baseUnit='litre';
 if(change==='changed')x.documents[0].updatedAt='2026-10-26T00:00:00Z';
 if(change==='known')x.event.batch.costStatus='FULL';
 if(change==='manual')x.event.batch.lines=[];
 assert.equal((await prepareCostEnrichment(x)).entry,undefined);
});
test('source hash, sale cancellation, altered quantity and venue invalidate persisted proof',async()=>{
 const f=await setup(),x=f.input,entry=(await prepareCostEnrichment(x)).entry!;
 for(const mutate of [(y:any)=>y.documents[0].items[0].unitPrice=70,(y:any)=>y.movements.find((m:any)=>m.type==='receipt'&&m.productKey==='lemon-key').costAmount=70,(y:any)=>y.event.status='REVERSED',(y:any)=>y.event.batch.lines[0].quantity=3,(y:any)=>y.event.venueId=2]){const copy=structuredClone(x);mutate(copy);assert.equal((await validateCostEnrichments([structuredClone(entry)],[copy.event],copy.documents,copy.movements,scope)).length,0);}
 assert.equal((await validateCostEnrichments([entry],[x.event],x.documents,x.movements,{...scope,workspaceId:2})).length,0);
});

import {lifecycleRuntime} from './helpers/lifecycle-runtime';
for(const normalized of [false,true])test('explicit command → shared readers → reload/retry; source change invalidates; normalized='+normalized,async t=>{
 const f=await setup(),r=await lifecycleRuntime({enrich:'./app/api/sales-cost-enrichment/route',journal:'./app/api/sales-batches/route',overview:'./app/api/assortment/overview/route',month:'./app/api/month-close/route',health:'./app/api/business-health/route',progress:'./lib/bardoctor/financial-read-progress',database:'./db',canonical:'./lib/bardoctor/canonical-health-inputs',costEvidence:'./lib/bardoctor/cost-evidence',salesStorage:'./lib/bardoctor/sales-event-storage',stockJournal:'./lib/bardoctor/stock-journal'},{now:f.input.now});t.after(r.close);
 const owner=await r.register('enrichment@isolated.test'),api=r.api as any;assert.equal(owner.activeVenueId,1);
 const profile={name:'Isolated',currency:'MDL',timezone:'Europe/Chisinau'};
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),owner.userId);
 for(const table of ['stock_journals','sales_event_journals'])r.sqlite.prepare('DELETE FROM '+table+' WHERE account_id=?').run(owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(value),f.input.now);
 const stores:any={bd_assortment_v1:f.sale.assortment,bd_sales_events_v1:[f.input.event],bd_stock_movements:f.input.movements,bd_purchase_documents:f.input.documents,bd_finance_revenue:f.sale.revenues,bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[],bd_operational_reports_v1:[{id:'report',venueId:1,date:'2026-10-26',closingStatus:'closed',payrollBreakdown:{total:0}}],bd_finance_expenses:[],bd_payroll_entries:[],bd_month_closings:[]};
 for(const[k,v]of Object.entries(stores))put(k,v);
 const db=api.database.getD1(),journalScope={accountId:owner.userId,venueId:1};
 if(normalized){
  while((await api.salesStorage.copyLegacySalesEvents(db,journalScope)).state!=='verified'){}
  await api.salesStorage.activateSalesEvents(db,journalScope);
  while((await api.stockJournal.copyLegacyJournal(db,journalScope)).state!=='verified'){}
  await api.stockJournal.activateJournal(db,journalScope);
 }
 const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=1').get()!.workspace_id);
 const cache=async()=>{
  const snapshots=r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=?').all(owner.userId).map((x:any)=>({key:x.store_key,dataJson:x.data_json,updatedAt:x.updated_at}));
  const input={scope:{venueId:1,workspaceId,dataAccountId:owner.userId},period:{start:'2026-10-01',endExclusive:'2026-11-01'},currency:'MDL',profileJson:JSON.stringify(profile),snapshots,stores};
  let out:any;for(let step=0;step<100;step++){out=await api.progress.advanceFinancialRead(db,input);if(!out.pending)return out;}throw Error('continuation did not finish');
 };
 const cacheBefore=normalized?await cache():null;

 const original=()=>JSON.stringify(r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key IN ('bd_sales_events_v1','bd_stock_movements','bd_finance_revenue','bd_purchase_documents','bd_operational_reports_v1','bd_month_closings') ORDER BY store_key").all(owner.userId));const before=original();
 const command=()=>api.enrich.POST(r.request(owner,'/api/sales-cost-enrichment','POST',{action:'enrich_unknown',venueId:1,month:'2026-10'}));
 r.failDatabase();await assert.rejects(command(),/injected database failure/);
 assert.equal(r.sqlite.prepare("SELECT 1 FROM domain_data WHERE account_id=? AND store_key='bd_sales_cost_enrichments_v1'").get(owner.userId),undefined);
 assert.equal(original(),before);
 r.beforeNextBatch(()=>{put('bd_purchase_documents',f.input.documents.map(d=>({...d,updatedAt:f.input.now})));});
 const conflict=await command();assert.equal(conflict.status,409);put('bd_purchase_documents',f.input.documents);
 let response=await command();assert.equal(response.status,201,await response.clone().text());assert.equal((await response.json()).updated,1);assert.equal(original(),before);
 const ledger=()=>JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data WHERE account_id=? AND store_key='bd_sales_cost_enrichments_v1'").get(owner.userId));const saved=ledger();
 for(let n=0;n<2;n++){response=await command();assert.equal(response.status,200);assert.equal((await response.json()).updated,0);assert.equal(ledger(),saved);}
 let journal=await api.journal.GET(r.request(owner,'/api/sales-batches'));assert.equal(journal.status,200,await journal.clone().text());let body=await journal.json();assert.equal(body.batches[0].costEnrichment.cost,34);assert.equal(body.batches[0].totalTheoreticalCost,null);
 const overview=await api.overview.GET(r.request(owner,'/api/assortment/overview?period=2026-10'));assert.equal(overview.status,200,await overview.clone().text());const ov=await overview.json();assert.equal(ov.analytics.menuItems[0].sales.costOfGoods,34);assert.equal(ov.analytics.menuItems[0].sales.grossProfit,56);
 const month=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(month.status,200,await month.clone().text());const report=(await month.json()).report;assert.equal(report.costOfGoods,34);assert.equal(report.revenue,90);
 if(normalized){const after=await cache();assert.notEqual(after.id,cacheBefore.id);assert.equal(after.history.cost,34);assert.equal(after.history.known,true);assert.equal((await cache()).id,after.id);}
 const account=await api.auth.authenticateReadOnlyRequest(r.request(owner,'/api/test'));
 const evidenceContext={account,venueId:1,workspaceId};
 const reference={contractVersion:1,kind:'CAPTURED_COST',id:f.input.event.id,venueId:1,workspaceId};
 const evidence=await api.costEvidence.resolveCostEvidence(evidenceContext,reference,20,0,f.input.now);
 assert.equal(evidence.evidence.projection.capturedTotalCost,null);
 assert.equal(evidence.evidence.projection.supplementalCost.cost,34);
 const canonical=await api.canonical.loadCanonicalHealthInputs(account,f.input.now);
 assert.equal(canonical.context.promptData.performanceHistory.period.inputContract.costOfGoods,34);
 const health=await api.health.GET(r.request(owner,'/api/business-health'));assert.equal(health.status,200,await health.clone().text());
 assert.equal(original(),before);
 response=await api.enrich.POST(r.request(owner,'/api/sales-cost-enrichment','POST',{action:'enrich_unknown',venueId:2,month:'2026-10'}));assert.equal(response.status,409);assert.equal(ledger(),saved);
 f.input.documents[0].status='cancelled';put('bd_purchase_documents',f.input.documents);
 const changedEvidence=await api.costEvidence.resolveCostEvidence(evidenceContext,{...reference,expectedRevision:evidence.evidence.revision},20,0,f.input.now);assert.equal(changedEvidence.outcome,'changed');
 journal=await api.journal.GET(r.request(owner,'/api/sales-batches'));body=await journal.json();assert.equal(body.batches[0].costEnrichment,null);assert.equal(ledger(),saved);
 const changed=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(changed.status,200,await changed.clone().text());assert.equal((await changed.json()).report.costOfGoods,null);
 if(normalized)assert.equal((await cache()).history.salesCostKnown,false);
 const foreign=await r.register('other-tenant@isolated.test');
 const foreignRead=await api.journal.GET(r.request(foreign,'/api/sales-batches'));assert.equal(foreignRead.status,200);assert.equal((await foreignRead.json()).batches.length,0);assert.equal(ledger(),saved);
});

test('new conflicting historical document invalidates proof; a later purchase cannot reprice it',async()=>{
 const f=await setup(),x=f.input,entry=(await prepareCostEnrichment(x)).entry!;
 const other={...structuredClone(x.documents[0]),id:'another-receipt'};
 assert.equal((await validateCostEnrichments([entry],[x.event],[...x.documents,other],x.movements,scope)).length,0);
 other.confirmedAt='2026-10-26T10:00:00Z';
 assert.equal((await validateCostEnrichments([entry],[x.event],[...x.documents,other],x.movements,scope)).length,1);
 const entries=await validateCostEnrichments([entry],[x.event],x.documents,x.movements,scope);
 const period=historicalPeriodCost({venueId:1,monthKey:'2026-10',accountingCurrency:'MDL',revenues:[...f.sale.revenues,{id:'manual',venueId:1,date:'2026-10-26',revenue:30,receipts:1}],events:[x.event],movements:x.movements,costEnrichments:entries});
 assert.equal(period.known,false);assert.equal(period.cost,34);assert.ok(period.reasons.includes('HISTORICAL_SALES_COST_MISSING'));
});
