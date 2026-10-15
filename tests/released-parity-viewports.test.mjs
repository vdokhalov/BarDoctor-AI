import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
import {releasedEntries,normalized} from '../scripts/lib/released-reports-more-parity.mjs';
import {releasedModuleEntries} from '../scripts/lib/released-module-parity.mjs';

const captured=JSON.parse(readFileSync('tests/fixtures/released-parity-ci-2ab.json'));
const item=id=>captured.inventory.items.find(row=>row.id===id);
const evaluate=(width,id,data=captured.widths[width])=>compareRecoveryParity({items:[item(id)]},data,'webkit',Number(width))[0];
function rejects(width,id,mutate) {
  const data=structuredClone(captured.widths[width]);mutate(data);
  assert.notEqual(evaluate(width,id,data).verdict,'PASS',id+' rejects mutation');
}
test('independent CI snapshots prove released controls across all three widths, including desktop Reviews',()=>{
  for(const width of [390,820,1280]) {
    for(const path of ['/sales-entry','/sales-import','/finance','/reports','/shifts','/reviews','/opportunities','/supplier-alternatives','/month-closing','/cashier']) {
      const id='route:'+path;assert.equal(evaluate(width,id).verdict,'PASS',width+id+' '+evaluate(width,id).error);
      if(path==='/cashier')continue; // Ledger rejection has its dedicated negative controls.
      const entries=captured.widths[width].candidate[path].before.entries;
      for(let at=0;at<entries.length;at++) {
        if(!entries[at].label.trim())continue;
        for(const key of ['label','href','disabled','tag','nav'])rejects(width,id,data=>{
          const entry=data.candidate[path].before.entries[at];entry[key]=typeof entry[key]==='boolean'?!entry[key]:'BROKEN';
        });
      }
    }
    const nav=captured.widths[width].candidate['/sales-entry'].before.entries.filter(e=>e.nav);
    assert.equal(nav.length,width===1280?7:6);
    assert.equal(nav.filter(e=>e.label==='Отзывы'&&e.href==='/reviews').length,width===1280?1:0);
  }
});
test('More and Warehouse visible controls match independently even when wide click evidence is absent',()=>{
  const entries=record=>record.before.entries.filter(e=>e.label.trim()).map(e=>({...Object.fromEntries(Object.entries(e).filter(([key])=>key!=='index')),label:normalized(e.label)}));
  for(const width of [390,820,1280])for(const path of ['/more','/warehouse']) {
    const data=captured.widths[width],expected=path==='/more'?releasedEntries(path,entries(data.v485[path]),'1'):releasedModuleEntries(path,entries(data.v485[path]),'1',width);
    const actual=entries(data.candidate[path]).filter(e=>path!=='/more'||!['AI Doctor','Состояние бизнеса'].includes(e.label));
    assert.deepEqual(actual,expected);
  }
});
test('both Reports entries retain month, venue, exact parent and reload on all widths',()=>{
  for(const width of [390,820,1280])for(const id of ['context:/finance:Месячный отчёт','context:/finance/settings:Перейти к месячному отчёту']) {
    assert.equal(evaluate(width,id).verdict,'PASS',evaluate(width,id).error);
    const path=item(id).from;
    for(const state of ['contract','reloaded'])for(const parent of ['/finance','/finance?month=2026-09&venue=1','/finance?month=2026-10&venue=2'])rejects(width,id,data=>{
      const action=data.candidate[path].actions[id];(state==='contract'?action.contract:action.reloaded.contract).parent=parent;
    });
    rejects(width,id,data=>delete data.candidate[path].actions[id].reloaded);
    rejects(width,id,data=>data.candidate[path].actions[id].reloaded.venue='2');
    rejects(width,id,data=>data.candidate[path].actions[id].reloaded.url='/reports?month=2026-09&venue=1');
  }
});
test('missing wide Sales and renamed Reports action measurements remain failures, never inferred PASS',()=>{
  for(const width of [820,1280]) {
    for(const id of ['route:/more','route:/warehouse','context:/reports:Продолжить закрытие'])assert.equal(evaluate(width,id).verdict,'FAIL');
    assert.equal(captured.widths[width].candidate['/more'].salesEntry,undefined);
    assert.deepEqual(captured.widths[width].candidate['/reports'].actions['context:/reports:Продолжить закрытие'],{absent:true});
  }
  for(const width of [390,820,1280])rejects(width,'route:/sales-import',data=>data.candidate['/sales-import'].baselineDefects.push({message:'unexpected runtime error'}));
});
