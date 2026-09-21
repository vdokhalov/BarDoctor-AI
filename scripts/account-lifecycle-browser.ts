import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';
import browserRuntime from './browser-runtime.cjs';
import { lifecycleRuntime } from '../tests/helpers/lifecycle-runtime';
import { LIFECYCLE_HTML } from '../app/settings/lifecycle/route';

const r = await lifecycleRuntime();
const root = path.resolve('public'), output = path.resolve('outputs/account-lifecycle'); fs.mkdirSync(output, { recursive: true });
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/settings/lifecycle') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(LIFECYCLE_HTML); return; }
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, { method: req.method, headers: req.headers as Record<string,string>, ...(['GET','HEAD'].includes(req.method || 'GET') ? {} : { body: Buffer.concat(chunks) }) });
      const id = url.pathname.match(/^\/api\/venues\/(\d+)$/)?.[1];
      const group = id ? 'venue' : url.pathname === '/api/venues' ? 'venues' : url.pathname === '/api/users/lifecycle' ? 'account' : url.pathname === '/api/auth/bootstrap' ? 'bootstrap' : null;
      if (!group) { res.writeHead(404); res.end('{}'); return; }
      const response = await r.api[group][req.method || 'GET'](request, { params: Promise.resolve({ id }) });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    const file = path.resolve(root, '.' + (url.pathname.includes('.') ? url.pathname : '/app.html'));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' } as Record<string,string>)[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  } catch (error) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(error) })); }
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
const executablePath = process.env.BD_QA_BROWSER || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : await browserRuntime.resolveBrowserExecutable(chromium.executablePath()));
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
try {
  for (const viewport of [{ width: 1280, height: 850 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    const user = await r.register(`browser-${viewport.width}@isolated.test`), name = 'Тестовое заведение ' + viewport.width;
    r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({ name }), user.userId);
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, locale: 'ru-RU' });
    await context.addInitScript(({ user }) => {
      if (!sessionStorage.getItem('qa-seeded')) { localStorage.setItem('bd_session', user.email); localStorage.setItem('bd_session_token', user.token); localStorage.setItem('bd_active_venue_id', String(user.activeVenueId)); localStorage.setItem('bd_private_cache', 'must disappear on account deletion'); sessionStorage.setItem('qa-seeded', '1'); }
    }, { user });
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/settings/lifecycle'); await page.getByRole('button', { name: 'Архивировать', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `${viewport.width}-management.png`), fullPage: true });
    await page.getByRole('button', { name: 'Архивировать', exact: true }).click();
    await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    assert.equal(r.sqlite.prepare('SELECT status FROM venues WHERE id=?').get(user.activeVenueId)?.status, 'active');
    await page.getByRole('button', { name: 'Архивировать', exact: true }).click(); await page.locator('#confirm').click();
    await page.getByRole('button', { name: 'Восстановить', exact: true }).waitFor(); await page.reload();
    await page.getByRole('button', { name: 'Восстановить', exact: true }).click(); await page.locator('#confirm').click(); await page.getByRole('button', { name: 'Архивировать', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Удалить заведение', exact: true }).click();
    await page.getByLabel('Введите точное название: ' + name).fill(name);
    await page.screenshot({ path: path.join(output, `${viewport.width}-venue-confirmation.png`) });
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await page.getByRole('button', { name: 'Удалить мой аккаунт', exact: true }).click();
    await page.getByLabel('Удалить заведение «' + name + '»: введите его название').fill(name);
    await page.getByLabel('Текущий пароль BarDoctor').fill('wrong'); await page.getByLabel('Введите УДАЛИТЬ АККАУНТ').fill('УДАЛИТЬ АККАУНТ');
    await page.locator('#confirm').click(); await page.getByText('Неверный пароль. Аккаунт не удалён.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Введите УДАЛИТЬ АККАУНТ').inputValue(), 'УДАЛИТЬ АККАУНТ');
    await page.getByLabel('Текущий пароль BarDoctor').fill('Isolated-Test-Password-123!');
    if (viewport.width < 600) {
      await page.setViewportSize({ width: viewport.width, height: 430 });
      const field = page.getByLabel('Текущий пароль BarDoctor'); await field.scrollIntoViewIfNeeded(); await field.focus();
      const box = await field.boundingBox(); assert.ok(box && box.y >= 0 && box.y + box.height <= 430, 'password field accessible with reduced viewport');
      await page.screenshot({ path: path.join(output, `${viewport.width}-reduced-viewport.png`) }); await page.setViewportSize(viewport);
    }
    await page.screenshot({ path: path.join(output, `${viewport.width}-account-confirmation.png`) });
    await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    assert.ok(await r.api.auth.authenticateIdentityRequest(r.request(user, '/')));
    await page.getByRole('button', { name: 'Удалить заведение', exact: true }).click(); await page.getByLabel('Введите точное название: ' + name).fill(name);
    r.failStorage(true); await page.locator('#confirm').click(); await page.locator('#dialog-error').getByText('Операция не завершена.', { exact: false }).waitFor();
    r.failStorage(false); await page.locator('#confirm').click(); await page.getByText('Нет активных заведений. Создайте новое или восстановите заведение из архива.', { exact: true }).waitFor();
    await page.reload(); await page.getByRole('button', { name: 'Удалить мой аккаунт', exact: true }).waitFor();
    assert.equal(r.sqlite.prepare('SELECT count(*) n FROM venues WHERE id=?').get(user.activeVenueId)?.n, 0);
    await page.screenshot({ path: path.join(output, `${viewport.width}-empty.png`), fullPage: true });
    await page.getByRole('button', { name: 'Удалить мой аккаунт', exact: true }).click(); await page.getByLabel('Текущий пароль BarDoctor').fill('Isolated-Test-Password-123!'); await page.getByLabel('Введите УДАЛИТЬ АККАУНТ').fill('УДАЛИТЬ АККАУНТ');
    await page.locator('#confirm').click(); await page.waitForURL('**/register');
    assert.equal(await page.evaluate(() => localStorage.getItem('bd_private_cache')), null);
    assert.equal(await r.api.auth.authenticateIdentityRequest(r.request(user, '/')), null);
    assert.deepEqual(errors, []);
    results.push({ viewport, browser: await browser.version(), pass: true, physicalDevice: false, keyboard: 'reduced viewport only; no OS keyboard' }); await context.close();
  }
  fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); r.close(); }
