import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';


import {repairPayrollMonthInitializers} from '../scripts/lib/payroll-month-initializers.mjs';


import {p0Amendment} from './helpers/p0-release-amendment.mjs';



const fixture='tests/fixtures/reference-slice-recovery/';


test('current protected files and client functions match the exact v517-based P0 amendment',()=>{ assert.ok(p0Amendment().files>300); });

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
