import fs from "node:fs";
import path from "node:path";

const bundlePath = path.resolve("public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(from, to);
}

replaceOnce(
  'function bdAccountingCurrencyOptionsV243(){return bdAccountingCurrenciesV243.map(e=>({value:e,label:bdAccountingCurrencyLabelsV243[e]||e}))}',
  'function bdAccountingCurrencyOptionsV243(){return bdAccountingCurrenciesV243.map(e=>({value:e,label:bdAccountingCurrencyLabelsV243[e]||e}))}\nfunction bdAccountingCurrencySuffixV243(e=""){const t=bdCurrentAccountingCurrencyV243();return t?t+e:"—"}',
  "accounting currency suffix",
);

for (const [from, to, label] of [
  ['function GM(e){return`${Math.round(e).toLocaleString("ru-RU")} ₽`}', 'function GM(e){return bdAccountingMoneyV243(Math.round(e))}', "home and reports formatter"],
  ['function Ge(e){return`${Math.round(e).toLocaleString("ru-RU")} ₽`}', 'function Ge(e){return bdAccountingMoneyV243(Math.round(e))}', "payroll formatter"],
  ['function im(e){return e?`${e.toLocaleString("ru-RU")} ₽`:"—"}', 'function im(e){return e?bdAccountingMoneyV243(e):"—"}', "equipment detail formatter"],
  ['function qI(e){return`${e.toLocaleString("ru-RU")} ₽`}', 'function qI(e){return bdAccountingMoneyV243(e)}', "equipment analytics formatter"],
]) replaceOnce(from, to, label);

replaceOnce(
  'function Toe(e){switch(e.type){case"monthly_salary":return`${_l(e.amount)} ₽/мес`;case"shift_rate":return`${_l(e.amount)} ₽/смена`;case"hourly_rate":return`${_l(e.amount)} ₽/час`;case"personal_sales_percent":return`${e.percent}% от личных продаж`;case"department_sales_percent":return`${e.percent}% от продаж${e.department?` (${e.department})`:" отдела"}`;case"venue_sales_percent":return`${e.percent}% от продаж заведения`;case"per_unit":return`${_l(e.amount)} ₽ за ${e.unitLabel||"единицу"}`;case"weekday_rates":return"Ставки по дням недели";case"manual_bonus":return`Бонус${e.label?` «${e.label}»`:""}: ${_l(e.amount)} ₽`;case"manual_adjustment":return`Корректировка${e.label?` «${e.label}»`:""}: ${_l(e.amount)} ₽`}}',
  'function Toe(e){switch(e.type){case"monthly_salary":return`${bdAccountingMoneyV243(e.amount)}/мес`;case"shift_rate":return`${bdAccountingMoneyV243(e.amount)}/смена`;case"hourly_rate":return`${bdAccountingMoneyV243(e.amount)}/час`;case"personal_sales_percent":return`${e.percent}% от личных продаж`;case"department_sales_percent":return`${e.percent}% от продаж${e.department?` (${e.department})`:" отдела"}`;case"venue_sales_percent":return`${e.percent}% от продаж заведения`;case"per_unit":return`${bdAccountingMoneyV243(e.amount)} за ${e.unitLabel||"единицу"}`;case"weekday_rates":return"Ставки по дням недели";case"manual_bonus":return`Бонус${e.label?` «${e.label}»`:""}: ${bdAccountingMoneyV243(e.amount)}`;case"manual_adjustment":return`Корректировка${e.label?` «${e.label}»`:""}: ${bdAccountingMoneyV243(e.amount)}`}}',
  "payroll rule summary",
);

replaceOnce('${Ge(e.amount)} ₽/час × ${y??0} ч', '${Ge(e.amount)}/час × ${y??0} ч', "hourly payroll formula");

replaceOnce(
  'function aCe({block:e,onPatch:t}){switch(e.type){case"monthly_salary":case"shift_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽",ariaLabel:e.type==="monthly_salary"?"Оклад в месяц, ₽":"Ставка за смену, ₽"});case"hourly_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/час",ariaLabel:"Ставка за час, ₽"});case"personal_sales_percent":case"venue_sales_percent":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:e.type==="personal_sales_percent"?"Процент от личных продаж":"Процент от продаж заведения"});case"department_sales_percent":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:"Процент от продаж отдела"}),i.jsx(jn,{placeholder:"Отдел (например, Бар)",value:e.department??"",onChange:n=>t({department:n})})]});case"per_unit":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/шт",ariaLabel:"Оплата за единицу, ₽"}),i.jsx(jn,{placeholder:"Название единицы (например, кальян)",value:e.unitLabel,onChange:n=>t({unitLabel:n})})]});case"weekday_rates":return i.jsx(iCe,{rates:e.rates,onChange:n=>t({rates:n})});case"manual_bonus":case"manual_adjustment":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽",ariaLabel:e.type==="manual_bonus"?"Ручной бонус, ₽":"Ручная корректировка, ₽"}),i.jsx(jn,{placeholder:"Комментарий (необязательно)",value:e.label??"",onChange:n=>t({label:n})})]});default:return null}}',
  'function aCe({block:e,onPatch:t}){const n=bdCurrentAccountingCurrencyV243()||"валюта учёта";switch(e.type){case"monthly_salary":case"shift_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:r=>t({amount:kr(r)}),suffix:bdAccountingCurrencySuffixV243(),ariaLabel:(e.type==="monthly_salary"?"Оклад в месяц, ":"Ставка за смену, ")+n});case"hourly_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:r=>t({amount:kr(r)}),suffix:bdAccountingCurrencySuffixV243("/час"),ariaLabel:"Ставка за час, "+n});case"personal_sales_percent":case"venue_sales_percent":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:e.type==="personal_sales_percent"?"Процент от личных продаж":"Процент от продаж заведения"});case"department_sales_percent":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:"Процент от продаж отдела"}),i.jsx(jn,{placeholder:"Отдел (например, Бар)",value:e.department??"",onChange:n=>t({department:n})})]});case"per_unit":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:bdAccountingCurrencySuffixV243("/шт"),ariaLabel:"Оплата за единицу, "+n}),i.jsx(jn,{placeholder:"Название единицы (например, кальян)",value:e.unitLabel,onChange:n=>t({unitLabel:n})})]});case"weekday_rates":return i.jsx(iCe,{rates:e.rates,onChange:n=>t({rates:n})});case"manual_bonus":case"manual_adjustment":return i.jsxs("div",{className:"flex flex-col gap-2",children:[i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:bdAccountingCurrencySuffixV243(),ariaLabel:(e.type==="manual_bonus"?"Ручной бонус, ":"Ручная корректировка, ")+n}),i.jsx(jn,{placeholder:"Комментарий (необязательно)",value:e.label??"",onChange:n=>t({label:n})})]});default:return null}}',
  "payroll rule editor",
);

replaceOnce('suffix:"₽",ariaLabel:"Ставка за "+joe[n]+", ₽"', 'suffix:bdAccountingCurrencySuffixV243(),ariaLabel:"Ставка за "+joe[n]+", "+(bdCurrentAccountingCurrencyV243()||"валюта учёта")', "weekday rate editor");
replaceOnce('children:[new Intl.NumberFormat("ru-RU").format(y)," ₽"]', 'children:bdAccountingMoneyV243(y)', "payroll preview total");

fs.writeFileSync(bundlePath, source);
console.log("Applied accounting-money v243 bundle patch.");
