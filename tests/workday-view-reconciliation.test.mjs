import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdShiftsPage');
let effect;
function walk(node){if(!node||typeof node!=='object')return;
 if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&node.callee.object.name==='S'&&node.callee.property.name==='useEffect'&&source.slice(node.arguments[0].start,node.arguments[0].end).includes('bdShiftDays.find(day=>day.businessDate===viewing.date'))effect=node.arguments[0];
 for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}walk(fn);assert.ok(effect,'actual emitted reconciliation effect');
function run(viewing,days){const changes=[],events=[];
 new Function('viewing','bdShiftDays','setViewing','window','CustomEvent','return ('+source.slice(effect.start,effect.end)+')()')(viewing,days,v=>changes.push(v),{dispatchEvent:e=>events.push(e)},class{constructor(type,options){this.type=type;this.detail=options.detail;}});
 return{changes,events};
}
test('late authoritative OPEN/CLOSED day replaces only its already-open legacy dialog',()=>{
 for(const workdayStatus of ['OPEN','CLOSED']){
  const result=run({date:'2026-10-01'},[{businessDate:'2026-10-01',report:{workdayStatus}}]);
  assert.deepEqual(result.changes,[null]);assert.deepEqual(result.events.map(e=>[e.type,e.detail]),[['bd:workday-select',{date:'2026-10-01'}]]);
 }
});
test('legacy reports, other dates and absent dialogs remain untouched',()=>{
 for(const [view,days]of [[null,[]],[{date:'2026-10-01'},[]],[{date:'2026-10-01'},[{businessDate:'2026-10-01',report:{}}]],[{date:'2026-10-01'},[{businessDate:'2026-10-02',report:{workdayStatus:'OPEN'}}]]])assert.deepEqual(run(view,days),{changes:[],events:[]});
});
test('owning generator restores the fix before Phase4B wiring and stays idempotent',()=>{
 const root=mkdtempSync(join(tmpdir(),'bd-workday-patch-'));
 try {
  mkdirSync(join(root,'public/assets'),{recursive:true});mkdirSync(join(root,'scripts'),{recursive:true});
  cpSync('scripts/fragments',join(root,'scripts/fragments'),{recursive:true});
  // Remove the whole emitted effect and rename the later phase's marker: the
  // owning generator must depend only on its original shifts-page declaration.
  const fixed=source.slice(effect.start,effect.end);
  const input=source.replace('S.useEffect('+fixed+',[bdShiftDays,viewing]);','').replaceAll('bdManagementDayContextPhase4b','laterPhaseNotApplied');
  assert.ok(!input.includes('bdShiftDays.find(day=>day.businessDate===viewing.date'));
  const path=join(root,'public/assets/index-BQGspy0I.js');writeFileSync(path,input);
  execFileSync(process.execPath,[resolve('scripts/patch-operational-day-phase1a.mjs')],{cwd:root});
  const once=readFileSync(path,'utf8');assert.ok(once.includes(fixed));
  execFileSync(process.execPath,[resolve('scripts/patch-operational-day-phase1a.mjs')],{cwd:root});
  assert.equal(readFileSync(path,'utf8'),once);
 }finally{rmSync(root,{recursive:true,force:true});}
});
