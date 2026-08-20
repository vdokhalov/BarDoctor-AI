import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceRequired(before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 120)}`);
  }
  source = source.split(before).join(after);
}

replaceRequired(
  'n&&i.jsx("div",{className:"px-6 pt-4 pb-2 shrink-0",children:i.jsx("h3",{className:"text-[18px] font-semibold text-foreground",children:n})})',
  'n&&i.jsxs("div",{className:"px-6 pt-4 pb-2 shrink-0 flex items-center justify-between gap-3",children:[i.jsx("h3",{className:"text-[18px] font-semibold text-foreground",children:n}),i.jsx("button",{type:"button",onClick:t,"aria-label":"Закрыть форму",className:"w-9 h-9 rounded-full bg-muted text-[18px] flex items-center justify-center",children:"×"})]})',
);

replaceRequired(
  'function jn({placeholder:e,value:t,onChange:n,type:r="text",autoFocus:a,suffix:s})',
  'function jn({placeholder:e,value:t,onChange:n,type:r="text",autoFocus:a,suffix:s,ariaLabel:l})',
);
replaceRequired(
  'i.jsx("input",{type:r,value:t,onChange:l=>n(l.target.value),placeholder:e,autoFocus:a,inputMode:r==="number"?"decimal":void 0,autoComplete:"off",className:',
  'i.jsx("input",{type:r,value:t,onChange:u=>n(u.target.value),placeholder:e,autoFocus:a,inputMode:r==="number"?"decimal":void 0,autoComplete:"off","aria-label":l||e||void 0,className:',
);
replaceRequired(
  'return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽"})',
  'return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽",ariaLabel:e.type==="monthly_salary"?"Оклад в месяц, ₽":"Ставка за смену, ₽"})',
);
replaceRequired(
  'case"hourly_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/час"})',
  'case"hourly_rate":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/час",ariaLabel:"Ставка за час, ₽"})',
);
replaceRequired(
  'case"personal_sales_percent":case"venue_sales_percent":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%"})',
  'case"personal_sales_percent":case"venue_sales_percent":return i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:e.type==="personal_sales_percent"?"Процент от личных продаж":"Процент от продаж заведения"})',
);
replaceRequired(
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%"}),i.jsx(jn,{placeholder:"Отдел (например, Бар)"',
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.percent||""),onChange:n=>t({percent:kr(n)}),suffix:"%",ariaLabel:"Процент от продаж отдела"}),i.jsx(jn,{placeholder:"Отдел (например, Бар)"',
);
replaceRequired(
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/шт"}),i.jsx(jn,{placeholder:"Название единицы',
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽/шт",ariaLabel:"Оплата за единицу, ₽"}),i.jsx(jn,{placeholder:"Название единицы',
);
replaceRequired(
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e[n]||""),onChange:r=>t({...e,[n]:kr(r)}),suffix:"₽"})',
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e[n]||""),onChange:r=>t({...e,[n]:kr(r)}),suffix:"₽",ariaLabel:"Ставка за "+joe[n]+", ₽"})',
);
replaceRequired(
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽"}),i.jsx(jn,{placeholder:"Комментарий',
  'i.jsx(jn,{type:"number",placeholder:"0",value:String(e.amount||""),onChange:n=>t({amount:kr(n)}),suffix:"₽",ariaLabel:e.type==="manual_bonus"?"Ручной бонус, ₽":"Ручная корректировка, ₽"}),i.jsx(jn,{placeholder:"Комментарий',
);

replaceRequired(
  'function $l({icon:e,title:t,subtitle:n,meta:r,showChevron:a,onClick:s,className:l,destructive:u=!1}){return i.jsxs("div",{onClick:s,className:X("flex items-center justify-between py-3.5",s&&"cursor-pointer active:bg-muted/60 transition-colors",l),children:',
  'function $l({icon:e,title:t,subtitle:n,meta:r,showChevron:a,onClick:s,className:l,destructive:u=!1}){return i.jsxs(s?"button":"div",{type:s?"button":void 0,onClick:s,className:X("w-full text-left border-0 bg-transparent flex items-center justify-between py-3.5",s&&"cursor-pointer active:bg-muted/60 transition-colors",l),children:',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:n,className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
  'i.jsx("button",{type:"button",onClick:n,"aria-label":"Закрыть форму",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
);
replaceRequired(
  'i.jsx("select",{value:f,onChange:ce=>m(ce.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none",children:$S.map',
  'i.jsx("select",{value:f,onChange:ce=>m(ce.target.value),"aria-label":"Должность сотрудника",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none",children:$S.map',
);
replaceRequired(
  'i.jsx("input",{type:"date",value:A,onChange:ce=>k(ce.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"})',
  'i.jsx("input",{type:"date",value:A,onChange:ce=>k(ce.target.value),"aria-label":"Дата приёма",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"})',
);
replaceRequired(
  'i.jsxs("select",{value:O??"",onChange:ce=>M(ce.target.value||null),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none",children:',
  'i.jsxs("select",{value:O??"",onChange:ce=>M(ce.target.value||null),"aria-label":"Правило оплаты сотрудника",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none",children:',
);
replaceRequired(
  'E&&i.jsx("button",{type:"button",onClick:y,className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)] active:scale-95 transition-transform",children:i.jsx(Vt,{size:18,className:"text-white"})})',
  'E&&i.jsx("button",{type:"button",onClick:y,"aria-label":"Добавить сотрудника",className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)] active:scale-95 transition-transform",children:i.jsx(Vt,{size:18,className:"text-white"})})',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:a,className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"})',
  'i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть форму",className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"})',
);
replaceRequired(
  'i.jsx("select",{value:l,onChange:_=>u(_.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:t.map',
  'i.jsx("select",{value:l,onChange:_=>u(_.target.value),"aria-label":"Сотрудник",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:t.map',
);
replaceRequired(
  'i.jsx("select",{value:d,onChange:_=>f(_.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:bdPayrollEntryOptions.map',
  'i.jsx("select",{value:d,onChange:_=>f(_.target.value),"aria-label":"Тип зарплатной операции",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:bdPayrollEntryOptions.map',
);
replaceRequired(
  'i.jsx("input",{type:"date",value:m,onChange:_=>h(_.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"})',
  'i.jsx("input",{type:"date",value:m,onChange:_=>h(_.target.value),"aria-label":"Дата зарплатной операции",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"})',
);
replaceRequired(
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.01",value:g,onChange:_=>y(_.target.value),placeholder:"0",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[16px] font-bold"})',
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.01",value:g,onChange:_=>y(_.target.value),placeholder:"0","aria-label":"Сумма зарплатной операции, ₽",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[16px] font-bold"})',
);
replaceRequired(
  'i.jsx("textarea",{value:j,onChange:_=>v(_.target.value),rows:3,placeholder:d==="order"?"Что заказывал сотрудник":d==="fine"?"Причина и основание":"Подробности операции",className:"w-full bg-[#F8F9FC] border border-border rounded-2xl px-4 py-3 resize-none"})',
  'i.jsx("textarea",{value:j,onChange:_=>v(_.target.value),rows:3,placeholder:d==="order"?"Что заказывал сотрудник":d==="fine"?"Причина и основание":"Подробности операции","aria-label":"Комментарий к зарплатной операции",className:"w-full bg-[#F8F9FC] border border-border rounded-2xl px-4 py-3 resize-none"})',
);

replaceRequired(
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",value:t.amount??0,onChange:s=>n({...t,amount:Number(s.target.value)||0}),placeholder:"0",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[16px] font-bold"})',
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",value:t.amount??0,onChange:s=>n({...t,amount:Number(s.target.value)||0}),placeholder:"0","aria-label":e+" — сумма за месяц, ₽",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[16px] font-bold"})',
);
replaceRequired(
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.1",value:t.percent??0,onChange:s=>n({...t,percent:Number(s.target.value)||0}),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"})',
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.1",value:t.percent??0,onChange:s=>n({...t,percent:Number(s.target.value)||0}),"aria-label":e+" — процент от выручки",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"})',
);

replaceRequired("rc-v62", "rc-v63");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v63");
