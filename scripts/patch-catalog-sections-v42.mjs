import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const versionMarker = 'const bdCatalogWorkspaceVersion="catalog-sections-v42"';
if (source.includes(versionMarker)) {
  console.log("Catalog sections v42 are already applied.");
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
  'const bdCatalogWorkspaceVersion="assortment-v34"',
  versionMarker,
  "catalog workspace version",
);

replaceOnce(
  'function bdCatTypeLabel(e){return e==="ready"?"Готовый товар":e==="service"?"Услуга":"Составная позиция"}\nfunction bdCatUnitLabel(e){return e==="ml"?"мл":e==="g"?"г":e==="pcs"?"шт.":String(e||"ед.")}',
  String.raw`function bdCatTypeLabel(e){return e==="ready"?"Готовый товар":e==="service"?"Услуга":"Составная позиция"}
const bdCatDisclosureKey="bd_catalog_disclosure_v1",bdCatDepartments=[{id:"bar",label:"Бар"},{id:"kitchen",label:"Кухня"},{id:"hookah",label:"Кальяны"},{id:"other",label:"Другое"}];
function bdCatReadDisclosure(){try{const e=JSON.parse(localStorage.getItem(bdCatDisclosureKey)||"{}");return e&&typeof e==="object"&&!Array.isArray(e)?e:{}}catch{return{}}}
function bdCatDepartment(e){const t=String(e?.department||e?.section||"").trim().toLocaleLowerCase("ru");if(["bar","бар","напитки"].includes(t))return"bar";if(["kitchen","кухня","еда"].includes(t))return"kitchen";if(["hookah","кальян","кальяны"].includes(t))return"hookah";if(["other","другое","прочее"].includes(t))return"other";const n=String(e?.category||"").toLocaleLowerCase("ru"),r=(n+" "+String(e?.name||"")).toLocaleLowerCase("ru"),a=/кальян|табак|чаша|забивк|shisha|hookah/,s=/кухн|салат|закуск|суп|горяч|пицц|бургер|паста|гриль|мяс|рыб|гарнир|десерт|еда|блюд|сэндвич|хлеб|соус|ролл|суши|завтрак|фри/,l=/бар|коктейл|пиво|beer|вино|wine|водк|виски|whisky|ром|джин|текил|коньяк|бренди|лик[её]р|шот|алког|напит|лимонад|кофе|чай|сок|вода|энергетик/;return a.test(r)?"hookah":s.test(n)?"kitchen":l.test(n)?"bar":s.test(r)?"kitchen":l.test(r)?"bar":"other"}
function bdCatSubsection(e){const t=String(e?.category||"").trim(),n=t.toLocaleLowerCase("ru");return!t||["бар","кухня","кальян","кальяны","другое","прочее","без категории","без подраздела"].includes(n)?"Без подраздела":t}
function bdCatMenuGroups(e){const t=new Map(bdCatDepartments.map(n=>[n.id,{...n,total:0,subsections:new Map}]));for(const n of bdCatArray(e)){const r=bdCatDepartment(n),a=t.get(r)||t.get("other"),s=bdCatSubsection(n),l=a.subsections.get(s)||{label:s,items:[]};l.items.push(n),a.subsections.set(s,l),a.total++}return bdCatDepartments.map(n=>{const r=t.get(n.id);return{...n,total:r.total,subsections:[...r.subsections.values()]}}).filter(n=>n.total>0)}
function bdCatIsOpen(e,t,n){return Object.prototype.hasOwnProperty.call(e,t)?e[t]===!0:n==="section"}
function bdCatUnitLabel(e){return e==="ml"?"мл":e==="g"?"г":e==="pcs"?"шт.":String(e||"ед.")}`,
  "catalog grouping helpers",
);

const menuEditor = String.raw`function bdCatMenuEditor({item:e,horizon:t,onClose:n,onSave:r}){const[a,s]=S.useState(()=>e?{...e,department:bdCatDepartment(e)}:{id:crypto.randomUUID(),department:"other",category:"Без подраздела",name:"",salePrice:0,currency:"RUB",portionSize:"",type:"composite",active:!0,plannedSales:0,confidence:1,warnings:[]}),l=(u,d)=>s(f=>({...f,[u]:d})),u=()=>{if(!a.name.trim())return;r({...a,department:bdCatDepartment(a),name:a.name.trim(),category:a.category.trim()||"Без подраздела",salePrice:Math.max(0,bdCatNumber(a.salePrice)),plannedSales:Math.max(0,bdCatNumber(a.plannedSales)),updatedAt:new Date().toISOString(),createdAt:a.createdAt||new Date().toISOString()}),n()};return i.jsx("div",{className:"bd-catalog-sheet-backdrop",onClick:d=>d.target===d.currentTarget&&n(),children:i.jsxs("section",{className:"bd-catalog-sheet",children:[i.jsx("div",{className:"bd-catalog-sheet-handle"}),i.jsxs("header",{className:"bd-catalog-sheet-head",children:[i.jsxs("div",{children:[i.jsx("h2",{children:e?"Позиция меню":"Новая позиция"}),i.jsx("p",{children:"Раздел, цена продажи, тип и план нужны для расчёта закупки."})]}),i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:n,children:"×"})]}),i.jsxs("div",{className:"bd-catalog-form",children:[i.jsx(bdCatField,{label:"Название",children:i.jsx("input",{value:a.name,onChange:d=>l("name",d.target.value),placeholder:"Например, Виски-кола"})}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Раздел",children:i.jsx("select",{value:a.department||bdCatDepartment(a),onChange:d=>l("department",d.target.value),children:bdCatDepartments.map(d=>i.jsx("option",{value:d.id,children:d.label},d.id))})}),i.jsx(bdCatField,{label:"Подраздел",children:i.jsx("input",{value:a.category,onChange:d=>l("category",d.target.value),placeholder:"Коктейли, пиво, горячие блюда"})})]}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Цена продажи",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:a.salePrice,onChange:d=>l("salePrice",d.target.value)})}),i.jsx(bdCatField,{label:"Валюта",children:i.jsx("select",{value:a.currency||"RUB",onChange:d=>l("currency",d.target.value),children:["RUB","MDL","EUR","USD","UAH","RON"].map(d=>i.jsx("option",{value:d,children:d},d))})})]}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Тип позиции",children:i.jsxs("select",{value:a.type,onChange:d=>l("type",d.target.value),children:[i.jsx("option",{value:"composite",children:"Составная"}),i.jsx("option",{value:"ready",children:"Готовый товар"}),i.jsx("option",{value:"service",children:"Услуга"})]})}),i.jsx(bdCatField,{label:"Порция / объём",children:i.jsx("input",{value:a.portionSize||"",onChange:d=>l("portionSize",d.target.value),placeholder:"250 г / 50 мл"})})]}),a.type!=="service"&&i.jsx(bdCatField,{label:"План продаж на "+t+" дней",children:i.jsx("input",{type:"number",step:"1",min:"0",inputMode:"numeric",value:a.plannedSales,onChange:d=>l("plannedSales",d.target.value),placeholder:"Сколько порций ожидается"})}),i.jsx(bdCatField,{label:"Статус",children:i.jsxs("select",{value:a.active===!1?"archived":"active",onChange:d=>l("active",d.target.value==="active"),children:[i.jsx("option",{value:"active",children:"Активна"}),i.jsx("option",{value:"archived",children:"В архиве"})]})}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:n,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:!a.name.trim(),onClick:u,children:"Сохранить"})]})]})]})})}
`;

replaceSegment(
  "function bdCatMenuEditor",
  "function bdCatRecipeEditor",
  menuEditor,
  "menu editor with department",
);

replaceOnce(
  'i.jsx(bdCatField,{label:"Категория",children:i.jsx("input",{value:u.category,onChange:f=>s(u.id,{category:f.target.value})})}),',
  'i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Раздел",children:i.jsx("select",{value:u.department||bdCatDepartment(u),onChange:f=>s(u.id,{department:f.target.value}),children:bdCatDepartments.map(f=>i.jsx("option",{value:f.id,children:f.label},f.id))})}),i.jsx(bdCatField,{label:"Подраздел",children:i.jsx("input",{value:u.category,onChange:f=>s(u.id,{category:f.target.value})})})]}),',
  "import review department fields",
);

replaceOnce(
  '[C,x]=S.useState([]),D=S.useRef(null),z=S.useRef(null),F=S.useRef(null)',
  '[C,x]=S.useState([]),[bdDisclosure,bdSetDisclosure]=S.useState(bdCatReadDisclosure),D=S.useRef(null),z=S.useRef(null),F=S.useRef(null)',
  "catalog disclosure state",
);

replaceOnce(
  'const q=S.useMemo(()=>bdCatPurchaseProducts(u),[u]),B=S.useMemo(()=>bdCatReadiness(s),[s]),U=S.useMemo(()=>bdCatNeeds(s,q),[s,q]),V=async(p,c)=>{',
  'const q=S.useMemo(()=>bdCatPurchaseProducts(u),[u]),B=S.useMemo(()=>bdCatReadiness(s),[s]),U=S.useMemo(()=>bdCatNeeds(s,q),[s,q]),bdMenuGroups=S.useMemo(()=>bdCatMenuGroups(s.menuItems),[s.menuItems]),bdToggleDisclosure=(p,c)=>{bdSetDisclosure(I=>{const R={...I,[p]:!bdCatIsOpen(I,p,c)};try{localStorage.setItem(bdCatDisclosureKey,JSON.stringify(R))}catch{}return R})},V=async(p,c)=>{',
  "catalog grouping state",
);

const groupedMenu = String.raw`s.menuItems.length?i.jsx("div",{className:"bd-catalog-departments",children:bdMenuGroups.map(p=>{const c="section:"+p.id,I=bdCatIsOpen(bdDisclosure,c,"section");return i.jsxs("section",{className:"bd-catalog-department "+(I?"open":""),children:[i.jsxs("button",{type:"button",className:"bd-catalog-department-toggle",onClick:()=>bdToggleDisclosure(c,"section"),"aria-expanded":I,children:[i.jsxs("span",{className:"bd-catalog-department-title",children:[i.jsx("i",{className:"bd-catalog-department-dot "+p.id}),i.jsx("b",{children:p.label})]}),i.jsxs("span",{className:"bd-catalog-toggle-meta",children:[p.total+" поз.",i.jsx("i",{className:"bd-catalog-chevron",children:"⌄"})]})]}),I&&i.jsx("div",{className:"bd-catalog-subsections",children:p.subsections.map(c=>{const I="subsection:"+p.id+":"+bdProcNorm(c.label),R=bdCatIsOpen(bdDisclosure,I,"subsection");return i.jsxs("section",{className:"bd-catalog-subsection "+(R?"open":""),children:[i.jsxs("button",{type:"button",className:"bd-catalog-subsection-toggle",onClick:()=>bdToggleDisclosure(I,"subsection"),"aria-expanded":R,children:[i.jsx("b",{children:c.label}),i.jsxs("span",{className:"bd-catalog-toggle-meta",children:[c.items.length+" поз.",i.jsx("i",{className:"bd-catalog-chevron",children:"⌄"})]})]}),R&&i.jsx("div",{className:"bd-catalog-subsection-list",children:c.items.map(W=>{const J=bdCatRecipeFor(W,s.recipes);return i.jsxs("article",{className:"bd-catalog-card",children:[i.jsxs("div",{className:"bd-catalog-card-top",children:[i.jsxs("div",{children:[i.jsx("h4",{children:W.name}),i.jsxs("p",{children:[c.label,W.portionSize?" · "+W.portionSize:""]})]}),i.jsx("strong",{className:"bd-catalog-card-amount",children:bdProcMoney(W.salePrice,W.currency||"RUB")})]}),i.jsxs("div",{className:"bd-catalog-chips",children:[i.jsx("span",{className:"bd-catalog-chip",children:bdCatTypeLabel(W.type)}),W.type!=="service"&&i.jsx("span",{className:"bd-catalog-chip "+(J?.status==="confirmed"?"good":"warn"),children:J?.status==="confirmed"?"Техкарта готова":"Нет техкарты"}),W.type!=="service"&&i.jsxs("span",{className:"bd-catalog-chip "+(bdCatNumber(W.plannedSales)>0?"good":"bad"),children:["План ",bdCatNumber(W.plannedSales)]}),W.active===!1&&i.jsx("span",{className:"bd-catalog-chip",children:"Архив"})]}),L&&i.jsxs("div",{className:"bd-catalog-card-actions",children:[W.type!=="service"&&i.jsx("button",{type:"button",className:"bd-catalog-link",onClick:()=>j(W),children:"Техкарта"}),i.jsx("button",{type:"button",className:"bd-catalog-link",onClick:()=>g(W),children:"Редактировать"})]})]},W.id)})})]},I)})})]},p.id)})})`;

replaceSegment(
  's.menuItems.length?i.jsx("div",{className:"bd-catalog-list",children:s.menuItems.map(p=>{',
  ':i.jsxs("div",{className:"bd-catalog-empty",children:[i.jsx("strong",{children:"Ассортимент пока пуст"})',
  groupedMenu,
  "grouped menu rendering",
);

writeFileSync(bundlePath, source);
console.log("Applied collapsible catalog sections v42.");
