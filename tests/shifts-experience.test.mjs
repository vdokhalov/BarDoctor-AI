import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/shifts-visual-v156.css", import.meta.url);

async function loadShiftHelpers() {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdShiftDateLabelV156(");
  const end = bundle.indexOf("function bdShiftViewV156(", start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  vm.runInNewContext(
    `${bundle.slice(start, end)}
globalThis.helpers = {
  bdShiftRecordKindV156,
  bdShiftStatusMetaV156,
  bdShiftPluralV156,
  bdShiftStaffSummaryV156,
  bdShiftCoverageCopyV158,
  bdShiftRowsV156,
  bdShiftContextModelV156,
};`,
    context,
  );
  return context.helpers;
}

test("shifts timeline keeps real records and exposes planned, missing and draft states", async () => {
  const { bdShiftRowsV156 } = await loadShiftHelpers();
  const rows = bdShiftRowsV156(
    [
      { id: "closed", date: "2026-08-01", revenue: 12_613 },
      { id: "draft", date: "2026-08-03", status: "draft", revenue: 2_450 },
    ],
    ["2026-08-02", "2026-08-01"],
    ["2026-08-09", "2026-08-03"],
  );

  assert.deepEqual(
    Array.from(rows, (row) => `${row.date}:${row.kind}`),
    [
      "2026-08-09:planned",
      "2026-08-03:draft",
      "2026-08-02:missing",
      "2026-08-01:closed",
    ],
  );
});

test("shift state labels and an empty month remain honest", async () => {
  const {
    bdShiftPluralV156,
    bdShiftRowsV156,
    bdShiftStatusMetaV156,
  } = await loadShiftHelpers();

  assert.deepEqual(Array.from(bdShiftRowsV156([], [], [])), []);
  assert.equal(bdShiftStatusMetaV156("closed").label, "Закрыта");
  assert.equal(bdShiftStatusMetaV156("planned").label, "Запланирована");
  assert.equal(bdShiftStatusMetaV156("missing").label, "Требует внимания");
  assert.equal(bdShiftStatusMetaV156("draft").label, "Черновик");
  assert.equal(bdShiftPluralV156(1, "смена", "смены", "смен"), "смена");
  assert.equal(bdShiftPluralV156(4, "смена", "смены", "смен"), "смены");
  assert.equal(bdShiftPluralV156(11, "смена", "смены", "смен"), "смен");
});

test("shift cards show only a compact team preview while preserving the full team", async () => {
  const { bdShiftStaffSummaryV156 } = await loadShiftHelpers();
  const employees = Array.from({ length: 5 }, (_, index) => ({
    id: `employee-${index + 1}`,
    name: `Сотрудник ${index + 1}`,
  }));
  const row = {
    staffing: employees.map((employee) => ({ employeeId: employee.id })),
  };
  const summary = bdShiftStaffSummaryV156(row, employees);

  assert.equal(summary.count, 5);
  assert.equal(summary.names.length, 5);
  assert.equal(summary.preview, "Сотрудник 1, Сотрудник 2, Сотрудник 3 и ещё 2");
});

test("coverage copy describes completed scheduled shifts without counting future plans", async () => {
  const { bdShiftCoverageCopyV158 } = await loadShiftHelpers();
  const copy = bdShiftCoverageCopyV158({
    scheduledCompletedShifts: 5,
    revenueEntered: 1,
    explainedClosures: 0,
    unexplainedGaps: 4,
    coveragePercent: 20,
  });

  assert.deepEqual({ ...copy }, {
    label: "Учтено прошедших",
    value: "1/5",
    hint: "смен по графику",
  });
  assert.deepEqual({ ...bdShiftCoverageCopyV158({
    scheduledCompletedShifts: 0,
    revenueEntered: 0,
    explainedClosures: 0,
  }) }, {
    label: "Учтено прошедших",
    value: "—",
    hint: "смен по графику",
  });
});

test("contextual shift action appears only when closing is relevant", async () => {
  const { bdShiftContextModelV156 } = await loadShiftHelpers();
  const dayOff = bdShiftContextModelV156(
    { status: "non_working", reportFilled: false },
    "суббота, 15 августа",
    "22:00–06:00",
    true,
  );
  const planned = bdShiftContextModelV156(
    { status: "upcoming", reportFilled: false },
    null,
    "22:00–06:00",
    true,
  );
  const active = bdShiftContextModelV156(
    { status: "active", reportFilled: false },
    null,
    "22:00–06:00",
    true,
  );
  const completed = bdShiftContextModelV156(
    { status: "completed", reportFilled: false },
    null,
    "22:00–06:00",
    true,
  );
  const readOnlyActive = bdShiftContextModelV156(
    { status: "active", reportFilled: false },
    null,
    "22:00–06:00",
    false,
  );
  const filled = bdShiftContextModelV156(
    { status: "completed", reportFilled: true, operatingDate: "2026-08-08" },
    null,
    "22:00–06:00",
    true,
  );

  assert.equal(dayOff.title, "Сегодня выходной");
  assert.equal(dayOff.actionLabel, null);
  assert.match(dayOff.detail, /Следующая смена/);
  assert.equal(planned.title, "Смена запланирована");
  assert.equal(planned.actionLabel, null);
  assert.equal(active.actionLabel, "Закрыть текущую смену");
  assert.equal(completed.actionLabel, "Закрыть завершённую смену");
  assert.equal(readOnlyActive.actionLabel, null);
  assert.equal(filled.title, "Смена уже закрыта");
  assert.equal(filled.actionLabel, null);
});

test("shifts v158 keeps cards data-driven and opens the dedicated shift view", async () => {
  const [bundle, css, html, routeSource, bootstrap] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);
  const start = bundle.indexOf("function bdShiftDateLabelV156(");
  const end = bundle.indexOf("function BAe(){", start);
  const shifts = bundle.slice(start, end);

  assert.match(shifts, /data-bd-shifts-page":"v158/);
  assert.match(shifts, /className:"bd-shifts-month-nav"/);
  assert.match(shifts, /className:"bd-shifts-summary"/);
  assert.match(shifts, /className:"bd-shifts-warning"/);
  assert.match(shifts, /contextModel\.actionLabel&&/);
  assert.match(shifts, /onClick:\(\)=>setViewing\(item\)/);
  assert.match(shifts, /role:"dialog","aria-modal":!0/);
  assert.match(shifts, /payrollPercentOfRevenue/);
  assert.match(shifts, /Iz\(profile,revenue,gapReasons,now,period\)\.map\(item=>item\.date\)/);
  assert.match(shifts, /hasRevenue\?Mn\(Number\(row\.revenue\)\):"—"/);
  assert.match(shifts, /hasReceipts&&/);
  assert.match(shifts, /bdShiftStaffSummaryV156/);
  assert.match(shifts, /bd-shift-card bd-shift-card-compact missing/);
  assert.match(shifts, /aria-label":bdShiftDateLabelV156\(item\.date\)\+"\. Смена не заполнена\. Требует внимания"/);
  assert.match(shifts, /children:coverageCopy\.label/);
  assert.doesNotMatch(shifts, /children:"Заполнено"/);
  assert.doesNotMatch(shifts, /staffNames\.join\(", "\)/);
  assert.match(css, /\.bd-shift-card\.bd-shift-card-compact\s*\{[^}]*min-height:\s*64px/s);
  assert.match(css, /\.bd-shift-card-compact-action\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /grid-template-columns:\s*minmax\(320px, 0\.76fr\) minmax\(0, 1\.34fr\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /shifts-visual-v156\.css\?v=20260812-shifts-v158/);
  assert.match(routeSource, /shifts-visual-v156\.css\?v=20260812-shifts-v158/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
});
