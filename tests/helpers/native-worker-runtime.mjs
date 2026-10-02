import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Miniflare } from 'miniflare';

/** Compiled Worker, migrated isolated native D1, and blocked outbound services. */
export async function nativeWorkerRuntime() {
  const server = path.resolve('dist/server');
  const config = JSON.parse(readFileSync(path.join(server, 'wrangler.json'), 'utf8'));
  const modules = ['index.js', ...readdirSync(server, { recursive: true }).filter(file => file !== 'index.js' && /\.(?:m?js)$/.test(file)).sort()].map(file => ({ type: 'ESModule', path: path.join(server, file) }));
  let outbound = 0;
  const worker = new Miniflare({ modules, modulesRoot: server, compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags, d1Databases: { DB: 'isolated-phase3a5' }, r2Buckets: ['BUCKET'], serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) }, outboundService: () => { outbound++; return new Response(null, { status: 502 }); } });
  const schema = new DatabaseSync(':memory:');
  try {
    for (const name of readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) schema.exec(readFileSync(`drizzle/${name}`, 'utf8'));
    const db = await worker.getD1Database('DB');
    const definitions = schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
    for (let i = 0; i < definitions.length; i += 30) await db.batch(definitions.slice(i, i + 30).map(row => db.prepare(row.sql)));
    const tokens = { owner: 'isolated-phase3a5-owner', manager: 'isolated-phase3a5-manager' };
    await db.batch([
      db.prepare(`INSERT INTO accounts(id,chatgpt_email,app_email,restaurant_json) VALUES(1,'owner@isolated.test','owner@isolated.test','{"name":"Phase 3A5 QA","currency":"MDL","timezone":"UTC"}')`),
      db.prepare(`INSERT INTO accounts(id,chatgpt_email,app_email) VALUES(2,'manager@isolated.test','manager@isolated.test')`),
      db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Phase 3A5 QA',1)"),
      db.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)"),
      db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json) VALUES(1,2,'manager','{\"deny\":[\"finance.view\"]}')"),
      db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(1,2,'member')"),
      ...Object.entries(tokens).map(([, token], i) => db.prepare("INSERT INTO sessions(token_hash,account_id,active_venue_id,expires_at) VALUES(?,?,1,?)").bind(createHash('sha256').update(token).digest('hex'), i + 1, new Date(Date.now() + 3600000).toISOString())),
    ]);
    const put = (key, data, updatedAt = '2026-10-02T09:00:00Z') => db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(key, JSON.stringify(data), updatedAt).run();
    const get = async key => { const row = await db.prepare('SELECT data_json FROM domain_data WHERE account_id=1 AND store_key=?').bind(key).first(); return JSON.parse(row?.data_json ?? 'null'); };
    const headers = role => ({ 'X-Session-Email': role + '@isolated.test', 'X-Session-Token': tokens[role], 'X-Venue-Id': '1', 'Content-Type': 'application/json' });
    const call = (url, method = 'GET', body, role = 'owner') => worker.dispatchFetch('http://localhost' + url, { method, headers: headers(role), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { worker, db, put, get, call, headers, outbound: () => outbound, close: () => worker.dispose() };
  } catch (error) { await worker.dispose(); throw error; } finally { schema.close(); }
}
