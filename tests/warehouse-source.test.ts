import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {stockReturnUrl,normalizeMovementFilter} from '../lib/bardoctor/client/warehouse-document';
test('source navigation resolves exact confirmed documents in normalized and legacy history without mutation',async()=>{
 const r=await lifecycleRuntime({source:'./app/api/inventory/movements/source/route'});
 try{
 const owner=await r.register('source-owner@isolated.test'),foreign=await r.register('source-other@isolated.test'),v=owner.activeVenueId,a=owner.userId;
 const put=(key:string,data:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(a,key,JSON.stringify(data));
 const purchases=[{id:'purchase',venueId:v,status:'confirmed',documentType:'invoice'},{id:'draft',venueId:v,status:'draft'},{id:'foreign',venueId:foreign.activeVenueId,status:'confirmed'},{id:'nested',status:'confirmed',items:[{venueId:foreign.activeVenueId}]},{id:'duplicate',status:'confirmed'},{id:'duplicate',status:'confirmed'}];
 put('bd_purchase_documents',purchases);put('bd_inventory_snapshots',[{id:'count',venueId:v,status:'completed'}]);
 const rows=['purchase','draft','foreign','missing','nested','duplicate'].map(id=>({id:'m-'+id,venueId:v,type:'receipt',sourceDocumentId:id}));rows.push({id:'m-count',venueId:v,type:'inventory_adjustment',sourceDocumentId:'count'});
 const insert=r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,payload_json) VALUES(?,?,?,?,?,?,?)');
 rows.forEach((row,n)=>insert.run(a,n+1,row.id,'product',row.type,'2026-10-23',JSON.stringify(row)));
 const get=(id:string,user=owner)=>r.api.source.GET(r.request(user,'/api/inventory/movements/source?movementId='+id));
 for(const legacy of [false,true]){
  if(legacy){r.sqlite.prepare('DELETE FROM stock_journal_movements WHERE account_id=?').run(a);r.sqlite.prepare('DELETE FROM stock_journals WHERE account_id=?').run(a);put('bd_stock_movements',rows);}
  const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
  for(const [id,path] of [['purchase','/suppliers?'],['count','/warehouse?']]){const response=await get('m-'+id),body:any=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.documentId,id);assert.ok(body.href.startsWith(path));assert.equal(new URL(body.href,'http://local').searchParams.get('venue'),String(v));}
  for(const id of ['draft','foreign','missing','nested','duplicate','absent'])assert.equal((await get('m-'+id)).status,404,id);
  assert.equal((await get('m-purchase',foreign)).status,404);
  assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 }
 }finally{r.close();}
});
test('return context preserves exact filters and rejects foreign venue, external and wrong-route redirects',()=>{
 const back='/warehouse?venue=7&tab=movements&type=receipt&q=coffee&from=2026-10-01';
 const search='?venue=7&stockReturn='+encodeURIComponent(back);
 assert.equal(stockReturnUrl(search,'https://local.test',7),back);
 assert.equal(stockReturnUrl(search,'https://local.test',8),null);
 for(const value of ['https://evil.test'+back,'/warehouse?venue=8&tab=movements','/suppliers?venue=7','/warehouse?venue=7&tab=counts'])assert.equal(stockReturnUrl('?venue=7&stockReturn='+encodeURIComponent(value),'https://local.test',7),null);
});

test('removed or unrecognized filter selects all, without a legacy-only hidden selection',()=>{
 for(const value of [null,'all','production','unknown',''])assert.equal(normalizeMovementFilter(value),'all');
 for(const value of ['purchases','sales','inventory','writeoffs','transfers'])assert.equal(normalizeMovementFilter(value),value);
});
