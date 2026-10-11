import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { patchPayrollConfirmation } from '../scripts/patch-payroll-confirmation-v513.mjs';

const original = fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8');
const bundle = patchPayrollConfirmation(original);
const fn = name => bundle.slice(bundle.indexOf(`function ${name}(`), bundle.indexOf('\n', bundle.indexOf(`function ${name}(`)));
const types = ['order', 'fine', 'dishware', 'other_deduction'];
function runtime(entries = []) {
  let state = [], cursor = 0, saved;
  const context = vm.createContext({
    S: { useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = value; }]; }, useEffect() {}, useMemo: f => f(), useCallback: f => f },
    i: { jsx: (type, props) => ({ type, ...props }), jsxs: (type, props) => ({ type, ...props }), Fragment: 'fragment' }, W: { div: 'div' },
    bdFieldLabel: 'label', bdPayrollDefaultDate: () => '2026-09-30', bdPayrollEntryOptions: [...types, 'bonus', 'payment'], bdPayrollEntryLabels: {}, bdPayrollDeductionTypes: types,
    bdPayrollEntriesKey: 'ledger', bdPayrollArrayStore: () => entries, bdPayrollVenueKey: profile => profile.venueId, Ai: () => ({ isReady: true }),
    qr: (_, rows) => { saved = rows; }, Dz: () => 'new-id', Mn: String, sg: String,
  });
  vm.runInContext(['bdPayrollEntrySheet', 'bdPayrollLedgerRow', 'bdPayrollEntryTotals', 'bdPayrollApplyLedger', 'bdPayrollEntriesForVenue', 'bdUsePayrollLedger'].map(fn).join('\n'), context);
  return { context, render(name, props) { cursor = 0; return context[name](props); }, get saved() { return saved; } };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.children].flat().flatMap(nodes)]; }
const find = (tree, predicate) => nodes(tree).find(predicate);

test('payroll patch is idempotent and does not change the approval filter or persistence hook', () => {
  assert.equal(patchPayrollConfirmation(bundle), bundle);
  for (const name of ['bdPayrollEntryTotals', 'bdUsePayrollLedger']) assert.ok(original.includes(fn(name)));
});

test('existing pending deduction explicitly confirms in editor, keeping ID, date and amount', () => {
  const pending = { id: 'deduction25', employeeId: 'dina', venueId: '3389', type: 'other_deduction', date: '2026-09-30', amount: 25, confirmationStatus: 'pending', createdAt: '2026-10-11' };
  const app = runtime(); let saved;
  const props = { month: '2026-09', employees: [{ id: 'dina' }], initial: pending, onSave: row => { saved = row; } };
  let tree = app.render('bdPayrollEntrySheet', props);
  find(tree, n => n.children === 'Сохранить операцию').onClick();
  assert.equal(saved.confirmationStatus, 'pending');
  assert.equal(app.context.bdPayrollApplyLedger(3650, [saved, { type: 'payment', amount: 300 }]).balance, 3350);
  find(tree, n => n['aria-label'] === 'Подтвердить удержание').onChange({ target: { checked: true } });
  tree = app.render('bdPayrollEntrySheet', props);
  find(tree, n => n.children === 'Сохранить и подтвердить удержание').onClick();
  assert.equal(saved.confirmationStatus, 'confirmed');
  for (const key of ['id', 'employeeId', 'date', 'amount', 'createdAt']) assert.equal(saved[key], pending[key]);
  const ledger = runtime([pending, { ...pending, id: 'other-venue', venueId: '9999' }]);
  ledger.render('bdUsePayrollLedger', { venueId: '3389' }).upsertEntry(saved);
  assert.equal(ledger.saved.length, 2, 'updates existing ID, preserves other venue, no duplicate');
  assert.equal(ledger.saved.find(row => row.id === 'other-venue').confirmationStatus, 'pending');
  const result = app.context.bdPayrollApplyLedger(3650, [saved, { type: 'payment', amount: 300 }]);
  assert.equal(result.deductions, 25); assert.equal(result.otherDeduction, 25); assert.equal(result.balance, 3325);
  assert.equal(app.context.bdPayrollApplyLedger(3650, [saved, { type: 'payment', amount: 300 }, { type: 'bonus', amount: 100 }]).balance, 3425);
});

test('all deduction categories retain pending exclusion, confirmed and legacy inclusion', () => {
  const app = runtime();
  for (const type of types) {
    for (const status of ['pending', 'rejected']) assert.equal(app.context.bdPayrollEntryTotals([{ type, amount: 25, confirmationStatus: status }]).deductions, 0);
    for (const status of ['confirmed', undefined]) assert.equal(app.context.bdPayrollEntryTotals([{ type, amount: 25, confirmationStatus: status }]).deductions, 25);
  }
});

test('editing an unconfirmed or rejected entry without confirmation preserves its status', () => {
  for (const confirmationStatus of ['pending', 'rejected']) {
    const app = runtime(); let saved;
    const props = { employees: [{ id: 'dina' }], initial: { id: 'same', employeeId: 'dina', type: 'other_deduction', amount: 25, date: '2026-09-30', confirmationStatus }, onSave: row => { saved = row; } };
    let tree = app.render('bdPayrollEntrySheet', props);
    find(tree, n => n['aria-label'] === 'Комментарий к зарплатной операции').onChange({ target: { value: 'Updated note' } });
    tree = app.render('bdPayrollEntrySheet', props);
    find(tree, n => n.children === 'Сохранить операцию').onClick();
    assert.equal(saved.confirmationStatus, confirmationStatus);
    assert.equal(saved.note, 'Updated note');
  }
});

test('new deduction stays unconfirmed by default; edit cancellation performs no save; pending rows explain exclusion', () => {
  const app = runtime(); let saves = 0;
  let tree = app.render('bdPayrollEntrySheet', { month: '2026-09', employees: [{ id: 'dina' }], onSave: () => saves++, onClose() {} });
  find(tree, n => n['aria-label'] === 'Тип зарплатной операции').onChange({ target: { value: 'other_deduction' } });
  tree = app.render('bdPayrollEntrySheet', { month: '2026-09', employees: [{ id: 'dina' }], onSave: () => saves++, onClose() {} });
  assert.equal(find(tree, n => n['aria-label'] === 'Подтвердить удержание').checked, false);
  find(tree, n => n['aria-label'] === 'Закрыть форму').onClick(); assert.equal(saves, 0);
  const row = app.render('bdPayrollLedgerRow', { entry: { type: 'other_deduction', amount: 25, confirmationStatus: 'pending' } });
  assert.ok(find(row, n => typeof n.children === 'string' && n.children.includes('не учтено в удержаниях')));
});
