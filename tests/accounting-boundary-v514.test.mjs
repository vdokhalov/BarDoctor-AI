import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchAccountingBoundaryV514 } from '../scripts/patch-accounting-boundary-v514.mjs';
const fragment=fs.readFileSync('scripts/fragments/accounting-boundary-v514.fragment.txt','utf8');
const c=vm.createContext({Error,Object,Number,String,Array});vm.runInContext(fragment,c);
const scope=[901,'2026-09-01','PMR_RUB'];
test('new boundaries use venue sections and require explicit values/source; negative/nonfinite/oversized inputs fail',()=>{
 const draft=c.bdBoundaryDraftV514([], ...scope,['Бар','Кухня']);assert.equal(draft.sections.length,2);assert.equal(draft.sections[0].amount,'');
 for(const amount of ['', '-1', 'Infinity', '1000000000001'])assert.throws(()=>c.bdBoundaryRecordV514({...draft,note:'source',sections:[{name:'Бар',amount}]},...scope,'id'));
 assert.throws(()=>c.bdBoundaryRecordV514({...draft,note:'',sections:[{name:'Бар',amount:'0'}]},...scope,'id'));
 const row=c.bdBoundaryRecordV514({...draft,note:'QA scenario',synthetic:true,sections:[{name:'Бар',amount:'120,50'},{name:'Кухня',amount:'0'}]},...scope,'stable');
 assert.equal(row.total,120.5);assert.match(row.note,/СИНТЕТИЧЕСКИЕ QA/);assert.equal(row.id,'stable');assert.equal(row.date,'2026-09-01');
});
test('ambiguous and physical boundaries fail closed; foreign venue is not edited; unique existing id survives',()=>{
 const row={id:'legacy',venueId:901,date:'2026-09-01',currency:'PMR_RUB',sections:{Бар:40},note:'source'};
 assert.throws(()=>c.bdBoundaryDraftV514([row,{...row,id:'duplicate'}],...scope),/несколько/);
 for(const flag of [{scope:{}},{internalId:'INV-1'},{status:'completed'},{items:[{valuationKnown:true}]}])assert.throws(()=>c.bdBoundaryDraftV514([{...row,...flag}],...scope),/физическая/);
 const draft=c.bdBoundaryDraftV514([row,{...row,id:'foreign',venueId:902}],...scope);assert.equal(draft.existing.id,'legacy');assert.equal(c.bdBoundaryRecordV514(draft,...scope,'ignored').id,'legacy');
});
test('exact first-of-month mandatory and note budget includes synthetic marking',()=>{
 const draft={sections:[{name:'Бар',amount:'10'}],note:'source'};
 assert.throws(()=>c.bdBoundaryRecordV514(draft,901,'2026-09-30','PMR_RUB','id'));
 assert.throws(()=>c.bdBoundaryRecordV514({...draft,note:'x'.repeat(500),synthetic:true},...scope,'id'));
});
test('patch installs actual wizard step3/4 editor plus scoped authoritative preview refresh and repeats safely',()=>{
 const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8'),patched=patchAccountingBoundaryV514(source);
 assert.equal(patchAccountingBoundaryV514(patched),patched);
 assert.match(patched,/if\(e===2\|\|e===3\)\{return i.jsx\(bdAccountingBoundaryStepV514/);
 assert.match(patched,/window.addEventListener\("bd:accounting-boundary-saved",saved\)/);
 assert.match(patched,/step === 2 \? meta.start : meta.nextStart/);
 assert.doesNotMatch(fragment,/localStorage\.setItem|bdWriteStore|bdArrayStore/);
});
test('leadership plus explicit inventory permission gates editor; cashier and revoked permission fail closed',()=>{
 let role='shift_manager',permission=true;
 const context=vm.createContext({localStorage:{getItem:()=>role},window:{bdHasClientPermission:()=>permission}});vm.runInContext(fragment,context);
 assert.equal(context.bdBoundaryAllowedV514(),true);role='cashier';assert.equal(context.bdBoundaryAllowedV514(),false);role='owner';permission=false;assert.equal(context.bdBoundaryAllowedV514(),false);
});
test('authenticated scoped request preserves server conflict instead of reporting a local success',async()=>{
 let captured;
 const context=vm.createContext({Error,String,ca:()=>({'X-Fixture-Auth':'auth'}),Ot:()=>'',fetch:async(url,options)=>{captured={url,options};return {ok:false,json:async()=>({ok:false,code:'STORE_WRITE_CONFLICT'})};}});vm.runInContext(fragment,context);
 await assert.rejects(context.bdBoundaryRequestV514(901,{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'}),/Ввод сохранён/);
 assert.equal(captured.options.headers['X-Venue-Id'],'901');assert.equal(captured.options.headers['X-Fixture-Auth'],'auth');assert.equal(captured.options.method,'PUT');
});
