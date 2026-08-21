import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/payroll-dashboard-v164.css", import.meta.url);

test("payroll v164 is one shared data-driven module with two entry contexts", async () => {
  const [bundle, css, html, response, bootstrap] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  assert.equal(bundle.split("function bdSalariesPage(){").length - 1, 1);
  assert.equal(bundle.split("function bdPayrollMonthModel(").length - 1, 1);
  assert.match(bundle, /data-bd-payroll-dashboard":"v164/);
  assert.match(bundle, /bdSalaryContextV164/);
  assert.match(bundle, /return=finance/);
  assert.match(bundle, /return=team/);
  assert.match(bundle, /data-bd-venue-host":"payroll-v164/);
  assert.match(bundle, /data-bd-sync-host":"payroll-v164/);
  assert.match(bundle, /bdSalaryBackHref/);
  assert.match(bundle, /bdSalaryEmployeeHrefV164/);
  assert.match(bundle, /window\.bdReadNavigationQuery\("return","team"\)/);

  for (const document of [html, response]) {
    assert.match(document, /payroll-dashboard-v164\.css\?v=20260812-payroll-v164/);
    assert.match(document, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
  assert.match(css, /\.bd-payroll-summary-grid-v164/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,/);
  assert.match(css, /\.bd-payroll-employee-row-v164/);
  assert.match(css, /min-height:\s*61px/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(min-width: 900px\)/);
});

test("payroll summary and compact employee rows preserve existing money fields", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdPayrollSummaryCardV164(");
  const end = bundle.indexOf("function bdPayrollDetailLine(", start);
  assert.ok(start >= 0 && end > start);
  const payrollModule = bundle.slice(start, end);

  assert.match(payrollModule, /"Начислено"/);
  assert.match(payrollModule, /"Удержано"/);
  assert.match(payrollModule, /"Выплачено"/);
  assert.match(payrollModule, /"К выплате"/);
  assert.match(payrollModule, /summary\.gross/);
  assert.match(payrollModule, /summary\.deductions/);
  assert.match(payrollModule, /summary\.paid/);
  assert.match(payrollModule, /summary\.balance/);
  assert.match(payrollModule, /bdPayrollMonthModel/);
  assert.match(payrollModule, /bdBuildMonthlyReport/);
  assert.match(payrollModule, /bdSalarySummaryTotalsV164/);
  assert.match(payrollModule, /bdSalaryUnallocated/);
  assert.match(payrollModule, /Не распределено по сотрудникам/);
  assert.match(payrollModule, /bdPayrollEntrySheet/);
  assert.match(payrollModule, /bdPayrollEntryOptions\.includes/);
  assert.match(bundle, /bdPayrollEntryOptions=\["bonus","order","fine","dishware","other_deduction","payment"\]/);
  assert.match(payrollModule, /children:"К выплате"/);
  assert.match(payrollModule, /По имени/);
  assert.match(payrollModule, /Не выплачено/);
  assert.match(payrollModule, /bdPayrollEmployeeRowV164/);
  assert.doesNotMatch(payrollModule, /function bdPayrollMonthModel\(/);
});

test("salary navigation helpers preserve month, source, search, sort, and status", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdSalaryContextV164(");
  const end = bundle.indexOf("function bdSalaryHeaderV164(", start);
  assert.ok(start >= 0 && end > start);
  const context = { URLSearchParams };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers={bdSalaryMonthWindowV164,bdSalaryListHrefV164,bdSalaryEmployeeHrefV164};`,
    context,
  );

  assert.deepEqual(
    Array.from(context.helpers.bdSalaryMonthWindowV164(["2026-08", "2026-07", "2026-06", "2026-05"], "2026-07")),
    ["2026-08", "2026-07", "2026-06"],
  );
  const options = {
    month: "2026-08",
    context: "team",
    query: "Виталий",
    sort: "name",
    status: "unpaid",
  };
  assert.equal(
    context.helpers.bdSalaryListHrefV164(options),
    "/salaries?month=2026-08&return=team&q=%D0%92%D0%B8%D1%82%D0%B0%D0%BB%D0%B8%D0%B9&sort=name&status=unpaid",
  );
  assert.match(context.helpers.bdSalaryEmployeeHrefV164("employee 1", options), /^\/salaries\/employee%201\?/);
});

test("team and finance reuse payroll without changing payroll calculations", async () => {
  const bundle = await readFile(bundleUrl, "utf8");

  assert.equal(bundle.split('onPayroll:()=>navigate("/salaries?month="+monthKey+"&return=finance")').length - 1, 2);
  assert.match(bundle, /key:"salaries",label:"Зарплаты"/);
  assert.match(bundle, /payrollSource:/);
  assert.match(bundle, /payrollNet:/);
  assert.match(bundle, /payrollBalance:/);
  assert.match(bundle, /const bdBuildMonthlyReportBeforePayroll=bdBuildMonthlyReport/);
});

test("payroll summary reuses the existing monthly finance totals", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdSalarySummaryTotalsV164(");
  const end = bundle.indexOf("function bdPayrollSummaryCardV164(", start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helper=bdSalarySummaryTotalsV164;`,
    context,
  );

  const employeeTotals = { gross: 0, deductions: 0, paid: 0, balance: 0 };
  assert.deepEqual(
    { ...context.helper({ payroll: 6961, payrollDeductions: 500, payrollPaid: 1000, payrollBalance: 5461 }, employeeTotals) },
    { gross: 6961, deductions: 500, paid: 1000, balance: 5461 },
  );
  assert.equal(context.helper(null, employeeTotals), employeeTotals);
});
