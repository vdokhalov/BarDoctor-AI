import test from 'node:test';
import assert from 'node:assert/strict';
import {rankManagementSignals} from '../lib/bardoctor/business-intelligence';
import {businessHealthActionTarget} from '../lib/bardoctor/business-health-snapshot';
import {managementActionContext} from '../lib/bardoctor/client/management-actions';
const now=new Date('2026-10-03T12:00:00Z');
const blocker={managementId:'blocker',priority:'critical',issueKey:'operational-blocker'};
const task={managementId:'task',priority:'critical',taskDeadlineDate:'2026-10-02'};
const loss={managementId:'loss',financialImpact:'high',businessWideImpact:true};
const ids=(values:Record<string,unknown>[])=>rankManagementSignals(values,now).map(row=>row.managementId);
for(const [name,input,expected] of [
 ['blocker + loss',[loss,blocker],['blocker','loss']],
 ['overdue critical task + loss',[loss,task],['task','loss']],
 ['blocker + overdue task',[blocker,task],['task','blocker']],
 ['blocker + overdue task + loss',[loss,blocker,task],['task','blocker','loss']],
 ['no critical',[{managementId:'stock',managementActionable:true},loss],['loss','stock']],
] as const)test('canonical policy: '+name,()=>{assert.deepEqual(ids([...input]),expected);assert.deepEqual(ids([...input].reverse()),expected)});
test('equal severity and deadline have a stable identity tie break',()=>{
 const rows=['c','a','b'].map(managementId=>({managementId,priority:'critical'}));
 for(const permutation of [rows,[rows[2],rows[0],rows[1]],rows.toReversed()])assert.deepEqual(ids(permutation),['a','b','c']);
 assert.match(String(rankManagementSignals(rows,now)[0].managementPriorityReason),/критический/);
});
test('generic critical cannot invent an equipment destination even from a stored target',()=>{
 for(const context of [{},{priority:'critical'},{target:{path:'/equipment',label:'Equipment'}},{equipmentHint:'maybe'}])assert.equal(businessHealthActionTarget('operational-blocker',context),null);
 assert.equal(businessHealthActionTarget('critical',{priority:'critical',target:{path:'/equipment/unknown',label:'Equipment'}}),null);
 assert.equal(businessHealthActionTarget('operational-blocker',{caseId:'case/1'})?.path,'/cases/case%2F1');
 assert.equal(businessHealthActionTarget('equipment-recurring')?.path,'/equipment');
});
test('raw URL preserves encoded stock identity exactly once and rejects foreign/ambiguous context',()=>{
 const id='health:7:stock:'+encodeURIComponent(JSON.stringify(['product:стаканы','warehouse/A','pcs']));
 const search=new URLSearchParams({venueId:'7',healthAction:id,returnTo:'health'}).toString();
 assert.deepEqual(managementActionContext(search,7),{id,active:true});
 assert.equal(managementActionContext(search,8).active,false);
 assert.equal(managementActionContext(search+'&venueId=8',7).active,false);
 assert.equal(managementActionContext(search+'&healthAction=other',7).active,false);
});
