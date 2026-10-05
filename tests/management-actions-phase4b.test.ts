import test from 'node:test';
import assert from 'node:assert/strict';
import {managementActionsFixture} from './helpers/management-actions-fixture';
type Row=Record<string,unknown>;
test('isolated operating venue: loss, blocker, overdue critical task, stock and day; one Health/Doctor queue',async()=>{
 const r=await managementActionsFixture();try{
  const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all();
  const health=await r.readHealth(),queue=health.data.businessHealthSnapshot.managementQueue as Row[],top=queue.slice(0,3);
  assert.equal(top[0].linkedTaskId,'qa-overdue-task');assert.equal(top[1].issueKey,'operational-blocker');assert.equal(top[2].issueKey,'profit');
  assert.equal(top[0].priority,'critical');assert.equal(top[1].priority,'critical');
  for(const key of ['stock','unclosed-shifts'])assert.ok(queue.some(row=>row.issueKey===key&&row.target));
  const response=await r.api.doctor.handleDiagnosis(r.requestAction('/api/ai/diagnosis','POST',{profile:{currency:'MDL'},cases:[],actions:[{title:'Equipment'}]}));assert.equal(response.status,200,await response.clone().text());
  const doctor=await response.json() as {data:{attention:{priorities:Row[]}}};assert.deepEqual(doctor.data.attention.priorities.map((row:Row)=>row.recommendationId),top.map(row=>row.recommendationId));
  assert.deepEqual((await r.readHealth()).data.businessHealthSnapshot.managementTopActions,top);
  assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),before);
 }finally{r.close()}
});
test('day: opening and partial report never clear; real complete report verifies and advances queue after reload',async()=>{
 const r=await managementActionsFixture();try{
  const id='health:'+r.venueId+':day:2026-10-02';const initial=await r.verifyAction(id);assert.equal(initial.verification.result,'ACTIVE');
  assert.equal(new URL(initial.verification.target.path,'https://qa.test').searchParams.get('businessDate'),'2026-10-02');
  assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');
  const save=async(body:object)=>r.api.closeReport.POST(r.requestAction('/api/shifts/close','POST',{venueId:r.venueId,sectionsVersion:1,shiftId:'qa-cash',writeOffItems:[],...body}));
  const partial=await save({shiftCloseId:'qa-partial',revenueRecord:{date:'2026-10-02',note:'partial'}});assert.equal(partial.status,201,await partial.clone().text());
  assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');
  const complete=await save({shiftCloseId:'qa-complete',revenueRecord:{date:'2026-10-02',payrollBreakdown:{total:20},note:'complete'}});assert.equal(complete.status,201,await complete.clone().text());
  const after=await r.verifyAction(id);assert.equal(after.verification.result,'CONDITION_CLEARED');assert.equal(after.verification.resolutionAuthority,'CANONICAL_SERVER_REREAD');assert.equal(after.verification.causalClaim,'NONE');
  assert.ok(!after.data.businessHealthSnapshot.managementQueue.some((row:Row)=>row.managementId===id));assert.notEqual(after.verification.inputRevision,initial.verification.inputRevision);
  assert.deepEqual((await r.readHealth()).data.businessHealthSnapshot.managementTopActions,after.data.businessHealthSnapshot.managementTopActions);
 }finally{r.close()}
});
test('stock: draft inventory is not resolution; actual finalized count changes authoritative condition',async()=>{
 const r=await managementActionsFixture();try{
  const queue=(await r.readHealth()).data.businessHealthSnapshot.managementQueue as Row[];const item=queue.find(row=>row.issueKey==='stock')!;assert.ok(item);
  const id=String(item.managementId);assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');
  const post=async(body:object)=>{const response=await r.api.counts.POST(r.requestAction('/api/inventory/counts','POST',{venueId:r.venueId,...body}));assert.ok(response.ok,await response.clone().text());return response.json() as Promise<{inventory:{id:string;items:Row[]}}>};
  const created=await post({action:'create',date:'2026-10-03',scope:{type:'all'}});const inventory=created.inventory;
  await post({action:'save',id:inventory.id,items:inventory.items.map((row:Row)=>({...row,actual:8}))});
  assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');
  await post({action:'finalize',id:inventory.id});const after=await r.verifyAction(id);assert.equal(after.verification.result,'CONDITION_CLEARED');
  assert.ok(!after.data.businessHealthSnapshot.managementQueue.some((row:Row)=>row.managementId===id));assert.deepEqual((await r.readHealth()).data.businessHealthSnapshot.managementTopActions,after.data.businessHealthSnapshot.managementTopActions);
 }finally{r.close()}
});
test('foreign IDs, missing evidence and deleted object cannot certify correction',async()=>{
 const r=await managementActionsFixture();try{
  const queue=(await r.readHealth()).data.businessHealthSnapshot.managementQueue as Row[],id=String(queue.find(row=>row.issueKey==='stock')!.managementId);
  const foreign=await r.api.verifyAction.GET(r.requestAction('/api/business-health/verify?actionId='+encodeURIComponent(id.replace('health:'+r.venueId+':','health:999:'))));assert.equal(foreign.status,404);
  r.seed('bd_opening_stock_v1',[]);assert.equal((await r.verifyAction(id)).verification.result,'CANNOT_VERIFY');
  r.seed('bd_assortment_v1',{stockBalances:[],nomenclature:[]});assert.equal((await r.verifyAction(id)).verification.result,'NOT_APPLICABLE');
  const other=await r.register('phase4b-foreign@isolated.test');assert.equal((await r.api.verifyAction.GET(r.requestAction('/api/business-health/verify?actionId='+encodeURIComponent(id),'GET',undefined,other))).status,401);
 }finally{r.close()}
});
