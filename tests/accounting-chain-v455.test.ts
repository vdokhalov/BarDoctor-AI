import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { salesEventFixture } from './helpers/sales-event-fixture';
import type { SalesEvent, SalesEventCommand } from '../lib/bardoctor/sales-events';
import type { SalesBatch } from '../lib/bardoctor/sales-consumption';
import type { StockMovement } from '../lib/bardoctor/inventory';
import { historicalPeriodCost } from '../lib/bardoctor/financial-reconciliation';
import { summarizeInventoryValuation } from '../lib/bardoctor/valuation';
import { compileFinancialClient } from './helpers/financial-client-phase7.mjs';

type Row = Record<string, unknown>;
type Reply = Row & { event: SalesEvent; batch: SalesBatch; salesBatch: SalesBatch; previewHash: string; code: string; duplicate: boolean };
const evidence: Row[] = [];
function check(label: string, expected: unknown, actual: unknown) {
  evidence.push({ label, expected, actual });
  if (process.env.BD_ACCOUNTING_AUDIT_OUTPUT) {
    mkdirSync(process.env.BD_ACCOUNTING_AUDIT_OUTPUT, { recursive: true });
    writeFileSync(process.env.BD_ACCOUNTING_AUDIT_OUTPUT + '/observations.json', JSON.stringify(evidence, null, 2));
  }
  assert.deepEqual(actual, expected, label);
}
const now = '2026-09-25T12:00:00.000Z';
async function fixture(knowledge: 'known' | 'unknown' | 'zero' = 'known') {
  const r = await lifecycleRuntime({ events: './app/api/sales-events/route', batches: './app/api/sales-batches/route',
    importFile: './app/api/sales-batches/import/route', confirm: './app/api/sales/confirm/route' });
  const user = await r.register('chain-' + knowledge + '@isolated.test'), venue = user.activeVenueId;
  const put = (key: string, data: unknown) => r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at')
    .run(user.userId, key, JSON.stringify(data), now);
  const read = <T = Row[]>(key: string): T => JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId, key)?.data_json ?? 'null'));
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({ name: 'Isolated accounting audit', currency: 'MDL' }), user.userId);
  const assortment = JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venue));
  put('bd_assortment_v1', assortment);
  // Independent seed: 20 pcs x 5 + 2 l x 50 + 1 kg x 100 = 300 MDL.
  const receipts = [
    { productKey: 'beer-stock', amount: 20, unit: 'pcs', costAmount: 100 },
    { productKey: 'whisky-stock', amount: 2, unit: 'l', costAmount: 100 },
    { productKey: 'coffee-stock', amount: 1, unit: 'kg', costAmount: 100 },
  ].map((item, i) => ({ ...item, id: 'receipt-' + i, venueId: venue, type: 'receipt', date: '2026-09-01',
    sourceDocumentId: 'purchase-' + i, sourceLineId: 'line-' + i, status: 'active', currency: 'MDL',
    createdAt: '2026-09-01T10:00:00.000Z', costStatus: knowledge === 'unknown' ? 'UNKNOWN' : knowledge === 'zero' ? 'KNOWN_ZERO' : 'KNOWN',
    costAmount: knowledge === 'unknown' ? undefined : knowledge === 'zero' ? 0 : item.costAmount }));
  put('bd_stock_movements', receipts);
  for (const key of ['bd_finance_revenue','bd_sales_events_v1','bd_sales_batches','bd_sales_documents','bd_month_closings']) put(key, []);
  const request = (path: string, body?: unknown) => { const req = r.request(user, path, body ? 'POST' : 'GET', body); req.headers.set('X-Venue-Id', String(venue)); return req; };
  const send = async (name: 'events' | 'batches' | 'confirm', body: Row) => {
    const path = name === 'events' ? '/api/sales-events' : name === 'batches' ? '/api/sales-batches' : '/api/sales/confirm';
    const response = await r.api[name].POST(request(path, { venueId: venue, ...body }));
    return { status: response.status, data: await response.json() as Reply };
  };
  const bytes = () => JSON.stringify({ domain: r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),
    audit: r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all() });
  const history = () => historicalPeriodCost({ venueId: venue, monthKey: '2026-09', accountingCurrency: 'MDL',
    revenues: read('bd_finance_revenue'), events: read('bd_sales_events_v1'), movements: read('bd_stock_movements'),
    documents: read('bd_sales_documents'), batches: read('bd_sales_batches') });
  const balances = () => read<{ stockBalances: Row[] }>('bd_assortment_v1').stockBalances;
  const state = () => ({
    stock: balances().map(b => b.current),
    revenue: read('bd_finance_revenue').reduce((sum, v) => sum + Number(v.revenue), 0),
    receipts: read('bd_finance_revenue').reduce((sum, v) => sum + Number(v.receipts), 0),
    cost: history().cost, costKnown: history().known,
    value: summarizeInventoryValuation({ balances: balances(), stockMovements: read<StockMovement[]>('bd_stock_movements'),
      venueId: venue, accountingCurrency: 'MDL', asOf: now }).total,
  });
  const sale = async (command: SalesEventCommand) => {
    const before = bytes(), preview = await send('events', { action: 'preview', command });
    assert.equal(preview.status, 200, JSON.stringify(preview.data)); assert.equal(bytes(), before, 'Preview writes nothing');
    const body = { action: 'post', command, previewHash: preview.data.previewHash };
    const posted = await send('events', body); assert.equal(posted.status, 201, JSON.stringify(posted.data));
    return { ...posted.data, body };
  };
  return { ...r, user, venue, put, read, request, send, bytes, history, state, sale };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const command = (id: string, menuItemId: string, quantity: number, shiftId?: string): SalesEventCommand =>
  ({ id, source: 'MANUAL_GRID', shiftId, lines: [{ id: 'line-' + id, menuItemId, quantity }] });
const dailyDocument = (venue: number, date = '2026-09-24') => ({ id: 'daily-report', venueId: venue, date, sourceType: 'file_import',
  sourceSystem: 'Isolated CSV report', currency: 'MDL', totalRevenue: 50, checks: 1,
  items: [{ id: 'beer', name: 'Beer', menuItemId: 'beer', quantity: 1, grossSales: 20 },
    { id: 'coffee', name: 'Coffee', menuItemId: 'coffee', quantity: 2, grossSales: 30 }] });
function actualReport(f: Fixture, closingValue: number) {
  const snapshots = [{ date: '2026-09-01', venueId: f.venue, sections: { Бар: 300 }, total: 300 },
    { date: '2026-09-30', venueId: f.venue, sections: { Бар: closingValue }, total: closingValue }];
  const extra = new Map<string, unknown>([['bd_inventory_snapshots', snapshots], ['bd_finance_expenses', []], ['bd_finance_settings', []]]);
  const ls = new Map([['bd_session', 'isolated-audit'], ['bd_active_venue_id', String(f.venue)],
    ['bd_venue_context__isolated-audit', JSON.stringify({ activeVenueId: f.venue, venues: [{ id: f.venue }] })]]);
  const client = compileFinancialClient(readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8'),
    key => extra.has(key) ? extra.get(key) : f.read(key), { localStorage: { getItem: (key: string) => ls.get(key) ?? null }, now: '2026-10-02T12:00:00.000Z' });
  const report = client.report({ id: f.venue, name: 'Isolated accounting audit', currency: 'MDL', accountingCurrency: 'MDL', areas: ['Бар'] },
    '2026-09', f.read('bd_finance_revenue'), [], snapshots, {}, []);
  return JSON.parse(JSON.stringify(report)) as Row;
}

test('v455 chain: cash/card/manual, rollback, lost-response retry, reversal, close and actual monthly report', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(now) });
  const f = await fixture(); t.after(f.close);
  check('Initial independent stock value', { stock: [20,2,1], revenue: 0, receipts: 0, cost: 0, costKnown: true, value: 300 }, f.state());
  for (const id of ['C','D']) assert.equal((await f.send('events', { action: 'open_shift', shiftId: id, name: id })).status, 201);
  const cash = await f.sale({ ...command('cash','beer',2,'C'), source: 'POS_API', payments: [{ id: 'cash', method: 'CASH', amount: 40 }] });
  check('Cash 2 beer', { stock: [18,2,1], revenue: 40, receipts: 1, cost: 10, costKnown: true, value: 290 }, f.state());
  const card = await f.sale({ ...command('card','coffee',3,'D'), source: 'POS_API', payments: [{ id: 'card', method: 'CARD_EXTERNAL', amount: 45 }] });
  check('Card 3 recipe coffees: 24 g, 2.40 MDL', { stock: [18,2,0.976], revenue: 85, receipts: 2, cost: 12.4, costKnown: true, value: 287.6 }, f.state());
  const manual = command('manual','whisky',2,'C');
  const quote = await f.send('events', { action: 'preview', command: manual }), beforeFailure = f.bytes();
  f.failDatabase();
  await assert.rejects(f.send('events', { action: 'post', command: manual, previewHash: quote.data.previewHash }), /injected database failure/);
  check('DB transaction rollback preserves stores and audit byte-for-byte', true, f.bytes() === beforeFailure);
  const sold = await f.sale(manual);
  check('Manual 2 x 50 ml: 0.1 l, 5 MDL', { stock: [18,1.9,0.976], revenue: 165, receipts: 3, cost: 17.4, costKnown: true, value: 282.6 }, f.state());
  for (const posted of [cash,card,sold]) {
    const before = f.bytes(), retry = await f.send('events', posted.body);
    assert.equal(retry.status, 200); assert.equal(retry.data.duplicate, true); assert.equal(f.bytes(), before, 'Lost response retry writes nothing');
  }
  const posBefore = f.bytes(), rejected = await f.send('events', { action: 'reverse', eventId: cash.event.id });
  assert.equal(rejected.status, 409); assert.equal(rejected.data.code, 'POS_REVERSAL_NOT_AVAILABLE'); assert.equal(f.bytes(), posBefore);
  assert.equal((await f.send('events', { action: 'reverse', eventId: sold.event.id })).status, 201);
  const afterReverse = f.bytes(); assert.equal((await f.send('events', { action: 'reverse', eventId: sold.event.id })).data.duplicate, true);
  assert.equal(f.bytes(), afterReverse);
  check('Manual reversal restores original quantity/cost/revenue once', { stock: [18,2,0.976], revenue: 85, receipts: 2, cost: 12.4, costKnown: true, value: 287.6 }, f.state());
  const reportSale = await f.send('confirm', { document: dailyDocument(f.venue) });
  assert.equal(reportSale.status, 201, JSON.stringify(reportSale.data));
  check('Independent daily report: +50 revenue, +6.60 cost', { stock: [17,2,0.96], revenue: 135, receipts: 3, cost: 19, costKnown: true, value: 281 }, f.state());
  for (const id of ['C','D']) assert.equal((await f.send('events', { action: 'close_shift', shiftId: id })).status, 201);
  const beforeClosed = f.bytes(), closed = await f.send('events', { action: 'post', command: command('closed','beer',1,'C'), previewHash: 'unused' });
  assert.equal(closed.status, 409); assert.equal(f.bytes(), beforeClosed);
  const doc = await f.api.batches.GET(f.request('/api/sales-batches?id=' + encodeURIComponent(card.event.id)));
  assert.equal(doc.status, 200); const document = await doc.json() as { batch: SalesBatch & { revenue: number } };
  check('Journal card document captured cost/revenue/shift', { revenue: 45, cost: 2.4, shiftId: 'D' },
    { revenue: document.batch.revenue, cost: document.batch.totalTheoreticalCost, shiftId: document.batch.shiftId });
  const beforeReport = f.bytes(), report = actualReport(f, 281);
  check('Actual shipped monthly report totals', { revenue: 135, costOfGoods: 19, grossProfit: 116, operatingResult: 116,
    openingInventory: 300, closingInventory: 281, inventoryRevaluation: 0, financialReconciliationKnown: true },
    Object.fromEntries(['revenue','costOfGoods','grossProfit','operatingResult','openingInventory','closingInventory','inventoryRevaluation','financialReconciliationKnown'].map(key => [key,report[key]])));
  assert.equal(f.bytes(), beforeReport);
  check('Monthly daily rows reconcile two shifts without duplicate cost', [{date:'2026-09-25',revenue:85,cost:12.4,result:72.6},{date:'2026-09-24',revenue:50,cost:6.6,result:43.4}], (report.shiftEstimates as Row[]).map(row => ({date:row.date,revenue:row.revenue,cost:row.estimatedCost,result:row.estimatedResult})));
  const ledger = f.read<StockMovement[]>('bd_stock_movements');
  check('Signed original and reversal ledger preserves quantities and money', {stock:[17,2,0.96],value:281}, {stock:['beer-stock','whisky-stock','coffee-stock'].map(key => Math.round(ledger.filter(m=>m.productKey===key).reduce((n,m)=>n+Number(m.amount),0)*1000000)/1000000),value:Math.round(ledger.reduce((n,m)=>n+Number(m.costAmount ?? 0),0)*100)/100});
  check('Full journal documents match events', 3, f.read('bd_sales_events_v1').length);
});

test('v455 chain: CSV draft/post/retry/reverse changes stock, never adds revenue', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(now) });
  const f = await fixture(); t.after(f.close);
  const upload = async () => {
    const form = new FormData(); form.set('file', new File(['Name,Quantity\nBeer,1\nCoffee,4\n'], 'isolated.csv', { type: 'text/csv' }));
    form.set('businessDate', '2026-09-25'); form.set('nameColumn','0'); form.set('quantityColumn','1'); form.set('headerRow','0');
    const auth = f.request('/api/sales-batches/import').headers; auth.delete('Content-Type');
    const response = await f.api.importFile.POST(new Request('https://isolated.test/api/sales-batches/import', { method:'POST', headers:auth, body:form }));
    return { status: response.status, data: await response.json() as Reply };
  };
  const imported = await upload(); assert.equal(imported.status, 201, JSON.stringify(imported.data));
  check('CSV draft does not consume stock or add money', { stock:[20,2,1], revenue:0, receipts:0, cost:0, costKnown:true, value:300 }, f.state());
  const posted = await f.send('batches',{action:'post',id:imported.data.batch.id}); assert.equal(posted.status,201,JSON.stringify(posted.data));
  check('CSV stock post: 1 piece + 32 g, cost 8.20', { stock:[19,2,0.968], revenue:0, capturedCost:8.2, value:291.8 },
    { stock:f.state().stock, revenue:f.state().revenue, capturedCost:posted.data.batch.totalTheoreticalCost, value:f.state().value });
  const before = f.bytes(); assert.equal((await upload()).data.duplicate,true);
  assert.equal((await f.send('batches',{action:'post',id:imported.data.batch.id})).data.idempotent,true);assert.equal(f.bytes(),before);
  assert.equal((await f.send('batches',{action:'reverse',id:imported.data.batch.id})).status,200);
  const reversed = f.bytes();assert.equal((await f.send('batches',{action:'reverse',id:imported.data.batch.id})).data.idempotent,true);assert.equal(f.bytes(),reversed);
  check('CSV reversal restores full original balance/value', { stock:[20,2,1], revenue:0, receipts:0, cost:0, costKnown:true, value:300 }, f.state());
});

test('v455 chain: confirmed report retry and same-date event/report conflict are write-free', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(now) });
  const f = await fixture();t.after(f.close);
  const body={document:dailyDocument(f.venue)}, confirmed=await f.send('confirm',body);assert.equal(confirmed.status,201);
  check('Confirmed daily report value', {stock:[19,2,0.984],revenue:50,receipts:1,cost:6.6,costKnown:true,value:293.4},f.state());
  const before=f.bytes();assert.equal((await f.send('confirm',body)).data.duplicate,true);assert.equal(f.bytes(),before);
  await f.sale(command('today','beer',1));
  const conflictBefore=f.bytes(), conflict=await f.send('confirm',{document:{...dailyDocument(f.venue,'2026-09-25'),id:'conflict'}});
  check('Daily report cannot duplicate live event revenue',{status:409,code:'REVENUE_DATE_CONFLICT'},{status:conflict.status,code:conflict.data.code});
  assert.equal(f.bytes(),conflictBefore);
});

for(const knowledge of ['unknown','zero'] as const) test('v455 chain: '+knowledge+' cost remains distinct through real posting and report',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture(knowledge);t.after(f.close);
  const sale=await f.sale(command('knowledge','beer',1)),history=f.history(),report=actualReport(f,0);
  check(knowledge+' cost snapshot',{revenue:20,cost:knowledge==='zero'?0:null,known:knowledge==='zero'},
    {revenue:sale.event.revenue,cost:sale.event.batch.totalTheoreticalCost,known:history.known});
  check(knowledge+' monthly cost',{cost:knowledge==='zero'?0:null,profit:knowledge==='zero'?20:null},
    {cost:report.costOfGoods,profit:report.grossProfit});
});


test('v455 chain: catalogue changes cannot reprice history or change reversal quantity', async t => {
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture();t.after(f.close);
  const original=await f.sale(command('frozen','coffee',10)),before=JSON.stringify(f.read('bd_sales_events_v1'));
  const assortment=f.read<{menuItems:Row[];recipes:{ingredients:Row[]}[];stockBalances:Row[]}>('bd_assortment_v1');
  for(const item of assortment.menuItems)item.salePrice=999;
  for(const recipe of assortment.recipes)for(const item of recipe.ingredients){item.quantity=80;item.normalizedQuantity=0.08;}
  for(const balance of assortment.stockBalances){balance.averageUnitCost=999;balance.inventoryValue=999999;}
  f.put('bd_assortment_v1',assortment);
  check('Current catalogue cannot reprice posted sale', {stock:[20,2,0.92],revenue:150,receipts:1,cost:8,costKnown:true,value:292},f.state());
  assert.equal(JSON.stringify(f.read('bd_sales_events_v1')),before);
  assert.equal((await f.send('events',{action:'reverse',eventId:original.event.id})).status,201);
  check('Reversal uses original 80 g total, not edited 800 g recipe',{stock:[20,2,1],revenue:0,receipts:0,cost:0,costKnown:true,value:300},f.state());
});

test('v455 audit boundary: unlinked text import consumption should not become inventory revaluation beside live sales',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture();t.after(f.close);
  await f.sale(command('live','beer',1));
  const imported=await f.send('batches',{action:'import_text',text:'Beer 1',businessDate:'2026-09-25'});assert.equal(imported.status,201,JSON.stringify(imported.data));
  const posted=await f.send('batches',{action:'post',id:imported.data.batch.id});assert.equal(posted.status,201,JSON.stringify(posted.data));
  const report=actualReport(f,290);
  check('AUDIT-01 fixed: unlinked cost is explicit unknown, not profit or revaluation',
    {known:false,cost:null,profit:null,result:null,revaluation:null},
    {known:report.financialReconciliationKnown,cost:report.costOfGoods,profit:report.grossProfit,
      result:report.operatingResult,revaluation:report.inventoryRevaluation});
  assert.ok((report.financialReconciliationReasons as string[]).includes('UNLINKED_SALES_CONSUMPTION'));
  check('Stock and revenue remain intact while coverage is incomplete',{stock:[18,2,1],revenue:20,cost:5},
    {stock:f.state().stock,revenue:f.state().revenue,cost:posted.data.batch.totalTheoreticalCost});
  assert.equal((await f.send('batches',{action:'reverse',id:imported.data.batch.id})).status,200);
  const restored=actualReport(f,295);
  check('Reversed standalone import restores complete coverage',{known:true,cost:5,profit:15,revaluation:0},
    {known:restored.financialReconciliationKnown,cost:restored.costOfGoods,profit:restored.grossProfit,revaluation:restored.inventoryRevaluation});
});

test('v455 audit boundary: reversing confirmed report stock must not leave confirmed revenue with broken cost coverage',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture();t.after(f.close);
  const confirmed=await f.send('confirm',{document:dailyDocument(f.venue)});assert.equal(confirmed.status,201);
  const listed = await (await f.api.batches.GET(f.request('/api/sales-batches'))).json() as {batches:(SalesBatch & {readOnly?:boolean})[];capabilities:{reverse:boolean}};
  const linked = listed.batches.find(batch=>batch.id===confirmed.data.salesBatch.id)!;
  assert.equal(listed.capabilities.reverse,true);assert.equal(linked.status,'POSTED');assert.ok(linked.postedLineCount>0);assert.notEqual(linked.readOnly,true);
  const before=f.bytes(),reversed=await f.send('batches',{action:'reverse',id:confirmed.data.salesBatch.id});
  check('AUDIT-02 fixed: confirmed report batch rejects stock-only reversal',
    {status:409,code:'SALES_BATCH_LINKED_CONFIRMED_REPORT'},{status:reversed.status,code:reversed.data.code});
  assert.equal(f.bytes(),before);
  assert.equal((await f.send('batches',{action:'reverse',id:confirmed.data.salesBatch.id})).status,409);
  assert.equal(f.bytes(),before);
  check('Blocked reversal preserves consistent financial and stock state',
    {stock:[19,2,0.984],revenue:50,receipts:1,cost:6.6,costKnown:true,value:293.4},f.state());
});




test('report reversal guard respects account and venue scope, including legacy documents',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture();t.after(f.close);
  const imported=await f.send('batches',{action:'import_text',text:'Beer 1',businessDate:'2026-09-25'});
  assert.equal((await f.send('batches',{action:'post',id:imported.data.batch.id})).status,201);
  const linked={id:'report',status:'confirmed',salesBatchId:imported.data.batch.id};
  f.put('bd_sales_documents',[linked]);
  const before=f.bytes();assert.equal((await f.send('batches',{action:'reverse',id:imported.data.batch.id})).status,409);assert.equal(f.bytes(),before);
  f.put('bd_sales_documents',[{...linked,venueId:f.venue+1000}]);
  const other=await f.register('other-account@isolated.test');
  f.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)').run(other.userId,'bd_sales_documents',JSON.stringify([{...linked,venueId:f.venue}]),now);
  assert.equal((await f.send('batches',{action:'reverse',id:imported.data.batch.id})).status,200);
  assert.equal(f.state().stock[0],20);
});


test('partially posted real import remains incomplete even when its movement ledger is retained separately',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse(now)});const f=await fixture();t.after(f.close);
  await f.sale(command('partial-live','beer',1));
  const imported=await f.send('batches',{action:'import_text',text:'Beer 1\nUnmapped item 1',businessDate:'2026-09-25'});
  assert.equal(imported.status,201);const posted=await f.send('batches',{action:'post',id:imported.data.batch.id});
  assert.equal(posted.status,201);assert.equal(posted.data.batch.status,'PARTIALLY_BLOCKED');assert.equal(posted.data.batch.postedLineCount,1);
  assert.ok(f.history().reasons.includes('UNLINKED_SALES_CONSUMPTION'));
  f.put('bd_stock_movements',f.read<StockMovement[]>('bd_stock_movements').filter(m=>m.salesBatchId!==posted.data.batch.id));
  assert.ok(f.history().reasons.includes('UNLINKED_SALES_CONSUMPTION'),'Durable partial batch must protect coverage after ledger retention');
});
