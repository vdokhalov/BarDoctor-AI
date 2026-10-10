import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { webkit } from "playwright-core";
import { classifyWebKitLifecycle, WEBKIT_LIFECYCLE_SUITES } from "./qa/webkit-environment-classifier.mjs";

import { isWebKitLifecycleReleaseReady } from "./qa/webkit-release-gate.mjs";

const out = resolve("outputs/webkit-health-lifecycle"), results = [];
mkdirSync(out, { recursive: true });
suites: for (const suite of WEBKIT_LIFECYCLE_SUITES) for (const width of [390, 820, 1280]) {
  const stem = resolve(out, `${suite}-${width}`), trace = `${stem}-process.log`, evidence = `${stem}-evidence.json`;
  rmSync(trace, { force: true }); rmSync(evidence, { force: true }); // Fresh ignored QA evidence only.
  const log = createWriteStream(`${stem}.log`);
  const child = spawn(process.execPath, ["--import", "tsx", `scripts/${suite}-browser.ts`], { env: { ...process.env,
    BD_HEALTH_BROWSER: "webkit", BD_DERIVED_BROWSER: "webkit", BD_HEALTH_WIDTH: String(width), BD_DERIVED_WIDTH: String(width),
    BD_WEBKIT_REAL_EXECUTABLE: webkit.executablePath(), BD_WEBKIT_PROCESS_TRACE: trace, BD_WEBKIT_EVIDENCE: evidence,
  }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => { process.stdout.write(data); log.write(data); });
  child.stderr.on("data", data => { process.stderr.write(data); log.write(data); });
  const exitCode = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  await new Promise(resolve => log.end(resolve));
  const result = classifyWebKitLifecycle({ suite, width, exitCode, testLog: readFileSync(`${stem}.log`, "utf8"), trace: existsSync(trace) ? readFileSync(trace, "utf8") : "", evidence: existsSync(evidence) ? JSON.parse(readFileSync(evidence, "utf8")) : null });
  results.push({ suite, width, sourceSHA: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), exitCode, ...result });
  writeFileSync(resolve(out, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ suite, width, status: result.status, classification: result.classification, reason: result.reason }));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n| ${suite} | WebKit ${width}px | **${result.status}** | ${result.reason ?? "unchanged assertions passed; no native fatal signal"} |\n`);
  if (result.status === "FAIL") { process.exitCode = 1; break suites; }
}

if (!isWebKitLifecycleReleaseReady(results)) process.exitCode = 1;
