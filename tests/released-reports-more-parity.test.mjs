import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {patchMonthlyReturnV516} from '../scripts/patch-monthly-return-v516.mjs';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
import {releasedEntries, releasedActionLabel, reportDayLabel, normalized, reportLinks, reportWizardContract} from '../scripts/lib/released-reports-more-parity.mjs';

const button = label => ({label, tag:'BUTTON', href:null, disabled:false, nav:false});
const master = 'context:/reports:Продолжить закрытие';
const day = 'context:/reports:' + reportDayLabel;
function fixture(path) {
  const contract = path === '/reports' ? {type:'report',title:'Месячный отчёт',parent:'/finance',path,url:'/reports?month=2026-10&venue=1',shell:'standard',bottomNav:true,headerMode:'back'} : {type:'root',title:'Ещё',parent:null,path,url:path,shell:'standard',bottomNav:true,headerMode:'none'};
  const entries = path === '/reports' ? [button('Октябрь 2026'),button('Продолжить закрытие'),button(reportDayLabel),button('Остатки')] : [button('Оборудование'),button('Настройки')];
  const original = {before:{contract,url:contract.url,venue:'1',entries,frames:[]}, actions:{}, baselineDefects:[]};
  const candidate = structuredClone(original);
  candidate.before.entries = releasedEntries(path,entries.map(entry=>({...entry,label:normalized(entry.label)})),'1');
  if (path === '/reports') candidate.before.contract.parent='/finance?month=2026-10&venue=1';
  else candidate.salesEntry={visible:true,destination:'/sales-import',reload:'/sales-import',venue:'1'};
  const item={id:'route:'+path,path};
  const evaluate=(engine='webkit',width=390)=>compareRecoveryParity({items:[item]},{v485:{[path]:original},candidate:{[path]:candidate}},engine,width)[0];
  return {original,candidate,item,evaluate};
}
test('v517 More requires enabled exact Sales in order, retained controls and measured click/reload/venue',()=>{
  const f=fixture('/more');assert.equal(f.evaluate().verdict,'PASS');
  for(const mutation of [b=>b.before.entries.shift(), b=>b.before.entries.reverse(),b=>b.before.entries.pop(),b=>b.before.entries.push(button('Unapproved')),b=>b.before.entries[0].disabled=true,b=>b.before.entries[0].href='/wrong',b=>b.before.entries[0].nav=true,b=>b.before.entries[0].label='Касса',b=>b.before.entries[0].tag='A',b=>delete b.salesEntry,...['visible','destination','reload','venue'].map(key=>b=>b.salesEntry[key]='wrong')]){
    const saved=structuredClone(f.candidate);mutation(f.candidate);assert.equal(f.evaluate().verdict,'FAIL');Object.assign(f.candidate,saved);
  }
  assert.equal(f.evaluate('webkit',820).verdict,'FAIL');assert.equal(f.evaluate('chromium',390).verdict,'FAIL');
});
test('Reports keeps every source link, exact month/venue/workday and old controls',()=>{
  const f=fixture('/reports');assert.equal(f.evaluate().verdict,'PASS');
  for(let index=1;index<=10;index++)for(const property of ['href','label','tag','disabled','nav']){
    const saved=structuredClone(f.candidate.before.entries);
    f.candidate.before.entries[index][property]=property==='disabled'||property==='nav'?true:'wrong';
    assert.equal(f.evaluate().verdict,'FAIL',index+':'+property);f.candidate.before.entries=saved;
  }
  for(const mutation of [b=>b.before.entries.pop(),b=>b.before.entries.push(button('Unapproved')),b=>b.before.entries.splice(1,1),b=>b.before.entries[2].href=b.before.entries[2].href.replace('2026-10-02','2026-10-03'),b=>b.before.entries[1].href=b.before.entries[1].href.replace('venue=1','venue=2'),b=>b.before.entries[1].href=b.before.entries[1].href.replace('2026-10','2026-09'),b=>b.before.entries[12].label=normalized(reportDayLabel)]){
    const saved=structuredClone(f.candidate);mutation(f.candidate);assert.equal(f.evaluate().verdict,'FAIL');Object.assign(f.candidate,saved);
  }
});
test('Reports return transformation preserves other contract fields and scope',()=>{
  const f=fixture('/reports');assert.equal(f.evaluate().verdict,'PASS');
  for(const [key,value] of [['parent','/home'],['parent','/finance?month=2026-09&venue=1'],['parent','/finance?month=2026-10&venue=2'],['title','Wrong'],['type','module'],['bottomNav',false],['shell','fullscreen']]){
    const saved={...f.candidate.before.contract};f.candidate.before.contract[key]=value;assert.equal(f.evaluate().verdict,'FAIL');f.candidate.before.contract=saved;
  }
  assert.equal(f.evaluate('webkit',1280).verdict,'FAIL');
  for(const path of ['/finance','/finance?addExpense=1','/reports?closeMonth=1','/month-closing'])assert.equal(releasedActionLabel(path,'Продолжить закрытие'),'Продолжить закрытие');
  assert.equal(releasedActionLabel('/reports','Unapproved label'),'Unapproved label');
});
function masterFixture() {
  const f=fixture('/reports');delete f.item.path;Object.assign(f.item,{id:master,from:'/reports'});
  const old={url:'/reports?month=2026-10&venue=1',contract:f.original.before.contract};
  f.original.actions[master]=old;
  const contract=reportWizardContract('1');
  const opened=[...reportLinks('1'),...reportLinks('1'),...['Закрыть мастер','Проверка всех смен','Оплаты и остальные расходы','Начальные остатки','Конечные остатки','Списания','ФОТ, налоги и коммунальные услуги','Финальная прибыль','Подтверждение и закрытие периода','Открыть закрытие смены','Далее'].map(button)];
  f.candidate.actions[master]={url:contract.url,contract,opened,reloaded:{url:contract.url,contract:{...contract},venue:'1'}};
  return f;
}
test('Reports renamed master requires actual action, exact wizard and retained reload context',()=>{
  const f=masterFixture();assert.equal(f.evaluate().verdict,'PASS',f.evaluate().error);
  for(const mutation of [a=>a.absent=true,a=>a.disabled=true,a=>delete a.reloaded,a=>a.url='/reports?month=2026-10&venue=1',a=>a.url+='&unapproved=1',a=>a.contract.parent='/finance',a=>a.contract.type='report',a=>a.reloaded.url='/home',a=>a.reloaded.venue='2',a=>a.reloaded.contract.parent='/home']){
    const saved=structuredClone(f.candidate.actions[master]);mutation(f.candidate.actions[master]);assert.equal(f.evaluate().verdict,'FAIL');f.candidate.actions[master]=saved;
  }
});
test('Every released wizard step and both sets of canonical links remain required',()=>{
  const f=masterFixture(),action=f.candidate.actions[master];
  for(let index=0;index<action.opened.length;index++){
    const saved=structuredClone(action.opened);action.opened.splice(index,1);assert.equal(f.evaluate().verdict,'FAIL');action.opened=saved;
  }
});
test('Reports renamed day still requires click and unchanged finance destination/reload',()=>{
  const f=fixture('/reports');delete f.item.path;Object.assign(f.item,{id:day,from:'/reports'});
  const action={url:'/finance?month=2026-10&view=revenue&venue=1',contract:{type:'root',path:'/finance',parent:null,url:'/finance?month=2026-10&view=revenue&venue=1'},reloaded:{url:'/finance?month=2026-10&view=revenue&venue=1'}};
  f.original.actions[day]=structuredClone(action);f.candidate.actions[day]=structuredClone(action);
  assert.equal(f.evaluate().verdict,'PASS');
  for(const mutation of [a=>a.absent=true,a=>a.disabled=true,a=>a.url='/home',a=>a.reloaded.url='/home']){f.candidate.actions[day]=structuredClone(action);mutation(f.candidate.actions[day]);assert.equal(f.evaluate().verdict,'FAIL');}
});
test('Reports/More presentation matches v517 except the exact approved launcher route amendment',()=>{
  const baseline='691ab51840266c9b6297fda7a84ee2077694a75f';
  const release=execFileSync('git',['show',baseline+':public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}).toString();
  const current=readFileSync('public/assets/index-BQGspy0I.js','utf8');
  const functions=source=>new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
  const before=functions(release),after=functions(current);
  for(const name of ['t_e','bdMonthlyReasonLinkV515','bdMonthlyPendingReasonsV513','bdMonthClosingLauncher','bdMonthClosingWizard','bdMonthlyShiftAnalysisV165']){
    assert.ok(before.has(name),name+' released');assert.equal(after.get(name),name==='bdMonthClosingLauncher'?functions(patchMonthlyReturnV516(release)).get(name):before.get(name),name+' unchanged presentation except approved route amendment');
  }
  assert.equal(readFileSync('public/navigation-contract-v247.js','utf8'),execFileSync('git',['show',baseline+':public/navigation-contract-v247.js']).toString());
  execFileSync('git',['merge-base','--is-ancestor','22be1618',baseline]);
});
