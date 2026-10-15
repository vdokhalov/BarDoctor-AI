import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

test("native Worker/D1 PIN transaction, session revocation and parallel attempt budgets", { timeout: 120000 }, async () => {
  const entry = `
    import {createPinStaff} from './lib/bardoctor/staff-pin-members';
    import {issueStaffPin,revokeStaffPin} from './lib/bardoctor/staff-pin-credentials';
    import {loginStaffPin,validPosSession} from './lib/bardoctor/staff-pin-session';
    const actor={role:'owner',venueId:1,actorAccountId:1,membershipId:1};
    export default {async fetch(request){const body=await request.json();try{
      if(body.action==='member')return Response.json(await createPinStaff(actor,'Synthetic','waiter','worker-staff'));
      if(body.action==='issue')return Response.json(await issueStaffPin(actor,body.id));
      if(body.action==='revoke')return Response.json(await revokeStaffPin(actor,body.id));
      if(body.action==='login')return Response.json(await loginStaffPin(request,body.pin,body.login));
      return Response.json({session:await validPosSession(request)});
    }catch(error){return Response.json({error:error.message},{status:400});}}};`;
  const bundle = await build({ stdin: { contents: entry, loader: "ts", resolveDir: process.cwd() }, tsconfigRaw: {}, bundle: true, write: false,
    format: "esm", platform: "neutral", conditions: ["workerd", "worker", "browser"], external: ["cloudflare:workers", "node:*"] });
  let outbound = 0;
  const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"],
    bindings:{STAFF_PIN_LOOKUP_KEY:"synthetic-native-worker-only-key"}, d1Databases: { DB: "isolated-staff-pin-session" }, outboundService: () => { outbound++; return new Response(null, { status: 502 }); } });
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
    await db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES(1,1,'owner','active')").run();
    await db.prepare("INSERT INTO venue_memberships(id,venue_id,account_id,role,status) VALUES(1,1,1,'owner','active')").run();
    const call = async (body,cookie='') => { const response=await mf.dispatchFetch('http://localhost/api/staff-pin/session',{method:'POST',headers:{origin:'http://localhost',cookie,...(body.source?{'cf-connecting-ip':body.source}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
    const member=(await call({action:'member'})).body;assert.ok(member.membershipId);
    const issued=(await call({action:'issue',id:member.membershipId})).body;assert.match(issued.pin,/^\d{6}$/);
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_pin_audit').first()).n,1);
    const raced=await Promise.all([call({action:'login',login:'WORKER-STAFF',pin:issued.pin}),call({action:'login',login:'worker-staff',pin:issued.pin})]);
    assert.deepEqual(raced.map(x=>x.status),[200,200]);
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_login_sessions').first()).n,2);
    for(const result of raced)assert.ok((await call({action:'session'},'bd_pos_session='+result.body.token)).body.session);
    for(const [table,where,id,column,temporary,restored] of [
      ['staff_logins','membership_id',member.membershipId,'login','temporary','worker-staff'],
      ['workspace_memberships','account_id',member.actorId,'status','disabled','active'],
      ['venues','id',1,'status','disabled','active'],['workspaces','id',1,'status','disabled','active']]){
      const before=await db.prepare('SELECT revision FROM staff_pin_credentials WHERE membership_id=?').bind(member.membershipId).first();
      await db.batch([db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}=?`).bind(temporary,id),db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${where}=?`).bind(restored,id)]);
      const after=await db.prepare('SELECT revision FROM staff_pin_credentials WHERE membership_id=?').bind(member.membershipId).first();
      assert.ok(after.revision>before.revision,table+' advances epoch across restore');
    }
    for(const result of raced)assert.equal((await call({action:'session'},'bd_pos_session='+result.body.token)).body.session,null);
    const unknown=await call({action:'login',login:'missing',pin:'000000'}),wrong=await call({action:'login',login:'worker-staff',pin:'bad'});assert.equal(unknown.body.error,wrong.body.error);
    const attacks=await Promise.all(Array.from({length:8},(_,i)=>call({action:'login',login:'worker-staff',pin:'bad',source:'192.0.2.'+(i+2)})));
    const admitted=attacks.filter(x=>x.body.error==='PIN_INVALID').length;assert.ok(admitted>=2&&admitted<=4);assert.equal(attacks.filter(x=>x.body.error==='PIN_RATE_LIMIT').length,8-admitted);
    assert.equal((await db.prepare("SELECT attempts FROM staff_login_limits WHERE scope='login:worker-staff'").first()).attempts,1+admitted);
    await db.prepare('UPDATE staff_login_limits SET window_start=window_start-1').run();
    const credentialScope=(await db.prepare("SELECT scope FROM staff_login_limits WHERE scope LIKE 'credential:%'").first()).scope;
    await db.batch(['held-1','held-2'].map(id=>db.prepare('INSERT INTO staff_login_leases(id,login_scope,credential_scope,expires_at) VALUES (?,?,?,?)').bind(id,'login:worker-staff',credentialScope,Date.now()+30000)));
    const held=await Promise.all(Array.from({length:8},()=>call({action:'login',login:'worker-staff',pin:'bad'})));
    assert.ok(held.every(x=>x.body.error==='PIN_RATE_LIMIT'),'two active leases block all additional KDF work');
    await db.prepare("DELETE FROM staff_login_leases WHERE id='held-1'").run();
    assert.equal((await call({action:'login',login:'worker-staff',pin:'bad'})).body.error,'PIN_INVALID');
    await db.prepare("DELETE FROM staff_login_leases WHERE id='held-2'").run();
    await db.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").bind(member.membershipId).run();
    await db.prepare("UPDATE venue_memberships SET status='active' WHERE id=?").bind(member.membershipId).run();
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_login_sessions').first()).n,0);
    for(const result of raced)assert.equal((await call({action:'session'},'bd_pos_session='+result.body.token)).body.session,null);
    assert.ok((await db.prepare('SELECT revoked_at FROM staff_pin_credentials WHERE membership_id=?').bind(member.membershipId).first()).revoked_at);
    assert.equal(outbound, 0);
  } finally { await mf.dispose(); }
});
