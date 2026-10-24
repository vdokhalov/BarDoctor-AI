import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync('scripts/fragments/doctor-task-save.js','utf8');
function harness(storage=new Map(),db=new Map()){
 const state={scope:'owner__venue_1',venue:'1',mode:'success',puts:0,cache:[],headers:[]};
 const ctx={Map,Promise,JSON,Event,AbortController,encodeURIComponent,Error,
  setTimeout:(fn)=>setTimeout(fn,15),clearTimeout,
  bdStorageContext:()=>state.scope,Ot:()=>state.scope.split('__')[0],ca:e=>({'X-Session-Email':e}),
  localStorage:{getItem:k=>k==='bd_active_venue_id'?state.venue:storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  window:{dispatchEvent:()=>{}},Kse:(key,v)=>state.cache.push({scope:state.scope,key,v}),
  Wse:(key,base,next,current)=>({merged:[...current.filter(x=>!next.some(n=>n.id===x.id)),...next],conflicts:[]}),
  fetch:async(url,opts)=>{
   const key=opts.headers['X-Session-Email']+':'+opts.headers['X-Venue-Id']+':'+url;
   state.headers.push({...opts.headers});const current=db.get(key)||[];
   if(opts.method!=='PUT')return{ok:true,json:async()=>({ok:true,data:current})};
   state.puts++;
   if(state.mode==='http')return{ok:false,json:async()=>({ok:false})};
   if(state.mode==='network')throw Error('network');
   if(state.mode==='timeout')return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('timeout'))));
   const data=JSON.parse(opts.body).data;db.set(key,data);
   if(state.mode==='lost-ack')throw Error('lost acknowledgement');
   if(state.mode==='switch'){state.scope='other__venue_2';state.venue='2'}
   return{ok:true,json:async()=>({ok:true,data})};
  }
 };vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,state,storage,db};
}
const changes=[{key:'bd_tasks',base:[],next:[{id:'stable-task',title:'Проверить холодильник'}]}];
for(const mode of ['http','network','timeout','lost-ack'])test(mode+' retains intent; reload and double retry use same IDs',async()=>{
 const h=harness();h.state.mode=mode;h.ctx.bdDoctorQueueTasks(changes);assert.equal(await h.ctx.bdDoctorSaveRetry(),false);assert.equal(h.ctx.bdDoctorSavePending(),true);
 const reloaded=harness(h.storage,h.db);const a=reloaded.ctx.bdDoctorSaveRetry(),b=reloaded.ctx.bdDoctorSaveRetry();assert.equal(a,b);assert.equal(await a,true);
 assert.equal(reloaded.ctx.bdDoctorSavePending(),false);assert.equal([...h.db.values()][0].length,1);assert.equal([...h.db.values()][0][0].id,'stable-task');
 assert.equal(reloaded.state.puts,mode==='lost-ack'?0:1);
});
test('context switch never exposes intent or writes cache/next stage into another tenant',async()=>{
 const h=harness();h.state.mode='switch';h.ctx.bdDoctorQueueTasks([...changes,{...changes[0],key:'bd_action_plans'}]);assert.equal(await h.ctx.bdDoctorSaveRetry(),false);
 assert.equal(h.ctx.bdDoctorSavePending(),false);assert.equal(h.state.cache.length,0);assert.equal(h.state.puts,1);
 assert.ok(h.state.headers.every(x=>x['X-Venue-Id']==='1'&&x['X-Session-Email']==='owner'));
 h.state.scope='owner__venue_1';h.state.venue='1';h.state.mode='success';assert.equal(h.ctx.bdDoctorSavePending(),true);assert.equal(await h.ctx.bdDoctorSaveRetry(),true);
});
