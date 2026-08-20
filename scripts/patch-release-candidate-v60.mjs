import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v60"')) {
  console.log("release candidate v60 already applied");
  process.exit(0);
}
if (!source.includes('bdReleaseCandidateVersion="rc-v59"')) {
  throw new Error("release candidate v59 marker was not found");
}

function replaceRequired(from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  source = source.split(from).join(to);
}

replaceRequired(
  'bdReleaseCandidateVersion="rc-v59"',
  'bdReleaseCandidateVersion="rc-v60"',
  1,
  "release marker",
);

replaceRequired(
  'async function S0(e,t,n,r){return!!(await(await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n,baseData:r})})).json()).ok}',
  'async function S0(e,t,n,r){const a=await(await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n,baseData:r})})).json();return a.ok?{ok:!0,data:Object.prototype.hasOwnProperty.call(a,"data")?a.data:n}:{ok:!1,data:n}}',
  1,
  "authoritative merged store response",
);

replaceRequired(
  'if(!Array.isArray(l))return await S0(e,t,r,l),r;',
  'if(!Array.isArray(l)){const u=await S0(e,t,r,l);if(!u.ok)throw new Error(`PUT /api/store/${e} rejected`);return u.data}',
  1,
  "non-array remote response",
);

replaceRequired(
  'const{merged:u,conflicts:d}=Wse(e,n,r,l,a);if(!await S0(e,t,u,l))throw new Error(`PUT /api/store/${e} rejected`);return Ese(d),u',
  'const{merged:u,conflicts:d}=Wse(e,n,r,l,a),f=await S0(e,t,u,l);if(!f.ok)throw new Error(`PUT /api/store/${e} rejected`);return Ese(d),f.data',
  1,
  "array merged response",
);

replaceRequired(
  'if(!await S0(e,t,r,n))throw new Error(`PUT /api/store/${e} rejected`);return r',
  'const l=await S0(e,t,r,n);if(!l.ok)throw new Error(`PUT /api/store/${e} rejected`);return l.data',
  1,
  "object merged response",
);

replaceRequired(
  'function bdAccountingHeader({title:e,back:t="/more",right:n}){const[,r]=bt();return i.jsxs("div",{className:"sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button",onClick:()=>r(t),className:',
  'function bdAccountingHeader({title:e,back:t="/more",right:n}){const[,r]=bt();return i.jsxs("div",{className:"sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>r(t),className:',
  1,
  "accounting back label",
);

replaceRequired(
  'onClick:u,className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95",children:i.jsx(vt',
  'onClick:u,"aria-label":"Закрыть форму",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95",children:i.jsx(vt',
  1,
  "shift close form label",
);

replaceRequired(
  'type:"date",value:f,onChange:ye=>m(ye.target.value),className:fieldClass',
  'type:"date","aria-label":"Дата смены",value:f,onChange:ye=>m(ye.target.value),className:fieldClass',
  1,
  "shift date label",
);

replaceRequired(
  'type:"number",inputMode:"decimal",value:h,onChange:ye=>g(ye.target.value),placeholder:"0",className:fieldClass',
  'type:"number",inputMode:"decimal","aria-label":"Выручка, ₽",value:h,onChange:ye=>g(ye.target.value),placeholder:"0",className:fieldClass',
  1,
  "shift revenue label",
);

replaceRequired(
  'type:"number",inputMode:"numeric",value:y,onChange:ye=>j(ye.target.value),placeholder:"0",className:fieldClass',
  'type:"number",inputMode:"numeric","aria-label":"Количество чеков",value:y,onChange:ye=>j(ye.target.value),placeholder:"0",className:fieldClass',
  1,
  "shift receipts label",
);

replaceRequired(
  'type:"number",inputMode:"numeric",value:v,onChange:ye=>b(ye.target.value),placeholder:"Необязательно",className:fieldClass',
  'type:"number",inputMode:"numeric","aria-label":"Количество гостей",value:v,onChange:ye=>b(ye.target.value),placeholder:"Необязательно",className:fieldClass',
  1,
  "shift guests label",
);

replaceRequired(
  'type:"number",inputMode:"decimal",value:A[ye]??"",placeholder:"0",onChange:je=>k',
  'type:"number",inputMode:"decimal","aria-label":"Выручка · "+ye,value:A[ye]??"",placeholder:"0",onChange:je=>k',
  1,
  "shift area revenue label",
);

replaceRequired(
  'select",{value:ye.area,onChange:fe=>updateWriteoff',
  'select",{"aria-label":"Раздел списания",value:ye.area,onChange:fe=>updateWriteoff',
  1,
  "shift writeoff area label",
);

replaceRequired(
  'type:"number",inputMode:"decimal",value:ye.amount,onChange:fe=>updateWriteoff',
  'type:"number",inputMode:"decimal","aria-label":"Сумма списания, ₽",value:ye.amount,onChange:fe=>updateWriteoff',
  1,
  "shift writeoff amount label",
);

replaceRequired(
  'value:ye.description,onChange:fe=>updateWriteoff(ye.id,"description"',
  '"aria-label":"Что списано и почему",value:ye.description,onChange:fe=>updateWriteoff(ye.id,"description"',
  1,
  "shift writeoff description label",
);

replaceRequired(
  'Y=l.length>0&&K&&(d!=="other"||m.trim().length>0)&&(!H||!!E);',
  'Y=l.length>0&&K&&(d!=="other"||m.trim().length>0)&&(!H||!!E)&&(d!=="writeoff"||(j.trim().length>0&&(!e.length||!!b)));',
  1,
  "finance writeoff validation",
);

replaceRequired(
  'children:"Зона (опционально)"',
  'children:d==="writeoff"?"Раздел списания *":"Зона (опционально)"',
  1,
  "finance writeoff area copy",
);

replaceRequired(
  'children:H?"Описание ремонта":"Описание"',
  'children:d==="writeoff"?"Причина списания *":H?"Описание ремонта":"Описание"',
  1,
  "finance writeoff reason copy",
);

replaceRequired(
  'placeholder:H?"Что было сделано (необязательно)":void 0',
  'placeholder:H?"Что было сделано (необязательно)":d==="writeoff"?"Что списано и почему":void 0',
  1,
  "finance writeoff reason placeholder",
);

replaceRequired(
  'h=u!==""&&Number.isFinite(Number(u))&&Number(u)>0,g=[...new Set',
  'h=u!==""&&Number.isFinite(Number(u))&&Number(u)>0&&f.trim().length>0,g=[...new Set',
  1,
  "warehouse writeoff validation",
);

replaceRequired(
  'children:"Что списали"',
  'children:"Что списали и почему *"',
  1,
  "warehouse writeoff reason copy",
);

replaceRequired(
  'placeholder:"Причина или краткое описание"',
  'placeholder:"Что списано и почему"',
  1,
  "warehouse writeoff placeholder",
);

replaceRequired(
  'type:"button",onClick:n,className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"',
  'type:"button","aria-label":"Закрыть форму",onClick:n,className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"',
  1,
  "inventory form close label",
);

replaceRequired(
  'type:"button",onClick:t,className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"',
  'type:"button","aria-label":"Закрыть форму",onClick:t,className:"w-9 h-9 rounded-full bg-muted text-[18px]",children:"×"',
  1,
  "writeoff form close label",
);

replaceRequired(
  'type:"date",value:r,onChange:y=>a(y.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"',
  'type:"date","aria-label":"Дата списания",value:r,onChange:y=>a(y.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"',
  1,
  "warehouse writeoff date label",
);

replaceRequired(
  'select",{value:s,onChange:y=>l(y.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:g.map',
  'select",{"aria-label":"Раздел списания",value:s,onChange:y=>l(y.target.value),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:g.map',
  1,
  "warehouse writeoff area label",
);

replaceRequired(
  'type:"number",inputMode:"decimal",min:"0",step:"0.01",value:u,onChange:y=>d(y.target.value),placeholder:"0"',
  'type:"number",inputMode:"decimal",min:"0",step:"0.01","aria-label":"Себестоимость списания, ₽",value:u,onChange:y=>d(y.target.value),placeholder:"0"',
  1,
  "warehouse writeoff amount label",
);

replaceRequired(
  'textarea",{value:f,onChange:y=>m(y.target.value),rows:2,placeholder:"Что списано и почему"',
  'textarea",{"aria-label":"Что списано и почему",value:f,onChange:y=>m(y.target.value),rows:2,placeholder:"Что списано и почему"',
  1,
  "warehouse writeoff reason label",
);

replaceRequired(
  'i.jsxs("select",{value:s,onChange:b=>l(b.target.value),className:',
  'i.jsxs("select",{"aria-label":"Как часто снимаются остатки",value:s,onChange:b=>l(b.target.value),className:',
  1,
  "inventory frequency label",
);

replaceRequired(
  'textarea",{value:f,onChange:b=>m(b.target.value),rows:2,className:',
  'textarea",{"aria-label":"Разделы остатков и списаний",value:f,onChange:b=>m(b.target.value),rows:2,className:',
  1,
  "inventory sections label",
);

replaceRequired(
  'i.jsxs("select",{value:t.mode,onChange:s=>n({...t,mode:s.target.value}),className:',
  'i.jsxs("select",{"aria-label":e+" — способ внесения",value:t.mode,onChange:s=>n({...t,mode:s.target.value}),className:',
  1,
  "recurring mode label",
);

replaceRequired(
  'children:["В текущем результате уже учтено ",bdMoney2(m.allocatedRecurring)," за ",m.dataShiftCount," внесённых смен."]',
  'children:m.periodPast?["В результате завершённого месяца учтена полная сумма налогов и коммунальных услуг: ",bdMoney2(m.taxes+m.utilities),"."]:["В текущем результате уже учтено ",bdMoney2(m.allocatedRecurring)," за ",m.dataShiftCount," внесённых смен."]',
  1,
  "completed month recurring copy",
);

replaceRequired(
  'm.unallocatedRecurring>0&&i.jsxs("p"',
  '!m.periodPast&&m.unallocatedRecurring>0&&i.jsxs("p"',
  1,
  "hide completed month unallocated copy",
);

replaceRequired(
  'children:["В ",bdMonthDisplay(d)," по графику заведения ",m.plannedShifts," плановых смен. Полная месячная сумма распределяется между ними поровну."]',
  'children:["Период: ",bdMonthDisplay(d),". Плановых смен по графику: ",m.plannedShifts,". Полная месячная сумма распределяется между ними поровну."]',
  1,
  "monthly schedule copy",
);

replaceRequired(
  'children:"Ориентир по чистым деньгам смен"',
  'children:"Операционный результат по сменам"',
  1,
  "shift result terminology",
);

replaceRequired(
  'g=!m.openingSnapshot?"Внесите остатки на "+sg(m.meta.start)+".":!m.closingSnapshot?"Для закрытия месяца внесите остатки на "+sg(m.meta.nextStart)+"."',
  'g=!m.openingSnapshot?"Внесите остатки на "+sg(m.meta.start):!m.closingSnapshot?"Для закрытия месяца внесите остатки на "+sg(m.meta.nextStart)',
  1,
  "report date punctuation",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v60");
