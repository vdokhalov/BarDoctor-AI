import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parse} from 'acorn';
const source=fs.readFileSync('public/cashier.js','utf8'),body=parse(source,{ecmaVersion:'latest'}).body[0].expression.callee.body.body;
const names=['request','assertCurrentLoad','load','accept','reconcileAccess','clearSensitive','setReport','errorView','changeView'];
const functions=names.map(name=>{const n=body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return source.slice(n.start,n.end)}).join('\n');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const owner={ok:true,venueId:1,actor:{role:'owner'},permissions:{managementDay:true},shifts:[{id:'cash',date:'2026-10-10',closingStatus:'open'}]},staff={...owner,actor:{role:'cashier'},permissions:{managementDay:false}},report={shiftId:'cash',businessDate:'2026-10-10',status:'open',payroll:800};
function fixture(){
 const queue=[],nodes=new Map(),storage=new Map([['bd_session','owner'],['bd_session_token','token']]);let selected='1';
 const state={data:owner,orders:[],report,workday:{management:{payroll:800}},rules:[],view:'report',busy:false,frozen:false};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',replaceChildren(){this.textContent=''},close(){},setAttribute(){}});return nodes.get(id)};
 const c=vm.createContext({state,loadGeneration:0,navigationGeneration:0,navigationLoading:false,refreshController:null,initialIdentity:'owner:token',initialVenue:'1',identity:()=>[storage.get('bd_session'),storage.get('bd_session_token')].join(':'),selectedVenue:()=>selected,$:node,localStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},document:{querySelectorAll:()=>[]},location:{replace(){}},window:{scrollTo(){},setInterval:()=>1,clearInterval(){}},Date,Error,AbortSignal,Response,fetch:(path)=>new Promise((resolve,reject)=>queue.push({path,resolve,reject})),senior:()=>['owner','manager','shift_manager'].includes(state.data?.actor.role),configure:()=>['owner','manager'].includes(state.data?.actor.role),selectedShift:data=>data.shifts.find(s=>s.closingStatus==='open'),clearView:id=>node(id+'-view').replaceChildren(),syncQuickShift(){},render(){},renderRecovery(){},setBusy(){},notice(){}});
 vm.runInContext(functions,c);vm.runInContext(fs.readFileSync('public/pos-refresh.js','utf8'),c);
 c.refreshController=c.window.bdPosRefresh({load:c.load,onSuccess:c.accept,onError:c.errorView,isVisible:()=>true,canRun:()=>true,setInterval:()=>1,clearInterval(){}});c.refreshController.start();
 const take=(path)=>{const i=queue.findIndex(x=>x.path===path);assert.notEqual(i,-1,'pending '+path);return queue.splice(i,1)[0]};
 const reply=(path,data,status=200)=>take(path).resolve(new Response(JSON.stringify(data),{status,headers:{'X-BD-Sales-Journal':data.actor?.role==='cashier'?'0':'1'}}));
 const base=async(data=owner)=>{reply('/api/sales-events',data);reply('/api/pos-orders',{ok:true,venueId:1,orders:[]});await tick()};
 return {c,state,queue,nodes,storage,reply,take,base,venue(value){selected=value},async oldReport(){const pending=c.refreshController.refresh(true);await base();const oldReport=take('/api/sales-events?reportShiftId=cash'),oldDays=take('/api/operational-days');return {pending,release(){oldReport.resolve(new Response(JSON.stringify({ok:true,report})));oldDays.resolve(new Response(JSON.stringify({ok:true,venueId:1,days:[{businessDate:'2026-10-10',management:{payroll:800}}]})));}}}};
}
test('late owner background report cannot restore role or payroll after newer staff navigation',async()=>{
 const f=fixture(),old=await f.oldReport();const newer=f.c.changeView('overview');await f.base(staff);await newer;assert.equal(f.state.data.actor.role,'cashier');assert.equal(f.state.report,null);old.release();await old.pending;assert.equal(f.state.data.actor.role,'cashier');assert.equal(f.state.report,null);assert.equal(f.state.workday,null);assert.equal(f.c.refreshController.state().lastSuccess,null);
});
test('late base-role response cannot run early permission/header side effects after newer role result',async()=>{
 const f=fixture(),old=f.c.refreshController.refresh(true),oldBase=f.take('/api/sales-events'),oldOrders=f.take('/api/pos-orders');const newer=f.c.changeView('overview');await f.base(staff);await newer;oldBase.resolve(new Response(JSON.stringify(owner),{headers:{'X-BD-Sales-Journal':'1'}}));oldOrders.resolve(new Response(JSON.stringify({ok:true,venueId:1,orders:[]})));await old;assert.equal(f.state.data.actor.role,'cashier');assert.equal(f.nodes.get('sales-journal').hidden,true);assert.equal(f.state.report,null);
});
test('membership denial wins over older privileged report',async()=>{
 const f=fixture(),old=await f.oldReport();const newer=f.c.changeView('overview');f.reply('/api/sales-events',{ok:false},403);f.reply('/api/pos-orders',{ok:false},403);await newer;old.release();await old.pending;assert.equal(f.state.frozen,true);assert.equal(f.state.data,null);assert.equal(f.state.report,null);assert.equal(f.state.workday,null);
});
for(const kind of ['venue','signout'])test('pending privileged response cannot survive '+kind+' change',async()=>{
 const f=fixture(),old=await f.oldReport();if(kind==='venue')f.venue('2');else f.storage.delete('bd_session_token');old.release();await old.pending;assert.equal(f.state.frozen,true);assert.equal(f.state.data,null);assert.equal(f.state.report,null);assert.equal(f.state.workday,null);
});
test('newer background result wins over older navigation and obsolete errors remain silent',async()=>{
 const f=fixture();const old=f.c.changeView('overview'),oldBase=f.take('/api/sales-events'),oldOrders=f.take('/api/pos-orders');const fresh=f.c.refreshController.refresh(true);await f.base(staff);await fresh;oldBase.reject(Error('old network error'));oldOrders.resolve(new Response(JSON.stringify({ok:true,venueId:1,orders:[]})));await old;assert.equal(f.state.data.actor.role,'cashier');assert.equal(f.state.report,null);assert.equal(f.state.stale,false);assert.equal(f.c.navigationLoading,false);
});
test('already-resolved old snapshot is rejected by accept after a newer load starts',async()=>{
 const f=fixture();f.state.view='cashier';const a=f.c.load();await f.base();const old=await a;const b=f.c.load();assert.equal(f.c.accept(old),false);await f.base(staff);assert.equal(f.c.accept(await b),true);assert.equal(f.state.data.actor.role,'cashier');
});
test('local tab change does not discard the only in-flight authoritative role revocation',async()=>{
 const f=fixture(),pending=f.c.refreshController.refresh(true);await f.c.changeView('cashier');await f.base(staff);await pending;assert.equal(f.state.data.actor.role,'cashier');assert.equal(f.state.report,null);assert.equal(f.state.workday,null);
});
