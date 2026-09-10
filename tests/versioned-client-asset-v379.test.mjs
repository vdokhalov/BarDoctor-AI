import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import vm from "node:vm";
import { clientAssetName, finalizeClientRelease, verifyClientRelease } from "../scripts/lib/client-release-integrity.mjs";
import { patchReceiptCost } from "../scripts/lib/phase5-receipt-cost.mjs";

test("packaged release uses a physical content-versioned client asset", async () => {
  const root = process.cwd();
  const html = await readFile(path.join(root, "dist/client/app.html"), "utf8");
  const match = html.match(/\/assets\/(index-BQGspy0I-[a-f0-9]{12}\.js)/);

  assert.ok(match, "versioned client asset reference is present");
  const assetPath = path.join(root, "dist/client/assets", match[1]);
  assert.ok(existsSync(assetPath), "versioned client asset exists");

  const asset = await readFile(assetPath, "utf8");
  const verified = verifyClientRelease(root);
  assert.equal(verified.name, match[1]);
  assert.match(asset, /bd-business-health-watchdog-v378/);
  assert.match(asset, /bdHealthWaitExpired/);
  assert.match(asset, /function bdHomeReviewsCardV409/);
  assert.match(asset, /bdHomeReviewsCardV409,\{state:bdHomeReviewState,onNavigate:g\}/);
  assert.match(asset, /bd-manual-nomenclature-cost-fallback-v409/);
});

function releaseFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bd-client-release-"));
  const canonical = Buffer.from(patchReceiptCost(fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8")));
  const stale = "/assets/index-BQGspy0I-000000000000.js?v=prior";
  const html = `<link rel="modulepreload" href="${stale}"><script src="/bardoctor-preview-v397.js?v=desktop-startup-v411-auth" defer></script>`;
  const put = (name, value) => fs.writeFileSync(path.join(root, name), value);
  try {
    fs.mkdirSync(path.join(root, "dist/client/assets"), { recursive: true });
    fs.mkdirSync(path.join(root, "dist/server"), { recursive: true });
    fs.mkdirSync(path.join(root, "public/assets"), { recursive: true });
    put("public/assets/index-BQGspy0I.js", canonical);
    put("dist/client/app.html", html);
    put("dist/server/index.js", `const prefix="/bardoctor-preview-v397.js?v=desktop-startup-v411";export const html=${JSON.stringify(html)};`);
    for (const name of ["bardoctor-preview.js", "bardoctor-preview-v396.js", "bardoctor-preview-v397.js"]) put("dist/client/" + name, `var script={};script.src="${stale}";`);
    run({ root, canonical, put, read: name => fs.readFileSync(path.join(root, name), "utf8") });
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("bd-client-release-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("release finalization fixes every executed bootstrap and Worker and is byte-stable", () => releaseFixture(({ root, canonical, read }) => {
  const result = finalizeClientRelease(root, canonical);
  const release = verifyClientRelease(root);
  assert.equal(release.name, clientAssetName(canonical));
  assert.equal(release.entries.length, 5);
  for (const filename of ["bardoctor-preview.js", "bardoctor-preview-v396.js", "bardoctor-preview-v397.js"]) {
    const executed = vm.runInNewContext(read("dist/client/" + filename) + ";script.src");
    assert.equal(new URL(executed, "https://release.invalid").pathname, "/assets/" + result.name);
    assert.deepEqual(fs.readFileSync(path.join(root, "dist/client", new URL(executed, "https://release.invalid").pathname)), canonical);
  }
  assert.ok(read("dist/server/index.js").includes('const prefix="/bardoctor-preview-v397.js?v=desktop-startup-v411";'), "Startup prefix rewriting must remain intact");
  assert.deepEqual(finalizeClientRelease(root, canonical).changed, []);
}));

for (const filename of ["dist/client/bardoctor-preview-v397.js", "dist/client/bardoctor-preview-v396.js", "dist/server/index.js"]) {
  test(`release verifier rejects stale execution reference despite correct preload: ${filename}`, () => releaseFixture(({ root, canonical, put, read }) => {
    const { name } = finalizeClientRelease(root, canonical);
    put(filename, read(filename).replaceAll(name, "index-BQGspy0I-000000000000.js"));
    assert.throws(() => verifyClientRelease(root), /stale client|Stale client|cache identity/);
  }));
}

test("release verifier rejects missing loader, stale bootstrap cache identity and altered bytes", () => releaseFixture(({ root, canonical, put, read }) => {
  const { name } = finalizeClientRelease(root, canonical);
  const loader = read("dist/client/bardoctor-preview-v397.js");
  fs.unlinkSync(path.join(root, "dist/client/bardoctor-preview-v397.js"));
  assert.throws(() => verifyClientRelease(root), /ENOENT/);
  put("dist/client/bardoctor-preview-v397.js", loader);
  const html = read("dist/client/app.html");
  put("dist/client/app.html", html.replace(/bd-release=[a-f0-9]+/, "bd-release=stale"));
  assert.throws(() => verifyClientRelease(root), /cache identity/);
  put("dist/client/app.html", html);
  put("dist/client/assets/" + name, canonical.toString("utf8") + "\n// altered");
  assert.throws(() => verifyClientRelease(root), /actual bytes/);
}));

test("release verifier rejects a correctly hashed but receipt-free manual-cost fallback", () => releaseFixture(({ root, canonical, put }) => {
  const staleCost = Buffer.from(canonical.toString("utf8").replace("function bdTechCostManualPointV409(){return null}", "function bdTechCostManualPointV409(){return {unitPrice:20}}"));
  assert.notDeepEqual(staleCost, canonical);
  put("public/assets/index-BQGspy0I.js", staleCost);
  finalizeClientRelease(root, staleCost);
  assert.throws(() => verifyClientRelease(root), /receipt-only/);
}));

test("release identity changes for loader-only edits and rejects a prior canonical client", () => releaseFixture(({ root, canonical, put, read }) => {
  finalizeClientRelease(root, canonical);
  const before = read("dist/client/app.html");
  put("dist/client/bardoctor-preview-v397.js", read("dist/client/bardoctor-preview-v397.js") + "\n// loader-only fix");
  assert.throws(() => verifyClientRelease(root), /cache identity/);
  finalizeClientRelease(root, canonical);
  assert.notEqual(read("dist/client/app.html"), before);
  verifyClientRelease(root);
  assert.deepEqual(finalizeClientRelease(root, canonical).changed, []);
  put("public/assets/index-BQGspy0I.js", canonical.toString("utf8") + "\n// new client fix");
  assert.throws(() => verifyClientRelease(root), /current canonical/);
}));

test("release verifier rejects a commented-only bootstrap and malformed client reference", () => releaseFixture(({ root, canonical, put, read }) => {
  finalizeClientRelease(root, canonical);
  const html = read("dist/client/app.html");
  put("dist/client/app.html", html.replace(/(<script[\s\S]*?<\/script>)/, "<!--$1-->"));
  assert.throws(() => verifyClientRelease(root), /executable bootstrap/);
  put("dist/client/app.html", html);
  put("dist/server/index.js", read("dist/server/index.js").replace(/index-BQGspy0I-[a-f0-9]{12}\.js/, "index-BQGspy0I-bad-hash.js"));
  assert.throws(() => verifyClientRelease(root), /Stale client/);
}));

test("release legacy v395 repeated insertion and v396 removal preserve unrelated header whitespace", () => {
  const v395 = fs.readFileSync("scripts/patch-single-splash-v395.mjs", "utf8");
  const v396 = fs.readFileSync("scripts/patch-native-continuity-v396.mjs", "utf8");
  const trace = v395.slice(v395.indexOf("const frameTraceBootstrap ="), v395.indexOf("const frameTraceInline ="));
  const functionSource = source => source.slice(source.indexOf("function patchBootstrap(path)"), source.indexOf("\n}", source.indexOf("function patchBootstrap(path)")) + 2);
  const initial = '(async function () {\n  "use strict";\n\n\n\n  window.__bdBootstrapPending=true;\n  var bdStartupRecoveryVersionV341 = "native-continuity-v396";\n})();';
  let current = initial;
  const context = { URL, readFileSync: () => current, existsSync: () => true, writeFileSync: (_path, source) => { current = source; }, copyFileSync: () => {} };
  const insert = vm.runInNewContext(trace + functionSource(v395) + ";patchBootstrap", context);
  const remove = vm.runInNewContext(functionSource(v396) + ";patchBootstrap", context);
  for (let cycle = 0; cycle < 3; cycle++) {
    insert("https://fixture.invalid/bardoctor-preview.js");
    const once = current;
    insert("https://fixture.invalid/bardoctor-preview.js");
    assert.equal(current, once, "v394 import plus direct v395 call must be byte-idempotent");
    remove("https://fixture.invalid/bardoctor-preview.js");
    assert.equal(current, initial, "Only the inserted trace and its own spacing may be removed");
  }
});

test("release legacy v352 cache refresh never appends a second owned token", () => {
  const source = fs.readFileSync("scripts/patch-menu-nomenclature-link-v352.mjs", "utf8");
  const start = source.indexOf("function refreshShellCache()");
  const end = source.indexOf("\nif (source.includes(marker))", start);
  assert.ok(start >= 0 && end > start);
  const refresh = source.slice(start, end);
  for (const initial of ["20260829-menu-nomenclature-action-v351", "20260829-menu-nomenclature-action-v351-menu-link-v352", "20260829-menu-nomenclature-action-v351-menu-link-v352-menu-link-v352"]) {
    let current = initial;
    const run = vm.runInNewContext(refresh + ";refreshShellCache", { shellPaths: ["shell"], readFileSync: () => current, writeFileSync: (_path, next) => { current = next; } });
    run();
    const once = current;
    run(); run();
    assert.equal(current, once);
    assert.equal(current, initial.includes("-menu-link-v352") ? initial : initial + "-menu-link-v352");
  }
});
