import fs from "node:fs";

const file = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(file, "utf8");

function replaceOnce(label, before, after) {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(`Ambiguous ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "product save request headers",
  'headers:{"Content-Type":"application/json"},body:JSON.stringify({action:g?"update":"create"',
  'headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:g?"update":"create"',
);

replaceOnce(
  "product archive handler",
  'finally{f(!1)}}\nreturn i.jsxs(i.Fragment,',
  'finally{f(!1)}}\nasync function O(){if(d||!g||Math.abs(bdWarehouseNumber(e.current))>=.0001||_>0)return;if(!window.confirm("Удалить ошибочную позицию из активной номенклатуры? История движений сохранится."))return;f(!0),h("");try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"archive",productKey:g})}),U=await B.json();if(!B.ok||!U?.ok)throw new Error(U?.error||"Не удалось удалить позицию");a(U),s({variant:"success",title:"Позиция удалена",description:"Ошибочная нулевая карточка скрыта, история движений сохранена."}),r()}catch(B){h(B instanceof Error?B.message:"Не удалось удалить позицию")}finally{f(!1)}}\nreturn i.jsxs(i.Fragment,',
);

replaceOnce(
  "product archive button",
  'n&&i.jsx("button",{type:"button",className:"primary",onClick:()=>u(!0),children:"Редактировать"})]})]})]})]})}',
  'n&&i.jsx("button",{type:"button",className:"primary",onClick:()=>u(!0),children:"Редактировать"}),n&&g&&Math.abs(bdWarehouseNumber(e.current))<.0001&&_===0&&i.jsx("button",{type:"button",className:"danger",disabled:d,onClick:O,children:d?"Удаляю…":"Удалить позицию"})]})]})]})]})}',
);

replaceOnce(
  "archived warehouse filter",
  'classificationStatus:u.classificationStatus}:l})}',
  'classificationStatus:u.classificationStatus}:l}).filter(l=>l.archived!==!0&&l.active!==!1)}',
);

fs.writeFileSync(file, source);
