import assert from "node:assert/strict";
import test from "node:test";
import { mergeConcurrentStoreData } from "../lib/bardoctor/data-trust";

test("concurrent array additions from two venue users are both preserved", () => {
  const base = [{ id: "existing", value: 1, updatedAt: "2026-08-01T10:00:00Z" }];
  const desired = [
    ...base,
    { id: "from-manager", value: 2, updatedAt: "2026-08-08T10:01:00Z" },
  ];
  const current = [
    ...base,
    { id: "from-owner", value: 3, updatedAt: "2026-08-08T10:02:00Z" },
  ];

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(
    (result.data as Array<{ id: string }>).map((row) => row.id).sort(),
    ["existing", "from-manager", "from-owner"],
  );
  assert.equal(result.conflicts, 0);
});

test("a concurrent remote edit is not erased by a stale local deletion", () => {
  const base = [{ id: "shift", revenue: 10_000, updatedAt: "2026-08-08T10:00:00Z" }];
  const desired: unknown[] = [];
  const current = [{
    id: "shift",
    revenue: 12_000,
    updatedAt: "2026-08-08T10:05:00Z",
  }];

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(result.data, current);
  assert.equal(result.conflicts, 1);
});

test("independent settings fields merge without replacing another user's edit", () => {
  const base = {
    inventoryFrequency: "monthly",
    inventorySections: ["Бар"],
    taxModel: { mode: "manual", amount: 0 },
    utilityModel: { mode: "manual", amount: 0 },
  };
  const desired = {
    ...base,
    inventorySections: ["Бар", "Кухня"],
  };
  const current = {
    ...base,
    taxModel: { mode: "fixed", amount: 3_000 },
  };

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(result.data, {
    ...base,
    inventorySections: ["Бар", "Кухня"],
    taxModel: { mode: "fixed", amount: 3_000 },
  });
  assert.equal(result.conflicts, 0);
});
