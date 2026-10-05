import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { seedOwnerUatFixture, OWNER_UAT_FIXTURE_VERSION } from './phase4a-owner-uat-fixture-seed.mjs';
const { costFixture } = await import(pathToFileURL(resolve('tests/helpers/management-cost-fixture.ts')).href);

for (const scenario of ['citrus-empty', 'mint-missing']) {
  test(`${scenario}: preseeded QA water → actual canonical correction → durable verified result`, async () => {
    const r = await costFixture();
    try {
      const ready = seedOwnerUatFixture(r, scenario);
      assert.equal(ready.version, OWNER_UAT_FIXTURE_VERSION);
      const before = r.read('bd_assortment_v1'), prices = r.read('bd_purchase_documents');
      const water = before.nomenclature.filter(item => item.name === 'QA вода');
      assert.equal(water.length, 1);assert.equal(water[0].id, 'nom-water');
      assert.equal(water[0].venueId, r.venueId);assert.equal(water[0].unit, 'pcs');assert.equal(water[0].active, true);
      const price = prices.find(document => document.items.some(item => item.nomenclatureItemId === 'nom-water'));
      assert.equal(price.status, 'confirmed');assert.equal(price.venueId, r.venueId);
      assert.equal(price.currency, 'RUB');assert.equal(price.items[0].unitPrice, 5);
      assert.equal(new Set(prices.map(document => document.id)).size, prices.length);
      const evaluated = await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate', 'POST', { menuItemId: ready.itemId }));
      assert.equal(evaluated.status, 200);
      const initial = (await evaluated.json()).episode;
      assert.equal(initial.condition, 'ACTIVE');assert.equal(initial.before.value, null);assert.equal(initial.before.status, 'UNKNOWN');
      const corrected = structuredClone(before);
      let recipe = corrected.recipes.find(item => item.menuItemId === ready.itemId);
      if (!recipe) { recipe = { id: ready.itemId+'-recipe', venueId:r.venueId, menuItemId:ready.itemId, ownerId:ready.itemId, ownerType:'menu_item', version:1 }; corrected.recipes.push(recipe); }
      Object.assign(recipe, { status:'confirmed', reviewStatus:'approved', lifecycleStatus:'current', current:true, currentDraft:false,
        ingredients:[{ id:ready.itemId+'-water', name:'QA вода', quantity:1, unit:'pcs', venueId:r.venueId, nomenclatureItemId:ready.ingredientId, purchaseProductKey:ready.productKey, productKey:ready.productKey, linkSource:'manual', linkConfirmedByUser:true, linkStatus:'linked' }] });
      const saved = await r.api.store.PUT(r.request('/api/store/bd_assortment_v1', 'PUT', { data:corrected }), { params:Promise.resolve({key:'bd_assortment_v1'}) });
      assert.equal(saved.status, 200, await saved.clone().text());
      const verify = await r.verify(initial.signalId);assert.equal(verify.status, 200);
      const result = (await verify.json()).episode;
      assert.equal(result.condition, 'VERIFIED_RESOLVED');assert.equal(result.verificationResult.after.value, 5);assert.equal(result.verificationResult.after.currency, 'RUB');
      assert.deepEqual((await (await r.detail(initial.signalId)).json()).episode.verificationResult, result.verificationResult);
      assert.deepEqual(r.read('bd_purchase_documents'), prices, 'correction never creates a source price');
      const core = row => Object.fromEntries(['id','key','productKey','name','unit','unitModelVersion','venueId','active'].map(key => [key,row[key]]));
      assert.deepEqual(r.read('bd_assortment_v1').nomenclature.map(core), before.nomenclature.map(core), 'correction never creates/changes source nomenclature');
      const menuCore = row => Object.fromEntries(['id','name','venueId','active','consumptionMode','salePrice','currency'].map(key => [key,row[key]]));
      assert.deepEqual(r.read('bd_assortment_v1').menuItems.map(menuCore), before.menuItems.map(menuCore), 'neighbor menu business fields unchanged');
    } finally { r.close(); }
  });
}
