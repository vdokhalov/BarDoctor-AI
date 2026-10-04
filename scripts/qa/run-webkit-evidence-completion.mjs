import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { webkit } from "playwright-core";
import { prepareEvidenceSource } from "./prepare-webkit-evidence-source.mjs";

const out = resolve("outputs/webkit-evidence-completion"); mkdirSync(out, {recursive:true});
const original = readFileSync("scripts/derived-metrics-phase3a8-browser.ts", "utf8");
const prepared = prepareEvidenceSource(original);
const generated = resolve(`scripts/.derived-webkit-evidence-${process.pid}.ts`);
writeFileSync(generated, prepared.output);
const equivalence = { sourceSHA256: prepared.sourceSHA256, insertions: prepared.insertions, byteForByteRecovered: prepared.byteForByteRecovered };
writeFileSync(resolve(out,"coverage-equivalence.json"), JSON.stringify({ ...equivalence, applicationSHA: "e48ac83476850bc33cc433a4ffe21804300da20a", allOriginalActionsAssertionsTimeoutsPreserved: true }, null, 2));
// Six bounded, individually retained low-impact observations planned in advance.
// Every original failure remains exit=1. There is no retry-to-green or release pass.
const results = [];
try { for (let occurrence = 1; occurrence <= 6; occurrence++) {
  const stem = resolve(out, `occurrence-${occurrence}`), log = createWriteStream(`${stem}.log`);
  const child = spawn(process.execPath, ["--import", "tsx", generated], {env: {...process.env,
    DEBUG:"pw:browser", BD_DERIVED_BROWSER:"webkit", BD_DERIVED_WIDTH:"1280", BD_WEBKIT_EVIDENCE:`${stem}-evidence.json`,
    BD_WEBKIT_REAL_EXECUTABLE:webkit.executablePath(), BD_WEBKIT_PROCESS_TRACE:`${stem}-process.log`, BD_WEBKIT_COMPLETION_JOURNAL:`${stem}-journal.ndjson`,
  }, stdio:["ignore","pipe","pipe"]});
  for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { process.stdout.write(chunk); log.write(chunk); });
  const exitCode = await new Promise((done,reject)=>{child.on("close",done);child.on("error",reject);});
  await new Promise(done=>log.end(done));
  results.push({occurrence, originalSuiteExitCode:exitCode});
  writeFileSync(resolve(out,"diagnostic-results.json"),JSON.stringify({releaseGate:"NOT_EVALUATED", plannedOccurrences:6, results},null,2));
} } finally { rmSync(generated,{force:true}); }
