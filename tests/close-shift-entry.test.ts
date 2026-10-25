import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const text=fs.readFileSync('scripts/fragments/workday-flow.jsx','utf8');
const start=text.indexOf("S.useEffect(()=>{if(!current||new URLSearchParams(window.location.search).get('closeShift')");
const effect=text.slice(start,text.indexOf(';\n',start)+1);
function run(current:unknown,query='?closeShift=1&venue=3'){
 const closing:boolean[]=[],cleared:unknown[]=[];let search=query;
 const context={current,closeEntryLocation:query,URLSearchParams,setClosing:(v:boolean)=>closing.push(v),setChecks:()=>{},S:{useEffect:(f:()=>void)=>f()},window:{location:{get search(){return search}},bdSyncNavigationQuery:(v:unknown)=>{cleared.push(v);search='?venue=3'}}};
 vm.runInNewContext(effect,context);return {closing,cleared,repeat:()=>vm.runInNewContext(effect,context)};
}
test('wait for authoritative scoped response before consuming shortcut',()=>{const r=run(null);assert.deepEqual(r.closing,[]);assert.deepEqual(r.cleared,[])});
test('closed and absent shifts never enter closing or create a shift',()=>{for(const current of [{workday:{workdayStatus:'CLOSED'}},{workday:null}]){const r=run(current);assert.deepEqual(r.closing,[false]);assert.equal(r.cleared.length,1)}});
test('open shift enters existing closing review exactly once',()=>{const r=run({workday:{workdayStatus:'OPEN'}});r.repeat();assert.deepEqual(r.closing,[true]);assert.equal(r.cleared.length,1)});
test('normal entry does not change closing state',()=>{const r=run({workday:{workdayStatus:'OPEN'}},'?venue=3');assert.deepEqual(r.closing,[]);assert.equal(r.cleared.length,0)});
