// QA-only setup; never imported by the application. Preserve the ingredient
// required by the owner protocol instead of renaming the sole nomenclature row.
export const OWNER_UAT_FIXTURE_VERSION = 'phase4a-owner-water-v2';
export const OWNER_UAT_INGREDIENT_NAME = 'QA вода';

export function seedOwnerUatFixture(fixture, scenario) {
  if (!['citrus-empty', 'mint-missing'].includes(scenario)) throw new Error('Invalid isolated QA scenario');
  const citrus = scenario === 'citrus-empty';
  const itemId = citrus ? 'qa-citrus' : 'qa-mint';
  const ingredientId = itemId + '-base', productKey = 'product:' + ingredientId;
  const itemName = citrus ? 'QA лимонад «Цитрус»' : 'QA чай «Мята»';
  const ingredientName = citrus ? 'QA основа лимонада' : 'QA порция чая';
  const assortment = fixture.read('bd_assortment_v1');
  const water = assortment.nomenclature.find(item => item.id === 'nom-water' && item.name === OWNER_UAT_INGREDIENT_NAME);
  if (!water) throw new Error('Required QA water nomenclature missing from candidate seed');
  Object.assign(assortment.menuItems[0], { id: itemId, name: itemName });
  assortment.nomenclature.push({ ...water, id: ingredientId, key: productKey, productKey, name: ingredientName });
  Object.assign(assortment.recipes[0], { id: itemId + '-recipe', menuItemId: itemId, ownerId: itemId });
  if (!citrus) assortment.recipes = [];
  assortment.menuItems.push({ ...assortment.menuItems[0], id: itemId + '-secondary', name: 'QA дополнительная позиция' });
  fixture.seed('bd_assortment_v1', assortment);
  const purchases = fixture.read('bd_purchase_documents');
  const waterPurchase = purchases.find(document => document.items.some(item => item.nomenclatureItemId === water.id));
  if (!waterPurchase || waterPurchase.status !== 'confirmed') throw new Error('Required QA water purchase price missing');
  const basePurchase = structuredClone(waterPurchase);
  basePurchase.id = itemId + '-price';
  Object.assign(basePurchase.items[0], { id: itemId + '-source', name: ingredientName, purchaseProductKey: productKey, nomenclatureItemId: ingredientId });
  purchases.push(basePurchase);
  fixture.seed('bd_purchase_documents', purchases);
  return { version: OWNER_UAT_FIXTURE_VERSION, itemId, ingredientName: OWNER_UAT_INGREDIENT_NAME, ingredientId: water.id, productKey: water.productKey, expectedCost: 5, currency: 'RUB' };
}
