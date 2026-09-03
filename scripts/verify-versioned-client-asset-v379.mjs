import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "dist/client/app.html"), "utf8");
const match = html.match(/\/assets\/(index-BQGspy0I-[a-f0-9]{12}\.js)/);

assert.ok(match, "The packaged app must reference a content-versioned client asset");

const assetPath = path.join(root, "dist/client/assets", match[1]);
assert.ok(fs.existsSync(assetPath), `The packaged client asset is missing: ${match[1]}`);

const asset = fs.readFileSync(assetPath, "utf8");
for (const marker of [
  "bd-tech-card-costing-v376",
  "bd-business-health-detail-v377",
  "bd-business-health-watchdog-v378",
  "bd-unit-product-costing-v385",
  "bd-unit-product-costing-v386",
  "bd-unit-product-costing-v387",
]) {
  assert.ok(asset.includes(marker), `The packaged client asset is stale: ${marker} is missing`);
}

assert.ok(asset.includes("bdHealthWaitExpired"), "The packaged Business Health watchdog is missing");
console.log(`bd-versioned-client-asset-v379: verified ${match[1]}`);
