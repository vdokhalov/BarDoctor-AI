import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=readFileSync(process.env.BD_QA_BUNDLE||'public/assets/index-BQGspy0I.js','utf8');
const slice=(begin,end)=>{const start=source.indexOf(begin),finish=source.indexOf(end,start);assert.ok(start>=0&&finish>start);return source.slice(start,finish);};
const getter=slice('async function Yse(', 'const us=new Map');
const warm=slice('function bdWarmCriticalHomeV349()', '\nbdWarmCriticalHomeV349();');
const apply=slice('function bdApplyHomeFinanceWarmV349()', '\nfunction Woe(');
const begin=source.indexOf('function bdHandleFinanceWarmFailurePhase3a5(');
const guard=begin<0?'':source.slice(begin,source.indexOf('// end canonical boundary Phase3a5',begin));

function scenario(status=403,code='ACCESS_DENIED',failure='response'){
 const script=`
 const vm=require('node:vm'),events=[],handled=[],applied=[];
 process.on('unhandledRejection',error=>events.push({message:error.message,status:error.status,code:error.code}));
 process.on('rejectionHandled',()=>handled.push(true));
 const context={window:{},EC:'/api/store',Ot:()=> 'isolated QA session',ca:()=>({}),bdFetchBusinessHealthV377:()=>Promise.resolve({}),bdClearMissingServerStoreV324:key=>applied.push(key),Kse:(key,data)=>applied.push({key,data}),fetch:async path=>{
   if(!path.endsWith('bd_finance_expenses'))return{ok:true,status:200,json:async()=>({ok:true,data:[]})};
   if(${JSON.stringify(failure)}==='network')throw new Error('Synthetic connection failed');
   return {ok:${status}<400,status:${status},json:async()=>(${status}===200?{ok:true,data:[{id:'synthetic',amount:12}]}:${JSON.stringify(failure)}==='fake-success'?{ok:true,data:[{amount:98765}]}:{ok:false,code:${JSON.stringify(code)},error:'Synthetic denial/failure'})};
 }};
 vm.createContext(context);vm.runInContext(${JSON.stringify(getter+'\n'+guard+'\n'+warm+'\n'+apply+'\nbdWarmCriticalHomeV349();')},context);
 setTimeout(async()=>{
  const result=await vm.runInContext('bdApplyHomeFinanceWarmV349()',context);
  const settled=await context.window.__bdStartupFinanceWarmV349.catch(error=>({failed:true,status:error.status,code:error.code}));
  setImmediate(()=>console.log(JSON.stringify({events,handled,applied,result,settled})));
 },30);
 `;
 const child=spawnSync(process.execPath,['-e',script],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout.trim());
}

test('expected Finance ACCESS_DENIED is handled before delayed React consumer; no fabricated finance/cache data',()=>{
 const result=scenario();assert.deepEqual(result.events,[]);assert.deepEqual(result.handled,[]);assert.deepEqual(result.applied,[]);assert.equal(result.result,false);assert.equal(result.settled.availability,'RESTRICTED');assert.ok(!('data' in result.settled));
});
test('authenticated Finance success retains all three canonical warm reads for owner/permitted manager',()=>{
 const result=scenario(200);assert.deepEqual(result.events,[]);assert.equal(result.result,true);assert.equal(result.applied.length,3);assert.equal(result.applied.find(x=>x.key==='bd_finance_expenses').data[0].amount,12);
});
test('expired/revoked auth 401 skips warm read as unavailable, without a fake success or cache writes',()=>{
 const result=scenario(401,null);assert.deepEqual(result.events,[]);assert.deepEqual(result.applied,[]);assert.equal(result.result,false);assert.equal(result.settled.availability,'UNAVAILABLE');
});
for(const [name,status,code,failure] of [
 ['unexpected 403 contract',403,'OTHER_DENIAL','response'],
 ['unexpected server 500',500,'SERVER_ERROR','response'],
 ['500 with misleading ACCESS_DENIED code',500,'ACCESS_DENIED','response'],
 ['500 with success-shaped body',500,null,'fake-success'],
 ['network failure',0,null,'network'],
])test(`${name} remains rejected and visible to the strict browser/error acceptance`,()=>{
 const result=scenario(status,code,failure);assert.equal(result.events.length,1);assert.equal(result.settled.failed,true);assert.deepEqual(result.applied,[]);assert.equal(result.result,false);
});
