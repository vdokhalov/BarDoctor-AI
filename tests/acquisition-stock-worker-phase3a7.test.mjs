import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';

test('RCA A+B exact Worker/native D1: named-warehouse proof, real advancing clock and stale acquisition bindings', {timeout:120000}, async t => {
 const r=await nativeWorkerRuntime();t.after(r.close);
 const snap=async()=>({domain:(await r.db.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()).results,audit:(await r.db.prepare('SELECT * FROM audit_log ORDER BY id').all()).results});
 // The manually inserted manager account retains owns_venue=1 but has no own
 // venue. Exercise expected auth initialization before measuring evidence reads.
 const cold=await snap(),managerAccount=await r.db.prepare('SELECT owns_venue FROM accounts WHERE id=2').first();assert.equal(managerAccount.owns_venue,1);
 assert.equal(await r.db.prepare('SELECT id FROM venues WHERE data_account_id=2').first(),null);
 const bootstrap=async role=>{const response=await r.call('/api/auth/bootstrap','POST',undefined,role),body=await response.json();assert.ok(response.ok,`Bootstrap ${role}: HTTP ${response.status} ${JSON.stringify(body)}`);assert.equal(body.activeVenueId,1);assert.equal(body.activeWorkspaceId,1);assert.equal(body.role,role);assert.ok(body.venues.some(venue=>venue.id===1&&venue.workspaceId===1&&venue.role===role&&venue.status==='active'));return body;};
 for(const role of ['owner','manager'])await bootstrap(role);
 const initialized=await snap(),created=initialized.domain.filter(row=>!cold.domain.some(previous=>previous.id===row.id));
 assert.deepEqual(created.filter(row=>row.account_id===2).map(row=>row.store_key).sort(),['bd_assortment_v1','bd_inventory_snapshots','bd_purchase_documents','bd_stock_movements','bd_suppliers']);
 assert.ok(await r.db.prepare('SELECT id FROM venues WHERE data_account_id=2').first());
 assert.deepEqual(initialized.audit,cold.audit,'Expected auth initialization adds no evidence/business audit');
 for(const role of ['owner','manager'])await bootstrap(role);
 assert.deepEqual(await snap(),initialized,'Completed initialization is idempotent across canonical content, timestamps and audit');
 t.diagnostic('Native blocker classification: TEST FIXTURE BUG; first cold manager request performed EXPECTED INITIALIZATION, now completed before read-only baselines');
 await r.put('bd_assortment_v1',{menuItems:[{id:'beer',name:'Beer',venueId:1,active:true,type:'ready',consumptionMode:'DIRECT_ITEM',salePrice:100,currency:'MDL',readyProduct:{nomenclatureItemId:'nom-beer',productKey:'beer-stock',packagesPerSale:1}}],nomenclature:[{id:'nom-beer',productKey:'beer-stock',name:'Beer',unit:'pcs',kind:'stock',venueId:1,active:true}],stockBalances:[],recipes:[]});
 await r.put('bd_suppliers',[{id:'qa-supplier',name:'QA supplier',venueId:1,status:'active'}]);await r.put('bd_warehouses',[{id:'qa-bar',name:'QA bar',venueId:1,active:true}]);
 const send=async(path,body)=>{const response=await r.call(path,'POST',{venueId:1,...body}),data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;};
 const receive=(id,price,date)=>send('/api/purchases/confirm',{document:{id,venueId:1,documentType:'invoice',supplierId:'qa-supplier',supplierName:'QA supplier',date,currency:'MDL',source:'manual',paymentMethod:'unknown',total:2*price,items:[{id:id+'-line',name:'Beer',nomenclatureId:'nom-beer',purchaseProductKey:'beer-stock',quantity:2,unit:'pcs',quantityMode:'measure',unitPrice:price,lineTotal:2*price,category:'products',mappingSource:'manual'}]}});
 await receive('x',20,'2026-10-01');const count=await send('/api/inventory/counts',{action:'create',scope:{type:'all'}}),id=count.inventory.id;
 for(const body of [{action:'save',items:count.inventory.items.map(line=>({productKey:line.productKey,actual:line.expected}))},{action:'review'},{action:'finalize'}])await send('/api/inventory/counts',{id,...body});
 await send('/api/sales-events',{action:'open_shift',shiftId:'qa',name:'QA'});
 const sale=async id=>{const command={id,source:'POS_API',shiftId:'qa',lines:[{id:id+'-line',menuItemId:'beer',quantity:1}],payments:[{id:id+'-payment',method:'CASH',amount:100}]};const preview=await send('/api/sales-events',{action:'preview',command});const posted=await send('/api/sales-events',{action:'post',command,previewHash:preview.previewHash});await send('/api/sales-events',{action:'post',command,previewHash:preview.previewHash});return posted.event;};
 const oldSale=await sale('a'),captured=structuredClone(oldSale.batch);await receive('y',40,'2026-10-02');await sale('b');
 const ref=(kind,id='beer-stock',partId)=>({contractVersion:1,kind,id,venueId:1,workspaceId:1,...(partId?{partId}:{})});
 const read=async(reference,role='owner')=>{const before=await snap();const response=await r.call('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(reference)),'GET',undefined,role),data=await response.json();assert.deepEqual(await snap(),before);assert.ok(response.ok,JSON.stringify(data));return data;};
 const quantity=await read(ref('STOCK_QUANTITY')),value=await read(ref('STOCK_VALUATION'));
 assert.equal(quantity.evidence.projection.quantity,2);assert.equal(quantity.evidence.projection.contributorCount,3);assert.equal(quantity.evidence.projection.consistency,'MATCH');assert.equal(quantity.evidence.projection.evidenceComplete,true);assert.equal(value.evidence.projection.value,80);assert.equal(value.evidence.projection.evidenceComplete,true);
 await new Promise(resolve=>setTimeout(resolve,25));const second=await read(ref('STOCK_VALUATION'));assert.ok(second.asOf>value.asOf);assert.equal(second.evidence.revision,value.evidence.revision);assert.equal((await read(value.evidence.reference)).code,'RESOLVED');
 assert.equal((await read(ref('STOCK_VALUATION'),'manager')).code,'RESOLVED');
 const documents=await r.get('bd_purchase_documents'),changed=structuredClone(documents);changed.find(row=>row.id==='y').items[0].name='Changed selected acquisition';await r.put('bd_purchase_documents',changed);
 assert.equal((await read(value.evidence.reference)).code,'READ_MODEL_CHANGED');await r.put('bd_purchase_documents',documents);assert.equal((await read(value.evidence.reference)).code,'RESOLVED');
 await receive('z',50,'2026-10-02');const newest=await read(ref('STOCK_VALUATION'));assert.equal(newest.evidence.projection.quantity,4);assert.equal(newest.evidence.projection.value,200);assert.equal((await read(ref('COST_BASIS'))).evidence.projection.sourceDocumentId,'z');assert.equal((await read(value.evidence.reference)).code,'READ_MODEL_CHANGED');
 assert.deepEqual((await r.get('bd_sales_events_v1')).find(row=>row.id===oldSale.id).batch,captured);
 await r.db.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=1 AND account_id=2").bind('{"deny":["inventory.view"]}').run();assert.equal((await read(ref('STOCK_VALUATION'),'manager')).code,'ACCESS_DENIED');
 for(const reference of [{...ref('STOCK_VALUATION'),venueId:999},{...ref('STOCK_VALUATION'),workspaceId:999},ref('STOCK_VALUATION','beer-stock','guessed-warehouse'),ref('PURCHASE_DOCUMENT','y','guessed-line'),ref('WAREHOUSE_MOVEMENT','guessed-movement')])assert.equal((await read(reference)).outcome,'unavailable');
 assert.equal(r.outbound(),0);
});

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
