import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {canReadStore,canWriteStore} from '../lib/bardoctor/data-trust';
import {PERMISSION_KEYS} from '../lib/bardoctor/access-control';

test('cashier legacy batch raw and bulk stores deny persisted private costs despite forged permissions',async t=>{
 const key='bd_sales_batches';
 for(const subject of ['cashier',{role:'cashier',permissions:[...PERMISSION_KEYS]}]){
  assert.equal(canReadStore(subject,key),false);assert.equal(canWriteStore(subject,key),false);
 }
 assert.equal(canReadStore('owner',key),true);assert.equal(canReadStore('manager',key),true);
 const r=await lifecycleRuntime({raw:'./app/api/store/[key]/route',bulk:'./app/api/store/route'});t.after(r.close);
 const owner=await r.register('legacy-owner@isolated.test'),staff=await r.register('legacy-staff@isolated.test');
 const venue=owner.activeVenueId,workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venue,staff.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL'}),owner.userId);
 const legacy=[{id:'private-legacy-batch',venueId:venue,status:'POSTED',createdBy:{accountId:owner.userId,name:'Other employee'},totalTheoreticalCost:91.23,lines:[{id:'secret-line',recipeSnapshot:{ingredients:[{name:'private-ingredient',unitCost:45.615}]}}]}];
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(owner.userId,key,JSON.stringify(legacy));
 const context={params:Promise.resolve({id:undefined,key})};
 const request=(user:typeof owner,path:string,method='GET',body?:object)=>{const req=r.request(user,path,method,body);req.headers.set('X-Venue-Id',String(venue));return req;};
 const snapshot=()=>({domain:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),audit:r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all()});
 const before=snapshot();
 for(const title of ['cashier','waiter','barista','bartender'])for(const permissions of [null,JSON.stringify({allow:PERMISSION_KEYS,deny:[]})]){
  r.sqlite.prepare('UPDATE venue_memberships SET job_title=?,permissions_json=? WHERE venue_id=? AND account_id=?').run(title,permissions,venue,staff.userId);
  const raw=await r.api.raw.GET(request(staff,'/api/store/'+key),context);assert.equal(raw.status,403);assert.doesNotMatch(await raw.text(),/private-legacy-batch|recipeSnapshot|totalTheoreticalCost/);
  const bulk=await r.api.bulk.GET(request(staff,'/api/store'));assert.equal(bulk.status,200);const data=await bulk.json() as {entries:Record<string,unknown>};assert.equal(data.entries[key],undefined);assert.doesNotMatch(JSON.stringify(data),/private-legacy-batch|recipeSnapshot|totalTheoreticalCost/);
  const put=await r.api.raw.PUT(request(staff,'/api/store/'+key,'PUT',{data:legacy}),context);assert.equal(put.status,403);assert.deepEqual(snapshot(),before);
 }
 const allowed=await r.api.raw.GET(request(owner,'/api/store/'+key),context);assert.equal(allowed.status,200);assert.deepEqual((await allowed.json() as {data:unknown}).data,legacy);
 assert.deepEqual(snapshot(),before);
});
