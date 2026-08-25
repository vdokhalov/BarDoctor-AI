import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV290="owner-uat-v290";';
if (source.includes(marker)) {
  console.log("Owner UAT v290 patch already applied");
  process.exit(0);
}

const before = 'const he=V||bdAssortmentFallbackAnalyticsV170(E,m),ge=he.menuItems?.find';
const after = 'const bdAssortmentLocal=bdAssortmentFallbackAnalyticsV170(E,m),he=bdAssortmentLocal.menuItems.length?{...bdAssortmentLocal,economics:V?.economics??bdAssortmentLocal.economics,costChanges:V?.costChanges??bdAssortmentLocal.costChanges,period:V?.period??bdAssortmentLocal.period}:V||bdAssortmentLocal,ge=he.menuItems?.find';
if (!source.includes(before)) throw new Error("Owner UAT v290 catalog reconciliation target not found");
source = marker + source.replace(before, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v290 patch applied");
