import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const before = "function L7(e,t,n){const r=e.slice(0,10);return";
const after = 'function L7(e,t,n){if(typeof e!=="string")return!1;const r=e.slice(0,10);return';
const periodBefore = "function BS(e,t,n){const r=e.slice(0,10);return";
const periodAfter = 'function BS(e,t,n){if(typeof e!=="string")return!1;const r=e.slice(0,10);return';
const startupBefore = '{reviews:y}=Vg(),j=S.useMemo(()=>zC(u,d,f,m,h,y,{profile:t,settings:a,snapshots:s,equipment:l}),[u,d,f,m,h,y,t,a,s,l])';
const startupAfter = '{reviews:y}=Vg(),bdHealthRouteActiveV182=window.location.pathname==="/"||window.location.pathname==="/home",j=S.useMemo(()=>bdHealthRouteActiveV182?zC(u,d,f,m,h,y,{profile:t,settings:a,snapshots:s,equipment:l}):null,[bdHealthRouteActiveV182,u,d,f,m,h,y,t,a,s,l])';
const closedMonthBefore = 'N=S.useMemo(()=>bdHealthLatestClosedMonthV153(t,m,h,s,a,g),[t,m,h,s,a,g])';
const closedMonthAfter = 'N=S.useMemo(()=>bdHealthRouteActiveV182?bdHealthLatestClosedMonthV153(t,m,h,s,a,g):"",[bdHealthRouteActiveV182,t,m,h,s,a,g])';
let bundle = await readFile(bundlePath, "utf8");

if (bundle.includes(before)) bundle = bundle.replace(before, after);
if (!bundle.includes(after)) throw new Error("Health date guard was not installed");
if (bundle.includes(periodBefore)) bundle = bundle.replace(periodBefore, periodAfter);
if (!bundle.includes(periodAfter)) throw new Error("Finance period date guard was not installed");
if (bundle.includes(startupBefore)) bundle = bundle.replace(startupBefore, startupAfter);
if (!bundle.includes(startupAfter)) throw new Error("Health startup route guard was not installed");
if (bundle.includes(closedMonthBefore)) bundle = bundle.replace(closedMonthBefore, closedMonthAfter);
if (!bundle.includes(closedMonthAfter)) throw new Error("Closed month route guard was not installed");

await writeFile(bundlePath, bundle);
console.log("Health date guard v182 installed");
