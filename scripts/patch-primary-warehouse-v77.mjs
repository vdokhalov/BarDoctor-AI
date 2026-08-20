import fs from "node:fs";

const path = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(label, from, to) {
  const index = source.indexOf(from);
  if (index < 0) throw new Error(`Не найден фрагмент: ${label}`);
  if (source.indexOf(from, index + from.length) >= 0) {
    throw new Error(`Фрагмент найден больше одного раза: ${label}`);
  }
  source = source.slice(0, index) + to + source.slice(index + from.length);
}

replaceOnce(
  "отдельный пункт склада",
  '    {key:"add",name:"Добавить",icon:Vt,action:!0},\n    {key:"team",name:"Команда",href:"/employees",icon:zr},',
  '    {key:"add",name:"Добавить",icon:Vt,action:!0},\n    {key:"warehouse",name:"Склад",href:"/warehouse",icon:PA},\n    {key:"team",name:"Команда",href:"/employees",icon:zr},',
);

replaceOnce(
  "активный раздел склада",
  '      m.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/")):\n      m.key==="team"?',
  '      m.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports"].some(g=>e===g||e.startsWith(g+"/")):\n      m.key==="warehouse"?e==="/warehouse"||e.startsWith("/warehouse/"):\n      m.key==="team"?',
);

replaceOnce(
  "маркер пункта действия",
  'return i.jsx("button",{type:"button",onClick:()=>a(!0),style:{...p,color:"#5B55F5"},children:c},m.key);',
  'return i.jsx("button",{type:"button","data-bd-nav-key":m.key,onClick:()=>a(!0),style:{...p,color:"#5B55F5"},children:c},m.key);',
);

replaceOnce(
  "маркер ссылки навигации",
  'return i.jsxs(Zl,{href:m.href,style:p,children:[',
  'return i.jsxs(Zl,{href:m.href,"data-bd-nav-key":m.key,"aria-current":h?"page":void 0,style:p,children:[',
);

replaceOnce(
  "семь мобильных пунктов",
  'gridTemplateColumns:"repeat(6,minmax(0,1fr))"',
  'gridTemplateColumns:"repeat(7,minmax(0,1fr))"',
);

replaceOnce(
  "версия релиз-кандидата",
  'const bdReleaseCandidateVersion="rc-v76"',
  'const bdReleaseCandidateVersion="rc-v77"',
);

fs.writeFileSync(path, source);
console.log("Primary warehouse navigation v77 applied");
