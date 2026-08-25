import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const marker = 'const bdOwnerUATFixesV287="owner-uat-v287";';
if (source.includes(marker)) {
  console.log("Owner UAT v287 patch already applied");
  process.exit(0);
}

function replaceOnce(label, before, after) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Owner UAT v287 target not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Owner UAT v287 target is ambiguous: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "assortment overview venue currency prop",
  'function bdAssortmentOverviewV170({analytics:e,period:t,onPeriod:n,onSignal:r,onImport:a,onTab:s,canManage:l})',
  'function bdAssortmentOverviewV170({analytics:e,period:t,onPeriod:n,onSignal:r,onImport:a,onTab:s,canManage:l,currency:bdAssortmentCurrency})',
);

source = source.replaceAll('e.menuItems?.[0]?.currency||"RUB"', 'e.menuItems?.[0]?.currency||bdAssortmentCurrency||"RUB"');

replaceOnce(
  "assortment overview receives profile currency",
  'i.jsx(bdAssortmentOverviewV170,{analytics:he,period:m,onPeriod:h,onSignal:je,onImport:()=>ee(!0),onTab:ye,canManage:me})',
  'i.jsx(bdAssortmentOverviewV170,{analytics:he,period:m,onPeriod:h,onSignal:je,onImport:()=>ee(!0),onTab:ye,canManage:me,currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB"})',
);

source = marker + source;
writeFileSync(bundlePath, source);
console.log("Owner UAT v287 patch applied");
