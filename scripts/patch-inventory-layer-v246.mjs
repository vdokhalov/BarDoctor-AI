import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("./fragments/inventory-workflow-v245.fragment.txt", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");
let fragment = fs.readFileSync(fragmentPath, "utf8").trim();

const lockAnchor = 'S.useEffect(()=>{if(phase!=="setup")return;';
const scrollLock = 'S.useEffect(()=>{const o=document.body,l=document.documentElement,u=o.style.overflow,d=l.style.overflow,f=o.style.overscrollBehavior,m=l.style.overscrollBehavior;return o.classList.add("bd-inventory-overlay-open-v246"),o.style.overflow="hidden",l.style.overflow="hidden",o.style.overscrollBehavior="none",l.style.overscrollBehavior="none",()=>{o.classList.remove("bd-inventory-overlay-open-v246"),o.style.overflow=u,l.style.overflow=d,o.style.overscrollBehavior=f,l.style.overscrollBehavior=m}},[]);\n';
if (!fragment.includes(lockAnchor)) throw new Error("Inventory effect anchor was not found");
fragment = fragment.replace(lockAnchor, scrollLock + lockAnchor);

const shellStart = fragment.indexOf("const shell=");
const shellEnd = fragment.indexOf("\n", shellStart);
if (shellStart < 0 || shellEnd < 0) throw new Error("Inventory shell anchor was not found");
const shell = 'const shell=(o,l=null)=>ug.createPortal(i.jsxs("div",{className:"bd-inventory-layer-v246",role:"presentation",children:[i.jsx(W.div,{className:"bd-inventory-backdrop-v246",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:close}),i.jsxs(W.div,{className:"bd-inventory-sheet bd-inventory-sheet-v245 bd-inventory-sheet-v246 bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)]",role:"dialog","aria-modal":"true",initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},children:[i.jsx("div",{className:"bd-inventory-handle-v245"}),i.jsxs("header",{className:"bd-inventory-head-v245",children:[i.jsxs("div",{children:[i.jsx("p",{children:phase==="setup"?"Новая инвентаризация":completed?"Завершённый документ":phase==="review"?"Проверка результатов":"Слепой подсчёт"}),i.jsx("h2",{children:doc?"Инвентаризация № "+String(doc.number||""):"Провести инвентаризацию"}),doc&&i.jsx("small",{children:bdInventoryCountStatusLabel(doc.status)+" · "+String(doc.scope?.label||"")})]}),i.jsxs("div",{children:[doc&&i.jsx("button",{type:"button",onClick:openPrint,"aria-label":"Печатная ведомость",children:"Печать"}),i.jsx("button",{type:"button",onClick:close,"aria-label":"Закрыть",children:"×"})]})]}),o,l&&i.jsx("footer",{className:"bd-inventory-footer-v246",children:l})]})]}),document.body);';
fragment = fragment.slice(0, shellStart) + shell + fragment.slice(shellEnd);

function moveActionsToFooter(linePrefix, tail, ending) {
  const lineStart = fragment.indexOf(linePrefix);
  const lineEnd = fragment.indexOf("\n", lineStart);
  if (lineStart < 0) throw new Error(`Inventory ${linePrefix} line was not found`);
  const end = lineEnd < 0 ? fragment.length : lineEnd;
  const line = fragment.slice(lineStart, end);
  const actionMarker = ',i.jsxs("div",{className:"bd-inventory-actions-v245"';
  const actionStart = line.lastIndexOf(actionMarker);
  if (actionStart < 0 || !line.endsWith(tail)) throw new Error(`Inventory ${linePrefix} actions were not found`);
  const action = line.slice(actionStart + 1, -tail.length);
  const moved = line.slice(0, actionStart) + ']})' + ',' + action + ending;
  fragment = fragment.slice(0, lineStart) + moved + fragment.slice(end);
}

moveActionsToFooter('if(phase==="count")', ']}));', ');');
moveActionsToFooter('const reviewFilters=', ']}))}', ')}');

const hierarchyMarker = source.indexOf('const bdInventoryScopeHierarchyVersion="scope-hierarchy-v256";');
const sheetStart = hierarchyMarker >= 0 ? hierarchyMarker : source.indexOf("function bdInventoryCountStatusLabel");
const sheetEnd = source.indexOf("function bdWriteoffSheet", sheetStart);
if (sheetStart < 0 || sheetEnd < 0) throw new Error("Inventory sheet anchors were not found");
source = source.slice(0, sheetStart) + fragment + "\n" + source.slice(sheetEnd);

fs.writeFileSync(assetPath, source);
console.log("Inventory layer v246 patched");
