import test from 'node:test';
import assert from 'node:assert/strict';
import {costFixture} from './helpers/management-cost-fixture';
import {seedCorrectionFixture} from '../scripts/qa/phase4a-correction-fixture.mjs';
import type {CostEpisodeV1} from '../lib/bardoctor/management-cost-contracts';
type Json=Record<string,unknown>;
type ApiBody={episode:CostEpisodeV1&{targets:Record<string,string>};product:{id:string;key:string;costStatus:string;manualReferencePrice:{amount:number}};matches:{name:string}[];taxonomy:{sections:{id:string;active:boolean}[];categories:{id:string;parentId:string;active:boolean}[]}};
const body=async(response:Response):Promise<ApiBody>=>{assert.ok(response.ok,await response.clone().text());return response.json()};
for(const scenario of ['citrus-empty','mint-missing'])test('working venue correction: '+scenario,async()=>{
 const r=await costFixture();try{
  const fixture=seedCorrectionFixture(r,scenario);
  const historical=r.read('bd_sales_documents'),neighbor=r.read('bd_assortment_v1').menuItems.find((row:Json)=>row.id==='water');
  const initial=await body(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{menuItemId:fixture.itemId})));
  const id=initial.episode.signalId;assert.equal(initial.episode.before.value,null);
  const lookup=await body(await r.api.quickCreate.GET(r.request('/api/nomenclature/quick-create?q='+encodeURIComponent(fixture.ingredientName))));assert.ok(!lookup.matches.some((p:Json)=>p.name===fixture.ingredientName));
  const section=lookup.taxonomy.sections.find((s:Json)=>s.active);assert.ok(section);const category=lookup.taxonomy.categories.find((c:Json)=>c.active&&c.parentId===section.id);assert.ok(category);
  const created=await body(await r.api.products.POST(r.request('/api/inventory/products','POST',{action:'create',kind:'stock',itemType:'ingredient',name:fixture.ingredientName,unit:'pcs',sectionId:section.id,taxonomyCategoryId:category.id,purchasePrice:777,confirmSimilar:true})));
  assert.equal(created.product.costStatus,'UNKNOWN');assert.equal(created.product.manualReferencePrice.amount,777);
  const current=r.read('bd_assortment_v1');
  let recipe=current.recipes.find((c:Json)=>c.menuItemId===fixture.itemId);
  if(!recipe){recipe={id:fixture.itemId+'-recipe',menuItemId:fixture.itemId,ownerId:fixture.itemId,ownerType:'menu_item',venueId:r.venueId,version:1,current:true,ingredients:[]};current.recipes.push(recipe)}
  Object.assign(recipe,{status:'confirmed',reviewStatus:'approved',ingredients:[{id:'correction-ingredient',name:fixture.ingredientName,quantity:1,unit:'pcs',nomenclatureItemId:created.product.id,purchaseProductKey:created.product.key,linkConfirmedByUser:true,linkStatus:'linked',venueId:r.venueId}]});
  await body(await r.api.store.PUT(r.request('/api/store/bd_assortment_v1','PUT',{data:current}),{params:Promise.resolve({key:'bd_assortment_v1'})} as never));
  const unresolved=await body(await r.verify(id));
  assert.equal(unresolved.episode.condition,'ACTIVE');assert.equal(unresolved.episode.latest.value,null);assert.equal(unresolved.episode.verificationResult,null);assert.deepEqual(unresolved.episode.latest.reasonCodes,['PRICE_UNKNOWN']);
  assert.deepEqual(unresolved.episode.before,initial.episode.before);
  const blocker=unresolved.episode.latest.blockingIngredients![0];assert.equal(blocker.name,fixture.ingredientName);assert.equal(blocker.productKey,created.product.key);assert.equal(blocker.reason,'PRICE_UNKNOWN');
  const target=new URL(unresolved.episode.targets.purchase,'https://isolated.test');assert.equal(target.pathname,'/suppliers');for(const [k,v]of Object.entries({venueId:String(r.venueId),signalId:id,menuItemId:fixture.itemId,productKey:created.product.key,returnTo:'health',create:'1'}))assert.equal(target.searchParams.get(k),v);
  const ref=unresolved.episode.latest.evidence.find((v:Json)=>v.id==='bd_assortment_v1.nomenclature');assert.ok(ref);assert.equal(ref.partId,created.product.id);assert.ok(ref.expectedRevision);
  await body(await r.api.opening.POST(r.request('/api/inventory/opening','POST',{action:'confirm',id:'qa-opening-estimate',venueId:r.venueId,inputs:[{rowId:'r1',productKey:created.product.key,quantity:1,unit:'pcs',openingUnitCost:5,costSource:'QA estimate'}],selectedRowIds:['r1']})));
  assert.equal((await body(await r.verify(id))).episode.condition,'ACTIVE');
  const document={id:'correction-purchase',venueId:r.venueId,supplierId:fixture.supplierId,supplierName:fixture.supplierName,documentType:'invoice',date:'2026-10-04',currency:'RUB',total:fixture.purchaseTotal,costStatus:'KNOWN',items:[{id:'correction-purchase-line',name:fixture.ingredientName,nomenclatureItemId:created.product.id,purchaseProductKey:created.product.key,quantity:fixture.purchaseQuantity,unit:'pcs',unitPrice:fixture.expectedCost,lineTotal:fixture.purchaseTotal,costStatus:'KNOWN'}]};
  // A price list is saved, but remains a proposal rather than cost authority.
  await body(await r.api.confirm.POST(r.request('/api/purchases/confirm','POST',{document:{...document,id:'correction-price-list',documentType:'price_list'}})));
  assert.equal((await body(await r.verify(id))).episode.condition,'ACTIVE');
  await body(await r.api.confirm.POST(r.request('/api/purchases/confirm','POST',{document})));
  const result=(await body(await r.verify(id))).episode;assert.equal(result.condition,'VERIFIED_RESOLVED');assert.ok(result.verificationResult);assert.equal(result.verificationResult.after.value,fixture.expectedCost);assert.equal(result.verificationResult.before.value,null);assert.equal(result.verificationResult.resolutionAuthority,'CANONICAL_SERVER_REREAD');
  assert.deepEqual((await body(await r.detail(id))).episode.verificationResult,result.verificationResult);assert.deepEqual((await body(await r.verify(id))).episode.verificationResult,result.verificationResult);
  assert.deepEqual(r.read('bd_sales_documents'),historical);assert.deepEqual(r.read('bd_assortment_v1').menuItems.find((row:Json)=>row.id==='water'),neighbor);
 }finally{r.close()}
});
test('correction blockers distinguish missing nomenclature/link from a price gap, without new price-only signals',async()=>{
 const r=await costFixture();try{
  const first=await body(await r.evaluate());const corrected=r.correct();corrected.recipes[0].ingredients[0].nomenclatureItemId='missing';corrected.recipes[0].ingredients[0].purchaseProductKey='missing';corrected.recipes[0].ingredients[0].productKey='missing';r.seed('bd_assortment_v1',corrected);
  const active=(await body(await r.verify(first.episode.signalId))).episode;assert.equal(active.condition,'ACTIVE');assert.equal(active.latest.blockingIngredients![0].reason,'NOMENCLATURE_MISSING');assert.equal(active.targets.purchase,undefined);
  const notLinked=structuredClone(corrected);Object.assign(notLinked.recipes[0].ingredients[0],{nomenclatureItemId:undefined,purchaseProductKey:undefined,productKey:undefined});r.seed('bd_assortment_v1',notLinked);
  const unmapped=(await body(await r.verify(first.episode.signalId))).episode;assert.equal(unmapped.condition,'ACTIVE');assert.equal(unmapped.latest.blockingIngredients![0].reason,'LINK_MISSING');assert.equal(unmapped.targets.purchase,undefined);
 }finally{r.close()}
});
test('confirming one ingredient advances the next action, never resolves other unknown operands',async()=>{
 const r=await costFixture();try{
  const id=(await body(await r.evaluate())).episode.signalId;
  r.seed('bd_suppliers',[{id:'qa-working-supplier',name:'QA действующий поставщик',venueId:r.venueId,status:'active'}]);
  const corrected=r.correct();corrected.nomenclature.push(...['a','b'].map(key=>({id:'nom-'+key,key:'product:'+key,productKey:'product:'+key,name:'QA '+key,unit:'pcs',unitModelVersion:4,venueId:r.venueId,active:true})));
  corrected.recipes[0].ingredients=['a','b'].map(key=>({id:'ingredient-'+key,name:'QA '+key,quantity:1,unit:'pcs',nomenclatureItemId:'nom-'+key,purchaseProductKey:'product:'+key,linkConfirmedByUser:true,linkStatus:'linked',venueId:r.venueId}));r.seed('bd_assortment_v1',corrected);
  const before=(await body(await r.verify(id))).episode;assert.equal(before.latest.blockingIngredientsTotal,2);assert.equal(new URL(before.targets.purchase,'https://qa.test').searchParams.get('productKey'),'product:a');
  const confirm=async(key:string,price:number)=>body(await r.api.confirm.POST(r.request('/api/purchases/confirm','POST',{document:{id:'qa-multiple-'+key,venueId:r.venueId,supplierId:'qa-working-supplier',supplierName:'QA действующий поставщик',status:'confirmed',documentType:'invoice',date:'2026-10-04',currency:'RUB',total:price,items:[{id:'line-'+key,name:'QA '+key,nomenclatureItemId:'nom-'+key,purchaseProductKey:'product:'+key,quantity:1,unit:'pcs',unitPrice:price,lineTotal:price,costStatus:'KNOWN'}]}})));
  await confirm('a',7);const partial=(await body(await r.verify(id))).episode;assert.equal(partial.condition,'ACTIVE');assert.equal(partial.verificationResult,null);assert.equal(partial.latest.blockingIngredientsTotal,1);assert.equal(partial.latest.blockingIngredients![0].name,'QA b');assert.equal(new URL(partial.targets.purchase,'https://qa.test').searchParams.get('productKey'),'product:b');
  await confirm('b',11);const resolved=(await body(await r.verify(id))).episode;assert.equal(resolved.condition,'VERIFIED_RESOLVED');assert.equal(resolved.verificationResult!.after.value,18);assert.equal(resolved.signalId,id);
 }finally{r.close()}
});
