import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalDay, operationalDays, type OperationalDayInput } from '../lib/bardoctor/operational-day';
import { scopedBusinessRows, businessRecord } from '../lib/bardoctor/business-day-rows';
import { canonicalReadScheduler, readCanonicalJson } from '../lib/bardoctor/client/canonical-read';

test('partitioned history preserves complete projections, global duplicate winners and foreign scope', () => {
  for (let sample = 0; sample < 40; sample++) {
    const observations = Array.from({ length: 60 }, (_, i) => ({ id: i % 13, venueId: i % 7 === 0 ? 2 : 1,
      workspaceId: i % 11 === 0 ? 2 : 1, dataAccountId: 1,
      date: `2026-09-${String(1 + (i + sample) % 28).padStart(2, '0')}`,
      businessDate: i % 5 === 0 ? '2026-10-01' : undefined,
      revenue: i, currency: 'MDL', receipts: i % 5, guests: 2,
      status: ['POSTED', 'REVERSED', 'confirmed', 'draft'][i % 4],
      source: 'POS_API', revenueSource: i % 3 ? 'sales_events_v1' : 'MANUAL_SUMMARY',
      closingStatus: i % 2 ? 'open' : 'closed', closedVia: 'guided-v17', payrollBreakdown: { total: i },
    }));
    const input: Omit<OperationalDayInput, 'businessDate'> = { venueId: 1, workspaceId: 1, dataAccountId: 1,
      currency: 'MDL', asOf: '2026-10-08', revenues: [...observations, { date: '2026-10-02', revenue: 0 }],
      reports: observations, events: observations, documents: observations, writeOffs: observations,
      incidents: [...observations, { eventDate: '2026-10-02T12:00:00Z', status: 'open' }],
    };
    const before = JSON.stringify(input);
    const dates = new Set([...(input.revenues ?? []), ...(input.reports ?? []), ...(input.events ?? []), ...(input.documents ?? [])]
      .map(businessRecord).filter(row => scopedBusinessRows([row], { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId }).length > 0)
      .map(row => String(row.businessDate ?? row.date)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)));
    const expected = [...dates].sort().reverse().map(businessDate => operationalDay({ ...input, businessDate }));
    assert.deepEqual(operationalDays(input), expected);
    assert.equal(JSON.stringify(input), before, 'read must not mutate facts');
  }
});

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
const flush = async () => { await new Promise<void>(done => setImmediate(done)); };

test('bootstrap write burst has one active read and one follow-up; focus is coalesced', async () => {
  const reads: ReturnType<typeof deferred>[] = [];
  const scheduler = canonicalReadScheduler(() => { const d = deferred(); reads.push(d); return d.promise; });
  scheduler.start();
  for (let i = 0; i < 35; i++) scheduler.notify(new Event('bd:store-updated'));
  scheduler.notify(new Event('focus'));
  assert.equal(reads.length, 1);
  reads[0].resolve(); await flush(); assert.equal(reads.length, 2);
  scheduler.notify(new Event('focus')); reads[1].resolve(); await flush(); assert.equal(reads.length, 2);
  scheduler.notify(new Event('focus')); assert.equal(reads.length, 3);
  scheduler.notify(new Event('bd:shift-closed')); scheduler.dispose(); reads[2].resolve(); await flush();
  assert.equal(reads.length, 3, 'disposed scope cannot reread');
});

test('timeout bounds both a stalled fetch and a stalled response body; cancellation aborts transport', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; t.mock.timers.reset(); });
  for (const bodyStalled of [false, true]) {
    let signal: AbortSignal | undefined;
    globalThis.fetch = async (_path, options) => { signal = options?.signal ?? undefined;
      return bodyStalled ? { json: () => new Promise(() => undefined) } as Response : new Promise(() => undefined); };
    const read = readCanonicalJson('/api/business-health', {});
    const rejected = assert.rejects(read, /Сервер не ответил вовремя/);
    await Promise.resolve(); t.mock.timers.tick(15000); await rejected;
    assert.equal(signal?.aborted, true);
  }
  const controller = new AbortController(), pending = readCanonicalJson('/api/ai/curated', {}, controller.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' }); controller.abort(); await rejected;
});

test('canonical transport preserves auth, no-store, status and errors without sharing tenant data', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  const headers = new Headers({ 'X-Venue-Id': '2', 'X-Session-Token': 'isolated-only' });
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/api/ai/curated?question=stock&venueId=2');
    assert.equal(options?.cache, 'no-store'); assert.equal(options?.headers, headers);
    return Response.json({ success: false, error: 'restricted' }, { status: 403 });
  };
  const result = await readCanonicalJson<{success: boolean}>('/api/ai/curated?question=stock&venueId=2', headers);
  assert.equal(result.response.status, 403); assert.equal(result.value.success, false);
});
