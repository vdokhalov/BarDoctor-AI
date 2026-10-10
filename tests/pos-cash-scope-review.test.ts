import test from 'node:test';
import assert from 'node:assert/strict';
import {posShiftCashReport,planPosCash} from '../lib/bardoctor/pos-shift-cash';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {planSalesShift} from '../lib/bardoctor/sales-events';
const sales={paidRevenue:0,reversedRevenue:0};
test('cash review: unknown float, count and even zero-value unclassified receipt remain unknown',()=>{
 assert.equal(posShiftCashReport({},sales,0).expected,null);
 assert.equal(posShiftCashReport({openingFloat:0},sales,0).status,'NOT_COUNTED');
 assert.equal(posShiftCashReport({openingFloat:0,actualCash:0},sales,0).status,'BALANCED');
 assert.equal(posShiftCashReport({openingFloat:0,actualCash:0},sales,0,1).expected,null);
 assert.equal(posShiftCashReport({openingFloat:0,actualCash:0},sales,5).variance,null);
});
test('cash review: reversed receipts and safe drops are not deducted twice; negative expected is explicit',()=>{
 const c=salesEventFixture();c.revenues=planSalesShift(c,'open_shift','cash','Cash');c.revenues[0].openingFloat=20;
 c.revenues=planPosCash(c,'cash',{operationId:'drop',kind:'SAFE_DROP',amount:30,reason:'Synthetic safe drop'});
 const before=structuredClone(c.revenues);
 const report=posShiftCashReport(c.revenues[0],{paidRevenue:40,reversedRevenue:10},0);
 assert.equal(report.expected,30);assert.equal(report.safeDrop,30);assert.equal(report.reversedRevenue,10);
 assert.equal(posShiftCashReport(c.revenues[0],sales,0).status,'NEGATIVE_EXPECTED');
 assert.deepEqual(c.revenues,before);
 c.closedMonths.add(String(c.revenues[0].date).slice(0,7));
 assert.throws(()=>planPosCash(c,'cash',{operationId:'late',kind:'OUT',amount:1,reason:'Locked'}),/CLOSED/);
 assert.deepEqual(c.revenues,before);
});
