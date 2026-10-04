import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeWorkerRuntime} from './helpers/native-worker-runtime.mjs';
test('Phase4A compiled Worker + native D1: canonical correction, CAS persistence, identity, read-only reload, recurrence and security',{timeout:120000},async t=>{
 const r=await nativeWorkerRuntime();t.after(r.close);
 const item={id:'water',venueId:1,active:true,name:'Isolated QA water',consumptionMode:'RECIPE',salePrice:50,currency:'MDL',type:'composite'};
 const assortment={menuItems:[item],recipes:[{id:'water-recipe',venueId:1,menuItemId:'water',ownerId:'water',ownerType:'menu_item',status:'draft',reviewStatus:'requires_review',version:1,current:true,ingredients:[]}],nomenclature:[{id:'nom-water',venueId:1,key:'water-key',productKey:'water-key',name:'QA water',unit:'pcs',unitModelVersion:4,active:true}],stockBalances:[]};
 await r.put('bd_assortment_v1',assortment);await r.put('bd_purchase_documents',[]);await r.put('bd_stock_movements',[{id:'receipt-water',venueId:1,type:'receipt',date:'2026-10-01',createdAt:'2026-10-01T12:00:00Z',productKey:'water-key',productName:'QA water',amount:1,unit:'pcs',costAmount:5,costStatus:'KNOWN',currency:'MDL',sourceDocumentId:'purchase-water',sourceLineId:'line-water',status:'active'}]);
 const evaluate=async()=>{const response=await r.call('/api/management/cost-signals/evaluate','POST',{menuItemId:'water'});assert.equal(response.status,200,await response.clone().text());return response.json()};
 const before=await evaluate(),id=before.episode.signalId;assert.equal(before.episode.before.value,null);assert.equal((await evaluate()).episode.signalId,id);
 const corrected=structuredClone(assortment);Object.assign(corrected.recipes[0],{status:'confirmed',reviewStatus:'approved',ingredients:[{id:'ingredient-water',venueId:1,name:'QA water',nomenclatureItemId:'nom-water',productKey:'water-key',purchaseProductKey:'water-key',quantity:1,unit:'pcs'}]});
 const saved=await r.call('/api/store/bd_assortment_v1','PUT',{data:corrected});assert.equal(saved.status,200,await saved.clone().text());
 const check=await r.call('/api/management/cost-signals/'+encodeURIComponent(id)+'/verify','POST',{trigger:'ACCEPTED_SAVE'});assert.equal(check.status,200,await check.clone().text());const result=await check.json();assert.equal(result.episode.condition,'VERIFIED_RESOLVED');assert.equal(result.episode.verificationResult.after.value,5);
 const storedBefore=await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all();const read=await(await r.call('/api/management/cost-signals/'+encodeURIComponent(id))).json();assert.deepEqual(read.episode.verificationResult,result.episode.verificationResult);assert.deepEqual(await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),storedBefore);
 await r.put('bd_assortment_v1',assortment);const next=await evaluate();assert.equal(next.episode.generation,2);assert.equal(next.episode.previousEpisodeId,id);assert.equal((await(await r.call('/api/management/cost-signals/'+encodeURIComponent(id))).json()).episode.condition,'VERIFIED_RESOLVED');
 const bulk=await(await r.call('/api/store')).json();assert.ok(Object.keys(bulk.entries).every(key=>!key.startsWith('__bd_p4a')));
 assert.equal((await r.call('/api/management/cost-signals?venueId=999')).status,404);await r.db.prepare('UPDATE venue_memberships SET permissions_json=? WHERE account_id=2').bind('{"deny":["inventory.view"]}').run();assert.equal((await r.call('/api/management/cost-signals','GET',undefined,'manager')).status,403);
 assert.equal(r.outbound(),0);
});
