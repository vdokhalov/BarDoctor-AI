import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");

const component = `function bdInvoiceLineMappingV3({line:e,supplierId:t,supplierName:n,documentId:r,onSelect:a}){const[s,l]=S.useState(()=>!e.purchaseProductKey),[u,d]=S.useState(""),[f,m]=S.useState([]),[h,g]=S.useState(""),[y,j]=S.useState(null),[v,b]=S.useState("idle"),[N,E]=S.useState(0),[_,T]=S.useState("idle"),C=bdCatArray(e.mappingCandidates);S.useEffect(()=>{if(!s)return;const A=setTimeout(()=>E(k=>k+1),250);return()=>clearTimeout(A)},[s,u]);S.useEffect(()=>{if(!s)return;const A=new AbortController,k=new URLSearchParams({q:u,limit:"50"});h&&k.set("cursor",h),b("loading"),fetch("/api/tech-cards/nomenclature?"+k.toString(),{headers:ca(Ot()),cache:"no-store",signal:A.signal}).then(O=>O.json().then(P=>({ok:O.ok,body:P}))).then(({ok:O,body:P})=>{if(!O||!P.ok)throw new Error(P.error||"Не удалось загрузить номенклатуру");const R=bdCatArray(P.items);m(M=>h?[...new Map([...M,...R].map(L=>[L.key,L])).values()]:R),j(P.nextCursor||null),b("loaded")}).catch(O=>{O.name!=="AbortError"&&b("error")});return()=>A.abort()},[s,u,h,N]);function A(k){if(!t||!e.rawName){T("deferred");return}T("saving"),fetch("/api/purchases/mappings",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({supplierId:t,supplierName:n,documentId:r,lineId:e.id,rawName:e.rawName,unit:e.unit,packageSize:e.packageSize,currency:e.currency,purchaseProductKey:k.key,nomenclatureId:k.id})}).then(O=>O.json().then(P=>({ok:O.ok,body:P}))).then(({ok:O,body:P})=>{if(!O||!P.ok)throw new Error(P.error||"mapping failed");T("saved")}).catch(()=>T("error"))}function O(k){a({purchaseProductKey:k.key,nomenclatureId:k.id,name:k.name,requiresReview:!1,mappingSource:"manual",confidence:1,confidenceLevel:"high"}),l(!1),A(k)}if(!s&&e.purchaseProductKey)return i.jsxs("div",{"data-bd-invoice-mapping-memory":"canonical-v3",className:"bd-invoice-mapping-v2 is-linked",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.name}),i.jsx("small",{children:e.mappingSource==="history"?"Знакомая позиция поставщика":_==="saved"?"Соответствие поставщика сохранено":_==="saving"?"Сохраняем соответствие…":_==="error"?"Связано; повторное обучение сохранится при подтверждении покупки":"Связано с номенклатурой"})]}),i.jsx("button",{type:"button",onClick:()=>l(!0),children:"Изменить"})]});return i.jsxs("div",{"data-bd-invoice-mapping-memory":"canonical-v3",className:"bd-invoice-mapping-v2 "+(e.requiresReview?"needs-review":""),children:[i.jsx("strong",{children:e.requiresReview?"Нужно сопоставить с номенклатурой":"Номенклатура"}),C.length>0&&i.jsxs("div",{className:"bd-invoice-mapping-suggestions-v3",children:[i.jsx("small",{children:"Предложенные совпадения"}),C.map(k=>i.jsxs("button",{type:"button",onClick:()=>O(k),children:[i.jsx("b",{children:k.name}),i.jsx("small",{children:"Уверенность "+Math.round((Number(k.score)||0)*100)+"%"})]},k.key||k.id))]}),i.jsx("input",{type:"search",value:u,autoFocus:e.requiresReview,onChange:k=>{d(k.target.value),g("")},placeholder:"Найти по всей номенклатуре…","aria-label":"Поиск номенклатуры для строки накладной"}),v==="loading"&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",role:"status",children:u?"Ищем по всей номенклатуре…":"Загружаем номенклатуру…"}),v==="error"&&i.jsxs("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:["Не удалось загрузить номенклатуру. ",i.jsx("button",{type:"button",onClick:()=>E(k=>k+1),children:"Повторить"})]}),v==="loaded"&&!f.length&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",children:"Ничего не найдено"}),v==="loaded"&&f.length>0&&i.jsx("div",{className:"bd-invoice-mapping-results-v2",children:f.map(k=>i.jsxs("button",{type:"button",onClick:()=>O(k),children:[i.jsx("b",{children:k.name}),i.jsxs("small",{children:[k.packageSize||k.unit,k.supplierName?" · "+k.supplierName:""]})]},k.key))}),v==="loaded"&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-more-v2",disabled:!y,onClick:()=>g(y||""),children:y?"Показать ещё":"Все позиции загружены"}),!e.requiresReview&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-collapse-v2",onClick:()=>l(!1),children:"Свернуть"})]})}
`;
const componentV4 = component
  .replace(
    "S.useState(()=>!e.purchaseProductKey)",
    'S.useState(()=>!e.purchaseProductKey||e.requiresReview||e.mappingSource==="ai")',
  )
  .replace(
    'children:e.requiresReview?"Нужно сопоставить с номенклатурой":"Номенклатура"',
    'children:e.mappingSource==="ai"?"Подтвердите предложенную номенклатуру":e.requiresReview?"Нужно сопоставить с номенклатурой":"Номенклатура"',
  );

const oldStart = bundle.indexOf("function bdInvoiceLineMappingV2(");
const newStart = bundle.indexOf("function bdInvoiceLineMappingV3(");
if (oldStart >= 0 || newStart >= 0) {
  const start = oldStart >= 0 ? oldStart : newStart;
  const end = bundle.indexOf("function bdPurchaseReview(", start);
  if (end < 0) throw new Error("Purchase review anchor not found after mapping component");
  bundle = bundle.slice(0, start) + componentV4 + bundle.slice(end);
} else {
  const anchor = "function bdPurchaseReview(";
  const index = bundle.indexOf(anchor);
  if (index < 0) throw new Error("Purchase review anchor not found");
  bundle = bundle.slice(0, index) + componentV4 + bundle.slice(index);
}

bundle = bundle.replace(
  /i\.jsx\(bdInvoiceLineMappingV[23],\{line:g,(?:supplierId:e\.supplierId,supplierName:e\.supplierName,documentId:e\.id,)?onSelect:j=>u\(g\.id,j\)\}\)/g,
  'i.jsx(bdInvoiceLineMappingV3,{line:g,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:j=>u(g.id,j)})',
);

bundle = bundle.replace(
  "(g.rawName||g.requiresReview)&&i.jsx(bdInvoiceLineMappingV3",
  "(g.rawName||g.requiresReview||g.mappingSource||bdCatArray(g.mappingCandidates).length>0)&&i.jsx(bdInvoiceLineMappingV3",
);

if (!bundle.includes("i.jsx(bdInvoiceLineMappingV3,{line:g,supplierId:e.supplierId")) {
  const field = 'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name,onChange:j=>{const v=j.target.value,b=bdProcSuggestedPackageV209(v,bdProcCurrentPackageV209(g));u(g.id,{name:v,...b!==bdProcCurrentPackageV209(g)?bdProcPackageUpdateV209(b):{}})},placeholder:"Название товара"})})';
  const replacement = 'i.jsxs(i.Fragment,{children:[' + field + ',(g.rawName||g.requiresReview)&&i.jsx(bdInvoiceLineMappingV3,{line:g,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:j=>u(g.id,j)})]})';
  const count = bundle.split(field).length - 1;
  if (count !== 1) throw new Error("Purchase line field expected once, found " + count);
  bundle = bundle.replace(field, replacement);
}

let css = readFileSync(cssPath, "utf8");
if (!css.includes(".bd-invoice-mapping-v2")) {
  css += '\n.bd-invoice-mapping-v2{display:grid;gap:9px;padding:12px;border:1px solid #dfe3ec;border-radius:14px;background:#f8f9fc}.bd-invoice-mapping-v2.needs-review{border-color:#f1c36d;background:#fffaf0}.bd-invoice-mapping-v2.is-linked{grid-template-columns:minmax(0,1fr) auto;align-items:center}.bd-invoice-mapping-v2 span{display:grid;gap:2px}.bd-invoice-mapping-v2 small{color:#747b8e}.bd-invoice-mapping-v2 input{min-height:44px;border:1px solid #cfd5e2;border-radius:11px;padding:0 12px;font-size:16px}.bd-invoice-mapping-results-v2{display:grid;gap:6px;max-height:260px;overflow:auto}.bd-invoice-mapping-results-v2 button{display:grid;gap:2px;min-height:48px;padding:9px 11px;text-align:left;border:1px solid #e1e5ee;border-radius:10px;background:#fff}.bd-invoice-mapping-state-v2{padding:10px;border-radius:10px;background:#f0f2f7;color:#62697c}.bd-invoice-mapping-state-v2.is-error{background:#fff0f1;color:#a02d3b}.bd-invoice-mapping-more-v2,.bd-invoice-mapping-collapse-v2,.bd-invoice-mapping-v2.is-linked>button{min-height:42px;border:1px solid #d3d8e4;border-radius:10px;background:#fff;font-weight:700}@media(max-width:520px){.bd-invoice-mapping-v2.is-linked{grid-template-columns:1fr}.bd-invoice-mapping-results-v2{max-height:34dvh}}\n';
}
if (!css.includes(".bd-invoice-mapping-suggestions-v3")) {
  css += '\n.bd-invoice-mapping-suggestions-v3{display:grid;gap:6px;padding:9px;border-radius:11px;background:#fff4d8}.bd-invoice-mapping-suggestions-v3>small{color:#70520d;font-weight:700}.bd-invoice-mapping-suggestions-v3 button{display:grid;gap:2px;min-height:46px;padding:8px 10px;text-align:left;border:1px solid #efd28a;border-radius:10px;background:#fff}.bd-invoice-mapping-suggestions-v3 button small{color:#786a48}\n';
}

writeFileSync(bundlePath, bundle);
writeFileSync(cssPath, css);
console.log("Applied Invoice Recognition V2 mapping UI.");
