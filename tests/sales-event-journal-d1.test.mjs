import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';import {Miniflare} from 'miniflare';
test('native D1 rejects giant TEXT but chunked event >4MB persists, verifies, reverses and rolls back atomically',{timeout:60000},async()=>{
 const entry=`import {env} from 'cloudflare:workers';import * as events from './lib/bardoctor/sales-event-storage';
 export default {async fetch(request){const b=await request.json(),scope={accountId:1,venueId:1};try{
 if(b.action==='activate'){await events.copyLegacySalesEvents(env.DB,scope);await events.activateSalesEvents(env.DB,scope);return Response.json({ok:true});}
 const raw=await env.DB.prepare("SELECT data_json FROM domain_data WHERE account_id=1 AND store_key='bd_sales_events_v1'").first('data_json');
 if(b.action==='read'){const data=await events.readSalesEvents(env.DB,1,raw);return Response.json({count:data.length,bytes:data[0]?.unknown?.length,status:data[0]?.status});}
 const selected=await events.readSaleEvent(env.DB,1,raw,{id:'large'});
 const event={id:'large',externalId:'external',source:'MANUAL_GRID',venueId:1,fingerprint:'immutable',businessDate:'2026-10-16',acceptedAt:'2026-10-16T12:00:00Z',currency:'MDL',revenue:1,revenueRowId:'shift',status:'POSTED',batch:{id:'large'},originalMovements:[],prices:[],unknown:'x'.repeat(4100000)};
 const after=b.action==='reverse'?[{...selected.events[0],status:'REVERSED',reversedAt:'2026-10-16T13:00:00Z'}]:[event];
 const statements=await events.salesEventStatements(env.DB,scope,selected.revision,selected.events,after);
 statements.push(env.DB.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'atomic-proof',?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").bind(b.action));
 if(b.fail)statements.push(env.DB.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'invalid',NULL)"));
 await env.DB.batch(statements);return Response.json({ok:true});
 }catch(e){return Response.json({error:e.message},{status:409});}}};`;
 const compiled=await build({stdin:{contents:entry,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','worker','browser'],external:['cloudflare:workers','node:*'],tsconfigRaw:{}});
 let outbound=0;const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-events'},outboundService:()=>{outbound++;return new Response(null,{status:502});}});
 try{
 const db=await mf.getD1Database('DB'),schema=new DatabaseSync(':memory:');try{for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())schema.exec(readFileSync('drizzle/'+file,'utf8'));const definitions=schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();for(let i=0;i<definitions.length;i+=30)await db.batch(definitions.slice(i,i+30).map(row=>db.prepare(row.sql)));}finally{schema.close();}
 await db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,first_name) VALUES(1,'events@isolated.test','events@isolated.test','Test')").run();
 await db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Test',1)").run();await db.prepare('INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)').run();
 await assert.rejects(db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'too-large',?)").bind('x'.repeat(3900000)).run(),/TOOBIG|too big/);
 const call=async body=>{const response=await mf.dispatchFetch('http://localhost/events',{method:'POST',body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 assert.equal((await call({action:'activate'})).status,200);
 assert.equal((await call({action:'append',fail:true})).status,409);assert.equal((await call({action:'read'})).body.count,0);assert.equal(await db.prepare("SELECT data_json FROM domain_data WHERE store_key='atomic-proof'").first(),null);
 const added=await call({action:'append'});assert.equal(added.status,200,JSON.stringify(added));assert.equal((await call({action:'read'})).body.bytes,4100000);
 assert.ok((await db.prepare('SELECT max(length(CAST(payload AS BLOB))) n FROM sales_event_chunks').first()).n<=128000);
 assert.equal((await call({action:'reverse',fail:true})).status,409);assert.equal((await call({action:'read'})).body.status,'POSTED');
 assert.equal((await call({action:'reverse'})).status,200);assert.equal((await call({action:'read'})).body.status,'REVERSED');
 assert.equal((await db.prepare('SELECT count(*) n FROM sales_event_reversals').first()).n,1);assert.equal(outbound,0);
 }finally{await mf.dispose();}
});
