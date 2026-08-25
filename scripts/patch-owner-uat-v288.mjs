import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV288="owner-uat-v288";';
if (source.includes(marker)) {
  console.log("Owner UAT v288 patch already applied");
  process.exit(0);
}

function replaceOnce(label, before, after) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Owner UAT v288 target not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Owner UAT v288 target is ambiguous: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "menu editor venue currency prop",
  'function bdCatMenuEditor({item:e,horizon:t,groups:n,subgroups:r,onClose:a,onSave:s,onManageStructure:l})',
  'function bdCatMenuEditor({item:e,horizon:t,groups:n,subgroups:r,onClose:a,onSave:s,onManageStructure:l,currency:bdMenuVenueCurrency="RUB"})',
);
replaceOnce(
  "new menu item venue currency",
  'name:"",salePrice:0,currency:"RUB",portionSize:""',
  'name:"",salePrice:0,currency:bdMenuVenueCurrency||"RUB",portionSize:""',
);
replaceOnce(
  "menu currency selector fallback",
  'value:m.currency||"RUB",onChange:N=>g("currency",N.target.value)',
  'value:m.currency||bdMenuVenueCurrency||"RUB",onChange:N=>g("currency",N.target.value)',
);
replaceOnce(
  "menu editor receives venue currency",
  'onSave:ie,onManageStructure:()=>bdSetStructureOpen(!0)})',
  'onSave:ie,onManageStructure:()=>bdSetStructureOpen(!0),currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB"})',
);

source = marker + source;
writeFileSync(bundlePath, source);
console.log("Owner UAT v288 patch applied");
