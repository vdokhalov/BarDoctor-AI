import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {repairPayrollMonthInitializers} from '../scripts/lib/payroll-month-initializers.mjs';
import {recoveryApprovedHashes} from './helpers/health-doctor-recovery-guard.mjs';
import {ownerQaApprovedHashes} from './helpers/owner-qa-guard.mjs';

const fixture='tests/fixtures/reference-slice-recovery/';
const digest=value=>createHash('sha256').update(value).digest('hex');

test('v489 protected files remain unchanged outside reviewed performance and owner-UAT repairs',()=>{
  const expected=JSON.parse(readFileSync(fixture+'v489-protected-files.json','utf8'));
  // The original v489 manifest remains immutable. These two bounded exceptions
  // are covered by differential full-projection and Finance regression tests.
  const performance=JSON.parse(readFileSync('tests/fixtures/health-doctor-performance-reads.json','utf8'));
  const uat=JSON.parse(readFileSync('tests/fixtures/v493-owner-uat-approved-files.json','utf8'));
  assert.deepEqual(Object.keys(uat).sort(),['lib/bardoctor/canonical-health-inputs.ts','lib/bardoctor/client/canonical-read.ts','lib/bardoctor/client/management-cost.tsx','lib/bardoctor/finance-inputs.ts','lib/bardoctor/request-observability.ts']);
  assert.deepEqual(Object.keys(performance).sort(),['lib/bardoctor/finance-inputs.ts','lib/bardoctor/operational-day.ts']);
  const rca=JSON.parse(readFileSync('tests/fixtures/v496-production-rca-approved-files.json','utf8'));
  assert.deepEqual(Object.keys(rca).sort(),['app/api/business-health/route.ts','lib/bardoctor/health-operations-inputs.ts','lib/bardoctor/request-observability.ts','package.json']);
  const recovery=recoveryApprovedHashes();
  for(const [path,hash] of Object.entries(expected))assert.equal(digest(readFileSync(path)),recovery[path]??rca[path]??uat[path]??performance[path]??hash,path);
});

test('all unrelated v489 functions survive the owner-selected v485 presentation rollback',()=>{
  let source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
  source=source.replace(/\/\* bd-reference-render:([A-Za-z\d+/=]+) \*\/[\s\S]*?\/\* bd-reference-render:end \*\//g,(_,original)=>Buffer.from(original,'base64').toString('utf8'));
  source=source.replaceAll('window.bdReadNavigationQuery("month",bdPayrollInitialMonth())','window.bdReadNavigationQuery("month",bdPayrollInitialMonth)');
  const actual=new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,digest(source.slice(n.start,n.end))]));
  const expected=JSON.parse(readFileSync(fixture+'v489-function-hashes.json','utf8'));
  const returned=new Set(['bdHomeDaily','c_e','Uce','nt','bdHomeHealthIndexV200','t_e','Vse','zse','pt','bdBootstrapRecoveryV274']);
  const removed=new Set(['bdCuratedDoctorPhase4c','bdCuratedHealthSuggestionPhase4c','bdCuratedReturnPhase4c','bdManagementHomePhase4','bdManagementQueuePhase4b']);
  const approved=ownerQaApprovedHashes();
  for(const name of removed)assert.ok(!actual.has(name));
  for(const [name,hash] of Object.entries(expected))if(!returned.has(name)&&!removed.has(name))assert.equal(actual.get(name),approved[name]??hash,name);
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
