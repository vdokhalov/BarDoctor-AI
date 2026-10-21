import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeConsumableUnit, openConsumableDraft, saveConsumableDraft } from '../lib/bardoctor/internal-consumable-editor';
const item = {id:'existing',name:' Кофе ',unit:'g',currentStock:-1250,minimumStock:2000,onOrder:500,packageAmount:1000,createdAt:'original',purchaseProductKey:'coffee'};
test('signed stock and all quantities survive kg save/reopen without changing physical amount',()=>{
 const draft=changeConsumableUnit(item,'kg'); assert.equal(draft.currentStock,-1.25);assert.equal(draft.minimumStock,2);assert.equal(draft.onOrder,.5);assert.equal(draft.packageAmount,1);
 const saved=saveConsumableDraft(draft,'now');assert.equal(saved.currentStock,-1250);assert.equal(saved.unit,'g');assert.equal(saved.displayUnit,'kg');assert.equal(saved.id,item.id);assert.equal(saved.createdAt,'original');assert.equal(saved.purchaseProductKey,'coffee');
 assert.deepEqual(openConsumableDraft(saved),{...draft,name:'Кофе',displayUnit:'kg',updatedAt:'now'});
});
test('litres convert every field and repeated opens do not compound conversion',()=>{
 const draft={...item,unit:'ml',displayUnit:'l'};const opened=openConsumableDraft(draft);assert.equal(opened.currentStock,-1.25);
 let saved=saveConsumableDraft(opened,'now');for(let i=0;i<5;i++)saved=saveConsumableDraft(openConsumableDraft(saved),'now');assert.equal(saved.currentStock,-1250);assert.equal(saved.onOrder,500);
});
test('pcs signed and zero known, input object unchanged',()=>{const draft={...item,unit:'pcs',currentStock:0};const copy=structuredClone(draft);assert.equal(saveConsumableDraft(draft).currentStock,0);assert.deepEqual(copy,draft);assert.equal(saveConsumableDraft({...draft,currentStock:-3}).currentStock,-3)});
test('invalid quantities and negative safety/order/package rejected, not silently coerced',()=>{for(const key of ['currentStock','minimumStock','onOrder','packageAmount'])for(const bad of ['', 'oops',Infinity])assert.throws(()=>saveConsumableDraft({...item,[key]:bad}));for(const key of ['minimumStock','onOrder','packageAmount'])assert.throws(()=>saveConsumableDraft({...item,[key]:-1}));});
test('incompatible dimensions cannot silently relabel existing stock; empty item can choose unit',()=>{assert.throws(()=>changeConsumableUnit(item,'l'));assert.throws(()=>changeConsumableUnit(item,'pcs'));assert.equal(changeConsumableUnit({...item,currentStock:0,minimumStock:0,onOrder:0,packageAmount:0},'l').unit,'l')});
test('existing kg/l rows do not get double multiplied and comma decimal accepted',()=>{for(const [unit,base] of [['kg','g'],['l','ml']]){const saved=saveConsumableDraft(openConsumableDraft({...item,unit,currentStock:'-1,25'}));assert.equal(saved.currentStock,-1250);assert.equal(saved.unit,base);}});
