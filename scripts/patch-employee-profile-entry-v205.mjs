import { readFile, writeFile } from "node:fs/promises";

const path = "public/assets/index-BQGspy0I.js";
let source = await readFile(path, "utf8");

const replacements = [
  [
    'className:"bd-employee-edit-button",children:"Изменить"',
    'className:"bd-employee-edit-button",children:"Редактировать профиль"',
  ],
  [
    'N&&i.jsx("button",{type:"button",onClick:()=>v(!0),className:"bd-employee-secondary-edit",children:"Редактировать личные данные"})',
    'N&&i.jsxs("button",{type:"button",onClick:()=>v(!0),className:"bd-employee-profile-edit-cta",children:[i.jsx("strong",{children:b.photoId?"Редактировать профиль":"Добавить фото и анкетные данные"}),i.jsx("span",{children:"Фото, контакты, даты и карьерная история"}),i.jsx("b",{"aria-hidden":!0,children:"→"})]})',
  ],
  [
    'children:e==="add"?"Новый сотрудник":"Редактировать"',
    'children:e==="add"?"Новый сотрудник":"Фото и данные сотрудника"',
  ],
];

for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Missing source marker: ${before}`);
  source = source.replace(before, after);
}

await writeFile(path, source);
