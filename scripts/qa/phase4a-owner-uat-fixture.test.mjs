import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {seedOwnerUatFixture,OWNER_UAT_FIXTURE_VERSION} from './phase4a-owner-uat-fixture-seed.mjs';
const {costFixture}=await import(pathToFileURL(resolve('tests/helpers/management-cost-fixture.ts')).href);
for(const scenario of ['citrus-empty','mint-missing'])test(scenario+': working venue, absent target ingredient and UNKNOWN, unrelated operations retained',async()=>{
 const r=await costFixture();try{
  const f=seedOwnerUatFixture(r,scenario),a=r.read('bd_assortment_v1');assert.equal(f.version,OWNER_UAT_FIXTURE_VERSION);
  assert.ok(a.menuItems.some(row=>row.id===f.itemId));assert.ok(!a.nomenclature.some(row=>row.name===f.ingredientName));assert.ok(r.read('bd_purchase_documents').some(row=>row.status==='confirmed'));assert.ok(r.read('bd_sales_documents').length);assert.ok(r.read('bd_suppliers').some(row=>row.id===f.supplierId));
  const result=await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{}));assert.ok(result.ok);const episodes=(await(await r.api.costs.GET(r.request('/api/management/cost-signals?state=all'))).json()).items;
  assert.equal(episodes.filter(e=>e.condition==='ACTIVE').length,1);assert.equal(episodes[0].menuItemId,f.itemId);assert.equal(episodes[0].latest.value,null);assert.equal(episodes[0].verificationResult,null);
 }finally{r.close()}
});
