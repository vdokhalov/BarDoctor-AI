import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const out = resolve("outputs/webkit-stable-gate"); mkdirSync(out, { recursive: true });
const suites = [
  ["Finance", "scripts/finance-inputs-phase3a6-browser.ts", "outputs/finance-inputs-phase3a6/webkit/result.json"],
  ["Acquisition", "scripts/acquisition-stock-phase3a7-browser.ts", "outputs/acquisition-stock-phase3a7/webkit/result.json"],
  ["Warehouse", "scripts/warehouse-readonly-phase3a7-browser.ts", "outputs/warehouse-readonly-phase3a7/webkit/results.json"],
  ["Canonical Health/session/RBAC", "scripts/health-inputs-phase3a9-stable-webkit.ts", "outputs/health-inputs-phase3a9/webkit-stable/results.json"],
  ["Evidence/revenue/security", "scripts/evidence-foundation-browser.ts", "outputs/evidence-phase3a1/webkit/browser.json"],
  ["Captured cost/warehouse/security", "scripts/cost-warehouse-trace-browser.ts", "outputs/cost-warehouse-phase3a3/webkit/browser.json"],
  ["Menu origin/security", "scripts/menu-origin-trace-browser.ts", "outputs/menu-origin-trace/webkit/summary.json"],
];
const results = [], sourceSHA = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
for (const [suite, script, artifact] of suites) {
  rmSync(artifact, { force: true }); // Only obsolete ignored QA output, never business data.
  const log = createWriteStream(resolve(out, script.split("/").pop() + ".log"));
  const child = spawn(process.execPath, ["--import", "tsx", script], { env: { ...process.env, BD_FINANCE_BROWSER: "webkit", BD_STOCK_BROWSER: "webkit", BD_EVIDENCE_BROWSER: "webkit" }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => { process.stdout.write(data); log.write(data); });
  child.stderr.on("data", data => { process.stderr.write(data); log.write(data); });
  const exitCode = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  await new Promise(resolve => log.end(resolve));
  let status = exitCode === 0 ? "PASS" : "FAIL", reason = null;
  if (status === "PASS") try {
    const rows = JSON.parse(readFileSync(artifact, "utf8"));
    assert.deepEqual(rows.map(row => row.width).sort((a, b) => a - b), [390, 820, 1280], "all three stable WebKit viewports must complete");
    assert.ok(rows.every(row => row.status !== "FAIL" && (!row.errors || row.errors.length === 0) && (!row.pageErrors || row.pageErrors.length === 0 || row.pageErrors === 0)));
  } catch (error) { status = "FAIL"; reason = error.message; }
  results.push({ suite, browser: "webkit", widths: [390, 820, 1280], status, reason, exitCode, sourceSHA, artifact });
  writeFileSync(resolve(out, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.at(-1)));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n| ${suite} | WebKit 390/820/1280 | **${status}** | ${reason ?? "mandatory stable regression; no exception policy"} |\n`);
  if (status === "FAIL") { process.exitCode = 1; break; }
}
