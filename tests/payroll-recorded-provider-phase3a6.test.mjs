import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
const bundle = fs.readFileSync(process.env.BD_PHASE3A6_BASELINE_BUNDLE || new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8');
const ast = parse(bundle, { ecmaVersion: 'latest', sourceType: 'module' });
const provider = ast.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'ple');
assert.ok(provider, 'actual existing Finance provider');
test('actual Finance provider hydration and later day save never recompute recorded historical FOT', () => {
  const history = Object.freeze({ id: 'recorded', date: '2026-10-01', revenue: 300, staffing: Object.freeze([{ employeeId: 'A', hours: 8 }]), payrollBreakdown: Object.freeze({ total: 90 }) });
  const rows = [history], writes = [], effects = [], storage = new Map();
  const context = vm.createContext({
    S: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: value => ({ current: value }), useEffect: effect => effects.push(effect), useCallback: fn => fn },
    Ai: () => ({ isReady: true }), Un: () => ({ profile: { venueId: 1 }, isReady: true }), _i: () => ({ employees: [{ id: 'A' }] }), Do: () => ({ rules: [{ amount: 999 }] }),
    ss: value => [...value], vM: () => [], gM: () => rows, yM: () => [], TC: () => 1, m7: () => ({ total: 999 }), _h: value => writes.push(structuredClone(value)),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, window: { addEventListener() {}, removeEventListener() {} },
    Pt: key => key, fle: 'qa-payroll-marker', Wm: 'bd_finance_revenue', Km: 'bd_finance_expenses', Vd: 'bd_finance_gap_reasons',
    i: { jsx: (_type, props) => props }, x7: { Provider: {} }, loe: value => ({ ...value, id: 'new-day' }), Js() {}, Date,
  });
  vm.runInContext(bundle.slice(provider.start, provider.end) + '\nglobalThis.api=ple({}).value;', context);
  for (const effect of effects) effect();
  assert.equal(writes.length, 0, 'hydration must not rewrite historical business facts');
  context.api.upsertDailyRevenue({ date: '2026-10-02', revenue: 100, staffing: [{ employeeId: 'A', hours: 8 }], payrollBreakdown: { total: 0 } });
  assert.equal(writes.length, 1, 'one explicit new-day save');
  assert.equal(writes[0].find(row => row.id === 'recorded').payrollBreakdown.total, 90);
  assert.equal(writes[0].find(row => row.id === 'new-day').payrollBreakdown.total, 0, 'recorded zero is not replaced by current 999 rule');
  assert.equal(history.payrollBreakdown.total, 90);
});
