import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('scripts/fragments/expense-scope.fragment.txt','utf8'),c);
test('expense scope separates writeoffs and dedicated costs from payments, preserving cancellations',()=>{
 const scope=c.bdExpenseScope;for(const category of ['rent','other','inventory'])assert.equal(scope({category}),'payments');
 for(const [category,result] of [['writeoff','writeoffs'],['payroll','payroll'],['taxes','taxes'],['utilities','utilities']])assert.equal(scope({category}),result);
 assert.equal(scope({category:'writeoff',sourceDocumentId:'p',source:'purchase_payment'}),'payments');
 for(const status of ['cancelled','canceled','void','voided','reversed','draft'])assert.equal(scope({status}),null);
 assert.equal(scope({reversedAt:'2026-09-01'}),null);assert.equal(scope({isDraft:true}),null);
});
test('source labels never infer manual entry from missing or unsupported source',()=>{assert.equal(c.bdExpenseSourceLabel({source:'write_off_document'}),'Документ списания');assert.equal(c.bdExpenseSourceLabel({}),'Не указан');assert.equal(c.bdExpenseSourceLabel({source:'manual'}),'Вручную');});
test('canonical monthly totals keep writeoff separate, exclude cancelled/foreign records and preserve unknown',async()=>{const r=await emptyMonthFixture();try{
 r.seed('bd_finance_expenses',[{id:'w',venueId:r.venueId,date:'2026-09-02',category:'writeoff',amount:10,currency:'MDL',source:'write_off_document',sourceDocumentId:'wo'},{id:'rent',venueId:r.venueId,date:'2026-09-03',category:'rent',amount:30,currency:'MDL'},{id:'pay',venueId:r.venueId,date:'2026-09-03',category:'inventory',amount:20,currency:'MDL',source:'purchase_payment',sourceDocumentId:'purchase'},{id:'oct',venueId:r.venueId,date:'2026-10-03',category:'rent',amount:70,currency:'MDL'},{id:'other',venueId:r.venueId+99,date:'2026-09-03',category:'rent',amount:999,currency:'MDL'},{id:'cancel',venueId:r.venueId,date:'2026-09-03',category:'rent',amount:999,currency:'MDL',status:'voided'}]);
 const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const data=await(await r.get()).json() as any;assert.equal(data.report.periodExpenses,50);assert.equal(data.report.writeoffs,10);assert.equal(data.report.expenseBreakdown.reduce((s:any,x:any)=>s+x.amount,0),50);
 const next=await(await r.api.closing.GET(r.request(r.user,'/api/month-close?monthKey=2026-10&view=current'))).json() as any;assert.equal(next.report.periodExpenses,70);
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 r.seed('bd_finance_expenses',[{id:'unknown',venueId:r.venueId,date:null,category:'rent',amount:10,currency:'MDL'}]);const unknown=await(await r.get()).json();assert.equal(unknown.report.periodExpenses,null);assert.equal(unknown.report.resultAfterCost,null);
 }finally{r.close();}});
