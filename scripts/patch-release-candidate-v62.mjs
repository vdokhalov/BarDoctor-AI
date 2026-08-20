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
  'function bdMonthClosingMoney(e){return bdMoney2(Number(e)||0)+" ₽"}',
  'function bdMonthClosingMoney(e){return bdMoney2(Number(e)||0)}',
);
replaceRequired(
  'function bdMonthClosingSignedMoney(e){const t=Number(e)||0;return(t>0?"+":"")+bdMoney2(t)+" ₽"}',
  'function bdMonthClosingSignedMoney(e){const t=Number(e)||0;return(t>0?"+":"")+bdMoney2(t)}',
);
replaceRequired(
  'subtitle:"Итоги зафиксированы "+bdMonthClosingDate(l.closedAt)+". Снимок расчёта сохранён."',
  'subtitle:"Итоги зафиксированы "+bdMonthClosingDate(l.closedAt)+" Снимок расчёта сохранён."',
);
replaceRequired(
  'onReopen:g=>d(g)',
  'onReopen:g=>{window.confirm("Открыть закрытый месяц? После этого данные периода снова можно будет изменять.")&&d(g)}',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>{j(null),g(!0)},className:"w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_2px_10px_rgba(91,92,235,0.28)] active:scale-95 transition-transform",children:i.jsx(Vt,{size:18,className:"text-white"})})',
  'i.jsx("button",{type:"button",onClick:()=>{j(null),g(!0)},"aria-label":"Добавить правило оплаты",className:"w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_2px_10px_rgba(91,92,235,0.28)] active:scale-95 transition-transform",children:i.jsx(Vt,{size:18,className:"text-white"})})',
);
replaceRequired(
  'i.jsxs("select",{value:f,onChange:_=>m(_.target.value),className:"text-[12px] font-semibold text-muted-foreground bg-transparent focus:outline-none",children:',
  'i.jsxs("select",{value:f,onChange:_=>m(_.target.value),"aria-label":"Сортировка правил оплаты",className:"text-[12px] font-semibold text-muted-foreground bg-transparent focus:outline-none",children:',
);
replaceRequired(
  'i.jsx(W.div,{initial:{opacity:0},animate:{opacity:1},className:"text-center py-16",children:i.jsx("p",{className:"text-[14px] text-muted-foreground font-medium",children:u==="active"?"Пока нет правил оплаты":"Архив пуст"})})',
  'i.jsxs(W.div,{initial:{opacity:0},animate:{opacity:1},className:"text-center py-16 px-4",children:[i.jsx("p",{className:"text-[14px] text-muted-foreground font-medium",children:u==="active"?"Пока нет правил оплаты":"Архив пуст"}),u==="active"&&i.jsx("button",{type:"button",onClick:()=>{j(null),g(!0)},className:"mt-4 px-4 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-bold",children:"+ Создать правило оплаты"})]})',
);

replaceRequired(
  'i.jsx("button",{type:"button",className:"bd-procurement-close",onClick:t,children:"×"})',
  'i.jsx("button",{type:"button",className:"bd-procurement-close",onClick:t,"aria-label":"Закрыть форму",children:"×"})',
);

replaceRequired(
  'i.jsx("input",{type:"date",value:a,onChange:g=>s(g.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[15px] font-medium"})',
  'i.jsx("input",{type:"date",value:a,onChange:g=>s(g.target.value),"aria-label":"Дата инвентаризации",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[15px] font-medium"})',
);
replaceRequired(
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.01",value:l[g]??"",onChange:y=>u(j=>({...j,[g]:y.target.value})),placeholder:"0",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[15px] font-medium"})',
  'i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.01",value:l[g]??"",onChange:y=>u(j=>({...j,[g]:y.target.value})),placeholder:"0","aria-label":g+" — себестоимость остатков, ₽",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[15px] font-medium"})',
);
replaceRequired(
  'i.jsx("textarea",{value:d,onChange:g=>f(g.target.value),rows:2,className:"w-full bg-[#F8F9FC] border border-border rounded-2xl px-4 py-3 text-[14px] resize-none",placeholder:"Например: данные перенесены из 1С"})',
  'i.jsx("textarea",{value:d,onChange:g=>f(g.target.value),rows:2,"aria-label":"Комментарий к инвентаризации",className:"w-full bg-[#F8F9FC] border border-border rounded-2xl px-4 py-3 text-[14px] resize-none",placeholder:"Например: данные перенесены из 1С"})',
);

replaceRequired("rc-v61", "rc-v62");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v62");
