import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

if (bundle.includes("verificationPlanId:e.verificationPlanId")) {
  console.log("AI Doctor verification plan persistence v255 is already installed");
  process.exit(0);
}

const search = 'recommendationContractVersion:e.recommendationContractVersion??"result-loop-v1",statusHistory:';
const replacement = 'recommendationContractVersion:e.recommendationContractVersion??"result-loop-v1",verificationPlanId:e.verificationPlanId,verificationPlan:e.verificationPlan??null,statusHistory:';
const first = bundle.indexOf(search);
if (first < 0 || bundle.indexOf(search, first + search.length) >= 0) {
  throw new Error("Missing or ambiguous recommendation task contract");
}
bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
writeFileSync(bundlePath, bundle);
console.log("Installed AI Doctor verification plan persistence v255");
