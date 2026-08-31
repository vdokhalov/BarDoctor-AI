import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const marker = "bd-taxonomy-manager-ux-v360";

let bundle = fs.readFileSync(bundlePath, "utf8");

if (!bundle.includes(marker) && !bundle.includes("bd-nomenclature-uat-v369")) {
  const createBefore = 'async function E(C,x){const R=window.prompt("Название");R?.trim()&&await j({action:"create",level:C,name:R.trim(),parentId:x||void 0})}';
  const createAfter = `/* ${marker} */async function E(C,x,R){const W=window.prompt(R||"Название нового элемента");W?.trim()&&await j({action:"create",level:C,name:W.trim(),parentId:x||void 0})}`;
  if (!bundle.includes(createBefore)) throw new Error("Taxonomy create handler not found");
  bundle = bundle.replace(createBefore, createAfter);

  const headerBefore = 'onClick:()=>E("section"),children:"+ Раздел"';
  const headerAfter = 'onClick:()=>E("section",null,"Название нового раздела"),children:"+ Добавить раздел"';
  if (!bundle.includes(headerBefore)) throw new Error("Taxonomy section action not found");
  bundle = bundle.replace(headerBefore, headerAfter);

  const treeBefore = 'T.map(C=>("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[A.filter(x=>x.parentId===C.id).map(x=>("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[k.filter(R=>R.parentId===x.id).map(R=>("subcategory",R,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336",onClick:()=>E("subcategory",x.id),children:"+ Подкатегория"})]}))),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336",onClick:()=>E("category",C.id),children:"+ Категория"})]})))';
  const treeActualBefore = treeBefore.replaceAll('>("', '>_("');
  const treeAfter = 'T.map(C=>("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"}),A.filter(x=>x.parentId===C.id).map(x=>("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",x.id,"Название новой подкатегории в категории «"+x.name+"»"),children:"+ Добавить подкатегорию"}),...k.filter(R=>R.parentId===x.id).map(R=>("subcategory",R,null))]})))]})))';
  const treeActualAfter = treeAfter.replaceAll('>("', '>_("');
  if (!bundle.includes(treeActualBefore)) throw new Error("Taxonomy tree actions not found");
  bundle = bundle.replace(treeActualBefore, treeActualAfter);
}

fs.writeFileSync(bundlePath, bundle);

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(marker)) {
  css += `

/* ${marker} */
.bd-tax-add-primary-v360,
.bd-tax-add-secondary-v360 {
  width: 100%;
  min-height: 42px !important;
  margin: 2px 0 0 !important;
  justify-content: flex-start;
  border-style: dashed !important;
  text-align: left;
}
.bd-tax-add-primary-v360 {
  border-color: #7b79ee !important;
  background: #f5f5ff !important;
  color: #4f4bd5 !important;
  font-size: 12.5px !important;
}
.bd-tax-add-secondary-v360 {
  border-color: #d5d7e8 !important;
  background: #fff !important;
  color: #555a72 !important;
}
@media (max-width: 620px) {
  .bd-tax-add-primary-v360,
  .bd-tax-add-secondary-v360 { min-height: 46px !important; padding: 0 13px !important; }
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
