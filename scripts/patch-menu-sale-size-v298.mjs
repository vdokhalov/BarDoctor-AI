import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("./fragments/menu-sale-size-v298.fragment.txt", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);

let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdMenuSaleSizePatchV298="menu-sale-size-patch-v298";';

function replaceOnce(label, before, after) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Menu sale size v298 target not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Menu sale size v298 target is ambiguous: ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

if (!source.includes(marker)) {
  const editorStart = source.indexOf("function bdCatMenuEditor(");
  const editorEnd = source.indexOf("function bdCatStructureManager(", editorStart);
  if (editorStart < 0 || editorEnd < 0) throw new Error("Menu editor anchors were not found");
  const fragment = readFileSync(fragmentPath, "utf8").trim();
  source = source.slice(0, editorStart) + fragment + "\n" + source.slice(editorEnd);

  replaceOnce(
    "legacy catalog editor products",
    'onSave:ie,onManageStructure:()=>bdSetStructureOpen(!0),currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB"})',
    'onSave:ie,onManageStructure:()=>bdSetStructureOpen(!0),currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB",products:q})',
  );
  replaceOnce(
    "command editor canonical sources",
    'onSave:Ae,onManageStructure:()=>{M(null),I(!0)},currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB"})',
    'onSave:Ae,onManageStructure:()=>{M(null),I(!0)},currency:r?.currency||s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||"RUB",products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C)),unitOptions:he.saleSizeUnits})',
  );

  replaceOnce(
    "legacy import controlled size",
    'i.jsx(bdCatField,{label:"Порция",children:i.jsx("input",{value:u.portionSize||"",onChange:f=>s(u.id,{portionSize:f.target.value}),placeholder:"Не указана"})})',
    'i.jsx(bdMenuSaleSizeControlV298,{item:u,onChange:f=>s(u.id,f)})',
  );
  replaceOnce(
    "command import controlled size",
    'i.jsx(bdCatField,{label:"Порция",children:i.jsx("input",{value:h.portionSize||"",onChange:y=>f(h.id,{portionSize:y.target.value}),placeholder:"Не указана"})})',
    'i.jsx(bdMenuSaleSizeControlV298,{item:h,onChange:y=>f(h.id,y),unitOptions:e.saleSizeUnits})',
  );

  replaceOnce(
    "legacy menu list display",
    'c.name,W.portionSize?" · "+W.portionSize:""',
    'c.name,bdMenuSaleSizeTextV298(W.saleSize||bdMenuLegacySizeV298(W.legacyPortionSize||W.portionSize))?" · "+bdMenuSaleSizeTextV298(W.saleSize||bdMenuLegacySizeV298(W.legacyPortionSize||W.portionSize)):""',
  );
  replaceOnce(
    "fallback analytics structured size",
    'type:m.type||"composite",portionSize:m.portionSize||null,salePrice:',
    'type:m.type||"composite",saleSize:m.saleSize||null,portionSize:bdMenuSaleSizeTextV298(m.saleSize||bdMenuLegacySizeV298(m.legacyPortionSize||m.portionSize))||null,salePrice:',
  );

  replaceOnce(
    "command import cleanup",
    'for(const oe of A.menuItems){const ie=',
    'for(const bdRawMenuItemV298 of A.menuItems){const oe=bdMenuCleanItemV298(bdRawMenuItemV298),ie=',
  );

  source = marker + source;
}

const legacyImportLoop = 'for(const R of f.menuItems){const W=';
const normalizedLegacyImportLoop = 'for(const bdRawMenuItemV298 of f.menuItems){const R=bdMenuCleanItemV298(bdRawMenuItemV298),W=';
if (source.includes(legacyImportLoop)) {
  source = source.replace(legacyImportLoop, normalizedLegacyImportLoop);
}
if (!source.includes(normalizedLegacyImportLoop)) {
  throw new Error("Legacy menu import cleanup was not found");
}
const unguardedPiecePackage = 'return(t?.unit==="pcs"||t?.baseUnit==="pcs")?bdMenuStructuredSizeV298(1,"pcs","packaging",{nomenclatureItemId:t?.id||t?.nomenclatureItemId||t?.key,productKey:t?.key||t?.productKey,packageLabel:e||void 0}):null';
const guardedPiecePackage = 'return e&&(t?.unit==="pcs"||t?.baseUnit==="pcs")?bdMenuStructuredSizeV298(1,"pcs","packaging",{nomenclatureItemId:t?.id||t?.nomenclatureItemId||t?.key,productKey:t?.key||t?.productKey,packageLabel:e}):null';
if (source.includes(unguardedPiecePackage)) {
  source = source.replace(unguardedPiecePackage, guardedPiecePackage);
}
if (!source.includes(guardedPiecePackage)) {
  throw new Error("Ready-product package selection guard was not found");
}
if (!source.includes("function bdMenuImportSizeValidV298(e)")) {
  source = source.replace(
    "function bdMenuCleanItemV298(e)",
    'function bdMenuImportSizeValidV298(e){if(e?.type==="service")return!0;const t=bdMenuStructuredSizeV298(e?.saleQuantityInput??e?.saleSize?.quantity,e?.saleUnit||e?.saleSize?.unit)||bdMenuLegacySizeV298(e?.legacyPortionSize||e?.portionSize);return t?.status==="confirmed"}\nfunction bdMenuCleanItemV298(e)',
  );
}
source = source.replace(
  "l=e.menuItems.length>0;return i.jsx",
  "l=e.menuItems.length>0&&e.menuItems.every(bdMenuImportSizeValidV298);return i.jsx",
);
source = source.replace(
  "m=e.menuItems.length>0;return i.jsx",
  "m=e.menuItems.length>0&&e.menuItems.every(bdMenuImportSizeValidV298);return i.jsx",
);
if (!source.includes("e.menuItems.every(bdMenuImportSizeValidV298)")) {
  throw new Error("Menu import sale-size validation was not found");
}
writeFileSync(bundlePath, source);

let bootstrap = readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("20260826-menu-sale-size-v298")) {
  bootstrap = bootstrap.replace(
    "20260826-venue-identity-v297\";",
    "20260826-venue-identity-v297-20260826-menu-sale-size-v298\";",
  );
  writeFileSync(bootstrapPath, bootstrap);
}

let appHtml = readFileSync(appHtmlPath, "utf8");
if (!appHtml.includes("auth-bootstrap-state-v274-20260826-venue-identity-v297-20260826-menu-sale-size-v298")) {
  appHtml = appHtml.replace(
    "auth-bootstrap-state-v274-20260826-venue-identity-v297\"></script>",
    "auth-bootstrap-state-v274-20260826-venue-identity-v297-20260826-menu-sale-size-v298\"></script>",
  );
}
if (!appHtml.includes("menu-sale-size-v298.css")) {
  appHtml = appHtml.replace(
    "</head>",
    '  <link rel="stylesheet" href="/menu-sale-size-v298.css?v=20260826-menu-sale-size-v298">\n  </head>',
  );
}
writeFileSync(appHtmlPath, appHtml);

console.log("Menu sale size v298 patch applied");
