import test from 'node:test';
import assert from 'node:assert/strict';
import { stockRuntime, type StockRow } from './helpers/stock-runtime';
import { stockQuantityEvidence } from '../lib/bardoctor/stock-quantity-evidence';
import { retainStockMovements, StockEvidenceCapacityError, MAX_STOCK_MOVEMENT_BYTES } from '../lib/bardoctor/stock-retention';
import { resolveCostBasis } from '../lib/bardoctor/cost-basis';
import { procurementProductSummary } from '../lib/bardoctor/procurement-basis';
import { normalizePurchaseQuantity } from '../lib/bardoctor/stock-units';
import { summarizeInventoryValuation } from '../lib/bardoctor/valuation';
import { resolvedEvidence as readEvidence } from './helpers/revenue-trace-runtime';
function resolvedEvidence(body: Parameters<typeof readEvidence>[0]) { const evidence=readEvidence(body);return {...evidence,projection:evidence.projection as StockRow}; }
const at='2026-10-02T12:00:00.000Z', scope={venueId:1,workspaceId:1,dataAccountId:1};
const receipt=(id:string,date='2026-10-01',extras:StockRow={})=>({id,venueId:1,productKey:'p',type:'receipt',amount:2,unit:'l',costAmount:40,costStatus:'KNOWN',currency:'MDL',businessDate:date,createdAt:at,sourceDocumentId:'purchase-'+id,sourceLineId:'line-'+id,...extras});
function cost(receipts:unknown[],extra:StockRow={}) {return resolveCostBasis({venueId:1,nomenclatureItem:'p',baseUnit:'l',accountingCurrency:'MDL',asOf:at,receipts,...extra});}

test('LAST PURCHASE PRICE: chronology, backdate, stable tie, newest unknown/zero, currency/unit and exact warehouse/fallback',()=>{
 const x=receipt('x'),y=receipt('y','2026-10-02',{costAmount:80}),back=receipt('back','2026-09-01',{costAmount:120});
 assert.equal(cost([back,y,x]).value,40);assert.equal(cost([x,y,back]).movementId,'y');
 const ties=[receipt('a'),receipt('b',undefined,{sourceDocumentId:'purchase-a',sourceLineId:'line-a'})];
 assert.equal(cost(ties).movementId,cost([...ties].reverse()).movementId);assert.equal(cost(ties).movementId,'b');
 assert.equal(cost([x,{...y,costStatus:'UNKNOWN'}]).value,null);assert.equal(cost([x,{...y,costAmount:0,costStatus:'KNOWN_ZERO'}]).value,0);
 assert.equal(cost([x,{...y,currency:'EUR'}]).status,'UNKNOWN');assert.equal(cost([x,{...y,unit:'kg'}]).status,'UNKNOWN');
 assert.equal(cost([{...x,warehouseId:'bar'},y],{warehouseId:'bar'}).movementId,'x');assert.equal(cost([y],{warehouseId:'bar'}).movementId,'y');assert.equal(cost([{...y,warehouseId:'foreign'}],{warehouseId:'bar'}).status,'UNKNOWN');
});
for(const [sourceUnit,stockUnit,qty,factor] of [['pcs','pcs',2,1],['ml','l',500,.001],['l','l',2,1],['g','kg',500,.001],['kg','kg',2,1],['box','l',2,3],['bottle','l',2,.5]] as const) test('source vs canonical quantity/price: '+sourceUnit,()=>{
 const result=normalizePurchaseQuantity({quantity:qty,unit:sourceUnit,stockUnit,price:20,...(sourceUnit==='box'?{packageContent:{quantity:3,unit:'l'}}:sourceUnit==='bottle'?{packageContent:{quantity:.5,unit:'l'}}:{})});
 assert.ok(result.ok);if(!result.ok)return;assert.equal(result.snapshot.input.price,20);assert.equal(result.snapshot.canonicalQuantity,qty*factor);assert.equal(result.snapshot.normalizedUnitCost,20/factor);
});
test('quantity explains existing projection: opening/count anchor, receipt, sale, writeoff, return, reversal, adjustment; never pre-anchor double counts',()=>{
 const anchor={id:'count',venueId:1,status:'completed',completedAt:'2026-10-01T10:00:00.000Z',anchorBoundary:{movements:[]},items:[{id:'count-line',productKey:'p',actual:10,unit:'l'}]};
 const movements=[receipt('pre','2026-09-30',{createdAt:'2026-09-30T10:00:00.000Z',amount:999}),...['receipt','sale_consumption','writeoff','return','sale_reversal','inventory_adjustment'].map((type,i)=>receipt('m'+i,undefined,{type,amount:[2,-1,-2,-1,1,3][i]}))];
 const input={...scope,balance:{productKey:'p',current:12,unit:'l',lastInventoryDocumentId:'count'},movements,counts:[anchor],openings:[]};
 const result=stockQuantityEvidence(input);assert.equal(result.quantity,12);assert.equal(result.explainedQuantity,12);assert.equal(result.contributorCount,6);assert.equal(result.evidenceComplete,true);
 assert.deepEqual(stockQuantityEvidence(input),result);assert.equal(stockQuantityEvidence({...input,movements:[...movements,movements[1]]}).evidenceComplete,false);
 const open={...anchor,id:'open',status:'confirmed',createdAt:anchor.completedAt,items:[{rowId:'opening-line',productKey:'p',quantity:10,stockUnit:'l'}]};
 assert.equal(stockQuantityEvidence({...input,balance:{...input.balance,lastInventoryDocumentId:undefined,openingDocumentId:'open'},counts:[],openings:[open]}).evidenceComplete,true);
 assert.equal(stockQuantityEvidence({...input,counts:[]}).status,'PARTIAL');assert.equal(stockQuantityEvidence({...input,balance:{...input.balance,current:null}}).quantity,null);
 const own={...movements[1],id:'foreign',dataAccountId:99,amount:5000};assert.equal(stockQuantityEvidence({...input,movements:[...movements,own]}).explainedQuantity,12);
});
test('same-clock anchor records actual prior identities; legacy ambiguous boundary remains partial',()=>{
 const movements=[receipt('prior'),receipt('later',undefined,{amount:3})],anchor={id:'count',venueId:1,status:'completed',completedAt:at,items:[{id:'l',productKey:'p',actual:5,unit:'l'}],anchorBoundary:{movements:[{id:'prior'}]}};
 const input={...scope,balance:{productKey:'p',current:8,unit:'l',lastInventoryDocumentId:'count'},movements,counts:[anchor],openings:[]};
 assert.equal(stockQuantityEvidence(input).evidenceComplete,true);assert.equal(stockQuantityEvidence({...input,counts:[{...anchor,anchorBoundary:undefined}]}).evidenceComplete,false);
});
test('bounded retention pins rare applicable receipt, active anchor and contributing facts; refuses required overflow',()=>{
 const balance={venueId:1,productKey:'p',unit:'l',current:5,checkedAt:'2026-10-01T00:00:00.000Z',quantityAnchorAt:'2026-10-01T00:00:00.000Z',lastInventoryDocumentId:'count'};
 const old=Array.from({length:19998},(_,i)=>({id:'o'+i,productKey:'untracked'}));
 const rare=receipt('rare','2026-09-01',{createdAt:'2026-09-01T00:00:00.000Z'}),anchor=receipt('anchor',undefined,{type:'inventory_adjustment',sourceDocumentId:'count',createdAt:balance.checkedAt});
 const values=[receipt('new'),...old,rare,anchor];const source=JSON.stringify(values),kept=retainStockMovements(values,{stockBalances:[balance]});
 assert.equal(kept.length,20000);assert.ok(kept.some(row=>row.id==='rare'));assert.ok(kept.some(row=>row.id==='anchor'));assert.equal(cost(kept).movementId,'new');assert.equal(JSON.stringify(values),source);
 const required=Array.from({length:20001},(_,i)=>receipt('required'+i));assert.throws(()=>retainStockMovements(required,{stockBalances:[balance]}),StockEvidenceCapacityError);
 assert.throws(()=>retainStockMovements([receipt('large',undefined,{payload:'x'.repeat(MAX_STOCK_MOVEMENT_BYTES)})],{stockBalances:[balance]}),StockEvidenceCapacityError);
 const afterCount=receipt('after',undefined,{type:'sale_consumption',amount:-1});assert.ok(retainStockMovements([afterCount,...values],{stockBalances:[balance]}).some(row=>row.id==='after'));
});
test('valuation null is unknown, subtotal is explicitly partial; known zero and no-stock zero are real zero',()=>{
 const input={balances:[{productKey:'p',current:2,unit:'l'}],venueId:1,accountingCurrency:'MDL',asOf:at};
 const unknown=summarizeInventoryValuation(input);assert.equal(unknown.total,null);assert.equal(unknown.lines[0].value,null);assert.equal(unknown.knownSubtotal,0);
 const known=summarizeInventoryValuation({...input,stockMovements:[receipt('r')]});assert.equal(known.total,40);assert.equal(known.lines[0].costBasis?.movementId,'r');
 const zero=summarizeInventoryValuation({...input,stockMovements:[receipt('free',undefined,{costAmount:0,costStatus:'KNOWN_ZERO'})]});assert.equal(zero.total,0);assert.equal(zero.complete,true);
});

test('actual purchase writer: acquisition document/line/conversion/receipt/cost/valuation graph, revision binding, nested scope and read-only',async t=>{
 const r=await stockRuntime();t.after(r.close);
 const accepted=await r.confirm('purchase-x','l',2,20);assert.ok(accepted.response.ok,JSON.stringify(accepted.body));
 const purchase=resolvedEvidence((await r.resolve(r.reference('PURCHASE_DOCUMENT','purchase-x'))).body);
 const line=resolvedEvidence((await r.resolve(purchase.relations.find(rel=>rel.reference.partId==='purchase-x-line')!.reference)).body);
 assert.equal(line.projection.type,'PURCHASE_LINE');assert.equal(line.projection.sourceQuantity,2);assert.equal(line.projection.sourceUnitPrice,20);assert.equal(line.projection.canonicalUnit,'l');
 const movement=resolvedEvidence((await r.resolve(line.relations.find(rel=>rel.reference.kind==='WAREHOUSE_MOVEMENT')!.reference)).body);assert.equal(movement.projection.quantity,2);assert.ok(movement.relations.some(rel=>rel.reference.kind==='PURCHASE_DOCUMENT'));
 const key=String(movement.projection.productKey),basis=resolvedEvidence((await r.resolve(r.reference('COST_BASIS',key))).body);assert.equal(basis.projection.value,20);assert.equal(basis.projection.sourceDocumentId,'purchase-x');
 const valuation=resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION',key))).body);assert.equal(valuation.projection.value,40);assert.equal(valuation.projection.evidenceComplete,false,'No invented opening anchor for legacy balance');
 const supplier=resolvedEvidence((await r.resolve(purchase.relations.find(rel=>rel.reference.kind==='SUPPLIER')!.reference)).body);assert.equal(supplier.projection.name,'QA supplier');
 assert.equal((await r.resolve(basis.reference,r.member)).response.status,200);
 for(const change of [{venueId:r.foreign.activeVenueId},{workspaceId:r.workspaceId+1},{id:'guessed'}]) assert.equal((await r.resolve({...basis.reference,...change,expectedRevision:undefined})).body.outcome,'unavailable');
 assert.equal((await r.resolve(r.reference('PURCHASE_DOCUMENT','purchase-x',{partId:'guessed-line'}))).body.outcome,'unavailable');
 const docs=r.get('bd_purchase_documents') as StockRow[]; (docs[0].items as StockRow[])[0].dataAccountId=r.foreign.userId;r.put('bd_purchase_documents',docs);
 assert.equal((await r.resolve(r.reference('PURCHASE_DOCUMENT','purchase-x',{partId:'purchase-x-line'}))).body.outcome,'unavailable');
 (docs[0].items as StockRow[])[0].dataAccountId=undefined;r.put('bd_purchase_documents',docs);
 assert.ok((await r.confirm('purchase-y','l',2,40,'2026-10-02')).response.ok);assert.equal((await r.resolve(basis.reference)).body.code,'READ_MODEL_CHANGED');
 assert.equal(resolvedEvidence((await r.resolve(r.reference('COST_BASIS',key))).body).projection.value,40);
 r.permissions(['inventory.view']);for(const ref of [basis.reference,r.reference('PURCHASE_DOCUMENT','purchase-x'),r.reference('PURCHASE_SOURCE_FILE','purchase-x',{partId:'0123456789-0123456789-qa'})])assert.equal((await r.resolve(ref,r.member)).body.outcome,'restricted');
 r.permissions([]);r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId,r.member.userId);assert.equal((await r.resolve(basis.reference,r.member)).response.status,401);
});

test('real purchase writer at 20k preserves rare acquisition; required overflow returns 409 before any CAS/audit write',async t=>{
 const r=await stockRuntime();t.after(r.close);const first=await r.confirm('rare-x','pcs',1,20);assert.ok(first.response.ok);
 const rare=(r.get('bd_stock_movements') as StockRow[])[0],rareKey=String(rare.productKey);
 const filler=Array.from({length:19999},(_,i)=>({...rare,id:'optional-'+i,productKey:'unused',productName:'Unused QA item',status:'cancelled',reversedAt:'2026-10-02T10:00:00.000Z',sourceDocumentId:'unused-'+i}));r.put('bd_stock_movements',[...filler,rare]);
 const unrelated=await r.confirm('unrelated-y','l',1,40);assert.ok(unrelated.response.ok,JSON.stringify(unrelated.body));const movements=r.get('bd_stock_movements') as StockRow[];
 assert.ok(movements.length<=20000);assert.ok(Buffer.byteLength(JSON.stringify(movements))<=MAX_STOCK_MOVEMENT_BYTES);assert.ok(movements.some(row=>row.id===rare.id));assert.equal(resolvedEvidence((await r.resolve(r.reference('COST_BASIS',rareKey))).body).projection.value,20);
 const required=Array.from({length:20000},(_,i)=>({...rare,id:'required-'+i,sourceDocumentId:'required-doc-'+i}));r.put('bd_stock_movements',required);const before=r.snapshot();
 const refused=await r.confirm('overflow','pcs',1,30);assert.equal(refused.response.status,409);assert.equal(refused.body.code,'STOCK_EVIDENCE_CAPACITY_REACHED');assert.deepEqual(r.snapshot(),before,'Capacity refusal leaves accepted data, timestamps and audit unchanged');
});

test('procurement canonical IDs, comparable captured packages, chronology and separate source price/currency',()=>{
 const snapshot=(q:number,unit:string,price:number,stockUnit:string,content?:{quantity:number;unit:string})=>{const result=normalizePurchaseQuantity({quantity:q,unit,price,stockUnit,packageContent:content});assert.ok(result.ok);return result.snapshot;};
 const assortment={nomenclature:[{id:'n1',productKey:'p',name:'Same name',unit:'l',venueId:1},{id:'n2',productKey:'p2',name:'Same name',unit:'l',venueId:1}]};
 const item=(id:string,key:string,quantity:number,unit:string,price:number,conversion?:unknown)=>({id,purchaseProductKey:key,quantity,unit,unitPrice:price,lineTotal:quantity*price,purchaseConversion:conversion});
 const document=(id:string,date:string,items:unknown[],currency='MDL')=>({id,venueId:1,status:'confirmed',date,currency,items});
 const documents=[document('old','2026-09-01',[item('old-line','p',2,'bottle',10,snapshot(2,'bottle',10,'l',{quantity:.5,unit:'l'}))]),document('latest','2026-10-02',[item('latest-line','p',1,'box',60,snapshot(1,'box',60,'l',{quantity:3,unit:'l'}))]),document('different','2026-10-01',[item('other-line','p2',2,'l',99,snapshot(2,'l',99,'l'))])];
 const movements=[receipt('old','2026-09-01',{amount:1,costAmount:20,sourceDocumentId:'old',sourceLineId:'old-line'}),receipt('latest','2026-10-02',{amount:3,costAmount:60,sourceDocumentId:'latest',sourceLineId:'latest-line'}),receipt('other',undefined,{productKey:'p2',costAmount:198,sourceDocumentId:'different',sourceLineId:'other-line'})];
 const input={...scope,assortment,documents,movements,currency:'MDL',startDate:'2026-08-01',asOf:at};const result=procurementProductSummary(input);assert.equal(result.length,2);const p=result.find(row=>row.productKey==='p')!;
 assert.equal(p.quantity,4);assert.equal(p.unit,'l');assert.equal(p.lastPrice,20);assert.equal(p.sourceUnitPrice,60);assert.equal(p.sourceUnit,'box');assert.equal(p.lastPriceBasis?.sourceDocumentId,'latest');assert.equal(p.evidenceStatus,'COMPLETE');
 assert.deepEqual(procurementProductSummary({...input,documents:[...documents].reverse(),movements:[...movements].reverse()}),result);
 const unknown=procurementProductSummary({...input,documents:[document('unknown','2026-10-02',[item('unconverted','p',2,'box',60)])]}).find(row=>row.productKey==='p')!;assert.equal(unknown.quantity,null);assert.equal(unknown.evidenceStatus,'PARTIAL');
 const foreign=procurementProductSummary({...input,documents:[...documents,document('foreign','2026-10-02',[{...item('foreign-line','p',99,'l',10),workspaceId:999}])]});assert.equal(foreign.find(row=>row.productKey==='p')!.quantity,4);
 const mismatch=procurementProductSummary({...input,documents:[document('eur','2026-10-02',[item('eur-line','p',2,'l',10,snapshot(2,'l',10,'l'))],'EUR')]});assert.equal(mismatch[0].spend,null);assert.equal(mismatch[0].sourcePurchases[0].sourceCurrency,'EUR');
});

test('source file metadata is authorized through actual purchase parent and rechecked after edit, never a file access capability',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('files','pcs')).response.ok);
 const id='0123456789-0123456789-qa',docs=r.get('bd_purchase_documents') as StockRow[];docs[0].sourceFileIds=[id];r.put('bd_purchase_documents',docs);r.heads.set('purchases/'+r.owner.userId+'/'+id,{size:9,etag:'qa-etag',httpMetadata:{contentType:'application/pdf'}});
 const fileRef=r.reference('PURCHASE_SOURCE_FILE','files',{partId:id}),file=resolvedEvidence((await r.resolve(fileRef)).body);assert.equal(file.projection.sizeBytes,9);assert.equal(file.relations.length,1);assert.equal(file.relations[0].reference.kind,'PURCHASE_DOCUMENT');
 for(const ref of [{...fileRef,id:'foreign-purchase'},{...fileRef,workspaceId:999},{...fileRef,partId:'0123456789-0123456789-guessed'}])assert.equal((await r.resolve(ref)).body.outcome,'unavailable');
 docs[0].dataAccountId=r.foreign.userId;r.put('bd_purchase_documents',docs);assert.equal((await r.resolve(fileRef)).body.outcome,'unavailable');
 docs[0].dataAccountId=undefined;docs[0].sourceFileIds=[];r.put('bd_purchase_documents',docs);assert.equal((await r.resolve(file.reference)).body.outcome,'unavailable');
});

test('real count finalization is an anchor including zero adjustment and same-clock later receipt; repeat finalize does not double count',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('pre-count','pcs',2,20)).response.ok);
 const key=String((r.get('bd_stock_movements') as StockRow[])[0].productKey);
 const created=await r.call('counts','/api/inventory/counts','POST',{venueId:r.venueId,action:'create',scope:{type:'all'}});assert.ok(created.response.ok,JSON.stringify(created.body));const id=String((created.body.inventory as StockRow).id);
 for(const body of [{action:'save',items:[{productKey:key,actual:2}]},{action:'review'},{action:'finalize'}]){const response=await r.call('counts','/api/inventory/counts','POST',{venueId:r.venueId,id,...body});assert.ok(response.response.ok,JSON.stringify(response.body));}
 const qty=resolvedEvidence((await r.resolve(r.reference('STOCK_QUANTITY',key))).body);assert.equal(qty.projection.quantity,2);assert.equal(qty.projection.evidenceComplete,true);assert.equal(qty.projection.contributorCount,0);
 const anchor=resolvedEvidence((await r.resolve(qty.relations.find(rel=>rel.reference.kind==='INVENTORY_DOCUMENT')!.reference)).body);assert.equal((anchor.projection.line as StockRow).actual,2);
 assert.ok((await r.confirm('post-count','pcs',3,30,'2026-10-02')).response.ok);const next=resolvedEvidence((await r.resolve(r.reference('STOCK_QUANTITY',key))).body);assert.equal(next.projection.quantity,5);assert.equal(next.projection.evidenceComplete,true);assert.equal(next.projection.contributorCount,1);
 assert.equal((await r.resolve(qty.reference)).body.code,'READ_MODEL_CHANGED');const repeated=await r.call('counts','/api/inventory/counts','POST',{venueId:r.venueId,id,action:'finalize'});assert.ok(repeated.response.ok);assert.equal(resolvedEvidence((await r.resolve(r.reference('STOCK_QUANTITY',key))).body).projection.quantity,5);
});

test('warehouse quantity scope and anchor are independently scoped, missing/mismatched units never prove zero',()=>{
 const balance={productKey:'p',current:4,unit:'l',warehouseId:'bar',lastInventoryDocumentId:'count'},anchor={id:'count',venueId:1,status:'completed',warehouseId:'bar',completedAt:'2026-10-01T00:00:00.000Z',anchorBoundary:{movements:[]},items:[{id:'l',productKey:'p',actual:2,unit:'l'}]};
 const input={...scope,balance,warehouseId:'bar',movements:[receipt('own',undefined,{warehouseId:'bar'}),receipt('other',undefined,{warehouseId:'kitchen',amount:999})],counts:[anchor],openings:[]};assert.equal(stockQuantityEvidence(input).evidenceComplete,true);
 assert.equal(stockQuantityEvidence({...input,counts:[{...anchor,workspaceId:999}]}).evidenceComplete,false);
 assert.equal(stockQuantityEvidence({...input,movements:[receipt('bad-unit',undefined,{warehouseId:'bar',unit:'kg'})]}).explainedQuantity,null);
 assert.equal(stockQuantityEvidence({...input,balance:{...balance,current:0},movements:[]}).status,'PARTIAL');
});

test('file download reauthorizes own child scope including pending uploads and legacy purchase-parent proof; valuation shares same authorized context',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('files-scope','pcs')).response.ok);
 const id='0123456789-0123456789-file',fileKey='purchases/'+r.owner.userId+'/'+id,doc=(r.get('bd_purchase_documents') as StockRow[])[0];doc.sourceFileIds=[id];r.put('bd_purchase_documents',[doc]);r.heads.set(fileKey,{size:5,etag:'q',httpMetadata:{contentType:'application/pdf'}});
 const read=()=>r.api.file.GET(r.request(r.owner,'/api/purchases/files/'+id),{params:Promise.resolve({id})});const before=r.snapshot();assert.equal((await read()).status,200);assert.deepEqual(r.snapshot(),before);
 r.heads.get(fileKey)!.customMetadata={venueId:String(r.foreign.activeVenueId),workspaceId:String(r.workspaceId),dataAccountId:String(r.owner.userId)};assert.equal((await read()).status,404);
 assert.equal((await r.resolve(r.reference('PURCHASE_SOURCE_FILE','files-scope',{partId:id}))).body.outcome,'unavailable','parent never grants access to foreign tagged file');
 r.heads.get(fileKey)!.customMetadata={venueId:String(r.venueId),workspaceId:String(r.workspaceId),dataAccountId:String(r.owner.userId)};r.put('bd_purchase_documents',[]);assert.equal((await read()).status,200,'scoped pending upload remains visible before purchase confirm');
 r.heads.get(fileKey)!.customMetadata=undefined;assert.equal((await read()).status,404,'unlinked legacy file is not guessed into venue scope');
 const foreignBalance={productKey:'foreign',venueId:r.venueId,workspaceId:r.workspaceId,dataAccountId:r.foreign.userId,current:999,unit:'pcs'};const assortment=r.get('bd_assortment_v1') as StockRow;(assortment.stockBalances as StockRow[]).push(foreignBalance);r.put('bd_assortment_v1',assortment);
 const value=await r.call('valuation','/api/inventory/valuation');assert.ok(value.response.ok);assert.ok(!(value.body.lines as StockRow[]).some(line=>line.productKey==='foreign'));
 r.permissions(['inventory.view']);assert.equal((await r.call('valuation','/api/inventory/valuation','GET',undefined,r.member)).response.status,403);
});

test('current acquisition mismatch cannot silently prove a receipt; changing live line invalidates bound cost basis without recosting history',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('mismatch')).response.ok);const m=(r.get('bd_stock_movements') as StockRow[])[0],key=String(m.productKey),basis=resolvedEvidence((await r.resolve(r.reference('COST_BASIS',key))).body);
 const docs=r.get('bd_purchase_documents') as StockRow[];(docs[0].items as StockRow[])[0].purchaseProductKey='other-product';(docs[0].items as StockRow[])[0].canonicalProductKey='other-product';r.put('bd_purchase_documents',docs);
 assert.equal((await r.resolve(basis.reference)).body.code,'READ_MODEL_CHANGED');const fresh=await r.resolve(r.reference('COST_BASIS',key));assert.equal(fresh.body.outcome,'partial');assert.ok(fresh.body.diagnostics.includes('RECORD_NEEDS_REVIEW'));
 const movement=await r.resolve(r.reference('WAREHOUSE_MOVEMENT',String(m.id)));assert.equal(movement.body.outcome,'partial');
});

test('warehouse aggregate valuation binds each warehouse cost, while foreign nested warehouse or product ownership is unavailable',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('warehouse-x')).response.ok);const assortment=r.get('bd_assortment_v1') as StockRow,bal=(assortment.stockBalances as StockRow[])[0],key=String(bal.productKey??bal.key),m=(r.get('bd_stock_movements') as StockRow[])[0];
 r.put('bd_warehouses',[{id:'bar',venueId:r.venueId,name:'Bar'},{id:'kitchen',venueId:r.venueId,name:'Kitchen'}]);bal.current=3;bal.warehouseBalances={bar:{current:1},kitchen:{current:2}};r.put('bd_assortment_v1',assortment);
 r.put('bd_stock_movements',[{...m,id:'bar-receipt',warehouseId:'bar',amount:1,costAmount:20},{...m,id:'kitchen-receipt',warehouseId:'kitchen',amount:2,costAmount:80}]);
 const value=resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION',key))).body);assert.equal(value.projection.value,100);assert.deepEqual(value.relations.filter(rel=>rel.reference.kind==='STOCK_VALUATION').map(rel=>rel.reference.partId),['bar','kitchen']);
 assert.equal(resolvedEvidence((await r.resolve(r.reference('COST_BASIS',key,{partId:'kitchen'}))).body).projection.value,40);
 r.put('bd_warehouses',[{id:'bar',venueId:r.venueId,name:'Bar'},{id:'kitchen',venueId:r.foreign.activeVenueId,name:'FOREIGN-SECRET'}]);assert.equal((await r.resolve(r.reference('STOCK_VALUATION',key))).body.outcome,'unavailable');assert.equal((await r.resolve(r.reference('COST_BASIS',key,{partId:'kitchen'}))).body.outcome,'unavailable');
});

test('valuation HTTP never leaks a foreign nested warehouse total or guesses zero for the missing quantity basis',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('foreign-warehouse')).response.ok);const assortment=r.get('bd_assortment_v1') as StockRow,bal=(assortment.stockBalances as StockRow[])[0];bal.warehouseBalances={'guessed-warehouse':{current:1234567,inventoryValue:987654321}};r.put('bd_assortment_v1',assortment);
 const result=await r.call('valuation','/api/inventory/valuation');assert.ok(result.response.ok);assert.equal(result.body.total,null);assert.equal((result.body.lines as StockRow[])[0].quantity,null);assert.ok(!JSON.stringify(result.body).includes('1234567'));assert.ok(!JSON.stringify(result.body).includes('987654321'));
 assert.equal((await r.call('valuation','/api/inventory/valuation?warehouseId=guessed-warehouse')).response.status,404);
});

test('existing warehouse-scoped flat balance resolves its own valuation; price fallback does not invent a warehouse quantity',async t=>{
 const r=await stockRuntime();t.after(r.close);assert.ok((await r.confirm('flat-warehouse')).response.ok);const assortment=r.get('bd_assortment_v1') as StockRow,bal=(assortment.stockBalances as StockRow[])[0],key=String(bal.productKey??bal.key);
 const fallback=resolvedEvidence((await r.resolve(r.reference('COST_BASIS',key,{partId:'qa-warehouse'}))).body);assert.equal(fallback.projection.value,20);
 assert.equal((await r.resolve(r.reference('STOCK_QUANTITY',key,{partId:'qa-warehouse'}))).body.outcome,'unavailable');
 bal.warehouseId='qa-warehouse';r.put('bd_assortment_v1',assortment);const value=resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION',key,{partId:'qa-warehouse'}))).body);assert.equal(value.projection.value,40);assert.equal(value.projection.evidenceComplete,false);
});
