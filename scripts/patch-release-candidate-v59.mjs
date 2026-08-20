import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v59"')) {
  console.log("release candidate v59 already applied");
  process.exit(0);
}
if (!source.includes('bdReleaseCandidateVersion="rc-v58"')) {
  throw new Error("release candidate v58 marker was not found");
}

function replaceRequired(from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  source = source.split(from).join(to);
}

replaceRequired(
  'bdReleaseCandidateVersion="rc-v58"',
  'bdReleaseCandidateVersion="rc-v59"',
  1,
  "release marker",
);

replaceRequired(
  'async function S0(e,t,n){return!!(await(await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n})})).json()).ok}',
  'async function S0(e,t,n,r){return!!(await(await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n,baseData:r})})).json()).ok}',
  1,
  "store base snapshot request",
);

replaceRequired(
  'return await S0(e,t,r),r',
  'return await S0(e,t,r,l),r',
  1,
  "non-array remote store write",
);

replaceRequired(
  'if(!await S0(e,t,u))throw new Error(`PUT /api/store/${e} rejected`)',
  'if(!await S0(e,t,u,l))throw new Error(`PUT /api/store/${e} rejected`)',
  1,
  "merged array store write",
);

replaceRequired(
  'if(!await S0(e,t,r))throw new Error(`PUT /api/store/${e} rejected`)',
  'if(!await S0(e,t,r,n))throw new Error(`PUT /api/store/${e} rejected`)',
  1,
  "object store write",
);

replaceRequired(
  '}),je=Z.length?(B+U)/Z.length:0',
  '}),bdInventoryMismatch=V!==null&&(V<0||ye.some(q=>q.cost!==null&&q.cost<0)),je=Z.length?(B+U)/Z.length:0',
  1,
  "inventory reconciliation guard",
);

replaceRequired(
  'st=V!==null?V*At:null',
  'st=!bdInventoryMismatch&&V!==null?V*At:null',
  1,
  "shift estimate inventory guard",
);

replaceRequired(
  'return{meta:u,status:ce?"closed":"preliminary",isClosed:ce,periodPast:ae',
  'return{meta:u,status:ce&&!bdInventoryMismatch?"closed":"preliminary",isClosed:ce&&!bdInventoryMismatch,periodPast:ae',
  1,
  "invalid inventory month status",
);

replaceRequired(
  'costOfGoods:V,operatingResult:F,resultBeforeCost:tt',
  'costOfGoods:bdInventoryMismatch?null:V,inventoryMismatch:bdInventoryMismatch,rawCostOfGoods:V,operatingResult:bdInventoryMismatch?null:F,resultBeforeCost:tt',
  1,
  "invalid inventory report values",
);

replaceRequired(
  'f=e.openingInventory===null&&e.closingInventory===null?"Нужны остатки на начало и конец месяца":e.openingInventory===null?"Нужны остатки на начало месяца":"Нужны остатки на конец месяца"',
  'f=e.inventoryMismatch?"Остатки не сходятся: конечные остатки и списания больше начальных остатков вместе с закупками":e.openingInventory===null&&e.closingInventory===null?"Нужны остатки на начало и конец месяца":e.openingInventory===null?"Нужны остатки на начало месяца":"Нужны остатки на конец месяца"',
  1,
  "finance result mismatch explanation",
);

replaceRequired(
  'description:l===null?f+". После этого приложение рассчитает себестоимость проданного товара и итоговый результат.":"Учтена себестоимость проданного товара"',
  'description:l===null?e.inventoryMismatch?f+". Проверьте суммы по разделам — до исправления итог не рассчитывается.":f+". После этого приложение рассчитает себестоимость проданного товара и итоговый результат.":"Учтена себестоимость проданного товара"',
  1,
  "finance result mismatch action",
);

replaceRequired(
  'if(e===6){return i.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:14},children:[i.jsx("p",{style:{fontSize:13,color:"#697089",lineHeight:1.55},children:"Три показателя — это последовательные стадии одного расчёта. Финальная прибыль появляется только после начальных и конечных остатков."})',
  'if(e===6){return i.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:14},children:[t.inventoryMismatch&&i.jsx(bdMonthClosingSection,{title:"Остатки не сходятся",subtitle:"Конечные остатки и списания больше начальных остатков вместе с закупками. Проверьте суммы по разделам — до исправления финальная прибыль не рассчитывается."}),i.jsx("p",{style:{fontSize:13,color:"#697089",lineHeight:1.55},children:"Три показателя — это последовательные стадии одного расчёта. Финальная прибыль появляется только после начальных и конечных остатков."})',
  1,
  "month close mismatch action",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v59");
