(function () {
  "use strict";
  if (!["terminal.local", "127.0.0.1", "localhost"].includes(window.location.hostname)) return;
  var params = new URLSearchParams(window.location.search);
  var requestedState = params.get("qaProcurement");
  if (requestedState) sessionStorage.setItem("bd_procurement_qa_state", requestedState);
  var state = requestedState || sessionStorage.getItem("bd_procurement_qa_state");
  if (!state) return;
  var requestedScenario = params.get("qaScenario");
  if (requestedScenario) sessionStorage.setItem("bd_procurement_qa_scenario", requestedScenario);
  var scenario = requestedScenario || sessionStorage.getItem("bd_procurement_qa_scenario") || "default";
  window.__bdProcurementQaLifecycleCalls = [];

  var email = "procurement-v168-qa@bardoctor.local";
  var requestedVenue = Number(params.get("venue"));
  var venueId = requestedVenue || (state === "venue-b" ? 402 : 401);
  var scope = "__" + email + "__venue_" + venueId;
  var permissions = [
    "inventory.view", "inventory.manage", "expenses.create", "finance.view",
    "finance.manage", "data.import", "integrations.manage", "settings.manage",
  ];
  var longName = "Поставщик профессионального барного оборудования и напитков Центрального региона";
  var venueName = state === "long"
    ? "Кёльн · Центральная площадка с очень длинным названием"
    : venueId === 402 ? "Причал" : "Кёльн";
  var profile = {
    id: "primary",
    name: venueName,
    businessType: "Бар",
    city: "Бендеры",
    areas: ["Бар", "Кухня", "Зал", "Администрация"],
  };
  var venueRows = [
    { id: 401, workspaceId: "qa-procurement-workspace", name: venueId === 401 ? venueName : "Кёльн", role: "owner", isPrimary: true, status: "active", permissions: permissions },
    { id: 402, workspaceId: "qa-procurement-workspace", name: venueId === 402 ? venueName : "Причал", role: "owner", isPrimary: false, status: "active", permissions: permissions },
  ];
  var suppliers = state === "empty" ? [] : venueId === 402 ? [
    { id: "supplier-b", name: "Маяк", type: "wholesale", categories: ["food"], currency: "RUB", paymentTerms: "Оплата по факту", status: "active" },
  ] : [
    { id: "supplier-vprok", name: state === "long" ? longName : "ВПРОК", type: "wholesale", categories: ["alcohol"], currency: "RUB", contactPerson: "Ирина", phone: "+373 600 00 001", email: "order@example.test", address: "Бендеры", paymentTerms: "Отсрочка 7 дней", deliveryTerms: "Доставка по вторникам и пятницам", minimumOrder: "5 000 ₽", leadTime: "2 дня", discounts: "2% от 20 000 ₽", notes: "Возвраты согласовываются до следующей поставки.", status: "active" },
    { id: "supplier-sherif", name: "Шериф", type: "wholesale", categories: ["alcohol"], currency: "RUB", contactPerson: "Олег", phone: "+373 600 00 002", paymentTerms: "Предоплата", deliveryTerms: "Самовывоз", status: "active" },
    { id: "supplier-market", name: "Рынок", type: "retail", categories: ["products", "repairs"], currency: "RUB", status: "active" },
    { id: "supplier-social", name: "Инстаграм", type: "retail", categories: ["marketing"], currency: "RUB", status: "active" },
  ];

  function item(id, name, quantity, packageSize, unitPrice, productKey, confidence) {
    return {
      id: id,
      name: name,
      quantity: quantity,
      unit: "шт.",
      packageSize: packageSize,
      unitPrice: unitPrice,
      lineTotal: Math.round(quantity * unitPrice * 100) / 100,
      category: "alcohol",
      purchaseProductKey: productKey || undefined,
      confidence: confidence == null ? 0.96 : confidence,
    };
  }

  function document(id, supplierId, supplierName, date, total, items, extra) {
    return Object.assign({
      id: id,
      venueId: venueId,
      documentType: "invoice",
      supplierId: supplierId,
      supplierName: supplierName,
      date: date,
      documentNumber: id.replace(/[^0-9]/g, "") || "1",
      currency: "RUB",
      expenseCategory: "alcohol",
      paymentMethod: "transfer",
      total: total,
      items: items,
      confidence: 0.94,
      warnings: [],
      status: "confirmed",
      syncStatus: "synced",
      sourceUrl: "/api/purchases/files/" + id + "-source",
      sourceFileId: id + "-source",
      confirmedAt: date + "T12:00:00.000Z",
      updatedAt: date + "T12:00:00.000Z",
    }, extra || {});
  }

  var documents = state === "empty" ? [] : venueId === 402 ? [
    document("doc-b-1", "supplier-b", "Маяк", "2026-08-08", 860, [item("b-line-1", "Сливки 1 л", 4, "1 л", 215, "product:cream-1l")]),
  ] : [
    document("doc-v-aug", "supplier-vprok", state === "long" ? longName : "ВПРОК", "2026-08-07", 10291.80, [
      item("line-vodka-aug", state === "long" ? "Водка премиальная экспортная с очень длинным коммерческим названием 0,5 л" : "Водка X 0,5 л", 24, "0,5 л", 120, "product:vodka-x"),
      item("line-wine-aug", "Вино сухое 0,75 л", 10, "0,75 л", 349, "product:wine-dry"),
      item("line-tonic-aug", "Тоник 0,33 л", 18, "0,33 л", 84, "product:tonic"),
    ]),
    document("doc-s-aug", "supplier-sherif", "Шериф", "2026-08-01", 491.50, [
      item("line-vodka-alt", "Водка X 0,5 л", 4, "0,5 л", 109, "product:vodka-x"),
    ]),
    document("doc-market-aug", "supplier-market", "Рынок", "2026-08-01", 1200, [
      item("line-unmapped", "Крепёж для барной стойки", 1, "комплект", 1200, "", 0.91),
    ]),
    document("doc-social-aug", "supplier-social", "Инстаграм", "2026-08-01", 1200, [
      item("line-social", "Печать материалов", 1, "шт.", 1200, "product:print"),
    ], { expenseCategory: "marketing" }),
    document("doc-v-jul", "supplier-vprok", state === "long" ? longName : "ВПРОК", "2026-07-07", 9700, [
      item("line-vodka-jul", "Водка X 0,5 л", 20, "0,5 л", 105, "product:vodka-x"),
    ]),
    document("doc-v-jun", "supplier-vprok", state === "long" ? longName : "ВПРОК", "2026-06-09", 8800, [
      item("line-vodka-jun", "Водка X 0,5 л", 16, "0,5 л", 102, "product:vodka-x"),
    ], { status: "cancelled", cancelledAt: "2026-08-11T10:00:00.000Z", cancellationReason: "QA: проверка отменённого проведения" }),
    document("doc-review", "supplier-market", "Рынок", "2026-08-10", 980, [
      item("line-review", "Салфетки, возможно 8 упаковок", 8, "уп.", 122.5, "", 0.58),
    ], { status: "draft", confidence: 0.62, warnings: ["Проверьте количество и фасовку"], syncStatus: undefined, confirmedAt: undefined }),
  ];
  if (state === "large") {
    var largeLines = Array.from({ length: 240 }, function (_, index) {
      return item("large-line-" + index, "Тестовая позиция " + (index + 1), 1, "1 шт.", 10 + index, "product:large-" + index);
    });
    documents[0] = document("doc-v-aug", "supplier-vprok", "ВПРОК", "2026-08-07", largeLines.reduce(function (sum, line) { return sum + line.lineTotal; }, 0), largeLines);
  }
  if (state === "single") documents = documents.slice(0, 1);

  var confirmedPurchases = documents.filter(function (doc) { return doc.status === "confirmed"; });
  var expenses = confirmedPurchases.filter(function (doc) { return doc.documentType !== "price_list"; }).map(function (doc) {
    if (state === "e2e") {
      if (scenario === "debt" && doc.id === "doc-v-aug") {
        return {
          id: "purchase-payment:" + doc.id,
          source: "purchase_payment",
          paymentKind: "supplier_payment",
          purchaseId: doc.id,
          sourceDocumentId: doc.id,
          status: "posted",
          amount: 5000,
          currency: doc.currency,
          date: doc.date,
          category: doc.expenseCategory,
          paymentMethod: "cash",
          moneySourceName: "Наличные · касса",
          venueId: venueId,
          idempotencyKey: "qa:purchase-payment:" + doc.id,
        };
      }
      if (["doc-v-aug", "doc-v-jul", "doc-s-aug"].includes(doc.id)) return null;
    }
    return {
      id: "purchase-payment:" + doc.id,
      source: "purchase_payment",
      paymentKind: "supplier_payment",
      purchaseId: doc.id,
      sourceDocumentId: doc.id,
      status: "posted",
      amount: doc.id === "doc-v-aug" ? 6000 : doc.total,
      currency: doc.currency,
      date: doc.date,
      category: doc.expenseCategory,
      paymentMethod: "transfer",
      moneySourceName: "Банковский счёт · перевод",
      venueId: venueId,
      idempotencyKey: "qa:purchase-payment:" + doc.id,
    };
  }).filter(Boolean);
  var movements = [];
  var assortment = { stockBalances: [] };

  function activePayments(documentId) {
    return expenses.filter(function (expense) {
      return String(expense.sourceDocumentId || expense.purchaseId || "") === String(documentId)
        && expense.status !== "voided"
        && !expense.reversedAt;
    });
  }

  function syncPaymentFields() {
    documents = documents.map(function (doc) {
      var paid = activePayments(doc.id).reduce(function (sum, payment) { return sum + Number(payment.amount || 0); }, 0);
      var balance = Math.max(0, Number(doc.total || 0) - paid);
      return Object.assign({}, doc, {
        paidAmount: Math.round(paid * 100) / 100,
        balanceDue: Math.round(balance * 100) / 100,
        paymentStatus: doc.documentType === "price_list" ? "not_applicable" : paid <= 0 ? "unpaid" : balance <= 0.005 ? "paid" : "partial",
        paymentIds: activePayments(doc.id).map(function (payment) { return payment.id; }),
      });
    });
  }

  function rebuildWarehouse() {
    var balances = new Map();
    movements = [];
    documents.filter(function (doc) {
      return doc.status === "confirmed" && doc.documentType !== "price_list" && doc.expenseCategory !== "marketing";
    }).forEach(function (doc) {
      (doc.items || []).filter(function (line) { return line.purchaseProductKey; }).forEach(function (line) {
        var key = line.purchaseProductKey;
        var current = balances.get(key) || {
          id: key,
          purchaseProductKey: key,
          name: line.name,
          unit: line.unit || "шт.",
          packageSize: line.packageSize || line.unit || "шт.",
          current: 0,
          inventoryValue: 0,
          currency: doc.currency || "RUB",
          lastPurchaseAt: doc.date,
        };
        current.current += Number(line.quantity || 0);
        current.inventoryValue += Number(line.lineTotal || 0);
        current.lastPurchaseAt = doc.date > current.lastPurchaseAt ? doc.date : current.lastPurchaseAt;
        balances.set(key, current);
        movements.push({
          id: "purchase-receipt:" + doc.id + ":" + line.id,
          type: "receipt",
          status: "active",
          sourceDocumentId: doc.id,
          productKey: key,
          productName: line.name,
          amount: Number(line.quantity || 0),
          unit: line.unit || "шт.",
          costAmount: Number(line.lineTotal || 0),
          currency: doc.currency || "RUB",
          date: doc.date,
          createdAt: doc.confirmedAt || doc.updatedAt || doc.date + "T12:00:00.000Z",
          venueId: venueId,
        });
      });
    });
    assortment = { stockBalances: Array.from(balances.values()).map(function (row) {
      return Object.assign({}, row, {
        current: Math.round(row.current * 1000) / 1000,
        inventoryValue: Math.round(row.inventoryValue * 100) / 100,
      });
    }) };
  }

  function persistQaStores() {
    confirmedPurchases = documents.filter(function (doc) { return doc.status === "confirmed"; });
    syncPaymentFields();
    rebuildWarehouse();
    localStorage.setItem("bd_purchase_documents_cache" + scope, JSON.stringify(documents));
    localStorage.setItem("bd_finance_expenses_cache" + scope, JSON.stringify(expenses));
    localStorage.setItem("bd_stock_movements_cache" + scope, JSON.stringify(movements));
    localStorage.setItem("bd_assortment_v1_cache" + scope, JSON.stringify(assortment));
  }

  function qaJson(value, status) {
    return new Response(JSON.stringify(value), {
      status: status || 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  }

  function qaBody(init) {
    try { return JSON.parse(init && init.body || "{}"); } catch { return {}; }
  }

  function qaLifecyclePayload(documentValue) {
    persistQaStores();
    var current = documentValue && documents.find(function (doc) { return String(doc.id) === String(documentValue.id); });
    return {
      ok: true,
      document: current || documentValue || null,
      documents: documents,
      expenses: expenses,
      stockMovements: movements,
      assortment: assortment,
      inventorySummary: { postedLines: movements.filter(function (row) { return current && row.sourceDocumentId === current.id; }).length },
    };
  }

  persistQaStores();

  function analyticsForVenue() {
    if (state === "empty") return {
      version: "procurement-analytics-v1", period: { key: "2026-08", previousKey: "2026-07", comparisonBasis: "same_elapsed_days" },
      kpi: { purchaseTotal: 0, purchaseCount: 0, activeSupplierCount: 0, comparableCurrentTotal: 0, comparablePreviousTotal: 0, changePercent: null },
      counts: { allDocuments: 0, confirmedPurchases: 0, confirmedPriceLists: 0, reviewDocuments: 0, periodReviewDocuments: 0, normalPurchases: 0, attentionPurchases: 0, unmappedItems: 0, financeMissing: 0, stockMissing: 0 },
      signals: [], priceChanges: [], comparisons: [], opportunities: [], chart: [], supplierMetrics: [], unmappedItems: [],
      integrity: { financeMissingDocumentIds: [], stockMissingDocumentIds: [] }, externalAlternatives: [],
      aiContext: { confirmedPurchases: [], mappingStatus: { comparableItems: 0, unconfirmedItems: 0 } },
    };
    if (venueId === 402) return {
      version: "procurement-analytics-v1", period: { key: "2026-08", previousKey: "2026-07", comparisonBasis: "same_elapsed_days" },
      kpi: { purchaseTotal: 860, purchaseCount: 1, activeSupplierCount: 1, comparableCurrentTotal: 860, comparablePreviousTotal: 0, changePercent: null },
      counts: { allDocuments: 1, confirmedPurchases: 1, confirmedPriceLists: 0, reviewDocuments: 0, periodReviewDocuments: 0, normalPurchases: 1, attentionPurchases: 0, unmappedItems: 0, financeMissing: 0, stockMissing: 0 },
      signals: [], priceChanges: [], comparisons: [], opportunities: [], chart: [{ period: "2026-08", total: 860 }],
      supplierMetrics: [{ id: "supplier-b", name: "Маяк", categories: ["food"], linkedProducts: 1, periodTotal: 860, sharePercent: 100, lastPurchaseDate: "2026-08-08", medianPriceChangePercent: null, conditions: { known: true, payment: "Оплата по факту", minimumOrder: null, delivery: null, leadTime: null, availability: null, discounts: null }, contacts: {}, notes: null, purchaseDocuments: 1 }],
      unmappedItems: [], integrity: { financeMissingDocumentIds: [], stockMissingDocumentIds: [] }, externalAlternatives: [],
      aiContext: { confirmedPurchases: [{ id: "doc-b-1:b-line-1", documentId: "doc-b-1", supplierId: "supplier-b", supplierName: "Маяк", productKey: "product:cream-1l", productName: "Сливки 1 л", normalizedDisplayPrice: 215, normalizedDisplayUnit: "л", currency: "RUB", packageSize: "1 л", date: "2026-08-08" }], mappingStatus: { comparableItems: 1, unconfirmedItems: 0 } },
    };
    if (state === "single") return {
      version: "procurement-analytics-v1", period: { key: "2026-08", previousKey: "2026-07", comparisonBasis: "same_elapsed_days" },
      kpi: { purchaseTotal: 10291.80, purchaseCount: 1, activeSupplierCount: suppliers.length, comparableCurrentTotal: 10291.80, comparablePreviousTotal: 0, changePercent: null },
      counts: { allDocuments: 1, confirmedPurchases: 1, confirmedPriceLists: 0, reviewDocuments: 0, periodReviewDocuments: 0, normalPurchases: 1, attentionPurchases: 0, unmappedItems: 0, financeMissing: 0, stockMissing: 0 },
      signals: [], priceChanges: [], comparisons: [], opportunities: [], chart: [{ period: "2026-08", total: 10291.80 }],
      supplierMetrics: suppliers.map(function (supplier, index) { return { id: supplier.id, name: supplier.name, categories: supplier.categories || [], linkedProducts: index === 0 ? 3 : 0, periodTotal: index === 0 ? 10291.80 : 0, sharePercent: index === 0 ? 100 : 0, lastPurchaseDate: index === 0 ? "2026-08-07" : null, medianPriceChangePercent: null, conditions: { known: Boolean(supplier.paymentTerms || supplier.deliveryTerms || supplier.minimumOrder), payment: supplier.paymentTerms || null, minimumOrder: supplier.minimumOrder || null, delivery: supplier.deliveryTerms || null, leadTime: supplier.leadTime || null, availability: supplier.availability || null, discounts: supplier.discounts || null }, contacts: { contactPerson: supplier.contactPerson || null, phone: supplier.phone || null, email: supplier.email || null, address: supplier.address || null }, notes: supplier.notes || null, purchaseDocuments: index === 0 ? 1 : 0 }; }),
      unmappedItems: [], integrity: { financeMissingDocumentIds: [], stockMissingDocumentIds: [] }, externalAlternatives: [],
      aiContext: { confirmedPurchases: [{ currency: "RUB" }], mappingStatus: { comparableItems: 3, unconfirmedItems: 0 } },
    };
    var vprokName = state === "long" ? longName : "ВПРОК";
    var currentOffer = { id: "doc-v-aug:line-vodka-aug", documentId: "doc-v-aug", sourceKind: "purchase", productKey: "product:vodka-x", productName: "Водка X 0,5 л", category: "alcohol", packageSize: "0,5 л", mappingStatus: "confirmed", quantity: 24, baseAmount: 12000, baseUnit: "ml", normalizedUnitPrice: 0.24, normalizedDisplayPrice: 240, normalizedDisplayUnit: "л", lineTotal: 2880, supplierId: "supplier-vprok", supplierName: vprokName, currency: "RUB", date: "2026-08-07", conditions: { known: true, payment: "Отсрочка 7 дней", minimumOrder: "5 000 ₽", delivery: "Доставка по вторникам и пятницам", leadTime: "2 дня", availability: null, discounts: "2% от 20 000 ₽" }, ageDays: 5 };
    var alternativeOffer = { id: "doc-s-aug:line-vodka-alt", documentId: "doc-s-aug", sourceKind: "purchase", productKey: "product:vodka-x", productName: "Водка X 0,5 л", category: "alcohol", packageSize: "0,5 л", mappingStatus: "confirmed", quantity: 4, baseAmount: 2000, baseUnit: "ml", normalizedUnitPrice: 0.218, normalizedDisplayPrice: 218, normalizedDisplayUnit: "л", lineTotal: 436, supplierId: "supplier-sherif", supplierName: "Шериф", currency: "RUB", date: "2026-08-01", conditions: { known: true, payment: "Предоплата", minimumOrder: null, delivery: "Самовывоз", leadTime: null, availability: null, discounts: null }, ageDays: 11 };
    var comparison = { productKey: "product:vodka-x", productName: state === "long" ? "Водка премиальная экспортная с очень длинным коммерческим названием 0,5 л" : "Водка X 0,5 л", baseUnit: "ml", unit: "л", currency: "RUB", current: currentOffer, alternative: alternativeOffer, offers: [alternativeOffer, currentOffer], priceDifference: 22, priceDifferencePercent: 9.2, comparisonScope: "price_and_conditions", opportunity: true, estimatedMonthlySaving: 616, estimateBasis: { actualPurchaseDocuments: 4, actualMonths: 3, observedBaseAmount: 28000 }, freshnessDate: "2026-08-01" };
    var priceChange = { productKey: "product:vodka-x", productName: "Водка X 0,5 л", supplierId: "supplier-vprok", supplierName: vprokName, currency: "RUB", unit: "л", currentPrice: 240, previousPrice: 210, percent: 14.3, direction: "up", currentDocumentId: "doc-v-aug", previousDocumentId: "doc-v-jul", date: "2026-08-07" };
    return {
      version: "procurement-analytics-v1", period: { key: "2026-08", previousKey: "2026-07", comparisonBasis: "same_elapsed_days" },
      kpi: { purchaseTotal: 13183.30, purchaseCount: 4, activeSupplierCount: suppliers.length, comparableCurrentTotal: 13183.30, comparablePreviousTotal: 9700, changePercent: 35.9 },
      counts: { allDocuments: documents.length, confirmedPurchases: confirmedPurchases.length, confirmedPriceLists: 0, reviewDocuments: 1, periodReviewDocuments: 1, normalPurchases: 2, attentionPurchases: 2, unmappedItems: 2, financeMissing: 0, stockMissing: 0 },
      signals: [
        { id: "price-rise", type: "price_change", tone: "orange", title: "1 товар подорожал", detail: "Максимальное подтверждённое изменение +14,3%", documentId: "doc-v-aug" },
        { id: "document-review", type: "document_review", tone: "orange", title: "1 документ требует проверки", detail: "Низкая уверенность в конкретной позиции", documentId: "doc-review" },
        { id: "unmapped-items", type: "mapping", tone: "orange", title: "2 позиции не участвуют в сравнении", detail: "Нужно подтвердить товар и нормализованную единицу", documentId: "doc-market-aug" },
      ],
      priceChanges: [priceChange], comparisons: [comparison], opportunities: [comparison],
      chart: [{ period: "2026-03", total: 6400 }, { period: "2026-04", total: 8800 }, { period: "2026-05", total: 7100 }, { period: "2026-06", total: 8800 }, { period: "2026-07", total: 9700 }, { period: "2026-08", total: 13183.30 }],
      supplierMetrics: suppliers.map(function (supplier, index) {
        var totals = [10291.80, 491.50, 1200, 1200];
        var linked = [3, 1, 0, 1];
        return { id: supplier.id, name: supplier.name, categories: supplier.categories || [], linkedProducts: linked[index] || 0, periodTotal: totals[index] || 0, sharePercent: Math.round((totals[index] || 0) / 13183.30 * 1000) / 10, lastPurchaseDate: index === 0 ? "2026-08-07" : "2026-08-01", medianPriceChangePercent: index === 0 ? 14.3 : null, conditions: { known: Boolean(supplier.paymentTerms || supplier.deliveryTerms || supplier.minimumOrder), payment: supplier.paymentTerms || null, minimumOrder: supplier.minimumOrder || null, delivery: supplier.deliveryTerms || null, leadTime: supplier.leadTime || null, availability: supplier.availability || null, discounts: supplier.discounts || null }, contacts: { contactPerson: supplier.contactPerson || null, phone: supplier.phone || null, email: supplier.email || null, address: supplier.address || null }, notes: supplier.notes || null, purchaseDocuments: documents.filter(function (doc) { return doc.supplierId === supplier.id; }).length };
      }),
      unmappedItems: [{ documentId: "doc-review", itemId: "line-review", name: "Салфетки", reason: "mapping_unconfirmed" }],
      integrity: { financeMissingDocumentIds: [], stockMissingDocumentIds: [] },
      externalAlternatives: [{ id: "external-1", supplierName: "Региональный дистрибьютор", product: "Водка X 0,5 л", matchedTo: "product:vodka-x", candidatePrice: 108, currency: "RUB", unit: "шт.", packageSize: "0,5 л", verifiedAt: "2026-08-10", decision: "new", sourceUrls: ["https://example.test/offer"], note: "Опубликованное предложение; не считается фактической закупочной ценой" }],
      aiContext: { confirmedPurchases: [currentOffer, alternativeOffer], priceChanges: [priceChange], comparableOffers: [comparison], mappingStatus: { comparableItems: 4, unconfirmedItems: 2 }, guardrails: ["Неподтверждённый OCR не является фактом закупки"] },
    };
  }

  localStorage.setItem("bd_session", email);
  localStorage.setItem("bd_session_token", "qa-local-token");
  localStorage.setItem("bd_session_userid", "qa-procurement-user");
  localStorage.setItem("bd_active_venue_id", String(venueId));
  localStorage.setItem("bd_active_venue_is_primary", venueId === 401 ? "1" : "0");
  localStorage.setItem("bd_active_role", "owner");
  localStorage.setItem("bd_active_permissions", JSON.stringify(permissions));
  localStorage.setItem("bd_restaurant_profile__" + email, JSON.stringify(profile));
  localStorage.setItem("bd_restaurant_cache" + scope, JSON.stringify(profile));
  localStorage.setItem("bd_purchase_documents_cache" + scope, JSON.stringify(documents));
  localStorage.setItem("bd_suppliers_cache" + scope, JSON.stringify(suppliers));
  localStorage.setItem("bd_finance_expenses_cache" + scope, JSON.stringify(expenses));
  localStorage.setItem("bd_stock_movements_cache" + scope, JSON.stringify(movements));
  localStorage.setItem("bd_assortment_v1_cache" + scope, JSON.stringify(assortment));
  localStorage.setItem("bd_supplier_alternatives_v1_cache" + scope, JSON.stringify({ alternatives: analyticsForVenue().externalAlternatives || [] }));
  localStorage.setItem("bd_venue_context__" + email, JSON.stringify({
    activeVenueId: venueId,
    activeWorkspaceId: "qa-procurement-workspace",
    canCreateVenues: true,
    venues: venueRows,
  }));

  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url || "";
    if (url.indexOf("/api/auth/bootstrap") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, email: email, userId: "qa-procurement-user", token: "qa-local-token", firstName: "QA", lastName: "Procurement", phone: null, role: "owner", permissions: permissions, activeVenueId: venueId, activeWorkspaceId: "qa-procurement-workspace", activeVenueIsPrimary: venueId === 401, canCreateVenues: true, venues: venueRows, bootstrap: { state: "ready", reason: "active_venue_ready", membershipsLoaded: true, venuesLoaded: true, activeVenueRestored: false, accessibleVenueCount: venueRows.length, confirmedOwnedVenueCount: venueRows.length, inaccessibleOwnedVenueCount: 0 } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    if (url.indexOf("/api/restaurants/me") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, restaurant: profile }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    if (url.indexOf("/api/users/me") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, user: { firstName: "QA", lastName: "Procurement", email: email, phone: null, role: "owner", permissions: permissions, activeVenueId: venueId, activeWorkspaceId: "qa-procurement-workspace", activeVenueIsPrimary: venueId === 401, canCreateVenues: true, venues: venueRows } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    if (url.indexOf("/api/integration-hub") >= 0) {
      return Promise.resolve(qaJson({ ok: true, integrations: [], providers: [] }));
    }
    if (url.indexOf("/api/migrate") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, imported: [], skipped: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    if (url.indexOf("/api/store/bd_assortment_v1") >= 0) {
      if (init && init.method === "PUT") {
        var assortmentBody = qaBody(init);
        assortment = assortmentBody.data || assortment;
      }
      return Promise.resolve(qaJson({ ok: true, data: assortment }));
    }
    if (/\/api\/store(?:\?|$)/.test(url)) {
      var now = "2026-08-12T12:00:00.000Z";
      return Promise.resolve(new Response(JSON.stringify({ ok: true, entries: {
        bd_purchase_documents: { data: documents, updatedAt: now },
        bd_suppliers: { data: suppliers, updatedAt: now },
        bd_finance_expenses: { data: expenses, updatedAt: now },
        bd_stock_movements: { data: movements, updatedAt: now },
        bd_assortment_v1: { data: assortment, updatedAt: now },
        bd_supplier_alternatives_v1: { data: { alternatives: analyticsForVenue().externalAlternatives || [] }, updatedAt: now },
      } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    if (url.indexOf("/api/inventory/products") >= 0 && init && init.method === "POST") {
      return Promise.resolve(qaJson({ ok: true, assortment: assortment }));
    }
    if (url.indexOf("/api/purchases/confirm") >= 0 && init && init.method === "POST") {
      var confirmBody = qaBody(init);
      var incoming = confirmBody.document || {};
      var confirmed = Object.assign({}, incoming, {
        id: incoming.id || "qa-purchase-" + Date.now(),
        venueId: venueId,
        status: "confirmed",
        syncStatus: "synced",
        confirmedAt: "2026-08-12T12:00:00.000Z",
        updatedAt: "2026-08-12T12:00:00.000Z",
        items: (incoming.items || []).map(function (line, index) {
          return Object.assign({}, line, {
            purchaseProductKey: line.purchaseProductKey || "product:qa-manual-" + index,
            mappingStatus: line.mappingStatus || "confirmed",
          });
        }),
      });
      var confirmIndex = documents.findIndex(function (doc) { return String(doc.id) === String(confirmed.id); });
      if (confirmIndex >= 0) documents[confirmIndex] = confirmed;
      else documents.unshift(confirmed);
      return Promise.resolve(qaJson(qaLifecyclePayload(confirmed), 201));
    }
    if (url.indexOf("/api/purchases/update") >= 0 && init && init.method === "POST") {
      var updateBody = qaBody(init);
      var updated = Object.assign({}, updateBody.document || {}, { venueId: venueId, updatedAt: "2026-08-12T12:00:00.000Z" });
      var updateIndex = documents.findIndex(function (doc) { return String(doc.id) === String(updated.id); });
      if (updateIndex >= 0) documents[updateIndex] = updated;
      return Promise.resolve(qaJson(qaLifecyclePayload(updated)));
    }
    if (url.indexOf("/api/purchases/delete") >= 0 && init && init.method === "DELETE") {
      window.__bdProcurementQaLifecycleCalls.push("/api/purchases/delete");
      var deleteBody = qaBody(init);
      var removed = documents.find(function (doc) { return String(doc.id) === String(deleteBody.documentId); });
      if (!removed) return Promise.resolve(qaJson({ ok: false, error: "Закупка не найдена" }, 404));
      if (removed.status === "confirmed") return Promise.resolve(qaJson({ ok: false, error: "Сначала отмените проведение" }, 409));
      if (activePayments(removed.id).length) return Promise.resolve(qaJson({ ok: false, error: "У закупки есть платежи" }, 409));
      documents = documents.filter(function (doc) { return String(doc.id) !== String(removed.id); });
      return Promise.resolve(qaJson(qaLifecyclePayload(null)));
    }
    if (url.indexOf("/api/purchases/cancel") >= 0 && init && init.method === "POST") {
      window.__bdProcurementQaLifecycleCalls.push("/api/purchases/cancel");
      var cancelBody = qaBody(init);
      var cancelIndex = documents.findIndex(function (doc) { return String(doc.id) === String(cancelBody.documentId); });
      if (cancelIndex < 0) return Promise.resolve(qaJson({ ok: false, error: "Закупка не найдена" }, 404));
      documents[cancelIndex] = Object.assign({}, documents[cancelIndex], {
        status: "cancelled",
        cancelledAt: "2026-08-12T12:00:00.000Z",
        cancellationReason: cancelBody.reason || "Проведение отменено пользователем",
        updatedAt: "2026-08-12T12:00:00.000Z",
      });
      return Promise.resolve(qaJson(Object.assign(qaLifecyclePayload(documents[cancelIndex]), {
        linkedPaymentsRequireReconciliation: activePayments(cancelBody.documentId).length > 0,
      })));
    }
    if (url.indexOf("/api/purchases/repost") >= 0 && init && init.method === "POST") {
      var repostBody = qaBody(init);
      var repostIndex = documents.findIndex(function (doc) { return String(doc.id) === String(repostBody.documentId); });
      if (repostIndex < 0) return Promise.resolve(qaJson({ ok: false, error: "Закупка не найдена" }, 404));
      documents[repostIndex] = Object.assign({}, documents[repostIndex], {
        status: "confirmed",
        cancelledAt: undefined,
        cancellationReason: undefined,
        confirmedAt: "2026-08-12T12:00:00.000Z",
        updatedAt: "2026-08-12T12:00:00.000Z",
      });
      return Promise.resolve(qaJson(qaLifecyclePayload(documents[repostIndex])));
    }
    if (url.indexOf("/api/purchases/payment/reverse") >= 0 && init && init.method === "POST") {
      window.__bdProcurementQaLifecycleCalls.push("/api/purchases/payment/reverse");
      var reverseBody = qaBody(init);
      var paymentIndex = expenses.findIndex(function (expense) { return String(expense.id) === String(reverseBody.paymentId); });
      if (paymentIndex < 0) return Promise.resolve(qaJson({ ok: false, error: "Платёж не найден" }, 404));
      expenses[paymentIndex] = Object.assign({}, expenses[paymentIndex], { status: "voided", reversedAt: "2026-08-12T12:00:00.000Z" });
      var reverseDocument = documents.find(function (doc) { return String(doc.id) === String(expenses[paymentIndex].sourceDocumentId); });
      return Promise.resolve(qaJson(Object.assign(qaLifecyclePayload(reverseDocument), { payment: expenses[paymentIndex] })));
    }
    if (url.indexOf("/api/purchases/payment") >= 0 && init && init.method === "POST") {
      var paymentBody = qaBody(init);
      var paymentDocument = documents.find(function (doc) { return String(doc.id) === String(paymentBody.purchaseId || paymentBody.documentId); });
      if (!paymentDocument) return Promise.resolve(qaJson({ ok: false, error: "Закупка не найдена" }, 404));
      var paymentAmount = Math.round(Number(paymentBody.amount || 0) * 100) / 100;
      var alreadyPaid = activePayments(paymentDocument.id).reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0);
      var due = Math.max(0, Number(paymentDocument.total || 0) - alreadyPaid);
      if (!(paymentAmount > 0) || paymentAmount > due + 0.005) return Promise.resolve(qaJson({ ok: false, error: "Сумма оплаты больше остатка" }, 409));
      var paymentKey = paymentBody.idempotencyKey || init.headers && (init.headers["Idempotency-Key"] || init.headers["idempotency-key"]) || "qa-payment-" + Date.now();
      var duplicate = expenses.find(function (expense) { return expense.idempotencyKey === paymentKey; });
      if (!duplicate) {
        duplicate = {
          id: "purchase-payment:" + String(paymentKey).replace(/[^a-zA-Z0-9-]/g, "").slice(-60),
          venueId: venueId,
          date: paymentBody.date || "2026-08-12",
          category: paymentDocument.expenseCategory,
          amount: paymentAmount,
          currency: paymentDocument.currency || "RUB",
          description: "Оплата поставщику · " + paymentDocument.supplierName,
          supplierId: paymentDocument.supplierId,
          supplierName: paymentDocument.supplierName,
          purchaseId: paymentDocument.id,
          sourceDocumentId: paymentDocument.id,
          source: "purchase_payment",
          paymentKind: "supplier_payment",
          paymentMethod: paymentBody.paymentMethod || "unknown",
          moneySourceName: paymentBody.moneySourceName || "Источник не указан",
          note: paymentBody.note || undefined,
          status: "posted",
          idempotencyKey: paymentKey,
          createdAt: "2026-08-12T12:00:00.000Z",
        };
        expenses.unshift(duplicate);
      }
      var paymentPayload = qaLifecyclePayload(paymentDocument);
      paymentPayload.payment = duplicate;
      paymentPayload.duplicate = Boolean(expenses.filter(function (row) { return row.idempotencyKey === paymentKey; }).length > 1);
      return Promise.resolve(qaJson(paymentPayload, 201));
    }
    if (url.indexOf("/api/procurement/overview") >= 0) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, venueId: venueId, generatedAt: "2026-08-12T12:00:00.000Z", analytics: analyticsForVenue() }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } }));
    }
    if (url.indexOf("/api/access/active-venue") >= 0 && init && init.method === "POST") {
      var body = {};
      try { body = JSON.parse(init.body || "{}"); } catch { body = {}; }
      var next = Number(body.venueId) || venueId;
      return Promise.resolve(new Response(JSON.stringify({ ok: true, activeVenueId: next, activeWorkspaceId: "qa-procurement-workspace", activeVenueIsPrimary: next === 401, role: "owner", permissions: permissions }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    return originalFetch(input, init);
  };
})();
