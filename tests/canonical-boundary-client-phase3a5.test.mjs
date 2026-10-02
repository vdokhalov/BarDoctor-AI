import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const bundle = readFileSync('public/assets/index-BQGspy0I.js', 'utf8');
const start = bundle.indexOf('const bdCanonicalBoundaryClientPhase3a5=');
const end = bundle.indexOf('// end canonical boundary Phase3a5', start);
assert.ok(start >= 0 && end > start);

test('authorization denial invalidates only the originating tenant context; stale envelopes cannot rehydrate it', () => {
  const local = new Map([['A:bd_ai_diagnosis_v9', 'private'], ['B:bd_ai_diagnosis_v9', 'other venue']]);
  const entries = new Map([['a', { context: 'A' }], ['b', { context: 'B' }]]);
  const fixture = { entries, listeners: new Set(), current: { snapshot: { score: 70 }, diagnosis: 'private' } };
  let context = 'B', notifications = 0; fixture.listeners.add(() => notifications++);
  const sandbox = { bdBusinessHealthSharedStoreV284: fixture, bdBusinessHealthAccountContextV284: () => context, Sz: key => context + ':' + key, localStorage: { removeItem: key => local.delete(key) }, bdLiveBusinessHealthContextV335: 'B' };
  vm.createContext(sandbox); vm.runInContext(bundle.slice(start, end), sandbox);
  vm.runInContext('bdRestrictAnalysisContextPhase3a5("A")', sandbox);
  assert.equal(entries.has('a'), false); assert.equal(entries.has('b'), true); assert.equal(local.has('B:bd_ai_diagnosis_v9'), true); assert.equal(notifications, 0);
  context = 'A'; vm.runInContext('bdRestrictAnalysisContextPhase3a5()', sandbox);
  assert.equal(local.has('A:bd_ai_diagnosis_v9'), false); assert.equal(notifications, 1); assert.equal(fixture.current.snapshot, null); assert.equal(fixture.current.diagnosis, null);
  assert.equal(vm.runInContext('bdAnalysisContextRestrictedPhase3a5()', sandbox), true);
  context = 'B'; assert.equal(vm.runInContext('bdAnalysisContextRestrictedPhase3a5()', sandbox), false);
});

test('actual client hooks clear denied Health/Doctor results, preserve transient-error cache, and unblock only after successful server authorization', () => {
  assert.match(bundle, /function WS\(\)\{if\(bdAnalysisContextRestrictedPhase3a5\(\)\)return null;/);
  assert.match(bundle, /if\(r\.status===403\|\|r\.status===401\)bdRestrictAnalysisContextPhase3a5\(t\);if\(!r\.ok\|\|!a\?\.success\)throw/);
  assert.match(bundle, /bdRestrictedAnalysisContextsPhase3a5\.delete\(t\);bdBusinessHealthCommitEnvelopeV284\(a,!0\)/);
  assert.match(bundle, /if\(L\.status===403\|\|L\.status===401\)\{bdRestrictAnalysisContextPhase3a5\(\);E\(null\)\}/);
});
