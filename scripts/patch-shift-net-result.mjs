import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-shift-result":"before-cost"')) {
  console.log("Shift result before cost patch is already applied.");
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

const monthlyReportModel = String.raw`
function bdBuildMonthlyReport(e,t,n,r,a,s,l=[]){const u=bdMonthMeta(t),d=n.filter(q=>q.date.slice(0,7)===t),f=r.filter(q=>q.date.slice(0,7)===t),m=[...a].sort((q,B)=>q.date.localeCompare(B.date)),h=m.find(q=>q.date===u.start)||null,g=m.find(q=>q.date===u.nextStart)||m.find(q=>q.date===u.end)||null,y=d.reduce((q,B)=>q+(Number(B.revenue)||0),0),j=d.reduce((q,B)=>q+(Number(B.receipts)||0),0),v=f.filter(q=>Gm(q.category)==="inventory"),b=f.filter(q=>q.category==="writeoff"),N=f.filter(q=>q.category==="taxes"),E=f.filter(q=>q.category==="utilities"),_=f.filter(q=>q.category==="payroll"),T=f.filter(q=>Gm(q.category)!=="inventory"&&!(["writeoff","taxes","utilities","payroll"].includes(q.category))),A=v.reduce((q,B)=>q+(Number(B.amount)||0),0),k=b.reduce((q,B)=>q+(Number(B.amount)||0),0),O=T.reduce((q,B)=>q+(Number(B.amount)||0),0),M=N.reduce((q,B)=>q+(Number(B.amount)||0),0),D=E.reduce((q,B)=>q+(Number(B.amount)||0),0),z=d.reduce((q,B)=>q+(Number(B.payrollBreakdown?.total??B.payrollBreakdown?.totalPayroll)||0),0),L=_.reduce((q,B)=>q+(Number(B.amount)||0),0),q=z>0?z:L,B=bdRecurringAmount(s.taxModel,M,y),U=bdRecurringAmount(s.utilityModel,D,y),H=h?bdSnapshotTotal(h):null,I=g?bdSnapshotTotal(g):null,V=H!==null&&I!==null?H+A-I-k:null,F=V!==null?y-V-k-q-O-B-U:null,Z=bdPlannedShiftDates(e,u),R=new Set(d.map(q=>q.date.slice(0,10))),K=new Set(l.filter(q=>q.resolved).map(q=>q.date.slice(0,10))),re=bdDateKey(new Date),pe=Z.filter(oe=>oe<re),Y=pe.filter(oe=>R.has(oe)||K.has(oe)).length,ne=pe.length?Math.round(Y/pe.length*100):100,ae=u.end<re,ce=ae&&h!==null&&g!==null&&ne===100,ge=[...new Set([...(s.inventorySections||[]),...Object.keys(h?.sections||{}),...Object.keys(g?.sections||{}),...v.map(q=>q.area||"Не распределено"),...b.map(q=>q.area||"Не распределено")])],ye=ge.map(q=>{const oe=bdSectionAmount(h,q),Q=v.filter(C=>(C.area||"Не распределено")===q).reduce((C,de)=>C+(Number(de.amount)||0),0),Qe=bdSectionAmount(g,q),Me=b.filter(C=>(C.area||"Не распределено")===q).reduce((C,de)=>C+(Number(de.amount)||0),0);return{section:q,opening:oe,purchases:Q,closing:Qe,writeoffs:Me,cost:h&&g?oe+Q-Qe-Me:null}}),je=Z.length?(B+U)/Z.length:0,ze=Z.length?B/Z.length:0,Q=Z.length?U/Z.length:0,Qe=[...new Set(d.map(C=>C.date.slice(0,10)))],Me=ze*Qe.length,De=Q*Qe.length,$=Me+De,et=y>0?Qe.map(C=>{const de=d.filter(x=>x.date.slice(0,10)===C),tt=de.reduce((x,w)=>x+(Number(w.revenue)||0),0),At=tt/y,st=V!==null?V*At:null,vt=b.filter(x=>x.date.slice(0,10)===C).reduce((x,w)=>x+(Number(w.amount)||0),0);let Ct=de.reduce((x,w)=>x+(Number(w.payrollBreakdown?.total??w.payrollBreakdown?.totalPayroll)||0),0);if(z===0)Ct=L*At;const Nt=T.filter(x=>x.date.slice(0,10)===C).reduce((x,w)=>x+(Number(w.amount)||0),0),Dt=tt-vt-Ct-Nt-je;return{date:C,revenue:tt,estimatedCost:st,writeoffs:vt,payroll:Ct,otherExpenses:Nt,taxAllocation:ze,utilityAllocation:Q,recurringAllocation:je,resultBeforeCost:Dt,estimatedResult:st===null?null:Dt-st}}).sort((C,de)=>de.date.localeCompare(C.date)):[],tt=y-k-q-O-$;return{meta:u,status:ce?"closed":"preliminary",isClosed:ce,periodPast:ae,revenue:y,receipts:j,purchases:A,writeoffs:k,otherExpenses:O,payroll:q,payrollSource:z>0?"По составу смен":"По внесённым расходам",taxes:B,utilities:U,taxMode:bdRecurringModeLabel(s.taxModel?.mode),utilityMode:bdRecurringModeLabel(s.utilityModel?.mode),openingSnapshot:h,closingSnapshot:g,openingInventory:H,closingInventory:I,costOfGoods:V,operatingResult:F,resultBeforeCost:tt,plannedShifts:Z.length,expectedShifts:pe.length,accountedShifts:Y,coveragePercent:ne,recurringPerShift:je,taxPerShift:ze,utilityPerShift:Q,dataShiftCount:Qe.length,allocatedTaxes:Me,allocatedUtilities:De,allocatedRecurring:$,unallocatedRecurring:Math.max(0,B+U-$),sections:ye,shiftEstimates:et}}
`;

replaceBetween(
  "function bdBuildMonthlyReport(",
  "function bdNextInventoryDate(",
  monthlyReportModel,
);

const payrollAwareReport = String.raw`const bdBuildMonthlyReportBeforePayroll=bdBuildMonthlyReport;
bdBuildMonthlyReport=function(e,t,n,r,a,s,l=[]){const u=bdBuildMonthlyReportBeforePayroll(e,t,n,r,a,s,l),d=bdPayrollEntriesForVenue(e,bdPayrollArrayStore()).filter(M=>M.date.slice(0,7)===t),f=bdPayrollEntryTotals(d),m=n.filter(M=>M.date.slice(0,7)===t).reduce((M,D)=>M+(Number(D.payrollBreakdown?.total??D.payrollBreakdown?.totalPayroll)||0),0),h=r.filter(M=>M.date.slice(0,7)===t&&M.category==="payroll").reduce((M,D)=>M+(Number(D.amount)||0),0),g=m>0?m:h,y=g+f.bonus,j=y-f.deductions,v=j-f.paid,b=y-u.payroll,N=u.operatingResult===null?null:u.operatingResult-b,E=u.resultBeforeCost==null?null:u.resultBeforeCost-b,_=u.shiftEstimates.map(M=>{const D=n.filter(z=>z.date.slice(0,10)===M.date.slice(0,10)),L=d.filter(z=>z.date.slice(0,10)===M.date.slice(0,10)&&z.type==="bonus").reduce((z,q)=>z+(Number(q.amount)||0),0),q=m>0?D.reduce((z,q)=>z+(Number(q.payrollBreakdown?.total??q.payrollBreakdown?.totalPayroll)||0),0)+L:M.payroll+L,B=q-M.payroll;return{...M,payroll:q,resultBeforeCost:M.resultBeforeCost==null?null:M.resultBeforeCost-B,estimatedResult:M.estimatedResult==null?null:M.estimatedResult-B}});return{...u,payroll:y,payrollBase:g,payrollBonuses:f.bonus,payrollDeductions:f.deductions,payrollNet:j,payrollPaid:f.paid,payrollBalance:v,payrollSource:(m>0?"По составу смен":"По внесённым расходам")+(f.bonus>0?" + премии":""),operatingResult:N,resultBeforeCost:E,shiftEstimates:_}};
`;

replaceBetween(
  "const bdBuildMonthlyReportBeforePayroll=bdBuildMonthlyReport;",
  "function BAe(",
  payrollAwareReport,
);

const periodCard = String.raw`
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a,report:o}){const s=!!(r&&!t.hasRevenueData),l=o?.resultBeforeCost??null;return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Закупки запасов"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[Mn(t.inventoryPurchases??0)," ",i.jsx(rm,{percent:n?yd(t.inventoryPurchases??0,n.inventoryPurchases??0):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Списания"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[Mn(t.writeoffs??0)," ",i.jsx(rm,{percent:n?yd(t.writeoffs??0,n.writeoffs??0):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Прочие операц. расходы"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[Mn(t.otherExpenses??0)," ",i.jsx(rm,{percent:n?yd(t.otherExpenses??0,n.otherExpenses??0):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Ср. чек"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[t.avgReceipt!==null?Mn(t.avgReceipt):"—",i.jsx(rm,{percent:n?yd(t.avgReceipt,n.avgReceipt):null})]})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Денежный поток (касса, не прибыль)"}),t.hasRevenueData?i.jsxs("p",{className:X("text-[17px] font-black flex items-center gap-1",(t.cashMovement??t.operatingDiff)>=0?"text-[#16A34A]":"text-destructive"),children:[(t.cashMovement??t.operatingDiff)>=0?i.jsx(Po,{size:14}):i.jsx(Bc,{size:14}),Mn(t.cashMovement??t.operatingDiff)]}):i.jsx("p",{className:"text-[13px] font-semibold text-muted-foreground",children:"Нет данных о выручке"})]}),l!==null&&i.jsxs("div",{"data-bd-month-result":"before-cost",className:"rounded-2xl bg-[#171A34] p-4 text-white",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-white/55",children:"Результат до себестоимости"}),i.jsx("p",{className:"text-[25px] font-black mt-1",style:{color:l>=0?"#4ADE80":"#FB7185"},children:Mn(l)}),i.jsx("p",{className:"text-[11px] text-white/65 mt-2 leading-relaxed",children:"Выручка минус ФОТ, списания, прочие расходы и начисленная доля налогов и коммунальных услуг."}),i.jsxs("p",{className:"text-[11px] text-white/45 mt-2",children:["Постоянные расходы учтены за ",o.dataShiftCount," внесённых смен: ",Mn(o.allocatedRecurring),". Себестоимость проданного товара ещё не вычтена."]})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCard);

replaceOnce(
  "{rules:j}=Do(),{toast:v}=sn(),[b,N]=S.useState",
  "{rules:j}=Do(),{toast:v}=sn(),{settings:bdFinanceSettings,snapshots:bdFinanceSnapshots}=bdUseAccountingStore(n),[b,N]=S.useState",
);

replaceOnce(
  "ne=toe(H.year,H.month),ae=S.useMemo(()=>r.filter(ve=>ve.date.slice(0,7)===ne),[r,ne]),ce=S.useMemo(()=>a.filter(ve=>ve.date.slice(0,7)===ne),[a,ne]),ge=S.useMemo",
  "ne=toe(H.year,H.month),ae=S.useMemo(()=>r.filter(ve=>ve.date.slice(0,7)===ne),[r,ne]),ce=S.useMemo(()=>a.filter(ve=>ve.date.slice(0,7)===ne),[a,ne]),bdCurrentMonthlyReport=S.useMemo(()=>n?bdBuildMonthlyReport(n,ne,r,a,bdFinanceSnapshots,bdFinanceSettings,s):null,[n,ne,r,a,bdFinanceSnapshots,bdFinanceSettings,s]),bdShiftResultByDate=S.useMemo(()=>new Map((bdCurrentMonthlyReport?.shiftEstimates??[]).map(ve=>[ve.date.slice(0,10),ve])),[bdCurrentMonthlyReport]),ge=S.useMemo",
);

replaceOnce(
  'i.jsx(B2,{title:"Этот месяц (с начала месяца)",s:Y.month,prev:Y.prevMonth})',
  'i.jsx(B2,{title:"Этот месяц (с начала месяца)",s:Y.month,prev:Y.prevMonth,report:bdCurrentMonthlyReport})',
);

replaceOnce(
  "ae.map(ve=>{const Re=Ym(ve),ot=n?Jle(ve,n):null;return i.jsxs",
  "ae.map(ve=>{const Re=Ym(ve),ot=n?Jle(ve,n):null,bdShiftResult=bdShiftResultByDate.get(ve.date.slice(0,10))??null;return i.jsxs",
);

replaceOnce(
  'ot&&i.jsxs("p",{className:"text-[12px] font-semibold text-primary/80 mt-0.5",children:["ФОТ: ",Mn(ot.totalPayroll),ot.payrollPercentOfRevenue!==null?` (${ot.payrollPercentOfRevenue}% от выручки)`:""]}),ve.note&&i.jsx',
  'ot&&i.jsxs("p",{className:"text-[12px] font-semibold text-primary/80 mt-0.5",children:["ФОТ: ",Mn(ot.totalPayroll),ot.payrollPercentOfRevenue!==null?` (${ot.payrollPercentOfRevenue}% от выручки)`:""]}),bdShiftResult&&i.jsxs("div",{"data-bd-shift-result":"before-cost",className:"mt-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2",children:[i.jsxs("div",{className:"flex items-center justify-between gap-3",children:[i.jsx("span",{className:"text-[11px] font-bold uppercase tracking-wide text-muted-foreground",children:"Результат до себестоимости"}),i.jsx("span",{className:"text-[15px] font-black",style:{color:bdShiftResult.resultBeforeCost>=0?"#16A34A":"#DC2626"},children:Mn(bdShiftResult.resultBeforeCost)})]}),i.jsxs("p",{className:"text-[10.5px] text-muted-foreground mt-1 leading-relaxed",children:["ФОТ ",Mn(bdShiftResult.payroll)," · налоги и коммунальные услуги ",Mn(bdShiftResult.recurringAllocation)," · прочие расходы ",Mn(bdShiftResult.otherExpenses)," · списания ",Mn(bdShiftResult.writeoffs)]})]}),ve.note&&i.jsx',
);

const preliminaryResult = String.raw`m.operatingResult!==null?i.jsxs("div",{className:"bg-[#171A34] rounded-[24px] p-5 text-white",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-white/50",children:m.isClosed?"Операционный результат месяца":"Расчётный результат — пока не финальный"}),i.jsx("p",{className:"text-[28px] font-black mt-2",style:{color:h},children:Mn(m.operatingResult)}),i.jsx("p",{className:"text-[12px] text-white/60 mt-2 leading-relaxed",children:"После себестоимости проданного, списаний, ФОТ, прочих расходов, налогов и коммунальных услуг."})]}):m.resultBeforeCost!==null?i.jsxs("div",{"data-bd-report-result":"before-cost",className:"bg-[#171A34] rounded-[24px] p-5 text-white",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-white/50",children:"Текущий результат до себестоимости"}),i.jsx("p",{className:"text-[28px] font-black mt-2",style:{color:m.resultBeforeCost>=0?"#4ADE80":"#FB7185"},children:Mn(m.resultBeforeCost)}),i.jsx("p",{className:"text-[12px] text-white/65 mt-2 leading-relaxed",children:"Уже вычтены ФОТ, списания, прочие расходы и доля налогов и коммунальных услуг по внесённым сменам."}),i.jsx("p",{className:"text-[11px] text-white/45 mt-2 leading-relaxed",children:"Это ещё не прибыль: себестоимость проданного товара будет вычтена после внесения остатков на конец периода."})]}):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-5",children:[i.jsx("p",{className:"text-[17px] font-black",children:"Результат пока не рассчитывается"}),i.jsx("p",{className:"text-[13px] text-muted-foreground mt-2 leading-relaxed",children:"Внесите выручку хотя бы одной завершённой смены."})]})`;

replaceBetween(
  'm.operatingResult!==null?i.jsxs("div",{className:"bg-[#171A34]',
  ',i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-4",children:[i.jsx("p",{className:"text-[13px] font-black uppercase tracking-wide text-muted-foreground mb-2",children:"Доходы и расходы"})',
  preliminaryResult,
);

const recurringCard = String.raw`i.jsxs("div",{"data-bd-recurring-impact":"current",className:"bg-card rounded-2xl border border-card-border p-4",children:[i.jsx("p",{className:"text-[13px] font-black uppercase tracking-wide text-muted-foreground",children:"Налоги и коммунальные услуги по сменам"}),i.jsxs("p",{className:"text-[22px] font-black text-primary mt-2",children:[Mn(m.recurringPerShift)," / плановую смену"]}),i.jsxs("div",{className:"grid grid-cols-2 gap-3 mt-3",children:[i.jsxs("div",{className:"rounded-xl bg-primary/5 p-3",children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Налоги"}),i.jsx("p",{className:"text-[14px] font-black mt-1",children:Mn(m.taxPerShift)+" / смену"})]}),i.jsxs("div",{className:"rounded-xl bg-primary/5 p-3",children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Коммунальные услуги"}),i.jsx("p",{className:"text-[14px] font-black mt-1",children:Mn(m.utilityPerShift)+" / смену"})]})]}),i.jsxs("p",{className:"text-[12px] text-foreground/80 mt-3 leading-relaxed",children:["В текущем результате уже учтено ",Mn(m.allocatedRecurring)," за ",m.dataShiftCount," внесённых смен."]}),m.unallocatedRecurring>0&&i.jsxs("p",{className:"text-[12px] text-muted-foreground mt-1 leading-relaxed",children:["На оставшиеся плановые смены ещё будет распределено ",Mn(m.unallocatedRecurring),"."]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/60 leading-relaxed",children:["В ",bdMonthDisplay(d)," по графику заведения ",m.plannedShifts," плановых смен. Полная месячная сумма распределяется между ними поровну."]})]})`;

replaceBetween(
  'i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-4",children:[i.jsx("p",{className:"text-[13px] font-black uppercase tracking-wide text-muted-foreground",children:"Налоги и коммунальные услуги по сменам"})',
  ',m.shiftEstimates.length>0&&i.jsxs("div",{className:"flex flex-col gap-3"',
  recurringCard,
);

replaceOnce(
  'children:"Месячная себестоимость распределена между сменами пропорционально выручке. Это управленческий ориентир, а не кассовый отчёт 1С."',
  'children:m.costOfGoods!==null?"Месячная себестоимость распределена между сменами пропорционально выручке. Это управленческий ориентир, а не кассовый отчёт 1С.":"Показан результат после ФОТ, списаний, прямых расходов, налогов и коммунальных услуг. Себестоимость проданного товара ещё не вычтена."',
);

replaceOnce(
  'style:{color:y.estimatedResult>=0?"#16A34A":"#DC2626"},children:Mn(y.estimatedResult)',
  'style:{color:(y.estimatedResult??y.resultBeforeCost)>=0?"#16A34A":"#DC2626"},children:Mn(y.estimatedResult??y.resultBeforeCost)',
);

replaceOnce(
  'children:["Выручка ",Mn(y.revenue)," · себестоимость ",Mn(y.estimatedCost)," · ФОТ ",Mn(y.payroll)," · постоянные ",Mn(y.recurringAllocation)]',
  'children:y.estimatedCost!==null?["Выручка ",Mn(y.revenue)," · себестоимость ",Mn(y.estimatedCost)," · ФОТ ",Mn(y.payroll)," · постоянные ",Mn(y.recurringAllocation)]:["Выручка ",Mn(y.revenue)," · ФОТ ",Mn(y.payroll)," · постоянные ",Mn(y.recurringAllocation)," · прямые расходы ",Mn(y.otherExpenses)," · без себестоимости"]',
);

await writeFile(bundlePath, source);
console.log("Shift result before cost patch applied.");
