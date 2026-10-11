import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchFinanceCanonicalV515 } from '../scripts/patch-finance-canonical-v515.mjs';
const source=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const output=patchFinanceCanonicalV515(source);
test('Finance patch is idempotent and does not change report/formula implementations',()=>{
  assert.equal(patchFinanceCanonicalV515(output),output);
  const monthly=source.slice(source.indexOf('/* bd-monthly-report-v165:start */'),source.indexOf('/* bd-monthly-report-v165:end */'));
  assert.ok(output.includes(monthly));
  assert.ok(!output.includes('monthlyReport=S.useMemo(()=>profile?bdBuildMonthlyReport(profile,monthKey,revenue,expenses,financeSnapshots,financeSettings,gapReasons):null'));
});
test('Finance consumes the shared scoped server hook verbatim, including null during loading or denial',()=>{
  const binding=output.slice(output.indexOf('bdFinanceRevisionV515=S.useMemo'),output.indexOf(',shiftResultByDate=',output.indexOf('bdFinanceRevisionV515=S.useMemo')));
  for(const report of [null,{operatingResult:38010,payroll:7550,costOfGoods:13494,isClosed:false},{operatingResult:null,isClosed:false},{operatingResult:99,isClosed:true}]){
    let calls=0;
    const context=vm.createContext({S:{useMemo:fn=>fn()},profile:{},revenue:[],expenses:[],financeSnapshots:[],financeSettings:{},gapReasons:[],monthKey:'2026-09',bdMonthlyVenueIdPhase7:()=>3389,bdBuildMonthlyReport:()=>{throw Error('Local fallback forbidden')},bdUseMonthlyReportV513:(venue,month)=>{calls++;assert.equal(venue,3389);assert.equal(month,'2026-09');return{report}}});
    vm.runInContext('const '+binding+';globalThis.result=monthlyReport;',context);
    assert.equal(calls,1);assert.equal(context.result,report);
  }
});
test('Finance renders pending/errors and full canonical reason diagnostics without inventing figures',()=>{
  const helper=output.slice(output.indexOf('function bdFinanceCanonicalStatusV515'),output.indexOf('function BAe(){'));
  const context=vm.createContext({i:{Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},bdMonthlyPendingReasonsV513:'REASONS'});
  vm.runInContext(helper,context);
  const loading=context.bdFinanceCanonicalStatusV515({verified:{report:null},monthKey:'2026-09',venueId:3389});assert.equal(loading.props.role,'status');
  const denied=context.bdFinanceCanonicalStatusV515({verified:{report:null,error:'Access denied'},monthKey:'2026-09',venueId:3389});assert.equal(denied.props.role,'alert');
  const reasons=['NESTED_INPUT_SCOPE_MISMATCH'],reasonDetails=[{code:reasons[0],sourceKey:'bd_payroll_entries'}];
  const loaded=context.bdFinanceCanonicalStatusV515({verified:{report:{},reasons,reasonDetails,evidenceStatus:'LEGACY_PARTIAL'},monthKey:'2026-09',venueId:3389});
  assert.match(loaded.props.children[0].props.children,/не подтверждены/);
  assert.equal(loaded.props.children[1].props.reasons,reasons);assert.equal(loaded.props.children[1].props.reasonDetails,reasonDetails);
});
test('canonical figures do not depend on local rows and unknown profit never claims an inventory mismatch',()=>{
  const expression=output.slice(output.indexOf('hasFinancialData=')+'hasFinancialData='.length,output.indexOf(';',output.indexOf('hasFinancialData=')));
  const context=vm.createContext({monthlyReport:{revenue:59222,operatingResult:38010,payroll:7550,costOfGoods:13494},monthRevenue:[],monthExpenses:[]});
  assert.equal(vm.runInContext(expression,context),true);
  context.monthlyReport={revenue:0,periodExpenses:0,payroll:null,receipts:0,dataShiftCount:0,accountedShifts:0,openingInventory:null,closingInventory:null};
  assert.equal(vm.runInContext(expression,context),false);
  vm.runInContext(output.match(/function bdFinanceFinalReasonV160[^\n]+/)[0],context);
  assert.match(context.bdFinanceFinalReasonV160({operatingResult:38010,inventoryMismatch:true},true),/Расчёт готов/);
  const reason=context.bdFinanceFinalReasonV160({operatingResult:null,inventoryMismatch:true,openingInventory:0,closingInventory:3483},true);
  assert.match(reason,/Итог не подтверждён/);assert.doesNotMatch(reason,/Остатки не сходятся|Нужны.*остатки/);
});
