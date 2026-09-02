import fs from "node:fs";
import path from "node:path";

const bundlePath = path.resolve("public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnceUnlessPresent(from, to, marker, label) {
  if (source.includes(marker)) return;
  const matches = source.split(from).length - 1;
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`);
  source = source.replace(from, to);
}

replaceOnceUnlessPresent(
  '[a,s]=S.useState("")',
  '[a,s]=S.useState(()=>window.bdReadNavigationQuery("q",""))',
  '[a,s]=S.useState(()=>window.bdReadNavigationQuery("q",""))',
  "nomenclature search reconstruction",
);
replaceOnceUnlessPresent(
  'window.bdSyncNavigationQuery({view:l==="structure"?null:l})},[l])',
  'window.bdSyncNavigationQuery({view:l==="structure"?null:l,q:a||null})},[l,a])',
  'window.bdSyncNavigationQuery({view:l==="structure"?null:l,q:a||null})},[l,a])',
  "nomenclature search persistence",
);
replaceOnceUnlessPresent(
  'title:"Номенклатура",back:"/more"',
  'title:"Номенклатура",back:window.bdReadNavigationQuery("returnTo","")==="warehouse"?"/warehouse":"/more"',
  'back:window.bdReadNavigationQuery("returnTo","")==="warehouse"?"/warehouse":"/more"',
  "nomenclature return context",
);
replaceOnceUnlessPresent(
  'onClick:()=>e("/nomenclature"),children:[i.jsx("span",{children:"Номенклатура"})',
  'onClick:()=>e("/nomenclature?returnTo=warehouse"),children:[i.jsx("span",{children:"Номенклатура"})',
  source.includes('onClick:()=>e("/nomenclature?view=taxonomy&returnTo=warehouse")')
    ? 'onClick:()=>e("/nomenclature?view=taxonomy&returnTo=warehouse")'
    : 'onClick:()=>e("/nomenclature?returnTo=warehouse"),children:[i.jsx("span",{children:"Номенклатура"})',
  "warehouse nomenclature return context",
);
replaceOnceUnlessPresent(
  'onClick:()=>e("/nomenclature?view=attention"),children:',
  'onClick:()=>e("/nomenclature?view=attention&returnTo=warehouse"),children:',
  'onClick:()=>e("/nomenclature?view=attention&returnTo=warehouse"),children:',
  "warehouse attention return context",
);
replaceOnceUnlessPresent(
  'l&&(setPhase("count"),scanDraft?.unresolved?.length&&setError(',
  'l&&(l.inventory?.id&&window.bdSyncNavigationQuery({inventory:l.inventory.id,tab:"counts",add:null}),setPhase("count"),scanDraft?.unresolved?.length&&setError(',
  'l.inventory?.id&&window.bdSyncNavigationQuery({inventory:l.inventory.id,tab:"counts",add:null})',
  "durable inventory create navigation",
);

const accessibleClose = '"aria-label":"Закрыть редактирование заведения"';
if (!source.includes(accessibleClose)) {
  const from = 'children:"Данные заведения"}),i.jsx("button",{type:"button",onClick:n,className:';
  const to = 'children:"Данные заведения"}),i.jsx("button",{type:"button",onClick:n,"aria-label":"Закрыть редактирование заведения",className:';
  const matches = source.split(from).length - 1;
  if (matches !== 1) throw new Error(`venue editor close control: expected one match, found ${matches}`);
  source = source.replace(from, to);
}

fs.writeFileSync(bundlePath, source);
