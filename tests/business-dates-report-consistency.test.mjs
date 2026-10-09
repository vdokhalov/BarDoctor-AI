import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {compileFinancialClient} from './helpers/financial-client-phase7.mjs';
import {existingMonthlyCalculation} from '../lib/bardoctor/month-report-calculation.js';

const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
function fn(name){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,name);return source.slice(n.start,n.end);}
const profile={id:3389,venueId:3389,currency:'MDL',timezone:'Europe/Chisinau',trackingStartDate:'2026-10-09'};
const settings={id:'3389',currency:'MDL',taxModel:{mode:'actual'},utilityModel:{mode:'actual'}};
const revenues=Array.from({length:7},(_,n)=>({id:'shift-'+n,venueId:3389,date:'2026-10-0'+(n+2),revenue:1800,receipts:27,currency:'MDL',closingStatus:'closed',payrollBreakdown:{total:400,perEmployee:{anna:200,boris:200}}}));
function client(stores={}){return compileFinancialClient(source,k=>stores[k]??[],{now:'2026-10-09T12:00:00Z',localStorage:{getItem:k=>k==='bd_active_venue_id'?'3389':null}});}

test('calendar business dates survive browser timezone differences; timestamps use venue timezone',()=>{
 const code=fn('sg')+`;const bz=()=>({timezone:'Europe/Chisinau'});console.log(JSON.stringify(['2026-10-02','2026-10-08','2026-03-29','2026-10-25','2026-10-01T22:30:00Z','2026-10-02T00:30:00+03:00'].map(sg)));`;
 const outputs=['America/Los_Angeles','Europe/Chisinau','Pacific/Kiritimati'].map(TZ=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,TZ}})));
 assert.deepEqual(outputs[0],outputs[1]);assert.deepEqual(outputs[1],outputs[2]);
 assert.match(outputs[0][0],/^2 /);assert.match(outputs[0][1],/^8 /);assert.match(outputs[0][2],/^29 /);assert.match(outputs[0][3],/^25 /);
 assert.equal(outputs[0][4],outputs[0][0]);assert.equal(outputs[0][5],outputs[0][0]);
});

test('actual recorded days before tracking starts count once; future schedule does not erase them',()=>{
 const rows=[...revenues,{...revenues[0],id:'second-session',revenue:0,receipts:0,payrollBreakdown:{total:0}}];
 const before=JSON.stringify(rows);
 for(const workingDays of [undefined,{1:false,2:false,3:false,4:false,5:false,6:false,7:false}]){
  const p={...profile,workingDays},c=client(),actual=c.report(p,'2026-10',rows,[],[],settings,[]);
  const server=existingMonthlyCalculation(p,'2026-10',rows,[],[],settings,[],{},'2026-10-09T12:00:00Z','MDL');
  for(const r of [actual,server]){assert.equal(r.dataShiftCount,7);assert.equal(r.expectedShifts,7);assert.equal(r.accountedShifts,7);assert.equal(r.coveragePercent,100);assert.equal(r.revenue,12600);assert.equal(r.periodPast,false);assert.equal(r.isClosed,false);}
 }
 assert.equal(JSON.stringify(rows),before);
});

test('monthly counts isolate venue and period, include recorded zero, and retain planned missing days',()=>{
 const rows=[...revenues,{...revenues[0],id:'other-venue',venueId:999,date:'2026-10-10',revenue:99999},{...revenues[0],id:'other-month',date:'2026-09-30'}, {id:'zero',venueId:3389,date:'2026-10-09',revenue:0,receipts:0,currency:'MDL',closingStatus:'closed',payrollBreakdown:{total:200}}];
 const r=client().report(profile,'2026-10',rows,[],[],settings,[]);
 assert.equal(r.dataShiftCount,8);assert.equal(r.accountedShifts,8);assert.equal(r.expectedShifts,8);assert.equal(r.revenue,12600);assert.equal(r.payroll,3000);
 const missing=client().report({...profile,trackingStartDate:'2026-10-01'},'2026-10',revenues,[],[],settings,[]);
 assert.equal(missing.expectedShifts,8);assert.equal(missing.accountedShifts,7);assert.equal(missing.coveragePercent,88);
});

test('coverage percentage is explicitly shift coverage and still lists month-close blockers',()=>{
 const jsx=(type,props)=>({type,props}),c=vm.createContext({i:{jsx,jsxs:jsx},bdMonthlySectionHeaderV165:'header'});
 vm.runInContext(fn('bdMonthlyReadinessV165'),c);
 const tree=JSON.stringify(c.bdMonthlyReadinessV165({report:{isClosed:false,coveragePercent:100,expectedShifts:7,accountedShifts:7,openingInventory:null,closingInventory:null,inventoryMismatch:true,periodPast:false},navigate:()=>{}}));
 assert.match(tree,/Полнота данных смен/);assert.match(tree,/Процент относится только к сменам/);assert.match(tree,/100%/);
 for(const reason of ['начальные остатки','конечные остатки','расхождение остатков','месяц ещё не завершён'])assert.ok(tree.includes(reason));
 assert.doesNotMatch(tree,/Готовность отчёта/);
});

test('monthly accrued result, supplier settlements and payroll cash payment remain distinct without double counting',()=>{
 const rows=[...revenues,{id:'zero',venueId:3389,date:'2026-10-09',revenue:0,receipts:0,currency:'MDL',payrollBreakdown:{total:200}}];
 const expenses=[{id:'supplier',venueId:3389,date:'2026-10-06',amount:2000,currency:'MDL',category:'products',source:'purchase_payment',sourceDocumentId:'purchase'}, {id:'repair',venueId:3389,date:'2026-10-09',amount:300,currency:'MDL',category:'repairs'}, {id:'writeoff',venueId:3389,date:'2026-10-09',amount:40,currency:'MDL',category:'writeoff'}];
 const payroll=[{id:'bonus',venueId:3389,date:'2026-10-06',type:'bonus',amount:100,currency:'MDL'},{id:'advance',venueId:3389,date:'2026-10-06',type:'payment',amount:50,currency:'MDL'}];
 const stores={bd_payroll_entries:payroll,bd_purchase_documents:[{id:'purchase',venueId:3389,date:'2026-10-06',status:'confirmed',documentType:'invoice',expenseCategory:'products',total:3300,currency:'MDL'}]};
 const before=JSON.stringify({rows,expenses,stores}),r=client(stores).report(profile,'2026-10',rows,expenses,[],settings,[]);
 assert.equal(r.revenue,12600);assert.equal(r.purchases,3300);assert.equal(r.purchasePayments,2000);assert.equal(r.periodExpenses,2300);
 assert.equal(r.payroll,3100);assert.equal(r.payrollPaid,50);assert.equal(r.payrollBalance,3050);
 assert.equal(r.resultBeforeCost,9160);assert.equal(r.cashResult,7160);assert.equal(r.operatingResult,null);
 assert.equal(JSON.stringify({rows,expenses,stores}),before);
});
