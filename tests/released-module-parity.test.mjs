import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
import {normalized} from '../scripts/lib/released-reports-more-parity.mjs';
import {releasedModuleFrame,releasedModuleScope} from '../scripts/lib/released-module-parity.mjs';

const captured=JSON.parse(readFileSync('tests/fixtures/p0-released-modules-390.json','utf8'));
const fixture=()=>structuredClone(captured);
const itemFor=path=>captured.inventory.items.find(item=>item.path===path);
const evaluate=(data,item,engine='webkit',width=390)=>compareRecoveryParity({items:[item]},data,engine,width)[0];
function rejects(data,item,mutate) {
  const copy=structuredClone(data);mutate(copy);
  assert.equal(evaluate(copy,item).verdict,'FAIL',item.id+' must reject mutation');
}
test('independent fresh18-origin capture and four changed actions satisfy exact released expectations',()=>{
  const rows=compareRecoveryParity(captured.inventory,captured,'webkit',390);
  assert.equal(rows.length,22);assert.deepEqual(rows.filter(row=>row.verdict!=='PASS'),[]);
  for(const row of rows.filter(row=>row.id.startsWith('context:/warehouse:')||row.id==='context:/finance:Есть расхождение остатков')) {
    assert.match(row.condition,/^(MOVED|REMOVED):/);assert.doesNotMatch(row.clickability,/same baseline/);
  }
});
test('every added and retained control keeps label, href, enabled state, tag, nav membership and order',()=>{
  for(const path of ['/finance','/warehouse','/month-closing','/reports?closeMonth=1','/reviews','/sales-entry','/sales-import','/supplier-alternatives','/shifts']) {
    const item=itemFor(path),data=fixture(),entries=data.candidate[path].before.entries;
    for(let index=0;index<entries.length;index++) {
      if(!entries[index].label.trim())continue;
      for(const property of ['label','href','disabled','nav','tag'])rejects(data,item,copy=>{
        const entry=copy.candidate[path].before.entries[index];
        entry[property]=property==='disabled'||property==='nav'?!entry[property]:String(entry[property])+' BROKEN';
      });
    }
    rejects(data,item,copy=>copy.candidate[path].before.entries.pop());
    rejects(data,item,copy=>copy.candidate[path].before.entries.reverse());
    rejects(data,item,copy=>copy.candidate[path].before.entries.push({label:'Unapproved',tag:'BUTTON',href:null,disabled:false,nav:false}));
  }
});
test('removed Warehouse actions require actual enabled More Sales click, reload and same venue',()=>{
  const data=fixture(),items=data.inventory.items.filter(item=>item.from==='/warehouse');
  for(const item of items)for(const mutate of [
    copy=>delete copy.candidate['/warehouse'].salesEntry,
    ...['visible','destination','reload','venue'].map(key=>copy=>copy.candidate['/warehouse'].salesEntry[key]='wrong'),
    copy=>copy.candidate['/warehouse'].actions[item.id]={absent:true,url:'/home'},
    copy=>copy.v485['/warehouse'].actions[item.id].url='/home',
    copy=>delete copy.v485['/warehouse'].actions[item.id].reloaded,
  ])rejects(data,item,mutate);
});
test('removed false Finance mismatch requires exact canonical boundary link and known historical action',()=>{
  const data=fixture(),item=data.inventory.items.find(item=>item.id==='context:/finance:Есть расхождение остатков');
  for(const mutate of [
    copy=>copy.candidate['/finance'].before.entries.find(entry=>entry.label==='Проверить границы месяца').disabled=true,
    copy=>copy.candidate['/finance'].before.entries.find(entry=>entry.label==='Проверить границы месяца').href='/reports?closeMonth=1&month=2026-09&venue=2',
    copy=>copy.candidate['/finance'].actions[item.id]={disabled:true},
    copy=>copy.v485['/finance'].actions[item.id].url='/home',
  ])rejects(data,item,mutate);
});
test('Finance master must enter exact scoped Reports wizard and retain it on reload',()=>{
  const data=fixture(),item=data.inventory.items.find(item=>item.id==='context:/finance:Мастер закрытия месяца');
  for(const mutate of [
    copy=>copy.candidate['/finance'].actions[item.id].absent=true,
    copy=>delete copy.candidate['/finance'].actions[item.id].reloaded,
    copy=>copy.candidate['/finance'].actions[item.id].url='/reports?month=2026-09&venue=1&closeMonth=1',
    copy=>copy.candidate['/finance'].actions[item.id].contract.parent='/finance',
    copy=>copy.candidate['/finance'].actions[item.id].reloaded.venue='2',
    copy=>{const a=copy.candidate['/finance'].actions[item.id];a.opened=a.opened.filter(entry=>entry.label!=='Закрыть мастер');},
    copy=>copy.v485['/finance'].actions[item.id].url='/home',
  ]) {
    rejects(data,item,mutate);
  }
});
test('Cashier and Sales shell contracts preserve all other fields and mandatory read-only rejection',()=>{
  for(const path of ['/cashier','/sales-import']) {
    const data=fixture(),item=itemFor(path);
    for(const key of ['type','title','parent','shell','headerMode','bottomNav','path','url'])rejects(data,item,copy=>{copy.candidate[path].before.contract[key]=key==='bottomNav'?false:'wrong';});
  }
  const data=fixture(),item=itemFor('/cashier');
  for(const key of ['status','code','visible','ledgerUnchanged'])rejects(data,item,copy=>copy.candidate['/cashier'].cashierRejection[key]='wrong');
  rejects(data,item,copy=>copy.candidate['/cashier'].cashierReturn.destination='/home');
  rejects(data,itemFor('/sales-import'),copy=>{const entry=copy.v485['/sales-import'].before.entries.find(entry=>entry.label==='Вернуться в Ещё');entry.label='Вернуться на склад';entry.href='/warehouse';});
});
test('AI copy amendments accept only measured notices and retain every other frame character',()=>{
  for(const path of ['/opportunities','/reviews','/sales-import','/supplier-alternatives']) {
    const data=fixture(),item=itemFor(path);
    rejects(data,item,copy=>copy.candidate[path].before.frames[0].text+=' Unexpected runtime failure');
    rejects(data,item,copy=>copy.candidate[path].before.frames[0].title='Wrong module');
  }
  const legacy='Данные сохранены · обновлено сегодня в : ↻ Обновить AI временно недоступен: серверное подключение OpenAI ещё не настроено Calendar unchanged';
  assert.equal(releasedModuleFrame('/opportunities',legacy),'Данные сохранены · обновлено сегодня в : ↻ Обновить Показан сохранённый календарь Для платного AI-поиска нажмите «Обновить» Calendar unchanged');
  assert.throws(()=>releasedModuleFrame('/opportunities','Unclassified AI error'));
  const data=fixture();rejects(data,itemFor('/supplier-alternatives'),copy=>{const entries=copy.candidate['/supplier-alternatives'].before.entries;entries.find(entry=>entry.label==='Запустить поиск').label='Выбрать группу для поиска';});
  rejects(data,itemFor('/reviews'),copy=>copy.candidate['/reviews'].before.frames[0].text=copy.candidate['/reviews'].before.frames[0].text.replace('AI-анализ','Silent automatic paid AI'));
});
test('query routes require full controls; source-specific transitions do not spread to expense forms or other viewports',()=>{
  for(const path of ['/warehouse?writeoff=new','/warehouse?inventory=new','/warehouse?product=qa-stock','/finance?repairEquipmentId=qa-equipment','/finance?closeShift=1','/shifts?closeShift=1']) {
    const data=fixture();rejects(data,itemFor(path),copy=>copy.candidate[path].before.entries.pop());
  }
  assert.equal(releasedModuleScope('/finance?addExpense=1',captured.v485['/finance'].before,'webkit',390),false);
  assert.equal(releasedModuleScope('/shifts',captured.v485['/shifts'].before,'webkit',1024),false);
  assert.equal(releasedModuleScope('/shifts',captured.v485['/shifts'].before,'chromium',390),false);
  assert.notEqual(evaluate(captured,itemFor('/sales-entry'),'webkit',1280).verdict,'PASS');
});
test('all newly allowed product controls and copy already exist unchanged in production v517',()=>{
  const baseline='691ab51840266c9b6297fda7a84ee2077694a75f';
  for(const path of ['public/reviews.js','public/opportunities.js','public/supplier-alternatives.js','public/navigation-contract-v247.js','scripts/patch-pos1-hardening.mjs','scripts/patch-operational-day-phase1a.mjs'])assert.deepEqual(readFileSync(path),execFileSync('git',['show',baseline+':'+path],{maxBuffer:16*1024*1024}),path);
  const functions=source=>new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
  const before=functions(execFileSync('git',['show',baseline+':public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}).toString()),after=functions(readFileSync('public/assets/index-BQGspy0I.js','utf8'));
  for(const name of ['Tle','bdWarehousePage','bdShiftsPage','bdCashierEntry','bdSalesImportPage','bdSalesPosPage','bdFinanceQuickActionsV160','bdFinanceCanonicalStatusV515','bdMonthlyReasonLinkV515','bdMonthlyPendingReasonsV513']) {
    assert.ok(before.has(name),name+' released');assert.equal(after.get(name),before.get(name),name+' unchanged');
  }
  // Copy transformations use the existing normalization, never erase extra errors.
  assert.equal(normalized('1. ФОТ, налоги'),'ФОТ налоги');
});
