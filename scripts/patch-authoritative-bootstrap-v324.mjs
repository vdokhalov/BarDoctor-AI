import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const cacheToken = "20260828-authoritative-bootstrap-v324";
let source = fs.readFileSync(bundlePath, "utf8");

const oldBootstrap = 'async function Xse(){const e=Ot();if(!e)return null;try{const n=await(await fetch(EC,{headers:ca(e)})).json();if(!n.ok||!n.entries)return null;const r={};for(const[a,s]of Object.entries(n.entries))r[a]=s.data;return r}catch{return null}}';
const newBootstrap = 'const bdAuthoritativeBootstrapVersionV324="authoritative-bootstrap-v324",bdServerStoreKeysV324=["bd_employees","bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons","bd_inventory_snapshots","bd_finance_settings","bd_equipment","bd_equipment_history","bd_equipment_work_orders","bd_payroll_rules","bd_payroll_entries","bd_cases","bd_events","bd_tasks","bd_action_plans","bd_action_tasks","bd_decisions","bd_ai_diagnosis_v3","bd_ai_diagnosis_v4","bd_ai_diagnosis_v5","bd_ai_diagnosis_v6","bd_ai_diagnosis_v7","bd_ai_diagnosis_v8","bd_ai_diagnosis_v9","bd_guest_reviews","bd_month_closings","bd_opportunity_calendar_v1","bd_access_roles","bd_import_history","bd_suppliers","bd_purchase_documents","bd_assortment_v1","bd_stock_movements","bd_sales_documents","bd_sales_batches","bd_sales_mappings","bd_sales_warehouse_routes","bd_warehouses"];function bdClearMissingServerStoreV324(e){try{localStorage.removeItem(Sz(e));window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:e,reason:"authoritative_server_missing"}}))}catch{}}async function Xse(){const e=Ot();if(!e)return null;try{const n=await(await fetch(EC,{headers:ca(e)})).json();if(!n.ok||!n.entries)return null;const r={};for(const[a,s]of Object.entries(n.entries))r[a]=s.data;return{entries:r,persistenceBoundary:n.persistenceBoundary??null}}catch{return null}}';
if (source.includes(oldBootstrap)) source = source.replace(oldBootstrap, newBootstrap);

const oldProvider = '(async()=>{await Qse(Goe());const d=await Xse();if(d)for(const[f,m]of Object.entries(d))cz(f)||Kse(f,m);await pM(PM),u||a(!0)})()';
const newProvider = '(async()=>{const d=await Xse();if(d){for(const[f,m]of Object.entries(d.entries))cz(f)||Kse(f,m);for(const f of bdServerStoreKeysV324)Object.prototype.hasOwnProperty.call(d.entries,f)||cz(f)||bdClearMissingServerStoreV324(f)}await pM(PM),u||a(!0)})()';
if (source.includes(oldProvider)) source = source.replace(oldProvider, newProvider);

if (!source.includes('bdAuthoritativeBootstrapVersionV324="authoritative-bootstrap-v324"')) {
  throw new Error("Authoritative bootstrap v324 anchor not found");
}
if (source.includes('(async()=>{await Qse(Goe());const d=await Xse()')) {
  throw new Error("Legacy local-first migration bootstrap remains");
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!new RegExp(`index-BQGspy0I\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) {
  bootstrap = bootstrap.replace(/(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)";/, `$1-${cacheToken}";`);
}
let appHtml = fs.readFileSync(appHtmlPath, "utf8");
if (!new RegExp(`bardoctor-preview\\.js\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(src="\/bardoctor-preview\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(bootstrapPath, bootstrap);
fs.writeFileSync(appHtmlPath, appHtml);
console.log("Authoritative bootstrap and cache invalidation v324 applied");
