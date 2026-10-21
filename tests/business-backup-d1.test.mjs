import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,appendFileSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

test('generic owner backup captures native D1/R2 for a fresh non-QA account with pause, retry and tenant guards',{timeout:60000},async()=>{
 const entry="import {env} from 'cloudflare:workers';import {businessBackup} from './lib/bardoctor/business-backup';import {seedRecoveryBusiness,recoveredFinance} from './tests/helpers/business-backup-native-fixture';export default {async fetch(request){const b=await request.json(),db=env.DB,bucket=b.fail?{put:async()=>{throw Error('injected R2 failure')},get:(...a)=>env.BUCKET.get(...a),list:(...a)=>env.BUCKET.list(...a)}:env.BUCKET,s={accountId:1,venueId:71,actorId:b.foreign?2:1},engine=businessBackup({accountId:1,venueId:71});try{if(b.action==='validate'){await engine.validateManifest(b.manifest);return Response.json({ok:true});}if(b.action==='seed'){await seedRecoveryBusiness(db);return Response.json({ok:true})}if(b.action==='finance')return Response.json(await recoveredFinance(b.target?env.TARGET:db));if(b.action==='prepare')return Response.json(await engine.prepareQaBackup(db,bucket,s));if(b.action==='resume')return Response.json(await engine.resumeQaBackup(db,bucket,s,b.run));if(b.action==='abort')return Response.json(await engine.abortQaBackup(db,s,b.run));if(b.action==='status')return Response.json(await engine.qaBackupStatus(db,s));if(b.action==='preflight')return Response.json(await engine.qaBackupPreflight(db,s,bucket));if(b.action==='root')return Response.json(await engine.loadManifest(db,bucket,s));if(b.action==='part'){const root=await engine.loadManifest(db,bucket,s);return new Response(await engine.readPart(bucket,root.manifest.parts[b.index]));}if(b.action==='cutover')return Response.json(await engine.stepQaPosMigration(db,bucket,s,b.run));throw Error('ACTION');}catch(e){return Response.json({error:e.message},{status:409})}}};";
 const compiled=await build({stdin:{contents:entry,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',conditions:['workerd','worker','browser'],external:['cloudflare:workers','node:*'],tsconfigRaw:{}});
 let outbound=0;
 const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'source',TARGET:'restored'},r2Buckets:['BUCKET','RESTORED_FILES'],outboundService:()=>{outbound++;throw Error('No network')}});
 const temp=mkdtempSync(join(tmpdir(),'business-backup-native-'));
 try{
  const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET'),schema=new DatabaseSync(':memory:');
  for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())schema.exec(readFileSync('drizzle/'+name,'utf8'));
  const defs=schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();schema.close();
  for(let i=0;i<defs.length;i+=25)await db.batch(defs.slice(i,i+25).map(d=>db.prepare(d.sql)));
  await db.batch([
   db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,account_kind,restaurant_json) VALUES(1,'owner@invalid.test','owner@invalid.test','user','{}'),(2,'foreign@invalid.test','foreign@invalid.test','user','{}')"),
   db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Local',1),(2,'Other',2)"),
   db.prepare('INSERT INTO venues(id,workspace_id,data_account_id,created_by_account_id) VALUES(71,1,1,1),(72,2,2,2)'),
   db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES(1,1,'owner','active'),(2,2,'owner','active')"),
   db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES(71,1,'owner','active'),(72,2,'owner','active')"),
   db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'bd_assortment_v1',?), (2,'foreign-only','[123]')").bind(JSON.stringify({stockBalances:[{id:'balance',quantity:7,cost:30}]}))
  ]);
  await bucket.put('catalog/1/owned.bin',new Uint8Array(600003).fill(37));await bucket.put('catalog/2/foreign.bin','not ours');
  const request=b=>mf.dispatchFetch('http://local.invalid/backup',{method:'POST',body:JSON.stringify(b)});
  const call=async b=>{const response=await request(b),value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
  await call({action:'seed'});const beforeFinance=await call({action:'finance'});assert.equal(beforeFinance.revenue,110);assert.equal(beforeFinance.costOfGoods,30);assert.equal(beforeFinance.resultAfterCost,71);
  const sourceRows=(await db.prepare('SELECT count(*) n FROM domain_data WHERE account_id=1').first()).n;
  assert.equal((await request({action:'prepare',foreign:true})).status,409);
  assert.equal((await db.prepare('SELECT count(*) n FROM venue_business_backup_runs').first()).n,0);
  assert.equal((await call({action:'preflight'})).ready,true);
  let state=await call({action:'prepare'});assert.equal(state.run.phase,'CAPTURE');assert.equal(state.run.paused,1);
  await assert.rejects(db.prepare("UPDATE domain_data SET data_json='[]' WHERE account_id=1").run(),/BUSINESS_BACKUP_PAUSED/);
  await db.prepare("UPDATE domain_data SET data_json='[456]' WHERE account_id=2").run();
  state=await call({action:'abort',run:state.run.run_id});assert.equal(state.run.paused,0);
  assert.equal((await request({action:'prepare',fail:true})).status,409);assert.equal((await call({action:'status'})).run.paused,0);
  await db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'oversized',?)").bind(JSON.stringify({text:'x'.repeat(2000000)})).run();
  assert.equal((await request({action:'prepare'})).status,409);assert.equal((await call({action:'status'})).run.paused,0);
  assert.equal((await db.prepare("SELECT length(data_json) n FROM domain_data WHERE store_key='oversized'").first()).n,2000011);
  await db.prepare("DELETE FROM domain_data WHERE store_key='oversized'").run();
  state=await call({action:'prepare'});await db.prepare("UPDATE venue_business_backup_runs SET expires_at='2000-01-01T00:00:00.000Z'").run();
  await db.prepare("UPDATE domain_data SET data_json=data_json WHERE account_id=1").run();
  assert.equal((await request({action:'resume',run:state.run.run_id})).status,409);
  assert.equal((await call({action:'status'})).run.paused,0);
  state=await call({action:'prepare'});const run=state.run.run_id;
  assert.equal((await call({action:'prepare'})).run.run_id,run);
  let steps=0;while(state.run.phase==='CAPTURE'){state=await call({action:'resume',run});assert(++steps<40);}
  assert.equal(state.run.phase,'COMPLETE');assert.equal(state.run.paused,0);
  assert.equal((await call({action:'resume',run})).run.run_id,run);
  assert.equal((await request({action:'cutover',run})).status,409);
  const root=await call({action:'root'});assert.deepEqual(root.manifest.scope,{accountId:1,venueId:71});
  assert.equal(root.manifest.counts.domain_data,sourceRows);assert.equal(root.manifest.assets.length,1);
  assert.equal(root.manifest.assets[0].key,'catalog/1/owned.bin');
  assert.equal(root.manifest.counts.sales_event_records,1);assert.equal(root.manifest.counts.stock_journal_movements,3);assert.equal(root.manifest.counts.pos_order_records,1);
  assert.equal((await request({action:'validate',manifest:{...root.manifest,scope:{accountId:2,venueId:72}}})).status,409);
  assert.equal((await request({action:'validate',manifest:{...root.manifest,profile:{...root.manifest.profile,unexpected:'not allowed'}}})).status,409);
  assert(!root.manifest.contract.businessTables.includes('accounts'));assert(!root.manifest.contract.businessTables.includes('sessions'));
  const partTexts=[];for(let i=0;i<root.manifest.parts.length;i++){const r=await request({action:'part',index:i});assert.equal(r.status,200);partTexts.push(await r.text());}
  assert(!partTexts.join('').includes('foreign'));assert(!partTexts.join('').includes('owner@'));
  const part=root.manifest.parts[0],saved=await (await bucket.get(part.key)).text();await bucket.put(part.key,'corrupt');
  assert.equal((await request({action:'part',index:0})).status,409);await bucket.put(part.key,saved);
  assert.equal((await db.prepare("SELECT data_json FROM domain_data WHERE account_id=1 AND store_key='bd_assortment_v1'").first()).data_json,JSON.stringify({stockBalances:[{id:'balance',quantity:7,cost:30}]}));

  const input=join(temp,'backup.ndjson'),pack=join(temp,'harness'),restored=join(temp,'restore');
  writeFileSync(input,JSON.stringify({manifest:root.manifest,hash:root.hash})+'\n',{mode:0o600});
  for(let i=0;i<partTexts.length;i++)appendFileSync(input,JSON.stringify({index:i,part:JSON.parse(partTexts[i])})+'\n');
  execFileSync(process.execPath,['scripts/package-qa-recovery.mjs',pack,'--parts'],{stdio:'pipe'});
  execFileSync(process.execPath,['--max-old-space-size=64',join(pack,'recovery.mjs'),input,root.hash,restored],{stdio:'pipe',timeout:30000});
  const receipt=JSON.parse(readFileSync(join(restored,'receipt.json'),'utf8'));assert.equal(receipt.restore,'PASS');assert.equal(receipt.migration,'NOT_REQUESTED');assert.deepEqual(receipt.counts,root.manifest.counts);
  // Load the verified offline result into a second empty native D1 fixture.
  // This adapter is test-only: no production restore endpoint exists.
  const target=await mf.getD1Database('TARGET'),recovered=new DatabaseSync(join(restored,'restored.sqlite'));
  for(let i=0;i<defs.length;i+=25)await target.batch(defs.slice(i,i+25).map(d=>target.prepare(d.sql)));
  for(const name of ['accounts','workspaces','venues',...root.manifest.contract.businessTables]){
   const rows=recovered.prepare('SELECT * FROM '+name+' ORDER BY rowid').all();
   for(let i=0;i<rows.length;i+=25)await target.batch(rows.slice(i,i+25).map(row=>{const cols=Object.keys(row);return target.prepare('INSERT INTO '+name+'('+cols.join(',')+') VALUES('+cols.map(()=>'?').join(',')+')').bind(...cols.map(c=>row[c]));}));
  }
  const restoredHashes={};
  for(const name of root.manifest.contract.businessTables){
   const copied=(await target.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()).results;
   const expected=recovered.prepare('SELECT * FROM '+name+' ORDER BY rowid').all();
   assert.deepEqual(JSON.parse(JSON.stringify(copied)),JSON.parse(JSON.stringify(expected)),name);
   const cols=(await db.prepare('PRAGMA table_info('+name+')').all()).results.map(r=>r.name);
   let where=cols.includes('account_id')?'account_id=1':cols.includes('data_account_id')?'data_account_id=1':cols.includes('venue_id')?'venue_id=71':name==='journal_migration_log_v2'?'run_id IN (SELECT run_id FROM journal_migration_runs_v2 WHERE account_id=1)':'run_id IN (SELECT run_id FROM journal_migration_runs WHERE account_id=1)';
   const original=(await db.prepare('SELECT * FROM '+name+' WHERE '+where+' ORDER BY rowid').all()).results;
   const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
   assert.equal(digest(copied),digest(original),name+' native source/restored hash');restoredHashes[name]=digest(copied);
  }
  const targetFiles=await mf.getR2Bucket('RESTORED_FILES');
  for(const asset of root.manifest.assets){
   const data=readFileSync(join(restored,'files',createHash('sha256').update(asset.key).digest('hex')));await targetFiles.put(asset.key,data);
   const original=Buffer.from(await (await bucket.get(asset.key)).arrayBuffer()),copy=Buffer.from(await (await targetFiles.get(asset.key)).arrayBuffer());assert.deepEqual(copy,original);
  }
  assert.deepEqual((await target.prepare('PRAGMA foreign_key_check').all()).results,[]);
  const afterFinance=await call({action:'finance',target:true});assert.deepEqual(afterFinance,beforeFinance);assert.equal(afterFinance.resultAfterCost,71);
  assert.equal((await target.prepare('SELECT count(*) n FROM sessions').first()).n,0);
  assert.equal((await target.prepare('SELECT count(*) n FROM venue_memberships').first()).n,0);
  const missing=join(temp,'missing.ndjson');writeFileSync(missing,JSON.stringify({manifest:root.manifest,hash:root.hash})+'\n');
  assert.throws(()=>execFileSync(process.execPath,[join(pack,'recovery.mjs'),missing,root.hash,join(temp,'missing')],{stdio:'pipe'}));assert.equal(existsSync(join(temp,'missing','receipt.json')),false);
  const corrupt=join(temp,'corrupt.ndjson'),lines=readFileSync(input,'utf8').trim().split('\n');const bad=JSON.parse(lines[1]);bad.part.rows[0].data_json='[]';lines[1]=JSON.stringify(bad);writeFileSync(corrupt,lines.join('\n')+'\n');
  assert.throws(()=>execFileSync(process.execPath,[join(pack,'recovery.mjs'),corrupt,root.hash,join(temp,'corrupt')],{stdio:'pipe'}));assert.equal(existsSync(join(temp,'corrupt','receipt.json')),false);
  assert.throws(()=>execFileSync(process.execPath,[join(pack,'recovery.mjs'),input,root.hash,restored],{stdio:'pipe'}),'existing target cannot be overwritten');
  recovered.close();
  assert.equal(outbound,0);
  console.log('BUSINESS_BACKUP_NATIVE_CAPTURE',JSON.stringify({scope:root.manifest.scope,parts:root.manifest.parts.length,requests:steps+1,restoredTables:Object.keys(restoredHashes).length,sourceRows:root.manifest.counts.domain_data,events:root.manifest.counts.sales_event_records,movements:root.manifest.counts.stock_journal_movements,posOrders:root.manifest.counts.pos_order_records,financeBefore:beforeFinance.resultAfterCost,financeAfter:afterFinance.resultAfterCost,capturedCOGS:afterFinance.costOfGoods,restore:'native D1/R2 after verified offline recovery',assets:root.manifest.assets.length,paused:state.run.paused}));
 }finally{await mf.dispose();rmSync(temp,{recursive:true,force:true});}
});
