import test from 'node:test';import assert from 'node:assert/strict';
import {consumableNeeds} from '../lib/bardoctor/consumable-needs';
import {buildAssortmentAnalytics} from '../lib/bardoctor/assortment-analytics';
const item={id:'napkins',name:'Салфетки',unit:'pcs',currentStock:2,minimumStock:10,onOrder:3,packageAmount:0,active:true};
for(const [currentStock,onOrder,expected] of [[0,0,10],[2,0,8],[12,0,0],[2,3,5],[2,8,0],[2,20,0],[-2,3,9]])test(`minimum 10, stock ${currentStock}, ordered ${onOrder} => ${expected}`,()=>{const r=consumableNeeds([{...item,currentStock,onOrder}]);assert.equal(r.rows[0]?.shortage??0,expected);assert.equal(r.rows[0]?.recommendedAmount??0,expected);assert.equal(r.calculated,1)});
test('round up by explicit package, normalize kg/l consistently; no invented package',()=>{
 assert.equal(consumableNeeds([{...item,packageAmount:4}]).rows[0].recommendedAmount,8);
 for(const unit of ['kg','l']){const r=consumableNeeds([{...item,unit,currentStock:0.2,minimumStock:1,onOrder:0.3,packageAmount:0.2}]).rows[0];assert.equal(r.shortage,500);assert.equal(r.recommendedAmount,600);assert.equal(r.unit,unit==='kg'?'g':'ml');}
});
test('missing minimum, unknown stock/order/unit and archived rows do not produce false recommendations',()=>{
 for(const change of [{minimumStock:undefined},{minimumStock:0},{currentStock:null},{onOrder:'bad'},{onOrder:-1},{unit:'box'},{currentStock:true}]){const r=consumableNeeds([{...item,...change}]);assert.equal(r.rows.length,0);assert.ok(r.issues.length);}
 assert.equal(consumableNeeds([{...item,active:false}]).issues.length,0);
});
test('current analytics includes consumables without menu/sales and preserves venue isolation and covered state',()=>{
 const run=(items:any[],purchaseDocuments:any[]=[])=>buildAssortmentAnalytics({venueId:1,assortment:{internalItems:items},purchaseDocuments,now:new Date('2026-10-25T12:00:00Z')});
 const base=run([item]);assert.equal(base.needs.rows[0].shortage,5);assert.equal(base.needs.rows[0].recommendedAmount,5);assert.equal(base.needs.forecastStatus,'ready');assert.equal(base.needs.issues.length,0);
 assert.equal(run([{...item,venueId:2}]).needs.rows.length,0);assert.equal(run([{...item,onOrder:8}]).needs.forecastStatus,'ready');
 for(const status of ['draft','cancelled','received','confirmed']){const r=run([item],[{id:'document',venueId:1,status,date:'2026-10-25',items:[{name:'Салфетки',quantity:100,unit:'pcs'}]}]);assert.equal(r.needs.rows[0].shortage,5,'documents are not added to the manual on-order amount');}
 assert.deepEqual(item,{id:'napkins',name:'Салфетки',unit:'pcs',currentStock:2,minimumStock:10,onOrder:3,packageAmount:0,active:true});
});
