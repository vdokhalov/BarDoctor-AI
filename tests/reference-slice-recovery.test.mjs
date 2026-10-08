import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {repairPayrollMonthInitializers} from '../scripts/lib/payroll-month-initializers.mjs';

const fixture='tests/fixtures/reference-slice-recovery/';
const digest=value=>createHash('sha256').update(value).digest('hex');

test('v489 protected files remain unchanged except two equivalent performance read projections',()=>{
  const expected=JSON.parse(readFileSync(fixture+'v489-protected-files.json','utf8'));
  // The original v489 manifest remains immutable. These two bounded exceptions
  // are covered by differential full-projection and Finance regression tests.
  const performance=JSON.parse(readFileSync('tests/fixtures/health-doctor-performance-reads.json','utf8'));
  assert.deepEqual(Object.keys(performance).sort(),['lib/bardoctor/finance-inputs.ts','lib/bardoctor/operational-day.ts']);
  for(const [path,hash] of Object.entries(expected))assert.equal(digest(readFileSync(path)),performance[path]??hash,path);
});

test('3032 prepared-client functions match v489 after reversing three renders and the two owner-approved Payroll calls',()=>{
  let source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
  source=source.replace(/\/\* bd-reference-render:([A-Za-z\d+/=]+) \*\/[\s\S]*?\/\* bd-reference-render:end \*\//g,(_,original)=>Buffer.from(original,'base64').toString('utf8'));
  source=source.replaceAll('window.bdReadNavigationQuery("month",bdPayrollInitialMonth())','window.bdReadNavigationQuery("month",bdPayrollInitialMonth)');
  const actual=new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,digest(source.slice(n.start,n.end))]));
  const expected=JSON.parse(readFileSync(fixture+'v489-function-hashes.json','utf8'));
  for(const [name,hash] of Object.entries(expected))assert.equal(actual.get(name),hash,name);
});

test('recovery keeps Home capabilities open and does not override global navigation',()=>{
  const ui=readFileSync('lib/bardoctor/client/intelligence-ui.tsx','utf8');
  assert.doesNotMatch(ui,/<details className="(?:bd-home-financial-details|bd-reference-home-extras|bd-reference-home-details)"/);
  for(const name of ['bd-home-financial-details','bd-reference-home-extras','bd-reference-home-details'])assert.ok(ui.includes('<section className="'+name+'"'),name);
  assert.match(ui,/SupportingActions items=\{supporting\?\.venue===venue/);
  assert.match(readFileSync('lib/bardoctor/client/management-actions.tsx','utf8'),/onSupportingChange\?\.\(value\?items\.slice\(1\):null\)/);
  assert.match(ui,/aria-label=\{today\.actionLabel\}/);
  const css=readFileSync('public/intelligence-v1.css','utf8');
  assert.doesNotMatch(css,/data-bd-bottom-nav|data-bd-nav-key|bd-canonical-bottom-nav/);
});

test('baseline inventory includes all source-discovered modules, entries and conditional navigation',()=>{
  const inventory=JSON.parse(readFileSync(fixture+'v489-functional-inventory.json','utf8'));
  assert.equal(new Set(inventory.items.map(i=>i.id)).size,inventory.items.length);
  for(const path of ['/home','/health','/analysis','/finance','/market','/opportunities','/reviews','/warehouse','/suppliers','/catalog','/nomenclature','/tasks','/employees','/salaries','/payroll','/equipment','/integrations','/notifications','/reports','/settings','/shifts'])assert.ok(inventory.items.some(i=>i.path===path),path);
  assert.equal(inventory.navigationLiterals.length,101);
});

test('Payroll repair calls only the two existing initializers and survives repeated preparation',()=>{
 const before='window.bdReadNavigationQuery("month",bdPayrollInitialMonth)';
 const source=before+';'+before;
 const patched=repairPayrollMonthInitializers(source);
 assert.equal(patched,'window.bdReadNavigationQuery("month",bdPayrollInitialMonth());window.bdReadNavigationQuery("month",bdPayrollInitialMonth())');
 assert.equal(repairPayrollMonthInitializers(patched),patched);
 assert.throws(()=>repairPayrollMonthInitializers(before));
 const prepared=readFileSync('public/assets/index-BQGspy0I.js','utf8');
 assert.equal(prepared.split('window.bdReadNavigationQuery("month",bdPayrollInitialMonth())').length-1,2);
});

test('recovery preserves the existing legacy diagnosis run, retry and original report handler',()=>{
 const patch=readFileSync('scripts/patch-reference-slice-v1.mjs','utf8');
 assert.match(patch,/data-bd-legacy-diagnosis/);
 for(const label of ['Запустить диагностику','Обновить анализ','Попробовать снова'])assert.ok(patch.includes(label),label);
 assert.match(patch,/i.jsx\(Fce,\{data:N.data,generatedAt:N.generatedAt,onRefresh:A\}\)/);
 assert.doesNotMatch(patch,/<details[^>]*bd-doctor-legacy/);
});
