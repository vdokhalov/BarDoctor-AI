import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-shifts-page":"v156"')) {
  let updated = false;
  const legacyPeriodSync = "window.bdSyncNavigationQuery({month:monthKey})";
  const currentPeriodSync = "window.bdSyncNavigationQuery({month:toe(selected.year,selected.month)})";
  if (source.includes(legacyPeriodSync)) {
    source = source.replace(legacyPeriodSync, currentPeriodSync);
    updated = true;
  }
  const legacyMissingDates = "profile&&period?Iz(profile,revenue,gapReasons,now,period):[]";
  const currentMissingDates = "profile&&period?Iz(profile,revenue,gapReasons,now,period).map(item=>item.date):[]";
  if (source.includes(legacyMissingDates)) {
    source = source.replace(legacyMissingDates, currentMissingDates);
    updated = true;
  }
  if (!source.includes("function bdShiftPluralV156(")) {
    source = source.replace(
      "function bdShiftStaffNamesV156(",
      'function bdShiftPluralV156(e,t,n,r){const a=Math.abs(Number(e))%100,s=a%10;return a>10&&a<20?r:s===1?t:s>=2&&s<=4?n:r}\nfunction bdShiftStaffNamesV156(',
    );
    updated = true;
  }
  const legacyWarningNoun = 'missingDates.length===1?"смена требует":"смены требуют"';
  const currentWarningNoun = 'bdShiftPluralV156(missingDates.length,"смена требует","смены требуют","смен требуют")';
  if (source.includes(legacyWarningNoun)) {
    source = source.replace(legacyWarningNoun, currentWarningNoun);
    updated = true;
  }
  const legacyTeamNoun = 'team.count===1?"сотрудник":"сотрудников"';
  const currentTeamNoun = 'bdShiftPluralV156(team.count,"сотрудник","сотрудника","сотрудников")';
  if (source.includes(legacyTeamNoun)) {
    source = source.replace(legacyTeamNoun, currentTeamNoun);
    updated = true;
  }
  const legacyViewReceipts = 'Number(d.receipts)," чеков",h!==null?';
  const currentViewReceipts = 'Number(d.receipts)," ",bdShiftPluralV156(Number(d.receipts),"чек","чека","чеков"),h!==null?';
  if (source.includes(legacyViewReceipts)) {
    source = source.replace(legacyViewReceipts, currentViewReceipts);
    updated = true;
  }
  const legacyTotalReceipts = 'totals.receipts," чеков"]})';
  const currentTotalReceipts = 'totals.receipts," ",bdShiftPluralV156(totals.receipts,"чек","чека","чеков")]})';
  if (source.includes(legacyTotalReceipts)) {
    source = source.replace(legacyTotalReceipts, currentTotalReceipts);
    updated = true;
  }
  if (updated) {
    await writeFile(bundlePath, source);
    console.log("Shifts experience v156 compatibility updates applied.");
    process.exit(0);
  }
  console.log("Shifts experience v156 is already applied.");
  process.exit(0);
}

const start = source.indexOf("function bdShiftsPage(){");
const end = source.indexOf("function BAe(){", start);
if (start === -1 || end === -1) {
  throw new Error("Current shifts page was not found in the application bundle.");
}

const shiftsExperience = String.raw`
function bdShiftDateLabelV156(e){if(!e)return"Дата не указана";const t=new Date(e.slice(0,10)+"T12:00:00");if(Number.isNaN(t.getTime()))return e;const n=t.toLocaleDateString("ru-RU",{day:"numeric",month:"long"}),r=t.toLocaleDateString("ru-RU",{weekday:"long"});return n+" · "+r.charAt(0).toUpperCase()+r.slice(1)}
function bdShiftRecordKindV156(e){const t=String(e?.status??"").toLowerCase();return e?.isDraft===!0||t==="draft"||t==="черновик"?"draft":"closed"}
function bdShiftStatusMetaV156(e){return{closed:{label:"Закрыта",tone:"success"},planned:{label:"Запланирована",tone:"planned"},missing:{label:"Требует внимания",tone:"warning"},draft:{label:"Черновик",tone:"draft"}}[e]??{label:"Смена",tone:"draft"}}
function bdShiftPercentV156(e){return typeof e==="number"&&Number.isFinite(e)?String(e).replace(".",",")+"%":null}
function bdShiftPluralV156(e,t,n,r){const a=Math.abs(Number(e))%100,s=a%10;return a>10&&a<20?r:s===1?t:s>=2&&s<=4?n:r}
function bdShiftStaffNamesV156(e,t){return(e?.staffing??[]).map(n=>{const r=t.find(a=>a.id===n.employeeId);return r?.name||[r?.firstName,r?.lastName].filter(Boolean).join(" ")||"Сотрудник"})}
function bdShiftStaffSummaryV156(e,t){const n=bdShiftStaffNamesV156(e,t),r=n.slice(0,3),a=Math.max(0,n.length-r.length);return{count:n.length,names:n,preview:r.join(", ")+(a>0?" и ещё "+a:"")}}
function bdShiftRowsV156(e,t,n){const r=e.map(s=>({key:"record:"+s.id,kind:bdShiftRecordKindV156(s),date:s.date.slice(0,10),row:s})),a=new Set(r.map(s=>s.date));for(const s of t)a.has(s)||(r.push({key:"missing:"+s,kind:"missing",date:s,row:null}),a.add(s));for(const s of n)a.has(s)||(r.push({key:"planned:"+s,kind:"planned",date:s,row:null}),a.add(s));const l={missing:4,draft:3,closed:2,planned:1};return r.sort((s,u)=>u.date.localeCompare(s.date)||(l[u.kind]??0)-(l[s.kind]??0))}
function bdShiftContextModelV156(e,t,n,r){if(!e)return{tone:"neutral",eyebrow:"Сегодня",title:"График работы не настроен",detail:"Укажите рабочие дни и часы в профиле заведения.",actionLabel:null};if(e.status==="non_working")return{tone:"day-off",eyebrow:"Сегодня",title:"Сегодня выходной",detail:t?"Следующая смена: "+t+(n?" · "+n:""):"Следующая рабочая смена пока не определена",actionLabel:null};if(e.reportFilled)return{tone:"success",eyebrow:"Сегодня",title:"Смена уже закрыта",detail:"Данные за "+bdShiftDateLabelV156(e.operatingDate)+" внесены.",actionLabel:null};if(e.status==="upcoming")return{tone:"planned",eyebrow:"Сегодня рабочий день",title:"Смена запланирована",detail:n?"График: "+n:"Время смены не указано",actionLabel:null};if(e.status==="active")return{tone:"action",eyebrow:"Быстрое действие",title:"Текущая смена идёт",detail:n?"График: "+n:"Внесите фактические показатели после завершения.",actionLabel:r?"Закрыть текущую смену":null};if(e.status==="completed")return{tone:"action",eyebrow:"Требует действия",title:"Смена завершена",detail:"Фактические показатели ещё не внесены.",actionLabel:r?"Закрыть завершённую смену":null};return{tone:"neutral",eyebrow:"Сегодня",title:e.venueStatus||"Состояние смены",detail:n||"",actionLabel:null}}
function bdShiftViewV156({item:e,profile:t,employees:n,canManage:r,onClose:a,onEdit:s,onFill:l,onPayroll:u}){S.useEffect(()=>{const m=h=>{h.key==="Escape"&&a()};return document.addEventListener("keydown",m),()=>document.removeEventListener("keydown",m)},[a]);if(!e)return null;const d=e.row,f=bdShiftStatusMetaV156(e.kind),m=d&&t?Jle(d,t):null,h=d?Ym(d):null,g=d?bdShiftStaffSummaryV156(d,n):{count:0,names:[],preview:""},y=d&&d.revenue!==void 0&&d.revenue!==null&&Number.isFinite(Number(d.revenue)),j=d&&d.receipts!==void 0&&d.receipts!==null&&Number.isFinite(Number(d.receipts)),v=t?.openTime&&t?.closeTime?t.openTime+"–"+t.closeTime:null,b=m?.payrollPercentOfRevenue!==null&&m?.payrollPercentOfRevenue!==void 0?bdShiftPercentV156(m.payrollPercentOfRevenue):null,N=e.kind==="missing"?"Смена по графику завершена, но фактические показатели не внесены.":e.kind==="planned"?"Смена сформирована из действующего графика заведения.":e.kind==="draft"?"Черновик не считается завершённой сменой.":"Данные смены сохранены и участвуют в отчётах.";return i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"bd-shift-view-backdrop",onClick:a,"aria-label":"Закрыть просмотр смены"}),i.jsxs("div",{className:"bd-shift-view",role:"dialog","aria-modal":!0,"aria-labelledby":"bd-shift-view-title",children:[i.jsxs("header",{className:"bd-shift-view-head",children:[i.jsxs("div",{children:[i.jsx("span",{className:"bd-shift-status "+f.tone,children:f.label}),i.jsx("h2",{id:"bd-shift-view-title",children:bdShiftDateLabelV156(e.date)})]}),i.jsx("button",{type:"button",className:"bd-shift-view-close",onClick:a,"aria-label":"Закрыть",children:i.jsx(vt,{size:18})})]}),i.jsxs("div",{className:"bd-shift-view-scroll",children:[i.jsxs("section",{className:"bd-shift-view-hero",children:[i.jsx("p",{children:y?Mn(Number(d.revenue)):"—"}),j&&i.jsxs("span",{children:[Number(d.receipts)," чеков",h!==null?" · средний чек "+Mn(h):""]}),!j&&i.jsx("span",{children:N})]}),(m||j||h!==null)&&i.jsxs("section",{className:"bd-shift-view-metrics",children:[j&&i.jsxs("div",{children:[i.jsx("span",{children:"Чеки"}),i.jsx("strong",{children:Number(d.receipts)})]}),h!==null&&i.jsxs("div",{children:[i.jsx("span",{children:"Средний чек"}),i.jsx("strong",{children:Mn(h)})]}),m&&i.jsxs("div",{children:[i.jsx("span",{children:"ФОТ"}),i.jsx("strong",{children:Mn(m.totalPayroll)})]}),b&&i.jsxs("div",{children:[i.jsx("span",{children:"ФОТ / выручка"}),i.jsx("strong",{children:b})]})]}),i.jsxs("section",{className:"bd-shift-view-details",children:[v&&i.jsxs("div",{children:[i.jsx("span",{children:"График работы"}),i.jsx("strong",{children:v})]}),g.count>0&&i.jsxs("div",{className:"bd-shift-view-team",children:[i.jsxs("span",{children:["Команда · ",g.count]}),i.jsx("ul",{children:g.names.map((E,_)=>i.jsx("li",{children:E},E+_))})]}),d?.note&&i.jsxs("div",{children:[i.jsx("span",{children:"Комментарий"}),i.jsx("p",{children:d.note})]}),!v&&g.count===0&&!d?.note&&i.jsx("p",{className:"bd-shift-view-note",children:N})]}),i.jsxs("div",{className:"bd-shift-view-actions",children:[e.kind==="missing"&&r&&i.jsx("button",{type:"button",className:"bd-shift-primary-action",onClick:()=>l(e.date),children:"Заполнить смену"}),(e.kind==="closed"||e.kind==="draft")&&r&&d&&i.jsx("button",{type:"button",className:"bd-shift-primary-action",onClick:()=>s(d),children:"Редактировать смену"}),d&&m&&i.jsx("button",{type:"button",className:"bd-shift-secondary-action",onClick:()=>u(d),children:"Открыть расчёт ФОТ"})]})]})]})]})}
function bdShiftsPage(){
const[,navigate]=bt(),location=ste(),{profile}=Un(),{revenue,gapReasons,upsertDailyRevenue}=Ur(),{employees}=_i(),{rules}=Do(),{toast}=sn(),[sheet,setSheet]=S.useState(null),[editing,setEditing]=S.useState(void 0),[viewing,setViewing]=S.useState(null),now=new Date,months=S.useMemo(()=>{const rows=[];for(let offset=0;offset<6;offset++){const date=new Date(now.getFullYear(),now.getMonth()-offset,1);rows.push({year:date.getFullYear(),month:date.getMonth()+1})}return rows},[now.getFullYear(),now.getMonth()]),[selected,setSelected]=S.useState(()=>{const key=window.bdReadNavigationQuery("month","");return months.find(row=>toe(row.year,row.month)===key)||months[0]}),canManage=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("shifts.manage"):!0,monthKey=toe(selected.year,selected.month),period=S.useMemo(()=>profile?wo(profile,now,selected.year,selected.month):null,[profile,selected.year,selected.month,now.getDate()]),coverage=S.useMemo(()=>profile&&period?kC(profile,revenue,gapReasons,now,period):null,[profile,period,revenue,gapReasons,now.getDate()]),records=S.useMemo(()=>ss(revenue.filter(row=>row.date.slice(0,7)===monthKey)),[revenue,monthKey]),closedRecords=S.useMemo(()=>records.filter(row=>bdShiftRecordKindV156(row)==="closed"),[records]),totals=S.useMemo(()=>closedRecords.reduce((result,row)=>({revenue:result.revenue+(Number(row.revenue)||0),receipts:result.receipts+(Number(row.receipts)||0)}),{revenue:0,receipts:0}),[closedRecords]),missingDates=S.useMemo(()=>profile&&period?Iz(profile,revenue,gapReasons,now,period).map(item=>item.date):[],[profile,period,revenue,gapReasons,now.getDate()]),todayState=profile?bdHomeTodayState(profile,revenue,now):null,todayKey=bdDateKey(now),schedule=profile?.openTime&&profile?.closeTime?profile.openTime+"–"+profile.closeTime:"",nextWorking=profile?bdFinanceNextWorkingLabel(profile,now):null,contextModel=bdShiftContextModelV156(todayState,nextWorking,schedule,canManage),plannedDates=S.useMemo(()=>{if(!profile)return[];const meta=bdMonthMeta(monthKey),occupied=new Set(records.map(row=>row.date.slice(0,10))),resolved=new Set(gapReasons.filter(row=>row.resolved).map(row=>row.date.slice(0,10)));return bdPlannedShiftDates(profile,meta).filter(date=>date>=todayKey&&!occupied.has(date)&&!resolved.has(date)&&$g(profile,new Date(date+"T00:00:00"),now).status==="upcoming").slice(0,1)},[profile,monthKey,records,gapReasons,todayKey]),timeline=bdShiftRowsV156(records,missingDates.filter(date=>date.slice(0,7)===monthKey),plannedDates),areas=profile?.areas??[],selectedIndex=months.findIndex(row=>row.year===selected.year&&row.month===selected.month);
S.useEffect(()=>{const params=new URLSearchParams(location);if(params.get("closeShift")==="1"&&profile){setEditing(todayState?.operatingDate?{date:todayState.operatingDate}:void 0);setSheet("revenue")}},[location,profile,todayState?.operatingDate]);S.useEffect(()=>{window.bdSyncNavigationQuery({month:toe(selected.year,selected.month)})},[selected.year,selected.month]);
function closeSheet(){setSheet(null);setEditing(void 0);window.bdSyncNavigationQuery({closeShift:null,month:monthKey})}
function saveShift(values){const saved=upsertDailyRevenue(values,editing?.id);toast(saved?{variant:"success",title:editing?.id?"Смена обновлена":"Смена закрыта",description:"Данные смены добавлены в отчёты и расчёты."}:{variant:"warning",title:"Мало памяти",description:"Запись сохранена только в текущей сессии."});closeSheet()}
function openCloseDate(date){setViewing(null);setEditing(date?{date}:void 0);setSheet("revenue")}
function openEdit(row){setViewing(null);setEditing(row);setSheet("revenue")}
function shiftMonth(delta){const next=months[selectedIndex+delta];next&&setSelected(next)}
return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsxs("div",{"data-bd-shifts-page":"v156",className:"bd-shifts-page-v156",children:[i.jsxs("header",{className:"bd-shifts-header",children:[i.jsx("h1",{children:"Смены"}),i.jsx("p",{children:"Закрытие и история рабочих смен"})]}),i.jsxs("div",{className:"bd-shifts-layout",children:[i.jsxs("div",{className:"bd-shifts-overview",children:[i.jsxs("nav",{className:"bd-shifts-month-nav","aria-label":"Выбор месяца",children:[i.jsx("button",{type:"button",onClick:()=>shiftMonth(1),disabled:selectedIndex>=months.length-1,"aria-label":"Более ранний месяц",children:i.jsx(Nn,{size:18})}),i.jsx("strong",{"aria-live":"polite",children:Jl(selected.year,selected.month)}),i.jsx("button",{type:"button",onClick:()=>shiftMonth(-1),disabled:selectedIndex<=0,"aria-label":"Более поздний месяц",children:i.jsx(Nn,{size:18,style:{transform:"rotate(180deg)"}})})]}),i.jsxs("section",{className:"bd-shifts-summary","aria-label":"Статистика выбранного месяца",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Закрыто смен"}),i.jsx("strong",{children:closedRecords.length}),coverage&&i.jsxs("small",{children:["из ",coverage.scheduledCompletedShifts," по графику"]})]}),i.jsxs("div",{children:[i.jsx("span",{children:"Выручка"}),i.jsx("strong",{children:closedRecords.length?Mn(totals.revenue):"—"}),i.jsx("small",{children:"за месяц"})]}),i.jsxs("div",{children:[i.jsx("span",{children:"Заполнено"}),i.jsx("strong",{className:coverage?.unexplainedGaps>0?"warning":"success",children:coverage&&coverage.scheduledCompletedShifts>0?(coverage.revenueEntered+coverage.explainedClosures)+"/"+coverage.scheduledCompletedShifts:"—"}),coverage&&coverage.scheduledCompletedShifts>0&&i.jsx("div",{className:"bd-shifts-progress","aria-hidden":!0,children:i.jsx("i",{style:{width:Math.min(100,coverage.coveragePercent)+"%"}})})]})]}),missingDates.length>0&&i.jsxs("button",{type:"button",className:"bd-shifts-warning",onClick:()=>openCloseDate(missingDates[0]),disabled:!canManage,children:[i.jsx("span",{className:"bd-shifts-warning-icon","aria-hidden":!0,children:i.jsx(Fn,{size:18})}),i.jsxs("span",{children:[i.jsxs("strong",{children:[missingDates.length," ",bdShiftPluralV156(missingDates.length,"смена требует","смены требуют","смен требуют")," заполнения"]}),i.jsx("small",{children:canManage?"Открыть последнюю незаполненную смену":"Недостающие данные снижают точность аналитики"})]}),i.jsx(Br,{size:18,"aria-hidden":!0})]}),i.jsxs("section",{className:"bd-shifts-context "+contextModel.tone,children:[i.jsxs("div",{children:[i.jsx("span",{children:contextModel.eyebrow}),i.jsx("strong",{children:contextModel.title}),i.jsx("small",{children:contextModel.detail})]}),contextModel.actionLabel&&i.jsxs("button",{type:"button",onClick:()=>openCloseDate(todayState?.operatingDate),children:[i.jsx(Vt,{size:18}),contextModel.actionLabel]})]})]}),i.jsxs("section",{className:"bd-shifts-history",children:[i.jsxs("div",{className:"bd-shifts-section-head",children:[i.jsxs("div",{children:[i.jsx("h2",{children:"Смены месяца"}),i.jsx("p",{children:timeline.length?timeline.length+" в списке":"История пока пуста"})]}),totals.receipts>0&&i.jsxs("span",{children:[totals.receipts," чеков"]})]}),timeline.length===0?i.jsxs("div",{className:"bd-shifts-empty",children:[i.jsx("strong",{children:"Смен за выбранный месяц нет"}),i.jsx("p",{children:"Здесь появятся закрытые, запланированные и требующие внимания смены — только по реальному графику и данным заведения."})]}):i.jsx("div",{className:"bd-shifts-list",children:timeline.map(item=>{const row=item.row,status=bdShiftStatusMetaV156(item.kind),avg=row?Ym(row):null,payroll=row&&profile?Jle(row,profile):null,team=row?bdShiftStaffSummaryV156(row,employees):{count:0,names:[],preview:""},hasRevenue=row&&row.revenue!==void 0&&row.revenue!==null&&Number.isFinite(Number(row.revenue)),hasReceipts=row&&row.receipts!==void 0&&row.receipts!==null&&Number.isFinite(Number(row.receipts)),ratio=payroll?.payrollPercentOfRevenue!==null&&payroll?.payrollPercentOfRevenue!==void 0?bdShiftPercentV156(payroll.payrollPercentOfRevenue):null;return i.jsxs("button",{type:"button",className:"bd-shift-card "+item.kind,onClick:()=>setViewing(item),children:[i.jsxs("div",{className:"bd-shift-card-head",children:[i.jsx("strong",{children:bdShiftDateLabelV156(item.date)}),i.jsxs("span",{className:"bd-shift-status "+status.tone,children:[status.label,i.jsx(Br,{size:14,"aria-hidden":!0})]})]}),i.jsx("p",{className:"bd-shift-card-revenue",children:hasRevenue?Mn(Number(row.revenue)):"—"}),row?i.jsxs("div",{className:"bd-shift-card-metrics",children:[hasReceipts&&i.jsxs("span",{children:[i.jsx("b",{children:Number(row.receipts)}),"Чеки"]}),avg!==null&&i.jsxs("span",{children:[i.jsx("b",{children:Mn(avg)}),"Средний чек"]}),payroll&&i.jsxs("span",{children:[i.jsx("b",{children:Mn(payroll.totalPayroll)}),"ФОТ"]}),ratio&&i.jsxs("span",{children:[i.jsx("b",{children:ratio}),"ФОТ / выручка"]})]}):i.jsx("p",{className:"bd-shift-card-note",children:item.kind==="planned"?(schedule||"Время не указано")+" · Запланирована":"Смена не заполнена"}),team.count>0&&i.jsxs("div",{className:"bd-shift-card-team",children:[i.jsxs("strong",{children:[team.count," ",bdShiftPluralV156(team.count,"сотрудник","сотрудника","сотрудников")]}),i.jsx("span",{children:team.preview})]})]},item.key)})})]} )]}),i.jsx(qe,{children:viewing&&i.jsx(bdShiftViewV156,{item:viewing,profile,employees,canManage,onClose:()=>setViewing(null),onEdit:openEdit,onFill:openCloseDate,onPayroll:row=>{setViewing(null);navigate("/finance/shift/"+row.id+"/payroll")}},viewing.key)}),i.jsx(qe,{children:sheet==="revenue"&&i.jsx(PAe,{initial:editing,areas,employees,rules,profile,revenueRecords:revenue,gapReasons,onClose:closeSheet,onSave:saveShift},"shifts-revenue-sheet")})]})})}
`;

const normalizedShiftsExperience = shiftsExperience
  .replace(
    'Number(d.receipts)," чеков",h!==null?',
    'Number(d.receipts)," ",bdShiftPluralV156(Number(d.receipts),"чек","чека","чеков"),h!==null?',
  )
  .replace(
    'totals.receipts," чеков"]})',
    'totals.receipts," ",bdShiftPluralV156(totals.receipts,"чек","чека","чеков")]})',
  );

source = source.slice(0, start) + normalizedShiftsExperience + source.slice(end);
await writeFile(bundlePath, source);
console.log("Shifts experience v156 applied.");
