import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/team-dashboard-v163.css", import.meta.url);

async function loadDepartmentHelper() {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdTeamDepartmentRowsV163(");
  const end = bundle.indexOf("function bdTeamNextShiftV163(", start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  vm.runInNewContext(`${bundle.slice(start, end)}\nglobalThis.helper=bdTeamDepartmentRowsV163;`, context);
  return context.helper;
}

test("team department structure uses only real non-dismissed employee departments", async () => {
  const rows = await loadDepartmentHelper();
  assert.deepEqual(Array.from(rows([
    { department: "Зал", status: "active" },
    { department: "Зал", status: "on_leave" },
    { department: "Бар", status: "active" },
    { department: "Кухня", status: "dismissed" },
    { department: "", status: "active" },
  ]), (row) => ({ ...row })), [
    { name: "Зал", count: 2 },
    { name: "Бар", count: 1 },
  ]);
});

test("team v163 keeps the directory and adds a data-driven management overview", async () => {
  const [bundle, css, html, response, bootstrap] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);
  const start = bundle.indexOf("function bdTeamDepartmentRowsV163(");
  const end = bundle.indexOf("function bCe(", start);
  const team = bundle.slice(start, end);

  assert.match(team, /data-bd-team-module":"v163/);
  assert.match(team, /data-bd-team-overview":"v163/);
  assert.match(team, /"Обзор"/);
  assert.match(team, /"Сотрудники"/);
  assert.match(team, /className:"bd-team-controls"/);
  assert.match(team, /className:"bd-team-directory"/);
  assert.match(team, /i\.jsx\(mCe,\{employee:/);
  assert.match(team, /bdBuildMonthlyReport/);
  assert.match(team, /bdPayrollMonthModel/);
  assert.match(team, /missingRule/);
  assert.match(team, /confirmationStatus==="pending"/);
  assert.match(team, /bdPlannedShiftDates/);
  assert.match(team, /data-bd-venue-host":"team-v163/);
  assert.match(team, /data-bd-sync-host":"team-v163/);
  assert.match(team, /new=payment&return=team/);
  assert.match(team, /new=fine&return=team/);
  assert.doesNotMatch(team, /28%|норм[аы]\s+ФОТ|эффективност[ьи]\s*%/i);

  assert.match(css, /\.bd-team-tabs-v163/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(min-width: 1000px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  for (const document of [html, response]) {
    assert.match(document, /team-dashboard-v163\.css\?v=20260812-team-v163/);
    assert.match(document, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
});

test("salary quick actions reuse the existing payroll entry sheet", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdSalariesPage(){");
  const end = bundle.indexOf("function bdPayrollDetailLine(", start);
  const salaries = bundle.slice(start, end);

  assert.match(salaries, /bdSalaryQuickType=window\.bdReadNavigationQuery\("new",""\)/);
  assert.match(salaries, /bdPayrollEntryOptions\.includes\(bdSalaryQuickType\)/);
  assert.match(salaries, /initial:j&&typeof j==="object"\?j:void 0/);
  assert.match(salaries, /bdSalaryReturnTo/);
});
