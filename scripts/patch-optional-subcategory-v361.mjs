import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-optional-subcategory-v361";
let source = fs.readFileSync(bundlePath, "utf8");

if (!source.includes(marker)) {
  const requiredCount = source.split("||!u.subcategoryId").length - 1;
  if (requiredCount !== 4) throw new Error(`Expected 4 nomenclature subcategory gates, found ${requiredCount}`);
  source = source.split("||!u.subcategoryId").join("");

  const editorSelect = 'children:v.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))';
  const editorSelectCount = source.split(editorSelect).length - 1;
  if (editorSelectCount !== 2) throw new Error(`Expected 2 nomenclature subcategory selects, found ${editorSelectCount}`);
  source = source.split(editorSelect).join('children:[i.jsx("option",{value:"",children:"Без подкатегории"}),...v.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]');

  source = source.split('children:"Подкатегория"').join('children:"Подкатегория (необязательно)"');

  const attentionBefore = 'function bdNomenclatureNeedsAttention(e){return!e?.sectionId||!e?.taxonomyCategoryId||!e?.subcategoryId||e.sectionId==="unassigned"||e.taxonomyCategoryId==="unassigned-category"||e.subcategoryId==="unassigned-subcategory"||e.classificationStatus==="unassigned"||e.classificationStatus==="suggested"}';
  const attentionAfter = `/* ${marker} */function bdNomenclatureNeedsAttention(e){return!e?.sectionId||!e?.taxonomyCategoryId||e.sectionId==="unassigned"||e.taxonomyCategoryId==="unassigned-category"||e.subcategoryId==="unassigned-subcategory"||e.classificationStatus==="unassigned"||e.classificationStatus==="suggested"}`;
  if (!source.includes(attentionBefore)) throw new Error("Nomenclature attention gate not found");
  source = source.replace(attentionBefore, attentionAfter);

  const quickCreateBefore = 'const z=Boolean(h.name.trim()&&h.sectionId&&h.taxonomyCategoryId&&h.subcategoryId&&h.unit);';
  if (!source.includes(quickCreateBefore)) throw new Error("Quick-create validity gate not found");
  source = source.replace(quickCreateBefore, 'const z=Boolean(h.name.trim()&&h.sectionId&&h.taxonomyCategoryId&&h.unit);');

  const bulkBefore = 'T=f.sectionId&&f.taxonomyCategoryId&&f.subcategoryId&&u.size>0;';
  if (!source.includes(bulkBefore)) throw new Error("Bulk classification validity gate not found");
  source = source.replace(bulkBefore, 'T=f.sectionId&&f.taxonomyCategoryId&&u.size>0;');

  const menuValidationBefore = 'if(!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!h.subcategoryId){j("Выберите раздел, категорию и подкатегорию");return}';
  if (!source.includes(menuValidationBefore)) throw new Error("Menu classification validation not found");
  source = source.replace(menuValidationBefore, 'if(!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId){j("Выберите раздел и категорию");return}');
  source = source.split('||!h.subcategoryId||!O').join('||!O');
}

fs.writeFileSync(bundlePath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
