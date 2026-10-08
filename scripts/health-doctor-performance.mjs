import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { lifecycleRuntime } from '../tests/helpers/lifecycle-runtime.ts';
import { HEALTH_OPERATIONS_KEYS } from '../lib/bardoctor/health-operations-inputs.ts';
import { VENUE_CONTEXT_SOURCES } from '../lib/bardoctor/venue-context-access.ts';
const HEALTH_INPUT_KEYS = [...new Set([...HEALTH_OPERATIONS_KEYS, ...Object.values(VENUE_CONTEXT_SOURCES).flat(), 'bd_tasks', 'bd_action_tasks', 'bd_decisions'])];
const baseline = process.env.BD_HEALTH_PERF_BASELINE;
const size = Number(process.env.BD_HEALTH_PERF_ROWS ?? 5000);
// Isolated SQLite and actual handlers; baseline substitution is confined to
// the two pure read projection modules. No production requests or data writes.
const plugins = [{ name: 'isolated-stage-timings', setup(build) {
  build.onLoad({ filter: /lib\/bardoctor\/(auth|canonical-health-inputs|curated-doctor|request-observability)\.ts$/ }, args => {
    let contents = readFileSync(args.path, 'utf8');
    const names = { 'auth.ts': ['authenticateReadOnlyRequest', 'auth.total'], 'canonical-health-inputs.ts': ['loadCanonicalHealthInputs', 'canonical.total'], 'curated-doctor.ts': ['buildCuratedAnswer', 'answer.total'] };
    const entry = names[args.path.split('/').at(-1)];
    if (entry) {
      const [name, stage] = entry;
      contents = contents.replace(`export async function ${name}(`, `async function ${name}Measured(`);
      contents += `\nexport async function ${name}(...args: Parameters<typeof ${name}Measured>){const started=performance.now();try{return await ${name}Measured(...args)}finally{globalThis.__bdPerf?.('${stage}',performance.now()-started)}}`;
    } else {
      contents = contents.replace('if (!c) return await operation();', "if (!c) {const started=performance.now();try{return await operation()}finally{globalThis.__bdPerf?.(stage,performance.now()-started)}}");
      contents = contents.replace('if (!contexts.getStore()) return database;', '');
    }
    return { contents, loader: 'ts' };
  });
} }, ...(baseline ? [{ name: 'baseline-read-projections', setup(build) {
  build.onLoad({ filter: /lib\/bardoctor\/(operational-day|finance-inputs)\.ts$/ }, args => ({
    contents: execFileSync('git', ['show', `${baseline}:lib/bardoctor/${args.path.split('/').at(-1)}`], { encoding: 'utf8' }),
    loader: 'ts',
  }));
} }] : [])];
const r = await lifecycleRuntime({ health: './app/api/business-health/route', curated: './app/api/ai/[action]/route' }, { plugins, now: '2026-10-03T12:00:00Z' });
try {
  const user = await r.register('perf@isolated.test'), venue = user.activeVenueId;
  const account = r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(venue).data_account_id;
  const seed = (key, data) => r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(account, key, JSON.stringify(data), '2026-10-03T12:00:00Z');
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({ name: 'Isolated performance QA', currency: 'MDL', timezone: 'UTC' }), account);
  for (const key of HEALTH_INPUT_KEYS) seed(key, key === 'bd_assortment_v1' ? { menuItems: [], recipes: [], nomenclature: [], stockBalances: [] } : []);
  const rows = Array.from({ length: size }, (_, i) => ({ id: 'p' + i, venueId: venue, date: new Date(Date.UTC(2012, 0, 1 + i)).toISOString().slice(0, 10), revenue: 100, receipts: 5, closingStatus: 'closed', closedVia: 'guided-v17', currency: 'MDL', payrollBreakdown: { total: 20 }, guests: 5 }));
  seed('bd_finance_revenue', rows); seed('bd_operational_reports_v1', rows);
  let revision;
  for (const path of ['/api/business-health', '/api/ai/curated?question=attention&venueId=' + venue]) {
    const spans = [];
    globalThis.__bdPerf = (stage, durationMs) => spans.push({ stage, durationMs });
    const request = r.request(user, path); request.headers.set('X-Venue-Id', String(venue));
    const start = performance.now(), response = path.includes('curated') ? await r.api.curated.GET(request, { params: Promise.resolve({ action: 'curated' }) }) : await r.api.health.GET(request);
    const headersMs = performance.now() - start, value = await response.json();
    assert.equal(response.status, 200);
    if (!baseline) assert.ok(headersMs < 20000, 'isolated canonical read exceeded 20s budget');
    const inputRevision = value.data?.businessHealthSnapshot?.inputRevision ?? value.data?.inputRevision;
    if (revision) assert.equal(inputRevision, revision); else revision = inputRevision;
    console.log(JSON.stringify({ mode: baseline ? 'baseline' : 'candidate', rows: size, path, status: response.status,
      totalMs: performance.now() - start, headersMs, inputRevision,
      bytes: JSON.stringify(value).length, answer: value.data?.answer, spans }));
  }
} finally { delete globalThis.__bdPerf; r.close(); }
