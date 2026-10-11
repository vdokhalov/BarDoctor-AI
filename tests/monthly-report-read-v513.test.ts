import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { closingFixture } from './helpers/month-close-fixture';
import { patchMonthlyReportV513 } from '../scripts/patch-monthly-report-v513.mjs';

const fragment = readFileSync(new URL('../scripts/fragments/monthly-report-v165.fragment.txt', import.meta.url), 'utf8');
const helpers = fragment.slice(fragment.indexOf('async function bdFetchMonthlyReportV513'), fragment.indexOf('function bdUseMonthlyReportV513'));
const closedFields = readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8').match(/function bdMonthlyClosedFieldsPhase7[^\n]+/)![0];
const client = (fetch: typeof globalThis.fetch) => {
  const context = vm.createContext({ fetch, AbortController, Error, Number, encodeURIComponent, bdMonthMeta: (key: string) => ({ key }) });
  vm.runInContext(closedFields + '\n' + helpers, context);
  return context;
};

test('normal report reads authorized server COGS despite excluded raw bootstrap and unknown boundaries; GET writes nothing', async () => {
  const r = await closingFixture();
  try {
    r.seed('bd_inventory_snapshots', []);
    const before = JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id, store_key').all());
    const bulk = await r.api.bulkStore.GET(r.request(r.user, '/api/store'));
    const bootstrap = await bulk.json() as { entries: Record<string, unknown> };
    assert.equal(bootstrap.entries.bd_sales_events_v1, undefined);
    const c = client(async (url, options) => {
      assert.equal(options?.method, 'GET');
      return r.api.closing.GET(r.request(r.user, String(url)));
    });
    const value = await c.bdFetchMonthlyReportV513(r.venueId, '2026-09');
    assert.equal(value.report.costOfGoods, 720);
    assert.equal(value.report.grossProfit, 480);
    assert.equal(value.report.shiftEstimates.find((day: { date: string }) => day.date === '2026-09-02').estimatedCost, 720);
    assert.equal(value.report.finalProfit, null);
    assert.equal(value.report.operatingResult, null);
    assert.ok(value.reasons.includes('INVENTORY_BOUNDARY_UNKNOWN'));
    assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id, store_key').all()), before);
    r.seed('bd_sales_events_v1', []);
    const missing = await c.bdFetchMonthlyReportV513(r.venueId, '2026-09');
    assert.equal(missing.report.costOfGoods, null);
    assert.equal(missing.report.grossProfit, null);
    assert.ok(missing.reasons.includes('SALES_REVENUE_HISTORY_MISMATCH'));
  } finally { r.close(); }
});

test('server denial and scope mismatch never fall back to local figures', async () => {
  for (const body of [
    { ok: false },
    { ok: true, inputManifest: { scope: { venueId: 902 } }, report: { meta: { key: '2026-09' }, costOfGoods: 1 } },
    { ok: true, inputManifest: { scope: { venueId: 901 } }, report: { meta: { key: '2026-10' }, costOfGoods: 1 } },
  ]) {
    const c = client(async () => Response.json(body, { status: body.ok ? 200 : 403 }));
    await assert.rejects(c.bdFetchMonthlyReportV513(901, '2026-09'));
  }
});

test('legacy and invalid closed snapshots remain viewable with explicit provenance status, never recomputed', async () => {
  for (const evidenceStatus of ['LEGACY_PARTIAL', 'INVALID', 'VERIFIED']) {
    const snapshot = { meta: { key: '2026-09' }, revenue: 545, costOfGoods: 124, operatingResult: 200, isClosed: false };
    const c = client(async () => Response.json({ ok: true, closing: { venueId: 901, monthKey: '2026-09' }, evidenceStatus, report: snapshot }));
    const result = await c.bdFetchMonthlyReportV513(901, '2026-09');
    assert.equal(result.evidenceStatus, evidenceStatus);
    assert.equal(result.report.revenue, 545); assert.equal(result.report.costOfGoods, 124); assert.equal(result.report.operatingResult, 200);
    assert.equal(result.report.isClosed, true); assert.equal(result.report.payroll, null); assert.equal(result.report.sections.length, 0);
    const ui = vm.createContext({ i: { Fragment: 'fragment', jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) }, bdMoney2: (value: unknown) => String(value), sg: (value: unknown) => String(value), bdReportLine: 'line' });
    vm.runInContext(fragment, ui);
    assert.doesNotThrow(() => ui.bdMonthlyCostV165({ report: result.report }));
    const executive = ui.bdMonthlyExecutiveV165({ report: result.report });
    const shown = executive.props.children[1].props.children;
    assert.equal(shown[3].props.children[1].props.children, '—');
    assert.equal(shown[4].props.children[1].props.children, '—');
  }
});

test('superseded and disposed report requests cannot publish old venue/month data; errors clear data', async () => {
  const c = client(globalThis.fetch);
  const requests: { resolve: (value: unknown) => void; reject: (error: Error) => void; signal: AbortSignal }[] = [];
  const values: { report: unknown; error: string | null }[] = [];
  const reader = c.bdMonthlyReadControllerV513((signal: AbortSignal) => new Promise((resolve, reject) => requests.push({ resolve, reject, signal })), (value: typeof values[number]) => values.push(value));
  const first = reader.refresh(), second = reader.refresh();
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve({ report: { month: 'current' } }); await second;
  requests[0].resolve({ report: { month: 'old' } }); await first;
  assert.equal(values.length, 1);
  const third = reader.refresh(); requests[2].reject(new Error('Access revoked')); await third;
  assert.equal(values[1].report, null);
  const fourth = reader.refresh(); reader.dispose(); requests[3].resolve({ report: { month: 'old venue' } }); await fourth;
  assert.equal(values.length, 2);
});

test('Finance quick action preserves selected September in Report navigation', () => {
  const source = readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8');
  const declaration = patchMonthlyReportV513(source);
  assert.equal(patchMonthlyReportV513(declaration), declaration);
  const quick = declaration.match(/function bdFinanceQuickActionsV160[^\n]+/)![0];
  let navigation = '';
  const context = vm.createContext({ i: { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) }, Pn: '', Dn: '', eZ: '', $d: '', RA: '', encodeURIComponent });
  vm.runInContext(quick, context);
  const tree = context.bdFinanceQuickActionsV160({ navigate: (url: string) => { navigation = url; }, monthKey: '2026-09' });
  const buttons = tree.props.children[1].props.children;
  buttons.find((button: { props: { children: { props: { children: string } }[] } }) => button.props.children[1].props.children === 'Месячный отчёт').props.onClick();
  assert.equal(navigation, '/reports?month=2026-09');
});

test('monthly readiness mounts the real close launcher with September context, not a dead query-only link', () => {
  const report = { revenue: 2600, periodExpenses: 0, payroll: 200, coveragePercent: 100, periodPast: true, openingInventory: null, closingInventory: null };
  const context = vm.createContext({
    S: { useMemo: (fn: () => unknown) => fn(), useEffect: () => {}, useState: (fn: () => unknown) => [typeof fn === 'function' ? fn() : fn, () => {}] },
    i: { Fragment: 'fragment', jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) },
    bt: () => ['', () => {}], Un: () => ({ profile: {} }), Ur: () => ({ revenue: [{ date: '2026-09-12' }, { date: '2026-10-11' }], expenses: [], gapReasons: [] }),
    bdUseAccountingStore: () => ({ settings: { venueId: 901 }, snapshots: [] }), bdRecentMonthKeys: () => ['2026-10', '2026-09'], bdMonthlyVenueIdPhase7: () => 901,
    bdProcArray: () => [], window: { bdReadNavigationQuery: () => '2026-09', bdSyncNavigationQuery: () => {} },
    nt: 'layout', $e: 'container', bdAccountingHeader: 'header', bdMonthClosingLauncher: 'REAL_LAUNCHER', bdMonthDisplay: (value: string) => value,
    serverReport: report,
  });
  vm.runInContext(fragment + '\nbdUseMonthlyReportV513=()=>({report:serverReport,reasons:[]});', context);
  const tree = context.bdMonthlyReportPage();
  type TestNode = { type?: unknown; props?: { children?: unknown; closingLauncher?: unknown } };
  const find = (node: unknown): TestNode | null => {
    if (Array.isArray(node)) return node.map(find).find(Boolean) || null;
    if (!node || typeof node !== 'object') return null;
    const entry = node as TestNode;
    return entry.type === context.bdMonthlyReadinessV165 ? entry : find(entry.props?.children);
  };
  const readiness = find(tree);
  assert.ok(readiness);
  const launcher = readiness.props?.closingLauncher as { type: string; props: { monthKey: string; revenues: unknown[] } };
  assert.equal(launcher.type, 'REAL_LAUNCHER');
  assert.equal(launcher.props.monthKey, '2026-09');
  assert.equal(launcher.props.revenues.length, 1);
  const section = context.bdMonthlyReadinessV165(readiness.props);
  assert.ok(section.props.children.includes(launcher));
});
