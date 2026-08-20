import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-shift-result":"period-v4"')) {
  const periodMetricFixes = [
    [
      "bdMoney2(t.inventoryPurchases??0)",
      "bdMoney2(o?.purchases??t.inventoryPurchases??0)",
    ],
    [
      "bdMoney2(t.otherExpenses??0)",
      "bdMoney2(o?.otherExpenses??t.otherExpenses??0)",
    ],
  ];
  let changed = false;
  for (const [search, replacement] of periodMetricFixes) {
    if (source.includes(search)) {
      source = source.replace(search, replacement);
      changed = true;
    }
  }
  if (changed) {
    await writeFile(bundlePath, source);
    console.log("Period metric sources corrected.");
    process.exit(0);
  }
  console.log("Period and shift expense rules v4 are already applied.");
  process.exit(0);
}

if (!source.includes('"data-bd-shift-result":"clear-v3"')) {
  throw new Error("Shift result layout v3 must be applied first.");
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  source = source.slice(0, index) + replacement + source.slice(index + search.length);
}

const periodCard = String.raw`
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a,report:o}){const s=!!(r&&!t.hasRevenueData),l=o?.resultBeforeCost??null;return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Средний чек"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:t.avgReceipt!==null?Mn(t.avgReceipt):"—"})]}),o&&i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Закупки за период"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(o?.purchases??t.inventoryPurchases??0)})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Накопительные расходы"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(o?.otherExpenses??t.otherExpenses??0)})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Списания"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.writeoffs??0)})]})]}),o&&i.jsx("p",{style:{fontSize:10.5,color:"#7C829B",lineHeight:1.45},children:"Накопительные расходы: аренда, ремонт, оборудование, маркетинг, развлекательная программа, охрана, уборка, транспорт и прочее за выбранный период."}),l!==null&&i.jsxs("div",{"data-bd-month-result":"period-v4",style:{borderRadius:20,background:"linear-gradient(145deg, #171A34 0%, #292E68 100%)",padding:"16px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)",overflow:"hidden"},children:[i.jsx("p",{style:{fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.62)"},children:"Результат внесённых смен"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.72)",marginTop:3},children:"до себестоимости проданного товара"}),i.jsx("p",{style:{fontSize:28,fontWeight:900,color:l>=0?"#4ADE80":"#FB7185",lineHeight:1.1,marginTop:12,overflowWrap:"anywhere"},children:bdMoney2(l)}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",margin:"13px 0 10px"}}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.78)",lineHeight:1.5},children:"Учтены ФОТ, списания, накопительные расходы и распределённая доля налогов и коммунальных услуг."}),i.jsxs("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:["Постоянные расходы учтены за ",o.dataShiftCount," смен: ",bdMoney2(o.allocatedRecurring),". Себестоимость проданного товара ещё не вычтена."]})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCard);

replaceOnce("Dt=tt-vt-Ct-Nt-je", "Dt=tt-vt-Ct-je");

const revenueStart = source.indexOf("ae.map(ve=>{const Re=Ym(ve)");
const revenueEnd = source.indexOf("}):ce.length===0?", revenueStart);
if (revenueStart === -1 || revenueEnd === -1) {
  throw new Error("Revenue list segment was not found");
}

let revenueSegment = source.slice(revenueStart, revenueEnd);
const resultStart = revenueSegment.indexOf(
  'bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"clear-v3"',
);
const resultEnd = revenueSegment.indexOf(",ve.note&&i.jsx", resultStart);
if (resultStart === -1 || resultEnd === -1) {
  throw new Error("Existing shift result block was not found");
}

const dailyResult = String.raw`bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"period-v4",style:{marginTop:10,border:"1px solid #DEDEF8",background:"linear-gradient(135deg, #F8F8FF 0%, #F2F3FF 100%)",borderRadius:16,padding:"12px",overflow:"hidden"},children:[i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"minmax(0, 1fr) auto",alignItems:"start",gap:10},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"#737A96"},children:"Результат смены"}),i.jsx("p",{style:{fontSize:10.5,color:"#737A96",marginTop:2},children:"до себестоимости товара"})]}),i.jsx("p",{style:{fontSize:20,fontWeight:900,color:bdShiftResult.resultBeforeCost>=0?"#16A34A":"#DC2626",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(bdShiftResult.resultBeforeCost)})]}),i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",columnGap:12,rowGap:8,borderTop:"1px solid #E4E5F5",marginTop:10,paddingTop:10},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"ФОТ"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.payroll)})]}),i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Налоги и коммунальные услуги"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.recurringAllocation)})]}),i.jsxs("div",{style:{gridColumn:"1 / -1"},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Списания"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.writeoffs)})]})]})]})`;

revenueSegment =
  revenueSegment.slice(0, resultStart) +
  dailyResult +
  revenueSegment.slice(resultEnd);
source = source.slice(0, revenueStart) + revenueSegment + source.slice(revenueEnd);

replaceOnce('"data-bd-report-result":"clear-v3"', '"data-bd-report-result":"period-v4"');
replaceOnce(
  'children:"Учтены ФОТ, списания, прочие расходы, налоги и коммунальные услуги."',
  'children:"Учтены ФОТ, списания, накопительные расходы, налоги и коммунальные услуги."',
);
replaceOnce("Прочие операционные расходы", "Накопительные расходы");
replaceOnce(
  'Показан результат после ФОТ, списаний, прямых расходов, налогов и коммунальных услуг. Себестоимость проданного товара ещё не вычтена.',
  'Показан результат после ФОТ, списаний, налогов и коммунальных услуг. Себестоимость проданного товара ещё не вычтена.',
);
replaceOnce(
  '["Выручка ",Mn(y.revenue)," · ФОТ ",Mn(y.payroll)," · постоянные ",Mn(y.recurringAllocation)," · прямые расходы ",Mn(y.otherExpenses)," · без себестоимости"]',
  '["Выручка ",Mn(y.revenue)," · ФОТ ",Mn(y.payroll)," · постоянные ",Mn(y.recurringAllocation)," · без себестоимости"]',
);

await writeFile(bundlePath, source);
console.log("Period and shift expense rules v4 applied.");
