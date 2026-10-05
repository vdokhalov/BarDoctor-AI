// QA infrastructure only. The workflow pins and validates the candidate commit.
import { createServer, request as httpRequest } from 'node:http';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const candidateCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const clientHash = createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex');
const fixtureFiles = ['phase4a-owner-uat-fixture.ts','phase4a-owner-uat-fixture-seed.mjs'];
const fixtureRevision = createHash('sha256').update(fixtureFiles.map(file => readFileSync(new URL(file, import.meta.url))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex');
const targetPort = Number(process.env.UAT_TARGET_PORT);
const port = Number(process.env.UAT_GATEWAY_PORT);
const key = process.env.UAT_ACCESS_KEY;
if (!key || !/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('Private QA access key missing');
const session = randomBytes(32).toString('base64url');
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookieName = '__Host-bd_uat';
let entryViewport = null;
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', csp);
  const url = new URL(req.url || '/', 'https://' + req.headers.host);
  if (url.pathname === '/start' && req.method === 'GET') {
    // Key is in the URL fragment: never sent to the tunnel or request logs.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BarDoctor isolated UAT</title><p id="status">Открываем отдельный QA-сценарий…</p><script>(async()=>{const key=location.hash.slice(1);history.replaceState(null,"","/start");const r=await fetch("/__uat/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}})});if(r.ok)location.replace("/home");else document.getElementById("status").textContent="Доступ закрыт. Откройте исходную UAT-ссылку."})().catch(()=>document.getElementById("status").textContent="Preview недоступен; сообщите об этом.")</script></html>');
  }
  const origin = req.headers.origin;
  let expectedOrigin = process.env.UAT_PUBLIC_ORIGIN;
  if (!expectedOrigin && process.env.UAT_ORIGIN_FILE) {
    try { expectedOrigin = readFileSync(process.env.UAT_ORIGIN_FILE, 'utf8').trim(); } catch {}
  }
  if (!['GET', 'HEAD'].includes(req.method || '') && origin !== expectedOrigin) {
    console.warn('QA origin mismatch', JSON.stringify({origin, expectedOrigin, host:req.headers.host}));
    res.writeHead(403); return res.end('Forbidden origin');
  }
  if (url.pathname === '/__uat/session' && req.method === 'POST') {
    let body = '';
    for await (const bytes of req) { body += bytes; if (body.length > 1024) { res.writeHead(413); return res.end(); } }
    let valid = false;
    let payload;
    try { payload = JSON.parse(body); valid = equal(payload.key, key); } catch {}
    if (!valid) { console.warn('QA access key mismatch'); res.writeHead(403); return res.end('Access denied'); }
    if (payload.viewport && [payload.viewport.width,payload.viewport.height,payload.viewport.dpr].every(x => Number.isFinite(x) && x > 0 && x < 10000)) entryViewport = { ...payload.viewport, checkedAt: new Date().toISOString() };
    res.setHeader('Set-Cookie', `${cookieName}=${session}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=21600`);
    res.writeHead(204); return res.end();
  }
  const supplied = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!equal(supplied, session)) { res.writeHead(403); return res.end('Private isolated QA; open your UAT link.'); }
  if (url.pathname === '/__uat/manifest') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ commit: candidateCommit, clientHash, fixtureVersion: 'phase4a-owner-water-v2', fixtureRevision, ingredientName:'QA вода', scenario: process.env.UAT_SCENARIO, entryViewport, data: 'isolated in-memory SQLite; no production API; reset when runner stops' }));
  }
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  delete headers.cookie;
  const proxy = httpRequest({ host: '127.0.0.1', port: targetPort, path: req.url, method: req.method, headers }, upstream => {
    for (const [name, value] of Object.entries(upstream.headers)) if (value !== undefined && !['cache-control', 'set-cookie', 'content-security-policy'].includes(name)) res.setHeader(name, value);
    res.writeHead(upstream.statusCode || 502);
    upstream.pipe(res);
  });
  proxy.on('error', () => { res.writeHead(502); res.end('Isolated QA unavailable'); });
  req.pipe(proxy);
});
server.listen(port, '127.0.0.1', () => console.log(`QA gateway ${port} ready; no production bindings`));
