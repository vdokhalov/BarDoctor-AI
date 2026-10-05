import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeWorkerRuntime} from './helpers/native-worker-runtime.mjs';
test('compiled Worker Doctor contracts are read-only, deterministic and reauthorized with zero outbound AI calls',{timeout:120000},async t=>{
 const r=await nativeWorkerRuntime();t.after(r.close);
 for(const key of ['bd_tasks','bd_action_tasks','bd_decisions','bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents','bd_cases','bd_finance_expenses','bd_payroll_entries','bd_purchase_documents','bd_stock_movements','bd_opening_stock_v1','bd_inventory_snapshots'])await r.put(key,[]);
 await r.put('bd_assortment_v1',{menuItems:[],recipes:[],nomenclature:[],stockBalances:[]});
 await r.put('bd_tasks',[{id:'qa-task',title:'Проверить безопасность',priority:'critical',status:'in_progress',approvalStatus:'approved',deadline:'2026-01-01'}]);
 await r.put('bd_cases',[{id:'qa-case',title:'Проверить critical',priority:'critical',status:'open'}]);
 const before=(await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results;
 const health=await(await r.call('/api/business-health')).json();
 for(const q of ['attention','cost','stock','shifts','expenses','tasks','next']){
  const a=await r.call('/api/ai/curated?question='+q+'&venueId=1');assert.equal(a.status,200);assert.match(a.headers.get('Cache-Control'),/no-store/);const value=(await a.json()).data;
  assert.equal(value.question.id,q);assert.equal(value.scope.venueId,1);assert.deepEqual(value.canonicalPriorityIds,health.data.businessHealthSnapshot.managementQueue.slice(0,3).map(row=>String(row.managementId??row.recommendationId??row.linkedTaskId??row.issueKey)));
  const b=(await(await r.call('/api/ai/curated?question='+q)).json()).data;assert.deepEqual(b.facts,value.facts);assert.deepEqual(b.nextActions,value.nextActions);
 }
 assert.deepEqual((await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results,before);assert.equal(r.outbound(),0);
 assert.equal((await r.call('/api/ai/curated?question=profit')).status,400);assert.equal((await r.call('/api/ai/curated?question=stock&actionId=forged')).status,400);assert.equal((await r.call('/api/ai/curated?question=attention&venueId=999')).status,404);
 assert.equal((await r.call('/api/ai/curated?question=expenses','GET',undefined,'manager')).status,403);
 await r.db.prepare("UPDATE venue_memberships SET role='manager',permissions_json='{\"deny\":[\"tasks.view\"]}' WHERE account_id=1").run();assert.equal((await r.call('/api/ai/curated?question=tasks')).status,403);
 await r.db.prepare("UPDATE venue_memberships SET status='revoked' WHERE account_id=1").run();assert.equal((await r.call('/api/ai/curated?question=attention')).status,401);
});
