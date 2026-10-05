// Synthetic working-venue correction fixtures. Never imported by application runtime.
export const CORRECTION_FIXTURE_VERSION = 'phase4a-working-venue-correction-v3';
export function seedCorrectionFixture(fixture, scenario) {
  if (!['citrus-empty', 'mint-missing'].includes(scenario)) throw new Error('Invalid isolated correction scenario');
  const citrus = scenario === 'citrus-empty', itemId = citrus ? 'qa-citrus' : 'qa-mint';
  const ingredientName = citrus ? 'QA лимонный сироп' : 'QA мятный сироп';
  const expectedCost = citrus ? 37 : 41;
  // Preserve an already operating, priced menu item and its recorded purchase.
  const assortment = fixture.correct();
  const target = {...assortment.menuItems[0], id:itemId, name:citrus?'QA лимонад «Цитрус»':'QA напиток «Мята»', salePrice:150};
  assortment.menuItems.push(target);
  if (citrus) assortment.recipes.push({...assortment.recipes[0],id:itemId+'-recipe',menuItemId:itemId,ownerId:itemId,status:'draft',reviewStatus:'requires_review',ingredients:[]});
  fixture.seed('bd_assortment_v1', assortment);
  fixture.seed('bd_suppliers', [{id:'qa-working-supplier',name:'QA действующий поставщик',venueId:fixture.venueId,type:'wholesale',status:'active',currency:'RUB'}]);
  // Existing historical sale/captured cost; the correction must leave it untouched.
  fixture.seed('bd_sales_documents', [{id:'qa-existing-sale',venueId:fixture.venueId,status:'confirmed',date:'2026-10-03',currency:'RUB',total:50,items:[{id:'qa-existing-sale-line',menuItemId:'water',name:assortment.menuItems[0].name,quantity:1,unitPrice:50,lineTotal:50,costStatus:'KNOWN',costAmount:5,capturedUnitCost:5}]}]);
  const profile = JSON.parse(String(fixture.sqlite.prepare('SELECT restaurant_json FROM accounts WHERE id=?').get(fixture.accountId).restaurant_json));
  fixture.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,name:'Isolated QA — работающее заведение',country:'Россия',city:'Москва',businessType:'bar',address:'Изолированная QA площадка',timezone:'UTC',currency:'RUB'}),fixture.accountId);
  return {version:CORRECTION_FIXTURE_VERSION,scenario,itemId,ingredientName,ingredientInitiallyExists:false,initial:'UNKNOWN',currency:'RUB',expectedCost,recipeQuantity:1,stockUnit:'pcs',supplierId:'qa-working-supplier',supplierName:'QA действующий поставщик',purchaseQuantity:10,purchaseUnitPrice:expectedCost,purchaseTotal:10*expectedCost};
}
