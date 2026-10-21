import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';import {Miniflare} from 'miniflare';
test('native Worker/D1/R2 runner preserves durable backup and per-venue pause',{timeout:60000},async()=>{
 const entry=`import {env} from 'cloudflare:workers';import * as r from './lib/bardoctor/journal-migration-runner';export default {async fetch(request){try{const {action}=await request.json(),scope={accountId:1,venueId:3389,actorId:1};if(action==='prepare')return Response.json(await r.prepareJournalMigration(env.DB,env.BUCKET,scope));const status=await r.migrationStatus(env.DB,scope);return Response.json(action==='status'?status:await r.stepJournalMigration(env.DB,env.BUCKET,scope,status.run.run_id));}catch(e){return Response.json({error:e.message},{status:409});}}};`;
 const compiled=await build({stdin:{contents:entry,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','worker','browser'],external:['cloudflare:workers','node:*'],tsconfigRaw:{}});
 let outbound=0;const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-runner'},r2Buckets:{BUCKET:'isolated-backup'},outboundService:()=>{outbound++;return new Response(null,{status:502});}});
 try{
 const db=await mf.getD1Database('DB'),schema=new DatabaseSync(':memory:');try{for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0039').sort())schema.exec(readFileSync('drizzle/'+file,'utf8'));const definitions=schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();for(let i=0;i<definitions.length;i+=30)await db.batch(definitions.slice(i,i+30).map(row=>db.prepare(row.sql)));}finally{schema.close();}
 // Replay the actual upgrade transaction, including rollback after its last DDL statement.
 const upgrade=readFileSync('drizzle/0039_general_journal_migration.sql','utf8').split(/;[ \t]*\n/).map(s=>s.trim()).filter(Boolean);
 const before=await db.prepare("SELECT name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY name").all();
 await assert.rejects(db.batch([...upgrade.map(sql=>db.prepare(sql)),db.prepare('INSERT INTO missing_upgrade_table VALUES(1)')]));
 assert.deepEqual((await db.prepare("SELECT name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY name").all()).results,before.results);
 await db.batch(upgrade.map(sql=>db.prepare(sql)));
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 await db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,first_name) VALUES(1,'events@isolated.test','events@isolated.test','Test')").run();
 await db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Test',1)").run();await db.prepare('INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(3389,1,1,1)').run();
 await db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(3389,1,'owner')").run();await db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(1,1,'owner')").run();
 await db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'bd_stock_movements',?)").bind(JSON.stringify([{id:'receipt',venueId:3389,type:'receipt',productKey:'water',amount:10,unit:'l',costAmount:10,date:'2026-10-01'}])).run();
 const call=async action=>{const response=await mf.dispatchFetch('http://localhost/runner',{method:'POST',body:JSON.stringify({action})});return {status:response.status,body:await response.json()};};
 const prepared=await call('prepare');assert.equal(prepared.status,200,JSON.stringify(prepared));const bucket=await mf.getR2Bucket('BUCKET');const backup=JSON.parse(await (await bucket.get(prepared.body.run.backup_key)).text());assert.ok(Object.hasOwn(backup.required,'bd_sales_events_v1'));assert.ok(Object.hasOwn(backup.required,'bd_finance_revenue'));
 for(const phase of ['STAGED','PAUSED','VERIFIED','STOCK_ACTIVE','BOTH_ACTIVE','COMPLETE']){const step=await call('step');assert.equal(step.status,200,JSON.stringify(step));assert.equal(step.body.run.phase,phase);if(step.body.run.paused){await assert.rejects(db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'blocked','[]')").run(),/PAUSED/);await assert.rejects(db.prepare("UPDATE domain_data SET data_json='[]' WHERE store_key='bd_stock_movements'").run(),/PAUSED|FORBIDDEN/);}}
 assert.equal((await call('step')).body.run.phase,'COMPLETE');assert.equal((await call('status')).body.log.length,7);assert.equal((await db.prepare('SELECT count(*) n FROM stock_journal_movements').first()).n,1);assert.equal(outbound,0);
 }finally{await mf.dispose();}
});
