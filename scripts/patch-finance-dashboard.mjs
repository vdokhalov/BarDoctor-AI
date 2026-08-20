import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL(
  "../public/assets/index-BQGspy0I.js",
  import.meta.url,
);

let source = await readFile(bundlePath, "utf8");

if (source.includes("function bdFinanceWeekContext(")) {
  console.log("Finance dashboard patch is already applied.");
  process.exit(0);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Start marker not found: ${startMarker}`);
  }

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`End marker not found: ${endMarker}`);
  }

  source = source.slice(0, start) + replacement + source.slice(end);
}

const periodCards = String.raw`
const bdFinanceDayShort={1:"пн",2:"вт",3:"ср",4:"чт",5:"пт",6:"сб",7:"вс"};
function bdFinanceScheduleLabel(e){const t=e?.workingDays??Um,n=$se.filter(r=>t[r]!==!1);return n.length?n.map(r=>bdFinanceDayShort[r]).join(", "):"рабочие дни не выбраны"}
function bdFinanceScheduleDetail(e){const t=bdFinanceScheduleLabel(e);return e?.openTime&&e?.closeTime?t+" · "+e.openTime+"–"+e.closeTime:t}
function bdFinanceDateRangeLabel(e,t){const n=e.toLocaleDateString("ru-RU",{day:"numeric",month:"long"}),r=t.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});return e.getMonth()===t.getMonth()&&e.getFullYear()===t.getFullYear()?e.getDate()+"–"+r:n+" – "+r}
function bdFinanceShiftDate(e,t){const n=new Date(e+"T00:00:00");return n.setDate(n.getDate()+t),n}
function bdFinanceNextWorkingLabel(e,t){for(let n=0;n<15;n+=1){const r=new Date(t);r.setHours(0,0,0,0),r.setDate(r.getDate()+n);if(!Rg(e,r))continue;const a=$g(e,r,t);if(a.status!=="completed")return r.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric",month:"long"})}return null}
function bdFinanceWeekContext(e,t,n,r){const a=ec(t),s=new Date(a);s.setDate(s.getDate()+6),s.setHours(23,59,59,999);const l=new Date(t);l.setHours(23,59,59,999);const u=[],d=[];for(let m=new Date(a);m<=s;m.setDate(m.getDate()+1)){if(Rg(e,m)&&d.push(LS(m)),m>t)continue;const h=$g(e,m,t);h.status==="completed"&&u.push(h.bounds.operatingDate)}const f=new Set(u),g=n.filter(m=>f.has(m.date.slice(0,10))),y=wn(g,r,a,l);let j;const v=new Date(a);v.setDate(v.getDate()-7);const b=new Date(l);b.setDate(b.getDate()-7);if(u.length>0){const m=new Set(u.map(h=>LS(bdFinanceShiftDate(h,-7)))),N=n.filter(h=>m.has(h.date.slice(0,10)));j=wn(N,r,v,b)}return{week:y,prevWeek:j,weekStart:a,weekEnd:s,weekRangeLabel:bdFinanceDateRangeLabel(a,s),scheduleLabel:bdFinanceScheduleDetail(e),completedShifts:u.length,scheduledShifts:d.length,nextWorkingLabel:bdFinanceNextWorkingLabel(e,t)}}
function B2({title:e,s:t,prev:n,missingRevenueLabel:r,note:a}){const s=!!(r&&!t.hasRevenueData);return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка"}),i.jsxs("p",{className:s?"text-[13px] font-bold text-muted-foreground":"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[s?r:Mn(t.revenue)," ",!s&&i.jsx(rm,{percent:n?yd(t.revenue,n.revenue):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Закупки запасов"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[Mn(t.inventoryPurchases??0)," ",i.jsx(rm,{percent:n?yd(t.inventoryPurchases??0,n.inventoryPurchases??0):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Прочие операц. расходы"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[Mn(t.otherExpenses??0)," ",i.jsx(rm,{percent:n?yd(t.otherExpenses??0,n.otherExpenses??0):null})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Ср. чек"}),i.jsxs("p",{className:"text-[17px] font-black text-foreground flex items-center gap-1.5",children:[t.avgReceipt!==null?Mn(t.avgReceipt):"—",i.jsx(rm,{percent:n?yd(t.avgReceipt,n.avgReceipt):null})]})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Денежный поток (касса, не прибыль)"}),t.hasRevenueData?i.jsxs("p",{className:X("text-[17px] font-black flex items-center gap-1",(t.cashMovement??t.operatingDiff)>=0?"text-[#16A34A]":"text-destructive"),children:[(t.cashMovement??t.operatingDiff)>=0?i.jsx(Po,{size:14}):i.jsx(Bc,{size:14}),Mn(t.cashMovement??t.operatingDiff)]}):i.jsx("p",{className:"text-[13px] font-semibold text-muted-foreground",children:"Нет данных о выручке"})]}),i.jsxs("p",{className:"text-[11px] text-muted-foreground",children:[t.receipts," чеков",t.guests!==null?" · "+t.guests+" гостей":""," · смен с данными: ",t.daysWithData]}),a&&i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:a})]})}
`;

replaceBetween("function B2(", "function kAe(", periodCards);

const teamCard = String.raw`
function OAe({efficiency:e}){return e.staffedEmployees===0?i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-1.5",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:"Показатели команды за месяц"}),i.jsx("p",{className:"text-[13px] text-muted-foreground",children:"Нет смен с указанным составом персонала за этот период."})]}):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] p-4 flex flex-col gap-3",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide",children:"Показатели команды за месяц"}),i.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Выручка на 1 сотрудника"}),i.jsx("p",{className:"text-[15px] font-black text-foreground",children:e.revenuePerEmployee!==null?Mn(e.revenuePerEmployee):"—"})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Гостей на 1 сотрудника"}),i.jsx("p",{className:"text-[15px] font-black text-foreground",children:e.guestsPerEmployee!==null?e.guestsPerEmployee:"—"})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Чеков на 1 официанта"}),i.jsx("p",{className:"text-[15px] font-black text-foreground",children:e.checksPerWaiter!==null?e.checksPerWaiter:"—"})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] text-muted-foreground",children:"Уникальных сотрудников"}),i.jsx("p",{className:"text-[15px] font-black text-foreground",children:e.staffedEmployees})]})]}),(e.unitsPerSpecialist.length>0||e.departmentRevenuePerRole.length>0)&&i.jsxs("div",{className:"flex flex-col gap-1 pt-1 border-t border-border/60",children:[e.unitsPerSpecialist.map(t=>i.jsxs("div",{className:"flex items-center justify-between text-[13px]",children:[i.jsxs("span",{className:"text-foreground/80",children:[t.label," (",t.staffCount,")"]}),i.jsxs("span",{className:"font-bold text-foreground",children:[t.revenuePerStaff," шт./чел."]})]},"unit-"+t.label)),e.departmentRevenuePerRole.map(t=>i.jsxs("div",{className:"flex items-center justify-between text-[13px]",children:[i.jsxs("span",{className:"text-foreground/80",children:[t.label," (",t.staffCount,")"]}),i.jsxs("span",{className:"font-bold text-foreground",children:[Mn(t.revenuePerStaff),"/чел."]})]},"dept-"+t.label))]}),i.jsx("p",{className:"text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60",children:"Расчёт использует уникальных сотрудников, указанных в сменах за месяц. Это показатели команды, а не личные продажи каждого человека."})]})}
`;

replaceBetween("function OAe(", "function MAe(", teamCard);

const periodCalculation = String.raw`K=n?Ez(n,B):"non_working",Y=S.useMemo(()=>{const ve=new Date,Re=new Date(ve);Re.setHours(0,0,0,0);const ot=new Date(ve);ot.setHours(23,59,59,999);const Le=wn([],[],Re,Re),Rn=F?.periodEnd?wn(r,a,F.monthStart,F.periodEnd):Le,ie=Z?.periodEnd?wn(r,a,Z.monthStart,Z.periodEnd):void 0,lt=n?bdFinanceWeekContext(n,ve,r,a):null;return{day:wn(r,a,Re,ot),week:lt?.week??Le,month:Rn,prevWeek:lt?.prevWeek,prevMonth:ie,weekRangeLabel:lt?.weekRangeLabel??"",scheduleLabel:lt?.scheduleLabel??"",weekCompletedShifts:lt?.completedShifts??0,weekScheduledShifts:lt?.scheduledShifts??0,nextWorkingLabel:lt?.nextWorkingLabel??null}},[r,a,F,Z,n])`;

replaceBetween("K=n?Ez(n,B)", ",ne=toe(", periodCalculation);

const shortPeriods = String.raw`children:"Сегодня и текущая рабочая неделя"}),K==="completed"?i.jsx(B2,{title:"Сегодня",s:Y.day,missingRevenueLabel:"Выручка ещё не внесена"}):i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-4",children:[i.jsx("p",{className:"text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-1",children:"Сегодня"}),i.jsx("p",{className:"text-[13px] text-foreground/70",children:K==="non_working"?"Сегодня заведение не работает по указанному графику. Рабочие дни: "+Y.scheduleLabel+".":K==="active"?"Смена ещё идёт — данные появятся после закрытия.":"Сегодня рабочий день, но смена ещё не началась."})]}),i.jsx(B2,{title:"Текущая неделя · "+Y.weekRangeLabel,s:Y.week,prev:Y.week.hasRevenueData?Y.prevWeek:void 0,missingRevenueLabel:Y.weekCompletedShifts===0?"Завершённых смен пока нет":"Выручка не внесена",note:"График: "+Y.scheduleLabel+". Завершено рабочих смен: "+Y.weekCompletedShifts+" из "+Y.weekScheduledShifts+"."+(Y.nextWorkingLabel?" Ближайшая смена: "+Y.nextWorkingLabel+".":"")})`;

replaceBetween(
  'children:"Дополнительный контекст (не основной период)"',
  "]}),i.jsx(qe,{children:he",
  shortPeriods,
);

const chartCard = String.raw`
function am({title:e,data:t,color:n}){const r=t.map(l=>l.value).filter(l=>l!==null),a=r.length>=2,s=r.length?r[r.length-1]:null;return i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border p-3 flex flex-col gap-1",children:[i.jsx("p",{className:"text-[11px] font-bold text-muted-foreground uppercase tracking-wide",children:e}),a?i.jsxs(i.Fragment,{children:[i.jsx("p",{className:"text-[15px] font-black text-foreground",children:s!==null?Mn(Math.round(s)):"—"}),i.jsx("p",{className:"text-[10px] text-muted-foreground",children:"Последняя внесённая запись"}),i.jsx("div",{style:{width:"100%",height:32},children:i.jsx(_xe,{width:"100%",height:"100%",children:i.jsx(TAe,{data:t,children:i.jsx(Jf,{type:"monotone",dataKey:"value",stroke:n,strokeWidth:2,dot:!1,connectNulls:!0,isAnimationActive:!1})})})})]}):i.jsx("p",{className:"text-[12px] text-muted-foreground py-2",children:"Недостаточно данных"})]})}
`;

replaceBetween("function am(", "const IAe=", chartCard);

await writeFile(bundlePath, source);
console.log("Finance dashboard patch applied.");
