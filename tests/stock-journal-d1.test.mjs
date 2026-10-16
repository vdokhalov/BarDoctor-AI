import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';import {Miniflare} from 'miniflare';
test('native Worker/D1 migration, deduplication, receipt query, transaction rollback and growth',{timeout:60000},async()=>{
 const entry=`import {env} from 'cloudflare:workers';import * as journal from './lib/bardoctor/stock-journal';
 export default {async fetch(request){const b=await request.json(),scope={accountId:1,venueId:1};try{
 if(b.action==='copy')return Response.json(await journal.copyLegacyJournal(env.DB,scope));
 if(b.action==='activate'){await journal.activateJournal(env.DB,scope);return Response.json({ok:true});}
 if(b.action==='append'){const statements=await journal.appendJournalStatements(env.DB,scope,b.revision,b.items);if(b.fail)statements.push(env.DB.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (1,'invalid',NULL)"));await env.DB.batch(statements);return Response.json({ok:true});}
 if(b.action==='facts')return Response.json(await journal.journalReceiptFacts(env.DB,scope,['water'],'2026-10-16',b.revision));
 return Response.json(await journal.journalPage(env.DB,scope,b.cursor??null,100,b.revision));
 }catch(e){return Response.json({error:e.message},{status:409});}}};`;
 const compiled=await build({stdin:{contents:entry,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','worker','browser'],external:['cloudflare:workers','node:*'],tsconfigRaw:{}});
 let outbound=0;const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-stock-journal'},outboundService:()=>{outbound++;return new Response(null,{status:502});}});
 try{
  const db=await mf.getD1Database('DB'),schema=new DatabaseSync(':memory:');
  try{for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())schema.exec(readFileSync('drizzle/'+file,'utf8'));const definitions=schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();for(let i=0;i<definitions.length;i+=30)await db.batch(definitions.slice(i,i+30).map(row=>db.prepare(row.sql)));}finally{schema.close();}
  await db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,first_name) VALUES(1,'stock@isolated.test','stock@isolated.test','Test')").run();
  await db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Test',1)").run();await db.prepare('INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)').run();
  const receipt={id:'receipt',type:'receipt',venueId:1,productKey:'water',date:'2026-10-01',amount:10,unit:'l',costAmount:100,recipeSnapshot:{unknown:'preserve'}};
  await db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'bd_stock_movements',?)").bind(JSON.stringify([receipt])).run();
  const call=async body=>{const response=await mf.dispatchFetch('http://localhost/journal',{method:'POST',body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
  assert.equal((await call({action:'copy'})).body.state,'verified');assert.equal((await call({action:'activate'})).status,200);
  const items=Array.from({length:250},(_,i)=>({id:'sale-'+i,type:'sale_consumption',venueId:1,productKey:'water',amount:-1,recipeSnapshot:{proof:'x'.repeat(9000)}}));
  assert.ok(Buffer.byteLength(JSON.stringify(items))>1900000);
  assert.equal((await call({action:'append',revision:0,items,fail:true})).status,409);
  assert.equal((await call({action:'page',revision:0})).body.items.length,1);
  const saved=await call({action:'append',revision:0,items});assert.equal(saved.status,200,JSON.stringify(saved.body));
  assert.equal((await call({action:'append',revision:0,items:[]})).status,409);
  assert.deepEqual((await call({action:'facts',revision:1})).body,[receipt]);
  assert.equal((await db.prepare('SELECT count(*) n FROM stock_journal_movements').first()).n,251);
  assert.equal((await db.prepare('SELECT count(*) n FROM stock_recipe_snapshots').first()).n,2);
  await assert.rejects(db.prepare("UPDATE domain_data SET data_json='[]' WHERE store_key='bd_stock_movements'").run(),/LEGACY_WRITE_FORBIDDEN/);
  assert.equal(outbound,0);
 }finally{await mf.dispose();}
});
