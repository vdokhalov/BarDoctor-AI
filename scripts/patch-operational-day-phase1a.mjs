import fs from 'node:fs';
import { parse } from 'acorn';
import { transformSync } from 'esbuild';
import { patchReceiptCost } from './lib/phase5-receipt-cost.mjs';
const path='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
source=source.replaceAll('bdWorkdayFlow','BdWorkdayFlow');
const marker='/* operational-day-phase1a */';
// Regenerating old fragments is part of the existing build. Apply owned changes
// every time, without replacing the wizard or its stock/payroll calculations.
function fn(name,change){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);if(!node)throw Error('Missing '+name);source=source.slice(0,node.start)+change(source.slice(node.start,node.end))+source.slice(node.end);}
function replace(s,from,to){if(s.includes(to))return s;if(!s.includes(from))throw Error('Missing Phase 1A anchor: '+from.slice(0,100));return s.replace(from,to);}
const fragment=fs.readFileSync('scripts/fragments/operational-day-phase1a.fragment.txt','utf8');
fn('Ur',()=>fragment.slice(fragment.indexOf('function Ur(')).trim());
const workdayFlow=transformSync(fs.readFileSync('scripts/fragments/workday-flow.jsx','utf8').replace('export function BdWorkdayFlow','function BdWorkdayFlow'),{loader:'jsx',jsxFactory:'S.createElement',jsxFragment:'S.Fragment'}).code.trim();
if(source.includes('function BdWorkdayFlow('))fn('BdWorkdayFlow',()=>workdayFlow);else source=workdayFlow+'\n'+source;
for(const name of ['bdManagementWorkday','bdOperationalFallback','bdOperationalRevenueCopy','bdOperationalRows']){const code=fragment.split(/\r?\n/).find(line=>line.startsWith('function '+name+'('));if(source.includes('function '+name+'('))fn(name,()=>code);else source=code+'\n'+source;}if(!source.includes(marker))source=marker+'\n'+source;
fn('bdShiftRecordKindV156',s=>replace(s,'const t=','if(e?._bdOperationalDay)return e._bdOperationalDay.status==="COMPLETE"?"closed":e._bdOperationalDay.status==="OPERATING"?"operating":"awaiting";if(e?.revenueSource==="sales_events_v1")return e.closingStatus==="open"?"operating":"awaiting";const t='));
fn('bdShiftStatusMetaV156',s=>replace(s,'return{closed:', 'return{operating:{label:"Рабочий день идёт",tone:"planned"},awaiting:{label:"Ожидает операционных данных",tone:"warning"},closed:'));
source=source.replaceAll('bdUseHomeCalendarClock','useHomeCalendarClock');
const homeDate=fs.readFileSync('scripts/fragments/home-workday-date.js','utf8');
for(const node of parse(homeDate,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration')){const code=homeDate.slice(node.start,node.end);if(source.includes('function '+node.id.name+'('))fn(node.id.name,()=>code);else source=code+'\n'+source;}
fn('Dce',s=>s.replace('{revenue:d,expenses:f,gapReasons:bdHomeGapReasons}=Ur()','{revenue:d,expenses:f,gapReasons:bdHomeGapReasons,operationalDays:bdHomeDays}=Ur()').replace('i.jsx(bdHomeDaily,{operationalDays:bdHomeDays,','i.jsx(bdHomeDaily,{').replace('latestDataAt:j,onNavigate:a})','latestDataAt:j,operationalDays:bdHomeDays,onNavigate:a})'));
fn('bdHomeDaily',s=>{if(!s.includes('bdHomeCalendarNow'))s=s.replace('function bdHomeDaily({','function bdHomeDaily({operationalDays:bdHomeDays=[],').replace('const bdHomeReviewState=','const bdHomeCalendarNow=useHomeCalendarClock(),bdHomeReviewState=').replace('bdHomeTodayState(e,t,new Date),[e,t]','bdHomeTodayState(e,t,bdHomeCalendarNow,bdHomeDays),[e,t,bdHomeCalendarNow,bdHomeDays]');return s;});
fn('bdHomeTodayCard',s=>s.replace('bdHomeLongDateV151(e.operatingDate)','bdHomeLongDateV151(e.calendarDate)').replace('e.status==="non_working"?"Выходной день по графику":"Рабочий контекст на текущую смену"','e.contextLabel'));
fn('bdWarehousePage',s=>{
 s=s.replace('movements:"Движения",sales:"Продажи",counts:','movements:"Движения",counts:');
 const tree=parse('('+s+')',{ecmaVersion:'latest'});let target=null;function walk(node){if(!node||typeof node!=="object")return;if(node.type==='CallExpression'&&node.arguments?.[1]?.type==='ObjectExpression'&&node.arguments[1].properties.some(p=>p.key?.value==='data-bd-warehouse-sales-entry'))target=node;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}walk(tree);if(target)s=s.slice(0,target.start-1)+s.slice(target.end);
 s=s.replace('["sales","Продажи"]','["sales","Расход по чекам"]');
 if(!s.includes('bdLegacySalesTab'))s=s.replace('function bdWarehousePage(){','function bdWarehousePage(){S.useEffect(()=>{const bdLegacySalesTab=new URL(window.location.href);if(bdLegacySalesTab.searchParams.get("tab")==="sales"){bdLegacySalesTab.pathname="/sales-import";bdLegacySalesTab.searchParams.delete("tab");window.bdNavigate(bdLegacySalesTab.pathname+bdLegacySalesTab.search+bdLegacySalesTab.hash)}},[]);');
 return s;
});
fn('bdShiftsPage',s=>{
 s=replace(s,'{revenue,gapReasons,upsertDailyRevenue}=Ur(),','{revenue:bdRawShiftRevenue,operationalDays:bdShiftDays=[],gapReasons,upsertDailyRevenue}=Ur(),revenue=S.useMemo(()=>{const workdays=bdShiftDays.filter(day=>day.report?.workdayStatus);return [...bdRawShiftRevenue.filter(row=>!workdays.some(day=>day.businessDate===row.date?.slice(0,10))),...workdays.map(day=>({id:"operational-report:"+day.venueId+":"+day.businessDate,date:day.businessDate,revenue:day.revenue.amount,receipts:day.revenue.receipts,...day.report,_bdOperationalDay:day}))]},[bdRawShiftRevenue,bdShiftDays]),');
 s=replace(s,'i.jsxs("section",{className:"bd-shifts-context "+contextModel.tone','false&&i.jsxs("section",{className:"bd-shifts-context "+contextModel.tone');
 s=replace(s,'onClick:()=>setViewing(item),children:[i.jsxs("div",{className:"bd-shift-card-head"','onClick:()=>{if(item.row?.workdayStatus){window.dispatchEvent(new CustomEvent("bd:workday-select",{detail:{date:item.date}}));window.scrollTo({top:0,behavior:"smooth"})}else setViewing(item)},children:[i.jsxs("div",{className:"bd-shift-card-head"');

 // An early legacy card can be opened before authoritative workday reads finish.
 // Reconcile only that viewed date; retain genuine legacy-day dialogs.
 if(!s.includes('bdShiftDays.find(day=>day.businessDate===viewing.date'))s=replace(s,'selectedIndex=months.findIndex(row=>row.year===selected.year&&row.month===selected.month);','selectedIndex=months.findIndex(row=>row.year===selected.year&&row.month===selected.month);\nS.useEffect(()=>{if(!viewing)return;const day=bdShiftDays.find(day=>day.businessDate===viewing.date&&day.report?.workdayStatus);if(day){setViewing(null);window.dispatchEvent(new CustomEvent("bd:workday-select",{detail:{date:day.businessDate}}))}},[bdShiftDays,viewing]);');
 s=replace(s,'const[,navigate]=bt(),','const bdConsumedShiftLink=S.useRef(null);\nconst[,navigate]=bt(),');
 s=replace(s,'const linkedShift=params.get("shift");if(linkedShift){','const linkedShift=params.get("shift"),linkKey=params.get("venue")+":"+linkedShift;if(!linkedShift)bdConsumedShiftLink.current=null;if(linkedShift){if(bdConsumedShiftLink.current===linkKey)return;');
 s=replace(s,'if(linkedItem){setViewing(linkedItem)','if(linkedItem){bdConsumedShiftLink.current=linkKey;setViewing(linkedItem)');
 s=s.replace('if(activeOperationalDay){contextModel.title="Кассовая смена открыта";contextModel.detail="Выручка поступает из продаж · Предварительно";contextModel.actionLabel=canManage?"Заполнить операционные данные":null;}\n','');
 s=replace(s,'i.jsx(bdCashierEntry,{onNavigate:navigate}),i.jsxs("div",{className:"bd-shifts-layout"','i.jsx(bdCashierEntry,{onNavigate:navigate}),i.jsx(BdWorkdayFlow,{profile,onNavigate:navigate,onOperations:current=>{setViewing(null);setEditing({...revenue.find(row=>row.date?.slice(0,10)===current.date),date:current.date,_bdOperationalDay:current.day});setSheet("revenue")}}),i.jsxs("div",{className:"bd-shifts-layout"');
 s=replace(s,'const saved=upsertDailyRevenue(values,editing?.id);','if(values?.operationalSaved){toast({variant:"success",title:"Операционные данные сохранены",description:"Команда, ФОТ, списания и происшествия сохранены."});closeSheet();return}const saved=upsertDailyRevenue(values,editing?.id);');
 s=replace(s,'setEditing(date?{date}:void 0);','setEditing(date?revenue.find(row=>row.date?.slice(0,10)===date)||{date}:void 0);');
 s=replace(s,'setEditing(todayState?.operatingDate?{date:todayState.operatingDate}:void 0);','setEditing(todayState?.operatingDate?revenue.find(row=>row.date?.slice(0,10)===todayState.operatingDate)||{date:todayState.operatingDate}:void 0);');
 s=replace(s,'timeline.find(item=>String(item.row?.id||"")===linkedShift)','timeline.find(item=>String(item.row?.id||"")===linkedShift||(item.row?._bdOperationalDay&&"operational-report:"+item.row._bdOperationalDay.venueId+":"+item.date===linkedShift))');
 s=replace(s,'payroll=row&&profile?Jle(row,profile):null','payroll=row?.workdayStatus==="OPEN"?null:row&&profile?Jle(row,profile):null');
 s=replace(s,'contextModel=bdShiftContextModelV156(todayState,nextWorking,schedule,canManage)','contextModel=bdShiftContextModelV156(todayState,nextWorking,schedule,canManage),activeOperationalDay=revenue.find(row=>row._bdOperationalDay?.status==="OPERATING")?._bdOperationalDay');
 s=replace(s,'function closeSheet(){','if(activeOperationalDay){contextModel.title="Касса открыта";contextModel.detail="Выручка предварительная";contextModel.actionLabel=canManage?"Заполнить день":null;}\nfunction closeSheet(){');
 s=replace(s,'openCloseDate(todayState?.operatingDate)','openCloseDate(activeOperationalDay?.businessDate||todayState?.operatingDate)');
 s=replace(s,'row?i.jsxs("div",{className:"bd-shift-card-metrics"','row?i.jsxs("div",{className:"bd-shift-card-metrics"');
 s=replace(s,'children:hasRevenue?Mn(Number(row.revenue)):"—"}),row?', 'children:hasRevenue?Mn(Number(row.revenue)):"—"}),row?._bdOperationalDay&&i.jsx("small",{children:bdOperationalRevenueCopy(row._bdOperationalDay)}),row?');
 s=s.replace('closedRecords.reduce((result,row)','records.filter(row=>!row.isDraft).reduce((result,row)').replace('children:closedRecords.length?Mn(totals.revenue)','children:records.length?Mn(totals.revenue)');
 return s;
});
fn('bdShiftViewV156',s=>{
 s=replace(s,'children:[i.jsxs("section",{className:"bd-shift-view-hero"','children:[i.jsx(bdManagementWorkday,{day:d?._bdOperationalDay}),i.jsxs("section",{className:"bd-shift-view-hero"');

 s=replace(s,'(e.kind==="closed"||e.kind==="draft")','(e.kind==="closed"||e.kind==="draft"||e.kind==="operating"||e.kind==="awaiting")');
 s=replace(s,'children:"Редактировать смену"','children:d?._bdOperationalDay?.revenue?.readOnly?"Заполнить операционные данные":"Редактировать смену"');
 s=replace(s,'children:[v&&i.jsxs','children:[d?._bdOperationalDay&&i.jsx("p",{children:bdOperationalRevenueCopy(d._bdOperationalDay)}),v&&i.jsxs');
 return s;
});
fn('bdShiftCloseApiV272',s=>replace(s,'r.assortment&&Vm','r.revenues&&Vm("bd_finance_revenue",r.revenues),r.incidents&&Vm("bd_cases",r.incidents),setTimeout(()=>["bd_finance_revenue","bd_cases"].forEach(a=>window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:a}}))),0),r.assortment&&Vm'));
fn('PAe',s=>{
 s=s.replaceAll('(bdInitialDay?.revenue?.readOnly||bdInitialDay?.report?.workdayStatus)?bdInitialDay.revenue.','bdInitialDay?.revenue?.readOnly?bdInitialDay.revenue.').replace('bdRevenueReadOnly=!!(bdDay?.revenue?.readOnly||bdDay?.report?.workdayStatus)','bdRevenueReadOnly=!!bdDay?.revenue?.readOnly').replace('||(e?.date?.slice(0,10)===f?bdInitialDay:null)','');
 s=s.replace(/const bdInitialDay=[^\n]*;\n/,'');
 s=s.replace('bdDay=s.find(row=>row.date?.slice(0,10)===f)?._bdOperationalDay,bdRevenueReadOnly=!!bdDay?.revenue?.readOnly,activeEmployees=S.useMemo','activeEmployees=S.useMemo');
 s=s.replace('const bdDay=(s.find(row=>row.date?.slice(0,10)===(e?.date||Y_()))||e)?._bdOperationalDay,bdRevenueReadOnly=!!bdDay?.revenue?.readOnly,bdShiftClosingVersion=', 'const bdShiftClosingVersion=');
 s=s.replace('const bdInitialDay=(s.find(row=>row.date?.slice(0,10)===(e?.date||Y_()))||e)?._bdOperationalDay,bdShiftClosingVersion=', 'const bdShiftClosingVersion=');
 if(!s.includes('const bdInitialDay=')){const offset=s.indexOf('\n');s=s.slice(0,offset+1)+'const bdInitialDay=(s.find(row=>row.date?.slice(0,10)===(e?.date||Y_()))||e)?._bdOperationalDay||bdOperationalFallback(s.find(row=>row.date?.slice(0,10)===(e?.date||Y_()))||e,s);\n'+s.slice(offset+1);}
 s=s.replaceAll('String(bdRevenueReadOnly?bdDay.revenue.amount:e?.revenue??"")','String(e?.revenue??"")').replaceAll('String(bdRevenueReadOnly?bdDay.revenue.receipts:e?.receipts??"")','String(e?.receipts??"")');
 s=replace(s,'String(e?.revenue??"")','String(bdInitialDay?.revenue?.readOnly?bdInitialDay.revenue.amount:e?.revenue??"")');
 s=replace(s,'String(e?.receipts??"")','String(bdInitialDay?.revenue?.readOnly?bdInitialDay.revenue.receipts:e?.receipts??"")');
 s=replace(s,'activeEmployees=S.useMemo','bdDay=s.find(row=>row.date?.slice(0,10)===f)?._bdOperationalDay||bdOperationalFallback(s.find(row=>row.date?.slice(0,10)===f),s),bdRevenueReadOnly=!!bdDay?.revenue?.readOnly,activeEmployees=S.useMemo');
 s=replace(s,'function buildRevenueRecord(){','S.useEffect(()=>{if(bdRevenueReadOnly){g(String(bdDay.revenue.amount));j(String(bdDay.revenue.receipts));}},[f,bdRevenueReadOnly,bdDay?.revenue?.amount,bdDay?.revenue?.receipts]);\nfunction buildRevenueRecord(){');
 s=replace(s,'String(e?.shiftCloseId||("shift-close:"+String(e?.id||crypto.randomUUID())))','String("shift-close:"+crypto.randomUUID())');
 s=s.replace('{date:f,...(bdRevenueReadOnly?{}:{revenue:Z,receipts:R}),','{date:f,revenue:Z,receipts:R,');
 s=s.replace('zoneRevenue:!bdRevenueReadOnly&&Object.keys(ye).length?ye:void 0','zoneRevenue:Object.keys(ye).length?ye:void 0');
 s=replace(s,'revenueRecord:ye,','revenueRecord:bdRevenueReadOnly?Object.fromEntries(Object.entries(ye).filter(([key])=>!["revenue","receipts","payments","zoneRevenue"].includes(key))):ye,');
 s=replace(s,'bdShiftCloseApiV272({shiftCloseId:','bdShiftCloseApiV272({sectionsVersion:1,shiftCloseId:');
 s=replace(s,'writeOffItems:writeoffs.map(fe=>','incidents:incidents.map(Ce=>({...Ce,responsible:activeEmployees.find(Ge=>Ge.id===Ce.responsibleId)?.name||""})),writeOffItems:writeoffs.map(fe=>');
 const start=s.indexOf('const fe=new Date().toISOString();for(const Ce of incidents)'),end=s.indexOf('Js(),window.dispatchEvent',start);
 if(start>=0&&end>start)s=s.slice(0,start)+s.slice(end);
 s=s.replace('{addEvent:we}=Ci(),','');
 s=replace(s,'c===0&&i.jsxs("div",','c===0&&bdRevenueReadOnly&&i.jsxs("section",{"data-bd-pos-revenue":"readonly",className:"rounded-2xl border p-4",children:[i.jsx("strong",{children:bdShiftMoney(bdDay.revenue.amount)}),i.jsx("p",{children:bdOperationalRevenueCopy(bdDay)}),i.jsx("p",{children:"Выручка, чеки и оплаты поступают из проведённых продаж."})]}),c===0&&!bdRevenueReadOnly&&i.jsxs("div",');
 s=replace(s,'!e?.id&&i.jsx("button",{type:"button",onClick:addWriteoff','(!e?.id||bdRevenueReadOnly)&&i.jsx("button",{type:"button",onClick:addWriteoff');
 s=replace(s,'children:e?.id?"Редактирование смены":"Ежедневное закрытие смены"','children:bdRevenueReadOnly?"Операционные данные дня":e?.id?"Редактирование смены":"Ежедневное закрытие смены"');
 return s;
});
// Existing operations editor stays responsible for write-offs/incidents; workday
// attendance and payroll are owned by the scoped server command above.
fn('PAe',s=>{
 s=s.replace('[c,setStep]=S.useState(0)','[c,setStep]=S.useState(bdInitialDay?.report?.workdayStatus?2:0)');
 s=s.replaceAll('bdInitialDay?.revenue?.readOnly?bdInitialDay.revenue.','(bdInitialDay?.revenue?.readOnly||bdInitialDay?.report?.workdayStatus)?bdInitialDay.revenue.');
 s=s.replace('bdRevenueReadOnly=!!bdDay?.revenue?.readOnly','bdRevenueReadOnly=!!(bdDay?.revenue?.readOnly||bdDay?.report?.workdayStatus)');
 s=s.replace('||bdOperationalFallback(s.find(row=>row.date?.slice(0,10)===f),s)','||(e?.date?.slice(0,10)===f?bdInitialDay:null)||bdOperationalFallback(s.find(row=>row.date?.slice(0,10)===f),s)');
 s=replace(s,'ce=S.useMemo(()=>{const ye=','ce=S.useMemo(()=>{if(bdDay?.report?.workdayStatus)return{staffing:e?.staffing||[],shiftDepartmentSales:e?.shiftDepartmentSales||{},shiftVenueSales:e?.shiftVenueSales,payrollBreakdown:e?.payrollBreakdown,payrollBasis:"RECORDED"};const ye=');
 s=replace(s,'c===1&&i.jsxs("div",','c===1&&bdDay?.report?.workdayStatus&&i.jsx("p",{children:"Команда, часы и ФОТ сохраняются в рабочей смене. Здесь заполните списания и происшествия."}),c===1&&!bdDay?.report?.workdayStatus&&i.jsxs("div",');
 s=replace(s,'children:"После закрытия обновятся"','children:bdDay?.report?.workdayStatus?"Операционные данные":"После закрытия обновятся"');
 s=replace(s,'children:"Финансы, зарплаты, показатели команды, предупреждения и контекст AI-анализа."','children:bdDay?.report?.workdayStatus?"Списания и происшествия сохранятся в текущем рабочем дне. Закрытие и подтверждение ФОТ — на экране Смены.":"Финансы, зарплаты, показатели команды, предупреждения и контекст AI-анализа."');
 s=replace(s,'children:"ФОТ"','children:bdDay?.report?.workdayStatus==="OPEN"?"ФОТ · предварительный":"ФОТ"');
 return s;
});
source=patchReceiptCost(source);
parse(source,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,source);console.log('Operational Day Phase 1A applied');
