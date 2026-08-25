import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const marker = 'const bdOwnerUATFixesV286="owner-uat-v286";';
const installedNeedle = 'const l=bdHealthDateKey(a),u=bdHealthDateKey(n)';
if (source.includes(marker) && source.includes(installedNeedle)) {
  console.log("Owner UAT v286 patch already applied");
  process.exit(0);
}
source = source.replaceAll(marker, "");

const before = 'function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[],a=new Date(n);a.setDate(1),a.setHours(12,0,0,0);for(let s=new Date(a);s<=n;s.setDate(s.getDate()+1)){if(!Rg(e,s))continue;const l=$g(e,s,n);l.status==="completed"&&r.push(l.bounds.operatingDate)}if(r.length===0)return null;const s=new Set(t.map(l=>l.date.slice(0,10))),l=r.filter(u=>s.has(u)).length;return{expected:r.length,entered:l,percent:Math.round(l/r.length*100)}}';
const previousAfter = 'function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[],a=new Date(n),s=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";a.setDate(1),a.setHours(12,0,0,0);const l=bdDateKey(a),u=bdDateKey(n);for(let d=new Date(a);d<=n;d.setDate(d.getDate()+1)){if(!Rg(e,d))continue;const f=$g(e,d,n);f.status==="completed"&&(!s||f.bounds.operatingDate>=s)&&r.push(f.bounds.operatingDate)}const d=new Set(r);for(const f of t){const m=f.date.slice(0,10);m>=l&&m<=u&&(!s||m>=s)&&Rg(e,new Date(m+"T12:00:00"))&&!d.has(m)&&(d.add(m),r.push(m))}if(r.length===0)return null;const f=new Set(t.map(m=>m.date.slice(0,10))),m=r.filter(h=>f.has(h)).length;return{expected:r.length,entered:m,percent:Math.round(m/r.length*100)}}';
const after = 'function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[],a=new Date(n),s=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";a.setDate(1),a.setHours(12,0,0,0);const l=bdHealthDateKey(a),u=bdHealthDateKey(n);for(let d=new Date(a);d<=n;d.setDate(d.getDate()+1)){if(!Rg(e,d))continue;const f=$g(e,d,n);f.status==="completed"&&(!s||f.bounds.operatingDate>=s)&&r.push(f.bounds.operatingDate)}const d=new Set(r);for(const f of t){const m=f.date.slice(0,10);m>=l&&m<=u&&(!s||m>=s)&&Rg(e,new Date(m+"T12:00:00"))&&!d.has(m)&&(d.add(m),r.push(m))}if(r.length===0)return null;const f=new Set(t.map(m=>m.date.slice(0,10))),m=r.filter(h=>f.has(h)).length;return{expected:r.length,entered:m,percent:Math.round(m/r.length*100)}}';

const target = source.includes(previousAfter) ? previousAfter : before;
if (!source.includes(target)) {
  throw new Error("Owner UAT v286 Business Health coverage target not found");
}
source = marker + source.replace(target, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v286 patch applied");
