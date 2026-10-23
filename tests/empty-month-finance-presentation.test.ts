import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('scripts/patch-finance-canonical-v515.mjs','utf8');
const status=source.slice(source.indexOf('function bdFinanceCanonicalStatusV515('),source.indexOf('\n`;'));
const ctx=vm.createContext({i:{Fragment:'fragment',jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props})},bdMonthlyPendingReasonsV513:'reasons'});vm.runInContext(status,ctx);
test('Finance forwards only explicit verified empty-period evidence to shared warning presentation',()=>{
 for(const [value,expected] of [[true,true],[false,false],[undefined,false],[null,false],['true',false]]){
 const result=ctx.bdFinanceCanonicalStatusV515({verified:{report:{emptyPeriod:value},reasons:['PAYROLL','INVENTORY_BOUNDARY_UNKNOWN']},monthKey:'2026-09',venueId:5});
 const warnings=result.props.children[1];assert.equal(warnings.props.emptyPeriod,expected);assert.deepEqual(warnings.props.reasons,['PAYROLL','INVENTORY_BOUNDARY_UNKNOWN']);assert.equal(warnings.props.venueId,5);
 }
});
test('loading and errors stay visible and cannot enter empty-period warning branch',()=>{
 const failed=ctx.bdFinanceCanonicalStatusV515({verified:{error:'Ошибка загрузки'},monthKey:'2026-09',venueId:5});assert.equal(failed.props.role,'alert');assert.equal(failed.props.children[0].props.children,'Ошибка загрузки');
 const pending=ctx.bdFinanceCanonicalStatusV515({verified:{},monthKey:'2026-09',venueId:5});assert.equal(pending.props.role,'status');
});
