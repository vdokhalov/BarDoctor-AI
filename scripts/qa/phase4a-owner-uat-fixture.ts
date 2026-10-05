import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { seedOwnerUatFixture } from './phase4a-owner-uat-fixture-seed.mjs';
// Execute the unchanged pinned candidate routes/calculator/client from its cwd.
const { costFixture } = await import(pathToFileURL(resolve('tests/helpers/management-cost-fixture.ts')).href);
const { barDoctorResponse } = await import(pathToFileURL(resolve('app/bar-doctor-response.ts')).href);

// Local-only human UAT. Every process has its own isolated SQLite database;
// all writes use the actual application route handlers, never production.
const fixture = await costFixture({}, {realClock:true});
// Fresh owner studies use distinct synthetic entities and qualifying reasons;
// the original fixture remains the default for existing automation.
const scenario = process.env.BD_COST_UAT_SCENARIO;
if (!scenario) throw new Error('Owner UAT scenario required');
const readiness = seedOwnerUatFixture(fixture, scenario);
const port = Number(process.env.BD_COST_UAT_PORT || 4390);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid QA port');
const routes: Record<string, string> = {
  '/api/access/active-venue': 'activeVenue', '/api/auth/bootstrap': 'bootstrap',
  '/api/restaurants/me': 'restaurant', '/api/users/me': 'users', '/api/venues': 'venues',
  '/api/store': 'bulkStore', '/api/business-health': 'health',
  '/api/assortment/overview': 'overview', '/api/evidence/resolve': 'evidence',
  '/api/nomenclature/taxonomy': 'taxonomy', '/api/management/cost-signals': 'costs',
  '/api/management/cost-signals/evaluate': 'evaluate',
};
const clientHash = createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex');
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url || '/', `http://127.0.0.1:${port}`);
    const parts: Buffer[] = [];
    for await (const part of incoming) {
      parts.push(Buffer.from(part));
      if (parts.reduce((size, bytes) => size + bytes.length, 0) > 2_100_000) throw new Error('QA request too large');
    }
    const body = Buffer.concat(parts), method = incoming.method || 'GET';
    const key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const signal = decodeURIComponent(url.pathname).match(/^\/api\/management\/cost-signals\/(cost-v1:[^/]+)(\/verify)?$/);
    const name = key ? 'store' : signal ? (signal[2] ? 'verify' : 'detail') : routes[url.pathname];
    let response: Response;
    if (name && fixture.api[name]?.[method]) {
      const request = new Request(url, { method, headers: incoming.headers as HeadersInit, ...(body.length ? { body } : {}) });
      response = await fixture.api[name][method](request, { params: Promise.resolve({ key, id: signal?.[1] }) } as never);
    } else if (!url.pathname.startsWith('/api/') && !extname(url.pathname)) {
      const auth = JSON.stringify({ email: fixture.owner.email, token: fixture.owner.token, venueId: fixture.venueId });
      const bootstrap = `<script>const qa=${auth};localStorage.setItem('bd_session',qa.email);localStorage.setItem('bd_session_token',qa.token);localStorage.setItem('bd_active_venue_id',String(qa.venueId));</script>`;
      response = new Response((await barDoctorResponse().text()).replace('<head>', '<head>' + bootstrap), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } else {
      const file = resolve('public', '.' + url.pathname);
      const types: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
      response = file.startsWith(resolve('public') + '/') && existsSync(file)
        ? new Response(readFileSync(file), { headers: { 'Content-Type': types[extname(file)] || 'application/octet-stream' } })
        : new Response(null, { status: 404 });
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Isolated owner UAT request failed', error);
    outgoing.writeHead(500); outgoing.end('Local QA request failed');
  }
});
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ url: `http://127.0.0.1:${port}/home`, venue: 'Isolated Phase 4A QA', width: 390, height: 844, clientHash, fixtureVersion: readiness.version, ingredientName: readiness.ingredientName, persistence: 'isolated SQLite, retained for this process' })));
const stop = () => server.close(() => { fixture.close(); process.exit(0); });
process.once('SIGTERM', stop); process.once('SIGINT', stop);
