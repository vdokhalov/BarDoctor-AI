import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");

const helperMarker = 'const bdInventoryDeleteVersion="inventory-delete-v270";';
const anchor = 'const bdInventoryScopeHierarchyVersion="scope-hierarchy-v256";';
if (!source.includes(anchor)) throw new Error("Inventory helper anchor was not found");
const helpers = `${helperMarker}
function bdInventoryDisplayLabelV270(e){const t=Number(e?.number);if(Number.isInteger(t)&&t>0)return"Инвентаризация № "+t;const n=String(e?.date||"").trim(),r=String(e?.id||"").replace(/[^a-zA-Z0-9а-яА-Я]/g,"").slice(-6);return"Инвентаризация "+(n?"от "+sg(n):r?"· "+r:"без номера")}
function bdInventoryCanDeleteV270(e){const t=String(e?.status||"");return(!t||["draft","counting","review"].includes(t))&&!(Array.isArray(e?.adjustmentMovementIds)&&e.adjustmentMovementIds.length)&&!(Array.isArray(e?.createdAdjustments)&&e.createdAdjustments.length)}
function bdConfirmInventoryDeleteV270(e){return new Promise(t=>{const n=document.activeElement,r=document.createElement("div"),a=document.createElement("div"),s=document.createElement("h2"),l=document.createElement("p"),u=document.createElement("div"),d=document.createElement("button"),f=document.createElement("button");r.className="bd-inventory-delete-backdrop-v270",r.setAttribute("role","presentation"),a.className="bd-inventory-delete-dialog-v270",a.setAttribute("role","dialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-labelledby","bd-inventory-delete-title-v270"),s.id="bd-inventory-delete-title-v270",s.textContent="Удалить "+bdInventoryDisplayLabelV270(e).toLocaleLowerCase("ru")+"?",l.textContent="Инвентаризация и введённые результаты подсчёта будут удалены. Остатки склада не изменятся.",u.className="bd-inventory-delete-actions-v270",d.type="button",d.textContent="Отмена",f.type="button",f.className="danger",f.textContent="Удалить",u.append(d,f),a.append(s,l,u),r.append(a),document.body.append(r),document.body.classList.add("bd-inventory-delete-open-v270");let o=!1;const c=h=>{if(o)return;o=!0,document.removeEventListener("keydown",m),r.remove(),document.body.classList.remove("bd-inventory-delete-open-v270"),n?.focus?.(),t(h)},m=h=>{h.key==="Escape"&&(h.preventDefault(),c(!1))};d.addEventListener("click",()=>c(!1)),f.addEventListener("click",()=>c(!0)),r.addEventListener("click",h=>{h.target===r&&c(!1)}),document.addEventListener("keydown",m),setTimeout(()=>d.focus(),0)})}
async function bdDeleteInventoryFromListV270(e,t,n){if(!await bdConfirmInventoryDeleteV270(e))return;try{const r=await fetch("/api/inventory/counts",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"delete",id:e.id})}),a=await r.json();if(!r.ok||!a?.ok){const s=new Error(a?.error||"Не удалось удалить инвентаризацию");throw s.code=a?.code,s}t(a,{close:!1,action:"delete"})}catch(r){if(["INVENTORY_DELETE_PROTECTED","INVENTORY_CONCURRENT_MODIFICATION"].includes(r?.code))try{const a=await fetch("/api/inventory/counts",{credentials:"include",headers:ca(Ot()),cache:"no-store"}),s=await a.json();a.ok&&s?.ok&&t({snapshots:s.inventories},{close:!1,silent:!0})}catch{}n({variant:"warning",title:"Инвентаризация не удалена",description:r instanceof Error?r.message:"Обновите список и попробуйте снова"})}}
`;
if (source.includes(helperMarker)) {
  source = source.slice(0, source.indexOf(helperMarker)) + helpers + source.slice(source.indexOf(anchor));
} else {
  source = source.replace(anchor, helpers + anchor);
}

const oldToast = 'const Q=U.action==="finalize"?"Инвентаризация завершена":U.action==="create"?"Инвентаризация создана":"Черновик сохранён",H=U.action==="finalize"?(B.summary?.changedLines||0)+" корректировок применено к складу.":"Складские остатки не изменены.";l({variant:"success",title:Q,description:H})';
const newToast = 'if(U.silent)return;const Q=U.action==="finalize"?"Инвентаризация завершена":U.action==="create"?"Инвентаризация создана":U.action==="delete"?"Инвентаризация удалена":"Черновик сохранён",H=U.action==="finalize"?(B.summary?.changedLines||0)+" корректировок применено к складу.":"Складские остатки не изменены.";l({variant:"success",title:Q,description:H})';
if (!source.includes(newToast)) {
  if (!source.includes(oldToast)) throw new Error("Warehouse inventory callback anchor was not found");
  source = source.replace(oldToast, newToast);
}

const oldCard = 'return i.jsxs("button",{type:"button",onClick:()=>e(bdWarehouseNavigationUrlV247({inventory:B.id,add:null,tab:"counts"})),children:[i.jsxs("div",{children:[i.jsx("strong",{children:"Инвентаризация № "+String(B.number||"—")}),i.jsxs("span",{children:[sg(B.date)," · ",Z," · ",B.scope?.label||B.sourceLabel||"Вручную"]})]}),i.jsxs("div",{children:[i.jsx("b",{className:te?"":"draft",children:te?U+" поз. · расхождений "+X:"Продолжить"}),i.jsx("small",{children:te?"Открыть результаты":H+" / "+U})]})]},B.id)})}';
const newCard = 'return i.jsxs("article",{className:"bd-inventory-history-card-v270",children:[i.jsxs("button",{type:"button",className:"bd-inventory-history-open-v270",onClick:()=>e(bdWarehouseNavigationUrlV247({inventory:B.id,add:null,tab:"counts"})),children:[i.jsxs("div",{children:[i.jsx("strong",{children:bdInventoryDisplayLabelV270(B)}),i.jsxs("span",{children:[sg(B.date)," · ",Z," · ",B.scope?.label||B.sourceLabel||"Вручную"]})]}),i.jsxs("div",{children:[i.jsx("b",{className:te?"":"draft",children:te?U+" поз. · расхождений "+X:"Продолжить"}),i.jsx("small",{children:te?"Открыть результаты":H+" / "+U})]})]}),z&&bdInventoryCanDeleteV270(B)&&i.jsxs("details",{className:"bd-inventory-history-menu-v270",children:[i.jsx("summary",{"aria-label":"Действия "+bdInventoryDisplayLabelV270(B),children:"⋯"}),i.jsx("div",{children:i.jsx("button",{type:"button",className:"danger",onClick:async P=>{P.preventDefault(),P.currentTarget.closest("details")?.removeAttribute("open"),await bdDeleteInventoryFromListV270(B,xe,l)},children:"Удалить инвентаризацию"})})]})]},B.id)})}';
if (!source.includes(newCard)) {
  if (!source.includes(oldCard)) throw new Error("Inventory history card anchor was not found");
  source = source.replace(oldCard, newCard);
}
const cardStart = source.indexOf('return i.jsxs("article",{className:"bd-inventory-history-card-v270"');
const emptyBranch = source.indexOf(':i.jsxs("div",{className:"bd-warehouse-empty"', cardStart);
if (cardStart < 0 || emptyBranch < 0) throw new Error("Patched inventory history card bounds were not found");
source = source.slice(0, cardStart) + newCard + ")" + source.slice(emptyBranch);

fs.writeFileSync(assetPath, source);
console.log("Inventory delete lifecycle v270 patched");
