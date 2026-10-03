import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';
const fixture=JSON.parse(readFileSync('tests/fixtures/financial-reconciliation-phase7.json','utf8'));
const scoped=value=>Array.isArray(value)?value.map(scoped):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,key==='venueId'?1:scoped(value)])):value;
test('Phase3A.8 compiled Worker/native D1 coherent close, stale revisions, frozen provenance, native analytics and nested RBAC', {timeout:120000},async t=>{
 const r=await nativeWorkerRuntime();t.after(r.close);
 await r.db.prepare('UPDATE accounts SET restaurant_json=? WHERE id=1').bind(JSON.stringify({currency:'MDL',timezone:'UTC',workingDays:{1:false,2:false,3:true,4:false,5:false,6:false,7:false},trackingStartDate:'2026-09-02'})).run();
 for(const [key,value]of Object.entries({bd_finance_revenue:fixture.revenues,bd_sales_events_v1:fixture.events,bd_stock_movements:fixture.movements,bd_operational_reports_v1:[{id:'op',venueId:1,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:90}}],bd_finance_expenses:[{id:'rent',date:'2026-09-02',category:'rent',amount:30,currency:'MDL'}],bd_inventory_snapshots:[{id:'open',date:'2026-09-01',total:600,sections:{bar:600},currency:'MDL'},{id:'end',date:'2026-10-01',total:324,sections:{bar:324},currency:'MDL'}],bd_payroll_entries:[],bd_finance_gap_reasons:['2026-09-09','2026-09-16','2026-09-23','2026-09-30'].map(date=>({id:date,date,resolved:true}))}))await r.put(key,scoped(value));
 const read=async()=>{const response=await r.call('/api/month-close?monthKey=2026-09');assert.equal(response.status,200);return response.json();};const a=await read();assert.equal(a.eligible,true,JSON.stringify(a));
 await r.put('bd_payroll_entries',[{id:'bonus',date:'2026-09-02',amount:10,currency:'MDL',type:'bonus'}]);assert.equal((await r.call('/api/month-close','POST',{monthKey:'2026-09',previewRevision:a.previewRevision})).status,409);
 const p=await read(),closed=await r.call('/api/month-close','POST',{monthKey:'2026-09',previewRevision:p.previewRevision});assert.equal(closed.status,200,JSON.stringify(await closed.clone().json()));assert.equal((await read()).evidenceStatus,'VERIFIED');assert.equal((await read()).closing.snapshot.finalProfit,314);
 const event=fixture.events.find(event=>event.status==='POSTED');await r.put('bd_assortment_v1',{menuItems:[{id:event.batch.lines[0].menuItemId,name:'Renamed accepted menu',venueId:1,active:true,salePrice:60,currency:'MDL'}],recipes:[]});
 const overview=await(await r.call('/api/assortment/overview?period=2026-09')).json();assert.equal(overview.analytics.menuItems[0].sales.quantity,20);assert.equal(overview.analytics.menuItems[0].sales.costOfGoods,720);assert.equal(overview.analytics.economics.revenue,1200);
 await r.db.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=1 AND account_id=2").bind('{"deny":["payroll.view","shifts.view"]}').run();assert.equal((await r.call('/api/month-close?monthKey=2026-09','GET',undefined,'manager')).status,403);assert.equal((await r.call('/api/assortment/overview','GET',undefined,'manager')).status,403);
 assert.equal((await r.call('/api/month-close?monthKey=2026-09&workspaceId=999')).status,404);assert.equal(r.outbound(),0);
});
