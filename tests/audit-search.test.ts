import assert from 'node:assert/strict';
import test from 'node:test';
import {Miniflare} from 'miniflare';
import {auditTextSearch} from '../lib/bardoctor/audit-search';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
const phrase='Нет подтверждённых управленческих действий';
test('actual local D1 reproduces legacy LIKE failure and literal search supports long text and symbols',async()=>{
 const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('QA')}}",compatibilityDate:'2026-01-01',d1Databases:['DB']});
 try{const db=await mf.getD1Database('DB');await db.exec('CREATE TABLE audit_log (actor_name TEXT,entity_label TEXT,reason TEXT)');
 const values=[phrase,'LONG '+ 'alphabet '.repeat(12),'Оплата «Кофе» "test" 100%_\\',"Robert'); DROP TABLE audit_log;--"];
 for(const value of values)await db.prepare('INSERT INTO audit_log VALUES(?,?,?)').bind('QA User',value,null).run();
 await assert.rejects(db.prepare('SELECT * FROM audit_log WHERE entity_label LIKE ?').bind('%'+phrase+'%').all(),/LIKE or GLOB pattern too complex/);
 for(const value of values){const q=auditTextSearch(value),rows=await db.prepare('SELECT * FROM audit_log WHERE '+q.sql).bind(...q.bindings).all();assert.equal(rows.results.length,1);assert.equal(rows.results[0].entity_label,value)}
 for(const [q,total] of [['qa user',4],['missing',0],['%_',1],['LONG alphabet',1]] as const){const search=auditTextSearch(q);assert.equal((await db.prepare('SELECT * FROM audit_log WHERE '+search.sql).bind(...search.bindings).all()).results.length,total)}
 }finally{await mf.dispose()}
});
test('native audit GET and CSV keep exact matching, module filters, empty/clear and venue authorization',async()=>{
 const r=await emptyMonthFixture({audit:'./app/api/audit/route'});
 try{const insert=r.sqlite.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_label,actor_name,actor_role,reason,created_at) VALUES(?,?,'create',?,'QA','owner',?,'2026-10-24T12:00:00Z')");
 insert.run(r.account,'bd_tasks',phrase,'Причина');insert.run(r.account,'bd_equipment','Coffee "100%_"','Оплата');
 const other=await r.register('audit-other@local.test'),otherAccount=Number(r.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId)!.id);insert.run(otherAccount,'bd_tasks',phrase,'Чужой');
 const get=async(q:string,extra='')=>{const response=await r.api.audit.GET(r.request(r.user,'/api/audit?limit=40&q='+encodeURIComponent(q)+extra));assert.equal(response.status,200);return await response.json() as any};
 const before=r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all();
 assert.equal((await get(phrase)).rows.length,1);assert.equal((await get(phrase)).rows[0].reason,'Причина');assert.equal((await get('coffee')).rows.length,1);assert.equal((await get('"100%_"')).rows.length,1);assert.equal((await get('missing')).rows.length,0);assert.equal((await get('')).rows.length,2);assert.equal((await get(phrase,'&storeKey=bd_equipment')).rows.length,0);assert.equal((await get(phrase,'&storeKey=bd_tasks')).rows.length,1);
 const csv=await r.api.audit.GET(r.request(r.user,'/api/audit?format=csv&q='+encodeURIComponent(phrase)));assert.equal(csv.status,200);assert.ok((await csv.text()).includes(phrase));
 assert.equal((await r.api.audit.GET(new Request('https://local.test/api/audit?q=x'))).status,401);
 const denied=await r.api.audit.GET(new Request(r.request(r.user,'/api/audit?q='+encodeURIComponent(phrase)),{headers:{...Object.fromEntries(r.request(r.user,'/').headers),'X-Venue-Id':String(other.activeVenueId)}}));assert.notEqual(denied.status,200);
 const created=await r.api.venues.POST(r.request(r.user,'/api/venues','POST',{name:'Второе локальное',businessType:'cafe',country:'Test',city:'Local',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201);const second=(await created.json() as any).activeVenueId;
 for(const [venue,total] of [[r.venueId,1],[second,0]]){const reply=await r.api.audit.GET(new Request(r.request(r.user,'/api/audit?q='+encodeURIComponent(phrase)),{headers:{...Object.fromEntries(r.request(r.user,'/').headers),'X-Venue-Id':String(venue)}}));assert.equal(reply.status,200);assert.equal(((await reply.json()) as any).rows.length,total)}
 assert.deepEqual(r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all(),before);
 }finally{await r.close()}
});
