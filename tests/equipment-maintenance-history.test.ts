import test from 'node:test';import assert from 'node:assert/strict';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
test('verified repair preserves maintenance date and existing maintenance history',async()=>{
 const r=await emptyMonthFixture({work:'./app/api/equipment/work-orders/route'});try{
 r.setNow('2026-10-26T12:00:00Z');const item={id:'equipment',venueId:r.venueId,name:'Тестовая техника',status:'under_repair',lastMaintenance:'2026-10-25',nextMaintenance:'2026-11-01',maintenancePolicy:{mode:'interval_days',interval:7}};
 const history={id:'old-maintenance',equipmentId:item.id,venueId:r.venueId,type:'maintenance',date:'2026-10-25',workflowStatus:'verified',workOrderId:'old-work'};
 const work={id:'repair',equipmentId:item.id,venueId:r.venueId,kind:'repair',status:'fixed',title:'Ремонт',result:'Выполнено',createdAt:'2026-10-26T10:00:00Z'};
 r.seed('bd_equipment',[item]);r.seed('bd_equipment_history',[history]);r.seed('bd_equipment_work_orders',[work]);
 const response=await r.api.work.POST(r.request(r.user,'/api/equipment/work-orders','POST',{workOrder:{...work,status:'verified',verificationNote:'Проверено'}}));assert.equal(response.status,200,await response.clone().text());
 const body=await response.json() as any;assert.equal(body.equipment[0].lastMaintenance,'2026-10-25');assert.equal(body.workOrder.kind,'repair');assert.deepEqual(body.history.find((x:any)=>x.id===history.id),history);assert.equal(body.history.find((x:any)=>x.id!==history.id).type,'inspection');
 }finally{r.close()}
});
