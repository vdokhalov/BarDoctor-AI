import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("app/api/admin/relationship-integrity/route.ts", "utf8");
const page = fs.readFileSync("app/data-control/route.ts", "utf8");
const client = fs.readFileSync("public/data-control.js", "utf8");
const adminPage = fs.readFileSync("app/admin/route.ts", "utf8");
const adminClient = fs.readFileSync("public/admin-v175.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

test("relationship diagnostics require platform-admin access and remain read-only", () => {
  assert.match(route, /authenticatePlatformAdmin\(request\)/);
  assert.match(route, /return adminForbidden\(\)/);
  assert.match(route, /auditDataIntegrity\(/);
  assert.match(route, /X-BarDoctor-Data-Mode": "read-only-dry-run"/);
  assert.doesNotMatch(route, /\b(?:INSERT|UPDATE|DELETE|PUT|POST)\b/);
});

test("venue users cannot see or call the internal relationship diagnostic", () => {
  assert.equal(fs.existsSync("app/api/data-integrity/route.ts"), false);
  assert.doesNotMatch(page, /relationship-diagnostic|Связи разделов|СКВОЗНАЯ ПРОВЕРКА/);
  assert.doesNotMatch(client, /api\/data-integrity|relationship-diagnostic/);
});

test("Internal Admin system screen owns the diagnostic entry point", () => {
  assert.match(adminPage, /Internal Admin/);
  assert.match(adminClient, /Связи разделов/);
  assert.match(adminClient, /api\("relationship-integrity"\)/);
  assert.match(adminClient, /только Internal Admin/);
});

test("one command covers the complete relationship E2E chain", () => {
  assert.equal(packageJson.scripts["test:relationship-e2e"], "bash scripts/sites-env.sh -- bash scripts/run-relationship-e2e-v370.sh");
  const runner = fs.readFileSync("scripts/run-relationship-e2e-v370.sh", "utf8");
  assert.match(runner, /run-assortment-browser-qa-v170/);
  assert.match(runner, /run-procurement-browser-qa-v190/);
  assert.match(runner, /run-menu-sale-size-browser-qa-v298/);
  assert.match(runner, /warehouse-nomenclature menu-tech-cards suppliers-purchases/);
});
