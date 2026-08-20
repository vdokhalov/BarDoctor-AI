import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-shift-result":"clear-v2"')) {
  const brokenReportTail =
    '})]})):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-5"';
  if (source.includes(brokenReportTail)) {
    source = source.replace(
      brokenReportTail,
      '})]}):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-5"',
    );
    await writeFile(bundlePath, source);
    console.log("Shift result clarity patch syntax repaired.");
    process.exit(0);
  }
  console.log("Shift result clarity patch is already applied.");
  process.exit(0);
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
function bdMoney2(e){return Mn(Math.round((Number(e)||0)*100)/100)}
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a,report:o}){const s=!!(r&&!t.hasRevenueData),l=o?.resultBeforeCost??null;return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Средний чек"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:t.avgReceipt!==null?Mn(t.avgReceipt):"—"})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Прочие расходы"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.otherExpenses??0)})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Списания"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.writeoffs??0)})]}),i.jsxs("div",{style:{gridColumn:"1 / -1",border:"1px solid #E1E3F5",background:"#F8F8FF",borderRadius:14,padding:"12px 14px"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsx("p",{style:{fontSize:11,color:"#737A96",fontWeight:800,textTransform:"uppercase",letterSpacing:".06em"},children:"Закупки запасов — справочно"}),i.jsx("p",{style:{fontSize:16,fontWeight:900,color:"#171A34",whiteSpace:"nowrap"},children:bdMoney2(t.inventoryPurchases??0)})]}),i.jsx("p",{style:{fontSize:11,color:"#737A96",lineHeight:1.45,marginTop:4},children:"Это пополнение запасов. Из результата смен закупки отдельно не вычитаются."})]})]}),l!==null&&i.jsxs("div",{"data-bd-month-result":"clear-v2",style:{borderRadius:20,background:"linear-gradient(135deg, #171A34 0%, #282D66 100%)",padding:"16px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.62)"},children:"Результат смен до себестоимости"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.72)",marginTop:4},children:"После ФОТ и расходов по внесённым сменам"})]}),i.jsx("p",{style:{fontSize:25,fontWeight:900,color:l>=0?"#4ADE80":"#FB7185",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(l)})]}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",margin:"12px 0 10px"}}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.78)",lineHeight:1.5},children:"Вычтены ФОТ, списания, прочие расходы и доля налогов и коммунальных услуг. Закупки не вычтены."}),i.jsxs("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:["Постоянные расходы учтены за ",o.dataShiftCount," смен: ",bdMoney2(o.allocatedRecurring),". Себестоимость проданного будет рассчитана после внесения конечных остатков."]})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCard);

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

replaceRevenueOnce(
  'className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"',
  'className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] px-4 py-3.5 relative cursor-pointer hover:border-primary/30 transition-colors"',
);
replaceRevenueOnce('className:"flex-1 min-w-0"', 'className:"min-w-0 pr-20"');

const resultStart = revenueSegment.indexOf(
  'bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"before-cost"',
);
const resultEnd = revenueSegment.indexOf(',ve.note&&i.jsx', resultStart);
if (resultStart === -1 || resultEnd === -1) {
  throw new Error("Existing shift result block was not found");
}

const dailyResult = String.raw`bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"clear-v2",style:{marginTop:10,marginRight:"-5rem",border:"1px solid #DEDEF8",background:"linear-gradient(135deg, #F8F8FF 0%, #F2F3FF 100%)",borderRadius:16,padding:"12px 13px"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"#737A96"},children:"Результат смены"}),i.jsx("p",{style:{fontSize:10.5,color:"#737A96",marginTop:2},children:"до себестоимости товара"})]}),i.jsx("p",{style:{fontSize:21,fontWeight:900,color:bdShiftResult.resultBeforeCost>=0?"#16A34A":"#DC2626",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(bdShiftResult.resultBeforeCost)})]}),i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",gap:7,marginTop:10},children:[i.jsxs("div",{style:{background:"rgba(255,255,255,.78)",borderRadius:10,padding:"7px 8px"},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"ФОТ"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.payroll)})]}),i.jsxs("div",{style:{background:"rgba(255,255,255,.78)",borderRadius:10,padding:"7px 8px"},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Налоги + коммунальные услуги"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.recurringAllocation)})]}),i.jsxs("div",{style:{background:"rgba(255,255,255,.78)",borderRadius:10,padding:"7px 8px"},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Прочие расходы"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.otherExpenses)})]}),i.jsxs("div",{style:{background:"rgba(255,255,255,.78)",borderRadius:10,padding:"7px 8px"},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Списания"}),i.jsx("p",{style:{fontSize:12,fontWeight:800,color:"#242842",marginTop:1},children:bdMoney2(bdShiftResult.writeoffs)})]})]}),i.jsx("p",{style:{fontSize:10,color:"#5B54D9",fontWeight:700,lineHeight:1.4,marginTop:9},children:"Закупки запасов в расчёт этой смены не входят."})]})`;

revenueSegment =
  revenueSegment.slice(0, resultStart) +
  dailyResult +
  revenueSegment.slice(resultEnd);

replaceRevenueOnce(
  'className:"w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8",title:"Аудит ФОТ"',
  'className:"absolute top-3.5 right-12 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8",title:"Аудит ФОТ"',
);
replaceRevenueOnce(
  'className:"w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8",children:i.jsx(Ra,{size:14})',
  'className:"absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8",children:i.jsx(Ra,{size:14})',
);

source = source.slice(0, revenueStart) + revenueSegment + source.slice(revenueEnd);

const reportResult = String.raw`m.resultBeforeCost!==null?i.jsxs("div",{"data-bd-report-result":"clear-v2",style:{borderRadius:22,background:"linear-gradient(135deg, #171A34 0%, #282D66 100%)",padding:"18px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.62)"},children:"Текущий результат"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.72)",marginTop:4},children:"до себестоимости товара"})]}),i.jsx("p",{style:{fontSize:27,fontWeight:900,color:m.resultBeforeCost>=0?"#4ADE80":"#FB7185",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(m.resultBeforeCost)})]}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.76)",lineHeight:1.5,marginTop:12},children:"Учтены ФОТ, списания, прочие расходы, налоги и коммунальные услуги. Закупки отдельно не вычитаются."}),i.jsx("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:"Закупленный товар войдёт в себестоимость после внесения остатков на конец месяца."})]}`;

replaceBetween(
  'm.resultBeforeCost!==null?i.jsxs("div",{"data-bd-report-result":"before-cost"',
  '):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-5"',
  reportResult,
);

replaceOnce("Mn(m.recurringPerShift)", "bdMoney2(m.recurringPerShift)");
replaceOnce("Mn(m.taxPerShift)", "bdMoney2(m.taxPerShift)");
replaceOnce("Mn(m.utilityPerShift)", "bdMoney2(m.utilityPerShift)");
replaceOnce("Mn(m.allocatedRecurring)", "bdMoney2(m.allocatedRecurring)");
replaceOnce("Mn(m.unallocatedRecurring)", "bdMoney2(m.unallocatedRecurring)");
replaceOnce(
  "Mn(y.estimatedResult??y.resultBeforeCost)",
  "bdMoney2(y.estimatedResult??y.resultBeforeCost)",
);

await writeFile(bundlePath, source);
console.log("Shift result clarity patch applied.");
