import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {planSalesShift} from '../lib/bardoctor/sales-events';
import {planPosOrder,type PosOrderContext} from '../lib/bardoctor/pos-orders';
import {defaultNomenclatureStructure} from '../lib/bardoctor/nomenclature';
const printKey=(venue:number)=>`__bd_print_node_v1__:${venue}`;
const profile={type:'tcp',host:'127.0.0.1',port:9100,codePage:17,columns:42,cut:false};
async function fixture(t:any){
 const r=await lifecycleRuntime({management:'./app/api/print-management/route',node:'./app/api/print-node/route',store:'./app/api/store/route'});t.after(r.close);
 const owner=await r.register('cloud-print@isolated.test'),venueId=owner.activeVenueId;
 const c:PosOrderContext=salesEventFixture();c.venueId=venueId;c.assortment.nomenclatureStructure=defaultNomenclatureStructure();(c.assortment.menuItems as any[])[0].sectionId='bar';c.preparationConfig={version:1,venueId,revision:1,routes:[{sectionId:'bar',printerId:'bar',printerName:'Бар'}],operations:[]};c.revenues=planSalesShift(c,'open_shift','shift','Test');
 const created=await planPosOrder(c,[],{action:'create',orderId:'order',operationId:'create',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'a',menuItemId:'beer',quantity:2}]});
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const management=async(body?:object)=>r.api.management[body?'POST':'GET'](r.request(owner,'/api/print-management',body?'POST':'GET',body?{venueId,...body}:undefined));
 const token='a'.repeat(64);const node=async(action:string,body:object={},bearer=token)=>r.api.node.POST(new Request('https://isolated.test/api/print-node',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},body:JSON.stringify({action,accountId:owner.userId,venueId,...body})}));
 const api=async(action:string,body?:object)=>{const response=await node(action,body);if(!response.ok)throw Object.assign(Error('API '+response.status),{status:response.status});return response.json()};
 const pair=async()=>{const p:any=await(await management({action:'pair',expectedRevision:0})).json();const response=await node('pair',{code:p.pairing.code,token,printers:[{id:'bar',name:'Бар'}]});assert.equal(response.status,200);return p.pairing};
 return {r,owner,venueId,c,created,put,management,node,api,pair,token};
}
test('automatic cloud delivery: confirm/cancel → node → fake transport; lost acknowledgement/restart never duplicates',async t=>{
 const f=await fixture(t);await f.pair();
 const confirmed=await planPosOrder(f.c,f.created.orders,{action:'confirm',orderId:'order',operationId:'confirm',expectedRevision:1});f.put('bd_pos_orders_v1',confirmed.orders);
 const modulePath=pathToFileURL(resolve('tools/print-agent/queue.mjs')).href,cloudPath=pathToFileURL(resolve('tools/print-agent/cloud.mjs')).href;const {Queue}=await import(modulePath),{syncOnce}=await import(cloudPath);
 const dir=mkdtempSync(join(tmpdir(),'bd-cloud-')),db=join(dir,'queue.sqlite');let q=new Queue(db,f.venueId);t.after(()=>{q.close();rmSync(dir,{recursive:true,force:true})});
 const sent:any[]=[];const transport=async(p:any,ticket:any,copy:boolean)=>{sent.push({host:p.host,id:ticket.id,copy});return 'fake transport accepted; paper unverified'};
 let lose=true;const lossy=async(action:string,body:any)=>{if(action==='ack'&&lose){lose=false;throw Error('lost acknowledgement')}return f.api(action,body)};
 await assert.rejects(syncOnce(q,{printers:{bar:profile}},lossy,transport),/lost acknowledgement/);assert.equal(sent.length,1);
 q.close();q=new Queue(db,f.venueId);q.recover();await syncOnce(q,{printers:{bar:profile}},f.api,transport);assert.equal(sent.length,1);
 const cancelled=await planPosOrder(f.c,confirmed.orders,{action:'cancel_item',orderId:'order',operationId:'cancel',expectedRevision:2,lineId:'a',quantity:1,reason:'Test',stockDecision:'NO_WRITE_OFF'});f.put('bd_pos_orders_v1',cancelled.orders);
 await syncOnce(q,{printers:{bar:{...profile,host:'192.0.2.9'}}},f.api,transport);assert.equal(sent.length,2);assert.equal(sent[1].host,'127.0.0.1');assert.match(sent[1].id,/cancel/);
 await syncOnce(q,{printers:{bar:profile}},f.api,transport);assert.equal(sent.length,2);
 const view:any=await(await f.management()).json();assert.ok(view.jobs.every((j:any)=>j.status==='accepted_by_transport'));assert.ok(!JSON.stringify(view).includes(f.token));assert.ok(!JSON.stringify(view).includes('"hash"'));
 const bootstrap:any=await(await f.r.api.store.GET(f.r.request(f.owner,'/api/store'))).json();assert.equal(bootstrap.entries[printKey(f.venueId)],undefined);
 const first=view.jobs[0].id;const repeat:any=await(await f.node('start',{jobId:first})).json();assert.equal(repeat.go,false);
 assert.equal((await f.node('poll',{},'b'.repeat(64))).status,401);assert.equal((await f.node('poll',{venueId:f.venueId+1})).status,401);
 assert.equal((await f.management({action:'revoke',expectedRevision:(await(await f.management()).json() as any).revision})).status,200);assert.equal((await f.node('poll')).status,401);assert.equal((await f.node('start',{jobId:first})).status,401);
});
test('pairing skips historical tickets, expires codes, prevents takeover and leaves pre-send ambiguity visible',async t=>{
 const f=await fixture(t);const confirmed=await planPosOrder(f.c,f.created.orders,{action:'confirm',orderId:'order',operationId:'confirm',expectedRevision:1});f.put('bd_pos_orders_v1',confirmed.orders);const p=await f.pair();
 assert.equal((await f.api('poll') as any).jobs.length,0);assert.equal((await f.node('pair',{code:p.code,token:'b'.repeat(64),printers:[{id:'bar',name:'Бар'}]})).status,409);
 const cancelled=await planPosOrder(f.c,confirmed.orders,{action:'cancel_item',orderId:'order',operationId:'cancel',expectedRevision:2,lineId:'a',quantity:1,reason:'Test',stockDecision:'NO_WRITE_OFF'});f.put('bd_pos_orders_v1',cancelled.orders);assert.equal((await f.api('poll') as any).jobs.length,0);assert.equal((await(await f.management()).json() as any).jobs[0].status,'blocked_history');
 const raw=JSON.parse(String(f.r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(f.owner.userId,printKey(f.venueId))!.data_json));raw.pair.expires='2000-01-01T00:00:00Z';f.put(printKey(f.venueId),raw);assert.equal((await f.node('pair',{code:p.code,token:f.token,printers:[{id:'bar',name:'Бар'}]})).status,401);
});
test('lost start grant never reaches transport; sending cannot be reclaimed; staff cannot pair or read state',async t=>{
 const f=await fixture(t);await f.pair();const confirmed=await planPosOrder(f.c,f.created.orders,{action:'confirm',orderId:'order',operationId:'confirm',expectedRevision:1});f.put('bd_pos_orders_v1',confirmed.orders);
 const modulePath=pathToFileURL(resolve('tools/print-agent/queue.mjs')).href,cloudPath=pathToFileURL(resolve('tools/print-agent/cloud.mjs')).href;const {Queue}=await import(modulePath),{syncOnce}=await import(cloudPath);
 const dir=mkdtempSync(join(tmpdir(),'bd-grant-')),q=new Queue(join(dir,'q.db'),f.venueId);t.after(()=>{q.close();rmSync(dir,{recursive:true,force:true})});let writes=0;
 const lost=async(action:string,b:object)=>{const response=await f.api(action,b);if(action==='start')throw Error('Grant response lost');return response};
 await syncOnce(q,{printers:{bar:profile}},lost,async()=>{writes++});assert.equal(writes,0);assert.equal(q.list()[0].status,'outcome_unknown');await syncOnce(q,{printers:{bar:profile}},f.api,async()=>{writes++});assert.equal(writes,0);
 const view:any=await(await f.management()).json();assert.equal(view.jobs[0].status,'outcome_unknown');assert.equal((await f.node('start',{jobId:view.jobs[0].id}).then(r=>r.json()) as any).go,false);
 const staff=await f.r.register('print-cashier@isolated.test'),workspace=f.r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(f.venueId)!.workspace_id!;
 f.r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);f.r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(f.venueId,staff.userId);
 for(const method of ['GET','POST']){const request=f.r.request(staff,'/api/print-management',method,method==='POST'?{action:'pair',venueId:f.venueId,expectedRevision:view.revision}:undefined);request.headers.set('X-Venue-Id',String(f.venueId));assert.equal((await f.r.api.management[method](request)).status,403)}
 const raw=JSON.parse(String(f.r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(f.owner.userId,printKey(f.venueId))!.data_json));raw.node.expires='2000-01-01T00:00:00Z';f.put(printKey(f.venueId),raw);assert.equal((await f.node('poll')).status,401);
});
test('test jobs are idempotent; concurrent start grants only once and revocation wins a stale start transaction',async t=>{
 const f=await fixture(t);await f.pair();const revision=(await(await f.management()).json() as any).revision;
 const command={action:'test',operationId:'test-once',expectedRevision:revision,printerId:'bar'};assert.equal((await f.management(command)).status,200);assert.equal((await f.management(command)).status,200);
 const jobs:any=await f.api('poll');assert.equal(jobs.jobs.length,1);const jobId=jobs.jobs[0].payload.id;
 const starts=await Promise.all([f.api('start',{jobId}),f.api('start',{jobId})]);assert.equal(starts.filter((s:any)=>s.go).length,1);
 await f.api('ack',{jobId,status:'accepted_by_transport',detail:'test transport'});
 const nextRevision=(await(await f.management()).json() as any).revision;await f.management({...command,operationId:'test-revoke',expectedRevision:nextRevision});const second:any=await f.api('poll');const secondId=second.jobs[1].payload.id;
 f.r.beforeNextBatch(()=>{const raw=JSON.parse(String(f.r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(f.owner.userId,printKey(f.venueId))!.data_json));raw.node.revoked=true;f.put(printKey(f.venueId),raw)});
 assert.equal((await f.node('start',{jobId:secondId})).status,401);
});
