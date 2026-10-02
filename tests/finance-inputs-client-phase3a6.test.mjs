import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileFinancialClient } from './helpers/financial-client-phase7.mjs';
const bundle = fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8');
const date = '2026-10-01';
const profile = { venueId: 1, currency: 'MDL', timezone: 'Europe/Chisinau', workingDays: [1, 2, 3, 4, 5, 6, 7] };
function fixture(payroll = 90, extra = {}) {
  const revenue = [100, 200, 0].map((revenue, index) => ({ id: 'cash-' + index, date, venueId: 1, currency: 'MDL', revenue, receipts: revenue ? 1 : 0, closingStatus: 'closed', revenueSource: 'sales_events_v1' }));
  const stores = { bd_operational_reports_v1: [{ id: 'operational-report:1:' + date, venueId: 1, date, closingStatus: 'closed', ...(payroll == null ? {} : { payrollBreakdown: { total: payroll } }) }], bd_sales_events_v1: revenue.filter(row => row.revenue).map(row => ({ id: 'event:' + row.id, venueId: 1, businessDate: date, revenueRowId: row.id, status: 'POSTED', revenue: row.revenue, currency: 'MDL', source: 'POS_API' })), ...extra };
  const client = compileFinancialClient(bundle, key => stores[key] ?? []);
  return { client, stores, revenue, report: (expenses = []) => client.report(profile, '2026-10', revenue, expenses, [], { venueId: 1, accountingCurrency: 'MDL', inventorySections: [] }) };
}
test('actual final client report includes one recorded FOT 90 for three cash sessions', () => {
  const f = fixture(); const report = f.report(); assert.equal(report.revenue, 300); assert.equal(report.payroll, 90); assert.equal(report.payrollBase, 90); assert.equal(report.resultBeforeCost, 210); assert.equal(report.inputContract.preliminaryResult, 210); assert.equal(report.isClosed, false);
  assert.ok(f.client.extraction.reportBindings >= 5, 'all wrappers including Phase3a6 must be executed');
});
test('recorded zero never falls back to payroll payment expense; missing payroll produces null result', () => {
  const known = fixture(0).report([{ id: 'paid', date, currency: 'MDL', category: 'payroll', amount: 900 }]); assert.equal(known.payroll, 0); assert.equal(known.resultBeforeCost, 300);
  const missing = fixture(null).report(); assert.equal(missing.payroll, null); assert.equal(missing.resultBeforeCost, null); assert.equal(missing.operatingResult, null); assert.ok(missing.inputContract.missing.includes('PAYROLL'));
});
test('actual monthly report excludes every invalid expense state and reversedAt', () => {
  const expenses = ['cancelled', 'void', 'voided', 'reversed', 'draft'].map(status => ({ id: status, date, category: 'other', amount: 999, currency: 'MDL', status }));
  expenses.push({ id: 'active', date, category: 'other', amount: 10, currency: 'MDL', status: 'active' }, { id: 'reversed-at', date, category: 'other', amount: 999, currency: 'MDL', status: 'active', reversedAt: date });
  const report = fixture().report(expenses); assert.equal(report.otherExpenses, 10); assert.equal(report.resultBeforeCost, 200); assert.equal(report.inputContract.preliminaryResult, 200);
});
test('bonuses accrue, payment and confirmed deduction remain settlement; rule mutation does not alter report', () => {
  const f = fixture(90, { bd_payroll_entries: [{ id: 'bonus', venueId: 1, date, type: 'bonus', amount: 10, currency: 'MDL' }, { id: 'pay', venueId: 1, date, type: 'payment', amount: 50, currency: 'MDL' }, { id: 'fine', venueId: 1, date, type: 'fine', confirmationStatus: 'confirmed', amount: 5, currency: 'MDL' }] });
  const before = f.report(); assert.equal(before.payroll, 100); assert.equal(before.resultBeforeCost, 200);
  f.stores.bd_payroll_rules = [{ id: 'rule', amount: 9999 }]; assert.equal(f.report().payroll, 100);
});
test('signed closed month uses frozen snapshot after live rules/expense changes', () => {
  const f = fixture(90, { bd_month_closings: [{ venueId: 1, monthKey: '2026-10', status: 'closed', snapshot: { revenue: 300, payroll: 90, finalProfit: 123, accountingCurrency: 'MDL' } }] });
  const report = f.report([{ date, amount: 9999, currency: 'MDL', category: 'payroll' }]); assert.equal(report.isClosed, true); assert.equal(report.payroll, 90); assert.equal(report.operatingResult, 123);
});
