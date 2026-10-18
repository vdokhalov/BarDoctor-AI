import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildBusinessIntelligence, type BusinessIntelligenceInput } from '../lib/bardoctor/business-intelligence';
import { buildBusinessHealthSnapshot } from '../lib/bardoctor/business-health-snapshot';
import { buildHealthOperationsInputs, HEALTH_OPERATIONS_KEYS, type HealthCounter, type HealthSource } from '../lib/bardoctor/health-operations-inputs';
const keys = ['unclosedShifts', 'stockAnomalies', 'criticalBlockers', 'recurringEquipmentFailures'] as const;
function operations(values: Array<number | null>) {
  const counters = Object.fromEntries(keys.map((key, i) => [key, { value: values[i], availability: values[i] === null ? 'UNAVAILABLE' : 'AVAILABLE', evidenceStatus: values[i] === null ? 'NONE' : 'COMPLETE', zero: values[i] === 0 ? 'KNOWN_ZERO' : null, sources: [], diagnostics: [], grain: key, window: 'current' }])) as Record<typeof keys[number], HealthCounter>;
  return { ...Object.fromEntries(keys.map((key, i) => [key, values[i]])), counters };
}
const daily = ['2026-10-04', '2026-10-11', '2026-10-18'].map(date => ({ date, revenue: 100, receipts: 10, currency: 'PMR_RUB', closingStatus: 'closed' }));
const read = (values: Array<number | null>, patch: BusinessIntelligenceInput = {}) => buildBusinessIntelligence({ venueId: 3389, now: new Date('2026-10-18T12:00:00Z'), daily, operations: operations(values), ...patch });
const op = (value: ReturnType<typeof read>) => value.businessHealth.components.find(c => c.id === 'operations')!;
const snap = (value: ReturnType<typeof read>) => buildBusinessHealthSnapshot({ venueId: 3389, intelligence: value, context: { blocks: [] } });
test('zero/one confirmed population cannot certify Operations; two earn half weight, never 100', () => {
  for (const values of [[null, null, null, null], [0, null, null, null]]) { const r = read(values); assert.equal(op(r).score, null); assert.equal(op(r).weight, 0); assert.equal(r.businessHealth.score, null); }
  const r = read([0, null, 0, null]);
  assert.equal(op(r).score, 90); assert.equal(op(r).weight, 12.5); assert.equal(op(r).availability, 'PARTIAL');
  assert.equal(r.businessHealth.score, 78); assert.equal(r.businessHealth.coverage.weightPercent, 33);
  assert.equal(snap(r).assessment.partial, true); assert.equal(snap(r).assessment.hint?.path, '/warehouse?venueId=3389');
});
test('full Operations preserve original score and weight; known negatives remain even with unknown populations', () => {
  const full = read([1, 1, 1, 1]); assert.equal(op(full).score, 40); assert.equal(op(full).weight, 25);
  const partial = read([null, null, 1, 1]); assert.equal(op(partial).score, 52); assert.equal(op(partial).weight, 12.5);
  assert.match(op(partial).evidence.join(' '), /блокеры: 1/); assert.match(snap(partial).assessment.hint!.label, /критическое происшествие/);
});
test('a lone proven critical population caps other healthy directions without inventing an Operations score', () => {
  const r = read([null, null, 2, null], { reviews: { total: 12, averageRating: 5, negative: 0 } });
  assert.equal(op(r).score, null); assert.ok(r.businessHealth.score! <= 49);
  assert.match(r.businessHealth.adjustments.join(' '), /Критические операционные/);
  assert.equal(snap(r).assessment.hint?.path, '/cases?venueId=3389');
});
test('closed loss protection and financial period survive partial Operations', () => {
  const r = read([0, null, 0, null], { latestClosedMonth: { monthKey: '2026-09', revenue: 1000, finalProfit: -200 } });
  assert.ok(r.businessHealth.score! <= 44); assert.equal(r.businessHealth.label, 'critical');
  const s = snap(r); assert.equal(s.assessment.hint?.path, '/finance?venueId=3389');
  assert.match(s.assessment.details.join(' '), /2026-09.*не прибыль текущего месяца/);
});
test('unused equipment requires an explicitly empty registry and no contradictory evidence, not an absent record', () => {
  const sources: HealthSource[] = HEALTH_OPERATIONS_KEYS.map(key => ({ key, state: 'AVAILABLE', data: key === 'bd_assortment_v1' ? { stockBalances: [] } : [], revision: 'r', updatedAt: '2026-10-18' }));
  for (const key of ['bd_equipment_work_orders', 'bd_equipment_history']) sources.find(s => s.key === key)!.state = 'UNAVAILABLE';
  const input = () => buildHealthOperationsInputs({ sources, venueId: 3389, workspaceId: 1, dataAccountId: 1, currency: 'PMR_RUB', asOf: '2026-10-18T12:00:00Z', profile: {} });
  let ops = input(); assert.equal(ops.counters.recurringEquipmentFailures.notApplicable, true);
  let r = read([], { operations: ops }); assert.equal(op(r).weight, 25); assert.equal(op(r).operationsCoverage!.total, 3);
  assert.doesNotMatch(snap(r).assessment.hint?.path ?? '', /equipment/);
  sources.find(s => s.key === 'bd_equipment')!.state = 'UNAVAILABLE';
  ops = input(); assert.notEqual(ops.counters.recurringEquipmentFailures.notApplicable, true); assert.equal(ops.counters.recurringEquipmentFailures.value, null);
  sources.find(s => s.key === 'bd_equipment')!.state = 'AVAILABLE';
  Object.assign(sources.find(s => s.key === 'bd_equipment_history')!, { state: 'AVAILABLE', data: [{ id: 'repair', equipmentId: 'missing', type: 'repair' }] });
  assert.notEqual(input().counters.recurringEquipmentFailures.notApplicable, true);
});
test('restricted missing source never produces a link into a denied module', () => {
  const value = operations([0, null, 0, 0]);
  value.counters.stockAnomalies.availability = 'RESTRICTED';
  const r = read([], { operations: value });
  assert.equal(op(r).score, 90); assert.equal(op(r).weight, 18.75);
  assert.equal(snap(r).assessment.hint, null);
  assert.equal(snap(r).assessment.partial, true);
});
test('Home hides coverage math under How calculated, keeps a partial note and one working action', () => {
  const source = fs.readFileSync('public/assets/index-BQGspy0I.js', 'utf8');
  const extract = (name: string) => source.slice(source.indexOf(`function ${name}(`)).split('\n')[0];
  type Node = { type: string; props: { children?: unknown; onClick?: () => void; open?: boolean } };
  const jsx = (type: string | Function, props: object) => typeof type === 'function' ? type(props) : { type, props };
  const ctx = vm.createContext({ localStorage: { getItem: () => '3389' }, bdLegacyHealthRingV493: () => null, i: { jsx, jsxs: jsx } });
  for (const name of ['bdBusinessHealthNullableNumberV284', 'bdHealthTrendV332', 'bdHealthZoneV332', 'bdHealthHomeZonesV332', 'bdHomeHealthZoneV332', 'bdHealthLivePeriodV334', 'bdHealthUiStatusV332', 'bdHealthExplanationV539', 'bdHomeHealthIndexV200']) vm.runInContext(extract(name), ctx);
  let navigation = '';
  const tree: Node = ctx.bdHomeHealthIndexV200({ snapshot: snap(read([0, null, 0, null])), loading: false, onNavigate: (path: string) => { navigation = path; } });
  const walk = (node: any, includeDetails = false): any[] => Array.isArray(node) ? node.flatMap(n => walk(n, includeDetails)) : node && typeof node === 'object' ? [node, ...(node.type === 'details' && !includeDetails ? walk(node.props.children[0], includeDetails) : walk(node.props?.children, includeDetails))] : [node];
  const visible = walk(tree).filter(v => typeof v === 'string').join(' ');
  assert.match(visible, /Оценено частично/); assert.match(visible, /частично/); assert.match(visible, /Оценка по доступным данным/); assert.match(visible, /Как рассчитано/); assert.match(visible, /Уточните остатки/);
  assert.doesNotMatch(visible, /из 4|весов|UNAVAILABLE|PARTIAL/);
  const all = walk(tree, true); const details = all.find(v => v?.type === 'details'); assert.equal(details.props.open, undefined);
  assert.match(all.filter(v => typeof v === 'string').join(' '), /2 из 4.*33%/);
  const hintButtons = all.filter(v => v?.type === 'button' && typeof v.props.children === 'string'); assert.equal(hintButtons.length, 1);
  hintButtons[0].props.onClick(); assert.equal(navigation, '/warehouse?venueId=3389');
});
