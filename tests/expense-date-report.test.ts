import test from 'node:test';import assert from 'node:assert/strict';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
import {validExpenseDate} from '../lib/bardoctor/expense-date';
test('calendar dates reject missing, null, empty, malformed and impossible values',()=>{for(const date of [undefined,null,'','bad','2026-09','2026-09-31','2026-02-29',123,{},'2026-09-02T00:00:00Z'])assert.equal(validExpenseDate(date),false);for(const date of ['2026-09-02','2024-02-29'])assert.equal(validExpenseDate(date),true);});
test('malformed scoped expense blocks exact results without mutation, across months, and identifies record',async()=>{const r=await emptyMonthFixture();try{
 for(const date of [undefined,null,'','bad','2026-09-31']){
 r.seed('bd_finance_expenses',[{id:'expense-bad',venueId:r.venueId,date,category:'rent',amount:30,currency:'MDL'}]);const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 for(const month of ['2026-09','2026-10']){const res=await r.api.closing.GET(r.request(r.user,'/api/month-close?monthKey='+month+'&view=current'));assert.equal(res.status,200);const data=await res.json() as any;assert.ok(data.reasons.includes('EXPENSE_DATE_UNKNOWN'));assert.equal(data.report.emptyPeriod,false);for(const key of ['resultBeforeCost','resultAfterCost','finalProfit','provisionalResultAfterCost'])assert.equal(data.report[key],null);assert.equal(data.report.expenseDateIssues[0].recordId,'expense-bad');assert.equal(data.reasonDetails.find((x:any)=>x.code==='EXPENSE_DATE_UNKNOWN').recordId,'expense-bad');}
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 }
 for(const bad of [{venueId:r.venueId+999,date:null},{venueId:r.venueId,date:null,status:'voided'}]){r.seed('bd_finance_expenses',[{id:'excluded',amount:30,...bad}]);const data=await(await r.get()).json();assert.equal(data.report.expenseDateIssues,undefined);}
 r.seed('bd_finance_expenses',[{id:'valid-sep',venueId:r.venueId,date:'2026-09-02',category:'rent',amount:30,currency:'MDL'},{id:'valid-oct',venueId:r.venueId,date:'2026-10-02',category:'rent',amount:70,currency:'MDL'}]);const valid=await(await r.get()).json();assert.equal(valid.report.expenseDateIssues,undefined);assert.equal(valid.report.otherExpenses,30);
 r.seed('bd_finance_expenses',[]);assert.equal((await(await r.get()).json()).report.emptyPeriod,true);
 }finally{r.close();}});
