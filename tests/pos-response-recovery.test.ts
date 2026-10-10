import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function fixture(status: number, body: string, changedIdentity = false) {
  const text = readFileSync('public/cashier.js', 'utf8');
  const source = text.slice(text.indexOf('  async function request('), text.indexOf('  function saveLocal('));
  const cleared: string[] = [], redirects: string[] = [];
  const state = { frozen: false, data: { venueId: 1 } };
  let identity = 'original', frozenAtParse = false;
  const context = vm.createContext({ state, Error, AbortSignal,
    identity: () => identity, initialIdentity: 'original', selectedVenue: () => '1', initialVenue: '1',
    localStorage: { getItem: () => 'synthetic' }, $: () => ({}),
    clearSensitive: (message: string) => { state.frozen = true; cleared.push(message); },
    location: { replace: (path: string) => redirects.push(path) },
    fetch: async () => { if (changedIdentity) identity = 'new-account'; const response = new Response(body, { status }); const parse=response.json.bind(response); response.json=async()=>{frozenAtParse=state.frozen;return parse();}; return response; },
  });
  vm.runInContext(source, context);
  return { run: () => context.request('/api/sales-events', { action: 'post' }) as Promise<unknown>, state, cleared, redirects, frozenAtParse: () => frozenAtParse };
}

for (const body of ['{"ok":', 'null', '[]']) test(`malformed successful payment acknowledgement stays uncertain: ${body}`, async () => {
  const f = fixture(201, body);
  await assert.rejects(f.run(), (error: { uncertain?: boolean }) => error.uncertain === true);
  assert.equal(f.state.frozen, false);
  assert.deepEqual(f.redirects, []);
});
for (const status of [401, 403]) test(`malformed ${status} still clears sensitive state before recovery`, async () => {
  const f = fixture(status, '<html>denied</html>');
  await assert.rejects(f.run());
  assert.equal(f.state.frozen, true);
  assert.equal(f.cleared.length, 1);
  assert.equal(f.frozenAtParse(), true);
  assert.deepEqual(f.redirects, status === 401 ? ['/login'] : []);
});
test('late malformed401 from old identity cannot redirect the newly selected account', async () => {
  const f = fixture(401, 'not-json', true);
  await assert.rejects(f.run(), /Контекст изменился/);
  assert.equal(f.state.frozen, true);
  assert.deepEqual(f.redirects, []);
});
