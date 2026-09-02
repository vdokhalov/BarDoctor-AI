import test from "node:test";
import assert from "node:assert/strict";

import {
  cancelPostedWriteOff,
  deleteWriteOffDraft,
  nextWriteOffNumber,
  postWriteOffDocument,
  saveWriteOffDraft,
  writeOffDisplayNumber,
} from "../lib/bardoctor/write-offs";

const actor = { accountId: 7, name: "Тестировщик", role: "owner" };
const now = "2026-08-24T10:00:00.000Z";

function assortment() {
  return {
    stockBalances: [
      { productKey: "whiskey", venueId: 1, name: "Jack Daniel's", unit: "ml", current: 10_000, averageUnitCost: 0.18, inventoryValue: 1_800, currency: "RUB", packageOptions: ["0,7 л"] },
      { productKey: "lemon", venueId: 1, name: "Лимон", unit: "g", current: 3_250, averageUnitCost: 0.045, inventoryValue: 146.25, currency: "RUB", packageOptions: ["1 кг"] },
      { productKey: "mint", venueId: 1, name: "Мята", unit: "g", current: 500, averageUnitCost: 0, inventoryValue: 0, currency: "RUB", costNeedsReview: true },
      { productKey: "other-venue", venueId: 2, name: "Чужой товар", unit: "pcs", current: 10, averageUnitCost: 20, inventoryValue: 200, currency: "RUB" },
    ],
  };
}

function draft(items: unknown[], id = "wo-test") {
  return { id, date: "2026-08-24", location: "Бар", reasonCode: "spoilage", comment: "Тест", items, idempotencyKey: `post:${id}` };
}

test("write-off quantities reject JS coercion and unsafe accounting ranges", () => {
  for (const quantity of [true, "", "Infinity", 1_000_000_000_001]) {
    const result = postWriteOffDocument({
      documents: [],
      assortment: assortment(),
      stockMovements: [],
      venueId: 1,
      draft: draft([{ productKey: "whiskey", quantity, unit: "л" }], `wo-invalid-${String(quantity)}`),
      actor,
      allowNegativeStock: true,
      now,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "WRITE_OFF_QUANTITY_INVALID");
  }
});

test("single item write-off decreases canonical stock and uses moving-average cost", () => {
  const result = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 1.5, unit: "л" }]), actor, allowNegativeStock: true, now });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>).find((item) => item.productKey === "whiskey")!;
  assert.equal(balance.current, 8_500);
  assert.equal(result.document.items[0].baseQuantity, 1_500);
  assert.equal(result.document.items[0].totalCost, 270);
  assert.equal(result.document.totalCost, 270);
  assert.equal(result.stockMovements[0].type, "writeoff");
  assert.equal(result.stockMovements[0].amount, -1_500);
  assert.equal(result.stockMovements[0].sourceDocumentId, result.document.id);
});

test("packaging conversion writes one 0.7 l bottle as 700 ml", () => {
  const result = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 1, unit: "package", packagingLabel: "0,7 л" }], "wo-package"), actor, allowNegativeStock: true, now });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.items[0].baseQuantity, 700);
  assert.equal(result.document.items[0].totalCost, 126);
  assert.equal((result.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 9_300);
});

test("one multi-item document creates one movement per line and sums valued cost", () => {
  const result = postWriteOffDocument({
    documents: [], assortment: assortment(), stockMovements: [], venueId: 1,
    draft: draft([
      { productKey: "whiskey", quantity: 0.7, unit: "л" },
      { productKey: "lemon", quantity: 0.4, unit: "кг" },
    ], "wo-multiple"),
    actor, allowNegativeStock: true, now,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.itemCount, 2);
  assert.equal(result.document.totalCost, 144);
  assert.equal(result.document.movementIds.length, 2);
  assert.equal(result.stockMovements.filter((item) => item.sourceDocumentId === result.document.id).length, 2);
});

test("missing cost still posts quantity but remains explicitly unvalued", () => {
  const result = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "mint", quantity: 150, unit: "г" }], "wo-unvalued"), actor, allowNegativeStock: true, now });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.totalCost, null);
  assert.equal(result.document.costStatus, "unvalued");
  assert.equal(result.document.items[0].totalCost, null);
  assert.equal(result.stockMovements[0].costAmount, undefined);
  const mint = (result.assortment.stockBalances as Array<Record<string, unknown>>).find((item) => item.productKey === "mint")!;
  assert.equal(mint.current, 350);
});

test("venue context cannot post a balance explicitly owned by another venue", () => {
  const result = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "other-venue", quantity: 1, unit: "шт" }], "wo-cross-venue"), actor, allowNegativeStock: true, now });
  assert.deepEqual(result, { ok: false, code: "WRITE_OFF_PRODUCT_NOT_FOUND", error: "Позиция 1 не найдена в номенклатуре текущего заведения" });
});

test("idempotent retry does not create a second movement or decrement stock twice", () => {
  const first = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 1, unit: "л" }], "wo-idempotent"), actor, allowNegativeStock: true, now });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const retry = postWriteOffDocument({ documents: first.documents, assortment: first.assortment, stockMovements: first.stockMovements, venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 1, unit: "л" }], "wo-idempotent"), actor, allowNegativeStock: true, now: "2026-08-24T10:01:00.000Z" });
  assert.equal(retry.ok, true);
  if (!retry.ok) return;
  assert.equal(retry.idempotent, true);
  assert.equal((retry.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 9_000);
  assert.equal(retry.stockMovements.length, 1);
});

test("validation is transaction-safe when a later line is invalid", () => {
  const source = assortment();
  const result = postWriteOffDocument({ documents: [], assortment: source, stockMovements: [], venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 1, unit: "л" }, { productKey: "missing", quantity: 1, unit: "шт" }], "wo-invalid"), actor, allowNegativeStock: true, now });
  assert.equal(result.ok, false);
  assert.equal((source.stockBalances[0] as Record<string, unknown>).current, 10_000);
});

test("draft can be deleted without stock effects while posted document is protected", () => {
  const saved = saveWriteOffDraft({ documents: [], assortment: assortment(), venueId: 1, draft: draft([{ productKey: "lemon", quantity: 100, unit: "г" }], "wo-draft"), actor, now });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const deleted = deleteWriteOffDraft({ documents: saved.documents, venueId: 1, id: saved.document.id });
  assert.equal(deleted.ok, true);
  if (!deleted.ok) return;
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.documents.length, 0);
  const posted = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "lemon", quantity: 100, unit: "г" }], "wo-posted"), actor, allowNegativeStock: true, now });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const protectedDelete = deleteWriteOffDraft({ documents: posted.documents, venueId: 1, id: posted.document.id });
  assert.equal(protectedDelete.ok, false);
  if (protectedDelete.ok) return;
  assert.equal(protectedDelete.code, "WRITE_OFF_READ_ONLY");
});

test("cancellation restores stock exactly once and keeps original document history", () => {
  const posted = postWriteOffDocument({ documents: [], assortment: assortment(), stockMovements: [], venueId: 1, draft: draft([{ productKey: "whiskey", quantity: 0.7, unit: "л" }], "wo-cancel"), actor, allowNegativeStock: true, now });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const cancelled = cancelPostedWriteOff({ documents: posted.documents, assortment: posted.assortment, stockMovements: posted.stockMovements, venueId: 1, id: posted.document.id, actor, now: "2026-08-24T11:00:00.000Z" });
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) return;
  assert.equal((cancelled.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
  assert.equal(cancelled.document.status, "cancelled");
  assert.equal(cancelled.document.movementIds.length, 1);
  assert.equal(cancelled.document.reversalMovementIds?.length, 1);
  const retry = cancelPostedWriteOff({ documents: cancelled.documents, assortment: cancelled.assortment, stockMovements: cancelled.stockMovements, venueId: 1, id: cancelled.document.id, actor, now: "2026-08-24T11:01:00.000Z" });
  assert.equal(retry.ok, true);
  if (!retry.ok) return;
  assert.equal(retry.idempotent, true);
  assert.equal((retry.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
});

test("numbering is stable per venue and user-facing id never falls back to a dash", () => {
  assert.equal(nextWriteOffNumber([{ venueId: 1, number: 3 }, { venueId: 2, number: 9 }], 1), 4);
  assert.equal(writeOffDisplayNumber({ id: "wo-4", date: "2026-08-24", number: 4 }), "WO-2026-0004");
  assert.equal(writeOffDisplayNumber({ id: "legacy-writeoff", date: "2025-02-01" }), "WO-writeoff");
});
