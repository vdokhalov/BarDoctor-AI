import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patchMonthlyBundle, patchMonthlyFragment } from "./lib/monthly-financial-model.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/monthly-report-v165.fragment.txt");
const modelPath = path.join(root, "lib/bardoctor/financial-reconciliation.ts");
const bundle = fs.readFileSync(bundlePath, "utf8");
const fragment = fs.readFileSync(fragmentPath, "utf8");
const model = fs.readFileSync(modelPath, "utf8");
// Complete all validation before either file is written.
const patchedBundle = patchMonthlyBundle(bundle, model);
const patchedFragment = patchMonthlyFragment(fragment);
if (patchMonthlyBundle(patchedBundle, model) !== patchedBundle
  || patchMonthlyFragment(patchedFragment) !== patchedFragment) {
  throw new Error("Phase 7: monthly patch must be byte-stable before writing");
}
if (patchedBundle !== bundle) fs.writeFileSync(bundlePath, patchedBundle);
if (patchedFragment !== fragment) fs.writeFileSync(fragmentPath, patchedFragment);
console.log("Phase 7: historical monthly costing and captured closed-period metadata applied");
