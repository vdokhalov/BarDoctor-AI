import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-nomenclature-catalog-route-v366";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    'i.jsx("button",{type:"button",onClick:()=>e("/assortment?tab=menu"),children:"Меню"}),i.jsx("button",{type:"button",onClick:()=>e("/assortment?tab=recipes"),children:"Техкарты"})',
    `/* ${marker} */i.jsx("button",{type:"button",onClick:()=>e("/catalog?tab=menu&returnTo=nomenclature"),children:"Меню"}),i.jsx("button",{type:"button",onClick:()=>e("/catalog?tab=recipes&returnTo=nomenclature"),children:"Техкарты"})`,
    "Nomenclature catalog links",
  );

  replaceExactly(
    'className:"bd-assortment-back-v170",onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад в Ещё"',
    'className:"bd-assortment-back-v170",onClick:()=>window.bdNavigateBack(window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"/nomenclature":"/more"),"aria-label":window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"Назад в номенклатуру":"Назад в Ещё"',
    "Catalog contextual back action",
  );

}

source = source.replace(
  'i.jsx(Xe,{path:"/catalog",component:()=>i.jsx(pt,{component:bdAssortmentCommandPageV170})}),i.jsx(Xe,{path:"/assortment",component:()=>i.jsx(pt,{component:bdAssortmentCommandPageV170})}),',
  'i.jsx(Xe,{path:"/catalog",component:()=>i.jsx(pt,{component:bdAssortmentCommandPageV170})}),',
);

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
