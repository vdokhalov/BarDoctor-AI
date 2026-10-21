import test from 'node:test';import assert from 'node:assert/strict';
import {planSalesShift} from '../lib/bardoctor/sales-events';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import {MAX_STOCK_MOVEMENT_BYTES,retainStockMovements,markNormalizedStockHistory} from '../lib/bardoctor/stock-retention';
test('legacy consumption capacity rejects complete command without changing stock, captures, revenue or audit',async t=>{
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route'},{now:'2026-10-02T12:00:00Z'});t.after(r.close);
 const owner=await r.register('capacity@isolated.test');assert.equal(owner.activeVenueId,1);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put('bd_assortment_v1',salesEventFixture().assortment);put('bd_stock_movements',[]);
 put('bd_finance_revenue',planSalesShift({...salesEventFixture(),now:'2026-10-02T12:00:00Z'},'open_shift','shift','Test'));seedOpenWorkday(r.sqlite,owner.userId,1,'2026-10-02');
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL'}),owner.userId);
 const snapshot=()=>JSON.stringify({data:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),audit:r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all()});
 const send=(action:string,command:object,previewHash?:string)=>{const req=r.request(owner,'/api/sales-events','POST',{venueId:1,action,command,previewHash});req.headers.set('Origin','https://isolated.test');return r.api.sales.POST(req);};
 const command={...saleCommand('beer',1),shiftId:'shift'};
 const quote=await send('preview',command);assert.equal(quote.status,200,await quote.clone().text());const hash=(await quote.json() as {previewHash:string}).previewHash;
 for(const rows of [Array.from({length:20000},(_,i)=>({id:'old-'+i,productKey:'unused'})),[{id:'old-large',type:'sale_consumption',productKey:'unused',payload:'x'.repeat(MAX_STOCK_MOVEMENT_BYTES-200)}]]){
  assert.ok(Buffer.byteLength(JSON.stringify(rows))<MAX_STOCK_MOVEMENT_BYTES);put('bd_stock_movements',rows);const before=snapshot();
  for(const action of ['preview','post']){const res=await send(action,command,hash);assert.equal(res.status,409,await res.clone().text());assert.equal((await res.json() as {code:string}).code,'STOCK_EVIDENCE_CAPACITY_REACHED');assert.equal(snapshot(),before);}
 }
 put('bd_stock_movements',[]);const beforeFailure=snapshot();r.failDatabase();await assert.rejects(()=>send('post',command,hash),/injected/);assert.equal(snapshot(),beforeFailure);const posted=await send('post',command,hash);assert.equal(posted.status,201,await posted.clone().text());const beforeRetry=snapshot();assert.equal((await send('post',command,hash)).status,200);assert.equal(snapshot(),beforeRetry);
});
test('normalized history bypasses legacy capacity without losing old identities',()=>{
 const old=markNormalizedStockHistory(Array.from({length:20001},(_,i)=>({id:String(i)})));const next=[...old,{id:'new'}];assert.equal(retainStockMovements(next,undefined,old),next);assert.equal(next.length,20002);
});
