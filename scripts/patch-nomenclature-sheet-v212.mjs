import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const start = source.indexOf("function bdNomenclatureSheet");
const end = source.indexOf("function bdNomenclaturePage", start);
if (start < 0 || end < 0) throw new Error("Missing nomenclature sheet range");

let sheet = source.slice(start, end);

sheet = sheet.replace(
  'i.jsx(W.div,{className:"fixed inset-0 bg-foreground/40 z-[60]",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:r})',
  'i.jsx("button",{type:"button","aria-label":"Закрыть карточку",className:"bd-nomenclature-sheet-backdrop-v212 fixed inset-0 bg-foreground/40 z-[60]",onClick:r})',
);

sheet = sheet.replace(
  'i.jsxs(W.section,{className:"bd-warehouse-product-sheet bd-nomenclature-sheet-v208 fixed inset-x-0 bottom-0 z-[70] bg-white",style:{margin:"0 auto"},initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},children:',
  'i.jsxs("section",{role:"dialog","aria-modal":!0,"aria-label":l?"Карточка номенклатуры "+String(e?.name||""):"Новая позиция",className:"bd-warehouse-product-sheet bd-nomenclature-sheet-v208 bd-nomenclature-sheet-v212 fixed inset-x-0 bottom-0 z-[70] bg-white",style:{margin:"0 auto"},children:',
);

sheet = sheet.replace(',autoFocus:!0', "");

if (!sheet.includes("bd-nomenclature-sheet-backdrop-v212") || !sheet.includes('role:"dialog"')) {
  throw new Error("Failed to make nomenclature sheet static");
}
if (sheet.includes('initial:{y:"100%"}')) {
  throw new Error("Offscreen animation still present in nomenclature sheet");
}

source = source.slice(0, start) + sheet + source.slice(end);
await writeFile(bundlePath, source);
