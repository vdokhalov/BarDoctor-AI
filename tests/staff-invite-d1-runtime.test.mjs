import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

test("native Worker/D1 claim batches preserve winner metadata and unused losing invite", { timeout: 120000 }, async () => {
  const entry = `
    import {createVenueInvite,claimVenueInvite} from './lib/bardoctor/access-service';
    import {getDb} from './db'; import {accounts} from './db/schema'; import {eq} from 'drizzle-orm';
    export default {async fetch(request){
      const body=await request.json();
      if(body.action==='issue')return Response.json(await createVenueInvite({actor:{venueId:1,actorAccountId:1},role:'cashier',jobTitle:body.title}));
      const [account]=await getDb().select().from(accounts).where(eq(accounts.id,body.account));
      return Response.json({result:await claimVenueInvite(account,body.code)});
    }};`;
  const bundle = await build({ stdin: { contents: entry, loader: "ts", resolveDir: process.cwd() }, tsconfigRaw: {}, bundle: true, write: false,
    format: "esm", platform: "neutral", conditions: ["workerd", "worker", "browser"], external: ["cloudflare:workers", "node:*"] });
  let outbound = 0;
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "isolated-staff-invite-race" }, outboundService: () => { outbound++; return new Response(null, { status: 502 }); } });
  try {
    const db = await mf.getD1Database("DB"), schema = new DatabaseSync(":memory:");
    try {
      for (const file of readdirSync("drizzle").filter(f => f.endsWith(".sql")).sort()) schema.exec(readFileSync(`drizzle/${file}`, "utf8"));
      const definitions = schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
      for (let i = 0; i < definitions.length; i += 30) await db.batch(definitions.slice(i, i + 30).map(row => db.prepare(row.sql)));
    } finally { schema.close(); }
    for (const id of [1, 2, 3]) await db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,first_name) VALUES (?,?,?,'Synthetic')").bind(id, `race-${id}@isolated.test`, `race-${id}@isolated.test`).run();
    await db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES (1,'Synthetic',1)").run();
    await db.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES (1,1,1,1)").run();
    const call = async body => { const response = await mf.dispatchFetch("http://localhost/test", { method: "POST", body: JSON.stringify(body) }); assert.equal(response.status, 200); return response.json(); };
    for (const scenario of ["two-invites-one-account", "one-invite-two-accounts", "same-invite-same-account"]) {
      for (const table of ["venue_memberships", "workspace_memberships", "venue_invites", "domain_data"]) await db.prepare(`DELETE FROM ${table}`).run();
      const a = await call({ action: "issue", title: "waiter" }), b = scenario === "two-invites-one-account" ? await call({ action: "issue", title: "barista" }) : a;
      const users = [2, scenario === "one-invite-two-accounts" ? 3 : 2], invitations = [a, b];
      const responses = await Promise.all(users.map((account, i) => call({ action: "claim", account, code: invitations[i].code })));
      assert.equal(responses.filter(value => value.result).length, 1, scenario);
      const winner = responses.findIndex(value => value.result), loser = 1 - winner;
      const members = (await db.prepare("SELECT * FROM venue_memberships").all()).results;
      assert.equal(members.length, 1); assert.equal(members[0].account_id, users[winner]);
      const metadata = await db.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='__bd_staff_job_v1__:1'").bind(users[winner]).first();
      assert.equal(JSON.parse(metadata.data_json), invitations[winner].invite.jobTitle);
      if (a !== b) assert.equal((await db.prepare("SELECT used_at FROM venue_invites WHERE id=?").bind(invitations[loser].invite.id).first()).used_at, null);
      assert.equal((await db.prepare("SELECT used_by_account_id FROM venue_invites WHERE id=?").bind(invitations[winner].invite.id).first()).used_by_account_id, users[winner]);
      assert.equal((await db.prepare("SELECT count(*) n FROM workspace_memberships").first()).n, 1);
      console.info(`PASS native D1 ${scenario}`);
    }
    assert.equal(outbound, 0);
  } finally { await mf.dispose(); }
});
