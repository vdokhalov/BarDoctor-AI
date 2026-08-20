import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(label, search, replacement) {
  const index = source.indexOf(search);
  if (index < 0) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.slice(0, index) + replacement + source.slice(index + search.length);
}

source = source.replaceAll('/finance?tab=shifts', '/shifts');
source = source.replaceAll('/finance?closeShift=1', '/shifts?closeShift=1');

const oldShiftsActive = 'm.key==="shifts"?e==="/finance"&&l:';
if (source.includes(oldShiftsActive)) {
  replaceOnce(
    "активный пункт Смены",
    oldShiftsActive,
    'm.key==="shifts"?e==="/shifts"||e.startsWith("/finance/shift/"):',
  );
}

const oldFinanceActive = 'm.key==="finance"?e.startsWith("/finance")&&!l||';
if (source.includes(oldFinanceActive)) {
  replaceOnce(
    "активный пункт Финансы",
    oldFinanceActive,
    'm.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||',
  );
}

const shiftsPage = `function bdShiftsPage(){
const[,navigate]=bt(),location=ste(),{profile}=Un(),{revenue,gapReasons,upsertDailyRevenue}=Ur(),{employees}=_i(),{rules}=Do(),{toast}=sn(),[sheet,setSheet]=S.useState(null),[editing,setEditing]=S.useState(void 0),now=new Date,months=S.useMemo(()=>{const rows=[];for(let offset=0;offset<6;offset++){const date=new Date(now.getFullYear(),now.getMonth()-offset,1);rows.push({year:date.getFullYear(),month:date.getMonth()+1})}return rows},[now.getFullYear(),now.getMonth()]),[selected,setSelected]=S.useState(months[0]);
S.useEffect(()=>{const params=new URLSearchParams(location);if(params.get("closeShift")==="1"){setEditing(void 0);setSheet("revenue")}},[location]);
const period=S.useMemo(()=>profile?wo(profile,now,selected.year,selected.month):null,[profile,selected.year,selected.month]),coverage=S.useMemo(()=>profile&&period?kC(profile,revenue,gapReasons,now,period):null,[profile,period,revenue,gapReasons]),monthKey=toe(selected.year,selected.month),records=S.useMemo(()=>ss(revenue.filter(row=>row.date.slice(0,7)===monthKey)),[revenue,monthKey]),totals=S.useMemo(()=>records.reduce((result,row)=>({revenue:result.revenue+(Number(row.revenue)||0),receipts:result.receipts+(Number(row.receipts)||0)}),{revenue:0,receipts:0}),[records]),areas=profile?.areas??[];
function closeSheet(){setSheet(null);setEditing(void 0);navigate("/shifts")}
function saveShift(values){const saved=upsertDailyRevenue(values,editing?.id);toast(saved?{variant:"success",title:editing?"Смена обновлена":"Смена закрыта",description:"Данные смены добавлены в отчёты и расчёты."}:{variant:"warning",title:"Мало памяти",description:"Запись сохранена только в текущей сессии."});closeSheet()}
function openShift(row){setEditing(row);setSheet("revenue")}
return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsxs($e,{className:"pt-0",children:[
i.jsxs("div",{className:"sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button",onClick:()=>navigate("/home"),className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(js,{size:16,className:"text-foreground"})}),i.jsxs("div",{style:{minWidth:0},children:[i.jsx("h1",{className:"text-[20px] font-black text-foreground tracking-tight",children:"Смены"}),i.jsx("p",{style:{marginTop:2,fontSize:11,color:"#7C8498"},children:"Закрытие и история рабочих смен"})]})]}),
i.jsx("div",{className:"px-6 pt-4 flex items-center gap-2 overflow-x-auto",children:months.map(row=>{const active=row.year===selected.year&&row.month===selected.month;return i.jsx("button",{type:"button",onClick:()=>setSelected(row),className:X("flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold border transition-all",active?"bg-primary text-white border-primary":"bg-card border-border text-foreground"),children:Jl(row.year,row.month)},row.year+"-"+row.month)})}),
i.jsx("div",{className:"px-6 pt-4",children:i.jsxs("button",{type:"button",onClick:()=>{setEditing(void 0);setSheet("revenue")},style:{width:"100%",minHeight:52,border:0,borderRadius:18,background:"linear-gradient(135deg,#655FF6 0%,#5049E8 100%)",color:"#fff",fontSize:14,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 12px 26px rgba(91,85,245,.22)"},children:[i.jsx(Vt,{size:18}),"Закрыть смену"]})}),
i.jsxs("section",{"data-bd-shifts-page":"v24",style:{margin:"14px 24px 0",borderRadius:22,border:"1px solid #E4E6EF",background:"#FFFFFF",padding:16,boxShadow:"0 10px 28px rgba(23,31,56,.06)"},children:[i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14},children:[i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em",color:"#8A90A8"},children:"Закрыто смен"}),i.jsx("p",{style:{fontSize:24,fontWeight:900,color:"#111827",marginTop:3},children:records.length})]}),i.jsxs("div",{children:[i.jsx("p",{style:{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em",color:"#8A90A8"},children:"Выручка"}),i.jsx("p",{style:{fontSize:20,fontWeight:900,color:"#111827",marginTop:5,overflowWrap:"anywhere"},children:Mn(totals.revenue)})]})]}),coverage&&i.jsxs("div",{style:{borderTop:"1px solid #EEF0F5",marginTop:14,paddingTop:12},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsx("span",{style:{fontSize:11,color:"#7C8498",fontWeight:700},children:"Заполнено по графику"}),i.jsxs("span",{style:{fontSize:12,color:coverage.unexplainedGaps>0?"#D97706":"#16A34A",fontWeight:900},children:[coverage.revenueEntered+coverage.explainedClosures," из ",coverage.scheduledCompletedShifts]})]}),i.jsx("div",{style:{height:6,borderRadius:999,background:"#EEF0F6",overflow:"hidden",marginTop:8},children:i.jsx("span",{style:{display:"block",height:"100%",width:Math.min(100,coverage.coveragePercent)+"%",borderRadius:999,background:coverage.unexplainedGaps>0?"linear-gradient(90deg,#F0B84A,#F59E0B)":"linear-gradient(90deg,#48D7C2,#22C55E)"}})}),coverage.unexplainedGaps>0&&i.jsxs("p",{style:{fontSize:10.5,lineHeight:1.35,color:"#9A6A13",marginTop:8},children:["Не заполнено или не объяснено: ",coverage.unexplainedGaps]})]})]}),
i.jsxs("div",{style:{padding:"22px 24px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsx("h2",{style:{fontSize:17,lineHeight:1.2,fontWeight:900,color:"#111827"},children:"История смен"}),i.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#8A90A8"},children:[totals.receipts," чеков"]})]}),
i.jsx("div",{style:{padding:"0 24px",display:"flex",flexDirection:"column",gap:10},children:records.length===0?i.jsxs("div",{style:{borderRadius:20,border:"1px dashed #D9DCE8",background:"#FFFFFF",padding:"26px 18px",textAlign:"center"},children:[i.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#242842"},children:"Закрытых смен пока нет"}),i.jsx("p",{style:{fontSize:11.5,lineHeight:1.4,color:"#8A90A8",marginTop:5},children:"После закрытия смены здесь появятся выручка, чеки, команда и ФОТ."})]}):records.map(row=>{const avg=Ym(row),payroll=profile?Jle(row,profile):null,staffNames=(row.staffing??[]).map(item=>{const employee=employees.find(person=>person.id===item.employeeId);return employee?.name||[employee?.firstName,employee?.lastName].filter(Boolean).join(" ")||"Сотрудник"});return i.jsxs(W.div,{layout:!0,initial:{opacity:0,y:6},animate:{opacity:1,y:0},onClick:()=>openShift(row),style:{position:"relative",borderRadius:20,border:"1px solid #E4E6EF",background:"#FFFFFF",padding:15,paddingRight:48,boxShadow:"0 8px 24px rgba(23,31,56,.055)",cursor:"pointer",overflow:"hidden"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10},children:[i.jsxs("div",{style:{minWidth:0},children:[i.jsx("p",{style:{fontSize:15,fontWeight:900,color:"#111827"},children:sg(row.date)}),i.jsxs("p",{style:{fontSize:11.5,color:"#7C8498",marginTop:3},children:[row.receipts," чеков",avg!==null?" · ср. чек "+Mn(avg):""]})]}),i.jsx("span",{style:{flexShrink:0,borderRadius:999,background:"#EAF8F0",color:"#168A4A",padding:"4px 8px",fontSize:9.5,fontWeight:900},children:"Закрыта"})]}),i.jsx("p",{style:{fontSize:24,lineHeight:1.1,fontWeight:950,color:"#111827",marginTop:12,overflowWrap:"anywhere"},children:Mn(row.revenue)}),i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:12},children:[i.jsxs("div",{style:{borderRadius:13,background:"#F6F7FB",padding:"9px 10px",minWidth:0},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"ФОТ"}),i.jsx("p",{style:{fontSize:12,fontWeight:850,color:"#242842",marginTop:2,overflowWrap:"anywhere"},children:payroll?Mn(payroll.totalPayroll):"Не рассчитан"})]}),i.jsxs("div",{style:{borderRadius:13,background:"#F6F7FB",padding:"9px 10px",minWidth:0},children:[i.jsx("p",{style:{fontSize:9.5,color:"#8A90A8"},children:"Команда"}),i.jsxs("p",{style:{fontSize:12,fontWeight:850,color:"#242842",marginTop:2},children:[payroll?.staffCount??staffNames.length," чел."]})]})]}),staffNames.length>0&&i.jsx("p",{style:{fontSize:10.5,lineHeight:1.35,color:"#7C8498",marginTop:10,overflowWrap:"anywhere"},children:staffNames.join(", ")}),i.jsx("button",{type:"button",onClick:event=>{event.stopPropagation();navigate("/finance/shift/"+row.id+"/payroll")},title:"Проверить ФОТ",style:{position:"absolute",right:10,bottom:12,width:30,height:30,borderRadius:"50%",border:0,background:"#F1F2FF",color:"#5B55F5",display:"flex",alignItems:"center",justifyContent:"center"},children:i.jsx($d,{size:14})})]},row.id)})}),
i.jsx(qe,{children:sheet==="revenue"&&i.jsx(PAe,{initial:editing,areas,employees,rules,profile,revenueRecords:revenue,gapReasons,onClose:closeSheet,onSave:saveShift},"shifts-revenue-sheet")})
]})})}
`;

replaceOnce("страница Смены", "function BAe(){", `${shiftsPage}function BAe(){`);

replaceOnce(
  "маршрут Смены",
  'i.jsx(Xe,{path:"/finance/shift/:id/payroll",component:()=>i.jsx(pt,{component:QAe})}),',
  'i.jsx(Xe,{path:"/shifts",component:()=>i.jsx(pt,{component:bdShiftsPage})}),i.jsx(Xe,{path:"/finance/shift/:id/payroll",component:()=>i.jsx(pt,{component:QAe})}),',
);

fs.writeFileSync(bundlePath, source);
console.log("Shifts and finance separation applied");
