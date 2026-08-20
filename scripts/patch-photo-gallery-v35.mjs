import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const versionMarker = 'const bdPhotoGalleryVersion="gallery-v35"';
if (source.includes(versionMarker)) {
  console.log("Photo gallery picker v35 is already applied.");
  process.exit(0);
}

function replaceOnce(input, before, after, label) {
  const count = input.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return input.replace(before, after);
}

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  if (input.indexOf(start, startIndex + start.length) >= 0) {
    throw new Error(`${label}: start marker is not unique`);
  }
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

function transformRange(input, start, end, transform, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: range start not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: range end not found`);
  const current = input.slice(startIndex, endIndex);
  const next = transform(current);
  return input.slice(0, startIndex) + next + input.slice(endIndex);
}

const pickerComponent = String.raw`const bdPhotoGalleryVersion="gallery-v35";
function bdPhotoSelection({files:e,onChange:t,onCancel:n,onConfirm:r,onAdd:a,title:s,copy:l}){const u=S.useMemo(()=>e.map(f=>URL.createObjectURL(f)),[e]);S.useEffect(()=>()=>u.forEach(f=>URL.revokeObjectURL(f)),[u]);const d=(f,m)=>{const h=f+m;if(h<0||h>=e.length)return;const g=[...e],[y,j]=[g[f],g[h]];g[f]=j,g[h]=y,t(g)},f=m=>t(e.filter((h,g)=>g!==m));return i.jsx("div",{className:"bd-catalog-sheet-backdrop",children:i.jsxs("section",{className:"bd-catalog-sheet bd-photo-picker-sheet",children:[i.jsx("div",{className:"bd-catalog-sheet-handle"}),i.jsxs("header",{className:"bd-catalog-sheet-head",children:[i.jsxs("div",{children:[i.jsx("h2",{children:s}),i.jsxs("p",{children:[e.length," фото · максимум 12"]})]}),i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:n,"aria-label":"Закрыть",children:"×"})]}),i.jsx("div",{className:"bd-catalog-review-note good",children:l}),i.jsx("div",{className:"bd-photo-picker-list",children:e.map((m,h)=>i.jsxs("article",{className:"bd-photo-picker-item",children:[i.jsx("img",{src:u[h],alt:"Страница "+(h+1),loading:"lazy"}),i.jsxs("div",{className:"bd-photo-picker-copy",children:[i.jsxs("b",{children:["Страница ",h+1]}),i.jsxs("small",{children:[m.name," · ",Math.max(1,Math.round(m.size/1024))," КБ"]})]}),i.jsxs("div",{className:"bd-photo-picker-controls",children:[i.jsx("button",{type:"button",disabled:h===0,onClick:()=>d(h,-1),"aria-label":"Переместить выше",children:"↑"}),i.jsx("button",{type:"button",disabled:h===e.length-1,onClick:()=>d(h,1),"aria-label":"Переместить ниже",children:"↓"}),i.jsx("button",{type:"button",className:"remove",onClick:()=>f(h),children:"Удалить"})]})]},m.name+"-"+m.lastModified+"-"+h))}),i.jsx("button",{type:"button",className:"bd-catalog-secondary bd-photo-picker-add",disabled:e.length>=12,onClick:a,children:"+ Добавить ещё фото"}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:n,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:!e.length,onClick:r,children:e.length>1?"Распознать "+e.length+" страниц":"Распознать фото"})]})]})})}
`;

source = transformRange(
  source,
  "function bdSuppliersPage(){",
  'const bdCatalogWorkspaceVersion="assortment-v34"',
  (supplierPage) => {
    let next = supplierPage;
    next = replaceOnce(
      next,
      '[N,E]=S.useState(""),_=S.useRef(null),T=S.useRef(null),A=',
      '[N,E]=S.useState(""),[C,x]=S.useState([]),_=S.useRef(null),T=S.useRef(null),F=S.useRef(null),A=',
      "supplier gallery state",
    );
    next = replaceSegment(
      next,
      "async function U(",
      "async function V(",
      String.raw`async function U(p,c="upload",I="auto"){const R=Array.isArray(p)?p:[p];if(!R.length||!A)return;E(c==="camera"?"Читаю чек и разбираю позиции…":c==="gallery"?"Распознаю "+R.length+" фото документа…":"Распознаю закупочный документ…");try{const Y=[];for(const J of R)Y.push(await bdProcPrepareImage(J));const ie=new FormData;for(const J of Y)ie.append("files",J);ie.append("source",c),ie.append("hint",I);const oe=await fetch("/api/purchases/scan",{method:"POST",body:ie}),ue=await oe.json();if(!oe.ok||!ue.ok)throw new Error(ue.error||"Не удалось распознать документ");m(ue.draft)}catch(Y){n({variant:"error",title:"Документ не распознан",description:Y instanceof Error?Y.message:"Повторите загрузку с более чётким фото."})}finally{E("")}}`,
      "supplier multi-file upload",
    );
    next = replaceSegment(
      next,
      "async function V(",
      "async function Z(",
      String.raw`async function V(p,c,I){const R=[...(p.currentTarget.files||[])],Y=p.currentTarget;p.currentTarget.value="";if(!R.length)return;if(Y===F.current){x(J=>[...J,...R].slice(0,12));return}await U(R,c,I)}`,
      "supplier gallery input",
    );
    next = replaceSegment(
      next,
      "async function Z()",
      "async function Q()",
      String.raw`async function Z(){const p=f;m(null);const c=bdProcArray(p?.sourceFileIds?.length?p.sourceFileIds:[p?.sourceFileId]).filter(Boolean);for(const I of c)try{await fetch("/api/purchases/files/"+encodeURIComponent(I),{method:"DELETE"})}catch{}}`,
      "supplier draft cleanup",
    );
    next = replaceOnce(
      next,
      'children:[i.jsxs("button",{type:"button",className:"bd-procurement-action",onClick:()=>T.current?.click(),children:[i.jsx("b",{children:"⬆ Импорт документа"}),i.jsx("small",{children:"Фото, PDF, Excel или CSV"})]})',
      'children:[i.jsxs("button",{type:"button",className:"bd-procurement-action",onClick:()=>F.current?.click(),children:[i.jsx("b",{children:"🖼 Из галереи"}),i.jsx("small",{children:"Одно или несколько фото"})]}),i.jsxs("button",{type:"button",className:"bd-procurement-action",onClick:()=>T.current?.click(),children:[i.jsx("b",{children:"⬆ Импорт файла"}),i.jsx("small",{children:"PDF, Excel или CSV"})]})',
      "supplier gallery action",
    );
    next = replaceOnce(
      next,
      'i.jsxs("button",{type:"button",className:"bd-procurement-action",onClick:()=>g({}),children:[i.jsx("b",{children:"＋ Поставщик"})',
      'i.jsxs("button",{type:"button",className:"bd-procurement-action",style:{gridColumn:"1 / -1"},onClick:()=>g({}),children:[i.jsx("b",{children:"＋ Поставщик"})',
      "supplier action layout",
    );
    next = replaceOnce(
      next,
      'i.jsx("input",{ref:T,type:"file",accept:"image/*,.pdf,.csv,.tsv,.xls,.xlsx",hidden:!0,onChange:p=>V(p,"upload","auto")})',
      'i.jsx("input",{ref:T,type:"file",accept:".pdf,.csv,.tsv,.xls,.xlsx",hidden:!0,onChange:p=>V(p,"upload","auto")}),i.jsx("input",{ref:F,type:"file",accept:"image/*",multiple:!0,hidden:!0,onChange:p=>V(p,"gallery","auto")})',
      "supplier gallery file input",
    );
    next = replaceOnce(
      next,
      'N&&i.jsx("div",{className:"bd-procurement-loading"',
      'C.length>0&&i.jsx(bdPhotoSelection,{files:C,onChange:x,onCancel:()=>x([]),onAdd:()=>F.current?.click(),onConfirm:()=>{const p=C;x([]);U(p,"gallery","auto")},title:"Фотографии документа",copy:"Проверьте порядок страниц. Можно удалить лишние снимки или добавить недостающие до распознавания."}),N&&i.jsx("div",{className:"bd-procurement-loading"',
      "supplier gallery review",
    );
    return next;
  },
  "supplier page",
);

source = transformRange(
  source,
  "function bdCatalogPage(){",
  "const n_e=",
  (catalogPage) => {
    let next = catalogPage;
    next = replaceOnce(
      next,
      "[O,M]=S.useState(!1),D=S.useRef(null),z=S.useRef(null),L=",
      "[O,M]=S.useState(!1),[C,x]=S.useState([]),D=S.useRef(null),z=S.useRef(null),F=S.useRef(null),L=",
      "catalog gallery state",
    );
    next = replaceSegment(
      next,
      'Z=async(p,c="upload")=>',
      "Q=async p=>",
      String.raw`Z=async(p,c="upload")=>{const I=Array.isArray(p)?p:[p];if(!I.length||!L)return;k(c==="camera"?"Читаю фотографию меню…":c==="gallery"?"Распознаю "+I.length+" фото меню…":"Распознаю меню и цены…");try{const R=[];for(const W of I)R.push(await bdProcPrepareImage(W));const G=new FormData;for(const W of R)G.append("files",W);G.append("source",c);const H=await fetch("/api/catalog/import",{method:"POST",body:G}),J=await H.json();if(!H.ok||!J.ok)throw new Error(J.error||"Не удалось распознать меню");m(J.draft)}catch(R){n({variant:"error",title:"Меню не распознано",description:R instanceof Error?R.message:"Попробуйте более чёткое фото или другой файл."})}finally{k("")}},`,
      "catalog multi-file upload",
    );
    next = replaceSegment(
      next,
      "H=async p=>",
      "G=async()=>",
      String.raw`H=async p=>{const c=[...(p.currentTarget.files||[])],I=p.currentTarget;p.currentTarget.value="";if(!c.length)return;if(I===F.current){x(R=>[...R,...c].slice(0,12));return}await Z(c,I===D.current?"camera":"upload")},`,
      "catalog gallery input",
    );
    next = replaceSegment(
      next,
      "G=async()=>",
      "Y=async()=>",
      String.raw`G=async()=>{const p=f;m(null);const c=bdCatArray(p?.sourceFileIds?.length?p.sourceFileIds:[p?.sourceFileId]).filter(Boolean);for(const I of c)try{await fetch("/api/catalog/files/"+encodeURIComponent(I),{method:"DELETE"})}catch{}},`,
      "catalog draft cleanup",
    );
    next = replaceOnce(
      next,
      'sourceFileId:f.sourceFileId,sourceUrl:f.sourceUrl,name:f.sourceFileName||f.venueName||"Меню",source:f.source,importedAt:new Date().toISOString()',
      'sourceFileId:f.sourceFileId,sourceFileIds:f.sourceFileIds,sourceUrl:f.sourceUrl,name:f.sourceFileName||f.venueName||"Меню",source:f.source,pageCount:f.pageCount||f.sourceFileIds?.length||1,importedAt:new Date().toISOString()',
      "catalog source page metadata",
    );
    next = replaceOnce(
      next,
      'onClick:()=>D.current?.click(),children:"📷 Сфотографировать меню"',
      'onClick:()=>F.current?.click(),children:"🖼 Выбрать фото меню"',
      "catalog primary gallery button",
    );
    next = replaceOnce(
      next,
      'children:[i.jsxs("button",{type:"button",className:"bd-catalog-import-action",disabled:!L,onClick:()=>D.current?.click(),children:[i.jsx("b",{children:"Фото"}),i.jsx("small",{children:"Снять страницу камерой"})]}),i.jsxs("button",{type:"button",className:"bd-catalog-import-action",disabled:!L,onClick:()=>z.current?.click(),children:[i.jsx("b",{children:"Файл"}),i.jsx("small",{children:"PDF, Excel или CSV"})]})',
      'children:[i.jsxs("button",{type:"button",className:"bd-catalog-import-action",disabled:!L,onClick:()=>D.current?.click(),children:[i.jsx("b",{children:"Камера"}),i.jsx("small",{children:"Снять одну страницу"})]}),i.jsxs("button",{type:"button",className:"bd-catalog-import-action",disabled:!L,onClick:()=>F.current?.click(),children:[i.jsx("b",{children:"Галерея"}),i.jsx("small",{children:"Выбрать несколько фото"})]}),i.jsxs("button",{type:"button",className:"bd-catalog-import-action",disabled:!L,onClick:()=>z.current?.click(),children:[i.jsx("b",{children:"Файл"}),i.jsx("small",{children:"PDF, Excel или CSV"})]})',
      "catalog gallery action",
    );
    next = replaceOnce(
      next,
      'i.jsx("input",{ref:z,type:"file",accept:"image/*,.pdf,.csv,.tsv,.xls,.xlsx,.html,.htm",hidden:!0,onChange:H})',
      'i.jsx("input",{ref:z,type:"file",accept:".pdf,.csv,.tsv,.xls,.xlsx,.html,.htm",hidden:!0,onChange:H}),i.jsx("input",{ref:F,type:"file",accept:"image/*",multiple:!0,hidden:!0,onChange:H})',
      "catalog gallery file input",
    );
    next = replaceOnce(
      next,
      'p.sourceUrl&&i.jsx("div",{className:"bd-catalog-card-actions"',
      '(p.pageCount||1)>1&&i.jsxs("p",{children:[p.pageCount," страниц загружено"]}),p.sourceUrl&&i.jsx("div",{className:"bd-catalog-card-actions"',
      "catalog source page count",
    );
    next = replaceOnce(
      next,
      'A&&i.jsx("div",{className:"bd-catalog-loading"',
      'C.length>0&&i.jsx(bdPhotoSelection,{files:C,onChange:x,onCancel:()=>x([]),onAdd:()=>F.current?.click(),onConfirm:()=>{const p=C;x([]);Z(p,"gallery")},title:"Страницы меню",copy:"Проверьте порядок страниц: BarDoctor прочитает фотографии сверху вниз как одно меню."}),A&&i.jsx("div",{className:"bd-catalog-loading"',
      "catalog gallery review",
    );
    return next;
  },
  "catalog page",
);

source = replaceOnce(
  source,
  'const bdCatalogWorkspaceVersion="assortment-v34"',
  pickerComponent + 'const bdCatalogWorkspaceVersion="assortment-v34"',
  "insert shared photo picker",
);

writeFileSync(bundlePath, source);
console.log("Applied photo gallery picker v35.");
