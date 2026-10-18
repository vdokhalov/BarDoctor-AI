import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildBusinessIntelligence, type BusinessIntelligenceInput } from '../lib/bardoctor/business-intelligence';
import { buildBusinessHealthSnapshot } from '../lib/bardoctor/business-health-snapshot';
import { buildVenueAIContextFromSources, type StoredVenueValue } from '../lib/bardoctor/venue-ai-context';
import { buildHealthOperationsInputs, HEALTH_OPERATIONS_KEYS, type HealthSource } from '../lib/bardoctor/health-operations-inputs';
import { patchCurrentHealthClient } from '../scripts/lib/health-current-v538.mjs';
const operations = { unclosedShifts: 0, stockAnomalies: 0, criticalBlockers: 0, recurringEquipmentFailures: 0 };
const daily = ['2026-10-04', '2026-10-11', '2026-10-18'].map(date => ({ date, revenue: 100, receipts: 10, currency: 'MDL', closingStatus: 'closed' }));
const read = (patch: BusinessIntelligenceInput = {}) => buildBusinessIntelligence({ now: new Date('2026-10-18T12:00:00Z'), venueId: 3389, daily, operations, ...patch });
const snapshot = (value = read()) => buildBusinessHealthSnapshot({ venueId: 3389, intelligence: value, context: { blocks: [] } });
test('open month: demand + operations yield 81 with 45% coverage, not a financial verdict', () => {
  const value = read(), result = snapshot(value);
  assert.equal(value.businessHealth.score, 81);
  assert.deepEqual(value.businessHealth.coverage, { measured: 2, total: 4, weightPercent: 45, financeAvailable: false, label: 'Покрытие индекса: 2 из 4 направлений · 45% весов. Финансовое состояние не оценено.' });
  assert.equal(result.statusLabel, 'Хорошо по доступным направлениям');
  assert.match(result.explanation, /Финансовое состояние не оценено/);
  assert.doesNotMatch(result.livePeriod.periodLabel, /предварительно/i);
});
test('empty data, quality 100, one direction and unrated reviews cannot unlock score', () => {
  for (const patch of [ { daily: [], operations: {} }, { operations: {} }, { daily: [] }, { operations: {}, reviews: { total: 10 } } ]) {
    const value = read({ ...patch, dataBlocks: [{ id: 'performanceHistory', label: 'История', available: true }] });
    assert.equal(value.businessHealth.score, null);
  }
});
test('partial proof or missing operation value is not a known zero', () => {
  const counters = Object.fromEntries(Object.keys(operations).map(key => [key, { value: 0, availability: 'AVAILABLE', evidenceStatus: 'COMPLETE' }])) as NonNullable<BusinessIntelligenceInput['operations']>['counters'];
  counters!.stockAnomalies.evidenceStatus = 'PARTIAL';
  let result = read({ operations: { ...operations, counters } });
  assert.equal(result.businessHealth.components.find(c => c.id === 'operations')!.availability, 'PARTIAL');
  assert.equal(result.businessHealth.components.find(c => c.id === 'operations')!.weight, 18.75);
  counters!.stockAnomalies.evidenceStatus = 'COMPLETE';
  result = read({ operations: { ...operations, stockAnomalies: null, counters: { ...counters!, stockAnomalies: { ...counters!.stockAnomalies, value: null } } } });
  assert.equal(result.businessHealth.components.find(c => c.id === 'operations')!.availability, 'PARTIAL');
});
test('provisional demand or absent measurable baseline delta cannot manufacture baseline 70', () => {
  assert.equal(read({ daily: daily.map(row => ({ ...row, closingStatus: 'open' })) }).businessHealth.score, null);
  assert.equal(read({ daily: daily.map(row => ({ ...row, revenue: 0, receipts: null })) }).businessHealth.score, null);
});
test('closed finances retain weight and serious loss cap, with their own period', () => {
  const good = read({ latestClosedMonth: { monthKey: '2026-09', revenue: 1000, finalProfit: 100 } });
  assert.equal(good.businessHealth.components.find(c => c.id === 'finance')!.score, 78);
  assert.equal(good.businessHealth.coverage.weightPercent, 85);
  assert.equal(good.businessHealth.score, Math.round((78 * 40 + 70 * 20 + 90 * 25) / 85));
  const bad = read({ latestClosedMonth: { monthKey: '2026-09', revenue: 1000, finalProfit: -200 } });
  assert.ok(bad.businessHealth.score! <= 44);
  assert.equal(bad.businessHealth.label, 'critical');
  assert.match(bad.businessHealth.adjustments.join(' '), /убыток закрытого периода/);
  assert.match(snapshot(bad).zones.find(c => c.id === 'finance')!.interpretation, /2026-09.*не прибыль текущего месяца/);
});
test('missing expense/payroll stores stay unknown; recorded zero stays zero', () => {
  const stores = new Map<string, StoredVenueValue>([
    ['bd_finance_revenue', { data: [{ id: 'r', venueId: 3389, date: '2026-10-18', revenueSource: 'MANUAL_SUMMARY', revenue: 100, currency: 'MDL', closingStatus: 'closed' }], updatedAt: '2026-10-18' }],
    ['bd_operational_reports_v1', { data: [{ id: 'p', venueId: 3389, date: '2026-10-18', closingStatus: 'closed', payrollBreakdown: { total: 0 } }], updatedAt: '2026-10-18' }],
  ]);
  const period = () => buildVenueAIContextFromSources('diagnosis', { stores, accountProfile: { venueId: 3389, currency: 'MDL' }, now: new Date('2026-10-18T12:00:00Z') }).promptData.performanceHistory.period as Record<string, unknown>;
  assert.equal(period().revenue, 100); assert.equal(period().expenses, null); assert.equal(period().result, null);
  for (const key of ['bd_finance_expenses', 'bd_payroll_entries']) stores.set(key, { data: [], updatedAt: '2026-10-18', sourceState: 'AVAILABLE' });
  assert.equal(period().expenses, 0); assert.equal(period().result, 100);
  stores.get('bd_finance_expenses')!.sourceState = 'PARTIAL'; assert.equal(period().result, null);
  stores.clear(); assert.equal(period().revenue, null); assert.equal(period().result, null);
});
test('complete shift alone does not certify cases, warehouse and equipment sources', () => {
  const sources: HealthSource[] = HEALTH_OPERATIONS_KEYS.map(key => ({ key, state: 'AVAILABLE', revision: 'r', updatedAt: '2026-10-18', data: key === 'bd_assortment_v1' ? { stockBalances: [] } : [] }));
  sources.find(s => s.key === 'bd_finance_revenue')!.data = [{ id: 'r', venueId: 3389, date: '2026-10-18', revenueSource: 'MANUAL_SUMMARY', revenue: 100, currency: 'MDL', closingStatus: 'closed' }];
  sources.find(s => s.key === 'bd_operational_reports_v1')!.data = [{ id: 'p', venueId: 3389, date: '2026-10-18', closingStatus: 'closed', payrollBreakdown: { total: 0 } }];
  sources.find(s => s.key === 'bd_cases')!.state = 'UNAVAILABLE';
  const ops = buildHealthOperationsInputs({ sources, venueId: 3389, workspaceId: 1, dataAccountId: 1, profile: {}, asOf: '2026-10-18T12:00:00Z', currency: 'MDL' });
  assert.equal(ops.days[0].status, 'COMPLETE');
  assert.equal(ops.counters.unclosedShifts.value, 0); assert.equal(ops.counters.criticalBlockers.value, null);
  assert.notEqual(read({ operations: ops }).businessHealth.score, null);
  assert.equal(read({ operations: ops }).businessHealth.components.find(c => c.id === 'operations')!.availability, 'PARTIAL');
});
test('actual client helpers show coverage, separate financial period and qualified status; patch is idempotent', () => {
  const source = fs.readFileSync('public/assets/index-BQGspy0I.js', 'utf8');
  assert.equal(patchCurrentHealthClient(source), source);
  const extract = (name: string) => source.slice(source.indexOf(`function ${name}(`)).split('\n')[0];
  const ctx = vm.createContext({ localStorage: { getItem: () => '3389' }, i: { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) } }); vm.runInContext(extract('bdHealthLivePeriodV334') + '\n' + extract('bdHealthUiStatusV332'), ctx);
  vm.runInContext(extract('bdHealthExplanationV539') + '\n' + extract('bdCostHomeScorePhase4a'), ctx);
  const current = snapshot();
  const home = JSON.stringify(ctx.bdCostHomeScorePhase4a({ snapshot: current, loading: false, onNavigate: () => {} }));
  assert.match(home, /Текущее состояние/);
  assert.match(home, /Оценено частично/);
  assert.doesNotMatch(ctx.bdHealthLivePeriodV334(current).periodLabel, /из 4|весов/);
  assert.doesNotMatch(ctx.bdHealthLivePeriodV334(current).periodLabel, /предварительно/);
  assert.equal(ctx.bdHealthUiStatusV332(81, 'healthy', current).label, 'Оценено частично');
  const closed = snapshot(read({ latestClosedMonth: { monthKey: '2026-09', revenue: 1000, finalProfit: 100 } }));
  assert.match(closed.assessment.details.join(' '), /Финансовая оценка: 2026-09.*не прибыль текущего месяца/);
});
