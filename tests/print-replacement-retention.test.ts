import {salesEventFixture} from './helpers/sales-event-fixture';
import {planSalesShift} from '../lib/bardoctor/sales-events';
import {planPosOrder,type PosOrderContext} from '../lib/bardoctor/pos-orders';
import {defaultNomenclatureStructure} from '../lib/bardoctor/nomenclature';
import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const key=(v:number)=>`__bd_print_node_v1__:${v}`;
const payload=(id:string,venueId:number,size=1)=>({id,venueId,orderId:id,tableNumber:'1',sectionId:'bar',sectionName:'Бар',printerId:'bar',routeRevision:1,kind:'PREPARATION',originalTicketId:null,reason:null,createdAt:'2026-10-19T07:00:00Z',lines:[{name:'X'.repeat(size),quantity:1}]});
async function setup(t:any){const r=await lifecycleRuntime({management:'./app/api/print-management/route',node:'./app/api/print-node/route',store:'./app/api/store/route'});t.after(r.close);const owner=await r.register('retention@isolated.test'),venueId=owner.activeVenueId;
 const put=(k:string,v:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,k,JSON.stringify(v));
 const read=()=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key(venueId))!.data_json));
 const manager=async(body?:any,query='')=>r.api.management[body?'POST':'GET'](r.request(owner,'/api/print-management'+query,body?'POST':'GET',body?{venueId,...body}:undefined));
 const node=async(action:string,token='a'.repeat(64),body:any={})=>r.api.node.POST(new Request('https://isolated.test/api/print-node',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,accountId:owner.userId,venueId,...body})}));
 const code:any=await(await manager({action:'pair',expectedRevision:0})).json();assert.equal((await node('pair','a'.repeat(64),{code:code.pairing.code,token:'a'.repeat(64),printers:[{id:'bar',name:'Бар'}]})).status,200);
 return {r,owner,venueId,put,read,manager,node};}
test('replacement revokes old key; all old-node work is quarantined, never replayed; explicit manual resolution is audited',async t=>{
 const f=await setup(t),s=f.read(),oldId=s.node.id;
 s.jobs=['sending','leased','outcome_unknown','failed_before_send','accepted_by_transport'].map((status,i)=>({payload:payload('old:'+i,f.venueId),status,nodeId:oldId}));s.jobs.push({payload:payload('never-issued',f.venueId),status:'queued'});f.put(key(f.venueId),s);
 const replacement:any=await(await f.manager({action:'replace',expectedRevision:s.revision,nodeId:oldId,acknowledgeUncertain:true,reason:'Test computer lost'})).json();assert.equal(replacement.pairing.replacement,true);assert.equal((await f.node('poll')).status,401);
 const review=f.read();assert.equal(review.jobs.filter((j:any)=>j.status==='replacement_review').length,4);assert.equal(review.jobs.find((j:any)=>j.payload.id==='never-issued').status,'queued');
 assert.equal((await f.node('pair','a'.repeat(64),{code:replacement.pairing.code,token:'a'.repeat(64),printers:[{id:'bar',name:'Бар'}]})).status,409);
 assert.equal((await f.node('pair','b'.repeat(64),{code:replacement.pairing.code,token:'b'.repeat(64),printers:[{id:'bar',name:'Бар'}]})).status,200);
 const newPoll:any=await(await f.node('poll','b'.repeat(64))).json();assert.deepEqual(newPoll.jobs.map((j:any)=>j.payload.id),['never-issued']);assert.equal((await f.node('start','b'.repeat(64),{jobId:'old:0'})).status,404);
 assert.equal((await f.manager({action:'resolve',expectedRevision:f.read().revision,jobId:'old:0',acknowledgeUncertain:false,reason:'not reviewed'})).status,409);
 assert.equal((await f.manager({action:'resolve',expectedRevision:f.read().revision,jobId:'old:0',acknowledgeUncertain:true,reason:'Paper and kitchen checked; handled manually'})).status,200);
 const archive:any=await(await f.manager(undefined,'?archive=1')).json();const resolved=archive.jobs.find((j:any)=>j.id==='old:0');assert.equal(resolved.status,'operator_resolved');assert.equal(resolved.reviewedBy,f.owner.userId);assert.match(resolved.detail,/НЕ перепечатывать/);
 assert.equal((await f.node('poll')).status,401);assert.equal((await f.node('poll','b'.repeat(64)).then(r=>r.json()) as any).jobs.some((j:any)=>j.payload.id==='old:0'),false);
 assert.ok(f.r.sqlite.prepare("SELECT action FROM audit_log WHERE action='print.resolve'").get());
});
test('completed jobs archive atomically; exact payload remains; active bytes stay bounded and archived IDs cannot send again',async t=>{
 const f=await setup(t),s=f.read();s.jobs=Array.from({length:80},(_,i)=>({payload:payload('bulk:'+String(i).padStart(3,'0'),f.venueId,5000),status:'accepted_by_transport',nodeId:s.node.id,detail:'Transport accepted; paper unverified'}));f.put(key(f.venueId),s);
 assert.equal((await f.node('poll')).status,200);const saved=f.read();assert.equal(saved.jobs.length,0);assert.equal(saved.archivedCount,80);assert.ok(Buffer.byteLength(JSON.stringify(saved))<10000);
 const records=f.r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key LIKE '__bd_print_job_v1__:%'").all(f.owner.userId);assert.equal(records.length,80);assert.ok(records.every(row=>JSON.parse(String(row.data_json)).payload.lines[0].name.length===5000));
 const first:any=await(await f.manager(undefined,'?archive=1')).json();assert.equal(first.jobs.length,50);assert.ok(first.nextCursor);const next:any=await(await f.manager(undefined,'?archive=1&cursor='+encodeURIComponent(first.nextCursor))).json();assert.equal(next.jobs.length,30);
 assert.equal((await f.node('start','a'.repeat(64),{jobId:'bulk:000'}).then(r=>r.json()) as any).go,false);
 const stale=f.read();stale.jobs=[{payload:payload('atomic',f.venueId),status:'sending',nodeId:stale.node.id}];f.put(key(f.venueId),stale);
 f.r.beforeNextBatch(()=>{throw Error('simulated crash before commit')});await assert.rejects(()=>f.node('ack','a'.repeat(64),{jobId:'atomic',status:'accepted_by_transport',detail:'transport'}));assert.equal(f.read().jobs[0].status,'sending');assert.equal(f.r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(f.owner.userId,`__bd_print_job_v1__:${f.venueId}:atomic`),undefined);
 assert.equal((await f.node('ack','a'.repeat(64),{jobId:'atomic',status:'accepted_by_transport',detail:'transport'})).status,200);assert.equal(f.read().jobs.length,0);
 const boot:any=await(await f.r.api.store.GET(f.r.request(f.owner,'/api/store'))).json();assert.ok(!Object.keys(boot.entries).some(k=>k.startsWith('__bd_print_')));
});
test('full active queue refuses additional test before writing, keeps operator controls available',async t=>{
 const f=await setup(t),s=f.read();s.jobs=Array.from({length:100},(_,i)=>({payload:payload('waiting:'+i,f.venueId),status:'outcome_unknown',nodeId:s.node.id}));f.put(key(f.venueId),s);
 const before=JSON.stringify(f.read());assert.equal((await f.manager({action:'test',operationId:'too-many',expectedRevision:s.revision,printerId:'bar'})).status,409);assert.equal(JSON.stringify(f.read()),before);
 assert.equal((await f.manager()).status,200);assert.equal((await f.manager({action:'revoke',expectedRevision:s.revision})).status,200);
});
test('lost local route after database loss cannot redirect cancellation using current mapping',async t=>{
 const qpath=pathToFileURL(resolve('tools/print-agent/queue.mjs')).href,cpath=pathToFileURL(resolve('tools/print-agent/cloud.mjs')).href;const {Queue}=await import(qpath),{syncOnce}=await import(cpath);const dir=mkdtempSync(join(tmpdir(),'print-lost-')),q=new Queue(join(dir,'q'),1);t.after(()=>{q.close();rmSync(dir,{recursive:true,force:true})});
 const original=payload('original',1),cancel={...payload('cancel',1),kind:'CANCELLATION',orderId:original.orderId,originalTicketId:'original',reason:'Cancellation'};const jobs=[{payload:original,status:'accepted_by_transport'},{payload:cancel,status:'leased'}];let writes=0;const api=async(action:string)=>action==='poll'?{jobs}:{ok:true,go:true};
 await syncOnce(q,{printers:{bar:{type:'tcp',host:'192.0.2.1',port:9100,codePage:17,columns:42,cut:false}}},api,async()=>{writes++});assert.equal(writes,0);assert.equal(q.get('cancel').status,'outcome_unknown');
});
test('byte-bounded intake defers durable source backlog and skips archive tombstones on subsequent polls',async t=>{
 const f=await setup(t),c:PosOrderContext=salesEventFixture();c.venueId=f.venueId;c.assortment.nomenclatureStructure=defaultNomenclatureStructure();(c.assortment.menuItems as any[])[0].sectionId='bar';c.preparationConfig={version:1,venueId:f.venueId,revision:1,routes:[{sectionId:'bar',printerId:'bar',printerName:'Бар'}],operations:[]};c.revenues=planSalesShift(c,'open_shift','shift','Test');let orders:any[]=[];
 for(let i=0;i<6;i++){const id='order-'+i;const created=await planPosOrder(c,orders,{action:'create',orderId:id,operationId:'create-'+i,expectedRevision:0,shiftId:'shift',tableNumber:String(i+1),lines:[{id:'line-'+i,menuItemId:'beer',quantity:1}]});const confirmed=await planPosOrder(c,created.orders,{action:'confirm',orderId:id,operationId:'confirm-'+i,expectedRevision:1});orders=confirmed.orders;const order=orders.find(o=>o.id===id);order.lines[0].name='X'.repeat(i===5?220000:80000);order.preparationTickets[0].lines[0].name=order.lines[0].name;}
 f.put('bd_pos_orders_v1',orders);const response:any=await(await f.node('poll')).json();assert.equal(response.jobs.length,4);const state=f.read();assert.ok(Buffer.byteLength(JSON.stringify(state.jobs))<=400000);assert.ok(Buffer.byteLength(JSON.stringify(state))<1500000);assert.equal(state.backlog,2);assert.equal(state.oversized,1);
 const first=response.jobs[0].payload.id;await f.node('start','a'.repeat(64),{jobId:first});await f.node('ack','a'.repeat(64),{jobId:first,status:'accepted_by_transport',detail:'test transport'});
 const next:any=await(await f.node('poll')).json();assert.equal(next.jobs.length,4);assert.ok(!next.jobs.some((j:any)=>j.payload.id===first));assert.equal(f.read().backlog,1);assert.equal(f.read().oversized,1);
 const archive:any=await(await f.manager(undefined,'?archive=1')).json();assert.equal(archive.jobs.length,1);assert.equal(archive.jobs[0].id,first);
});
