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
  'function Wl({placeholder:e,value:t,onChange:n,type:r="text",prefix:a,autoFocus:s})',
  'function Wl({placeholder:e,value:t,onChange:n,type:r="text",prefix:a,autoFocus:s,ariaLabel:l})',
);
replaceRequired(
  'i.jsx("input",{type:r,value:t,onChange:l=>n(l.target.value),placeholder:e,autoFocus:s,inputMode:r==="number"?"numeric":void 0,className:',
  'i.jsx("input",{type:r,value:t,onChange:u=>n(u.target.value),placeholder:e,autoFocus:s,inputMode:r==="number"?"numeric":void 0,"aria-label":l||e||void 0,className:',
);
replaceRequired(
  'i.jsxs("select",{value:t,onChange:a=>n(a.target.value),className:',
  'i.jsxs("select",{value:t,onChange:a=>n(a.target.value),"aria-label":e,className:',
);

replaceRequired(
  'function Rle({value:e,onChange:t}){return i.jsxs("div",{className:"flex items-center gap-1 flex-shrink-0",children:[i.jsx("button",{type:"button",onClick:()=>t(Math.max(1,e-1)),className:',
  'function Rle({value:e,onChange:t,label:n}){return i.jsxs("div",{className:"flex items-center gap-1 flex-shrink-0",children:[i.jsx("button",{type:"button",onClick:()=>t(Math.max(1,e-1)),"aria-label":"Уменьшить количество: "+n,className:',
);
replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>t(Math.min(99,e+1)),className:"w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform",children:i.jsx(Vt,',
  'i.jsx("button",{type:"button",onClick:()=>t(Math.min(99,e+1)),"aria-label":"Увеличить количество: "+n,className:"w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform",children:i.jsx(Vt,',
);
replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>s(m.key),className:X("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2",h.checked?',
  'i.jsx("button",{type:"button",onClick:()=>s(m.key),"aria-label":(h.checked?"Убрать ":"Добавить ")+m.name,"aria-pressed":h.checked,className:X("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2",h.checked?',
);
replaceRequired(
  'i.jsx(Rle,{value:h.qty,onChange:g=>l(m.key,g)})',
  'i.jsx(Rle,{value:h.qty,onChange:g=>l(m.key,g),label:m.name})',
);

replaceRequired(
  'i.jsx(Wl,{placeholder:"Например: Кафе «Берёза»",value:e.name,onChange:a=>t("name",a),autoFocus:!0})',
  'i.jsx(Wl,{placeholder:"Например: Кафе «Берёза»",value:e.name,onChange:a=>t("name",a),autoFocus:!0,ariaLabel:"Название заведения"})',
);
replaceRequired(
  'i.jsx(Wl,{placeholder:"Например: Приднестровье",value:e.region,onChange:a=>t("region",a)})',
  'i.jsx(Wl,{placeholder:"Например: Приднестровье",value:e.region,onChange:a=>t("region",a),ariaLabel:"Регион или район"})',
);
replaceRequired(
  'i.jsx(Wl,{placeholder:"Например: спорт-бар, фастфуд у дороги, семейное кафе",value:e.venueFormat,onChange:a=>t("venueFormat",a)})',
  'i.jsx(Wl,{placeholder:"Например: спорт-бар, фастфуд у дороги, семейное кафе",value:e.venueFormat,onChange:a=>t("venueFormat",a),ariaLabel:"Формат заведения"})',
);
replaceRequired(
  'i.jsx(Wl,{placeholder:"Через запятую: название 1, название 2…",value:e.competitorsText,onChange:a=>t("competitorsText",a)})',
  'i.jsx(Wl,{placeholder:"Через запятую: название 1, название 2…",value:e.competitorsText,onChange:a=>t("competitorsText",a),ariaLabel:"Конкуренты рядом"})',
);
replaceRequired(
  'i.jsx(Wl,{placeholder:"80",type:"number",value:e.seats,onChange:n=>t("seats",n)})',
  'i.jsx(Wl,{placeholder:"80",type:"number",value:e.seats,onChange:n=>t("seats",n),ariaLabel:"Мест в зале"})',
);
replaceRequired(
  'i.jsx(Wl,{placeholder:"15",type:"number",value:e.employees,onChange:n=>t("employees",n)})',
  'i.jsx(Wl,{placeholder:"15",type:"number",value:e.employees,onChange:n=>t("employees",n),ariaLabel:"Количество сотрудников"})',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:j,className:X("w-10 h-10 rounded-full flex items-center justify-center transition-all",r<=1?',
  'i.jsx("button",{type:"button",onClick:j,"aria-label":"Назад",className:X("w-10 h-10 rounded-full flex items-center justify-center transition-all",r<=1?',
);

replaceRequired(
  '_.length>0&&!n(_)&&console.warn("[BarDoctor] Failed to save onboarding equipment list.");',
  '',
);
replaceRequired(
  'await t(A),m(!0),setTimeout(()=>e("/home"),2e3)',
  'await t(A),_.length>0&&n(_),m(!0),setTimeout(()=>e("/home"),2e3)',
);

replaceRequired("rc-v64", "rc-v65");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v65");
