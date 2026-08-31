import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const marker = "bd-nested-sections-v365";

let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    "function bdTaxonomyManagerV336({onSaved:e})",
    `/* ${marker} */function bdSectionDescendantIdsV365(e,t){const n=new Set;let r=[t];for(;r.length;){const a=new Set(r);r=bdTaxArrayV336(e).filter(s=>s.parentId&&a.has(s.parentId)&&!n.has(s.id)).map(s=>s.id);r.forEach(s=>n.add(s))}return n}function bdSectionPathLabelV365(e,t){const n=[],r=new Set;let a=t;for(;a&&!r.has(a.id);)r.add(a.id),n.unshift(a.name),a=a.parentId?bdTaxArrayV336(e).find(s=>s.id===a.parentId):null;return n.join(" → ")}function bdTaxonomyManagerV336({onSaved:e})`,
    "Nested section helpers",
  );

  replaceExactly(
    'const W=bdTaxUsageV336(r,C,x.id),J=C==="category"?bdTaxActiveV336(t?.sections):C==="subcategory"?bdTaxActiveV336(t?.categories):[];',
    'const W=bdTaxUsageV336(r,C,x.id),J=C==="section"?bdTaxActiveV336(t?.sections).filter(K=>K.id!==x.id&&!bdSectionDescendantIdsV365(t?.sections,x.id).has(K.id)):C==="category"?bdTaxActiveV336(t?.sections):C==="subcategory"?bdTaxActiveV336(t?.categories):[];',
    "Section parent candidates",
  );

  replaceExactly(
    'C==="section"?i.jsx("p",{className:"bd-tax-root-note-v364",children:"Раздел — верхний уровень. У него нет родителя."}):J.length>0?i.jsxs("label",{className:"bd-tax-move-menu-v364",children:[i.jsx("span",{children:C==="category"?"Переместить категорию в раздел":"Переместить подкатегорию в категорию"}),i.jsx("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:J.map(K=>i.jsx("option",{value:K.id,children:K.name},K.id))}),i.jsx("small",{children:C==="category"?"Категория появится внутри выбранного раздела.":"Подкатегория появится внутри выбранной категории."})]}):null',
    'C==="section"?i.jsxs("label",{className:"bd-tax-move-menu-v364 bd-tax-section-parent-v365",children:[i.jsx("span",{children:"Расположение раздела"}),i.jsxs("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:[i.jsx("option",{value:"",children:"Верхний уровень"}),...J.map(K=>i.jsx("option",{value:K.id,children:bdSectionPathLabelV365(t?.sections,K)},K.id))]}),i.jsx("small",{children:"Выберите родительский раздел или оставьте раздел на верхнем уровне."})]}):J.length>0?i.jsxs("label",{className:"bd-tax-move-menu-v364",children:[i.jsx("span",{children:C==="category"?"Переместить категорию в раздел":"Переместить подкатегорию в категорию"}),i.jsx("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:J.map(K=>i.jsx("option",{value:K.id,children:C==="category"?bdSectionPathLabelV365(t?.sections,K):K.name},K.id))}),i.jsx("small",{children:C==="category"?"Категория появится внутри выбранного раздела.":"Подкатегория появится внутри выбранной категории."})]}):null',
    "Level-specific parent controls",
  );

  replaceExactly(
    'const T=bdAlphabeticalV363(t.sections),A=bdAlphabeticalV363(t.categories),k=bdAlphabeticalV363(t.subcategories);return i.jsxs("section"',
    'const T=bdAlphabeticalV363(t.sections),A=bdAlphabeticalV363(t.categories),k=bdAlphabeticalV363(t.subcategories);function bdRenderSectionV365(C,x=0){const R=bdAlphabeticalV363([...T.filter(W=>W.parentId===C.id).map(W=>({kind:"section",node:W,name:W.name})),...A.filter(W=>W.parentId===C.id).map(W=>({kind:"category",node:W,name:W.name}))]),W=_("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[...R.map(J=>J.kind==="section"?bdRenderSectionV365(J.node,x+1):_("category",J.node,i.jsxs("div",{className:"bd-tax-children-v336",children:[...k.filter(K=>K.parentId===J.node.id).map(K=>_("subcategory",K,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",J.node.id,"Название новой подкатегории в категории «"+J.node.name+"»"),children:"+ Добавить подкатегорию"})]}))),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"})]}));return x?i.jsx("div",{className:"bd-tax-nested-section-v365",children:W},C.id):W}return i.jsxs("section"',
    "Recursive section renderer",
  );

  const oldTree = 'i.jsx("div",{className:"bd-tax-tree-v336",children:T.map(C=>("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[...A.filter(x=>x.parentId===C.id).map(x=>("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[...k.filter(R=>R.parentId===x.id).map(R=>("subcategory",R,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",x.id,"Название новой подкатегории в категории «"+x.name+"»"),children:"+ Добавить подкатегорию"})]}))),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"})]})))}),';
  const actualOldTree = oldTree.replaceAll('>("', '>_("');
  replaceExactly(
    actualOldTree,
    'i.jsx("div",{className:"bd-tax-tree-v336",children:T.filter(C=>!C.parentId||!T.some(x=>x.id===C.parentId)).map(C=>bdRenderSectionV365(C))}),',
    "Top-level section roots",
  );

  replaceExactly(
    'children:"Все разделы, категории и подкатегории показаны по алфавиту."',
    'children:"Все уровни показаны по алфавиту. Разделы можно вкладывать друг в друга."',
    "Nested section guidance",
  );
}

const pathsMarker = "bd-nested-section-paths-v365";
if (!source.includes(pathsMarker)) {
  replaceExactly(
    'function bdNomenclaturePathParts(e,t){const n=[],r=e.sections.find(a=>a.id===t.sectionId),s=e.categories.find(a=>a.id===t.taxonomyCategoryId),l=e.subcategories.find(a=>a.id===t.subcategoryId);return r&&r.id!=="unassigned"&&n.push(r.name),s&&s.id!=="unassigned-category"&&n.push(s.name),l&&l.id!=="unassigned-subcategory"&&n.push(l.name),n}',
    `/* ${pathsMarker} */function bdNomenclaturePathParts(e,t){const n=[],r=e.sections.find(a=>a.id===t.sectionId),s=e.categories.find(a=>a.id===t.taxonomyCategoryId),l=e.subcategories.find(a=>a.id===t.subcategoryId);r&&r.id!=="unassigned"&&n.push(...bdSectionPathLabelV365(e.sections,r).split(" → ")),s&&s.id!=="unassigned-category"&&n.push(s.name),l&&l.id!=="unassigned-subcategory"&&n.push(l.name);return n}`,
    "Nested section item paths",
  );
  replaceExactly(
    'y.find(P=>P.id===u.sectionId)?.name||"Раздел не выбран"',
    'u.sectionId?bdSectionPathLabelV365(y,y.find(P=>P.id===u.sectionId)):"Раздел не выбран"',
    "Nested classification summary",
    2,
  );
  replaceExactly(
    '...y.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))',
    '...y.map(P=>i.jsx("option",{value:P.id,children:bdSectionPathLabelV365(y,P)},P.id))',
    "Nested classification options",
    2,
  );
  replaceExactly(
    'children:C.name})]}),i.jsxs("span",{className:"bd-taxonomy-disclosure-meta-v238"',
    'children:bdSectionPathLabelV365(t.sections,C)})]}),i.jsxs("span",{className:"bd-taxonomy-disclosure-meta-v238"',
    "Nested structure labels",
  );
}

fs.writeFileSync(bundlePath, source);

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(marker)) {
  css += `

/* ${marker} */
.bd-tax-nested-section-v365 {
  margin: 8px 10px 0 16px;
  padding-left: 10px;
  border-left: 2px solid #d9dcf3;
}
.bd-tax-section-parent-v365 select { font-weight: 750; }
@media (max-width: 620px) {
  .bd-tax-nested-section-v365 {
    margin-right: 4px;
    margin-left: 8px;
    padding-left: 7px;
  }
}
`;
  fs.writeFileSync(cssPath, css);
}

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  contents = contents.replace(/canonical-taxonomy-v336\.css\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `canonical-taxonomy-v336.css?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
