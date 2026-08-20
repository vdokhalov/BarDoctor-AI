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
  'i.jsx("button",{type:"button",onClick:a,className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
  'i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть форму",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
);

replaceRequired(
  'i.jsx("input",{type:"date",value:l,onChange:ae=>u(ae.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
  'i.jsx("input",{type:"date",value:l,onChange:ae=>u(ae.target.value),"aria-label":"Дата расхода",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
);

replaceRequired(
  'i.jsx("input",{type:"number",inputMode:"decimal",value:g,onChange:ae=>y(ae.target.value),placeholder:"0",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
  'i.jsx("input",{type:"number",inputMode:"decimal",value:g,onChange:ae=>y(ae.target.value),placeholder:"0","aria-label":"Сумма расхода, ₽",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
);

replaceRequired(
  'i.jsx("textarea",{value:j,onChange:ae=>v(ae.target.value),rows:2,placeholder:H?"Что было сделано (необязательно)":d==="writeoff"?"Что списано и почему":void 0,className:"w-full bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
  'i.jsx("textarea",{value:j,onChange:ae=>v(ae.target.value),rows:2,placeholder:H?"Что было сделано (необязательно)":d==="writeoff"?"Что списано и почему":void 0,"aria-label":d==="writeoff"?"Причина списания":"Описание расхода",className:"w-full bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"})',
);

replaceRequired("rc-v60", "rc-v61");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v61");
