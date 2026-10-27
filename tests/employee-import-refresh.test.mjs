import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parse} from 'acorn';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');const n=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.id?.name==='tle');const code=source.slice(n.start,n.end);
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(path='/integrations'){
 const values={bd_session:'owner',bd_active_venue_id:'1'},events=new EventTarget(),effects=[],requests=[];let rows=[{id:'a',name:'Анна'}],cache=rows,writes=0;
 const ctx=vm.createContext({localStorage:{getItem:k=>values[k]},Ot:()=>values.bd_session,ca:()=>({'X-Session-Token':'local-fixture'}),Ai:()=>({isReady:true}),bt:()=>[path],S:{useState:f=>[f(),v=>rows=v],useRef:v=>({current:v}),useEffect:f=>effects.push(f),useCallback:f=>f},Ch:a=>[...a],mM:()=>cache,Hm:'bd_employees',Vm:(k,v)=>{cache=v},N0:()=>{writes++},i:{jsx:(t,p)=>p},l7:{Provider:'provider'},window:events,fetch:(url,options)=>new Promise(resolve=>requests.push({url,options,resolve}))});
 vm.runInContext(code,ctx);ctx.tle({children:null});const cleanups=effects.map(f=>f());
 const fire=(venueId='1',email='owner')=>events.dispatchEvent(new CustomEvent('bd:employees-imported',{detail:{venueId,email}}));
 return{values,requests,fire,get:()=>rows,writes:()=>writes,close:()=>cleanups.forEach(f=>f?.())};
}
const response=data=>({ok:true,json:async()=>({ok:true,data})});
test('successful import signal reads current tenant then refreshes provider and cache without writes',async()=>{const r=fixture();r.fire();assert.equal(r.requests.length,1);assert.equal(r.requests[0].url,'/api/store/bd_employees');assert.equal(r.requests[0].options.headers['X-Venue-Id'],'1');r.requests[0].resolve(response([{id:'third',name:'Вера',position:'other',customPositionLabel:'Бариста'}]));await tick();assert.equal(r.get()[0].customPositionLabel,'Бариста');assert.equal(r.writes(),0);r.close();});
test('foreign tenant/account notifications ignored',()=>{const r=fixture();r.fire('2');r.fire('1','foreign');assert.equal(r.requests.length,0);r.close();});
test('late response after tenant change ignored',async()=>{const r=fixture();r.fire();r.values.bd_active_venue_id='2';r.requests[0].resolve(response([{id:'foreign',name:'Чужой'}]));await tick();assert.equal(r.get()[0].id,'a');r.close();});
test('last refresh wins; older response cannot restore stale count',async()=>{const r=fixture();r.fire();r.fire();r.requests[1].resolve(response([{id:'new',name:'Новый'}]));await tick();r.requests[0].resolve(response([{id:'old',name:'Старый'}]));await tick();assert.equal(r.get()[0].id,'new');r.close();});
test('HTTP error keeps existing employees; later retry refreshes',async()=>{const r=fixture();r.fire();r.requests[0].resolve({ok:false});await tick();assert.equal(r.get().length,1);r.fire();r.requests[1].resolve(response([{id:'a',name:'Анна'},{id:'b',name:'Борис'}]));await tick();assert.equal(r.get().length,2);r.close();});
test('return to employee list triggers authoritative fallback read',()=>{const r=fixture('/employees');assert.equal(r.requests.length,1);r.close();});
test('unmounted provider ignores response',async()=>{const r=fixture();r.fire();r.close();r.requests[0].resolve(response([]));await tick();assert.equal(r.get().length,1);});
