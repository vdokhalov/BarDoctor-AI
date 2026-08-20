import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-shift-result":"clear-v3"')) {
  console.log("Shift result layout v3 is already applied.");
  process.exit(0);
}

if (!source.includes('"data-bd-shift-result":"clear-v2"')) {
  throw new Error("Shift result clarity v2 must be applied first.");
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
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a,report:o}){const s=!!(r&&!t.hasRevenueData),l=o?.resultBeforeCost??null;return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Средний чек"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:t.avgReceipt!==null?Mn(t.avgReceipt):"—"})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Прочие расходы"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.otherExpenses??0)})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Списания"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.writeoffs??0)})]})]}),l!==null&&i.jsxs("div",{"data-bd-month-result":"clear-v3",style:{borderRadius:20,background:"linear-gradient(145deg, #171A34 0%, #292E68 100%)",padding:"16px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)",overflow:"hidden"},children:[i.jsx("p",{style:{fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.62)"},children:"Результат внесённых смен"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.72)",marginTop:3},children:"до себестоимости проданного товара"}),i.jsx("p",{style:{fontSize:28,fontWeight:900,color:l>=0?"#4ADE80":"#FB7185",lineHeight:1.1,marginTop:12,overflowWrap:"anywhere"},children:bdMoney2(l)}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",margin:"13px 0 10px"}}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.78)",lineHeight:1.5},children:"Учтены ФОТ, списания, прочие расходы и распределённая доля налогов и коммунальных услуг."}),i.jsxs("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:["Постоянные расходы учтены за ",o.dataShiftCount," смен: ",bdMoney2(o.allocatedRecurring),". Себестоимость проданного товара ещё не вычтена."]})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCard);

const purchaseExplanation =
  'Y.month.hasRevenueData&&(Y.month.inventoryPurchases??0)>0&&i.jsx("p",{className:"text-[12px] text-muted-foreground -mt-2 px-1 leading-relaxed",children:"Закупки — это пополнение общего запаса заведения. Без учёта остатков и списаний невозможно определить, какая часть закупленного была реализована в конкретную смену, поэтому точная маржинальность недоступна."})';
replaceOnce(purchaseExplanation, "null");

const revenueStart = source.indexOf("ae.map(ve=>{const Re=Ym(ve)");
const revenueEnd = source.indexOf("}):ce.length===0?", revenueStart);
if (revenueStart === -1 || revenueEnd === -1) {
  throw new Error("Revenue list segment was not found");
}

let revenueSegment = source.slice(revenueStart, revenueEnd);

function replaceRevenueOnce(search, replacement) {
  const index = revenueSegment.indexOf(search);
  if (index === -1) throw new Error(`Revenue marker not found: ${search.slice(0, 160)}`);
  revenueSegment =
    revenueSegment.slice(0, index) +
    replacement +
    revenueSegment.slice(index + search.length);
}

replaceRevenueOnce('className:"min-w-0 pr-20"', 'className:"min-w-0"');
replaceRevenueOnce(
  'className:"text-[14px] font-bold text-foreground",children:sg(ve.date)',
  'className:"text-[14px] font-bold text-foreground",style:{paddingRight:76},children:sg(ve.date)',
);
replaceRevenueOnce(
  'className:"text-[12.5px] text-muted-foreground",children:',
  'className:"text-[12.5px] text-muted-foreground",style:{paddingRight:76},children:',
);
replaceRevenueOnce(
  'className:"text-[12px] font-semibold text-primary/80 mt-0.5",children:',
  'className:"text-[12px] font-semibold text-primary/80 mt-0.5",style:{paddingRight:76},children:',
);

const resultStart = revenueSegment.indexOf(
  'bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"clear-v2"',
);
const resultEnd = revenueSegment.indexOf(",ve.note&&i.jsx", resultStart);
if (resultStart === -1 || resultEnd === -1) {
  throw new Error("Existing shift result block was not found");
}

const dailyResult = String.raw`bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"clear-v3",style:{marginTop:10,border:"1px solid #DEDEF8",background:"linear-gradient(135deg, #F8F8FF 0%, #F2F3FF 100%)",borderRadius:16,padding:"12px",overflow:"hidden"},children:[i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"minmax(0, 1fr) auto",alignItems:"start",gap:10},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"#737A96"},children:"Результат смены"}),i.jsx("p",{style:{fontSize:10.5,color:"#737A96",marginTop:2},children:"до себестоимости товара"})]}),i.jsx("p",{style:{fontSize:20,fontWeight:900,color:bdShiftResult.resultBeforeCost>=0?"#16A34A":"#DC2626",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(bdShiftResult.resultBeforeCost)})]}),i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",columnGap:12,rowGap:8,borderTop:"1px solid #E4E5F5",marginTop:10,paddingTop:10},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"ФОТ"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.payroll)})]}),i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Налоги и коммунальные услуги"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.recurringAllocation)})]}),i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Прочие расходы"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.otherExpenses)})]}),i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Списания"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.writeoffs)})]})]})]})`;

revenueSegment =
  revenueSegment.slice(0, resultStart) +
  dailyResult +
  revenueSegment.slice(resultEnd);

replaceRevenueOnce(
  'className:"absolute top-3.5 right-12 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8",title:"Аудит ФОТ"',
  'className:"w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8",style:{position:"absolute",top:12,right:48},title:"Аудит ФОТ"',
);
replaceRevenueOnce(
  'className:"absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8",children:i.jsx(Ra,{size:14})',
  'className:"w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8",style:{position:"absolute",top:12,right:12},children:i.jsx(Ra,{size:14})',
);

source = source.slice(0, revenueStart) + revenueSegment + source.slice(revenueEnd);

replaceOnce('"data-bd-report-result":"clear-v2"', '"data-bd-report-result":"clear-v3"');
replaceOnce(
  'children:"Учтены ФОТ, списания, прочие расходы, налоги и коммунальные услуги. Закупки отдельно не вычитаются."',
  'children:"Учтены ФОТ, списания, прочие расходы, налоги и коммунальные услуги."',
);
replaceOnce(
  'children:"Закупленный товар войдёт в себестоимость после внесения остатков на конец месяца."',
  'children:"Себестоимость проданного товара будет рассчитана после внесения остатков на конец месяца."',
);

await writeFile(bundlePath, source);
console.log("Shift result layout v3 applied.");
