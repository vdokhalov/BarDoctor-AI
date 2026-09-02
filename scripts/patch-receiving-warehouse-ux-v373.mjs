import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const suppliersCssPath = path.join(root, "public/suppliers.css");
const warehouseCssPath = path.join(root, "public/warehouse.css");
const marker = "bd-receiving-warehouse-ux-v373";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    "function bdWarehouseGroupedStockV240({items:e,assortment:t,mode:n,onOpen:r,searchActive:a=!1,venueKey:s=localStorage.getItem(\"bd_active_venue_id\")||\"default\"}){const tree=bdNomenclatureTree(t),seed=bdWarehouseDisclosureSeedV240()",
    'const bdReceivingWarehouseUxVersionV373="v373";/* bd-receiving-warehouse-ux-v373 */\nfunction bdIsInventoryTaxonomyNodeV373(e){return!/^menu-(?:section|category|subcategory):/.test(String(e?.id||""))}\nfunction bdWarehouseInventoryTreeV373(e){const t=bdNomenclatureTree(e),n=t.sections.filter(o=>o.active!==!1&&bdIsInventoryTaxonomyNodeV373(o)),r=new Set(n.map(o=>o.id)),a=t.categories.filter(o=>o.active!==!1&&bdIsInventoryTaxonomyNodeV373(o)&&r.has(o.parentId)),s=new Set(a.map(o=>o.id)),l=t.subcategories.filter(o=>o.active!==!1&&bdIsInventoryTaxonomyNodeV373(o)&&s.has(o.parentId));return{...t,sections:n,categories:a,subcategories:l}}\nfunction bdWarehouseGroupedStockV240({items:e,assortment:t,mode:n,onOpen:r,searchActive:a=!1,venueKey:s=localStorage.getItem("bd_active_venue_id")||"default"}){const tree=bdWarehouseInventoryTreeV373(t),seed=bdWarehouseDisclosureSeedV240()',
    "Inventory-only taxonomy boundary",
  );

  replaceExactly(
    "A.filter(w=>!a||(w.synthetic?P.length:c.some(C=>C.subcategoryId===w.id)))",
    "A.filter(w=>w.synthetic?P.length:c.some(C=>C.subcategoryId===w.id))",
    "Hide empty warehouse subcategories",
  );
  replaceExactly(
    "A.filter(x=>!a||(x.synthetic?P.length:c.some(w=>w.taxonomyCategoryId===x.id)))",
    "A.filter(x=>x.synthetic?P.length:c.some(w=>w.taxonomyCategoryId===x.id))",
    "Hide empty warehouse categories",
  );
  replaceExactly(
    'tree.subcategories.filter(c=>c.id!=="unassigned-subcategory"&&(!a||e.some(p=>p.subcategoryId===c.id)))',
    'tree.subcategories.filter(c=>c.id!=="unassigned-subcategory"&&e.some(p=>p.subcategoryId===c.id))',
    "Hide empty flat subcategories",
  );
  replaceExactly(
    'tree.categories.filter(c=>c.id!=="unassigned-category"&&(!a||e.some(p=>p.taxonomyCategoryId===c.id)))',
    'tree.categories.filter(c=>c.id!=="unassigned-category"&&e.some(p=>p.taxonomyCategoryId===c.id))',
    "Hide empty flat categories",
  );
  replaceExactly(
    'tree.sections.filter(o=>o.id!=="unassigned"?(!a||e.some(c=>c.sectionId===o.id)):e.some(c=>c.sectionId===o.id||!tree.sections.some(p=>p.id===c.sectionId)))',
    'tree.sections.filter(o=>o.id!=="unassigned"?e.some(c=>c.sectionId===o.id):e.some(c=>c.sectionId===o.id||!tree.sections.some(p=>p.id===c.sectionId)))',
    "Hide empty warehouse sections",
  );

  replaceExactly(
    'const T=bdAlphabeticalV363(t.sections),A=bdAlphabeticalV363(t.categories),k=bdAlphabeticalV363(t.subcategories)',
    'const T=bdAlphabeticalV363(t.sections.filter(bdIsInventoryTaxonomyNodeV373)),A=bdAlphabeticalV363(t.categories.filter(bdIsInventoryTaxonomyNodeV373)),k=bdAlphabeticalV363(t.subcategories.filter(bdIsInventoryTaxonomyNodeV373))',
    "Keep menu folders out of the inventory taxonomy manager",
  );

  replaceExactly(
    'i.jsxs("button",{type:"button",className:"bd-warehouse-nomenclature-link-v241",onClick:()=>e("/nomenclature?returnTo=warehouse"),children:[i.jsx("span",{children:"Номенклатура"}),i.jsx(Br,{size:15,"aria-hidden":!0})]})',
    'i.jsxs("button",{type:"button",className:"bd-warehouse-nomenclature-link-v241","aria-label":"Настроить структуру склада",onClick:()=>e("/nomenclature?view=taxonomy&returnTo=warehouse"),children:[i.jsx("span",{children:"Номенклатура / категории"}),i.jsx(Br,{size:15,"aria-hidden":!0})]})',
    "Direct taxonomy-management entry",
  );

  fs.writeFileSync(bundlePath, source);
}

const legacyWarehouseEntryV373 = 'i.jsxs("button",{type:"button",className:"bd-warehouse-nomenclature-link-v241",onClick:()=>e("/nomenclature?view=taxonomy&returnTo=warehouse"),children:[i.jsx("span",{children:"Настроить структуру"}),i.jsx(Br,{size:15,"aria-hidden":!0})]})';
const warehouseEntryV373 = 'i.jsxs("button",{type:"button",className:"bd-warehouse-nomenclature-link-v241","aria-label":"Настроить структуру склада",onClick:()=>e("/nomenclature?view=taxonomy&returnTo=warehouse"),children:[i.jsx("span",{children:"Номенклатура / категории"}),i.jsx(Br,{size:15,"aria-hidden":!0})]})';
if (source.includes(legacyWarehouseEntryV373)) {
  source = source.replace(legacyWarehouseEntryV373, warehouseEntryV373);
  fs.writeFileSync(bundlePath, source);
}

const receivingCss = `

/* Receiving footer and inventory taxonomy boundary v373 */
.bd-receiving-workspace-v357 {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 0;
}

.bd-receiving-workspace-v357 > .bd-procurement-form {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 18px;
}

.bd-receiving-workspace-v357 > .bd-receiving-actions-v357 {
  position: relative;
  z-index: 6;
  bottom: auto;
  flex: 0 0 auto;
  margin: 0 -18px !important;
  padding: 10px 18px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(223, 226, 235, 0.9);
  background: rgba(248, 249, 252, 0.98);
  box-shadow: 0 -8px 24px rgba(27, 32, 54, 0.09);
  backdrop-filter: blur(14px);
}

@media (max-width: 767px) {
  .bd-receiving-workspace-v357 > .bd-procurement-form {
    padding-bottom: 16px;
    scroll-padding-bottom: 16px;
  }

  .bd-receiving-workspace-v357 > .bd-receiving-actions-v357 {
    margin: 0 !important;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  }
}
`;

let suppliersCss = fs.readFileSync(suppliersCssPath, "utf8");
if (!suppliersCss.includes("Receiving footer and inventory taxonomy boundary v373")) {
  suppliersCss += receivingCss;
  fs.writeFileSync(suppliersCssPath, suppliersCss);
}

const warehouseCss = `

/* Warehouse inventory taxonomy entry v373 */
main[data-bd-warehouse-version="compact-tree-v240"] .bd-warehouse-nomenclature-link-v241 span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 430px) {
  main[data-bd-warehouse-version="compact-tree-v240"] .bd-warehouse-nomenclature-link-v241 {
    max-width: 150px;
  }
}
`;

let warehouseStyles = fs.readFileSync(warehouseCssPath, "utf8");
if (!warehouseStyles.includes("Warehouse inventory taxonomy entry v373")) {
  warehouseStyles += warehouseCss;
  fs.writeFileSync(warehouseCssPath, warehouseStyles);
}

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(
    /index-BQGspy0I\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  for (const stylesheet of ["suppliers.css", "warehouse.css"]) {
    const expression = new RegExp(`${stylesheet.replace(".", "\\.")}\\?v=([^"']+)`, "g");
    contents = contents.replace(
      expression,
      (match, version) => version.includes(marker) ? match : `${stylesheet}?v=${version}-${marker}`,
    );
  }
  fs.writeFileSync(filePath, contents);
}

const bootstrapPath = path.join(root, "public/bardoctor-preview.js");
let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
bootstrap = bootstrap.replace(
  /index-BQGspy0I\.js\?v=([^"']+)/g,
  (match, version) => version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
);
fs.writeFileSync(bootstrapPath, bootstrap);

console.log(`${marker}: applied`);
