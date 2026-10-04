import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

let upstreamCalls = 0;
const upstream = createServer((req, res) => { upstreamCalls++; res.setHeader('Content-Type', 'text/html'); res.setHeader('Cache-Control', 'public'); res.end('isolated fixture'); });
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const reserve = createServer();
await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const key = randomBytes(32).toString('base64url');
const child = spawn(process.execPath, [new URL('./phase4a-external-uat-gateway.mjs', import.meta.url).pathname], { env: { ...process.env, UAT_TARGET_PORT: String(upstream.address().port), UAT_GATEWAY_PORT: String(port), UAT_SCENARIO: 'check-only', UAT_ACCESS_KEY: key, UAT_PUBLIC_ORIGIN: 'https://127.0.0.1:' + port }, stdio: ['ignore', 'pipe', 'inherit'] });
try {
  await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('exit', code => reject(new Error('Gateway exited ' + code))); });
  const base = 'http://127.0.0.1:' + port;
  const call = (path, options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { ...(options.headers || {}) } });
  assert.equal((await call('/home')).status, 403);
  assert.equal((await call('/api/store')).status, 403);
  assert.equal(upstreamCalls, 0);
  assert.equal((await call('/__uat/session', { method: 'POST', body: JSON.stringify({ key }) })).status, 403);
  assert.equal((await call('/__uat/session', { method: 'POST', headers: { Origin: 'https://127.0.0.1:' + port }, body: JSON.stringify({ key: 'invalid' }) })).status, 403);
  const session = await call('/__uat/session', { method: 'POST', headers: { Origin: 'https://127.0.0.1:' + port }, body: JSON.stringify({ key }) });
  assert.equal(session.status, 204);
  const rawCookie = session.headers.get('set-cookie');
  for (const flag of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/']) assert.ok(rawCookie.includes(flag));
  const cookie = rawCookie.split(';')[0];
  const page = await call('/home', { headers: { Cookie: cookie } });
  assert.equal(page.status, 200);
  assert.equal(await page.text(), 'isolated fixture');
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.ok(page.headers.get('content-security-policy').includes("connect-src 'self'"));
  assert.equal((await call('/api/store', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://elsewhere.test' }, body: '{}' })).status, 403);
  assert.equal(upstreamCalls, 1);
  assert.equal((await call('/__uat/manifest', { headers: { Cookie: cookie } })).status, 200);
  assert.equal(upstreamCalls, 1);
  console.log('PASS private access, cookie flags, CSRF, no-store, self-only connections and manifest');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => upstream.close(resolve));
}
