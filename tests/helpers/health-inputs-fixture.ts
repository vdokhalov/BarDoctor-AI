import { lifecycleRuntime } from './lifecycle-runtime';
import { HEALTH_OPERATIONS_KEYS } from '../../lib/bardoctor/health-operations-inputs';
import { VENUE_CONTEXT_SOURCES } from '../../lib/bardoctor/venue-context-access';
const HEALTH_INPUT_KEYS = [...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(), ...HEALTH_OPERATIONS_KEYS])];
export async function healthInputsFixture() {
  const r = await lifecycleRuntime({ health: './app/api/business-health/route', doctor: './lib/bardoctor/ai-handlers', restaurant: './app/api/restaurants/me/route', users: './app/api/users/me/route', bulkStore: './app/api/store/route', store: './app/api/store/[key]/route' }, { now: '2026-10-03T12:00:00Z' });
  const owner = await r.register('health-owner@phase3a9.isolated.test');
  const venueId = owner.activeVenueId, accountId = Number(r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(venueId)!.data_account_id);
  const workspaceId = Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id);
  const seed = (key: string, data: unknown) => r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId, key, JSON.stringify(data), '2026-10-03T12:00:00Z');
  for (const key of HEALTH_INPUT_KEYS) seed(key, key === 'bd_assortment_v1' ? { menuItems: [], recipes: [], nomenclature: [], stockBalances: [] } : []);
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({ name: 'Isolated Health QA', currency: 'MDL', timezone: 'UTC' }), accountId);
  const request = (path: string, user = owner, method = 'GET', data?: unknown, selectedVenue = venueId) => { const req = r.request(user, path, method, data); req.headers.set('X-Venue-Id', String(selectedVenue)); return req; };
  const read = async () => { const response = await r.api.health.GET(request('/api/business-health')); if (response.status !== 200) throw new Error(JSON.stringify(await response.json())); return response.json(); };
  const before = () => r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all();
  return { ...r, owner, venueId, workspaceId, accountId, seed, read, healthRequest: request, before };
}
