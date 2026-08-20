import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdvanceEquipmentWorkflow,
  equipmentExpenseId,
  mergeEquipmentCosts,
  nextMaintenanceFromPolicy,
} from "../lib/bardoctor/equipment";

test("equipment workflow requires the verification step", () => {
  assert.equal(canAdvanceEquipmentWorkflow("detected", "assigned"), true);
  assert.equal(canAdvanceEquipmentWorkflow("assigned", "in_progress"), true);
  assert.equal(canAdvanceEquipmentWorkflow("in_progress", "fixed"), true);
  assert.equal(canAdvanceEquipmentWorkflow("fixed", "verified"), true);
  assert.equal(canAdvanceEquipmentWorkflow("in_progress", "verified"), false);
  assert.equal(canAdvanceEquipmentWorkflow("detected", "fixed"), false);
});

test("maintenance interval derives the next date without inventing a schedule", () => {
  assert.equal(
    nextMaintenanceFromPolicy({ mode: "interval_days", interval: 30 }, "2026-08-12"),
    "2026-09-11",
  );
  assert.equal(
    nextMaintenanceFromPolicy({ mode: "interval_months", interval: 6 }, "2026-08-12"),
    "2027-02-12",
  );
  assert.equal(nextMaintenanceFromPolicy({ mode: "as_needed" }, "2026-08-12"), null);
  assert.equal(nextMaintenanceFromPolicy({ mode: "date", nextDate: "2026-08-12" }, "2026-08-12"), null);
  assert.equal(nextMaintenanceFromPolicy({ mode: "date", nextDate: "2026-08-20" }, "2026-08-12"), "2026-08-20");
  assert.equal(nextMaintenanceFromPolicy(null, "2026-08-12"), null);
});

test("equipment costs prefer linked finance expenses and avoid double counting", () => {
  const workOrderId = "wo-1";
  const costs = mergeEquipmentCosts({
    expenses: [{
      id: equipmentExpenseId(workOrderId),
      equipmentWorkOrderId: workOrderId,
      equipmentId: "eq-1",
      date: "2026-08-12",
      amount: 1_200,
      category: "repairs",
      equipmentCostType: "repair",
    }],
    workOrders: [{
      id: workOrderId,
      equipmentId: "eq-1",
      costDate: "2026-08-12",
      cost: 1_200,
      kind: "repair",
      financeExpenseId: equipmentExpenseId(workOrderId),
    }],
    history: [{
      id: "history-1",
      equipmentId: "eq-1",
      date: "2026-08-12",
      cost: 1_200,
      type: "repair",
    }],
  });

  assert.equal(costs.length, 1);
  assert.equal(costs[0]?.source, "finance");
  assert.equal(costs[0]?.amount, 1_200);
});

test("unlinked legacy maintenance costs remain visible", () => {
  const costs = mergeEquipmentCosts({
    history: [{
      id: "maintenance-1",
      equipmentId: "eq-2",
      date: "2026-07-01",
      cost: 500,
      type: "maintenance",
    }],
  });

  assert.deepEqual(costs.map((cost) => [cost.type, cost.source, cost.amount]), [
    ["maintenance", "history", 500],
  ]);
});
