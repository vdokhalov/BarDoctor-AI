import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {patchHealthRequestLifecycle} from '../scripts/lib/health-request-lifecycle.mjs';
import {patchMonthlyReturnV516} from '../scripts/patch-monthly-return-v516.mjs';

const live=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const beforeHealth=execFileSync('git',['show','f929af10:public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}).toString();
assert.equal(live,patchHealthRequestLifecycle(beforeHealth));
const source=beforeHealth;
const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='bdMonthClosingLauncher');
const launcher=source.slice(node.start,node.end);
function fixture(path, month='2026-09', venue=7) {
  let current=new URL(path,'https://isolated.test'),state,initialized=false,effectInstalled=false,cleanup;
  const listeners=new Set(),pushes=[],writes=[];
  const dispatch=()=>listeners.forEach(listener=>listener());
  const window={get location(){return current;},addEventListener:(name,fn)=>{assert.equal(name,'bd:navigation-change');listeners.add(fn);},removeEventListener:(name,fn)=>listeners.delete(fn),bdNavigate:target=>{pushes.push(target);current=new URL(target,current);dispatch();},bdSyncNavigationQuery:values=>{for(const [key,value] of Object.entries(values))if(value===null)current.searchParams.delete(key);else current.searchParams.set(key,value);dispatch();}};
  const context={window,URL,URLSearchParams,S:{useState:initial=>{if(!initialized){state=initial();initialized=true;}return [state,value=>state=value];},useEffect:fn=>{if(!effectInstalled){effectInstalled=true;cleanup=fn();}}},bdUseMonthClosingStore:()=>({closings:[],saveClosing:value=>writes.push(value),reopenClosing:value=>writes.push(value)}),bdMonthlyVenueIdPhase7:()=>venue,bdMonthClosingWizard:'wizard',i:{Fragment:'fragment',jsx:(tag,props)=>({tag,props}),jsxs:(tag,props)=>({tag,props})}};
  vm.runInNewContext(launcher,context);
  const render=()=>context.bdMonthClosingLauncher({settings:{id:'primary'},report:{revenue:123},revenues:[],expenses:[],monthKey:month,navigate:()=>{throw Error('unexpected legacy navigation')}});
  const open=()=>render().props.children[0].props.onClick();
  const wizard=()=>render().props.children[1].props;
  return {render,open,wizard,pushes,writes,listeners,get url(){return current;},go:target=>{current=new URL(target,current);dispatch();},dispose:()=>cleanup?.()};
}
test('Reports launcher pushes exact selected month/active venue/wizard query and retains other route state',()=>{
  const f=fixture('/reports?month=2026-10&venue=99&view=summary#details');f.open();
  assert.equal(f.pushes.length,1);assert.equal(f.url.pathname,'/reports');
  assert.equal(f.url.searchParams.get('month'),'2026-09');assert.equal(f.url.searchParams.get('venue'),'7');assert.equal(f.url.searchParams.get('closeMonth'),'1');
  assert.equal(f.url.searchParams.get('view'),'summary');assert.equal(f.url.hash,'#details');assert.equal(f.wizard().open,true);assert.deepEqual(f.writes,[]);
});
test('Reload, browser Back/Forward and close stay synchronized with Reports route without saving data',()=>{
  const f=fixture('/reports?month=2026-09&venue=7&closeMonth=1');assert.equal(f.wizard().open,true);
  f.go('/reports?month=2026-09&venue=7');assert.equal(f.wizard().open,false);
  f.go('/reports?month=2026-09&venue=7&closeMonth=1');assert.equal(f.wizard().open,true);
  f.wizard().onClose();assert.equal(f.wizard().open,false);assert.equal(f.url.searchParams.has('closeMonth'),false);
  assert.equal(f.url.searchParams.get('month'),'2026-09');assert.equal(f.url.searchParams.get('venue'),'7');
  assert.equal(f.listeners.size,1);f.dispose();assert.equal(f.listeners.size,0);assert.deepEqual(f.writes,[]);
});
test('Shared launcher outside Reports retains its original local opening behavior',()=>{
  const f=fixture('/finance?month=2026-09&venue=7');f.open();assert.equal(f.wizard().open,true);
  assert.equal(f.pushes.length,0);assert.equal(f.url.searchParams.has('closeMonth'),false);assert.equal(f.listeners.size,0);assert.deepEqual(f.writes,[]);
});
test('Route repair is idempotent and changes only the launcher, preserving every calculation and callback elsewhere',()=>{
  const prior=execFileSync('git',['show','2094068ed209144297401e3d901139b7e12c9b9d:public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}).toString();
  const old=parse(prior,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='bdMonthClosingLauncher');
  assert.equal(source,patchMonthlyReturnV516(prior));assert.equal(patchMonthlyReturnV516(source),source);
  assert.equal(source.slice(0,node.start)+source.slice(node.end),prior.slice(0,old.start)+prior.slice(old.end));
  assert.match(launcher,/onClosePeriod:g=>u\(g\),onReopen:g=>\{window.confirm/);
});
