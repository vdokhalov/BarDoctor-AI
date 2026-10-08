import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';

const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const functions=new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const storage=()=>{const data=new Map([['bd_session','qa@isolated.test'],['bd_session_token','qa-only'],['bd_active_venue_id','1']]);return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size}};};
const flush=()=>new Promise(done=>setImmediate(done));
function provider(fetch,cachedProfile=null){
 const localStorage=storage(),window=new EventTarget(),states=[],refs=[],effects=[];let index=0,ref=0,cacheWrites=0;
 window.__bdBootstrapPending=true;window.__bdAuthBootstrapV274={state:'loading'};
 const context=vm.createContext({window,localStorage,fetch,AbortController,AbortSignal,DOMException,Error,vz:'/api/restaurants',wz:{Provider:'provider'},bz:()=>cachedProfile,jz:()=>cacheWrites++,Ot:()=>localStorage.getItem('bd_session'),gz:()=>localStorage.getItem('bd_session_token'),ca:()=>({}),uM:async()=>{},i:{jsx:(_type,props)=>props},S:{useState:initial=>{const at=index++;if(!(at in states))states[at]=typeof initial==='function'?initial():initial;return[states[at],value=>states[at]=value]},useRef:initial=>refs[ref++]??(refs[ref-1]={current:initial}),useEffect:fn=>{if(!effects.length)effects.push(fn)},useCallback:fn=>fn}});
 vm.runInContext(functions.get('zse')+';'+functions.get('Vse'),context);
 const render=()=>{index=0;ref=0;return context.Vse({children:null}).value;};const initial=render(),cleanup=effects[0]();
 const complete=()=>{window.__bdBootstrapPending=false;window.__bdAuthBootstrapV274={state:'ready'};window.dispatchEvent(new Event('bd:bootstrap-complete'));};
 return{window,localStorage,initial,render,complete,cleanup,writes:()=>cacheWrites};
}

test('profile waits for bootstrap, records failure, and recovers on completion without a reload',async()=>{
 let calls=0;const p=provider(async()=>++calls===1?Response.json({ok:false,error:'QA temporary failure'},{status:503}):Response.json({ok:true,restaurant:{name:'QA Team'}}));
 assert.equal(calls,0);p.complete();await flush();
 assert.equal(p.render().isReady,true);assert.equal(p.render().profile,null);assert.equal(p.render().profileError.status,503);
 p.window.__bdBootstrapPending=true;p.window.dispatchEvent(new Event('bd:bootstrap-start'));assert.equal(p.render().isReady,false);
 p.complete();await flush();assert.equal(p.render().profile.name,'QA Team');assert.equal(p.render().profileError,null);assert.equal(calls,2);
 p.cleanup();p.complete();assert.equal(calls,2);
});

test('cached profile is not ready on the first render and revoked verification clears it',async()=>{
 let calls=0;const p=provider(async()=>{calls++;return Response.json({ok:false,error:'revoked'},{status:403});},{name:'cached QA profile'});
 assert.equal(p.initial.isReady,false);assert.equal(p.initial.profile.name,'cached QA profile');assert.equal(calls,0);
 p.complete();await flush();assert.equal(calls,1);assert.equal(p.render().profile,null);assert.equal(p.render().profileError.status,403);assert.equal(p.writes(),0);p.cleanup();
});

test('venue change during JSON consumption never commits stale cache and ends in retryable recovery',async()=>{
 let finish;const body=new Promise(done=>finish=done);const p=provider(async()=>({ok:true,status:200,json:()=>body}));
 p.complete();await flush();p.localStorage.setItem('bd_active_venue_id','2');finish({ok:true,restaurant:{name:'foreign-old-profile'}});await flush();
 assert.equal(p.writes(),0);assert.equal(p.render().profile,null);assert.equal(p.render().isReady,true);assert.equal(p.render().profileError.reason,'profile_context_changed');p.cleanup();
});

test('revoked profile response cannot render a cached Team profile',async()=>{
 const p=provider(async()=>Response.json({ok:false,error:'denied'},{status:403}));p.complete();await flush();
 assert.equal(p.render().profile,null);assert.equal(p.render().profileError.status,403);assert.equal(p.writes(),0);p.cleanup();
});

for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v397.js'])test(file+' bounds fetch/body, retains session on timeout, coalesces retry and requires server success',async()=>{
 const script=readFileSync(file,'utf8'),start=script.indexOf('  var bdBootstrapRetryPromiseV496'),end=script.indexOf('  await bdRetryBootstrapV496(true);',start);
 assert.ok(start>0&&end>start);
 const localStorage=storage(),window=new EventTarget(),timers=[];let calls=0,mode='stalled';
 window.__bdAuthBootstrapV274={state:'ready',reason:'cached_shell_ready_v397'};window.location={pathname:'/employees'};
 const context=vm.createContext({window,localStorage,sessionStorage:storage(),CustomEvent:class extends Event{},DOMException,AbortController,Promise,JSON,currentFirstName:'',cleanFirstName:v=>v||'',refreshServerInventoryCacheV235:async()=>{},setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout:()=>{},rememberAccessContext:result=>window.__bdAuthBootstrapV274=result.bootstrap,fetch:async()=>{calls++;return mode==='stalled'?{ok:true,json:()=>new Promise(()=>{})}:Response.json(mode==='denied'?{ok:false,needsLogin:true}:{ok:true,email:'qa@isolated.test',token:'qa-only',userId:1,bootstrap:{state:'ready',reason:'active_venue_ready'}},{status:mode==='denied'?401:200});}});
 vm.runInContext(script.slice(start,end),context);
 const first=window.__bdRetryBootstrapV496(true),duplicate=window.__bdRetryBootstrapV496(true);assert.equal(calls,1);timers[0]();await first;await duplicate;
 assert.equal(window.__bdAuthBootstrapV274.reason,'bootstrap_timeout');assert.equal(window.__bdBootstrapPending,false);assert.equal(localStorage.getItem('bd_session_token'),'qa-only');
 mode='normal';await window.__bdRetryBootstrapV496();assert.equal(window.__bdAuthBootstrapV274.state,'ready');assert.equal(calls,2);
 mode='denied';await window.__bdRetryBootstrapV496();assert.equal(window.__bdAuthBootstrapV274.state,'unauthenticated');assert.equal(localStorage.getItem('bd_session_token'),null);
});

for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v397.js'])for(const failKey of ['bd_active_permissions','bd_session_userid'])test(file+' '+failKey+' commit failure cannot leave authenticated bootstrap ready',async()=>{
 const script=readFileSync(file,'utf8'),start=script.indexOf('  var bdBootstrapRetryPromiseV496'),end=script.indexOf('  await bdRetryBootstrapV496(true);',start);
 const find=(node,name)=>{if(!node||typeof node!=='object')return null;if(node.type==='FunctionDeclaration'&&node.id?.name===name)return node;for(const value of Object.values(node)){for(const child of Array.isArray(value)?value:[value]){const found=find(child,name);if(found)return found;}}return null;};
 const helper=find(parse(script,{ecmaVersion:'latest',sourceType:'script'}),'rememberAccessContext');assert.ok(helper);
 const localStorage=storage(),sessionStorage=storage(),window=new EventTarget();window.__bdAuthBootstrapV274={state:'ready',reason:'cached_shell_ready_v397'};window.location={pathname:'/employees',href:'https://qa.isolated.test/employees'};window.history={replaceState:()=>{}};
 const nativeSet=localStorage.setItem;let fail=true;localStorage.setItem=(key,value)=>{if(fail&&key===failKey)throw new DOMException('QA local storage unavailable','QuotaExceededError');return nativeSet(key,value);};
 const context=vm.createContext({window,localStorage,sessionStorage,URL,CustomEvent:class extends Event{},DOMException,AbortController,Promise,JSON,currentRole:'',currentPermissions:[],currentFirstName:'',cleanFirstName:v=>v||'',refreshServerInventoryCacheV235:async()=>{},setTimeout:()=>1,clearTimeout:()=>{},fetch:async()=>Response.json({ok:true,email:'qa@isolated.test',token:'qa-only',userId:1,role:'owner',permissions:['employees.view'],activeVenueId:1,activeVenueIsPrimary:true,venues:[{id:1,isPrimary:true}],bootstrap:{state:'ready',reason:'active_venue_ready'}})});
 vm.runInContext(script.slice(helper.start,helper.end)+'\n'+script.slice(start,end),context);
 await window.__bdRetryBootstrapV496();
 assert.equal(window.__bdAuthBootstrapV274.state,'error','Partial storage commit must not expose ready');assert.equal(window.__bdBootstrapPending,false);assert.equal(localStorage.getItem('bd_session_token'),'qa-only');
 fail=false;await window.__bdRetryBootstrapV496();assert.equal(window.__bdAuthBootstrapV274.state,'ready');assert.equal(localStorage.getItem('bd_active_venue_id'),'1');
});

for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v397.js'])test(file+' pagehide prevents a late bootstrap body from changing the next document context',async()=>{
 const script=readFileSync(file,'utf8'),start=script.indexOf('  var bdBootstrapRetryPromiseV496'),end=script.indexOf('  await bdRetryBootstrapV496(true);',start);
 const localStorage=storage(),window=new EventTarget();window.__bdAuthBootstrapV274={state:'ready',reason:'cached_shell_ready_v397'};window.location={pathname:'/employees'};
 let finish,signal,writes=0;const body=new Promise(done=>finish=done);
 const context=vm.createContext({window,localStorage,sessionStorage:storage(),CustomEvent:class extends Event{},DOMException,AbortController,Promise,JSON,currentFirstName:'',cleanFirstName:v=>v||'',refreshServerInventoryCacheV235:async()=>{},setTimeout:()=>1,clearTimeout:()=>{},rememberAccessContext:()=>writes++,fetch:async(_url,init)=>{signal=init.signal;return{ok:true,status:200,json:()=>body};}});
 vm.runInContext(script.slice(start,end),context);const pending=window.__bdRetryBootstrapV496(true);await flush();window.dispatchEvent(new Event('pagehide'));assert.equal(signal.aborted,true);
 assert.equal(window.__bdBootstrapPending,false);assert.equal(window.__bdAuthBootstrapV274.reason,'bootstrap_document_closed');
 const next={state:'loading',reason:'next_document'};window.__bdAuthBootstrapV274=next;window.__bdBootstrapPending=true;finish({ok:true,email:'qa@isolated.test',token:'stale-replacement',userId:9,bootstrap:{state:'ready'}});await pending;
 assert.equal(writes,0);assert.equal(window.__bdAuthBootstrapV274,next);assert.equal(window.__bdBootstrapPending,true);assert.equal(localStorage.getItem('bd_session_token'),'qa-only');assert.equal(localStorage.getItem('bd_active_venue_id'),'1');
});

for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v397.js'])test(file+' an empty server venue invalidates cached readiness before a delayed redirect',()=>{
 const script=readFileSync(file,'utf8'),find=(node)=>{if(!node||typeof node!=='object')return null;if(node.type==='FunctionDeclaration'&&node.id?.name==='rememberAccessContext')return node;for(const value of Object.values(node)){for(const child of Array.isArray(value)?value:[value]){const found=find(child);if(found)return found;}}return null;};
 const helper=find(parse(script,{ecmaVersion:'latest',sourceType:'script'}));assert.ok(helper);
 const localStorage=storage(),window=new EventTarget(),serverState={state:'recovery_required',reason:'no_active_venue'};window.__bdAuthBootstrapV274={state:'ready',reason:'cached_shell_ready_v397'};window.location={pathname:'/employees',replace:()=>assert.equal(window.__bdAuthBootstrapV274,serverState)};
 const context=vm.createContext({window,localStorage,sessionStorage:storage(),currentRole:'',currentPermissions:[],CustomEvent:class extends Event{}});
 vm.runInContext(script.slice(helper.start,helper.end),context);context.rememberAccessContext({ok:true,userId:1,email:'qa@isolated.test',activeVenueId:null,bootstrap:serverState});
 assert.equal(window.__bdAuthBootstrapV274,serverState);assert.equal(localStorage.getItem('bd_active_venue_id'),null);assert.equal(localStorage.getItem('bd_session_token'),'qa-only');
});
