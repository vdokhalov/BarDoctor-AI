import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-purchase-category-options-v367";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  const anchor = "function bdNomenclatureInitialFormV237";
  if (!source.includes(anchor)) throw new Error("Purchase category helper anchor not found");
  source = source.replace(anchor, `/* ${marker} */
const bdProcLegacyStockCategoryKeysV367=new Set(["products","alcohol","food","consumables","hookah","household"]);
function bdProcUniqueCategoryOptionsV367(current){
  const value=String(current||"auto"),stockValue=bdProcLegacyStockCategoryKeysV367.has(value)?value:"products";
  return[[stockValue,"Складские запасы"],["equipment","Оборудование и инвентарь"],["repairs","Ремонт и обслуживание"],["marketing","Маркетинг и реклама"],["other","Прочее"]];
}
${anchor}`);

}

const legacyEditableOptions = '...Object.entries(bdProcCategoryLabels).map(([key,label])=>i.jsx("option",{value:key,children:label},key))';
const uniqueEditableOptions = '...bdProcUniqueCategoryOptionsV367(e.expenseCategory).map(([key,label])=>i.jsx("option",{value:key,children:label},key))';
if (source.includes(legacyEditableOptions)) {
  replaceExactly(legacyEditableOptions, uniqueEditableOptions, "Editable purchase category options");
} else if (!source.includes(uniqueEditableOptions)) {
  throw new Error("Editable purchase category options: neither legacy nor corrected selector found");
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
