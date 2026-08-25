import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV293="owner-uat-v293";';
if (source.includes(marker)) {
  console.log("Owner UAT v293 patch already applied");
  process.exit(0);
}

const helperAnchor = 'function bdAssortmentPercentV170(e){return e==null||!Number.isFinite(Number(e))?"Недостаточно данных":(Number(e)>0?"+":"")+String(Number(e)).replace(".",",")+"%"}';
const helper = helperAnchor + 'function bdAssortmentUnitLabelV293(e){const t=String(e||"").toLowerCase();return({ml:"мл",l:"л",g:"г",kg:"кг",pcs:"шт.",pc:"шт.",piece:"шт."})[t]||e||""}';
if (!source.includes(helperAnchor)) throw new Error("Owner UAT v293 assortment unit helper anchor not found");
source = source.replace(helperAnchor, helper);

const before = 'v.quantity!=null?v.quantity:"—"," ",v.unit||""';
const after = 'v.quantity!=null?v.quantity:"—"," ",bdAssortmentUnitLabelV293(v.unit)';
if (!source.includes(before)) throw new Error("Owner UAT v293 assortment unit display target not found");
source = marker + source.replace(before, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v293 patch applied");
