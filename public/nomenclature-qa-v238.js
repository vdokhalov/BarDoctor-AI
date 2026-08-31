(function () {
  "use strict";

  if (!['terminal.local', '127.0.0.1', 'localhost'].includes(window.location.hostname)) return;
  var email = 'nomenclature-v238-qa@bardoctor.local';
  var params = new URLSearchParams(window.location.search);
  if (!params.get('qaNomenclature') && localStorage.getItem('bd_session') !== email) return;

  var venueId = Number(params.get('venue')) || Number(localStorage.getItem('bd_active_venue_id')) || 501;
  var permissions = ['inventory.view', 'inventory.manage', 'expenses.create', 'finance.view'];
  var scope = '__' + email + '__venue_' + venueId;
  var venues = [
    { id: 501, workspaceId: 'qa-nomenclature-workspace', name: 'Кёльн', role: 'owner', isPrimary: true, status: 'active', permissions: permissions },
    { id: 502, workspaceId: 'qa-nomenclature-workspace', name: 'Причал', role: 'owner', isPrimary: false, status: 'active', permissions: permissions },
  ];

  var structure = {
    version: 'v209',
    sections: [
      { id: 'bar', name: 'Бар', order: 10 },
      { id: 'kitchen', name: 'Кухня', order: 20 },
      { id: 'hookah', name: 'Кальянная', order: 30 },
      { id: 'household', name: 'Хозчасть', order: 40 },
      { id: 'administration', name: 'Администрация', order: 50 },
      { id: 'unassigned', name: 'Требуют распределения', order: 999 },
    ],
    categories: [
      { id: 'alcohol', name: 'Алкоголь', parentId: 'bar', order: 10 },
      { id: 'soft-drinks', name: 'Безалкогольные напитки', parentId: 'bar', order: 20 },
      { id: 'bar-supplies', name: 'Барные расходники', parentId: 'bar', order: 30 },
      { id: 'cigarettes', name: 'Сигареты', parentId: 'bar', order: 40 },
      { id: 'food', name: 'Продукты', parentId: 'kitchen', order: 10 },
      { id: 'hookah-tobacco', name: 'Табак и смеси', parentId: 'hookah', order: 10 },
      { id: 'cleaning', name: 'Уборка и гигиена', parentId: 'household', order: 10 },
      { id: 'office', name: 'Офис и обслуживание', parentId: 'administration', order: 10 },
      { id: 'unassigned-category', name: 'Без категории', parentId: 'unassigned', order: 999 },
    ],
    subcategories: [
      { id: 'cognac', name: 'Коньяк и бренди', parentId: 'alcohol', order: 10 },
      { id: 'vodka', name: 'Водка', parentId: 'alcohol', order: 20 },
      { id: 'beer', name: 'Пиво', parentId: 'alcohol', order: 30 },
      { id: 'wine', name: 'Вино и игристое', parentId: 'alcohol', order: 40 },
      { id: 'whisky', name: 'Виски', parentId: 'alcohol', order: 50 },
      { id: 'strong-alcohol', name: 'Ром, джин и текила', parentId: 'alcohol', order: 60 },
      { id: 'liqueurs', name: 'Ликёры и вермуты', parentId: 'alcohol', order: 70 },
      { id: 'soft-drinks-general', name: 'Безалкогольные напитки', parentId: 'soft-drinks', order: 10 },
      { id: 'bar-consumables', name: 'Барные расходники', parentId: 'bar-supplies', order: 10 },
      { id: 'meat', name: 'Мясо и птица', parentId: 'food', order: 10 },
      { id: 'tobacco', name: 'Табак', parentId: 'hookah-tobacco', order: 10 },
      { id: 'cleaning-products', name: 'Моющие средства', parentId: 'cleaning', order: 10 },
      { id: 'office-services', name: 'Офисные услуги', parentId: 'office', order: 10 },
      { id: 'unassigned-subcategory', name: 'Без подкатегории', parentId: 'unassigned-category', order: 999 },
    ],
    locations: [
      { id: 'bar-fridge', name: 'Холодильник бара', parentId: 'bar', order: 10 },
      { id: 'bar-storage', name: 'Склад бара', parentId: 'bar', order: 20 },
      { id: 'kitchen-fridge', name: 'Холодильник кухни', parentId: 'kitchen', order: 10 },
    ],
  };
  ['sections', 'categories', 'subcategories', 'locations'].forEach(function (key) {
    structure[key].forEach(function (node) { if (node.active == null) node.active = true; });
  });

  function item(id, name, current, unit, subcategoryId, extra) {
    var categoryId = ['soft-drinks-general'].includes(subcategoryId) ? 'soft-drinks'
      : ['bar-consumables'].includes(subcategoryId) ? 'bar-supplies'
        : subcategoryId === 'meat' ? 'food'
          : subcategoryId === 'tobacco' ? 'hookah-tobacco'
            : subcategoryId === 'cleaning-products' ? 'cleaning'
              : subcategoryId === 'office-services' ? 'office' : 'alcohol';
    var sectionId = categoryId === 'food' ? 'kitchen'
      : categoryId === 'hookah-tobacco' ? 'hookah'
        : categoryId === 'cleaning' ? 'household'
          : categoryId === 'office' ? 'administration' : 'bar';
    return Object.assign({
      key: 'stock:' + id + '|' + unit,
      productKey: 'stock:' + id + '|' + unit,
      name: name,
      kind: 'stock',
      category: sectionId === 'bar' ? 'alcohol' : 'products',
      sectionId: sectionId,
      taxonomyCategoryId: categoryId,
      subcategoryId: subcategoryId,
      storageLocationId: sectionId === 'bar' ? 'bar-fridge' : sectionId === 'kitchen' ? 'kitchen-fridge' : '',
      classificationStatus: 'confirmed',
      active: true,
      current: current,
      unit: unit,
      displayUnit: unit === 'pcs' ? 'pcs' : 'auto',
      packageSize: unit === 'pcs' ? '1 шт.' : unit === 'ml' ? '0,75 л' : '1 кг',
      averageUnitCost: 1,
      currency: 'MDL',
    }, extra || {});
  }

  function assortmentFor(activeVenueId) {
    var rows = activeVenueId === 502 ? [
      item('kozel-dark-pier', 'Пиво Kozel тёмный', 24, 'pcs', 'beer'),
      item('wine-pier', 'Вино домашнее', 6000, 'ml', 'wine', { displayUnit: 'l', purchaseMode: 'measure' }),
      item('chicken-pier', 'Куриное филе охлаждённое', 3200, 'g', 'meat', { displayUnit: 'kg', packageSize: '1 кг' }),
    ] : [
      item('baltika', 'Пиво Балтика', 5, 'pcs', 'beer'),
      item('chisinau', 'Пиво Кишинев', 20, 'pcs', 'beer'),
      item('kozel-dark', 'Пиво Kozel тёмный', 60, 'pcs', 'beer'),
      item('corona', 'Пиво Корона', 8, 'pcs', 'beer'),
      item('cooler', 'Пиво Кулер', 20, 'pcs', 'beer'),
      item('kozel-light', 'Пиво Kozel светлое', 40, 'pcs', 'beer'),
      item('tuborg', 'Пиво Tuborg', 20, 'pcs', 'beer'),
      item('nistru', 'Коньяк Нистру', 10000, 'ml', 'cognac', { displayUnit: 'l', packageSize: '0,5 л' }),
      item('vodka', 'Водка VOLK', 12, 'pcs', 'vodka'),
      item('cricova', 'Вино Крикова Изабелла', 9000, 'ml', 'wine', { displayUnit: 'pcs', displayPackageSize: '0,75 л', displayPackageAmount: 750, purchaseMode: 'package', purchasePackageSize: '0,75 л', purchasePackageAmount: 750, packageOptions: ['0,75 л', '1 л'], multiplePackageSizes: true }),
      item('rum', 'Ром выдержанный', 1, 'pcs', 'strong-alcohol'),
      item('vermouth', 'Вермут Rosso', 6, 'pcs', 'liqueurs'),
      item('cola', 'Coca-Cola 0,5 л', 18, 'pcs', 'soft-drinks-general'),
      item('syrup-test', 'Сироп тестовый', 0, 'ml', 'soft-drinks-general', { displayUnit: 'ml', packageSize: '1 л' }),
      item('straws', 'Трубочки бумажные', 0, 'pcs', 'bar-consumables'),
      item('winston', 'Сигареты Winston', 10, 'pcs', '', { taxonomyCategoryId: 'cigarettes', sectionId: 'bar', subcategoryId: '', storageLocationId: 'bar-storage' }),
      item('chicken', 'Куриное филе охлаждённое', 5200, 'g', 'meat', { displayUnit: 'kg', packageSize: '1 кг' }),
      item('tobacco', 'Табак для кальяна', 3, 'pcs', 'tobacco'),
      item('cleaner', 'Средство для стекла', 7, 'pcs', 'cleaning-products'),
      item('service', 'Обслуживание кассы', 0, 'pcs', 'office-services', { kind: 'service', unit: 'service', packageSize: '1 усл.' }),
      item('review', 'Новая позиция из накладной', 0, 'pcs', 'unassigned-subcategory', { sectionId: 'unassigned', taxonomyCategoryId: 'unassigned-category', classificationStatus: 'review', storageLocationId: '' }),
    ];
    var baseCurrency = activeVenueId === 502 ? 'MDL' : 'RUB';
    rows = rows.map(function (row, index) {
      var unitCost = index + 1;
      return Object.assign({}, row, {
        averageUnitCost: unitCost,
        inventoryValue: Math.max(0, Number(row.current) || 0) * unitCost,
        currency: baseCurrency,
      });
    });
    if (params.get('qaCurrency') === 'incomplete' && activeVenueId === 501 && rows[0]) {
      rows[0] = Object.assign({}, rows[0], { currency: 'MDL' });
    }
    return {
      nomenclatureStructure: structure,
      nomenclature: rows.map(function (row) { return Object.assign({}, row); }),
      stockBalances: rows.filter(function (row) { return row.kind === 'stock'; }).map(function (row) { return Object.assign({}, row); }),
      classificationStatus: { status: 'ready', updatedAt: '2026-08-21T15:00:00.000Z' },
      updatedAt: '2026-08-21T15:00:00.000Z',
    };
  }

  var assortment = assortmentFor(venueId);
  var profile = { id: 'primary', name: venueId === 502 ? 'Причал' : 'Кёльн', businessType: 'Бар', city: 'Бендеры', currency: venueId === 502 ? 'MDL' : 'RUB', areas: ['Бар', 'Кухня'] };

  function persist() {
    localStorage.setItem('bd_assortment_v1_cache' + scope, JSON.stringify(assortment));
    localStorage.setItem('bd_venue_context__' + email, JSON.stringify({ activeVenueId: venueId, activeWorkspaceId: 'qa-nomenclature-workspace', canCreateVenues: true, venues: venues }));
  }

  function taxonomyUsage() {
    var rows = assortment && assortment.nomenclature || [];
    return structure.sections.map(function (node) {
      return { level: 'section', id: node.id, count: rows.filter(function (row) { return row.sectionId === node.id; }).length };
    }).concat(structure.categories.map(function (node) {
      return { level: 'category', id: node.id, count: rows.filter(function (row) { return row.taxonomyCategoryId === node.id; }).length };
    }), structure.subcategories.map(function (node) {
      return { level: 'subcategory', id: node.id, count: rows.filter(function (row) { return row.subcategoryId === node.id; }).length };
    }));
  }

  localStorage.setItem('bd_session', email);
  localStorage.setItem('bd_session_token', 'qa-local-token');
  localStorage.setItem('bd_session_userid', 'qa-nomenclature-user');
  localStorage.setItem('bd_active_venue_id', String(venueId));
  localStorage.setItem('bd_active_venue_is_primary', venueId === 501 ? '1' : '0');
  localStorage.setItem('bd_active_role', 'owner');
  localStorage.setItem('bd_active_permissions', JSON.stringify(permissions));
  localStorage.setItem('bd_restaurant_profile__' + email, JSON.stringify(profile));
  localStorage.setItem('bd_restaurant_cache' + scope, JSON.stringify(profile));
  persist();

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url || '';
    var headers = { 'Content-Type': 'application/json' };
    if (url.indexOf('/api/auth/bootstrap') >= 0) return Promise.resolve(new Response(JSON.stringify({ ok: true, email: email, userId: 'qa-nomenclature-user', token: 'qa-local-token', firstName: 'QA', lastName: 'Nomenclature', role: 'owner', permissions: permissions, activeVenueId: venueId, activeWorkspaceId: 'qa-nomenclature-workspace', activeVenueIsPrimary: venueId === 501, canCreateVenues: true, venues: venues, bootstrap: { state: 'ready', reason: 'active_venue_ready', membershipsLoaded: true, venuesLoaded: true, activeVenueRestored: false, accessibleVenueCount: venues.length, confirmedOwnedVenueCount: venues.length, inaccessibleOwnedVenueCount: 0 } }), { status: 200, headers: headers }));
    if (url.indexOf('/api/restaurants/me') >= 0) return Promise.resolve(new Response(JSON.stringify({ ok: true, restaurant: profile }), { status: 200, headers: headers }));
    if (url.indexOf('/api/users/me') >= 0) return Promise.resolve(new Response(JSON.stringify({ ok: true, user: { firstName: 'QA', lastName: 'Nomenclature', email: email, role: 'owner', permissions: permissions } }), { status: 200, headers: headers }));
    if (url.indexOf('/api/migrate') >= 0) return Promise.resolve(new Response(JSON.stringify({ ok: true, imported: [], skipped: [] }), { status: 200, headers: headers }));
    if (/\/api\/store(?:\?|$)/.test(url)) return Promise.resolve(new Response(JSON.stringify({ ok: true, entries: { bd_assortment_v1: { data: assortment, updatedAt: assortment.updatedAt } } }), { status: 200, headers: headers }));
    if (url.indexOf('/api/nomenclature/taxonomy') >= 0 && (!init || !init.method || init.method === 'GET')) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, taxonomy: structure, usage: taxonomyUsage(), items: assortment.nomenclature, updatedAt: assortment.updatedAt }), { status: 200, headers: headers }));
    }
    if (url.indexOf('/api/inventory/products') >= 0) {
      var body = {};
      try { body = JSON.parse(init && init.body || '{}'); } catch { body = {}; }
      if (body.action === 'update' && body.productKey) {
        assortment.nomenclature = assortment.nomenclature.map(function (row) { return row.productKey === body.productKey ? Object.assign({}, row, body, { key: row.key, productKey: row.productKey, classificationStatus: 'confirmed' }) : row; });
        assortment.stockBalances = assortment.stockBalances.map(function (row) { return row.productKey === body.productKey ? Object.assign({}, row, body, { key: row.key, productKey: row.productKey, classificationStatus: 'confirmed' }) : row; });
        persist();
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true, assortment: assortment }), { status: 200, headers: headers }));
    }
    if (url.indexOf('/api/access/active-venue') >= 0 && init && init.method === 'POST') {
      var switchBody = {};
      try { switchBody = JSON.parse(init.body || '{}'); } catch { switchBody = {}; }
      var next = Number(switchBody.venueId) || venueId;
      localStorage.setItem('bd_active_venue_id', String(next));
      return Promise.resolve(new Response(JSON.stringify({ ok: true, activeVenueId: next, activeWorkspaceId: 'qa-nomenclature-workspace', activeVenueIsPrimary: next === 501, role: 'owner', permissions: permissions }), { status: 200, headers: headers }));
    }
    return originalFetch(input, init);
  };
})();
