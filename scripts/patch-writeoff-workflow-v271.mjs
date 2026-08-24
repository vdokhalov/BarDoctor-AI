import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("./fragments/writeoff-workflow-v271.fragment.txt", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");
const fragment = fs.readFileSync(fragmentPath, "utf8").trim() + "\n";
const marker = 'const bdWriteoffWorkflowVersionV271="canonical-document-v271";';
const functionStart = source.includes(marker) ? source.indexOf(marker) : source.indexOf("function bdWriteoffSheet(");
const navigationStart = source.indexOf("function bdWarehouseNavigationUrlV247", functionStart);
if (functionStart < 0 || navigationStart < 0) throw new Error("Write-off component anchors were not found");
source = source.slice(0, functionStart) + fragment + source.slice(navigationStart);

const workspaceCall = 'f==="writeoffs"&&i.jsx(bdWriteoffWorkspaceV271,{settings:u,legacy:J,canManage:z,toast:l})';
if (!source.includes(workspaceCall)) {
  const sectionStart = source.indexOf('f==="writeoffs"&&i.jsxs("section"');
  const nextOverlay = source.indexOf('i.jsx(qe,{children:P&&', sectionStart);
  if (sectionStart < 0 || nextOverlay < 0) throw new Error("Write-off workspace anchors were not found");
  source = source.slice(0, sectionStart)
    + workspaceCall
    + source.slice(nextOverlay - 4);
}
source = source.replace(workspaceCall + ']})]}),', workspaceCall + ']}),');

const oldOverlay = 'i.jsx(qe,{children:y&&i.jsx(bdWriteoffSheet,{settings:u,onClose:()=>j(!1),onSave:we},"writeoff")})';
if (source.includes(oldOverlay)) source = source.replace(oldOverlay, 'i.jsx(i.Fragment,{})');

const oldTabs = 'onClick:()=>m(B),children:U';
const newTabs = 'onClick:()=>{m(B),B!=="writeoffs"&&window.bdSyncNavigationQuery({writeoff:null})},children:U';
if (!source.includes(newTabs)) {
  if (!source.includes(oldTabs)) throw new Error("Warehouse tab anchor was not found");
  source = source.replace(oldTabs, newTabs);
}

const oldTabStateSync = '[bdWarehouseValuationOnly,bdSetWarehouseValuationOnly]=S.useState(()=>window.bdReadNavigationQuery("valuation","")==="issues"),bdWarehouseNavigationContext=S.useEffect';
const newTabStateSync = '[bdWarehouseValuationOnly,bdSetWarehouseValuationOnly]=S.useState(()=>window.bdReadNavigationQuery("valuation","")==="issues"),bdWarehouseTabNavigationV271=S.useEffect(()=>{const B=new URLSearchParams(o),U=B.get("tab")||"stock";["stock","movements","counts","writeoffs"].includes(U)&&U!==f&&m(U)},[o]),bdWarehouseNavigationContext=S.useEffect';
if (!source.includes(newTabStateSync)) {
  if (!source.includes(oldTabStateSync)) throw new Error("Warehouse URL-to-tab state anchor was not found");
  source = source.replace(oldTabStateSync, newTabStateSync);
}

const oldMovementEnd = 'B.costAmount!==void 0&&i.jsx("small",{children:(bdWarehouseNumber(B.costAmount)>0?"+":"")+bdWarehouseMoney(B.costAmount,B.currency||"MDL")})]})]},B.id)';
const newMovementEnd = 'B.costAmount!==void 0&&i.jsx("small",{children:(bdWarehouseNumber(B.costAmount)>0?"+":"")+bdWarehouseMoney(B.costAmount,B.currency||"MDL")})]}),B.type==="writeoff"&&B.sourceDocumentId&&i.jsx("button",{type:"button",className:"bd-writeoff-movement-link-v271",onClick:()=>e(bdWarehouseNavigationUrlV247({tab:"writeoffs",writeoff:B.sourceDocumentId})),children:"Документ"})]},B.id)';
if (!source.includes(newMovementEnd)) {
  if (!source.includes(oldMovementEnd)) throw new Error("Warehouse movement link anchor was not found");
  source = source.replace(oldMovementEnd, newMovementEnd);
}

const oldMovementMeta = 'e==="writeoff"?{label:"Списание",color:"#EA580C",sign:""}:{label:"Движение",color:"#64748B",sign:""}';
const newMovementMeta = 'e==="writeoff"?{label:"Списание",color:"#EA580C",sign:""}:e==="return"?{label:"Обратное движение",color:"#2563EB",sign:"+"}:{label:"Движение",color:"#64748B",sign:""}';
if (!source.includes(newMovementMeta)) {
  if (!source.includes(oldMovementMeta)) throw new Error("Warehouse movement meta anchor was not found");
  source = source.replace(oldMovementMeta, newMovementMeta);
}

if (!source.includes(marker)) throw new Error("Write-off workflow fragment was not inserted");
fs.writeFileSync(assetPath, source);
console.log("Canonical write-off workflow v271 patched");
