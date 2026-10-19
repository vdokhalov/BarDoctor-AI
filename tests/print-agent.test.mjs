import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import net from 'node:net';
import {Queue} from '../tools/print-agent/queue.mjs';
import {endpoint,render,tcpSend,beforeSend,windowsSend} from '../tools/print-agent/transports.mjs';
const profile={type:'tcp',host:'127.0.0.1',port:9100,codePage:17,columns:42,cut:false};
const original=(id='prep:1',printerId='kitchen')=>({id,venueId:1,orderId:'order',tableNumber:'1',sectionId:printerId,sectionName:'Кухня',printerId,routeRevision:1,kind:'PREPARATION',createdAt:'2026-10-19T07:00:00Z',lines:[{name:'Тосты',quantity:3}]});
const cancel=()=>({...original('cancel:1'),kind:'CANCELLATION',originalTicketId:'prep:1',reason:'Ошибка',lines:[{name:'Тосты',quantity:1}]});
function setup(t){const dir=mkdtempSync(join(tmpdir(),'bd-print-')),path=join(dir,'queue.db');let q=new Queue(path,1);t.after(()=>{q.close();rmSync(dir,{recursive:true,force:true})});return {get q(){return q},restart(){q.close();q=new Queue(path,1);q.recover()},path}}
const batch=(...tickets)=>({version:1,venueId:1,tickets});
test('immutable imports deduplicate, reject venue/payload conflicts atomically and enforce original cancellation route',t=>{
 const {q}=setup(t);q.import(batch(original()));q.import(batch(original()));assert.equal(q.list().length,1);
 assert.throws(()=>q.import(batch(original('new'),{...original(),tableNumber:'2'})),/conflict/);assert.equal(q.list().length,1);
 assert.throws(()=>q.import({...batch(original()),venueId:2}),/Invalid/);
 assert.throws(()=>q.import(batch({...cancel(),printerId:'bar'})),/route/);
 q.import(batch(cancel()));assert.equal(q.list().length,2);
});
test('single writer lock; crash recovery never resends sending jobs, other printers continue',async t=>{
 const s=setup(t);s.q.import(batch(original(),cancel(),original('bar:1','bar')));assert.throws(()=>new Queue(s.path,1),/already running/);
 s.q.db.prepare("UPDATE jobs SET status='sending',endpoint=? WHERE id=?").run(JSON.stringify(profile),'prep:1');s.restart();assert.equal(s.q.get('prep:1').status,'outcome_unknown');
 const sent=[];await s.q.runOne(()=>profile,async(_,job)=>sent.push(job.id));assert.deepEqual(sent,['bar:1']);assert.equal(await s.q.runOne(()=>profile,async()=>assert.fail()),false);assert.throws(()=>s.q.retry('prep:1'));
});
test('explicit copy precedes waiting cancellation and both retain frozen original endpoint after reconfiguration',async t=>{
 const {q}=setup(t);q.import(batch(original(),cancel()));await q.runOne(()=>profile,async()=>{throw Error('lost acknowledgement')});const copy=q.copy('prep:1','Бумага проверена; запросить копию');
 const sent=[];const transport=async(p,j,isCopy)=>{sent.push({host:p.host,id:j.id,isCopy});return 'transport only'};
 await q.runOne(()=>({...profile,host:'192.0.2.4'}),transport);await q.runOne(()=>{throw Error('mapping removed')},transport);
 assert.deepEqual(sent,[{host:'127.0.0.1',id:'prep:1',isCopy:true},{host:'127.0.0.1',id:'cancel:1',isCopy:false}]);assert.equal(q.get(copy).status,'accepted_by_transport');assert.equal(q.get('prep:1').status,'operator_resolved');
 assert.equal(await q.runOne(()=>profile,transport),false);
});
test('only definite pre-send failure allows explicit retry; acceptance is not physical success',async t=>{
 const {q}=setup(t);q.import(batch(original()));await q.runOne(()=>profile,async()=>{throw beforeSend('connect refused')});assert.equal(q.get('prep:1').status,'failed_before_send');assert.equal(await q.runOne(()=>profile,async()=>assert.fail()),false);
 q.retry('prep:1');await q.runOne(()=>profile,async()=>42);assert.equal(q.get('prep:1').status,'accepted_by_transport');q.confirm('prep:1','Бегунок прочитан на бумаге');assert.equal(q.get('prep:1').status,'operator_confirmed');
});
test('TCP adapter transmits CP866 bytes to local fake device, copy/cancel labels and command-injection rejection',async t=>{
 const chunks=[];const server=net.createServer(socket=>socket.on('data',b=>chunks.push(b)));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const p={...profile,port:server.address().port};const bytes=render(original(),p,true);await tcpSend(p,bytes);await new Promise(r=>setTimeout(r,20));assert.deepEqual(Buffer.concat(chunks),bytes);assert.ok(bytes.includes(Buffer.from([0x8a,0x8e,0x8f,0x88,0x9f])));
 assert.ok(render(cancel(),p).includes(Buffer.from([0x8e,0x92,0x8c,0x85,0x8d,0x80])));
 assert.throws(()=>render({...original(),tableNumber:'\x1b@'},p),/unsupported/);assert.throws(()=>endpoint({...p,host:'example.com'}));assert.throws(()=>render({...original(),sectionName:'😀'},p));
 if(process.platform!=='win32')await assert.rejects(windowsSend({type:'windows-raw',queue:'fake'},bytes),e=>e.beforeSend===true);
});
test('accepted jobs and dedup survive restart; unconfigured tickets never silently pick a new route',async t=>{
 const s=setup(t);s.q.import(batch(original(),{...original('unconfigured'),printerId:null}));await s.q.runOne(()=>profile,async()=> 'accepted');s.restart();s.q.import(batch(original()));assert.equal(s.q.get('prep:1').status,'accepted_by_transport');assert.equal(s.q.get('unconfigured').status,'unconfigured');assert.equal(await s.q.runOne(()=>profile,async()=>assert.fail()),false);
});
test('Windows spool subprocess contract uses stdin only; success is transport acceptance and failure stays unknown',async()=>{
 const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');
 const calls=[];let fail=false;
 const spawnProcess=(exe,args)=>{calls.push({exe,args});const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};let input='';child.stdin.on('data',b=>input+=b);child.stdin.on('finish',()=>{const job=JSON.parse(input);assert.equal(job.queue,'USB Thermal');assert.equal(job.bytes,Buffer.from('TEST').toString('base64'));queueMicrotask(()=>{if(!fail)child.stdout.write('{"status":"accepted_by_transport","jobId":42}');child.emit('close',fail?1:0)})});return child};
 assert.match(await windowsSend({queue:'USB Thermal'},Buffer.from('TEST'),{platform:'win32',spawnProcess}),/physical output unverified/);
 assert.ok(!calls[0].args.some(a=>a.includes('USB Thermal')));assert.equal(calls[0].exe,'powershell.exe');
 fail=true;await assert.rejects(windowsSend({queue:'USB Thermal'},Buffer.from('TEST'),{platform:'win32',spawnProcess}),e=>e.beforeSend!==true);
});
