import test from 'node:test';
import assert from 'node:assert/strict';
import { closingFixture } from './helpers/month-close-fixture';

type Row = Record<string, unknown>;
async function payrollFixture(profileKey: 'name' | 'id' = 'name') {
  const r = await closingFixture();
  const profile = JSON.parse(String(r.sqlite.prepare('SELECT restaurant_json value FROM accounts WHERE id=?').get(r.account)!.value));
  profile.name = 'QA current profile';
  if (profileKey === 'id') profile.id = 'profile-legacy-id';
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile), r.account);
  r.seed('bd_operational_reports_v1', [{ id: 'report', venueId: r.venueId, date: '2026-09-02', closingStatus: 'closed', payrollBreakdown: { total: 7450 } }]);
  // Use exact persisted editor shape; r.seed intentionally canonicalizes venueId.
  const bonus = { id: 'bonus100', employeeId: 'employee', venueId: profile[profileKey], date: '2026-09-30', amount: 100, type: 'bonus', createdAt: '2026-10-03', updatedAt: '2026-10-03' };
  const entries = (values: Row[]) => r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_payroll_entries'").run(JSON.stringify(values), r.account);
  const read = async () => { const response = await r.get(); assert.equal(response.status, 200); return await response.json() as unknown as { report: Row; reasons: string[] }; };
  const stored = () => String(r.sqlite.prepare("SELECT data_json value FROM domain_data WHERE account_id=? AND store_key='bd_payroll_entries'").get(r.account)!.value);
  return { ...r, entries, bonus, read, stored };
}

for (const profileKey of ['name', 'id'] as const) test(`monthly GET includes exact current profile ${profileKey} payroll alias without changing stored entries`, async () => {
  const r = await payrollFixture(profileKey);
  try {
    r.entries([r.bonus]); const before = r.stored(); const result = await r.read();
    assert.equal(result.report.payrollBase, 7450); assert.equal(result.report.payrollBonuses, 100); assert.equal(result.report.payroll, 7550);
    assert.ok(!result.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH')); assert.equal(r.stored(), before);
  } finally { r.close(); }
});

test('pending deduction excluded, confirmed25 reduces payable only, payment300 does not reduce FOT; October bonus not in September', async () => {
  const r = await payrollFixture();
  try {
    const deduction = { ...r.bonus, id: 'deduction25', type: 'other_deduction', amount: 25, confirmationStatus: 'pending' };
    const payment = { ...r.bonus, id: 'payment300', type: 'payment', amount: 300 };
    const octoberBonus = { ...r.bonus, id: 'october999', date: '2026-10-01', amount: 999 };
    r.entries([]); const base = await r.read(); assert.equal(typeof base.report.finalProfit, 'number');
    r.entries([r.bonus, deduction, payment, octoberBonus]);
    let result = await r.read();
    assert.equal(result.report.payroll, 7550); assert.equal(result.report.payrollBonuses, 100); assert.equal(result.report.payrollDeductions, 0); assert.equal(result.report.payrollPaid, 300);
    r.entries([r.bonus, { ...deduction, confirmationStatus: 'confirmed' }, payment, octoberBonus]);
    result = await r.read();
    assert.equal(result.report.payroll, 7550); assert.equal(result.report.payrollDeductions, 25); assert.equal(result.report.payrollNet, 7525); assert.equal(result.report.payrollPaid, 300);
    assert.equal(Number(result.report.payrollNet) - Number(result.report.payrollPaid), 7225);
    assert.equal(result.report.finalProfit, Number(base.report.finalProfit) - 100, 'bonus enters gross FOT once; deduction and payment never lower accrued FOT expense');
    const beforeRevaluation = result;
    const boundaries = JSON.parse(String(r.sqlite.prepare("SELECT data_json value FROM domain_data WHERE account_id=? AND store_key='bd_inventory_snapshots'").get(r.account)!.value)) as Row[];
    r.seed('bd_inventory_snapshots', boundaries.map(boundary => boundary.id === 'end' ? { ...boundary, total: Number(boundary.total) + 975, sections: { bar: Number(boundary.total) + 975 } } : boundary));
    result = await r.read();
    assert.equal(result.report.inventoryRevaluation, Number(beforeRevaluation.report.inventoryRevaluation) + 975);
    assert.equal(result.report.finalProfit, beforeRevaluation.report.finalProfit, '975 revaluation is not added to profit');
    assert.equal(result.report.costOfGoods, beforeRevaluation.report.costOfGoods);
  } finally { r.close(); }
});

test('matching legacy alias cannot admit foreign account, workspace or nested venue facts', async () => {
  const r = await payrollFixture();
  try {
    const workspaceId = Number(r.sqlite.prepare('SELECT workspace_id value FROM venues WHERE id=?').get(r.venueId)!.value);
    for (const foreign of [{ dataAccountId: r.account + 999 }, { workspaceId: workspaceId + 999 }, { evidence: { venueId: r.venueId + 999 } }, { evidence: { workspaceId: workspaceId + 999 } }, { evidence: { dataAccountId: r.account + 999 } }]) {
      r.entries([{ ...r.bonus, ...foreign }]); const result = await r.read();
      assert.equal(result.report.payrollBonuses, 0); assert.equal(result.report.payroll, 7450); assert.equal(result.report.finalProfit, null);
      assert.ok(result.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH'));
    }
  } finally { r.close(); }
});

test('numeric foreign venue stays foreign even when its text equals current profile name', async () => {
  const r = await payrollFixture();
  try {
    const profile = JSON.parse(String(r.sqlite.prepare('SELECT restaurant_json value FROM accounts WHERE id=?').get(r.account)!.value));
    profile.name = String(r.venueId + 999);
    r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile), r.account);
    r.entries([{ ...r.bonus, venueId: profile.name }]);
    const result = await r.read(); assert.equal(result.report.payrollBonuses, 0); assert.ok(result.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH'));
  } finally { r.close(); }
});

test('unrelated profile alias remains excluded and other stores do not inherit payroll compatibility', async () => {
  const r = await payrollFixture();
  try {
    r.entries([{ ...r.bonus, venueId: 'different profile' }]);
    let result = await r.read(); assert.equal(result.report.payrollBonuses, 0); assert.ok(result.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH'));
    r.entries([r.bonus]);
    r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_finance_expenses'").run(JSON.stringify([{ id: 'expense', venueId: r.bonus.venueId, date: '2026-09-02', amount: 30, category: 'rent' }]), r.account);
    result = await r.read(); assert.equal(result.report.payrollBonuses, 100); assert.equal(result.report.finalProfit, null); assert.ok(result.reasons.includes('NESTED_INPUT_SCOPE_MISMATCH'));
  } finally { r.close(); }
});
