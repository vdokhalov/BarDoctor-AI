import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");
if (bundle.includes('bdProfileBootstrapReadyV274="profile-bootstrap-ready-v274"')) process.exit(0);

const search = 'async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify(e)})).json();if(!r.ok)throw new Error(r.error??"Ошибка сохранения");jz(r.restaurant??e)}';
const replacement = 'const bdProfileBootstrapReadyV274="profile-bootstrap-ready-v274";async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify(e)})).json();if(!r.ok)throw new Error(r.error??"Ошибка сохранения");jz(r.restaurant??e);const a=window.__bdAuthBootstrapV274||{};window.__bdAuthBootstrapV274={...a,state:"ready",reason:"active_venue_ready"};try{const s="bd_venue_context__"+t,l=JSON.parse(localStorage.getItem(s)||"null"),u=localStorage.getItem("bd_active_venue_id"),d=Array.isArray(l?.venues)?l.venues.map(f=>String(f?.id)===String(u)?{...f,hasProfile:!0}:f):null;d&&(l.venues=d,localStorage.setItem(s,JSON.stringify(l)))}catch{}}';
const first = bundle.indexOf(search);
if (first < 0) throw new Error("Missing profile save bootstrap anchor");
if (bundle.indexOf(search, first + search.length) >= 0) throw new Error("Ambiguous profile save bootstrap anchor");
bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
writeFileSync(bundlePath, bundle);
