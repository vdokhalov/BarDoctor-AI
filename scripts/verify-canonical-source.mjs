import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalAsset = "index-BQGspy0I.js";
const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .trim()
  .split("\n");

assert.ok(tracked.includes(`public/assets/${canonicalAsset}`), "Canonical tracked client asset is missing");
assert.equal(
  tracked.filter((name) => /^public\/assets\/index-BQGspy0I-[a-f0-9]{12}\.js$/.test(name)).length,
  0,
  "Content-versioned build assets must exist only under dist",
);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const source = readFileSync(path.join(root, relativePath), "utf8");
  assert.ok(source.includes(`/assets/${canonicalAsset}?v=`), `${relativePath} must reference the canonical source asset`);
}
for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html"]) {
  const source = readFileSync(path.join(root, relativePath), "utf8");
  assert.ok(source.includes("bd-mobile-menu-editor-v400"), `${relativePath} is missing the latest client cache identity`);
}

const bundle = readFileSync(path.join(root, "public/assets", canonicalAsset), "utf8");
for (const marker of [
  "bd-business-health-watchdog-v378",
  "bd-unit-product-costing-v387",
  "bd-warehouse-unit-integrity-v399",
]) {
  assert.ok(bundle.includes(marker), `Canonical client asset is missing ${marker}`);
}

console.log("Canonical tracked source verified without mutation.");
