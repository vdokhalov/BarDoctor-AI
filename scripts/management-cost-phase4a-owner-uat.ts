import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { costFixture } from '../tests/helpers/management-cost-fixture';
import { barDoctorResponse } from '../app/bar-doctor-response';

// Local-only human UAT. Every process has its own isolated SQLite database;
// all writes use the actual application route handlers, never production.
const fixture = await costFixture({}, {realClock:true});
// Fresh owner studies use distinct synthetic entities and qualifying reasons;
// the original fixture remains the default for existing automation.
const scenario = process.env.BD_COST_UAT_SCENARIO;
if (scenario) {
  if (!['citrus-empty', 'mint-missing'].includes(scenario)) throw new Error('Invalid isolated QA scenario');
  const citrus = scenario === 'citrus-empty';
  const itemId = citrus ? 'qa-citrus' : 'qa-mint';
  const ingredientId = itemId + '-base', productKey = 'product:' + ingredientId;
  const itemName = citrus ? 'QA лимонад «Цитрус»' : 'QA чай «Мята»';
  const ingredientName = citrus ? 'QA основа лимонада' : 'QA порция чая';
  const assortment = fixture.read('bd_assortment_v1');
  Object.assign(assortment.menuItems[0], { id: itemId, name: itemName });
  Object.assign(assortment.nomenclature[0], { id: ingredientId, key: productKey, productKey, name: ingredientName });
  Object.assign(assortment.recipes[0], { id: itemId + '-recipe', menuItemId: itemId, ownerId: itemId });
  if (!citrus) assortment.recipes = [];
  fixture.seed('bd_assortment_v1', assortment);
  const purchases = fixture.read('bd_purchase_documents');
  purchases[0].id = itemId + '-price';
  Object.assign(purchases[0].items[0], { id: itemId + '-source', name: ingredientName, purchaseProductKey: productKey, nomenclatureItemId: ingredientId });
  fixture.seed('bd_purchase_documents', purchases);
}
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
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ url: `http://127.0.0.1:${port}/home`, venue: 'Isolated Phase 4A QA', width: 390, height: 844, clientHash, persistence: 'isolated SQLite, retained for this process' })));
const stop = () => server.close(() => { fixture.close(); process.exit(0); });
process.once('SIGTERM', stop); process.once('SIGINT', stop);
