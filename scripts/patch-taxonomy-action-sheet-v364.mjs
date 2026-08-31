import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const marker = "bd-taxonomy-action-sheet-v364";

let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker) && !source.includes("bd-nomenclature-uat-v369")) {
  const startAnchor = 'i.jsxs("details",{className:"bd-tax-node-menu-v362"';
  const endAnchor = ',R]},x.id)';
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start);
  if (start < 0 || end < 0 || source.indexOf(startAnchor, start + 1) >= 0) {
    throw new Error("Taxonomy action panel: expected one bounded legacy menu");
  }
  const before = source.slice(start, end);
  const after = `/* ${marker} */i.jsxs("details",{className:"bd-tax-node-menu-v362 bd-tax-node-menu-v364",children:[i.jsx("summary",{children:"Действия"}),i.jsxs("div",{className:"bd-tax-node-popover-v364",children:[i.jsxs("header",{children:[i.jsx("strong",{children:C==="section"?"Действия с разделом":C==="category"?"Действия с категорией":"Действия с подкатегорией"}),i.jsx("small",{children:x.name})]}),i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]}),C==="section"?i.jsx("p",{className:"bd-tax-root-note-v364",children:"Раздел — верхний уровень. У него нет родителя."}):J.length>0?i.jsxs("label",{className:"bd-tax-move-menu-v364",children:[i.jsx("span",{children:C==="category"?"Переместить категорию в раздел":"Переместить подкатегорию в категорию"}),i.jsx("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:J.map(K=>i.jsx("option",{value:K.id,children:K.name},K.id))}),i.jsx("small",{children:C==="category"?"Категория появится внутри выбранного раздела.":"Подкатегория появится внутри выбранной категории."})]}):null]})]})]})`;
  replaceExactly(before, after, "Taxonomy action panel");
}

const malformedV364 = '"Подкатегория появится внутри выбранной категории."})]}):null]})]}),R]},x.id)';
if (source.includes(marker) && source.includes(malformedV364)) {
  source = source.replace(
    malformedV364,
    '"Подкатегория появится внутри выбранной категории."})]}):null]})]})]}),R]},x.id)',
  );
}

fs.writeFileSync(bundlePath, source);

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(marker)) {
  css += `

/* ${marker} */
.bd-tax-node-main-v336 { position: relative; }
.bd-tax-node-main-v336 > span {
  min-width: 0;
  flex: 1 1 auto;
}
.bd-tax-node-main-v336 > span strong {
  overflow-wrap: anywhere;
  word-break: normal;
}
.bd-tax-node-menu-v364 { position: static; }
.bd-tax-node-popover-v364 {
  position: absolute;
  top: calc(100% + 6px);
  right: 10px;
  z-index: 60;
  display: grid;
  gap: 12px;
  width: min(340px, calc(100vw - 48px));
  max-width: calc(100% - 20px);
  padding: 14px;
  border: 1px solid #dfe2ec;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(28, 31, 54, .2);
}
.bd-tax-node-popover-v364 > header {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.bd-tax-node-popover-v364 > header strong {
  color: #20243d;
  font-size: 14px;
}
.bd-tax-node-popover-v364 > header small {
  overflow: hidden;
  color: #7a8193;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bd-tax-node-popover-v364 .bd-tax-node-actions-v336 {
  position: static !important;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.bd-tax-node-popover-v364 .bd-tax-node-actions-v336 button {
  min-width: 0;
  min-height: 42px;
}
.bd-tax-node-popover-v364 .bd-tax-node-actions-v336 .danger { grid-column: 1 / -1; }
.bd-tax-move-menu-v364 {
  display: grid;
  gap: 7px;
  min-width: 0;
  margin: 0;
}
.bd-tax-move-menu-v364 > span {
  color: #4f556b;
  font-size: 11px;
  font-weight: 850;
}
.bd-tax-move-menu-v364 select {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 44px;
}
.bd-tax-move-menu-v364 small,
.bd-tax-root-note-v364 {
  margin: 0;
  color: #737b8e;
  font-size: 11px;
  line-height: 1.4;
}
.bd-tax-root-note-v364 {
  padding: 10px 12px;
  border-radius: 11px;
  background: #f3f4f8;
}
@media (max-width: 620px) {
  .bd-tax-node-popover-v364 {
    position: fixed !important;
    top: auto !important;
    right: 12px;
    bottom: calc(92px + env(safe-area-inset-bottom));
    left: 12px;
    z-index: 1200;
    width: auto;
    max-width: none;
    max-height: min(68dvh, 520px);
    overflow: auto;
    padding: 16px;
    border-radius: 18px;
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
