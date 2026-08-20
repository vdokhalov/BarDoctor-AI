import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-finance-results":"three-v14"')) {
  console.log("Three-result financial model v14 is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  }
  source =
    source.slice(0, index) + replacement + source.slice(index + search.length);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceOnce(
  "operatingResult:F,resultBeforeCost:tt,plannedShifts",
  "operatingResult:F,resultBeforeCost:tt,cashResult:tt-A,plannedShifts",
);

replaceOnce(
  "N=u.operatingResult===null?null:u.operatingResult-b,E=u.resultBeforeCost==null?null:u.resultBeforeCost-b,_=u.shiftEstimates.map",
  "N=u.operatingResult===null?null:u.operatingResult-b,E=u.resultBeforeCost==null?null:u.resultBeforeCost-b,G=u.cashResult==null?null:u.cashResult-b,_=u.shiftEstimates.map",
);

replaceOnce(
  "operatingResult:N,resultBeforeCost:E,shiftEstimates:_",
  "operatingResult:N,resultBeforeCost:E,cashResult:G,shiftEstimates:_",
);

const resultStack = String.raw`
function bdFinanceResultStack({report:e,compact:t=!1}){const n=e.cashResult??(e.resultBeforeCost==null?null:e.resultBeforeCost-(Number(e.purchases)||0)),r=e.resultBeforeCost??null,a=e.operatingResult??null,s=a!==null&&e.isClosed,l=a!==null&&!e.isClosed,u=e.openingInventory===null&&e.closingInventory===null?"Нужны остатки на начало и конец месяца":e.openingInventory===null?"Нужны остатки на начало месяца":"Нужны остатки на конец месяца";return i.jsxs("section",{"data-bd-finance-results":"three-v14",className:"flex flex-col gap-2.5",children:[i.jsxs("div",{style:{borderRadius:t?18:22,background:"linear-gradient(135deg, #171A34 0%, #292E68 100%)",padding:t?"15px":"18px",color:"#FFFFFF",boxShadow:"0 14px 34px rgba(23,26,52,.18)",overflow:"hidden"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:850,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.58)"},children:"1 · Денежный результат"}),i.jsx("p",{style:{fontSize:11,color:"rgba(255,255,255,.76)",marginTop:3},children:"после всех внесённых расходов"})]}),n!==null&&i.jsx("p",{style:{fontSize:t?25:29,fontWeight:900,color:n>=0?"#4ADE80":"#FB7185",whiteSpace:"nowrap",lineHeight:1.05},children:bdMoney2(n)})]}),i.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",margin:"13px 0 10px"}}),i.jsx("p",{style:{fontSize:11.5,color:"rgba(255,255,255,.78)",lineHeight:1.5},children:"Здесь полностью вычтены закупки бара, кухни и кальянов, ФОТ, списания, накопительные расходы, налоги и коммунальные услуги."}),i.jsx("p",{style:{fontSize:10.5,color:"rgba(255,255,255,.5)",lineHeight:1.45,marginTop:6},children:"Показывает, сколько осталось после всех внесённых затрат. Это не прибыль: часть закупок ещё находится в остатках."})]}),i.jsxs("div",{style:{border:"1px solid #DEDEF8",background:"linear-gradient(135deg, #F8F8FF 0%, #F1F2FF 100%)",borderRadius:t?16:19,padding:t?"13px":"15px"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:850,letterSpacing:".07em",textTransform:"uppercase",color:"#686F91"},children:"2 · Предварительный результат"}),i.jsx("p",{style:{fontSize:10.5,color:"#7C829B",marginTop:3},children:"до себестоимости проданного"})]}),r!==null&&i.jsx("p",{style:{fontSize:t?21:24,fontWeight:900,color:r>=0?"#16A34A":"#DC2626",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(r)})]}),i.jsx("p",{style:{fontSize:10.8,color:"#6F7692",lineHeight:1.45,marginTop:9},children:"Закупки запасов здесь не вычитаются целиком. Их проданная часть станет себестоимостью после внесения конечных остатков."})]}),a!==null?i.jsxs("div",{style:{border:"1px solid "+(s?"#BBF7D0":"#D8DCE8"),background:s?"#F0FDF4":"#F8FAFC",borderRadius:t?16:19,padding:t?"13px":"15px"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:850,letterSpacing:".07em",textTransform:"uppercase",color:s?"#15803D":"#64748B"},children:"3 · Финальная прибыль"}),i.jsx("p",{style:{fontSize:10.5,color:"#7C829B",marginTop:3},children:s?"месяц закрыт":l?"расчёт по внесённым остаткам":""})]}),i.jsx("p",{style:{fontSize:t?21:24,fontWeight:900,color:a>=0?"#16A34A":"#DC2626",whiteSpace:"nowrap",lineHeight:1.1},children:bdMoney2(a)})]}),i.jsxs("p",{style:{fontSize:10.8,color:"#6F7692",lineHeight:1.45,marginTop:9},children:["Учтена себестоимость проданного товара",e.costOfGoods!==null?" "+bdMoney2(e.costOfGoods):"",", а также все остальные расходы."]})]}):i.jsxs("div",{style:{border:"1px dashed #C9CEDD",background:"#FAFBFD",borderRadius:t?16:19,padding:t?"13px":"15px"},children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:850,letterSpacing:".07em",textTransform:"uppercase",color:"#7C829B"},children:"3 · Финальная прибыль"}),i.jsx("p",{style:{fontSize:t?17:19,fontWeight:850,color:"#2D334E",marginTop:6},children:"Пока не рассчитана"}),i.jsx("p",{style:{fontSize:10.8,color:"#7C829B",lineHeight:1.45,marginTop:5},children:u+". После этого приложение рассчитает себестоимость проданного товара и финальную прибыль."})]})]})}
`;

replaceOnce("function B2(", resultStack + "function B2(");

replaceBetween(
  'l!==null&&i.jsxs("div",{"data-bd-month-result":"expenses-v5"',
  ',i.jsxs("p",{className:"text-[11px] text-muted-foreground"',
  'l!==null&&i.jsx(bdFinanceResultStack,{report:o,compact:!0})',
);

const reportResult = String.raw`m.resultBeforeCost!==null?i.jsx(bdFinanceResultStack,{report:m}):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-5",children:[i.jsx("p",{className:"text-[17px] font-black",children:"Результат пока не рассчитывается"}),i.jsx("p",{className:"text-[13px] text-muted-foreground mt-2 leading-relaxed",children:"Внесите выручку хотя бы одной завершённой смены."})]})`;

replaceBetween(
  'm.operatingResult!==null?i.jsxs("div",{className:"bg-[#171A34]',
  ',i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-4",children:[i.jsx("p",{className:"text-[13px] font-black uppercase tracking-wide text-muted-foreground mb-2",children:"Доходы и расходы"})',
  reportResult,
);

const homeKpis = String.raw`function bdHomeKpis({report:e,health:t}){const n=e.revenue>0?Math.round(e.revenue/Math.max(1,e.receipts)):null,r=e.revenue>0?Math.round(e.payroll/e.revenue*1e3)/10:null,a=e.revenue>0?e.cashResult:null,s=e.revenue>0?e.resultBeforeCost:null;return i.jsxs("section",{"data-bd-home-kpis":"month-v14",className:"flex flex-col gap-3",children:[i.jsxs("div",{className:"flex items-end justify-between px-1 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-500",children:"Главное за месяц"}),i.jsx("h2",{className:"text-[20px] font-black tracking-tight text-slate-950 mt-1",children:bdMonthDisplay(e.meta.key)})]}),i.jsxs("span",{className:"text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1",children:[e.accountedShifts,"/",e.expectedShifts," смен"]})]}),i.jsxs("div",{className:"home-card overflow-hidden",children:[i.jsxs("div",{className:"grid grid-cols-2 divide-x divide-slate-100",children:[i.jsxs(W.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.42,delay:.08},className:"p-4 min-w-0",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-slate-400",children:"Выручка"}),i.jsx("p",{className:"text-[24px] font-black tracking-[-0.04em] text-slate-950 mt-1.5 break-words",children:e.revenue>0?GM(e.revenue):"—"}),i.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:e.receipts>0?e.receipts+" чеков":"Нет внесённых чеков"})]}),i.jsxs(W.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.42,delay:.16},className:"p-4 min-w-0",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-slate-400",children:"После всех расходов"}),i.jsx("p",{className:"text-[24px] font-black tracking-[-0.04em] mt-1.5 break-words",style:{color:bdHomeMetricTone(a)},children:bdHomeSignedMoney(a)}),i.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:"Закупки запасов вычтены"})]})]}),i.jsx("div",{className:"border-t border-slate-100 px-3 py-3 grid grid-cols-3 gap-2",children:[{label:"До себестоимости",value:bdHomeSignedMoney(s),tone:bdHomeMetricTone(s)},{label:"ФОТ",value:r!==null?r+"%":"—",tone:r!==null&&r>35?"#D97706":"#0F766E"},{label:"Полнота",value:t.coveragePercent+"%",tone:t.coveragePercent>=60?"#4F46E5":"#D97706"}].map((l,u)=>i.jsxs(W.div,{initial:{opacity:0,scale:.94},animate:{opacity:1,scale:1},transition:{duration:.32,delay:.22+u*.06},className:"rounded-2xl bg-slate-50 px-2.5 py-2.5 min-w-0",children:[i.jsx("p",{className:"text-[9.5px] font-bold text-slate-400 leading-tight",children:l.label}),i.jsx("p",{className:"text-[14px] font-black mt-1 truncate",style:{color:l.tone},children:l.value})]},l.label))})]})]})}`;

replaceBetween("function bdHomeKpis(", "function bdHomeAttention(", homeKpis);

replaceOnce(
  "h=e.revenue>0?e.resultBeforeCost:null,g=e.isClosed",
  "h=e.revenue>0?e.cashResult:null,g=e.isClosed",
);

replaceOnce(
  'detail:"Результат до себестоимости товара",href:"/finance"',
  'detail:"После всех внесённых расходов и закупок",href:"/finance"',
);

await writeFile(bundlePath, source);
console.log("Three-result financial model v14 applied.");
