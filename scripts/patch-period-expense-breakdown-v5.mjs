import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-month-result":"expenses-v5"')) {
  const sharedLabelLookup = 'const a=Lg[r.category]||"Прочее"';
  if (source.includes(sharedLabelLookup)) {
    source = source.replace(
      sharedLabelLookup,
      'const a=({rent:"Аренда",repairs:"Ремонт",equipment:"Оборудование",marketing:"Маркетинг",entertainment:"Развлекательная программа",security:"Охрана",cleaning:"Уборка",transport:"Транспорт",other:"Прочее"})[r.category]||"Прочее"',
    );
    await writeFile(bundlePath, source);
    console.log("Period expense category labels made self-contained.");
    process.exit(0);
  }
  console.log("Period expense breakdown v5 is already applied.");
  process.exit(0);
}

if (!source.includes('"data-bd-month-result":"period-v4"')) {
  throw new Error("Period and shift expense rules v4 must be applied first.");
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

const breakdownHelper = String.raw`
function bdPeriodExpenseBreakdown(e,t){const n=new Map;for(const r of e){const a=r.area||"Не распределено";n.set(a,(n.get(a)||0)+(Number(r.amount)||0))}for(const r of t){const a=({rent:"Аренда",repairs:"Ремонт",equipment:"Оборудование",marketing:"Маркетинг",entertainment:"Развлекательная программа",security:"Охрана",cleaning:"Уборка",transport:"Транспорт",other:"Прочее"})[r.category]||"Прочее";n.set(a,(n.get(a)||0)+(Number(r.amount)||0))}return[...n.entries()].map(([r,a])=>({label:r,amount:a})).filter(r=>r.amount!==0).sort((r,a)=>a.amount-r.amount)}
`;
replaceOnce(
  "function bdBuildMonthlyReport",
  breakdownHelper + "function bdBuildMonthlyReport",
);

replaceOnce(
  "purchases:A,writeoffs:k,otherExpenses:O",
  "purchases:A,periodExpenses:A+O,expenseBreakdown:bdPeriodExpenseBreakdown(v,T),writeoffs:k,otherExpenses:O",
);

const periodCard = String.raw`
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a,report:o}){const s=!!(r&&!t.hasRevenueData),l=o?.resultBeforeCost??null,u=o?.periodExpenses??((t.inventoryPurchases??0)+(t.otherExpenses??0)),d=o?.expenseBreakdown??[];return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Средний чек"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:t.avgReceipt!==null?Mn(t.avgReceipt):"—"})]}),o&&i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Расходы за период"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(u)})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Списания"}),i.jsx("p",{className:"text-[17px] font-black text-foreground",children:bdMoney2(t.writeoffs??0)})]})]}),o&&i.jsx("p",{style:{fontSize:10.5,color:"#7C829B",lineHeight:1.45},children:"В одной сумме собраны закупки запасов и остальные накопительные расходы. ФОТ, налоги, коммунальные услуги и списания показываются отдельно."}),o&&d.length>0&&i.jsxs("div",{"data-bd-expense-breakdown":"period-v5",style:{border:"1px solid #E4E5F2",background:"#F8F8FC",borderRadius:14,padding:"11px 13px"},children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:"#737A96",marginBottom:7},children:"Расшифровка расходов"}),d.map(f=>i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"4px 0",fontSize:11.5},children:[i.jsx("span",{style:{color:"#737A96"},children:f.label}),i.jsx("strong",{style:{color:"#171A34",whiteSpace:"nowrap"},children:bdMoney2(f.amount)})]},f.label))]}),l!==null&&i.jsxs("div",{"data-bd-month-result":"expenses-v5",style:{borderRadius:20,background:"linear-gradient(145deg, #171A34 0%, #292E68 100%)",padding:"16px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)",overflow:"hidden"},children:[i.jsx("p",{style:{fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.62)"},children:"Результат внесённых смен"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.72)",marginTop:3},children:"до себестоимости проданного товара"}),i.jsx("p",{style:{fontSize:28,fontWeight:900,color:l>=0?"#4ADE80":"#FB7185",lineHeight:1.1,marginTop:12,overflowWrap:"anywhere"},children:bdMoney2(l)}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",margin:"13px 0 10px"}}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.78)",lineHeight:1.5},children:"Учтены ФОТ, списания, накопительные расходы и распределённая доля налогов и коммунальных услуг."}),i.jsxs("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:["Постоянные расходы учтены за ",o.dataShiftCount," смен: ",bdMoney2(o.allocatedRecurring),". Закупленная часть расходов войдёт в себестоимость после внесения конечных остатков."]})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCard);

replaceOnce(
  'i.jsx(bdReportLine,{label:"Закупки запасов (денежный поток)",value:Mn(m.purchases)}),i.jsx(bdReportLine,{label:"Списания",value:Mn(m.writeoffs)})',
  'i.jsx(bdReportLine,{label:"Расходы за период",value:Mn(m.periodExpenses),strong:!0}),m.expenseBreakdown.length>0&&i.jsxs("div",{className:"my-2 rounded-xl bg-muted/50 px-3 py-2",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1",children:"Расшифровка расходов"}),m.expenseBreakdown.map(y=>i.jsx(bdReportLine,{label:y.label,value:Mn(y.amount)},y.label))]}),i.jsx(bdReportLine,{label:"Списания",value:Mn(m.writeoffs)})',
);

replaceOnce(
  'i.jsx(bdReportLine,{label:"Накопительные расходы",value:Mn(m.otherExpenses)}),',
  "",
);

await writeFile(bundlePath, source);
console.log("Period expense breakdown v5 applied.");
