import assert from 'node:assert/strict';
import test from 'node:test';
import {storeRuntime} from './helpers/store-runtime';
import {reconcileTechCards} from '../lib/bardoctor/tech-card-reconciliation';
function fixture() {
 const a={id:'grain',key:'grain-key',productKey:'grain-key',name:'Grain',unit:'kg',unitModelVersion:4,venueId:901,active:true};
 const b={...a,id:'cookie',key:'cookie-key',productKey:'cookie-key',name:'Cookie',unit:'pcs'};
 return {menuItems:[{id:'menu',name:'QA',consumptionMode:'RECIPE',active:true,venueId:901}],recipes:[{id:'recipe',menuItemId:'menu',ownerId:'menu',venueId:901,status:'draft',current:true,version:1,ingredients:[{id:'line',name:'Grain',quantity:0.04,unit:'kg',nomenclatureItemId:a.id,productKey:a.key,purchaseProductKey:a.key,linkStatus:'linked',resolutionStatus:'linked_ready',linkSource:'manual',linkConfirmedByUser:true}]}],nomenclature:[a,b],stockBalances:[{...a,current:10},{...b,current:10}]};
}
test('production reproduction: draft PUT must preserve conflicting references until explicit repair',async()=>{
 const rt=await storeRuntime(901);try{
 const before=fixture();rt.seed('bd_assortment_v1',before);
 const changed=structuredClone(before);Object.assign(changed.recipes[0].ingredients[0],{productKey:'cookie-key',purchaseProductKey:'cookie-key'});
 const saved=await rt.put('bd_assortment_v1',changed,'QA conflicting draft');assert.equal(saved.status,200,JSON.stringify(saved.body));
 const data=(await rt.get('bd_assortment_v1')).body.data as ReturnType<typeof fixture> & {techCardIngredientAliases: unknown[]};
 const line=data.recipes[0].ingredients[0];assert.equal(line.nomenclatureItemId,'grain');assert.equal(line.productKey,'cookie-key');assert.equal(line.purchaseProductKey,'cookie-key');assert.equal(line.linkStatus,'ambiguous');assert.notEqual(line.resolutionStatus,'linked_ready');assert.equal(data.techCardIngredientAliases.length,0);
 const repaired=structuredClone(data);Object.assign(repaired.recipes[0].ingredients[0],{productKey:'grain-key',purchaseProductKey:'grain-key'});
 assert.equal((await rt.put('bd_assortment_v1',repaired,'Explicit selection')).status,200);
 const read=(await rt.get('bd_assortment_v1')).body.data as ReturnType<typeof fixture> & {techCardIngredientAliases: unknown[]};
 assert.equal(read.recipes[0].ingredients[0].nomenclatureItemId,'grain');assert.equal(read.recipes[0].ingredients[0].productKey,'grain-key');assert.equal(read.recipes[0].ingredients[0].linkStatus,'linked');assert.deepEqual(read.stockBalances,before.stockBalances);assert.equal(read.recipes.length,1);
 }finally{rt.close()}
});
for(const field of ['productKey','purchaseProductKey'] as const)test('reconciliation does not hide disagreement in '+field,()=>{
 const data=fixture();data.recipes[0].ingredients[0][field]='cookie-key';
 const result=reconcileTechCards({assortment:data,venueId:901}).assortment as ReturnType<typeof fixture> & {techCardIngredientAliases: unknown[]};
 assert.equal(result.recipes[0].ingredients[0].nomenclatureItemId,'grain');assert.equal(result.recipes[0].ingredients[0][field],'cookie-key');assert.equal(result.recipes[0].ingredients[0].linkStatus,'ambiguous');assert.equal(result.techCardIngredientAliases.length,0);
});
test('canonical aliases and a single explicit reference remain supported',()=>{
 const data=fixture();data.recipes[0].ingredients[0].productKey='old-grain';
 const result=reconcileTechCards({assortment:{...data,canonicalProductAliases:[{from:'old-grain',to:'grain-key'}]},venueId:901}).assortment as ReturnType<typeof fixture>;
 assert.equal(result.recipes[0].ingredients[0].linkStatus,'linked');assert.equal(result.recipes[0].ingredients[0].nomenclatureItemId,'grain');
});
test('unrelated legacy conflict is preserved while another recipe is repaired',async()=>{
 const rt=await storeRuntime(901);try{
 const data=fixture();const legacy=structuredClone(data.recipes[0]);legacy.id='legacy';legacy.menuItemId='legacy-owner';legacy.ownerId='legacy-owner';legacy.ingredients[0].productKey='cookie-key';legacy.ingredients[0].purchaseProductKey='cookie-key';data.recipes.push(legacy);
 rt.seed('bd_assortment_v1',data);const after=structuredClone(data);after.recipes[0].ingredients[0].quantity=0.05;
 assert.equal((await rt.put('bd_assortment_v1',after,'Current recipe only')).status,200);
 const persisted=(await rt.get('bd_assortment_v1')).body.data as ReturnType<typeof fixture>;
 assert.deepEqual(persisted.recipes.find(x=>x.id==='legacy'),legacy);
 }finally{rt.close()}
});
test('conflicted recipe cannot be confirmed through the store handler',async()=>{
 const rt=await storeRuntime(901);try{
 const data=fixture();rt.seed('bd_assortment_v1',data);const bytes=rt.bytes();const after=structuredClone(data);after.recipes[0].status='confirmed';after.recipes[0].ingredients[0].productKey='cookie-key';after.recipes[0].ingredients[0].purchaseProductKey='cookie-key';
 const saved=await rt.put('bd_assortment_v1',after,'Invalid confirmation');assert.equal(saved.status,422);assert.equal(rt.bytes(),bytes);
 }finally{rt.close()}
});
