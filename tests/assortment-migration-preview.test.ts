import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAssortmentMigrationPreview } from "../lib/bardoctor/assortment-migration-preview";

test("migration preview is read-only, deduplicates supplier lines and excludes services/menu", () => {
  const preview = buildAssortmentMigrationPreview({
    venueId: 1,
    serverAssortmentExists: false,
    suppliers: [{ id: "supplier-1", name: "Поставщик" }],
    stockMovements: [{
      id: "movement-1", venueId: 1, productKey: "milk-1l", productName: "Молоко 1 л", unit: "ml",
      amount: 1_000, sourceDocumentId: "purchase-1", date: "2026-08-01",
    }],
    purchases: [{
      id: "purchase-1", venueId: 1, status: "confirmed", supplierId: "supplier-1", supplierName: "Поставщик",
      expenseCategory: "food", items: [
        { id: "line-1", rawName: "Молоко 1 л", quantity: 1, unit: "шт.", packageSize: "1 л", purchaseProductKey: "milk-1l" },
        { id: "line-2", rawName: "Сахар 1 кг", quantity: 2, unit: "шт.", packageSize: "1 кг" },
      ],
    }, {
      id: "purchase-2", venueId: 1, status: "confirmed", supplierId: "supplier-1", supplierName: "Поставщик",
      expenseCategory: "food", items: [{ id: "line-3", rawName: "Сахар 1 кг", quantity: 1, unit: "шт.", packageSize: "1 кг" }],
    }, {
      id: "purchase-3", venueId: 1, status: "confirmed", supplierName: "Подрядчик",
      expenseCategory: "repairs", items: [{ id: "line-4", rawName: "Ремонт холодильника", quantity: 1, unit: "усл." }],
    }],
    legacyMenuObservation: { items: 183, source: "client_fallback" },
  });
  assert.equal(preview.writesPerformed, 0);
  assert.equal(preview.sources.purchaseSupplierLines, 4);
  assert.equal(preview.sources.legacyMenuUsed, false);
  assert.equal(preview.proposal.proposedStore.menuItems.length, 0);
  assert.equal(preview.proposal.proposedStore.stockBalances.length, 0);
  assert.equal(preview.proposal.statusCounts.SAFE_AUTO_CREATE, 2);
  assert.equal(preview.proposal.statusCounts.NOT_A_STOCK_ITEM, 1);
  assert.equal(preview.duplicates.exactDuplicateSupplierLines, 1);
  assert.equal(preview.excluded.count, 1);
  assert.equal(preview.impactIfLaterApproved.existingPurchasesChanged, 0);
});

test("same name with conflicting package is review-only", () => {
  const preview = buildAssortmentMigrationPreview({
    venueId: 1,
    serverAssortmentExists: false,
    suppliers: [],
    stockMovements: [],
    purchases: [{
      id: "purchase", venueId: 1, status: "confirmed", expenseCategory: "products", items: [
        { id: "small", rawName: "Coca Cola", quantity: 1, unit: "шт.", packageSize: "0,5 л" },
        { id: "large", rawName: "Coca Cola", quantity: 1, unit: "шт.", packageSize: "1 л" },
      ],
    }],
  });
  assert.equal(preview.proposal.reviewPositions, 2);
  assert.equal(preview.proposal.safePositions, 0);
  assert.equal(preview.verdict, "MIGRATION NEEDS REVIEW");
});

test("existing authoritative assortment blocks creation counts until reconciliation", () => {
  const preview = buildAssortmentMigrationPreview({
    venueId: 1,
    serverAssortmentExists: true,
    suppliers: [],
    stockMovements: [],
    purchases: [],
  });
  assert.equal(preview.verdict, "MIGRATION NEEDS REVIEW");
  assert.equal(preview.impactIfLaterApproved.canonicalPositionsCreated, null);
  assert.deepEqual(preview.blockers, [{ code: "EXISTING_ASSORTMENT_REQUIRES_RECONCILIATION", count: 1 }]);
});

test("missing production source stores cannot produce a false SAFE verdict", () => {
  const preview = buildAssortmentMigrationPreview({
    venueId: 1,
    serverAssortmentExists: false,
    suppliers: [],
    stockMovements: [],
    purchases: [],
    sourceStorePresence: {
      purchases: false,
      suppliers: false,
      stockMovements: false,
      assortment: false,
    },
    legacyMenuObservation: { items: 183, source: "production_ui_client_boundary" },
  });
  assert.equal(preview.verdict, "MIGRATION NEEDS REVIEW");
  assert.deepEqual(preview.blockers, [
    { code: "PURCHASE_SOURCE_STORE_MISSING", count: 1 },
    { code: "STOCK_MOVEMENT_SOURCE_STORE_MISSING", count: 1 },
    { code: "SUPPLIER_SOURCE_STORE_MISSING", count: 1 },
    { code: "NO_SERVER_PRODUCT_IDENTITY_ROWS", count: 1 },
  ]);
  assert.equal(preview.sources.legacyMenuUsed, false);
  assert.equal(preview.writesPerformed, 0);
});

test("production preview route is owner-scoped and contains no persistence statement", async () => {
  const source = await readFile(new URL("../app/migration-preview/route.ts", import.meta.url), "utf8");
  assert.match(source, /getChatGPTEmail\(request\)/);
  assert.match(source, /findAccountByAppEmail\(chatgptEmail\)/);
  assert.match(source, /venueContextForAccount\(identity!, KOLN_VENUE_ID\)/);
  assert.match(source, /candidate\?\.role === "owner"/);
  assert.match(source, /candidate\.venue\.id === KOLN_VENUE_ID && candidate\.dataAccount\.id === KOLN_DATA_ACCOUNT_ID/);
  assert.doesNotMatch(source, /rememberActiveVenueForRequest/);
  assert.match(source, /SELECT store_key, data_json/);
  assert.match(source, /KOLN_ASSORTMENT_MIGRATION_PREVIEW/);
  assert.doesNotMatch(source, /\b(?:INSERT\s+INTO|UPDATE\s+domain_data|DELETE\s+FROM|REPLACE\s+INTO)\b/i);
});
