import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {createIngredientReconciliationMemo,reconcileTechCards} from '../lib/bardoctor/tech-card-reconciliation';
import {buildAssortmentAnalytics} from '../lib/bardoctor/assortment-analytics';
import {createCurrentCostReader} from '../lib/bardoctor/management-cost-observation';
import {createIngredientReferenceResolver,canonicalIngredientReference} from '../lib/bardoctor/ingredient-reference';

const baseline='ad0378431dfea73ded6e67c176dbfcae7ddf4f42';
test('request indexes preserve exact baseline analytics and certified costs across mixed sources',async()=>{
 const r=await lifecycleRuntime({analytics:'./lib/bardoctor/assortment-analytics',cost:'./lib/bardoctor/management-cost-observation'}, {plugins:[{name:'baseline',setup(build){build.onLoad({filter:/\/lib\/bardoctor\/.*\.ts$/},args=>({contents:execFileSync('git',['show',baseline+':lib/bardoctor/'+args.path.split('/lib/bardoctor/')[1]],{encoding:'utf8'}),loader:'ts'}));}}]});
 const oldAnalytics=r.api.analytics as unknown as {buildAssortmentAnalytics:typeof buildAssortmentAnalytics};
 const oldCost=r.api.cost as unknown as typeof import('../lib/bardoctor/management-cost-observation');
 const memo=createIngredientReconciliationMemo();
 try{for(let sample=0;sample<16;sample++){
  const scope={venueId:1,workspaceId:1,dataAccountId:1},now='2026-10-08T12:00:00Z';
  const nomenclature=Array.from({length:12},(_,i)=>({id:'n'+i,key:'p'+i,productKey:'p'+i,name:'Product '+i,unit:i%3?'pcs':'kg',unitModelVersion:4,active:true,venueId:i===11?2:1}));
  const menuItems=Array.from({length:3},(_,i)=>({id:'m'+i,name:'Menu '+i,venueId:1,active:true,consumptionMode:'RECIPE',salePrice:40,currency:'MDL'}));
  const recipes=menuItems.map((item,i)=>({id:'r'+i,menuItemId:item.id,ownerId:sample%4===1&&i===2?'m0':item.id,ownerType:'menu_item',venueId:1,status:sample%5===0?'draft':'confirmed',reviewStatus:sample%5===0?'requires_review':'approved',current:true,version:1,ingredients:[{id:'i'+i,name:sample%3?'Product '+i:'Unlinked '+i,quantity:1,unit:'pcs',...(sample%3?{nomenclatureItemId:'n'+i,purchaseProductKey:sample%4?'p'+i:'p'+(i+1),linkSource:'manual',linkConfirmedByUser:true}:{}),venueId:1}]}));
  const assortment={menuItems,recipes,nomenclature,stockBalances:[],canonicalProductAliases:[{from:'legacy',to:'p1'}],inventoryProductAliases:[{from:'cycle-a',to:'cycle-b'},{from:'cycle-b',to:'cycle-a'}],supplierProductMappings:[{id:'supplier',canonicalProductKey:'p1',sourceName:'Tea',purchaseLineIds:['line'],status:sample%2?'confirmed':'orphan'}]};
  const movements=Array.from({length:35},(_,i)=>({id:'receipt'+i,type:i%8?'receipt':'writeoff',productKey:i%6?'p'+(i%12):' p1 ',amount:i%4?10:0,unit:'pcs',costAmount:i%7?20:0,costStatus:i%5?'KNOWN_VALUE':'UNKNOWN',currency:i%9?'MDL':'EUR',date:i%6?'2026-10-01':'2026-11-01',createdAt:'2026-10-01T12:00:00Z',warehouseId:i%3?'w1':'__venue__',status:i%11?'confirmed':'cancelled',reversedAt:i%13?null:now,venueId:i%10?1:2}));
  const purchases=[{id:'doc',status:'confirmed',venueId:1,date:'2026-09-01',currency:'MDL',items:[{id:'line',name:'Tea',quantity:10,unit:'pcs',lineTotal:25,unitPrice:2.5,productKey:'p1'}]}];
  const input={assortment,purchaseDocuments:purchases,stockMovements:movements,...scope,now:new Date(now)};
  const untouched=JSON.stringify(input);
  assert.deepEqual(buildAssortmentAnalytics(input,memo),oldAnalytics.buildAssortmentAnalytics(input),'analytics sample '+sample);
  const snapshots=[['bd_assortment_v1',assortment],['bd_purchase_documents',purchases],['bd_stock_movements',movements]].map(([key,value])=>({key:String(key),dataJson:JSON.stringify(value),updatedAt:now}));
  const costInput={scope,snapshots,profileJson:JSON.stringify({currency:'MDL'}),now};
  const read=createCurrentCostReader(costInput);
  for(const item of menuItems){
   const expected=await oldCost.observeCurrentCost({...costInput,menuItemId:item.id});
   const actual=await read(item.id);assert.deepEqual(actual,expected,'certified cost '+sample+'/'+item.id);
   actual.observation.reasonCodes.push('SOURCE_INVALID');
   assert.deepEqual(await read(item.id),expected,'memo results cannot be mutated by callers');
  }
  assert.equal(JSON.stringify(input),untouched,'projection never mutates sources');
  const changedSnapshots=snapshots.map(snapshot=>snapshot.key==='bd_stock_movements'
   ? {...snapshot,updatedAt:'2026-10-08T12:01:00Z',dataJson:JSON.stringify(movements.map(movement=>({...movement,costAmount:movement.costAmount*2})))}
   : snapshot);
  const freshInput={...costInput,snapshots:changedSnapshots};
  const fresh=createCurrentCostReader(freshInput);
  assert.deepEqual(await fresh('m0'),await oldCost.observeCurrentCost({...freshInput,menuItemId:'m0'}),'fresh reader sees changed sources '+sample);
 }}finally{r.close();}
});
test('shared reconciliation memo invalidates for venue, candidates and aliases',()=>{
 const memo=createIngredientReconciliationMemo();
 const source={menuItems:[{id:'m',name:'Menu',venueId:1}],recipes:[{id:'r',ownerId:'m',menuItemId:'m',ownerType:'menu_item',venueId:1,status:'draft',ingredients:[{id:'i',name:'Tea',quantity:1,unit:'pcs',purchaseProductKey:'legacy'}]}],nomenclature:[{id:'n',name:'Tea',productKey:'p',unit:'pcs',active:true,venueId:1}],canonicalProductAliases:[{from:'legacy',to:'p'}]};
 const variants=[
  {assortment:source,venueId:1},
  {assortment:source,venueId:2},
  {assortment:{...source,nomenclature:[{...source.nomenclature[0],productKey:'other',unit:'kg'}]},venueId:1},
  {assortment:{...source,canonicalProductAliases:[{from:'legacy',to:'other'}]},venueId:1},
  {assortment:source,venueId:1},
 ];
 for(const variant of variants){
  const input={...variant,now:new Date('2026-10-08T12:00:00Z')};
  assert.deepEqual(reconcileTechCards(input,memo),reconcileTechCards(input),'memo must equal a fresh computation after scope/source changes');
 }
});
test('alias cycles preserve starting identity and fresh readers see mutations',()=>{
 const source={nomenclature:[{id:'n',productKey:'p'}],canonicalProductAliases:[{from:'a',to:'b'},{from:'b',to:'a'}]};
 const read=createIngredientReferenceResolver(source);
 assert.equal(canonicalIngredientReference({nomenclature:[null]},'missing'),'missing');
 assert.equal(read.canonical('a'),'a');assert.equal(read.canonical('b'),'b');
 assert.equal(read.canonical('n'),'p');source.nomenclature[0].productKey='new';
 assert.equal(canonicalIngredientReference(source,'n'),'new');
 assert.equal(read.canonical('n'),'p');
});
