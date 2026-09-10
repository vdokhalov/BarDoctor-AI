import assert from "node:assert/strict";
import { patchReceiptCost } from "./lib/phase5-receipt-cost.mjs";
import { verifyClientRelease } from "./lib/client-release-integrity.mjs";

const root = process.cwd();
const release = verifyClientRelease(root);
const asset = release.bytes.toString("utf8");
assert.equal(patchReceiptCost(asset), asset, "The packaged asset must retain Phase 5 receipt-only costing");
assert.ok(asset.includes('"data-bd-opening-phase5"'), "The packaged asset must retain the Phase 5 opening entry");
for (const marker of [
  "bd-tech-card-costing-v376",
  "bd-business-health-detail-v377",
  "bd-business-health-watchdog-v378",
  "bd-unit-product-costing-v385",
  "bd-unit-product-costing-v386",
  "bd-unit-product-costing-v387",
  "function bdHomeReviewsCardV409",
  "bdHomeReviewsCardV409,{state:bdHomeReviewState,onNavigate:g}",
  "bd-manual-nomenclature-cost-fallback-v409",
  'const bdMenuConsumptionSotVersionV418="v418";',
  "bd-menu-consumption-grid-v418",
  "bd-tech-card-total-v418",
]) {
  assert.ok(asset.includes(marker), `The packaged client asset is stale: ${marker} is missing`);
}

assert.ok(asset.includes("bdHealthWaitExpired"), "The packaged Business Health watchdog is missing");
console.log(`bd-versioned-client-asset-v379: verified ${release.name} across ${release.entries.length} emitted entrypoints`);
