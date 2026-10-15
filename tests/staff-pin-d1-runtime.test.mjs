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
    import {authorizePosDevice,loginStaffPin,validPosSession} from './lib/bardoctor/staff-pin-session';
    const actor={role:'owner',venueId:1,actorAccountId:1,membershipId:1};
    export default {async fetch(request){const body=await request.json();try{
      if(body.action==='member')return Response.json(await createPinStaff(actor,'Synthetic','waiter'));
      if(body.action==='issue')return Response.json(await issueStaffPin(actor,body.id));
      if(body.action==='revoke')return Response.json(await revokeStaffPin(actor,body.id));
      if(body.action==='device')return Response.json(await authorizePosDevice(actor));
      if(body.action==='login')return Response.json(await loginStaffPin(request,body.pin));
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
    const call = async (body,cookie='') => { const response=await mf.dispatchFetch('http://localhost/api/staff-pin/session',{method:'POST',headers:{origin:'http://localhost',cookie},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
    const member=(await call({action:'member'})).body;assert.ok(member.membershipId);
    const issued=(await call({action:'issue',id:member.membershipId})).body;assert.match(issued.pin,/^\d{6}$/);
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_pin_audit').first()).n,1);
    const device=(await call({action:'device'})).body,cookie='bd_pos_device='+device.token;
    const login=await call({action:'login',pin:issued.pin},cookie);assert.equal(login.status,200);
    const sessionCookie=cookie+'; bd_pos_session='+login.body.token;
    assert.ok((await call({action:'session'},sessionCookie)).body.session);
    const raced=await Promise.all([call({action:'login',pin:issued.pin},cookie),call({action:'login',pin:issued.pin},cookie)]);
    assert.ok(raced.some(x=>x.status===200));
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_pos_sessions').first()).n,1);
    const valid=[];for(const result of raced.filter(x=>x.status===200))valid.push((await call({action:'session'},cookie+'; bd_pos_session='+result.body.token)).body.session);
    assert.equal(valid.filter(Boolean).length,1,'exactly one returned session survives');
    await db.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").bind(member.membershipId).run();
    await db.prepare("UPDATE venue_memberships SET status='active' WHERE id=?").bind(member.membershipId).run();
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_pos_sessions').first()).n,0);
    assert.ok((await db.prepare('SELECT revoked_at FROM staff_pin_credentials WHERE membership_id=?').bind(member.membershipId).first()).revoked_at);
    await call({action:'revoke',id:member.membershipId});
    assert.equal((await call({action:'session'},sessionCookie)).body.session,null);
    assert.equal((await db.prepare('SELECT count(*) n FROM staff_pin_audit').first()).n,2);
    const attempts=await Promise.all(Array.from({length:8},()=>call({action:'login',pin:'bad'},cookie)));
    assert.equal(attempts.filter(x=>x.body.error==='PIN_INVALID').length,5);
    assert.equal(attempts.filter(x=>x.body.error==='PIN_RATE_LIMIT').length,3);
    for(let i=0;i<60;i++)await call({action:'login',pin:'bad'},cookie);
    assert.equal((await db.prepare("SELECT attempts FROM staff_pos_attempts WHERE scope='venue:1'").first()).attempts<=7,true,'blocked requests do not spend venue budget');
    assert.equal(outbound, 0);
  } finally { await mf.dispose(); }
});
