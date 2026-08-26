import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");

if (!bundle.includes("function bdInvoiceLineMappingV2(")) {
  const anchor = "function bdPurchaseReview(";
  const index = bundle.indexOf(anchor);
  if (index < 0) throw new Error("Purchase review anchor not found");
  const component = 'function bdInvoiceLineMappingV2({line:e,onSelect:t}){const[n,r]=S.useState(()=>!e.purchaseProductKey),[a,s]=S.useState(""),[l,u]=S.useState([]),[d,f]=S.useState(""),[m,h]=S.useState(null),[g,y]=S.useState("idle"),[j,v]=S.useState(0);S.useEffect(()=>{if(!n)return;const b=setTimeout(()=>v(N=>N+1),250);return()=>clearTimeout(b)},[n,a]);S.useEffect(()=>{if(!n)return;const b=new AbortController,N=new URLSearchParams({q:a,limit:"50"});d&&N.set("cursor",d),y("loading"),fetch("/api/tech-cards/nomenclature?"+N.toString(),{headers:ca(Ot()),cache:"no-store",signal:b.signal}).then(E=>E.json().then(_=>({ok:E.ok,body:_}))).then(({ok:E,body:_})=>{if(!E||!_.ok)throw new Error(_.error||"Не удалось загрузить номенклатуру");u(bdCatArray(_.items)),h(_.nextCursor||null),y("loaded")}).catch(E=>{E.name!=="AbortError"&&y("error")});return()=>b.abort()},[n,a,d,j]);if(!n&&e.purchaseProductKey)return i.jsxs("div",{className:"bd-invoice-mapping-v2 is-linked",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.name}),i.jsx("small",{children:e.mappingSource==="history"?"Знакомая позиция поставщика":"Связано с номенклатурой"})]}),i.jsx("button",{type:"button",onClick:()=>r(!0),children:"Изменить"})]});return i.jsxs("div",{className:"bd-invoice-mapping-v2 "+(e.requiresReview?"needs-review":""),children:[i.jsx("strong",{children:e.requiresReview?"Нужно сопоставить с номенклатурой":"Номенклатура"}),i.jsx("input",{type:"search",value:a,autoFocus:e.requiresReview,onChange:b=>{s(b.target.value),f("")},placeholder:"Найти по всей номенклатуре…","aria-label":"Поиск номенклатуры для строки накладной"}),g==="loading"&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",role:"status",children:a?"Ищем по всей номенклатуре…":"Загружаем номенклатуру…"}),g==="error"&&i.jsxs("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:["Не удалось загрузить номенклатуру. ",i.jsx("button",{type:"button",onClick:()=>v(b=>b+1),children:"Повторить"})]}),g==="loaded"&&!l.length&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",children:"Ничего не найдено"}),g==="loaded"&&l.length>0&&i.jsx("div",{className:"bd-invoice-mapping-results-v2",children:l.map(b=>i.jsxs("button",{type:"button",onClick:()=>{t({purchaseProductKey:b.key,nomenclatureId:b.id,name:b.name,requiresReview:!1,mappingSource:"manual",confidence:1,confidenceLevel:"high"}),r(!1)},children:[i.jsx("b",{children:b.name}),i.jsxs("small",{children:[b.packageSize||b.unit,b.supplierName?" · "+b.supplierName:""]})]},b.key))}),g==="loaded"&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-more-v2",disabled:!m,onClick:()=>f(m||""),children:m?"Показать ещё":"Все позиции загружены"}),!e.requiresReview&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-collapse-v2",onClick:()=>r(!1),children:"Свернуть"})]})}\n';
  bundle = bundle.slice(0, index) + component + bundle.slice(index);

  const field = 'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name,onChange:j=>{const v=j.target.value,b=bdProcSuggestedPackageV209(v,bdProcCurrentPackageV209(g));u(g.id,{name:v,...b!==bdProcCurrentPackageV209(g)?bdProcPackageUpdateV209(b):{}})},placeholder:"Название товара"})})';
  const replacement = 'i.jsxs(i.Fragment,{children:[' + field + ',(g.rawName||g.requiresReview)&&i.jsx(bdInvoiceLineMappingV2,{line:g,onSelect:j=>u(g.id,j)})]})';
  const count = bundle.split(field).length - 1;
  if (count !== 1) throw new Error("Purchase line field expected once, found " + count);
  bundle = bundle.replace(field, replacement);
}

let css = readFileSync(cssPath, "utf8");
if (!css.includes(".bd-invoice-mapping-v2")) {
  css += '\n.bd-invoice-mapping-v2{display:grid;gap:9px;padding:12px;border:1px solid #dfe3ec;border-radius:14px;background:#f8f9fc}.bd-invoice-mapping-v2.needs-review{border-color:#f1c36d;background:#fffaf0}.bd-invoice-mapping-v2.is-linked{grid-template-columns:minmax(0,1fr) auto;align-items:center}.bd-invoice-mapping-v2 span{display:grid;gap:2px}.bd-invoice-mapping-v2 small{color:#747b8e}.bd-invoice-mapping-v2 input{min-height:44px;border:1px solid #cfd5e2;border-radius:11px;padding:0 12px;font-size:16px}.bd-invoice-mapping-results-v2{display:grid;gap:6px;max-height:260px;overflow:auto}.bd-invoice-mapping-results-v2 button{display:grid;gap:2px;min-height:48px;padding:9px 11px;text-align:left;border:1px solid #e1e5ee;border-radius:10px;background:#fff}.bd-invoice-mapping-state-v2{padding:10px;border-radius:10px;background:#f0f2f7;color:#62697c}.bd-invoice-mapping-state-v2.is-error{background:#fff0f1;color:#a02d3b}.bd-invoice-mapping-more-v2,.bd-invoice-mapping-collapse-v2,.bd-invoice-mapping-v2.is-linked>button{min-height:42px;border:1px solid #d3d8e4;border-radius:10px;background:#fff;font-weight:700}@media(max-width:520px){.bd-invoice-mapping-v2.is-linked{grid-template-columns:1fr}.bd-invoice-mapping-results-v2{max-height:34dvh}}\n';
}

writeFileSync(bundlePath, bundle);
writeFileSync(cssPath, css);
console.log("Applied Invoice Recognition V2 mapping UI.");
