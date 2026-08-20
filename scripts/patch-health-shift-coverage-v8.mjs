import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const previousCoverage =
  'function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[];for(let a=0;a<70&&r.length<8;a+=1){const s=new Date(n);s.setHours(12,0,0,0),s.setDate(s.getDate()-a);if(!Rg(e,s))continue;const l=$g(e,s,n);l.status==="completed"&&r.push(l.bounds.operatingDate)}if(r.length===0)return null;const a=new Set(t.map(s=>s.date.slice(0,10))),s=r.filter(l=>a.has(l)).length;return{expected:r.length,entered:s,percent:Math.round(s/r.length*100)}}';

const currentMonthCoverage =
  'function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[],a=new Date(n);a.setDate(1),a.setHours(12,0,0,0);for(let s=new Date(a);s<=n;s.setDate(s.getDate()+1)){if(!Rg(e,s))continue;const l=$g(e,s,n);l.status==="completed"&&r.push(l.bounds.operatingDate)}if(r.length===0)return null;const s=new Set(t.map(l=>l.date.slice(0,10))),l=r.filter(u=>s.has(u)).length;return{expected:r.length,entered:l,percent:Math.round(l/r.length*100)}}';

if (source.includes(currentMonthCoverage)) {
  console.log("Current-month health shift coverage v8 is already applied.");
  process.exit(0);
}

if (!source.includes(previousCoverage)) {
  throw new Error("Previous rolling-eight health shift coverage was not found.");
}

source = source.replace(previousCoverage, currentMonthCoverage);
source = source.replaceAll(
  'Данные внесены только по "+C.entered+" из "+C.expected+" завершённых смен',
  'Данные внесены только по "+C.entered+" из "+C.expected+" завершённых смен текущего месяца',
);
source = source.replaceAll(
  'Не все завершённые смены учтены: "+C.entered+" из "+C.expected',
  'Не все завершённые смены текущего месяца учтены: "+C.entered+" из "+C.expected',
);
source = source.replaceAll(
  "Все последние завершённые смены учтены",
  "Все завершённые смены текущего месяца учтены",
);

await writeFile(bundlePath, source);
console.log("Current-month health shift coverage v8 applied.");
