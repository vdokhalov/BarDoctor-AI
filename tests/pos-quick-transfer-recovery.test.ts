import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
type Draft={id:string;comment:string;lines:{id:string;menuItemId:string;quantity:number}[]};
const draft=():Draft=>({id:'source-quick',comment:'original',lines:[{id:'a',menuItemId:'beer',quantity:1},{id:'b',menuItemId:'coffee',quantity:1}]});
function fixture(){
 const text=readFileSync('public/cashier.js','utf8');const source=text.slice(text.indexOf('  function quickOrigin('),text.indexOf('  async function orderAction('));
 assert.ok(source.includes('confirmPending(saved,key)'));
 const key='workspace',state={quick:draft(),pending:null as unknown,legacy:null,frozen:false};let value=JSON.stringify({quick:state.quick,pending:null}),requests=0,lost=false,reloadFailure=false,writeFailure=false;
 const storage={getItem:()=>value,setItem:(_key:string,next:string)=>{if(writeFailure)throw Error('quota');value=next;}};
 const context=vm.createContext({state,JSON,Error,localStorage:storage,uuid:()=> 'replacement-quick',storageKey:()=>key,saveLocal:()=>storage.setItem(key,JSON.stringify({quick:state.quick,pending:state.pending})),request:async()=>{requests++;if(lost)throw Object.assign(Error('lost'),{uncertain:true});return {order:{id:'table'},duplicate:requests>1};},reload:async()=>{if(reloadFailure)throw Object.assign(Error('read failed'),{uncertain:true});}});
 vm.runInContext(source,context);
 const create=(fromQuick=true)=>context.mutate('/api/pos-orders',{action:'create',orderId:'table',operationId:'create',lines:fromQuick?state.quick.lines:[]},fromQuick?context.quickOrigin(state.quick):undefined) as Promise<unknown>;
 return {state,create,retry:()=>context.sendPending() as Promise<unknown>,read:()=>JSON.parse(value),requests:()=>requests,setLost:(v:boolean)=>{lost=v;},setReloadFailure:(v:boolean)=>{reloadFailure=v;},setWriteFailure:(v:boolean)=>{writeFailure=v;},restore:()=>{const saved=JSON.parse(value);state.quick=saved.quick;state.pending=saved.pending;},replaceStored:(quick:Draft)=>{value=JSON.stringify({...JSON.parse(value),quick});}};
}
test('quick transfer lost response retains provenance; retry after browser restore consumes matching draft once',async()=>{
 const f=fixture();f.setLost(true);await assert.rejects(f.create(),/lost/);
 assert.equal(f.read().pending.origin.draftId,'source-quick');assert.equal(f.read().quick.lines.length,2);
 f.restore();f.setLost(false);await f.retry();assert.equal(f.state.pending,null);assert.equal(f.state.quick.lines.length,0);assert.equal(f.read().quick.lines.length,0);assert.equal(f.requests(),2);
 await f.retry();assert.equal(f.requests(),2);
});
test('confirmed quick transfer consumes draft durably before a reload failure',async()=>{
 const f=fixture();f.setReloadFailure(true);await assert.rejects(f.create(),/read failed/);
 assert.equal(f.state.pending,null);assert.equal(f.state.quick.lines.length,0);assert.equal(f.read().pending,null);assert.equal(f.read().quick.lines.length,0);
 f.restore();await f.retry();assert.equal(f.requests(),1);
});
test('ordinary table creation and its retry preserve an unrelated quick basket',async()=>{
 const f=fixture();f.setLost(true);await assert.rejects(f.create(false));assert.equal(f.read().pending.origin,undefined);
 f.restore();f.setLost(false);await f.retry();assert.deepEqual(f.read().quick,draft());assert.deepEqual(JSON.parse(JSON.stringify(f.state.quick)),draft());
});
for(const change of ['new-id','changed-quantity','memory-only'] as const)test('confirmed transfer preserves changed draft race: '+change,async()=>{
 const f=fixture();f.setLost(true);await assert.rejects(f.create());const changed=draft();
 if(change==='new-id')changed.id='different-quick';else changed.lines[0].quantity=2;
 if(change==='memory-only')f.state.quick=changed;else f.replaceStored(changed);
 f.setLost(false);await f.retry();assert.deepEqual(f.read().quick,changed);assert.deepEqual(JSON.parse(JSON.stringify(f.state.quick)),changed);assert.equal(f.read().pending,null);
});
test('local acknowledgement failure retains pending and source until a safe retry can persist consumption',async()=>{
 const f=fixture();f.setLost(true);await assert.rejects(f.create());f.setLost(false);f.setWriteFailure(true);await assert.rejects(f.retry(),/локальное подтверждение/);
 assert.equal(f.read().quick.lines.length,2);assert.ok(f.read().pending);assert.ok(f.state.pending);
 f.setWriteFailure(false);await f.retry();assert.equal(f.read().quick.lines.length,0);assert.equal(f.read().pending,null);
});
