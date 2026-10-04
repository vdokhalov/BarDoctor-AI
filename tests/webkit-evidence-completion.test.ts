import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BrowserContext, Page } from 'playwright-core';
import { closingFixture } from './helpers/month-close-fixture';
import { canonicalSnapshot, safeHeaders, WebKitEvidenceCompletion } from '../scripts/qa/webkit-evidence-completion';
import { prepareEvidenceSource } from '../scripts/qa/prepare-webkit-evidence-source.mjs';

test('Diagnostic source preserves every original suite byte, assertion, action and timeout', () => {
  const source = readFileSync('scripts/derived-metrics-phase3a8-browser.ts', 'utf8');
  const prepared = prepareEvidenceSource(source);
  assert.equal(prepared.byteForByteRecovered, true);
  assert.equal(prepared.insertions, 12);
  assert.equal(prepared.output.replace(/\/\*BD_EVIDENCE_START\*\/[\s\S]*?\/\*BD_EVIDENCE_END\*\//g, ''), source);
});

test('Diagnostic instrumentation fails closed when the source anchor changes', () => {
  const source = readFileSync('scripts/derived-metrics-phase3a8-browser.ts', 'utf8');
  assert.throws(() => prepareEvidenceSource(source.replace('r.close();}', 'r.close()}')), /exactly once/);
  assert.throws(() => prepareEvidenceSource(source + '\nr.close();}'), /exactly once/);
});

test('QA database snapshots leave missing stores, canonical bytes, timestamps and audit unchanged', async () => {
  const r = await closingFixture();
  try {
    const missing = () => r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='bd_qa_missing_store'").get()!.n;
    assert.equal(missing(), 0);
    const before = canonicalSnapshot(r.sqlite);
    assert.ok(!JSON.stringify(before).includes(r.user.token));
    assert.deepEqual(canonicalSnapshot(r.sqlite), before);
    assert.deepEqual(canonicalSnapshot(r.sqlite), before);
    assert.equal(missing(), 0);
    assert.ok(before.domain.length > 0);
    assert.equal(before.hashes.audit_log.count, before.audit.length);
    // Snapshot evidence must detect a real isolated canonical/audit mutation.
    r.seed('bd_finance_expenses', [{ id: 'changed-qa', amount: 41 }]);
    const changed = canonicalSnapshot(r.sqlite);
    assert.notEqual(changed.canonicalSha256, before.canonicalSha256);
    assert.notEqual(changed.hashes.domain_data.sha256, before.hashes.domain_data.sha256);
    assert.equal(changed.auditSha256, before.auditSha256);
    r.sqlite.prepare("INSERT INTO audit_log(account_id,store_key,action,actor_name,actor_role,created_at) VALUES(?,?,?,?,?,?)")
      .run(r.account, 'bd_finance_expenses', 'qa', 'Test', 'owner', '2026-10-03T12:00:00Z');
    assert.notEqual(canonicalSnapshot(r.sqlite).auditSha256, before.auditSha256);
  } finally { r.close(); }
});

test('Headers record actual auth presence and names while excluding credential values', () => {
  const headers = new Headers({ 'X-Session-Email': 'private-qa-email', 'X-Session-Token': 'private-qa-token', 'Cookie': 'bd_server_session=private-qa-cookie', 'X-Venue-Id': '4' });
  const recorded = safeHeaders(headers);
  assert.deepEqual(recorded.auth, { email: true, token: true, cookie: true });
  assert.ok(!JSON.stringify(recorded).includes('private-qa-'));
  assert.deepEqual(safeHeaders(new Headers()).auth, { email: false, token: false, cookie: false });
});


test('Post-crash network error stays a recorded network error and never becomes a fabricated 401', async () => {
  const r = await closingFixture(), dir = mkdtempSync(join(tmpdir(), 'webkit-evidence-control-'));
  const original = { journal: process.env.BD_WEBKIT_COMPLETION_JOURNAL, trace: process.env.BD_WEBKIT_PROCESS_TRACE };
  process.env.BD_WEBKIT_COMPLETION_JOURNAL = join(dir, 'journal.ndjson');
  process.env.BD_WEBKIT_PROCESS_TRACE = join(dir, 'absent-native.log');
  const before = canonicalSnapshot(r.sqlite);
  let collector: WebKitEvidenceCompletion | undefined;
  try {
    let pageCallback: ((page: Page) => void) | undefined, evaluations = 0;
    const page = { on() {}, async evaluate() {
      evaluations++;
      if (evaluations === 2) return { auth: { email: false, token: false }, error: 'TypeError: Load failed' };
      return { origin: 'http://isolated.test', documentId: 'same-document', auth: { email: false, token: false, marker: false } };
    } } as unknown as Page;
    const context = { async exposeBinding() {}, async addInitScript() {}, async cookies() { return []; },
      on(_event: string, callback: (page: Page) => void) { pageCallback = callback; } } as unknown as BrowserContext;
    collector = new WebKitEvidenceCompletion(r.sqlite);
    await collector.attach(context); pageCallback!(page); collector.bindPage(page);
    await collector.failed(new Error('original QA failure'));
    collector.close(); collector = undefined;
    const events = readFileSync(process.env.BD_WEBKIT_COMPLETION_JOURNAL, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const outcome = events.find(event => event.type === 'diagnostic-read-result');
    assert.deepEqual(outcome.result, { auth: { email: false, token: false }, error: 'TypeError: Load failed' });
    assert.equal(outcome.result.status, undefined);
    assert.equal(events.filter(event => event.type === 'page-created').length, 1);
    assert.equal(events.find(event => event.type === 'collector-complete').pageCount, 1);
    assert.deepEqual(canonicalSnapshot(r.sqlite), before);
    assert.equal(events.some(event => event.type === 'server-response' && event.status === 401), false);
  } finally {
    collector?.close(); r.close(); rmSync(dir, { recursive: true, force: true });
    for (const [key, value] of [['BD_WEBKIT_COMPLETION_JOURNAL', original.journal], ['BD_WEBKIT_PROCESS_TRACE', original.trace]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
