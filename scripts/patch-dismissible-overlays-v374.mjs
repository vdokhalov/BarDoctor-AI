import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const marker = "bd-dismissible-overlays-v374";

let source = fs.readFileSync(bundlePath, "utf8");

if (!source.includes(marker)) {
  const managerAnchor = "function bdTaxonomyManagerV336";
  const managerStart = source.indexOf(managerAnchor);
  if (managerStart < 0) throw new Error("Taxonomy manager not found");

  source = source.slice(0, managerStart) + `/* ${marker} */
function bdCloseTaxonomyActionV374(e){e?.preventDefault?.(),e?.stopPropagation?.();const t=e?.currentTarget?.closest?.("details.bd-tax-node-menu-v364");t&&(t.dataset.bdTaxonomyHistoryV374==="1"?history.back():t.removeAttribute("open"))}
function bdTaxonomyActionToggleV374(e){const t=e.currentTarget;if(t.open){document.querySelectorAll("details.bd-tax-node-menu-v364[open]").forEach(n=>{n!==t&&(n.dataset.bdTaxonomyHistoryV374="",n.removeAttribute("open"))});if(t.dataset.bdTaxonomyHistoryV374!=="1"){t.dataset.bdTaxonomyHistoryV374="1";const n={...history.state,bdTaxonomyActionV374:!0};history.pushState(n,"",location.href)}}else if(t.dataset.bdTaxonomyHistoryV374==="1"){t.dataset.bdTaxonomyHistoryV374="";history.back()}}
window.addEventListener("popstate",()=>{document.querySelectorAll("details.bd-tax-node-menu-v364[open]").forEach(e=>{e.dataset.bdTaxonomyHistoryV374="",e.removeAttribute("open")})});
` + source.slice(managerStart);

  const startAnchor = 'i.jsxs("details",{className:"bd-tax-node-menu-v362 bd-tax-node-menu-v364"';
  const endAnchor = ',W]},x.id)';
  const start = source.indexOf(startAnchor, managerStart);
  const end = source.indexOf(endAnchor, start);
  if (start < 0 || end < 0 || source.indexOf(startAnchor, start + 1) >= 0) {
    throw new Error("Expected one taxonomy action menu");
  }

  const replacement = `i.jsxs("details",{className:"bd-tax-node-menu-v362 bd-tax-node-menu-v364",onToggle:bdTaxonomyActionToggleV374,children:[i.jsx("summary",{"aria-label":"Действия: "+x.name,children:"Действия"}),i.jsx("button",{type:"button",className:"bd-tax-node-backdrop-v374","aria-label":"Закрыть меню действий",onClick:bdCloseTaxonomyActionV374}),i.jsxs("div",{className:"bd-tax-node-popover-v364 bd-tax-node-popover-v374",role:"dialog","aria-modal":!0,"aria-label":"Действия с "+q,onKeyDown:Q=>{Q.key==="Escape"&&bdCloseTaxonomyActionV374(Q)},children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("strong",{children:"Действия с "+q}),i.jsx("small",{children:x.name})]}),i.jsx("button",{type:"button",className:"bd-tax-node-close-v374",onClick:bdCloseTaxonomyActionV374,"aria-label":"Закрыть меню действий",children:"×"})]}),i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]}),C==="section"?i.jsxs("label",{className:"bd-tax-move-menu-v364 bd-tax-section-parent-v365",children:[i.jsx("span",{children:"Родитель раздела"}),i.jsxs("select",{"aria-label":"Родитель раздела: "+x.name,value:x.parentId||"",onChange:Q=>j({action:"move",level:C,id:x.id,parentId:Q.target.value}),children:[i.jsx("option",{value:"",children:"Верхний уровень"}),...K.map(Q=>i.jsx("option",{value:Q.id,children:bdSectionPathLabelV365(t?.sections,Q)},Q.id))]}),i.jsx("small",{children:"Выберите родительский раздел или оставьте верхний уровень."})]}):K.length?i.jsxs("label",{className:"bd-tax-move-menu-v364",children:[i.jsx("span",{children:C==="category"?"Родитель категории":"Родитель подкатегории"}),i.jsx("select",{"aria-label":(C==="category"?"Родитель категории: ":"Родитель подкатегории: ")+x.name,value:x.parentId||"",onChange:Q=>j({action:"move",level:C,id:x.id,parentId:Q.target.value}),children:K.map(Q=>i.jsx("option",{value:Q.id,children:C==="category"?bdSectionPathLabelV365(t?.sections,Q):Q.name},Q.id))}),i.jsx("small",{children:C==="category"?"Категория появится внутри выбранного раздела.":"Подкатегория появится внутри выбранной категории."})]}):null,i.jsx("button",{type:"button",className:"bd-tax-node-done-v374",onClick:bdCloseTaxonomyActionV374,children:"Закрыть"})]})]})]})`;

  source = source.slice(0, start) + replacement + source.slice(end);
  fs.writeFileSync(bundlePath, source);
}

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(marker)) {
  css += `

/* ${marker} */
.bd-tax-node-backdrop-v374 {
  position: fixed;
  inset: 0;
  z-index: 1199;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: rgba(22, 25, 45, .34);
  cursor: default;
}
.bd-tax-node-popover-v374 { z-index: 1200; }
.bd-tax-node-popover-v374 > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.bd-tax-node-popover-v374 > header > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.bd-tax-node-close-v374 {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  margin: -7px -7px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f3f4f8;
  color: #20243d;
  font-size: 28px;
  font-weight: 500;
  line-height: 1;
}
.bd-tax-node-done-v374 {
  min-height: 44px;
  border: 1px solid #d8daf0;
  border-radius: 12px;
  background: #fff;
  color: #4f49ce;
  font: inherit;
  font-weight: 850;
}
@media (max-width: 620px) {
  .bd-tax-node-popover-v374 {
    bottom: calc(78px + env(safe-area-inset-bottom));
    max-height: min(72dvh, 610px);
    overscroll-behavior: contain;
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
