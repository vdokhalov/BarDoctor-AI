import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access';
import {evidenceContentRevision} from '../lib/bardoctor/evidence-contracts';

test('Health payroll uses Finance legacy adapter without weakening evidence or ownership',async t=>{
 const now='2026-10-20T16:53:45Z',date='2026-10-11',name='Isolated legacy venue';
 const r=await lifecycleRuntime({healthInputs:'./lib/bardoctor/canonical-health-inputs',authReader:'./lib/bardoctor/auth',month:'./app/api/month-close/route'},{now});t.after(r.close);
 const owner=await r.register('payroll-legacy@isolated.test'),venueId=owner.activeVenueId;
 const venue=r.sqlite.prepare('SELECT data_account_id,workspace_id FROM venues WHERE id=?').get(venueId)!;
 const accountId=Number(venue.data_account_id),workspaceId=Number(venue.workspace_id),scope={venueId,workspaceId,dataAccountId:accountId};
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId,key,JSON.stringify(value),now);
 for(const key of new Set([...HEALTH_OPERATIONS_KEYS,...Object.values(VENUE_CONTEXT_SOURCES).flat()]))put(key,key==='bd_assortment_v1'?{stockBalances:[]}:[]);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name,currency:'PMR_RUB',timezone:'UTC'}),accountId);
 put('bd_finance_revenue',[{id:'legacy-revenue',venueId,date,currency:'PMR_RUB',revenue:12600,receipts:189,closingStatus:'closed'}]);
 put('bd_operational_reports_v1',[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:9035}}]);
 put('bd_sales_batches',[{id:'unlinked',venueId,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:2790,shiftId:'legacy-revenue'}]);
 const entries=Array.from({length:5},(_,i)=>({id:'payroll-'+i,venueId:name,date,type:i===0?'bonus':'payment',amount:i===0?100:20,currency:'PMR_RUB'}));
 const modules=r.api as any;
 const read=async()=>{const req=r.request(owner,'/api/business-health');req.headers.set('X-Venue-Id',String(venueId));const account=await modules.authReader.authenticateReadOnlyRequest(req);return modules.healthInputs.loadCanonicalHealthInputs(account,now);};
 const snapshot=()=>JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all());
 await t.test('five legacy rows: AVAILABLE, 9035+100 once, exact raw revision, unknown COGS retained',async()=>{
  put('bd_payroll_entries',entries);const before=snapshot(),value=await read();assert.equal(snapshot(),before);
  const source=value.snapshot.inputManifest.sources.find((s:any)=>s.key==='bd_payroll_entries');assert.equal(source.state,'AVAILABLE');
  const raw=r.sqlite.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,'bd_payroll_entries')!;
  const revision=await evidenceContentRevision({contractVersion:1,kind:'OPERATIONAL_REPORT',id:'bd_payroll_entries',venueId,workspaceId},{dataAccountId:accountId,data:{present:true,dataJson:raw.data_json,updatedAt:raw.updated_at}});assert.equal(source.revision,revision);
  const finance=value.context.promptData.performanceHistory.period.inputContract;
  assert.equal(finance.payrollBase,9035);assert.equal(finance.payrollBonuses,100);assert.equal(finance.payroll,9135);assert.deepEqual(finance.missingPayrollDates,[]);assert(!finance.missing.includes('PAYROLL'));
  assert.deepEqual(finance.costReasons.sort(),['HISTORICAL_SALES_COST_MISSING','UNLINKED_SALES_CONSUMPTION']);assert.equal(finance.resultAfterCost,null);assert.equal(value.intelligence.businessHealth.components.find((s:any)=>s.id==='finance').score,null);
  const response=await modules.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(response.status,200);const month=await response.json();assert.equal(month.report.inputContract.payroll,finance.payroll);assert.equal(month.report.inputContract.resultBeforeCost,finance.resultBeforeCost);assert.equal(snapshot(),before);
 });
 const cases:[string,unknown][]=[
  ['unknown string',[{...entries[0],venueId:'another legacy venue'}]],
  ['foreign numeric',[{...entries[0],venueId:venueId+999}]],
  ['foreign workspace',[{...entries[0],workspaceId:workspaceId+999}]],
  ['foreign account',[{...entries[0],dataAccountId:accountId+999}]],
  ['nested foreign venue',[{...entries[0],fact:{venueId:venueId+999}}]],
  ['nested foreign workspace',[{...entries[0],fact:{workspaceId:workspaceId+999}}]],
  ['nested foreign account',[{...entries[0],fact:{dataAccountId:accountId+999}}]],
  ['malformed array element',[entries[0],null]],
  ['oversized rows',Array.from({length:10001},(_,i)=>({...entries[0],id:String(i)}))],
  ['oversized bytes',[{...entries[0],note:'x'.repeat(2000001)}]],
 ];
 for(const[label,data]of cases)await t.test(label+' stays PARTIAL and payroll unknown',async()=>{
  put('bd_payroll_entries',data);const before=snapshot(),value=await read();assert.equal(snapshot(),before);
  assert.equal(value.snapshot.inputManifest.sources.find((s:any)=>s.key==='bd_payroll_entries').state,'PARTIAL');
  const finance=value.context.promptData.performanceHistory.period.inputContract;assert.equal(finance.payroll,null);assert(finance.missing.includes('PAYROLL'));assert.equal(finance.resultAfterCost,null);
 });
});
