import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrUpdateSalesBatch,
  manualSalesAdapter,
  postSalesBatch,
  reverseSalesBatch,
  salesBatches,
  salesDataQuality,
  tabularSalesAdapter,
  textSalesAdapter,
  upsertSalesMapping,
} from "../lib/bardoctor/sales-consumption";
import { hasPermission, permissionsFor } from "../lib/bardoctor/access-control";

const actor = { accountId: 7, name: "Owner", role: "owner" };

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
