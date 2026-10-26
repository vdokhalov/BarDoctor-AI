import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from 'acorn';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='sle');
function fixture(){
 let store=[{id:'a',name:'Холодильник',model:'One',venueId:1},{id:'b',name:'Другая техника',venueId:1}],state,ref;const listeners=new Map();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const ctx={S:{useState(init){state=init();return[state,fn=>{state=typeof fn==='function'?fn(state):fn}]},useRef(x){return ref={current:x}},useEffect(fn){fn()},useCallback(fn){return fn}},Ai:()=>({isReady:true}),Th:x=>x,bM:()=>clone(store),Eh:x=>{store=clone(x)},jM:x=>x,p7:{Provider:1},i:{jsx:(_t,p)=>p.value},Date,window:{addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key)=>listeners.delete(key)}};
 const api=vm.runInNewContext(source.slice(node.start,node.end)+';sle({children:null})',ctx);
 return{api,get:()=>clone(store),serverUpdate(fn){store=fn(clone(store));listeners.get('bd:store-updated')?.({detail:{storeKey:'bd_equipment'}})},state:()=>clone(state)};
}
for(const patch of [{model:'Two'},{installationDate:'2026-09-20'},{model:'Two',installationDate:'2026-09-20'},{model:undefined,installationDate:undefined}])test('profile edit preserves newly verified maintenance '+JSON.stringify(patch),()=>{
 const f=fixture();f.serverUpdate(rows=>rows.map(x=>x.id==='a'?{...x,lastMaintenance:'2026-10-25',nextMaintenance:'2026-11-01',maintenancePolicy:{mode:'interval_days',interval:7,nextDate:'2026-11-01'},workOrderId:'maintenance'}:x));
 f.api.updateEquipment('a',patch);const saved=f.get();assert.equal(saved[0].lastMaintenance,'2026-10-25');assert.equal(saved[0].nextMaintenance,'2026-11-01');assert.equal(saved[0].workOrderId,'maintenance');assert.deepEqual(saved[1],{id:'b',name:'Другая техника',venueId:1});f.api.updateEquipment('a',patch);assert.equal(f.get()[0].lastMaintenance,'2026-10-25');
});
test('provider follows current venue store and cannot restore stale equipment on edit',()=>{const f=fixture();f.serverUpdate(()=>[{id:'foreign',venueId:2,name:'Другое заведение',lastMaintenance:'2026-10-20'}]);f.api.updateEquipment('a',{model:'Wrong venue'});assert.deepEqual(f.get(),[{id:'foreign',venueId:2,name:'Другое заведение',lastMaintenance:'2026-10-20'}])});
test('an unserviced item does not gain a maintenance date from profile editing',()=>{const f=fixture();f.api.updateEquipment('a',{model:'New',installationDate:'2026-10-26'});assert.equal(f.get()[0].lastMaintenance,undefined);assert.equal(f.get()[0].nextMaintenance,undefined)});
