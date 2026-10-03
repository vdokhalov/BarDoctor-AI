import test from 'node:test';
import assert from 'node:assert/strict';
import { repairFixture, object, objects } from './helpers/warehouse-readonly-fixture';

test('explicit existing repair accepts owner, preserves purchases, repeats without bytes/timestamps/audit writes',async t=>{
  const r=await repairFixture();t.after(r.close);
  const purchaseBefore=r.sqlite.prepare("SELECT * FROM domain_data WHERE store_key='bd_purchase_documents' ORDER BY account_id").all();
  const before=r.snapshot(),result=await r.call();assert.equal(result.response.status,200);assert.equal(result.body.ok,true);
  const balance=objects(object(result.body.assortment).stockBalances)[0];assert.equal(balance.current,10000);
  const movements=objects(JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(r.owner.userId)?.data_json)));
  assert.equal(movements[0].amount,10000);assert.equal(movements[0].costAmount,2377);
  assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data WHERE store_key='bd_purchase_documents' ORDER BY account_id").all(),purchaseBefore);
  assert.equal(r.snapshot().audit.length,before.audit.length+1);
  const accepted=r.snapshot();assert.equal((await r.call()).response.status,200);assert.deepEqual(r.snapshot(),accepted);
});

test('explicit repair live RBAC: permitted manager allowed; restricted/revoked/foreign/guessed scopes denied without business writes',async t=>{
  const r=await repairFixture();t.after(r.close);
  assert.equal((await r.call(r.manager)).response.status,200);
  r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run(JSON.stringify({deny:['inventory.manage']}),r.venueId,r.manager.userId);
  let before=r.snapshot();assert.equal((await r.call(r.manager)).response.status,403);assert.deepEqual(r.snapshot(),before);
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId,r.manager.userId);
  before=r.snapshot();assert.equal((await r.call(r.manager)).response.status,401);assert.deepEqual(r.snapshot(),before);
  for(const [user,venue] of [[r.foreign,r.venueId],[r.owner,r.foreign.activeVenueId],[r.owner,2147483647]] as const) {
    before=r.snapshot();assert.equal((await r.call(user,venue)).response.status,401);assert.deepEqual(r.snapshot(),before);
  }
  before=r.snapshot();assert.equal((await r.call(r.owner,r.venueId,{action:'archive',productKey:'guessed-foreign-product'})).response.status,404);assert.deepEqual(r.snapshot(),before);
});

test('explicit repair stale A conflicts with accepted B; no lost update or false audit success',async t=>{
  const r=await repairFixture();t.after(r.close);let concurrent:ReturnType<typeof r.snapshot>|undefined;
  r.beforeNextDomainWrite(()=>{
    r.put('bd_assortment_v1',{stockBalances:[{key:r.productKey,productKey:r.productKey,name:'Accepted B',venueId:r.venueId,unit:'ml',current:777}],nomenclature:[],recipes:[],acceptedB:true});
    concurrent=r.snapshot();
  });
  const result=await r.call();assert.equal(result.response.status,409);assert.equal(result.body.code,'STORE_WRITE_CONFLICT');assert.ok(concurrent);assert.deepEqual(r.snapshot(),concurrent);
});

test('explicit repair failed transaction preserves canonical data and audit atomically',async t=>{
  const r=await repairFixture();t.after(r.close);const before=r.snapshot();r.failDatabase();
  await assert.rejects(r.call(),/injected database failure/);assert.deepEqual(r.snapshot(),before);
});
