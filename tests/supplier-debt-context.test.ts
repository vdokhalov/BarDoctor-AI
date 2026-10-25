import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('scripts/fragments/procurement-command-v168.fragment.txt','utf8');
const body=source.slice(source.indexOf('const debtScope='),source.indexOf('const m=n.filter',source.indexOf('const debtScope=')));
function render(history:any,account='owner',venue='1',supplier='one'){
 let value=false;const context={e:{id:supplier},localStorage:{getItem:(k:string)=>k==='bd_session'?account:venue},window:{location:{href:'https://local/suppliers?venue='+venue},history},S:{useState:(init:()=>boolean)=>[value=init(),(v:boolean)=>{value=v}],useEffect:(f:()=>void)=>f()}};
 const api=vm.runInNewContext('(function(){'+body+'return {expanded:d,toggle:f}})()',context);return {...api,current:()=>value};
}
function history(){return {state:{bdEntryId:'keep',other:{keep:true}},replaceState(state:any){this.state=state}}}
test('untouched is collapsed; expansion survives remount with navigation metadata intact',()=>{const h=history(),a=render(h);assert.equal(a.expanded,false);a.toggle(true);assert.equal(render(h).expanded,true);assert.equal(h.state.bdEntryId,'keep');assert.equal(h.state.other.keep,true)});
test('collapsed state remains collapsed after remount',()=>{const h=history();render(h).toggle(true);render(h).toggle(false);assert.equal(render(h).expanded,false)});
test('different supplier, venue and account cannot inherit expansion',()=>{const h=history();render(h).toggle(true);for(const args of [['owner','1','two'],['owner','2','one'],['other','1','one']])assert.equal(render(h,...args as [string,string,string]).expanded,false)});
test('browser history entries retain independent expansion state',()=>{const h=history();render(h).toggle(true);const expanded=h.state;render(h).toggle(false);const collapsed=h.state;h.state=expanded;assert.equal(render(h).expanded,true);h.state=collapsed;assert.equal(render(h).expanded,false)});
