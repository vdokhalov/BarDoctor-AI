import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright-core';
import { recoveryRuntime } from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require = createRequire(import.meta.url), { resolveBrowserExecutable } = require('./browser-runtime.cjs');
const engine = process.env.BD_CURATED_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const baseline = process.env.BD_HEALTH_PERF_CLIENT_BASELINE;
const out = `outputs/health-doctor-performance/${baseline ? 'baseline-' : ''}${engine}`;
mkdirSync(out, { recursive: true });
let root = process.cwd();
if (baseline) {
  root = mkdtempSync(tmpdir() + '/health-client-baseline-');
  execFileSync('tar', ['-x', '-C', root], { input: execFileSync('git', ['archive', baseline, 'public', 'app/bar-doctor-response.ts', 'lib/bardoctor/version.ts', 'lib/bardoctor/app-shell.ts'], { maxBuffer: 128 * 1024 * 1024 }) });
}
const browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const results = [];
try { for (const width of [390, 820, 1280]) {
  const r = await recoveryRuntime(root), context = await browser.newContext({ viewport: { width, height: 900 } });
  let mode = 'normal', delay = 0;
  const calls = [], timings = [], errors = [];
  await context.addInitScript(({ user, venue }) => {
    localStorage.setItem('bd_session', user.email); localStorage.setItem('bd_session_token', user.token); localStorage.setItem('bd_active_venue_id', String(venue));
  }, { user: r.fixture.user, venue: r.fixture.venueId });
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/ai/curated' || path === '/api/business-health') {
      calls.push({ path, started: Date.now() });
      if (mode === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Isolated slow-server QA' }) });
      if (mode === 'stalled') return; // Deliberate missing response, local QA only.
      if (delay) await new Promise(done => setTimeout(done, delay));
    }
    await route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const panel = page.locator('[data-curated-venue]');
  try {
    for (const attempt of ['first', 'repeat']) {
      const from = calls.length, started = Date.now();
      await page.goto(r.base + '/health');
      await page.locator('[data-management-id]').first().waitFor({ timeout: 30000 });
      await page.waitForLoadState('networkidle');
      timings.push({ surface: 'health', attempt, visibleMs: Date.now() - started, healthReads: calls.slice(from).filter(c => c.path === '/api/business-health').length });
    }
    const from = calls.length;
    await page.goto(r.base + '/analysis'); await panel.locator('[data-curated-question]').first().waitFor(); await page.waitForLoadState('networkidle');
    const hiddenReads = calls.slice(from).filter(c => c.path === '/api/ai/curated').length;
    if (!baseline) assert.equal(hiddenReads, 0, 'question list must not compute a hidden answer');
    for (const q of ['attention', 'next', 'cost', 'stock', 'shifts', 'expenses', 'tasks']) {
      const started = Date.now(); await panel.locator(`[data-curated-question=${q}]`).click(); await panel.locator(`[data-curated-answer=${q}]`).waitFor();
      timings.push({ surface: 'doctor', question: q, attempt: 'first', visibleMs: Date.now() - started });
    }
    const revision = await panel.locator('[data-curated-answer]').getAttribute('data-curated-revision');
    let started = Date.now(); await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click();
    await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('.bd-curated-doctor button[disabled]'));
    assert.equal(await panel.locator('[data-curated-answer]').getAttribute('data-curated-revision'), revision);
    timings.push({ surface: 'doctor', question: 'tasks', attempt: 'refresh', visibleMs: Date.now() - started });
    if (!baseline) {
      delay = 600;
      const from = calls.length;
      await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click();
      await panel.getByRole('status').waitFor();
      await page.evaluate(() => { for (let n = 0; n < 35; n++) window.dispatchEvent(new Event('bd:store-updated')); window.dispatchEvent(new Event('focus')); });
      await page.waitForLoadState('networkidle'); await panel.locator('[data-curated-answer=tasks]').waitFor();
      assert.equal(calls.slice(from).filter(c => c.path === '/api/ai/curated').length, 2, 'one initial read and one post-write reread');
      delay = 0; mode = 'error';
      await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click(); await panel.getByRole('alert').waitFor();
      assert.equal(await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).isEnabled(), true);
      mode = 'normal'; await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click(); await panel.locator('[data-curated-answer=tasks]').waitFor();
      mode = 'stalled'; started = Date.now();
      await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click();
      await panel.getByRole('alert').filter({ hasText: 'Сервер не ответил вовремя' }).waitFor({ timeout: 20000 });
      assert.equal(await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).isEnabled(), true);
      timings.push({ surface: 'doctor', attempt: 'timeout', visibleMs: Date.now() - started });
      mode = 'normal'; await page.goto(r.base + '/analysis?venueId=' + r.fixture.venueId + '&doctorQuestion=tasks'); await panel.locator('[data-curated-answer=tasks]').waitFor();
      // UNKNOWN/partial data stays honest, with no invented facts or success.
      r.fixture.sqlite.prepare('DELETE FROM domain_data WHERE account_id=?').run(r.fixture.account);
      await panel.getByRole('button', { name: 'Обновить ответ', exact: true }).click();
      await panel.locator('[data-curated-answer=tasks]').waitFor(); await panel.getByText('Данные недоступны', { exact: true }).waitFor();
      await page.goto(r.base + '/health');
      const queue = page.locator('[data-management-venue]');
      await queue.getByText('Подтверждённых действий в очереди нет.', { exact: false }).waitFor();
      await page.waitForLoadState('networkidle');
      mode = 'error'; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await queue.getByRole('alert').waitFor();
      await page.waitForLoadState('networkidle');
      mode = 'stalled'; started = Date.now();
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await queue.getByRole('alert').filter({ hasText: 'Сервер не ответил вовремя' }).waitFor({ timeout: 20000 });
      assert.equal(await queue.getByRole('status').count(), 0, 'Health loading must terminate');
      timings.push({ surface: 'health', attempt: 'timeout', visibleMs: Date.now() - started });
    }
    assert.deepEqual(errors, []); await page.screenshot({ path: out + '/' + width + '.png', fullPage: true });
    results.push({ width, status: 'PASS', hiddenReads, timings });
  } catch (e) { await page.screenshot({ path: out + '/' + width + '-failure.png', fullPage: true }); throw e; }
  finally { await context.close(); await r.close(); }
} } finally { await browser.close(); if (baseline) rmSync(root, { recursive: true, force: true }); writeFileSync(out + '/results.json', JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results));
