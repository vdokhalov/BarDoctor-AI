import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';

test('compiled Worker/native D1 acquisition, current price/quantity/valuation evidence, nested RBAC and 20k retention/capacity', {timeout:120000}, async t=>{
 const r=await nativeWorkerRuntime();t.after(r.close);
 await r.put('bd_assortment_v1',{stockBalances:[],nomenclature:[{id:'qa-item',key:'qa-item',productKey:'qa-item',name:'QA item',unit:'pcs',kind:'stock',venueId:1,active:true}],recipes:[]});
 await r.put('bd_suppliers',[{id:'qa-supplier',venueId:1,name:'QA supplier',status:'active'}]);
 const document=id=>({id,venueId:1,documentType:'invoice',supplierId:'qa-supplier',supplierName:'QA supplier',date:'2026-10-01',currency:'MDL',source:'manual',paymentMethod:'unknown',total:40,items:[{id:id+'-line',name:'QA item',nomenclatureId:'qa-item',purchaseProductKey:'qa-item',quantity:2,unit:'pcs',quantityMode:'measure',unitPrice:20,lineTotal:40,category:'products',mappingSource:'manual'}]});
 const posted=await r.call('/api/purchases/confirm','POST',{venueId:1,document:document('native-x')});assert.ok(posted.ok,JSON.stringify(await posted.clone().json()));
 const ref=(kind,id,partId)=>({contractVersion:1,kind,id,venueId:1,workspaceId:1,...(partId?{partId}:{})});
 const read=async reference=>{const response=await r.call('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(reference)));const body=await response.json();assert.ok(response.ok,JSON.stringify(body));return body;};
 const stock=(await r.get('bd_assortment_v1')).stockBalances[0],key=stock.productKey??stock.key,receipt=(await r.get('bd_stock_movements'))[0];
 const basis=await read(ref('COST_BASIS',key));assert.equal(basis.evidence.projection.value,20);
 const line=await read(ref('PURCHASE_DOCUMENT','native-x','native-x-line'));assert.equal(line.evidence.projection.sourceQuantity,2);assert.equal(line.evidence.projection.normalizedAccountingUnitCost,20);
 const valuation=await read(ref('STOCK_VALUATION',key));assert.equal(valuation.evidence.projection.value,40);assert.equal(valuation.evidence.projection.evidenceComplete,false);
 const before=(await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results;
 for(const relation of line.evidence.relations)await read(relation.reference);
 assert.deepEqual((await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results,before);
 await r.db.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=1 AND account_id=2").bind('{"deny":["inventory.view"]}').run();
 const denied=await r.call('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ref('COST_BASIS',key))),'GET',undefined,'manager');assert.equal((await denied.json()).code,'ACCESS_DENIED');
 await r.put('bd_stock_movements',[...Array.from({length:19999},(_,i)=>({id:'o'+i,status:'cancelled',productKey:'unused'})),receipt]);
 const newPurchase=await r.call('/api/purchases/confirm','POST',{venueId:1,document:document('native-y')});assert.ok(newPurchase.ok,JSON.stringify(await newPurchase.clone().json()));const kept=await r.get('bd_stock_movements');assert.equal(kept.length,20000);assert.ok(kept.some(row=>row.id===receipt.id));assert.equal((await read(basis.evidence.reference)).evidence?.projection.value??(await read(ref('COST_BASIS',key))).evidence.projection.value,20);
 await r.put('bd_stock_movements',Array.from({length:20000},(_,i)=>({id:'r'+i,type:'receipt',productKey:key})));
 const capacityBefore=(await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results,auditBefore=(await r.db.prepare('SELECT * FROM audit_log ORDER BY id').all()).results;
 const refused=await r.call('/api/purchases/confirm','POST',{venueId:1,document:document('native-overflow')});assert.equal(refused.status,409);assert.equal((await refused.json()).code,'STOCK_EVIDENCE_CAPACITY_REACHED');assert.deepEqual((await r.db.prepare('SELECT * FROM domain_data ORDER BY store_key').all()).results,capacityBefore);assert.deepEqual((await r.db.prepare('SELECT * FROM audit_log ORDER BY id').all()).results,auditBefore);
 assert.equal(r.outbound(),0);
});
