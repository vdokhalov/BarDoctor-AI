import test from "node:test";
import assert from "node:assert/strict";
import {
  cancelSalesDraft,
  createOrUpdateSalesBatch as createSalesBatch,
  manualSalesAdapter,
  postSalesBatch,
  protectedSalesBatchMutations,
  reverseSalesBatch,
  salesBatches,
  salesDataQuality,
  tabularSalesAdapter,
  textSalesAdapter,
  upsertSalesMapping,
} from "../lib/bardoctor/sales-consumption";
import { hasPermission, permissionsFor } from "../lib/bardoctor/access-control";

const actor = { accountId: 7, name: "Owner", role: "owner" };

const costingReceipts = [
  { id: "receipt-rum", venueId: 1, type: "receipt", date: "2026-08-20", productKey: "rum", productName: "Rum", amount: 10_000, unit: "ml", costAmount: 500, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-rum", sourceLineId: "line-rum", createdAt: "2026-08-20T10:00:00.000Z", status: "active" },
  { id: "receipt-syrup", venueId: 1, type: "receipt", date: "2026-08-20", productKey: "syrup", productName: "Syrup", amount: 5_000, unit: "ml", costAmount: 100, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-syrup", sourceLineId: "line-syrup", createdAt: "2026-08-20T10:00:00.000Z", status: "active" },
  { id: "receipt-lime", venueId: 1, type: "receipt", date: "2026-08-20", productKey: "lime", productName: "Lime", amount: 50, unit: "pcs", costAmount: 400, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-lime", sourceLineId: "line-lime", createdAt: "2026-08-20T10:00:00.000Z", status: "active" },
  { id: "receipt-cola", venueId: 1, type: "receipt", date: "2026-08-20", productKey: "stock-cola-125", productName: "Coca-Cola 1,25 л", amount: 12, unit: "pcs", costAmount: 480, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-cola", sourceLineId: "line-cola", createdAt: "2026-08-20T10:00:00.000Z", status: "active" },
] as const;

function createOrUpdateSalesBatch(input: Parameters<typeof createSalesBatch>[0]) {
  return createSalesBatch({ ...input, stockMovements: input.stockMovements ?? [...costingReceipts] });
}

type FixtureAssortment = {
  menuItems: Array<Record<string, unknown>>;
  recipes: Array<Record<string, unknown>>;
  stockBalances: Array<Record<string, unknown>>;
  warehouses?: Array<Record<string, unknown>>;
};

function assortment(): FixtureAssortment {
  return {
    menuItems: [
      { id: "mojito", name: "Мохито", department: "bar", active: true, venueId: 1 },
      { id: "water", name: "Боржоми 0.5", department: "bar", active: true, venueId: 1 },
    ],
    recipes: [{
      id: "recipe-mojito-v3",
      menuItemId: "mojito",
      ownerId: "mojito",
      status: "confirmed",
      reviewStatus: "approved",
      current: true,
      version: 3,
      ingredients: [
        { id: "rum-line", name: "Rum", quantity: 50, unit: "ml", purchaseProductKey: "rum" },
        { id: "syrup-line", name: "Syrup", quantity: 20, unit: "ml", purchaseProductKey: "syrup" },
        { id: "lime-line", name: "Lime", quantity: 0.5, unit: "pcs", purchaseProductKey: "lime" },
      ],
    }],
    stockBalances: [
      { id: "rum", key: "rum", productKey: "rum", name: "Rum", venueId: 1, current: 10_000, unit: "ml", averageUnitCost: 0.05, inventoryValue: 500, currency: "RUB" },
      { id: "syrup", key: "syrup", productKey: "syrup", name: "Syrup", venueId: 1, current: 5_000, unit: "ml", averageUnitCost: 0.02, inventoryValue: 100, currency: "RUB" },
      { id: "lime", key: "lime", productKey: "lime", name: "Lime", venueId: 1, current: 50, unit: "pcs", averageUnitCost: 8, inventoryValue: 400, currency: "RUB" },
    ],
  };
}

function draft(quantity = 2) {
  return manualSalesAdapter.parse({
    businessDate: "2026-08-24",
    lines: [{ id: "sale-line", rawName: "Мохито", menuItemId: "mojito", quantity }],
  });
}

test("Mojito quantity explodes through the canonical recipe and snapshots v3", () => {
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: draft(2), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor,
    now: "2026-08-24T18:00:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const line = saved.batch.lines[0];
  assert.equal(saved.batch.status, "READY");
  assert.equal(line.recipeVersionId, "recipe-mojito-v3:v3");
  assert.deepEqual(line.recipeSnapshot?.ingredients.map((item) => item.baseQuantityTotal), [100, 40, 1]);
  assert.equal(line.theoreticalCost, 13.8);
});

test("ready product consumes one linked canonical package without a fake recipe", () => {
  const source = assortment();
  source.menuItems.push({
    id: "cola-125",
    name: "Кола 1,25 л",
    department: "bar",
    type: "ready",
    active: true,
    venueId: 1,
    readyProduct: {
      nomenclatureItemId: "stock-cola-125",
      productKey: "stock-cola-125",
      packageLabel: "1,25 л",
      packagesPerSale: 1,
    },
  });
  source.stockBalances.push({
    id: "stock-cola-125",
    key: "stock-cola-125",
    productKey: "stock-cola-125",
    name: "Coca-Cola 1,25 л",
    venueId: 1,
    current: 12,
    unit: "pcs",
    packageSize: "1,25 л",
    averageUnitCost: 40,
    inventoryValue: 480,
    currency: "RUB",
  });
  const readyDraft = manualSalesAdapter.parse({
    businessDate: "2026-08-24",
    lines: [{ id: "cola-line", rawName: "Кола 1,25 л", menuItemId: "cola-125", quantity: 2 }],
  });
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: readyDraft, assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor,
    now: "2026-08-24T18:00:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const line = saved.batch.lines[0];
  assert.equal(line.processingStatus, "READY");
  assert.equal(line.recipeSnapshot?.consumptionMode, "DIRECT_ITEM");
  assert.equal(line.recipeSnapshot?.ingredients[0].baseQuantityTotal, 2);
  assert.equal(line.theoreticalCost, 80);

  const posted = postSalesBatch({
    batches: saved.batches,
    batchId: saved.batch.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const colaBalance = (posted.assortment.stockBalances as Array<Record<string, unknown>>)
    .find((balance) => balance.productKey === "stock-cola-125");
  assert.equal(colaBalance?.current, 10);
  assert.equal(posted.stockMovements.find((movement) => movement.productKey === "stock-cola-125")?.amount, -2);
});

test("explicit nomenclature ID fails closed when a later duplicate balance could win posting", () => {
  const source = assortment();
  source.menuItems.push({
    id: "ambiguous-ready",
    name: "Ambiguous ready product",
    department: "bar",
    active: true,
    venueId: 1,
    consumptionMode: "DIRECT_ITEM",
    readyProduct: {
      nomenclatureItemId: "nom-ambiguous-ready",
      productKey: "ambiguous-stock",
      packagesPerSale: 1,
    },
  });
  (source as FixtureAssortment & { nomenclature: Array<Record<string, unknown>> }).nomenclature = [{
    id: "nom-ambiguous-ready",
    nomenclatureItemId: "nom-ambiguous-ready",
    productKey: "ambiguous-stock",
    name: "Selected canonical row",
    venueId: 1,
    active: true,
    unit: "pcs",
  }];
  source.stockBalances.push(
    {
      id: "selected-balance",
      nomenclatureItemId: "nom-ambiguous-ready",
      key: "ambiguous-stock",
      productKey: "ambiguous-stock",
      name: "Selected balance",
      venueId: 1,
      current: 10,
      unit: "pcs",
    },
    {
      id: "last-wins-balance",
      key: "ambiguous-stock",
      productKey: "ambiguous-stock",
      name: "Conflicting later balance",
      venueId: 1,
      current: 99,
      unit: "pcs",
    },
  );
  const saved = createOrUpdateSalesBatch({
    batches: [],
    draft: manualSalesAdapter.parse({
      businessDate: "2026-08-24",
      lines: [{ id: "ambiguous-line", rawName: "Ambiguous ready product", menuItemId: "ambiguous-ready", quantity: 1 }],
    }),
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.batch.lines[0].processingStatus, "BLOCKED");
  assert.equal(saved.batch.lines[0].errorCode, "INGREDIENT_NOMENCLATURE_REQUIRED");
  const frozen = JSON.stringify(source.stockBalances);
  const posted = postSalesBatch({
    batches: saved.batches,
    batchId: saved.batch.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(posted.ok, false);
  assert.equal(JSON.stringify(source.stockBalances), frozen);
});

test("posting revalidates a saved snapshot and never debits an inactive balance", () => {
  const source = assortment() as FixtureAssortment & { nomenclature: Array<Record<string, unknown>> };
  source.menuItems.push({
    id: "inactive-ready",
    name: "Inactive ready product",
    department: "bar",
    active: true,
    venueId: 1,
    consumptionMode: "DIRECT_ITEM",
    readyProduct: {
      nomenclatureItemId: "nom-inactive-ready",
      productKey: "inactive-stock",
      packagesPerSale: 1,
    },
  });
  source.nomenclature = [{
    id: "nom-inactive-ready",
    productKey: "inactive-stock",
    name: "Canonical active item",
    unit: "pcs",
    venueId: 1,
    active: true,
  }];
  source.stockBalances.push({
    id: "balance-inactive-ready",
    nomenclatureItemId: "nom-inactive-ready",
    productKey: "inactive-stock",
    name: "Canonical active item",
    venueId: 1,
    active: true,
    current: 10,
    unit: "pcs",
  });
  const saved = createOrUpdateSalesBatch({
    batches: [],
    draft: manualSalesAdapter.parse({
      businessDate: "2026-08-24",
      lines: [{ id: "inactive-line", rawName: "Inactive ready product", menuItemId: "inactive-ready", quantity: 1 }],
    }),
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.batch.lines[0].processingStatus, "READY");

  const inactiveBalance = source.stockBalances.find((item) => item.productKey === "inactive-stock")!;
  inactiveBalance.active = false;
  const frozen = JSON.stringify(source);
  const posted = postSalesBatch({
    batches: JSON.parse(JSON.stringify(saved.batches)),
    batchId: saved.batch.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(posted.ok, false);
  assert.equal(!posted.ok ? posted.code : null, "SALES_BATCH_BLOCKED");
  assert.equal(JSON.stringify(source), frozen);
  assert.equal(inactiveBalance.current, 10);
});

test("posting updates balances, emits SALE_CONSUMPTION lineage and is idempotent", () => {
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: draft(10), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor,
    now: "2026-08-24T18:00:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const posted = postSalesBatch({
    batches: saved.batches, batchId: saved.batch.id, assortment: assortment(), mappings: [], warehouseRoutes: [],
    stockMovements: [], venueId: 1, actor, now: "2026-08-24T18:01:00.000Z",
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  assert.equal(posted.batch.status, "POSTED");
  assert.equal(posted.stockMovements.length, 3);
  assert.ok(posted.stockMovements.every((movement) => movement.type === "sale_consumption"));
  assert.ok(posted.stockMovements.every((movement) => movement.salesBatchId === saved.batch.id));
  assert.deepEqual(
    (posted.assortment.stockBalances as Array<{ current: number }>).map((item) => item.current),
    [9_500, 4_800, 45],
  );

  const second = postSalesBatch({
    batches: posted.batches, batchId: saved.batch.id, assortment: posted.assortment, mappings: [], warehouseRoutes: [],
    stockMovements: posted.stockMovements, venueId: 1, actor, now: "2026-08-24T18:02:00.000Z",
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.idempotent, true);
  assert.equal(second.stockMovements.length, 3);
});

test("recipe changes after posting do not mutate historical snapshot or movements", () => {
  const source = assortment();
  const saved = createOrUpdateSalesBatch({ batches: [], draft: draft(1), assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const posted = postSalesBatch({ batches: saved.batches, batchId: saved.batch.id, assortment: source, mappings: [], warehouseRoutes: [], stockMovements: [], venueId: 1, actor });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const recipes = source.recipes as Array<{ ingredients: Array<{ quantity: number }> }>;
  recipes[0].ingredients[0].quantity = 45;
  const rum = posted.stockMovements.find((movement) => movement.productKey === "rum");
  assert.equal(rum?.amount, -50);
  const movementSnapshot = rum?.recipeSnapshot as { ingredients: Array<{ recipeQuantity: number }> };
  assert.equal(movementSnapshot.ingredients[0].recipeQuantity, 50);
  assert.equal(posted.batch.lines[0].recipeSnapshot?.ingredients[0].recipeQuantity, 50);
});

test("partially posted batches lock historical header context but keep unposted lines and notes editable", () => {
  const source = assortment();
  const initialDraft = manualSalesAdapter.parse({
    businessDate: "2026-08-24",
    lines: [
      { id: "posted-line", rawName: "Мохито", menuItemId: "mojito", quantity: 1 },
      { id: "blocked-line", rawName: "Unknown", quantity: 1 },
    ],
  });
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: initialDraft, assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const posted = postSalesBatch({
    batches: saved.batches,
    batchId: saved.batch.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  assert.equal(posted.batch.status, "PARTIALLY_BLOCKED");
  const persistedBatches = JSON.parse(JSON.stringify(posted.batches)) as unknown[];
  const frozenMovements = JSON.stringify(posted.stockMovements);
  const immutableLine = posted.batch.lines.find((line) => line.id === "posted-line");
  assert.equal(immutableLine?.processingStatus, "POSTED");
  const immutablePersistedLine = JSON.parse(JSON.stringify(immutableLine));

  const baseUpdate = manualSalesAdapter.parse({
    businessDate: posted.batch.businessDate,
    lines: [
      { id: "posted-line", rawName: "Tampered name", menuItemId: "water", quantity: 99 },
      { id: "blocked-line", rawName: "Мохито", menuItemId: "mojito", quantity: 2 },
    ],
    notes: "Allowed operational note",
  });
  for (const mutate of [
    (value: typeof baseUpdate) => { value.businessDate = "2026-08-25"; },
    (value: typeof baseUpdate) => { value.source = "OTHER_API"; },
    (value: typeof baseUpdate) => { value.externalBatchId = "changed-external-id"; },
    (value: typeof baseUpdate) => { value.shiftId = "changed-shift"; },
    (value: typeof baseUpdate) => { value.sourceReference = "changed-source"; },
  ]) {
    const draftUpdate = structuredClone(baseUpdate);
    mutate(draftUpdate);
    const rejected = createOrUpdateSalesBatch({
      batches: persistedBatches,
      batchId: posted.batch.id,
      draft: draftUpdate,
      assortment: posted.assortment,
      mappings: [],
      warehouseRoutes: [],
      stockMovements: posted.stockMovements,
      venueId: 1,
      actor,
    });
    assert.equal(rejected.ok, false);
    assert.equal(!rejected.ok ? rejected.code : null, "SALES_BATCH_HISTORY_LOCKED");
  }

  const allowed = createOrUpdateSalesBatch({
    batches: persistedBatches,
    batchId: posted.batch.id,
    draft: baseUpdate,
    assortment: posted.assortment,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: posted.stockMovements,
    venueId: 1,
    actor,
  });
  assert.equal(allowed.ok, true);
  if (!allowed.ok) return;
  assert.equal(allowed.batch.notes, "Allowed operational note");
  assert.equal(allowed.batch.lines.find((line) => line.id === "blocked-line")?.processingStatus, "READY");
  assert.deepEqual(allowed.batch.lines.find((line) => line.id === "posted-line"), immutablePersistedLine);
  assert.equal(JSON.stringify(posted.stockMovements), frozenMovements);
});

test("reversal creates immutable compensating movements and restores stock", () => {
  const saved = createOrUpdateSalesBatch({ batches: [], draft: draft(10), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const posted = postSalesBatch({ batches: saved.batches, batchId: saved.batch.id, assortment: assortment(), mappings: [], warehouseRoutes: [], stockMovements: [], venueId: 1, actor });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const reversed = reverseSalesBatch({ batches: posted.batches, batchId: saved.batch.id, assortment: posted.assortment, stockMovements: posted.stockMovements, venueId: 1, actor });
  assert.equal(reversed.ok, true);
  if (!reversed.ok) return;
  assert.equal(reversed.batch.status, "REVERSED");
  assert.equal(reversed.stockMovements.length, 6);
  assert.equal(reversed.stockMovements.filter((movement) => movement.type === "sale_reversal").length, 3);
  assert.deepEqual(
    (reversed.assortment.stockBalances as Array<{ current: number }>).map((item) => item.current),
    [10_000, 5_000, 50],
  );
  assert.ok(reversed.stockMovements.filter((movement) => movement.type === "sale_reversal").every((movement) => movement.originalMovementId));
});

test("persisted reversal fails closed before a same-venue balance collision can restore an arbitrary row", () => {
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: draft(1), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const posted = postSalesBatch({
    batches: saved.batches,
    batchId: saved.batch.id,
    assortment: assortment(),
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;

  const persistedBatches = JSON.parse(JSON.stringify(posted.batches)) as unknown[];
  const persistedAssortment = JSON.parse(JSON.stringify(posted.assortment)) as FixtureAssortment;
  const persistedMovements = JSON.parse(JSON.stringify(posted.stockMovements)) as unknown[];
  persistedAssortment.stockBalances.push({
    id: "legacy-duplicate-rum",
    productKey: "rum",
    name: "Wrong duplicate row",
    venueId: 1,
    current: 777,
    unit: "ml",
  });
  const frozenAssortment = JSON.stringify(persistedAssortment);
  const frozenMovements = JSON.stringify(persistedMovements);

  const reversed = reverseSalesBatch({
    batches: persistedBatches,
    batchId: posted.batch.id,
    assortment: persistedAssortment,
    stockMovements: persistedMovements,
    venueId: 1,
    actor,
  });
  assert.equal(reversed.ok, false);
  assert.equal(!reversed.ok ? reversed.code : null, "DUPLICATE_BALANCE_IDENTITY");
  assert.equal(JSON.stringify(persistedAssortment), frozenAssortment);
  assert.equal(JSON.stringify(persistedMovements), frozenMovements);
});

test("posting and reversal idempotency never collide across venues", () => {
  const source = assortment();
  const batchId = "shared-venue-batch";
  const saved = createOrUpdateSalesBatch({
    batches: [],
    batchId,
    draft: draft(1),
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
    now: "2026-08-24T18:00:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;

  const foreignCollision = {
    id: "foreign-consumption",
    venueId: 2,
    type: "sale_consumption",
    salesBatchId: batchId,
    salesBatchLineId: "sale-line",
    productKey: "foreign-product",
    amount: -999,
    unit: "pcs",
    idempotencyKey: `sale-consumption:${batchId}:sale-line:rum-line`,
    status: "active",
  };
  const posted = postSalesBatch({
    batches: saved.batches,
    batchId,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [foreignCollision],
    venueId: 1,
    actor,
    now: "2026-08-24T18:01:00.000Z",
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  assert.equal(posted.stockChanged, true);
  assert.equal(posted.stockMovements.filter((movement) => movement.venueId === 1 && movement.type === "sale_consumption").length, 3);
  assert.ok(posted.stockMovements
    .filter((movement) => movement.venueId === 1 && movement.type === "sale_consumption")
    .every((movement) => movement.idempotencyKey?.startsWith("sale-consumption:1:")));
  assert.deepEqual(
    (posted.assortment.stockBalances as Array<{ current: number }>).map((item) => item.current),
    [9_950, 4_980, 49.5],
  );

  const localOriginal = posted.stockMovements.find((movement) =>
    movement.venueId === 1 && movement.type === "sale_consumption"
  );
  assert.ok(localOriginal);
  const foreignReversalCollision = {
    ...foreignCollision,
    id: "foreign-reversal",
    type: "sale_reversal",
    originalMovementId: localOriginal?.id,
    idempotencyKey: `sale-reversal:${localOriginal?.id}`,
  };
  const reversed = reverseSalesBatch({
    batches: posted.batches,
    batchId,
    assortment: posted.assortment,
    stockMovements: [foreignReversalCollision, ...posted.stockMovements],
    venueId: 1,
    actor,
    now: "2026-08-24T18:02:00.000Z",
  });
  assert.equal(reversed.ok, true);
  if (!reversed.ok) return;
  assert.equal(reversed.stockChanged, true);
  assert.equal(reversed.stockMovements.filter((movement) => movement.venueId === 1 && movement.type === "sale_reversal").length, 3);
  assert.deepEqual(
    (reversed.assortment.stockBalances as Array<{ current: number }>).map((item) => item.current),
    [10_000, 5_000, 50],
  );
});

test("sales lifecycle preserves foreign venue batches and balances byte-for-byte", () => {
  const source = assortment();
  const foreignBalance = {
    id: "foreign-balance",
    key: "foreign-product",
    productKey: "foreign-product",
    name: "Foreign venue stock",
    venueId: 2,
    current: 99,
    unit: "pcs",
    warehouseBalances: { "foreign-warehouse": { current: 99, marker: "keep" } },
    marker: { untouched: true },
  };
  source.stockBalances.push(foreignBalance);
  const foreignBatch = {
    id: "foreign-batch",
    venueId: 2,
    businessDate: "2026-08-23",
    source: "MANUAL_GRID",
    status: "POSTED",
    createdBy: { accountId: 99, name: "Foreign", role: "owner" },
    createdAt: "2026-08-23T10:00:00.000Z",
    updatedAt: "2026-08-23T10:01:00.000Z",
    lines: [{ id: "foreign-line", processingStatus: "POSTED", marker: { untouched: true } }],
    movementIds: ["foreign-movement"],
    reversalMovementIds: [],
    marker: { untouched: true },
  };
  const assertForeignBatch = (values: unknown[]) => {
    assert.deepEqual(
      values.find((value) => (value as { id?: string }).id === foreignBatch.id),
      foreignBatch,
    );
  };
  const assertForeignBalance = (value: unknown) => {
    const values = (value as { stockBalances?: unknown[] }).stockBalances ?? [];
    assert.deepEqual(
      values.find((balance) => (balance as { id?: string }).id === foreignBalance.id),
      foreignBalance,
    );
  };

  const created = createOrUpdateSalesBatch({
    batches: [foreignBatch], draft: draft(1), assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assertForeignBatch(created.batches);

  const updated = createOrUpdateSalesBatch({
    batches: created.batches, batchId: created.batch.id, draft: draft(2), assortment: source,
    mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assertForeignBatch(updated.batches);

  const posted = postSalesBatch({
    batches: updated.batches, batchId: updated.batch.id, assortment: source, mappings: [], warehouseRoutes: [],
    stockMovements: [...costingReceipts], venueId: 1, actor,
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  assertForeignBatch(posted.batches);
  assertForeignBalance(posted.assortment);

  const reversed = reverseSalesBatch({
    batches: posted.batches, batchId: posted.batch.id, assortment: posted.assortment,
    stockMovements: posted.stockMovements, venueId: 1, actor,
  });
  assert.equal(reversed.ok, true);
  if (!reversed.ok) return;
  assertForeignBatch(reversed.batches);
  assertForeignBalance(reversed.assortment);

  const cancellable = createOrUpdateSalesBatch({
    batches: reversed.batches,
    draft: manualSalesAdapter.parse({
      businessDate: "2026-08-25",
      lines: [{ id: "cancel-line", rawName: "Мохито", menuItemId: "mojito", quantity: 1 }],
    }),
    assortment: reversed.assortment, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(cancellable.ok, true);
  if (!cancellable.ok) return;
  assertForeignBatch(cancellable.batches);
  const cancelled = cancelSalesDraft({
    batches: cancellable.batches, batchId: cancellable.batch.id, venueId: 1,
  });
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) return;
  assertForeignBatch(cancelled.batches);
});

test("persistent venue/source mapping resolves a raw line but never crosses venues", () => {
  const mapped = upsertSalesMapping({ mappings: [], venueId: 1, source: "TEXT_IMPORT", rawName: "MOHITO CLASS", menuItemId: "mojito", actorAccountId: 7 });
  const parsed = textSalesAdapter.parse({ text: "MOHITO CLASS 2", businessDate: "2026-08-24" });
  const saved = createOrUpdateSalesBatch({ batches: [], draft: parsed, assortment: assortment(), mappings: mapped.mappings, warehouseRoutes: [], venueId: 1, actor });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.batch.lines[0].menuItemId, "mojito");
  assert.equal(saved.batch.lines[0].processingStatus, "READY");

  const otherVenue = createOrUpdateSalesBatch({ batches: [], draft: parsed, assortment: { ...assortment(), menuItems: [] }, mappings: mapped.mappings, warehouseRoutes: [], venueId: 2, actor });
  assert.equal(otherVenue.ok, true);
  if (!otherVenue.ok) return;
  assert.equal(otherVenue.batch.lines[0].processingStatus, "BLOCKED");
});

test("unknown mapping, missing recipe and missing nomenclature never create false movements", () => {
  const unknown = createOrUpdateSalesBatch({
    batches: [], draft: textSalesAdapter.parse({ text: "Неизвестный коктейль 3" }), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(unknown.ok, true);
  if (!unknown.ok) return;
  assert.equal(unknown.batch.lines[0].errorCode, "NEEDS_MAPPING");
  const blockedPost = postSalesBatch({ batches: unknown.batches, batchId: unknown.batch.id, assortment: assortment(), mappings: [], warehouseRoutes: [], stockMovements: [], venueId: 1, actor });
  assert.equal(blockedPost.ok, false);

  const noRecipeSource = assortment();
  noRecipeSource.menuItems[0].consumptionMode = "RECIPE";
  noRecipeSource.recipes = [];
  const noRecipe = createOrUpdateSalesBatch({ batches: [], draft: draft(), assortment: noRecipeSource, mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(noRecipe.ok, true);
  if (!noRecipe.ok) return;
  assert.equal(noRecipe.batch.lines[0].errorCode, "NO_RECIPE");

  const noNomenclature = assortment();
  noNomenclature.stockBalances = noNomenclature.stockBalances.filter((item) => item.productKey !== "lime");
  const missing = createOrUpdateSalesBatch({ batches: [], draft: draft(), assortment: noNomenclature, mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(missing.ok, true);
  if (!missing.ok) return;
  assert.equal(missing.batch.lines[0].errorCode, "INGREDIENT_NOMENCLATURE_REQUIRED");
  assert.equal(salesDataQuality(missing.batches, 1).affectedLineCount, 1);
});

test("warehouse routing uses department mapping and blocks ambiguous multi-warehouse setup", () => {
  const source = assortment();
  source.warehouses = [
    { id: "bar-wh", name: "Бар", venueId: 1, active: true },
    { id: "kitchen-wh", name: "Кухня", venueId: 1, active: true },
  ];
  const blocked = createOrUpdateSalesBatch({ batches: [], draft: draft(), assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(blocked.ok, true);
  if (!blocked.ok) return;
  assert.equal(blocked.batch.lines[0].errorCode, "WAREHOUSE_MAPPING_REQUIRED");
  const routed = createOrUpdateSalesBatch({
    batches: [], draft: draft(), assortment: source, mappings: [],
    warehouseRoutes: [{ id: "route", venueId: 1, department: "bar", warehouseId: "bar-wh", active: true, createdAt: "", updatedAt: "" }],
    venueId: 1, actor,
  });
  assert.equal(routed.ok, true);
  if (!routed.ok) return;
  assert.equal(routed.batch.lines[0].recipeSnapshot?.ingredients[0].warehouseId, "bar-wh");
});

test("text and file adapters normalize common formats and ignore totals", () => {
  const textDraft = textSalesAdapter.parse({ text: "Мохито 10\n12 x Боржоми 0.5\nAperol - 9" });
  assert.deepEqual(textDraft.lines.map((line) => [line.rawName, line.quantity]), [
    ["Мохито", 10], ["Боржоми 0.5", 12], ["Aperol", 9],
  ]);
  const fileDraft = tabularSalesAdapter({
    rows: [["Название", "Продано"], ["Мохито", "4"], ["Итого", "4"]], nameColumn: 0, quantityColumn: 1, headerRow: 0,
  });
  assert.equal(fileDraft.lines.length, 1);
  assert.equal(fileDraft.lines[0].quantity, 4);
});

test("sales batches are strictly filtered by venue", () => {
  const venueA = createOrUpdateSalesBatch({ batches: [], draft: draft(), assortment: assortment(), mappings: [], warehouseRoutes: [], venueId: 1, actor });
  assert.equal(venueA.ok, true);
  if (!venueA.ok) return;
  const foreign = { ...venueA.batch, id: "foreign", venueId: 2 };
  assert.deepEqual(salesBatches([venueA.batch, foreign], 1).map((batch) => batch.id), [venueA.batch.id]);
});

test("sales lifecycle rejects duplicate batch IDs inside one venue but preserves cross-venue identity", () => {
  const source = assortment();
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: draft(1), assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const sameVenueDuplicate = { ...structuredClone(saved.batch), notes: "ambiguous sibling" };
  const duplicateBatches = [saved.batch, sameVenueDuplicate];

  for (const result of [
    createOrUpdateSalesBatch({
      batches: duplicateBatches, batchId: saved.batch.id, draft: draft(2), assortment: source,
      mappings: [], warehouseRoutes: [], venueId: 1, actor,
    }),
    postSalesBatch({
      batches: duplicateBatches, batchId: saved.batch.id, assortment: source, mappings: [],
      warehouseRoutes: [], stockMovements: [], venueId: 1, actor,
    }),
    cancelSalesDraft({ batches: duplicateBatches, batchId: saved.batch.id, venueId: 1 }),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(!result.ok ? result.code : null, "DUPLICATE_SALES_BATCH_ID");
  }

  const posted = postSalesBatch({
    batches: saved.batches, batchId: saved.batch.id, assortment: source, mappings: [],
    warehouseRoutes: [], stockMovements: [], venueId: 1, actor,
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const rejectedReverse = reverseSalesBatch({
    batches: [posted.batch, { ...structuredClone(posted.batch), notes: "ambiguous posted sibling" }],
    batchId: posted.batch.id,
    assortment: posted.assortment,
    stockMovements: posted.stockMovements,
    venueId: 1,
    actor,
  });
  assert.equal(rejectedReverse.ok, false);
  assert.equal(!rejectedReverse.ok ? rejectedReverse.code : null, "DUPLICATE_SALES_BATCH_ID");

  const foreignSameId = { ...structuredClone(saved.batch), venueId: 2, notes: "foreign" };
  const crossVenueUpdate = createOrUpdateSalesBatch({
    batches: [saved.batch, foreignSameId], batchId: saved.batch.id, draft: draft(2), assortment: source,
    mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(crossVenueUpdate.ok, true);
  if (!crossVenueUpdate.ok) return;
  assert.deepEqual(
    crossVenueUpdate.batches.find((batch) => batch.venueId === 2 && batch.id === saved.batch.id),
    foreignSameId,
  );
});

test("sales snapshot lifecycle rejects duplicate active menu IDs only within the current venue", () => {
  const source = assortment();
  const duplicateMenu = structuredClone(source.menuItems[0]);
  duplicateMenu.name = "Ambiguous duplicate";
  source.menuItems.push(duplicateMenu);
  const rejectedCreate = createOrUpdateSalesBatch({
    batches: [], draft: draft(1), assortment: source, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(rejectedCreate.ok, false);
  assert.equal(!rejectedCreate.ok ? rejectedCreate.code : null, "DUPLICATE_MENU_ITEM_ID");

  const validSource = assortment();
  const saved = createOrUpdateSalesBatch({
    batches: [], draft: draft(1), assortment: validSource, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const rejectedPost = postSalesBatch({
    batches: saved.batches, batchId: saved.batch.id, assortment: source, mappings: [],
    warehouseRoutes: [], stockMovements: [], venueId: 1, actor,
  });
  assert.equal(rejectedPost.ok, false);
  assert.equal(!rejectedPost.ok ? rejectedPost.code : null, "DUPLICATE_MENU_ITEM_ID");

  const crossVenueSource = assortment();
  crossVenueSource.menuItems.push({ ...structuredClone(crossVenueSource.menuItems[0]), venueId: 2, name: "Foreign Mojito" });
  const allowed = createOrUpdateSalesBatch({
    batches: [], draft: draft(1), assortment: crossVenueSource, mappings: [], warehouseRoutes: [], venueId: 1, actor,
  });
  assert.equal(allowed.ok, true);
});

test("sales RBAC preserves owner wildcard and blocks restricted posting/reversal", () => {
  const ownerPermissions = permissionsFor("owner");
  for (const permission of ["sales.view", "sales.create", "sales.post", "sales.reverse", "sales.manage_mapping"] as const) {
    assert.equal(hasPermission({ role: "owner", permissions: ownerPermissions }, permission), true);
  }
  const restricted = permissionsFor("shift_manager", JSON.stringify({ deny: ["sales.post"], allow: [] }));
  assert.equal(restricted.includes("sales.view"), true);
  assert.equal(restricted.includes("sales.create"), true);
  assert.equal(restricted.includes("sales.post"), false);
  assert.equal(restricted.includes("sales.reverse"), false);
});

test("generic store guard preserves immutable sales history and leaves drafts editable", () => {
  type GuardBatch = {
    id: string;
    venueId: number;
    status: string;
    lines: Array<Record<string, unknown>>;
    reversalMovementIds?: string[];
  };
  const posted: GuardBatch = {
    id: "posted-batch",
    venueId: 1,
    status: "POSTED",
    lines: [{
      id: "posted-line",
      processingStatus: "POSTED",
      recipeSnapshot: { recipeId: "recipe-v1", ingredients: [{ productKey: "rum", amount: 50 }] },
    }],
  };
  const reversed: GuardBatch = {
    id: "reversed-batch",
    venueId: 1,
    status: "REVERSED",
    lines: [{ id: "reversed-line", processingStatus: "REVERSED" }],
    reversalMovementIds: ["reversal-1"],
  };
  const draftBatch: GuardBatch = {
    id: "draft-batch",
    venueId: 1,
    status: "DRAFT",
    lines: [{ id: "draft-line", processingStatus: "DRAFT", quantity: 1 }],
  };
  const before = [posted, reversed, draftBatch];

  assert.deepEqual(protectedSalesBatchMutations(before, structuredClone(before)), []);

  const protectedMutation = structuredClone(before);
  const snapshot = protectedMutation[0].lines[0].recipeSnapshot as {
    ingredients: Array<Record<string, unknown>>;
  };
  snapshot.ingredients[0].amount = 45;
  assert.deepEqual(protectedSalesBatchMutations(before, protectedMutation), [
    { batchId: "posted-batch", status: "POSTED" },
  ]);

  const protectedDeletion = structuredClone(before).filter((batch) => batch.id !== "reversed-batch");
  assert.deepEqual(protectedSalesBatchMutations(before, protectedDeletion), [
    { batchId: "reversed-batch", status: "REVERSED" },
  ]);

  const protectedInsertion = [...structuredClone(before), {
    id: "injected-posted-batch",
    venueId: 1,
    status: "POSTED",
    lines: [{ id: "injected-line", processingStatus: "POSTED" }],
  }];
  assert.deepEqual(protectedSalesBatchMutations(before, protectedInsertion), [
    { batchId: "injected-posted-batch", status: "POSTED" },
  ]);

  const draftMutation = structuredClone(before);
  draftMutation[2].lines[0].quantity = 4;
  assert.deepEqual(protectedSalesBatchMutations(before, draftMutation), []);

  const duplicateLastWinsBypass = structuredClone(before);
  const alteredPosted = structuredClone(posted);
  const alteredSnapshot = alteredPosted.lines[0].recipeSnapshot as {
    ingredients: Array<Record<string, unknown>>;
  };
  alteredSnapshot.ingredients[0].amount = 1;
  duplicateLastWinsBypass.unshift(alteredPosted);
  assert.deepEqual(protectedSalesBatchMutations(before, duplicateLastWinsBypass), [{
    batchId: "posted-batch",
    status: "DUPLICATE",
    code: "DUPLICATE_SALES_BATCH_ID",
  }]);

  const duplicateDrafts = [...structuredClone(before), {
    ...structuredClone(draftBatch),
    lines: [{ id: "duplicate-draft-line", processingStatus: "DRAFT", quantity: 999 }],
  }];
  assert.deepEqual(protectedSalesBatchMutations(before, duplicateDrafts), [{
    batchId: "draft-batch",
    status: "DUPLICATE",
    code: "DUPLICATE_SALES_BATCH_ID",
  }]);

  const foreignSameId = {
    ...structuredClone(posted),
    venueId: 2,
    lines: [{
      id: "foreign-posted-line",
      processingStatus: "POSTED",
      recipeSnapshot: { recipeId: "foreign-recipe", ingredients: [{ productKey: "foreign", amount: 999 }] },
    }],
  };
  const crossVenue = [posted, foreignSameId];
  assert.deepEqual(protectedSalesBatchMutations(crossVenue, structuredClone(crossVenue)), []);
  const localOnlyMutation = structuredClone(crossVenue);
  const localSnapshot = localOnlyMutation[0].lines[0].recipeSnapshot as {
    ingredients: Array<Record<string, unknown>>;
  };
  localSnapshot.ingredients[0].amount = 49;
  assert.deepEqual(protectedSalesBatchMutations(crossVenue, localOnlyMutation), [
    { batchId: "posted-batch", status: "POSTED" },
  ]);

  const unscopedOverlap = [draftBatch, { ...structuredClone(draftBatch), venueId: undefined }];
  assert.deepEqual(protectedSalesBatchMutations([], unscopedOverlap), [{
    batchId: "draft-batch",
    status: "DUPLICATE",
    code: "DUPLICATE_SALES_BATCH_ID",
  }]);
});

test("duplicate non-empty sale line IDs are rejected before save or stock posting", () => {
  const source = assortment();
  const duplicateDraft = manualSalesAdapter.parse({
    businessDate: "2026-08-24",
    lines: [
      { id: "client-line", rawName: "Мохито", menuItemId: "mojito", quantity: 1 },
      { id: "client-line", rawName: "Мохито", menuItemId: "mojito", quantity: 2 },
    ],
  });
  assert.deepEqual(duplicateDraft.lines.map((line) => line.id), ["client-line", "client-line"]);
  const rejectedSave = createOrUpdateSalesBatch({
    batches: [],
    draft: duplicateDraft,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(rejectedSave.ok, false);
  assert.equal(!rejectedSave.ok ? rejectedSave.code : null, "DUPLICATE_SALES_LINE_ID");

  const valid = createOrUpdateSalesBatch({
    batches: [],
    draft: draft(1),
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  const corruptBatch = {
    ...structuredClone(valid.batch),
    lines: [
      structuredClone(valid.batch.lines[0]),
      { ...structuredClone(valid.batch.lines[0]), quantity: 9 },
    ],
  };
  const frozenAssortment = JSON.stringify(source);
  const stockMovements: unknown[] = [];
  const rejectedPost = postSalesBatch({
    batches: [corruptBatch],
    batchId: corruptBatch.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements,
    venueId: 1,
    actor,
  });
  assert.equal(rejectedPost.ok, false);
  assert.equal(!rejectedPost.ok ? rejectedPost.code : null, "DUPLICATE_SALES_LINE_ID");
  assert.equal(JSON.stringify(source), frozenAssortment);
  assert.equal(stockMovements.length, 0);
});

test("missing sale line IDs are rejected before snapshot or stock posting", () => {
  const source = assortment();
  const missingIdDraft = draft(1);
  missingIdDraft.lines[0].id = "";
  const rejectedSave = createOrUpdateSalesBatch({
    batches: [],
    draft: missingIdDraft,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(rejectedSave.ok, false);
  assert.equal(!rejectedSave.ok ? rejectedSave.code : null, "SALES_LINE_ID_REQUIRED");

  const valid = createOrUpdateSalesBatch({
    batches: [],
    draft: draft(1),
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    venueId: 1,
    actor,
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  const corrupt = structuredClone(valid.batch);
  corrupt.lines[0].id = "";
  const frozen = JSON.stringify(source);
  const rejectedPost = postSalesBatch({
    batches: [corrupt],
    batchId: corrupt.id,
    assortment: source,
    mappings: [],
    warehouseRoutes: [],
    stockMovements: [],
    venueId: 1,
    actor,
  });
  assert.equal(rejectedPost.ok, false);
  assert.equal(!rejectedPost.ok ? rejectedPost.code : null, "SALES_LINE_ID_REQUIRED");
  assert.equal(JSON.stringify(source), frozen);
});
