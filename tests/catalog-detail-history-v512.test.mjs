import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('scripts/fragments/catalog-detail-history-v512.fragment.txt','utf8');
function fixture({previous='/catalog?venue=801&tab=recipes',current='/catalog?venue=801&tab=recipes&itemId=qa',state={},active='801',confirm=true,historyLength=2}={}) {
 const calls=[],listeners=new Set(),pending={current:''};
 const window={location:{href:'https://bardoctor.test'+current},history:{length:historyLength,state:{bdEntryId:'card',bdPreviousEntryId:'list',bdPreviousUrl:previous,bdVenueId:'801',bdNavigationVersion:'canonical-navigation-v247',...state},back:()=>calls.push('back')},bdConfirmDiscard:()=>confirm,addEventListener:(_name,fn)=>listeners.add(fn),removeEventListener:(_name,fn)=>listeners.delete(fn)};
 const context=vm.createContext({URL,window,localStorage:{getItem:()=>active}});vm.runInContext(source,context);
 return {calls,pending,window,listeners,close:()=>context.bdCloseCatalogDetailV512((url,options)=>{calls.push({url,replace:options.replace});window.location.href='https://bardoctor.test'+url},()=>calls.push('clear'),801,pending)};
}
test('owned previous list is consumed once; a later forward/reopen can close again',()=>{
 const f=fixture();assert.equal(f.close(),true);assert.equal(f.close(),false);assert.deepEqual(f.calls,['clear','back']);
 f.window.history.state.bdEntryId='list';for(const fn of f.listeners)fn();assert.equal(f.pending.current,'');assert.equal(f.listeners.size,0);
 f.window.history.state.bdEntryId='card';assert.equal(f.close(),true);assert.deepEqual(f.calls,['clear','back','clear','back']);
});
test('same-venue synthetic deep-link parent and reordered list query are safe',()=>{
 for(const extra of [{state:{bdDirectLink:true}},{previous:'/catalog?tab=recipes&venue=801'},{previous:'/catalog?tab=recipes'}]){const f=fixture(extra);f.close();assert.deepEqual(f.calls,['clear','back']);}
});
test('unknown, foreign, external, detail and different list contexts use local replace',()=>{
 for(const extra of [{historyLength:1},{state:{bdPreviousEntryId:''}},{state:{bdNavigationVersion:'unknown'}},{state:{bdVenueId:802}},{previous:'https://outside.test/catalog?venue=801&tab=recipes'},{previous:'/catalog?venue=802&tab=recipes'},{previous:'/catalog?venue=801&tab=recipes&itemId=other'},{previous:'/catalog?venue=801&tab=menu'},{previous:'/more?venue=801'},{previous:'https://['}]){
  const f=fixture(extra);f.close();assert.deepEqual(f.calls,['clear',{url:'/catalog?venue=801&tab=recipes',replace:true}]);assert.equal(f.close(),false,'a repeated close cannot navigate a second time');
 }
});
test('stale venue handlers and dirty-dismiss never clear or move history',()=>{
 for(const extra of [{active:'802'},{active:''},{confirm:false},{current:'/catalog?venue=801&tab=recipes'},{current:'/more?itemId=qa'}]){const f=fixture(extra);assert.equal(f.close(),false);assert.deepEqual(f.calls,[]);}
 const staleUrl=fixture({current:'/catalog?venue=802&tab=recipes&itemId=qa'});staleUrl.close();assert.deepEqual(staleUrl.calls,['clear',{url:'/catalog?venue=801&tab=recipes',replace:true}]);
});
