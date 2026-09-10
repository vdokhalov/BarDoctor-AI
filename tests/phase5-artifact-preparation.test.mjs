import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { patchReceiptCost } from "../scripts/lib/phase5-receipt-cost.mjs";
import { replaceLegacyCostingSegment } from "../scripts/lib/legacy-costing-segment.mjs";
import { verifyClientRelease } from "../scripts/lib/client-release-integrity.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const bundlePath = "public/assets/index-BQGspy0I.js";
const current = fs.readFileSync(path.join(root, bundlePath), "utf8");
const oldLabel = 'children:"Последняя цена, если известна"';
const newLabel = 'children:"Справочная цена (не себестоимость)"';

test("v246 LF and CRLF source templates generate identical bytes and preserve strict anchors", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bd-phase5-v246-"));
  try {
    fs.mkdirSync(path.join(temporary, "scripts/fragments"), { recursive: true });
    fs.mkdirSync(path.join(temporary, "public/assets"), { recursive: true });
    fs.copyFileSync(path.join(root, "scripts/patch-inventory-layer-v246.mjs"), path.join(temporary, "scripts/patch-inventory-layer-v246.mjs"));
    const fragmentPath = "scripts/fragments/inventory-workflow-v245.fragment.txt";
    const fragment = fs.readFileSync(path.join(root, fragmentPath), "utf8").replace(/\r\n/g, "\n");
    const run = () => spawnSync(process.execPath, ["scripts/patch-inventory-layer-v246.mjs"], { cwd: temporary, encoding: "utf8", timeout: 30_000 });
    let expected;
    for (const newline of ["\n", "\r\n"]) {
      fs.writeFileSync(path.join(temporary, fragmentPath), fragment.replace(/\n/g, newline));
      fs.writeFileSync(path.join(temporary, bundlePath), current);
      const result = run();
      assert.equal(result.status, 0, result.stderr);
      const actual = fs.readFileSync(path.join(temporary, bundlePath));
      if (expected) assert.deepEqual(actual, expected);
      expected = actual;
      assert.equal(run().status, 0);
      assert.deepEqual(fs.readFileSync(path.join(temporary, bundlePath)), expected);
    }
    fs.writeFileSync(path.join(temporary, fragmentPath), fragment.replace('if(phase==="count")', 'if(phase==="missing")'));
    const failed = run();
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /line was not found/);
    assert.deepEqual(fs.readFileSync(path.join(temporary, bundlePath)), expected);
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith("bd-phase5-v246-"));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("v271 to v340 restores the same writeoff quick-create control for LF and CRLF templates", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bd-phase5-v271-"));
  try {
    fs.mkdirSync(path.join(temporary, "scripts/fragments"), { recursive: true });
    fs.mkdirSync(path.join(temporary, "public/assets"), { recursive: true });
    const scripts = ["scripts/patch-writeoff-workflow-v271.mjs", "scripts/patch-canonical-taxonomy-postbuild-v340.mjs"];
    for (const script of scripts) fs.copyFileSync(path.join(root, script), path.join(temporary, script));
    const fragmentPath = "scripts/fragments/writeoff-workflow-v271.fragment.txt";
    const fragment = fs.readFileSync(path.join(root, fragmentPath), "utf8").replace(/\r\n/g, "\n");
    let expected;
    for (const newline of ["\n", "\r\n"]) {
      fs.writeFileSync(path.join(temporary, fragmentPath), fragment.replace(/\n/g, newline));
      fs.writeFileSync(path.join(temporary, bundlePath), current);
      for (const script of scripts) {
        const result = spawnSync(process.execPath, [script], { cwd: temporary, encoding: "utf8", timeout: 30_000 });
        assert.equal(result.status, 0, result.stderr);
      }
      const actual = fs.readFileSync(path.join(temporary, bundlePath));
      if (expected) assert.deepEqual(actual, expected);
      expected = actual;
      const text = actual.toString("utf8");
      const picker = text.slice(text.indexOf("function bdWriteoffPickerV271"), text.indexOf("function bdWriteoffPickerRowV271"));
      assert.ok(picker.includes("bdNomenclatureQuickCreateV336"));
    }
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith("bd-phase5-v271-"));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("legacy replacements own their markers without consuming adjacent code or other comments", () => {
  const marker = "/* bd-unit-product-costing-v384 */";
  const prefix = "const unchanged = 1;\n/* unrelated */\n";
  const replacement = marker + "\nfunction start(){return 2}\n";
  const patch = input => replaceLegacyCostingSegment(input, "function start(", "function end(", replacement, "fixture");
  const expected = prefix + replacement + "function end(){}";
  for (const newline of ["\n", "\r\n"]) {
    const source = prefix + (marker + newline).repeat(4) + "function start(){return 1}\nfunction end(){}";
    assert.equal(patch(source), expected);
    assert.equal(patch(patch(source)), expected);
  }
  assert.throws(() => patch("function end(){}"), /start marker/);
  assert.throws(() => patch("function start(){}"), /end marker/);
  assert.throws(() => patch(expected + "function start(){}"), /duplicate/);
});

test("partial states and misleading marker are repaired; ambiguous or missing anchors reject", () => {
  const repaired = patchReceiptCost(current);
  assert.equal(patchReceiptCost(repaired), repaired);
  for (const input of [repaired.replace(newLabel, oldLabel), repaired.replace("function bdTechCostManualPointV409(){return null}", "function bdTechCostManualPointV409(){return {unitPrice:99}}"), repaired.replace("/* bd-phase5-receipt-only-cost */\n", "")]) assert.equal(patchReceiptCost(input), repaired);
  for (const input of [repaired.replace(newLabel, ""), repaired + newLabel, repaired + oldLabel, repaired.replace("function bdTechCostManualPointV409(", "function missing("), repaired + "function bdTechCostManualPointV409(){}"])
    assert.throws(() => patchReceiptCost(input), /unique/);
});

test("full declared test/build artifact preparation twice preserves behavior and byte-stable bundle", { timeout: 600_000 }, () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bd-phase5-preparation-"));
  const run = (args) => {
    const result = spawnSync(process.execPath, args, { cwd: temporary, encoding: "utf8", timeout: 120_000 });
    assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}\n${result.stderr}\n${result.error || ""}`);
  };
  try {
    for (const folder of ["scripts", "public", "app", "lib", ".openai"]) fs.cpSync(path.join(root, folder), path.join(temporary, folder), { recursive: true });
    fs.copyFileSync(path.join(root, "package.json"), path.join(temporary, "package.json"));
    fs.mkdirSync(path.join(temporary, "tests"));
    for (const name of ["manual-nomenclature-cost-fallback-v409.test.ts", "manual-reference-price-phase5.test.ts"]) fs.copyFileSync(path.join(root, "tests", name), path.join(temporary, "tests", name));
    fs.symlinkSync(path.join(root, "node_modules"), path.join(temporary, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts;
    const build = fs.readFileSync(path.join(root, "scripts/build-verified.sh"), "utf8").split('  "${vinext}" build');
    assert.equal(build.length, 2, "verified build compiler boundary must be unique");
    const buildCommands = block => [...block.matchAll(/^node "\$\{script_dir\}\/([a-z0-9-]+\.mjs)"\r?$/gm)].map(match => "scripts/" + match[1]);
    const checkBehavior = () => run(["--import", "tsx", "--test", "tests/manual-nomenclature-cost-fallback-v409.test.ts", "tests/manual-reference-price-phase5.test.ts"]);
    const releaseSnapshot = () => Object.fromEntries([bundlePath, "dist/client/app.html", "dist/client/bardoctor-preview.js", "dist/client/bardoctor-preview-v396.js", "dist/client/bardoctor-preview-v397.js", "dist/server/index.js"]
      .map(file => [file, fs.readFileSync(path.join(temporary, file))]));
    const assertReleaseBytes = (actual, expected, label) => {
      for (const [file, before] of Object.entries(expected)) {
        const after = actual[file];
        if (before.equals(after)) continue;
        let offset = 0;
        while (offset < Math.min(before.length, after.length) && before[offset] === after[offset]) offset++;
        assert.fail(label + ": " + JSON.stringify({ file, offset, beforeLength: before.length, afterLength: after.length,
          before: before.subarray(Math.max(0, offset - 120), offset + 240).toString(), after: after.subarray(Math.max(0, offset - 120), offset + 240).toString() }));
      }
    };
    let builtRelease;
    const prepareBuildArtifact = () => {
      for (const command of buildCommands(build[0])) run([command]);
      // Model only the compiler's public-file copy; actual compilation stays in the full CI build gate.
      fs.cpSync(path.join(temporary, "public"), path.join(temporary, "dist/client"), { recursive: true });
      // Model the compiled HTML string too; real Worker compilation is the CI gate.
      fs.mkdirSync(path.join(temporary, "dist/server"), { recursive: true });
      fs.writeFileSync(path.join(temporary, "dist/server/index.js"), "export const html=" + JSON.stringify(fs.readFileSync(path.join(temporary, "public/app.html"), "utf8")) + ";");
      for (const command of buildCommands(build[1])) run([command]);
      const html = fs.readFileSync(path.join(temporary, "dist/client/app.html"), "utf8");
      const asset = html.match(/\/assets\/(index-BQGspy0I-[a-f0-9]{12}\.js)/);
      assert.ok(asset, "packaged HTML must reference a versioned asset");
      const published = fs.readFileSync(path.join(temporary, "dist/client/assets", asset[1]), "utf8");
      assert.equal(patchReceiptCost(published), published);
      assert.equal(published, fs.readFileSync(path.join(temporary, bundlePath), "utf8"), "packaged and canonical costing must agree");
      checkBehavior();
      builtRelease = releaseSnapshot();
    };
    let previous, previousEntrypoints;
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const phase of ["pretest:artifact", "prebuild", "verified-build-preparation", "pretest:artifact"]) {
        if (phase === "verified-build-preparation") { prepareBuildArtifact(); continue; }
        for (const command of scripts[phase].split(" && ")) {
          const match = /^node (scripts\/[a-z0-9-]+\.mjs)$/.exec(command);
          assert.ok(match, `unsupported preparation command: ${command}`);
          run([match[1]]);
        }
        if (phase === "pretest:artifact" && fs.existsSync(path.join(temporary, "dist/server/index.js"))) verifyClientRelease(temporary);
      }
      const prepared = fs.readFileSync(path.join(temporary, bundlePath), "utf8");
      assertReleaseBytes(releaseSnapshot(), builtRelease, "Post-build test preparation must preserve built release bytes");
      assert.equal(patchReceiptCost(prepared), prepared);
      checkBehavior();
      if (previous && prepared !== previous) {
        let offset = 0;
        while (offset < Math.min(previous.length, prepared.length) && previous[offset] === prepared[offset]) offset++;
        assert.fail("second full preparation must be byte-stable: " + JSON.stringify({ offset, previousLength: previous.length, preparedLength: prepared.length, before: previous.slice(Math.max(0, offset - 100), offset + 600), after: prepared.slice(Math.max(0, offset - 100), offset + 600) }));
      }
      previous = prepared;
      const entrypoints = releaseSnapshot();
      if (previousEntrypoints) assertReleaseBytes(entrypoints, previousEntrypoints, "Full repeated preparation must preserve emitted loader, HTML and Worker bytes");
      previousEntrypoints = entrypoints;
    }
  } finally {
    // Never follow the shared dependency junction during temporary copy cleanup.
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith("bd-phase5-preparation-"));
    const dependencies = path.join(temporary, "node_modules");
    if (fs.existsSync(dependencies)) fs.unlinkSync(dependencies);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
