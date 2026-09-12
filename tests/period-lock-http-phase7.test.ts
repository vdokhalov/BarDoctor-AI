import assert from "node:assert/strict";
import test from "node:test";
import { storeRuntime } from "./helpers/store-runtime";

const expenses = "bd_finance_expenses", closings = "bd_month_closings";
const expense = { id: "qa-expense", venueId: 901, date: "2026-08-05", category: "rent", amount: 15, currency: "MDL", description: "TEST rent" };
const closing = (monthKey: string) => ({ id: `qa-${monthKey}`, venueId: 901, monthKey, status: "closed", closedAt: "2026-09-01T00:00:00.000Z", closedBy: "QA Owner" });
type Runtime = Awaited<ReturnType<typeof storeRuntime>>;
type Row = Record<string, unknown>;
function totals(rows: Row[]) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const month = String(row.date).slice(0, 7);
    result[month] = (result[month] ?? 0) + Number(row.amount);
    return result;
  }, {});
}
async function rejectWithoutWrites(r: Runtime, key: string, desired: unknown, monthKey: string, baseData?: unknown) {
  const before = r.bytes();
  const original = (await r.get(key)).body.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await r.put(key, desired, "TEST rejected mutation", baseData);
    assert.equal(result.status, 423);
    assert.equal(result.body.code, "MONTH_LOCKED");
    assert.equal(result.body.monthKey, monthKey);
    assert.equal(r.bytes(), before, "Rejected PUT must not change any domain timestamp, value or audit row");
    const reloaded = await r.get(key);
    assert.equal(reloaded.status, 200);
    assert.deepEqual(reloaded.body.data, original);
    assert.equal(r.bytes(), before, "Reload must preserve the full database");
    if (key === expenses) assert.deepEqual(totals(reloaded.body.data as Row[]), totals(original as Row[]));
  }
}

for (const item of [
  { name: "closed to open", closed: ["2026-08"], from: "2026-08", to: "2026-09", blocked: "2026-08" },
  { name: "open to closed", closed: ["2026-09"], from: "2026-08", to: "2026-09", blocked: "2026-09" },
  { name: "closed to closed", closed: ["2026-08", "2026-09"], from: "2026-08", to: "2026-09", blocked: "2026-08" },
  { name: "within closed month", closed: ["2026-08"], from: "2026-08", to: "2026-08", blocked: "2026-08" },
]) test(`expense ${item.name} is blocked with immutable domain, period totals and audit on retry/reload`, async () => {
  const r = await storeRuntime();
  try {
    const original = { ...expense, date: `${item.from}-05` };
    r.seed(closings, item.closed.map(closing)); r.seed(expenses, [original]);
    // Keep a real prior successful audit to prove rejection preserves existing history too.
    const other = { ...expense, id: "qa-open-control", date: "2026-10-05" };
    assert.equal((await r.put(expenses, [original, other])).status, 200);
    assert.equal(r.audits().length, 1);
    await rejectWithoutWrites(r, expenses, [{ ...original, date: `${item.to}-06`, amount: 16 }, other], item.blocked);
  } finally { r.close(); }
});

test("expense open to open is saved with exactly one audit; identical replay creates none", async () => {
  const r = await storeRuntime();
  try {
    r.seed(closings, []); r.seed(expenses, [expense]);
    const desired = [{ ...expense, date: "2026-09-05" }];
    const result = await r.put(expenses, desired);
    assert.equal(result.status, 200);
    assert.deepEqual((await r.get(expenses)).body.data, desired);
    assert.deepEqual(totals(desired), { "2026-09": 15 });
    assert.equal(r.audits().length, 1);
    assert.deepEqual(JSON.parse(String(r.audits()[0].before_json)), expense);
    assert.deepEqual(JSON.parse(String(r.audits()[0].after_json)), desired[0]);
    const audit = JSON.stringify(r.audits());
    assert.equal((await r.put(expenses, desired)).status, 200);
    assert.equal(JSON.stringify(r.audits()), audit);
  } finally { r.close(); }
});

test("deleting an expense in a closed month leaves original data, totals and audit unchanged", async () => {
  const r = await storeRuntime();
  try { r.seed(closings, [closing("2026-08")]); r.seed(expenses, [expense]); await rejectWithoutWrites(r, expenses, [], "2026-08"); }
  finally { r.close(); }
});

test("explicit owner reopen enables correction; manager denied; reclose blocks again", async () => {
  const r = await storeRuntime();
  try {
    const closed = closing("2026-08");
    const reopened = { ...closed, status: "reopened", reopenedAt: "2026-09-10T12:00:00.000Z", reopenedBy: "QA Owner" };
    r.seed(closings, [closed]); r.seed(expenses, [expense]);
    const before = r.bytes(); r.setRole("manager");
    assert.equal((await r.put(closings, [reopened])).status, 403);
    assert.equal(r.bytes(), before); r.setRole("owner");
    assert.equal((await r.put(closings, [reopened], "QA explicit reopening")).status, 200);
    assert.equal(r.audits().length, 1);
    assert.equal(r.audits()[0].reason, "QA explicit reopening");
    assert.deepEqual(JSON.parse(String(r.audits()[0].before_json)), closed);
    assert.deepEqual(JSON.parse(String(r.audits()[0].after_json)), reopened);
    const desired = [{ ...expense, date: "2026-09-05" }];
    assert.equal((await r.put(expenses, desired)).status, 200);
    assert.deepEqual((await r.get(expenses)).body.data, desired);
    assert.equal((await r.put(closings, [closed])).status, 200);
    await rejectWithoutWrites(r, expenses, [expense], "2026-08");
  } finally { r.close(); }
});

test("period aliases cannot erase the original closed month or hide a closed calendar date", async () => {
  const r = await storeRuntime();
  try {
    r.seed(closings, [closing("2026-08")]);
    const original = { ...expense, monthKey: "2026-08", accountingMonth: "2026-08", month: "2026-08" };
    r.seed(expenses, [original]);
    await rejectWithoutWrites(r, expenses, [{ ...original, date: "2026-09-05", monthKey: "2026-09", accountingMonth: "2026-09", month: "2026-09" }], "2026-08");
    r.seed(expenses, [{ ...expense, monthKey: "2026-09" }]);
    await rejectWithoutWrites(r, expenses, [{ ...expense, monthKey: "2026-09", amount: 16 }], "2026-08");
  } finally { r.close(); }
});

test("merged stale expense updates check authoritative before period", async () => {
  const r = await storeRuntime();
  try {
    r.seed(closings, [closing("2026-08")]); r.seed(expenses, [expense]);
    await rejectWithoutWrites(r, expenses, [{ ...expense, date: "2026-09-05" }], "2026-08", [expense]);
  } finally { r.close(); }
});

test("closed expense after more than 250 open mutations still blocks the entire request", async () => {
  const r = await storeRuntime();
  try {
    const open = Array.from({ length: 251 }, (_, index) => ({ ...expense, id: `open-${index}`, date: "2026-09-05" }));
    r.seed(closings, [closing("2026-08")]); r.seed(expenses, [...open, expense]);
    await rejectWithoutWrites(r, expenses, [...open.map(row => ({ ...row, amount: 16 })), { ...expense, date: "2026-09-05" }], "2026-08");
  } finally { r.close(); }
});

test("array replacement cannot hide closed expense records", async () => {
  const r = await storeRuntime();
  try {
    r.seed(closings, [closing("2026-08")]); r.seed(expenses, [expense]);
    await rejectWithoutWrites(r, expenses, { date: "2026-09-05", amount: 15 }, "2026-08");
  } finally { r.close(); }
});

test("duplicate IDs cannot hide a changed closed row behind an unchanged open row", async () => {
  const r = await storeRuntime();
  try {
    const open = { ...expense, date: "2026-09-05" };
    r.seed(closings, [closing("2026-08")]); r.seed(expenses, [expense, open]);
    await rejectWithoutWrites(r, expenses, [{ ...expense, date: "2026-09-06" }, open], "2026-08");
  } finally { r.close(); }
});

test("sales batch businessDate is a protected accounting period", async () => {
  const r = await storeRuntime();
  try {
    const original = { id: "qa-business-date", venueId: 901, businessDate: "2026-08-05", status: "DRAFT", lines: [] };
    r.seed(closings, [closing("2026-08")]); r.seed("bd_sales_batches", [original]);
    await rejectWithoutWrites(r, "bd_sales_batches", [{ ...original, businessDate: "2026-09-05" }], "2026-08");
  } finally { r.close(); }
});

test("closed period cannot be removed, renamed or changed to draft instead of explicit reopen", async () => {
  const r = await storeRuntime();
  try {
    const original = closing("2026-08");
    r.seed(closings, [original]); r.seed(expenses, [expense]);
    const replacements = [[], [{ ...original, status: "draft" }], [{ ...original, monthKey: "2026-09" }],
      [{ id: original.id, status: "closed", date: "2026-08-01" }],
      [{ id: original.id, status: "closed", accountingMonth: "2026-08" }]];
    for (const role of ["manager", "owner"] as const) {
      r.setRole(role);
      for (const desired of replacements) {
        const before = r.bytes();
        const result = await r.put(closings, desired);
        assert.equal(result.status, role === "manager" ? 403 : 409, JSON.stringify(result.body));
        assert.equal(r.bytes(), before);
      }
    }
    await rejectWithoutWrites(r, expenses, [{ ...expense, date: "2026-09-05" }], "2026-08");
  } finally { r.close(); }
});

test("duplicate closing IDs cannot hide reopening from permission checks", async () => {
  const r = await storeRuntime();
  try {
    const original = closing("2026-08");
    r.seed(closings, [original]); r.setRole("manager");
    const before = r.bytes();
    const result = await r.put(closings, [{ ...original, status: "reopened" }, { ...original, monthKey: "2026-09" }]);
    assert.equal(result.status, 409); assert.equal(result.body.code, "DUPLICATE_STORE_RECORD_ID"); assert.equal(r.bytes(), before);
  } finally { r.close(); }
});

for (const role of ["owner", "manager"] as const) {
  test(`${role}: a signed closed snapshot cannot be rewritten, replaced or shadowed`, async () => {
    const r = await storeRuntime();
    try {
      const original = { ...closing("2026-08"), snapshot: { finalProfit: 354, costOfGoods: 720, sections: { kitchen: 324 } } };
      r.seed(closings, [original]); r.setRole(role);
      const replacements = [
        [{ ...original, snapshot: { ...original.snapshot, finalProfit: 999 } }],
        [{ ...original, snapshot: { ...original.snapshot, costOfGoods: 0 } }],
        [{ ...original, snapshot: { ...original.snapshot, sections: { kitchen: 999 } } }],
        [{ ...original, closedBy: "Someone else" }],
        [original, { ...original, id: "shadow-close", updatedAt: "2026-10-01T00:00:00.000Z", snapshot: { ...original.snapshot, finalProfit: 999 } }],
        [{ ...original, snapshot: { ...original.snapshot, finalProfit: 999 } }, closing("2026-09")],
      ];
      for (const desired of replacements) await rejectWithoutWrites(r, closings, desired, "2026-08");
      const before = r.bytes();
      for (let attempt = 0; attempt < 2; attempt++) {
        const replacement = await r.put(closings, [{ ...original, id: "replacement-close" }]);
        // Replacing identity includes deleting the signed row; manager lacks month.reopen.
        assert.equal(replacement.status, role === "manager" ? 403 : 423);
        if (role === "owner") assert.equal(replacement.body.code, "MONTH_LOCKED");
        assert.equal(r.bytes(), before);
        assert.deepEqual((await r.get(closings)).body.data, [original]);
      }
    } finally { r.close(); }
  });
}

test("explicit reopen cannot carry a financial rewrite or erase prior reopen history", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), snapshot: { finalProfit: 354 }, reopenHistory: [{ reason: "Earlier correction" }] };
    r.seed(closings, [original]);
    const reopened = { ...original, status: "reopened", reopenedAt: "2026-09-10T12:00:00.000Z", reopenedBy: "QA Owner" };
    for (const changed of [
      { ...reopened, snapshot: { finalProfit: 999 } },
      { ...reopened, closedAt: "2026-09-10T12:00:00.000Z" },
      { ...reopened, reopenHistory: [] },
      { ...reopened, reopenHistory: [{ reason: "Replaced history" }] },
    ]) await rejectWithoutWrites(r, closings, [changed], "2026-08");
  } finally { r.close(); }
});

test("same-month legacy sibling cannot shadow an unchanged signed close", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), snapshot: { finalProfit: 354 } };
    const legacy = { ...original, id: "older-reopened", status: "reopened" };
    r.seed(closings, [original, legacy]);
    await rejectWithoutWrites(r, closings, [original, { ...legacy, status: "closed", snapshot: { finalProfit: 999 } }], "2026-08");
  } finally { r.close(); }
});

test("stale merged close update cannot overwrite the authoritative signed snapshot", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), snapshot: { finalProfit: 354 } };
    r.seed(closings, [original]);
    await rejectWithoutWrites(r, closings, [{ ...original, snapshot: { finalProfit: 999 } }], "2026-08", [original]);
  } finally { r.close(); }
});

test("reordering closed legacy timestamp ties cannot change the selected signed result", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), id: "primary:2026-08", venueId: "primary", updatedAt: "2026-09-01T00:00:00.000Z", snapshot: { finalProfit: 354 } };
    const sibling = { ...original, id: "901:2026-08", venueId: 901, snapshot: { finalProfit: 999 } };
    r.seed(closings, [original, sibling]);
    for (const role of ["owner", "manager"] as const) {
      r.setRole(role);
      await rejectWithoutWrites(r, closings, [sibling, original], "2026-08");
    }
    r.setRole("owner");
    const reopened = { ...original, status: "reopened", reopenedAt: "2026-09-10T12:00:00.000Z" };
    assert.equal((await r.put(closings, [sibling, reopened])).status, 200);
    assert.deepEqual((await r.get(closings)).body.data, [sibling, reopened]);
  } finally { r.close(); }
});

test("native reopen may fill missing legacy createdAt but cannot replace an existing creation date", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), venueId: "primary", snapshot: { finalProfit: 354 } };
    r.seed(closings, [original]);
    const now = "2026-10-01T10:00:00.000Z";
    const reopened = { ...original, status: "reopened", reopenedAt: now, updatedAt: now, createdAt: now };
    assert.equal((await r.put(closings, [reopened])).status, 200);
    assert.deepEqual((await r.get(closings)).body.data, [reopened]);
    assert.deepEqual(JSON.parse(String(r.audits()[0].before_json)), original);
    const reclosed = { ...reopened, status: "closed" };
    assert.equal((await r.put(closings, [reclosed])).status, 200);
    await rejectWithoutWrites(r, closings, [{ ...reclosed, status: "reopened",
      createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z" }], "2026-08");
  } finally { r.close(); }
});

test("signed no-op and another month close work; separate audited reopen permits correction and reclose", async () => {
  const r = await storeRuntime();
  try {
    const original = { ...closing("2026-08"), snapshot: { finalProfit: 354 }, reopenHistory: [{ reason: "Earlier correction" }] };
    r.seed(closings, [original]); r.setRole("manager");
    assert.equal((await r.put(closings, [original])).status, 200);
    assert.deepEqual((await r.get(closings)).body.data, [original]); assert.equal(r.audits().length, 0);
    const other = closing("2026-09");
    assert.equal((await r.put(closings, [original, other])).status, 200); assert.equal(r.audits().length, 1);
    const reopened = { ...original, status: "reopened", reopenedAt: "2026-10-01T10:00:00.000Z", reopenedBy: "QA Owner",
      updatedAt: "2026-10-01T10:00:00.000Z", reopenReason: "Explicit correction",
      reopenHistory: [...original.reopenHistory, { reason: "Explicit correction" }] };
    const before = r.bytes();
    assert.equal((await r.put(closings, [reopened, other])).status, 403); assert.equal(r.bytes(), before);
    r.setRole("owner");
    assert.equal((await r.put(closings, [reopened, other], "Explicit correction")).status, 200);
    const reopenAudit = r.audits().at(-1)!;
    assert.deepEqual(JSON.parse(String(reopenAudit.before_json)), original);
    assert.deepEqual(JSON.parse(String(reopenAudit.after_json)), reopened);
    assert.equal(reopenAudit.reason, "Explicit correction");
    const corrected = { ...reopened, snapshot: { finalProfit: 344 } };
    assert.equal((await r.put(closings, [corrected, other])).status, 200);
    const reclosed = { ...corrected, status: "closed", closedAt: "2026-10-01T11:00:00.000Z" };
    assert.equal((await r.put(closings, [reclosed, other])).status, 200);
    assert.deepEqual((await r.get(closings)).body.data, [reclosed, other]);
    assert.equal(r.audits().length, 4);
    await rejectWithoutWrites(r, closings, [{ ...reclosed, snapshot: { finalProfit: 999 } }, other], "2026-08");
  } finally { r.close(); }
});

for (const key of ["bd_purchase_documents", "bd_finance_revenue", "bd_finance_gap_reasons", "bd_sales_documents", "bd_sales_batches", "bd_inventory_snapshots", "bd_payroll_entries"]) {
  test(`${key}: original closed period is protected on date move and deletion`, async () => {
    const r = await storeRuntime();
    try {
      const original = { ...expense, status: "draft" };
      r.seed(closings, [closing("2026-08")]); r.seed(key, [original]);
      await rejectWithoutWrites(r, key, [{ ...original, date: "2026-09-05" }], "2026-08");
      await rejectWithoutWrites(r, key, [], "2026-08");
    } finally { r.close(); }
  });
}
