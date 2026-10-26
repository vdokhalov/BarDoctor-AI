export function readinessPurchase(overrides: Record<string, unknown> = {}) {
  return {
    id: "purchase-1",
    venueId: 1,
    status: "confirmed",
    documentType: "invoice",
    supplierId: "supplier-1",
    supplierName: "Поставщик",
    date: "2026-08-04",
    currency: "RUB",
    confirmedAt: "2026-08-04T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Виски 1 л",
      quantity: 1,
      unit: "шт.",
      packageSize: "1 л",
      lineTotal: 1_000,
      unitPrice: 1_000,
      purchaseProductKey: "product:whisky",
    }],
    ...overrides,
  };
}

export function readinessAssortment(overrides: Record<string, unknown> = {}) {
  return {
    horizonDays: 7,
    groups: [{ id: "bar", name: "Бар", legacyDepartment: "bar" }],
    menuItems: [{
      id: "whisky-cola",
      groupId: "bar",
      department: "bar",
      category: "Коктейли",
      name: "Виски-кола",
      type: "composite",
      venueId: 1,
      consumptionMode: "RECIPE",
      salePrice: 300,
      currency: "RUB",
      plannedSales: 10,
      active: true,
    }],
    recipes: [{
      id: "recipe-1",
      menuItemId: "whisky-cola",
      ownerId: "whisky-cola",
      venueId: 1,
      status: "confirmed",
      reviewStatus: "approved",
      lifecycleStatus: "current",
      current: true,
      ingredients: [{
        id: "ingredient-1",
        name: "Виски",
        quantity: 50,
        unit: "мл",
        nomenclatureItemId: "nom-whisky",
        purchaseProductKey: "product:whisky",
        venueId: 1,
      }],
    }],
    nomenclature: [{
      id: "nom-whisky",
      productKey: "product:whisky",
      name: "Виски 1 л",
      unit: "ml",
      venueId: 1,
      active: true,
    }],
    stockBalances: [{
      key: "product:whisky",
      current: 2_000,
      unit: "ml",
      averageUnitCost: 0.9,
      currency: "RUB",
      checkedAt: "2026-08-01",
    }],
    ...overrides,
  };
}

export function mixedFixture(){const a:any=readinessAssortment();a.recipes[0].ingredients.push({...a.recipes[0].ingredients[0],id:'i2',name:'Лимон',nomenclatureItemId:'nom2',purchaseProductKey:'p2'});a.nomenclature.push({...a.nomenclature[0],id:'nom2',name:'Лимон',productKey:'p2'});const p:any=readinessPurchase({id:'purchase2',currency:'MDL'});p.items[0]={...p.items[0],id:'l2',name:'Лимон',purchaseProductKey:'p2'};return {assortment:a,purchaseDocuments:[readinessPurchase(),p],venueId:1,period:'2026-08',now:new Date('2026-08-12T12:00:00Z')};}
