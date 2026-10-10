import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function fixture(chosen = 'A') {
  const text = readFileSync('public/cashier.js', 'utf8');
  const source = text.slice(text.indexOf('  function assertQuickShift('), text.indexOf('  function showReceipt('));
  const quick = { id: 'quick-A', shiftId: 'A', comment: 'draft-A', lines: [{ id: 'line-A', menuItemId: 'beer', quantity: 2 }] };
  const state = { frozen: false, quick, data: {}, orderId: null, view: 'cashier' };
  const calls: { path: string; body: { action: string; command?: typeof quick } }[] = [];
  let selected = chosen, submit: (form: Map<string, string>) => Promise<void>, duringPreview = false;
  const context = vm.createContext({ state, Error, String,
    shift: () => ({ id: selected }), selectedOrder: () => null, quickTotal: () => 40,
    clearSensitive: () => { state.frozen = true; }, money: (v: unknown) => String(v), esc: (v: unknown) => String(v),
    uuid: () => 'payment', notice: () => {}, render: () => {},
    dialog: (_title: string, _content: string, callback: typeof submit) => { submit = callback; },
    request: async (path: string, body: typeof calls[number]['body']) => { calls.push({ path, body }); if (duringPreview) selected = 'B'; return { previewHash: 'verified' }; },
    mutate: async (path: string, body: typeof calls[number]['body']) => { calls.push({ path, body }); return { duplicate: false }; },
  });
  vm.runInContext(source, context);
  return { state, calls, open: () => context.showPayment() as Promise<void>, pay: () => submit(new Map([['method', 'CASH']])), select: (id: string) => { selected = id; }, switchDuringPreview: () => { duringPreview = true; } };
}

test('a quick draft cannot open payment in another selected shift', async () => {
  const f = fixture('B'); await assert.rejects(f.open(), /Смена черновика/);
  assert.equal(f.state.frozen, true); assert.equal(f.calls.length, 0);
  assert.equal(f.state.quick.id, 'quick-A'); assert.equal(f.state.quick.lines[0].quantity, 2);
});
test('selection changed after opening payment cannot send preview or post', async () => {
  const f = fixture(); await f.open(); f.select('B'); await assert.rejects(f.pay(), /Смена черновика/);
  assert.equal(f.state.frozen, true); assert.equal(f.calls.length, 0);
});
test('selection changed during preview blocks the financial write', async () => {
  const f = fixture(); await f.open(); f.switchDuringPreview(); await assert.rejects(f.pay(), /Смена черновика/);
  assert.equal(f.state.frozen, true); assert.deepEqual(f.calls.map(c => c.body.action), ['preview']);
});
test('unchanged selection preserves the original draft identity, shift and lines through payment', async () => {
  const f = fixture(); await f.open(); await f.pay();
  assert.deepEqual(f.calls.map(c => c.body.action), ['preview', 'post']);
  for (const { body } of f.calls) { assert.equal(body.command?.id, 'quick-A'); assert.equal(body.command?.shiftId, 'A'); assert.equal(body.command?.comment, 'draft-A'); assert.equal(body.command?.lines[0].quantity, 2); }
});

for (const open of [true, false]) test(`legacy draft restoration retains its original shift (${open ? 'open' : 'closed'})`, async () => {
  const text = readFileSync('public/cashier.js', 'utf8');
  const source = text.slice(text.indexOf('  async function handleAction('), text.indexOf('  document.addEventListener("click"'));
  const key = 'bd_pos_draft_v1:1:2:A', selectionKey = 'bd_pos_shift_v1:1:2';
  const draft = { id: 'legacy-A', lines: [{ menuItemId: 'beer', quantity: 2 }], comment: 'original-A' };
  const stored = new Map([[key, JSON.stringify(draft)], [selectionKey, 'B']]);
  const state = { quick: { lines: [] } as { lines: unknown[]; shiftId?: string; id?: string }, legacy: { key, draft, storage: 'local' } as unknown, data: { shifts: [{ id: 'A', closingStatus: open ? 'open' : 'closed' }, { id: 'B', closingStatus: 'open' }] } };
  const context = vm.createContext({ state, Error, decodeURIComponent,
    shiftSelectionKey: () => selectionKey,
    localStorage: { setItem: (k: string, v: string) => stored.set(k, v), removeItem: (k: string) => stored.delete(k) },
    saveLocal: () => stored.set('workspace', JSON.stringify(state.quick)), render: () => {}, notice: () => {},
  });
  vm.runInContext(source, context);
  if (open) {
    await context.handleAction('legacy'); assert.equal(state.quick.shiftId, 'A'); assert.equal(state.quick.id, 'legacy-A'); assert.equal(stored.get(selectionKey), 'A'); assert.equal(stored.has(key), false);
  } else {
    await assert.rejects(context.handleAction('legacy'), /Исходная смена/); assert.equal(stored.get(selectionKey), 'B'); assert.equal(stored.get(key), JSON.stringify(draft)); assert.equal(stored.has('workspace'), false);
  }
});
