import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV295="owner-uat-v295";';
if (source.includes(marker)) {
  console.log("Owner UAT v295 patch already applied");
  process.exit(0);
}

const before = 'g.quantity!=null?g.quantity:"—"," ",g.unit||""';
const after = 'g.quantity!=null?g.quantity:"—"," ",bdAssortmentUnitLabelV293(g.unit)';
if (!source.includes(before)) throw new Error("Owner UAT v295 assortment detail unit target not found");
source = marker + source.replace(before, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v295 patch applied");
