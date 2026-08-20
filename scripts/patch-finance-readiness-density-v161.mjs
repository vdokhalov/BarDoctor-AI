import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes("прошедших смен · будущие не учитываются.")) {
  console.log("Finance readiness density v161 is already applied.");
  process.exit(0);
}

const start = source.indexOf("function bdFinanceReadinessV160(");
const end = source.indexOf("function bdFinanceQuickActionsV160(", start);
if (start === -1 || end === -1) {
  throw new Error("Finance readiness component was not found for density v161.");
}

const readiness = String.raw`function bdFinanceReadinessV160({report:e,coverage:t,missingDates:n,onMissing:r,onInventory:a,onContinue:s,onReport:l}){if(!e)return null;const u=t?.unexplainedGaps??Math.max(0,e.expectedShifts-e.accountedShifts),d=[];u>0&&d.push({key:"shifts",label:u+" "+bdFinancePluralV160(u,"смена без данных","смены без данных","смен без данных"),action:r});e.openingInventory===null&&e.closingInventory===null?d.push({key:"inventory",label:"Не внесены начальные и конечные остатки",action:a}):e.openingInventory===null?d.push({key:"opening",label:"Не внесены начальные остатки",action:a}):e.closingInventory===null&&d.push({key:"closing",label:"Не внесены конечные остатки",action:a});e.inventoryMismatch&&d.push({key:"mismatch",label:"Есть расхождение остатков",action:a});const f=e.coveragePercent??t?.coveragePercent??0,m=e.accountedShifts??(t?t.revenueEntered+t.explainedClosures:0),h=e.expectedShifts??t?.scheduledCompletedShifts??0;return i.jsxs("section",{"data-bd-finance-readiness":"v160",className:"bd-finance-readiness-v160",children:[i.jsxs("header",{children:[i.jsx("p",{children:"Готовность данных"}),i.jsx("strong",{children:f+"%"})]}),i.jsx("div",{className:"bd-finance-readiness-progress","aria-label":"Готовность данных "+f+" процентов",children:i.jsx("i",{style:{width:Math.max(0,Math.min(100,f))+"%"}})}),i.jsxs("p",{className:"bd-finance-readiness-caption",children:[m," из ",h," прошедших смен · будущие не учитываются."]}),d.length>0?i.jsx("div",{className:"bd-finance-readiness-gaps",children:d.map(g=>i.jsxs("button",{type:"button",onClick:g.action,disabled:!g.action,children:[i.jsx(Fn,{size:16,"aria-hidden":!0}),i.jsx("span",{children:g.label}),i.jsx(Br,{size:15,"aria-hidden":!0})]},g.key))}):i.jsxs("div",{className:"bd-finance-readiness-ok",children:[i.jsx(Pn,{size:17,"aria-hidden":!0}),i.jsx("span",{children:e.isClosed?"Все обязательные данные подтверждены":"Данные прошедших смен учтены"})]}),e.isClosed?i.jsx("button",{type:"button",className:"bd-finance-readiness-cta secondary",onClick:l,children:"Открыть месячный отчёт"}):i.jsx("button",{type:"button",className:"bd-finance-readiness-cta",onClick:s,children:"Продолжить закрытие"})]})}`;

source = source.slice(0, start) + readiness + "\n" + source.slice(end);
await writeFile(bundlePath, source);
console.log("Finance readiness density v161 applied.");
