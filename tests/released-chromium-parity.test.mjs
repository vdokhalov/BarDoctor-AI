import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
import {releasedViewport,reportDayLabel} from '../scripts/lib/released-reports-more-parity.mjs';
import {supplementChromiumEvidence} from '../scripts/recheck-chromium-parity-ci-snapshots.mjs';
const chromium=JSON.parse(readFileSync('tests/fixtures/released-parity-chromium-269.json'));
const webkit=JSON.parse(readFileSync('tests/fixtures/released-parity-ci-2ab.json'));
const inventory=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v485-functional-inventory.json'));
const item=id=>inventory.items.find(x=>x.id===id);
const evaluate=(data,engine,width,id)=>compareRecoveryParity({items:[item(id)]},data,engine,width)[0];
const combined=width=>supplementChromiumEvidence(chromium.widths[width],chromium.narrow[width],width);
const rejects=(data,engine,width,id,mutate)=>{const copy=structuredClone(data);mutate(copy);assert.notEqual(evaluate(copy,engine,width,id).verdict,'PASS',engine+width+id);};
test('independent Chromium CI evidence explains exactly50 differences; missing34 observations still fail',()=>{
 for(const width of [390,820,1280]){
  const rows=compareRecoveryParity(chromium.inventory,chromium.widths[width],'chromium',width);
  assert.equal(rows.filter(x=>x.verdict==='PASS').length,50);assert.equal(rows.filter(x=>x.verdict==='FAIL').length,34);
  const fixed=compareRecoveryParity(chromium.inventory,combined(width),'chromium',width);
  assert.equal(fixed.filter(x=>x.verdict==='PASS').length,84);
 }
});
for(const engine of ['webkit','chromium'])for(const width of [390,820,1280]){
 test(engine+' '+width+' independently preserves control semantics, frame copy, route and viewport navigation',()=>{
  const data=engine==='chromium'?combined(width):{...webkit.widths[width],capture:{engine,width}};
  for(const path of ['/finance','/sales-entry','/opportunities','/reports']){
   const id='route:'+path;assert.equal(evaluate(data,engine,width,id).verdict,'PASS',evaluate(data,engine,width,id).error);
   for(const key of ['label','href','disabled','tag','nav'])rejects(data,engine,width,id,d=>{const e=d.candidate[path].before.entries.find(e=>e.label.trim());e[key]=typeof e[key]==='boolean'?!e[key]:'BROKEN';});
   rejects(data,engine,width,id,d=>d.candidate[path].before.contract.parent='/wrong');
  }
  rejects(data,engine,width,'route:/opportunities',d=>d.candidate['/opportunities'].before.frames[0].text+=' Unexpected AI error');
  const nav=data.candidate['/sales-entry'].before.entries.filter(e=>e.nav);
  assert.equal(nav.length,width===1280?7:6);assert.equal(nav.filter(e=>e.label==='Отзывы'&&e.href==='/reviews').length,width===1280?1:0);
  rejects(data,engine,width,'route:/sales-entry',d=>d.candidate['/sales-entry'].before.entries=d.candidate['/sales-entry'].before.entries.filter(e=>!e.nav));
  rejects(data,engine,width,'route:/finance',d=>d.capture.engine=engine==='webkit'?'chromium':'webkit');
  rejects(data,engine,width,'route:/finance',d=>d.capture.width=1024);
 });
}
test('unsupported engines and widths never inherit audited release expectations',()=>{
 for(const engine of ['firefox','unknown','__proto__'])assert.equal(releasedViewport(engine,390),false);
 for(const engine of ['webkit','chromium'])for(const width of [375,768,1024,1440])assert.equal(releasedViewport(engine,width),false);
 rejects(combined(390),'chromium',390,'route:/finance',d=>delete d.capture);
});
test('Chromium More and Reports require real destination, venue, reload and enabled action on every width',()=>{
 for(const width of [390,820,1280]){
  const data=combined(width);
  for(const key of ['visible','destination','reload','venue'])rejects(data,'chromium',width,'route:/more',d=>d.candidate['/more'].salesEntry[key]=key==='visible'?false:'WRONG');
  rejects(data,'chromium',width,'route:/more',d=>delete d.candidate['/more'].salesEntry);
  rejects(data,'chromium',width,'route:/warehouse',d=>delete d.candidate['/more'].salesEntry);
  for(const id of ['context:/reports:Продолжить закрытие','context:/reports:'+reportDayLabel]){
   for(const change of [{absent:true},{disabled:true}])rejects(data,'chromium',width,id,d=>d.candidate['/reports'].actions[id]=change);
   rejects(data,'chromium',width,id,d=>delete d.candidate['/reports'].actions[id].reloaded);
   rejects(data,'chromium',width,id,d=>d.candidate['/reports'].actions[id].url='/home');
  }
  const id='context:/reports:Продолжить закрытие';
  rejects(data,'chromium',width,id,d=>d.candidate['/reports'].actions[id].reloaded.venue='2');
  rejects(data,'chromium',width,id,d=>d.candidate['/reports'].actions[id].reloaded.contract.parent='/finance');
  rejects(data,'chromium',width,id,d=>d.candidate['/reports'].actions[id].opened=d.candidate['/reports'].actions[id].opened.filter(e=>e.label!=='Далее'));
 }
});
test('supplement cannot overwrite existing failed observations or use a different origin/browser',()=>{
 for(const width of [390,820,1280])for(const mutate of [
  (ci,n)=>n.capture.engine='webkit', (ci,n)=>n.capture.width=1024,
  (ci,n)=>n.candidate['/more'].before.venue='2',
  (ci,n)=>delete n.candidate['/more'].salesEntry,
  (ci,n)=>n.candidate['/reports'].baselineDefects.push({message:'error'}),
  (ci,n)=>delete n.candidate['/reports'].masterNavigation,
  ci=>ci.candidate['/more'].salesEntry={visible:false},
  ci=>ci.candidate['/reports'].actions['context:/reports:Продолжить закрытие']={disabled:true},
 ]){
  const ci=structuredClone(chromium.widths[width]),n=structuredClone(chromium.narrow[width]);mutate(ci,n);
  assert.throws(()=>supplementChromiumEvidence(ci,n,width));
 }
});
