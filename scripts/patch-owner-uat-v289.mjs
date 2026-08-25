import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV289="owner-uat-v289";';
if (source.includes(marker)) {
  console.log("Owner UAT v289 patch already applied");
  process.exit(0);
}

const before = 'onSave:Ae,onManageStructure:()=>{M(null),I(!0)}})';
const after = 'onSave:Ae,onManageStructure:()=>{M(null),I(!0)},currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB"})';
if (!source.includes(before)) throw new Error("Owner UAT v289 active menu editor target not found");
source = marker + source.replace(before, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v289 patch applied");
