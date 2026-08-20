import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const versionMarker = 'const bdCatalogWorkspaceVersion="catalog-move-controls-v44"';
if (source.includes(versionMarker)) {
  const brokenSubgroupClosure =
    '},R.id)}))}),i.jsxs("div",{className:"bd-catalog-structure-new-sub"';
  const fixedSubgroupClosure =
    '},R.id)})}),i.jsxs("div",{className:"bd-catalog-structure-new-sub"';
  if (source.includes(brokenSubgroupClosure)) {
    source = source.replace(brokenSubgroupClosure, fixedSubgroupClosure);
    writeFileSync(bundlePath, source);
    console.log("Repaired catalog move controls v44 syntax.");
  } else {
    console.log("Catalog move controls v44 are already applied.");
  }
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceSegment(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

replaceOnce(
  'const bdCatalogWorkspaceVersion="manual-structure-v43"',
  versionMarker,
  "catalog workspace version",
);

replaceSegment(
  "function bdCatState",
  "function bdCatNumber",
  String.raw`function bdCatState(e){const t=e&&typeof e==="object"&&!Array.isArray(e)?e:{},n=new Map;for(const c of bdCatArray(t.groups)){const I=String(c?.id||"").trim(),R=String(c?.name||c?.label||"").trim();I&&R&&!n.has(I)&&n.set(I,{...c,id:I,name:R,legacyDepartment:["bar","kitchen","hookah","other"].includes(c?.legacyDepartment)?c.legacyDepartment:"other",sortOrder:bdCatNumber(c?.sortOrder,n.size)})}if(!n.size)for(const c of bdCatDefaultGroups())n.set(c.id,c);const r=[...n.values()].sort((c,I)=>bdCatNumber(c.sortOrder)-bdCatNumber(I.sortOrder)||c.name.localeCompare(I.name,"ru")),a=new Map(r.map(c=>[c.id,c])),s=new Map;for(const c of bdCatArray(t.subgroups)){const I=String(c?.id||"").trim(),R=String(c?.name||c?.label||"").trim(),W=a.has(c?.groupId)?c.groupId:"";I&&R&&W&&!s.has(I)&&s.set(I,{...c,id:I,groupId:W,name:R,sortOrder:bdCatNumber(c?.sortOrder,s.size)})}const l=bdCatArray(t.menuItems).map(c=>{const I=a.has(c?.groupId)?c.groupId:r.find(P=>P.legacyDepartment===bdCatDepartment(c))?.id||r[0]?.id||"other",R=bdCatSubsection(c);let W=s.get(c?.subgroupId);if(!W||W.groupId!==I)W=[...s.values()].find(P=>P.groupId===I&&bdCatNormName(P.name)===bdCatNormName(R));if(!W){const P=bdCatStableTaxId("sub",I,R);W={id:P,groupId:I,name:R,sortOrder:s.size},s.set(P,W)}const J=a.get(I);return{...c,groupId:I,subgroupId:W.id,department:J?.legacyDepartment||"other",category:W.name}}),u=[...s.values()].sort((c,I)=>bdCatNumber(c.sortOrder)-bdCatNumber(I.sortOrder)||c.name.localeCompare(I.name,"ru"));return{version:2,horizonDays:[7,14,30].includes(Number(t.horizonDays))?Number(t.horizonDays):7,groups:r,subgroups:u,menuItems:l,recipes:bdCatArray(t.recipes),stockBalances:bdCatArray(t.stockBalances),internalItems:bdCatArray(t.internalItems),sources:bdCatArray(t.sources),updatedAt:t.updatedAt||new Date().toISOString()}}
function bdCatMoveSubgroupState(e,t,n){const r=bdCatState(e),a=r.subgroups.find(c=>c.id===t),s=r.groups.find(c=>c.id===n);if(!a||!s||a.groupId===n)return r;const l=r.subgroups.find(c=>c.id!==t&&c.groupId===n&&bdCatNormName(c.name)===bdCatNormName(a.name)),u=l?.id||a.id,d=l?.name||a.name;return bdCatState({...r,subgroups:l?r.subgroups.filter(c=>c.id!==t):r.subgroups.map(c=>c.id===t?{...c,groupId:n}:c),menuItems:r.menuItems.map(c=>c.subgroupId===t?{...c,groupId:n,subgroupId:u,department:s.legacyDepartment||"other",category:d}:c),updatedAt:new Date().toISOString()})}
function bdCatMergeGroupState(e,t,n){const r=bdCatState(e),a=r.groups.find(c=>c.id===t),s=r.groups.find(c=>c.id===n);if(!a||!s||t===n||r.groups.length<2)return r;const l=r.subgroups.filter(c=>c.groupId===t),u=new Map;for(const c of l){const I=r.subgroups.find(R=>R.groupId===n&&R.id!==c.id&&bdCatNormName(R.name)===bdCatNormName(c.name));u.set(c.id,{id:I?.id||c.id,name:I?.name||c.name})}const d=r.subgroups.filter(c=>{if(c.groupId!==t)return!0;return u.get(c.id)?.id===c.id}).map(c=>c.groupId===t?{...c,groupId:n}:c),f=r.menuItems.map(c=>{if(c.groupId!==t&&!u.has(c.subgroupId))return c;const I=u.get(c.subgroupId),R=I?.id||c.subgroupId,W=I?.name||r.subgroups.find(J=>J.id===R)?.name||c.category;return{...c,groupId:n,subgroupId:R,department:s.legacyDepartment||"other",category:W}});return bdCatState({...r,groups:r.groups.filter(c=>c.id!==t),subgroups:d,menuItems:f,updatedAt:new Date().toISOString()})}
`,
  "catalog taxonomy and move helpers",
);

const structureManager = String.raw`function bdCatStructureManager({state:e,onClose:t,onSave:n}){const[r,a]=S.useState(()=>bdCatState(e)),[s,l]=S.useState(""),[u,d]=S.useState({}),[f,m]=S.useState(""),[h,g]=S.useState(!1),[y,j]=S.useState({}),[v,b]=S.useState({}),N=I=>r.menuItems.filter(R=>R.groupId===I).length,E=I=>r.menuItems.filter(R=>R.subgroupId===I).length,_=I=>{const R=I.trim();if(!R)return;const W=bdCatNormName(R);if(r.groups.some(J=>bdCatNormName(J.name)===W)){m("Раздел с таким названием уже существует.");return}a(J=>({...J,groups:[...J.groups,{id:crypto.randomUUID(),name:R,legacyDepartment:"other",sortOrder:J.groups.length}]})),l(""),m("")},T=(I,R)=>{const W=R.trim();W&&a(J=>({...J,groups:J.groups.map(K=>K.id===I?{...K,name:W}:K)}))},A=(I,R)=>{const W=R.trim();if(!W)return;if(r.subgroups.some(J=>J.groupId===I&&bdCatNormName(J.name)===bdCatNormName(W))){m("В этом разделе уже есть подраздел «"+W+"».");return}a(J=>({...J,subgroups:[...J.subgroups,{id:crypto.randomUUID(),groupId:I,name:W,sortOrder:J.subgroups.filter(K=>K.groupId===I).length}]})),d(J=>({...J,[I]:""})),m("")},k=(I,R)=>{const W=R.trim();if(!W)return;a(J=>({...J,subgroups:J.subgroups.map(K=>K.id===I?{...K,name:W}:K),menuItems:J.menuItems.map(K=>K.subgroupId===I?{...K,category:W}:K)}))},O=(I,R)=>{const W=r.subgroups.find(J=>J.id===I);if(!W||!R||W.groupId===R)return;a(J=>bdCatMoveSubgroupState(J,I,R)),j(J=>({...J,[I]:R})),m("")},M=(I,R)=>{const W=r.groups.find(J=>J.id===I),K=r.groups.find(J=>J.id===R);if(!W||!K||I===R)return;if(typeof window!=="undefined"&&!window.confirm("Перенести раздел «"+W.name+"» в «"+K.name+"»? Все подразделы и позиции перейдут в выбранный раздел."))return;a(J=>bdCatMergeGroupState(J,I,R)),b(J=>({...J,[I]:""})),m("")},D=async()=>{g(!0);try{await n(bdCatState(r))}finally{g(!1)}};return i.jsx("div",{className:"bd-catalog-sheet-backdrop",children:i.jsxs("section",{className:"bd-catalog-sheet bd-catalog-structure-sheet",children:[i.jsx("div",{className:"bd-catalog-sheet-handle"}),i.jsxs("header",{className:"bd-catalog-sheet-head",children:[i.jsxs("div",{children:[i.jsx("h2",{children:"Разделы и подразделы"}),i.jsx("p",{children:"Здесь можно переименовать или перенести целый раздел либо отдельный подраздел."})]}),i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:t,children:"×"})]}),i.jsxs("div",{className:"bd-catalog-structure-add",children:[i.jsx("input",{value:s,onChange:I=>l(I.target.value),placeholder:"Название нового раздела",onKeyDown:I=>I.key==="Enter"&&_(s)}),i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:!s.trim(),onClick:()=>_(s),children:"+ Раздел"})]}),f&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:f}),i.jsx("div",{className:"bd-catalog-structure-list",children:r.groups.map(I=>i.jsxs("article",{className:"bd-catalog-structure-group",children:[i.jsxs("div",{className:"bd-catalog-structure-group-head",children:[i.jsx("input",{value:I.name,onChange:R=>T(I.id,R.target.value),"aria-label":"Название раздела"}),i.jsxs("span",{children:[N(I.id)," поз."]})]}),r.groups.length>1&&i.jsxs("div",{className:"bd-catalog-group-move",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Перенести весь раздел в"}),i.jsxs("select",{value:v[I.id]||"",onChange:R=>b(W=>({...W,[I.id]:R.target.value})),children:[i.jsx("option",{value:"",children:"Выберите раздел"}),...r.groups.filter(R=>R.id!==I.id).map(R=>i.jsx("option",{value:R.id,children:R.name},R.id))]})]}),i.jsx("button",{type:"button",className:"bd-catalog-move-button",disabled:!v[I.id],onClick:()=>M(I.id,v[I.id]),children:"Перенести раздел"}),i.jsx("small",{children:"Подразделы и позиции перейдут вместе; совпадающие подразделы объединятся."})]}),i.jsx("div",{className:"bd-catalog-structure-sublist",children:r.subgroups.filter(R=>R.groupId===I.id).map(R=>{const W=y[R.id]??R.groupId,K=W!==R.groupId;return i.jsxs("div",{className:"bd-catalog-structure-subrow",children:[i.jsx("input",{value:R.name,onChange:J=>k(R.id,J.target.value),"aria-label":"Название подраздела"}),i.jsxs("label",{children:[i.jsx("span",{children:"Перенести подраздел в"}),i.jsx("select",{value:W,onChange:J=>j(P=>({...P,[R.id]:J.target.value})),children:r.groups.map(J=>i.jsx("option",{value:J.id,children:J.name},J.id))})]}),i.jsx("button",{type:"button",className:"bd-catalog-move-button",disabled:!K,onClick:()=>O(R.id,W),children:"Перенести"}),i.jsxs("small",{children:[E(R.id)," позиций"]})]},R.id)})}),i.jsxs("div",{className:"bd-catalog-structure-new-sub",children:[i.jsx("input",{value:u[I.id]||"",onChange:R=>d(W=>({...W,[I.id]:R.target.value})),placeholder:"Новый подраздел",onKeyDown:R=>R.key==="Enter"&&A(I.id,u[I.id]||"")}),i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:!(u[I.id]||"").trim(),onClick:()=>A(I.id,u[I.id]||""),children:"+ Подраздел"})]})]},I.id))}),i.jsx("div",{className:"bd-catalog-review-note good",children:"Перенос сохраняет позиции, цены, планы продаж и техкарты. Изменения применятся после нажатия «Сохранить структуру»."}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:t,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:h,onClick:D,children:h?"Сохраняю…":"Сохранить структуру"})]})]})})}
`;

replaceSegment(
  "function bdCatStructureManager",
  "function bdCatRecipeEditor",
  structureManager,
  "explicit catalog move controls",
);

replaceOnce(
  'children:"Структура"',
  'children:"Разделы"',
  "catalog structure header button",
);

replaceOnce(
  'children:"Разделы"})]})]}),s.menuItems.length?',
  'children:"Разделы"})]})]}),L&&i.jsxs("button",{type:"button",className:"bd-catalog-structure-gateway",onClick:()=>bdSetStructureOpen(!0),children:[i.jsxs("span",{children:[i.jsx("b",{children:"Управление разделами"}),i.jsx("small",{children:"Переименовать или перенести раздел и подраздел вместе с позициями"})]}),i.jsx("strong",{children:"Открыть →"})]}),s.menuItems.length?',
  "visible catalog structure gateway",
);

writeFileSync(bundlePath, source);

let css = readFileSync(cssPath, "utf8");
if (!css.includes("/* catalog-move-controls-v44 */")) {
  css += String.raw`

/* catalog-move-controls-v44 */
.bd-catalog-structure-gateway {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 12px;
  padding: 12px 13px;
  border: 1px solid #dcd9ff;
  border-radius: 15px;
  background: #f4f2ff;
  color: #302aa9;
  text-align: left;
}

.bd-catalog-structure-gateway span,
.bd-catalog-structure-gateway b,
.bd-catalog-structure-gateway small {
  display: block;
}

.bd-catalog-structure-gateway b {
  font-size: 12px;
}

.bd-catalog-structure-gateway small {
  margin-top: 3px;
  color: #7772a7;
  font-size: 9.5px;
  line-height: 1.3;
}

.bd-catalog-structure-gateway strong {
  flex: 0 0 auto;
  font-size: 10px;
}

.bd-catalog-group-move {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 7px;
  padding: 10px;
  border-bottom: 1px solid #eceef4;
  background: #fbfaff;
}

.bd-catalog-group-move label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.bd-catalog-group-move label span {
  color: #747c90;
  font-size: 8.5px;
  font-weight: 780;
}

.bd-catalog-group-move select {
  width: 100%;
  min-height: 42px;
  padding: 8px 11px;
  border: 1px solid #dfe2eb;
  border-radius: 12px;
  outline: 0;
  background: #fff;
  color: #1b2134;
  font-size: 12px;
}

.bd-catalog-group-move small {
  grid-column: 1 / -1;
  color: #858c9e;
  font-size: 8.5px;
  line-height: 1.35;
}

.bd-catalog-move-button {
  min-height: 42px;
  padding: 0 11px;
  border: 1px solid #655df2;
  border-radius: 12px;
  background: #655df2;
  color: #fff;
  font-size: 10px;
  font-weight: 820;
}

.bd-catalog-move-button:disabled {
  border-color: #e1e3ea;
  background: #eef0f4;
  color: #9aa0ae;
}

.bd-catalog-structure-subrow {
  grid-template-columns: minmax(0, 1fr) minmax(126px, .9fr) auto auto;
}

@media (max-width: 520px) {
  .bd-catalog-group-move,
  .bd-catalog-structure-subrow {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .bd-catalog-group-move .bd-catalog-move-button,
  .bd-catalog-structure-subrow .bd-catalog-move-button {
    width: 100%;
  }
}
`;
  writeFileSync(cssPath, css);
}

console.log("Applied explicit catalog move controls v44.");
