import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

function domain(source) {
 const start = source.indexOf('/* finance-inputs-phase3a6:start */');
 assert.ok(start >= 0);
 const end = source.indexOf('bdOperationalRows=function', start);
 assert.ok(end > start);
 return source.slice(start, end);
}
const current = fs.readFileSync(process.env.BD_CLIENT_ASSET || 'public/assets/index-BQGspy0I.js','utf8');
test('released v572 reproduces unresolved client module at startup', () => {
 const old = execFileSync('git',['show','3a0b9f2b10ecedb6a42b62ae04b6c83a2204b174:public/assets/index-BQGspy0I.js'],{maxBuffer:20*1024*1024}).toString();
 assert.throws(()=>vm.runInNewContext(domain(old),{}, {timeout:1000}), /modules\[key\] is not a function/);
});
test('actual emitted Finance dependency graph starts and preserves known/unknown inputs', () => {
 const api = vm.runInNewContext(domain(current)+';bdFinanceInputsPhase3a6',{}, {timeout:1000});
 assert.equal(typeof api.readFinanceInputs, 'function');
 assert.equal(typeof api.revenueRowsWithReports, 'function');
 assert.equal(api.finiteBusinessNumber(0), 0);
 assert.equal(api.finiteBusinessNumber(null), null);
 const base={venueId:1,currency:'MDL',asOf:'2026-10-21T00:00:00Z',startDate:'2026-10-01',endDate:'2026-10-21',revenues:[],expenses:[],reports:[],events:[],documents:[],payrollEntries:[]};
 const result=api.readFinanceInputs(base);
 assert.ok(result && Array.isArray(result.missing));
});
