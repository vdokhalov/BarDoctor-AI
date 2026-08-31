import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-alphabetical-taxonomy-v363";

let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    'function bdTaxActiveV336(e){return bdTaxArrayV336(e).filter(t=>t?.active!==!1).sort((t,n)=>(Number(t.order)||0)-(Number(n.order)||0)||String(t.name).localeCompare(String(n.name),"ru"))}',
    `/* ${marker} */function bdAlphabeticalV363(e){return bdTaxArrayV336(e).slice().sort((t,n)=>String(t?.name||"").localeCompare(String(n?.name||""),"ru",{sensitivity:"base",numeric:!0}))}\nfunction bdTaxOperationalV363(e){return bdTaxArrayV336(e).filter(t=>t?.active!==!1).sort((t,n)=>(Number(t.order)||0)-(Number(n.order)||0)||String(t?.name||"").localeCompare(String(n?.name||""),"ru"))}\nfunction bdTaxActiveV336(e){return bdAlphabeticalV363(bdTaxArrayV336(e).filter(t=>t?.active!==!1))}`,
    "Shared alphabetical taxonomy comparator",
  );

  replaceExactly(
    'function bdNomenclatureTree(e){const t=bdWarehouseRecord(e),n=bdWarehouseRecord(t.nomenclatureStructure),r=bdNomenclatureDefaultStructure();return{version:"v209",sections:Array.isArray(n.sections)&&n.sections.length?n.sections:r.sections,categories:Array.isArray(n.categories)&&n.categories.length?n.categories:r.categories,subcategories:Array.isArray(n.subcategories)&&n.subcategories.length?n.subcategories:r.subcategories,locations:Array.isArray(n.locations)&&n.locations.length?n.locations:r.locations}}',
    'function bdNomenclatureTree(e){const t=bdWarehouseRecord(e),n=bdWarehouseRecord(t.nomenclatureStructure),r=bdNomenclatureDefaultStructure();return{version:"v209",sections:bdAlphabeticalV363(Array.isArray(n.sections)&&n.sections.length?n.sections:r.sections),categories:bdAlphabeticalV363(Array.isArray(n.categories)&&n.categories.length?n.categories:r.categories),subcategories:bdAlphabeticalV363(Array.isArray(n.subcategories)&&n.subcategories.length?n.subcategories:r.subcategories),locations:bdAlphabeticalV363(Array.isArray(n.locations)&&n.locations.length?n.locations:r.locations)}}',
    "Alphabetical nomenclature tree",
  );

  replaceExactly(
    'const T=bdTaxArrayV336(t.sections),A=bdTaxArrayV336(t.categories),k=bdTaxArrayV336(t.subcategories);return i.jsxs("section",{className:"bd-tax-manager-v336"',
    'const T=bdAlphabeticalV363(t.sections),A=bdAlphabeticalV363(t.categories),k=bdAlphabeticalV363(t.subcategories);return i.jsxs("section",{className:"bd-tax-manager-v336","data-bd-taxonomy-order":"alphabetical-v363"',
    "Alphabetical taxonomy manager",
  );

  replaceExactly(
    'children:"Откройте раздел, чтобы увидеть категории. Подкатегории добавляйте только когда они действительно нужны."',
    'children:"Все разделы, категории и подкатегории показаны по алфавиту."',
    "Alphabetical manager guidance",
  );

  replaceExactly(
    'children:[i.jsx("button",{type:"button",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"up"}),children:"Выше"}),i.jsx("button",{type:"button",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"down"}),children:"Ниже"}),i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"})',
    'children:[i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"})',
    "Remove manual reorder actions",
  );

  replaceExactly(
    'const E=String(s||"").trim().toLocaleLowerCase("ru"),_=r.filter(T=>!E||String(T.name).toLocaleLowerCase("ru").includes(E)).slice(0,120)',
    'const E=String(s||"").trim().toLocaleLowerCase("ru"),_=bdAlphabeticalV363(r.filter(T=>!E||String(T.name).toLocaleLowerCase("ru").includes(E))).slice(0,120)',
    "Alphabetical bulk classification items",
  );

  replaceExactly(
    'bdTaxArrayV336(t[f.mutation.level==="section"?"sections":f.mutation.level==="category"?"categories":"subcategories"]).filter(C=>C.id!==f.mutation.id&&C.active).map(C=>i.jsx("option",{value:C.id,children:C.name},C.id))',
    'bdAlphabeticalV363(bdTaxArrayV336(t[f.mutation.level==="section"?"sections":f.mutation.level==="category"?"categories":"subcategories"]).filter(C=>C.id!==f.mutation.id&&C.active)).map(C=>i.jsx("option",{value:C.id,children:C.name},C.id))',
    "Alphabetical conflict destinations",
  );

  replaceExactly(
    'bdMenuVisibleProductsV350=E.filter(P=>!bdMenuProductQueryV350.trim()||bdProcNorm(P.name).includes(bdProcNorm(bdMenuProductQueryV350))).slice(0,50)',
    'bdMenuVisibleProductsV350=bdAlphabeticalV363(E.filter(P=>!bdMenuProductQueryV350.trim()||bdProcNorm(P.name).includes(bdProcNorm(bdMenuProductQueryV350)))).slice(0,50)',
    "Alphabetical menu product picker",
  );
}

const defaultsMarker = "bd-alphabetical-defaults-v363";
if (!source.includes(defaultsMarker)) {
  if (!source.includes("function bdTaxOperationalV363")) {
    source = source.replace(
      "function bdTaxActiveV336(e)",
      `/* ${defaultsMarker} */function bdTaxOperationalV363(e){return bdTaxArrayV336(e).filter(t=>t?.active!==!1).sort((t,n)=>(Number(t.order)||0)-(Number(n.order)||0)||String(t?.name||\"\").localeCompare(String(n?.name||\"\"),\"ru\"))}\nfunction bdTaxActiveV336(e)`,
    );
  }
  source = source.replaceAll("bdTaxActiveV336(O.taxonomy?.sections)[0]", "bdTaxOperationalV363(O.taxonomy?.sections)[0]");
  source = source.replaceAll("bdTaxActiveV336(O.taxonomy?.categories).find", "bdTaxOperationalV363(O.taxonomy?.categories).find");
  source = source.replaceAll("bdTaxActiveV336(O.taxonomy?.subcategories).find", "bdTaxOperationalV363(O.taxonomy?.subcategories).find");
  source = source.replaceAll("bdTaxActiveV336(T.taxonomy?.sections)[0]", "bdTaxOperationalV363(T.taxonomy?.sections)[0]");
  source = source.replaceAll("bdTaxActiveV336(T.taxonomy?.categories).find", "bdTaxOperationalV363(T.taxonomy?.categories).find");
  source = source.replaceAll("bdTaxActiveV336(T.taxonomy?.subcategories).find", "bdTaxOperationalV363(T.taxonomy?.subcategories).find");
  source = source.replaceAll("bdTaxActiveV336(bdMenuTaxInitial.sections)[0]", "bdTaxOperationalV363(bdMenuTaxInitial.sections)[0]");
  source = source.replaceAll("bdTaxActiveV336(bdMenuTaxInitial.categories).find", "bdTaxOperationalV363(bdMenuTaxInitial.categories).find");
  source = source.replaceAll("bdTaxActiveV336(bdMenuTaxInitial.subcategories).find", "bdTaxOperationalV363(bdMenuTaxInitial.subcategories).find");
  source = source.replaceAll("bdTaxActiveV336(c.taxonomy?.sections)[0]", "bdTaxOperationalV363(c.taxonomy?.sections)[0]");
  source = source.replaceAll("bdTaxActiveV336(c.taxonomy?.categories).find", "bdTaxOperationalV363(c.taxonomy?.categories).find");
  source = source.replaceAll("bdTaxActiveV336(c.taxonomy?.subcategories).find", "bdTaxOperationalV363(c.taxonomy?.subcategories).find");
  if (!source.includes(defaultsMarker)) {
    source = source.replace("function bdTaxOperationalV363(e)", `/* ${defaultsMarker} */function bdTaxOperationalV363(e)`);
  }
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
