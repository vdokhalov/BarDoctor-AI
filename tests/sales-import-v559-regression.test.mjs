import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Execute the real renderHome against the IDs/selectors present in the real route.
// No API, production connection, or product-source modification.
const html=readFileSync('app/sales-import/route.ts','utf8');
const source=readFileSync('public/sales-import.js','utf8');
const render=source.slice(source.indexOf('  function renderHome()'),source.indexOf('  function renderBatches('));
function fixture(create){
 const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{hidden:false,disabled:false,textContent:''}]));
 const calls=[];
 const document={getElementById:id=>ids.get(id)||null,querySelector:selector=>selector==='[data-source="manual"]'&&html.includes('data-source="manual"')?{}:null,body:{classList:{toggle(){}}}};
 return {calls,context:{document,state:{payload:{batches:[],kpis:{},currency:'MDL',capabilities:{create},dataQuality:{issues:[]}}},money:()=>'',renderJournalOptions:()=>calls.push('options'),renderJournal:()=>calls.push('journal'),renderQuality:()=>calls.push('quality')}};
}
for(const create of [true,false]) test(`journal renders after successful batches read, create=${create}`,()=>{
 const f=fixture(create);
 assert.doesNotThrow(()=>vm.runInNewContext(render+'\nrenderHome();',f.context,{filename:'public/sales-import.js:renderHome'}));
 assert.deepEqual(f.calls,['options','journal','quality']);
});
