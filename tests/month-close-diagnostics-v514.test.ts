import test from 'node:test';
import assert from 'node:assert/strict';
import { monthCloseReasonDetails } from '../lib/bardoctor/month-close-diagnostics';
import { closingFixture } from './helpers/month-close-fixture';

test('diagnostic scope references identify account-local source, not foreign ownership values or payload', () => {
  const result = monthCloseReasonDetails({ reasons: ['NESTED_INPUT_SCOPE_MISMATCH'], scope: { venueId: 901, workspaceId: 10, dataAccountId: 20 }, monthKey: '2026-09', payrollByDay: [], days: [], excluded: [], stores: {
    bd_payroll_entries: [
      { id: 'legacy-bonus', venueId: 'old-other-name', date: '2026-08-30', amount: 100, note: 'PRIVATE NOTE' },
      { id: 'FOREIGN SECRET ID', venueId: 902, date: '2026-08-30', amount: 9000 },
      { id: 'nested', venueId: 901, date: '2026-09-12', evidence: { workspaceId: 9999, secret: 'PRIVATE BODY' } },
    ],
  } });
  assert.equal(result.reasonDetails.length, 3);
  assert.equal(result.reasonDetails[0].recordId, 'legacy-bonus');
  assert.equal(result.reasonDetails[0].scopeKind, 'legacy_text');
  assert.equal(result.reasonDetails[0].outsidePeriod, true);
  assert.equal(result.reasonDetails[1].recordId, null); assert.equal(result.reasonDetails[1].date, null);
  assert.equal(result.reasonDetails[2].recordId, 'nested'); assert.equal(result.reasonDetails[2].scopeField, 'workspaceId');
  const serialized = JSON.stringify(result);
  for (const secret of ['old-other-name', 'PRIVATE NOTE', 'FOREIGN SECRET ID', 'PRIVATE BODY', '9999', '9000']) assert.equal(serialized.includes(secret), false);
});

test('missing payroll and non-final revenue expose the affected business day and safe UI links', () => {
  const result = monthCloseReasonDetails({ reasons: ['PAYROLL', 'REVENUE_NOT_FINAL', 'INVENTORY_BOUNDARY_UNKNOWN'], scope: { venueId: 901, workspaceId: 10, dataAccountId: 20 }, monthKey: '2026-09', stores: {}, excluded: [], payrollByDay: [{ businessDate: '2026-09-12', amount: null }], days: [{ businessDate: '2026-09-12', revenue: { status: 'PROVISIONAL' } }] });
  assert.deepEqual(result.reasonDetails.map(value => value.code), ['PAYROLL', 'REVENUE_NOT_FINAL', 'INVENTORY_BOUNDARY_UNKNOWN']);
  assert.equal(result.reasonDetails[0].href, '/shifts?month=2026-09&workday=2026-09-12');
  assert.equal(result.reasonDetails[2].href, '/warehouse');
});

test('authorized month-close GET diagnoses nested scope while keeping finality gates and stores unchanged', async () => {
  const r = await closingFixture();
  try {
    r.seed('bd_payroll_entries', [{ id: 'scope-problem', venueId: r.venueId, date: '2026-09-02', type: 'bonus', amount: 10, currency: 'MDL', evidence: { workspaceId: 99999, privateBody: 'DONT DISCLOSE' } }]);
    const before = JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id, store_key').all());
    const response = await r.get(); assert.equal(response.status, 200);
    const body = await response.json() as unknown as { reasons: string[]; eligible: boolean; reasonDetails: { code: string; sourceKey: string; recordId: string; date: string; scopeField: string }[]; report: { finalProfit: unknown } };
    assert.ok(body.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH')); assert.equal(body.eligible, false); assert.equal(body.report.finalProfit, null);
    const diagnostic = body.reasonDetails.find(value => value.code === 'NESTED_INPUT_SCOPE_MISMATCH')!;
    assert.equal(diagnostic.sourceKey, 'bd_payroll_entries'); assert.equal(diagnostic.recordId, 'scope-problem'); assert.equal(diagnostic.scopeField, 'workspaceId');
    assert.equal(JSON.stringify(body.reasonDetails).includes('99999'), false); assert.equal(JSON.stringify(body.reasonDetails).includes('DONT DISCLOSE'), false);
    assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id, store_key').all()), before);
  } finally { r.close(); }
});
