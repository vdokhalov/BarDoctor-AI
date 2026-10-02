import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { nativeWorkerRuntime } from '../tests/helpers/native-worker-runtime.mjs';

const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require('./browser-runtime.cjs');
const runtime = await nativeWorkerRuntime();
await runtime.put('bd_finance_expenses', [{ id: 'existing', amount: 99, date: '2026-10-02', currency: 'MDL' }]);
await runtime.put('bd_equipment', [{ id: 'equipment', name: 'Freezer', venueId: 1 }]);
await runtime.put('bd_guest_reviews', [{ id: 'manual', source: 'manual', venueId: 1, text: 'Manual', publishedAt: '2026-10-01' }, { id: 'google', source: 'google', venueId: 1, externalId: 'external', text: 'Google', publishedAt: '2026-10-01', sourceMetadata: { googleAccountId: 'account', googleLocationId: 'A' } }]);
const server = createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), url = new URL(req.url || '/', 'http://localhost');
    const response = url.pathname.startsWith('/api/') ? await runtime.worker.dispatchFetch(url.toString(), { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) })
      : new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Phase 3A5 isolated native API QA</title>", { headers: { 'Content-Type': 'text/html' } });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end('Isolated QA failure'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const results = [];
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width === 390, hasTouch: width === 390 });
    try {
      const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto(base);
      const call = (url, method = 'GET', body, role = 'owner') => page.evaluate(async ({ url, method, body, headers }) => {
        const response = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: response.status, body: await response.json() };
      }, { url, method, body, headers: runtime.headers(role) });
      assert.equal((await call('/api/business-health')).status, 200);
      for (const [path, method, body] of [['/api/business-health', 'GET'], ['/api/ai/diagnosis', 'POST', { profile: {} }], ['/api/recommendations/check', 'POST', { recommendations: [{}] }]]) {
        const response = await call(path, method, body, 'manager'); assert.equal(response.status, 403); assert.equal(response.body.availability, 'RESTRICTED');
      }
      assert.equal((await call('/api/review-layer/reviews', 'POST', { source: 'google', externalId: 'external', text: 'Updated Google', publishedAt: '2026-10-01', sourceMetadata: { googleAccountId: 'account', googleLocationId: 'A' } })).status, 200);
      assert.equal((await runtime.get('bd_guest_reviews')).find(review => review.id === 'manual').text, 'Manual');
      assert.equal((await runtime.get('bd_guest_reviews')).find(review => review.id === 'google').text, 'Updated Google');
      const workOrder = { id: 'browser-wo', equipmentId: 'equipment', kind: 'maintenance', status: 'detected', title: 'QA', cost: 20, costDate: '2026-10-02' };
      assert.ok((await call('/api/equipment/work-orders', 'POST', { workOrder, syncExpense: true })).status < 300);
      assert.equal((await call('/api/equipment/work-orders', 'POST', { workOrder: { ...workOrder, cost: 30 }, syncExpense: false })).status, 409);
      assert.equal((await runtime.get('bd_finance_expenses')).filter(expense => expense.equipmentWorkOrderId === 'browser-wo').length, 1);
      const foreign = await page.evaluate(async auth => (await fetch('/api/business-health', { headers: { ...auth, 'X-Venue-Id': '999999' } })).status, runtime.headers('owner')); assert.equal(foreign, 401);
      assert.deepEqual(errors, []); assert.equal(runtime.outbound(), 0);
      results.push({ width, compiledWorker: true, nativeD1: true, sourcePermissions: 'PASS', mixedReviews: 'PASS', equipmentFinance: 'PASS', foreignVenue: 'PASS', externalCalls: 0 });
    } finally { await context.close(); }
  }
  mkdirSync('outputs/canonical-boundary-phase3a5', { recursive: true }); writeFileSync('outputs/canonical-boundary-phase3a5/browser.json', JSON.stringify(results, null, 2)); console.info(JSON.stringify(results));
} finally { await browser.close(); await new Promise(done => server.close(done)); await runtime.close(); }
