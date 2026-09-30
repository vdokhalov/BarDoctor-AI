import fs from 'node:fs';
import { parse } from 'acorn';
import { patchReceiptCost } from './lib/phase5-receipt-cost.mjs';
const path='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
const marker='/* operational-day-phase1a */';
// Regenerating old fragments is part of the existing build. Apply owned changes
// every time, without replacing the wizard or its stock/payroll calculations.
function fn(name,change){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);if(!node)throw Error('Missing '+name);source=source.slice(0,node.start)+change(source.slice(node.start,node.end))+source.slice(node.end);}
function replace(s,from,to){if(s.includes(to))return s;if(!s.includes(from))throw Error('Missing Phase 1A anchor: '+from.slice(0,100));return s.replace(from,to);}
const fragment=fs.readFileSync('scripts/fragments/operational-day-phase1a.fragment.txt','utf8');
fn('Ur',()=>fragment.slice(fragment.indexOf('function Ur(')).trim());
for(const name of ['bdOperationalFallback','bdOperationalRevenueCopy','bdOperationalRows']){const code=fragment.split(/\r?\n/).find(line=>line.startsWith('function '+name+'('));if(source.includes('function '+name+'('))fn(name,()=>code);else source=code+'\n'+source;}if(!source.includes(marker))source=marker+'\n'+source;
fn('bdShiftRecordKindV156',s=>replace(s,'const t=','if(e?._bdOperationalDay)return e._bdOperationalDay.status==="COMPLETE"?"closed":e._bdOperationalDay.status==="OPERATING"?"operating":"awaiting";if(e?.revenueSource==="sales_events_v1")return e.closingStatus==="open"?"operating":"awaiting";const t='));
fn('bdShiftStatusMetaV156',s=>replace(s,'return{closed:', 'return{operating:{label:"Рабочий день идёт",tone:"planned"},awaiting:{label:"Ожидает операционных данных",tone:"warning"},closed:'));
fn('bdHomeTodayState',s=>replace(s,'f=t.some(m=>m.date?.slice(0,10)===d)','f=t.some(m=>m.date?.slice(0,10)===d&&bdShiftRecordKindV156(m)==="closed")'));
fn('bdShiftsPage',s=>{
 s=s.replace('if(activeOperationalDay){contextModel.title="Кассовая смена открыта";contextModel.detail="Выручка поступает из продаж · Предварительно";contextModel.actionLabel=canManage?"Заполнить операционные данные":null;}\n','');
 s=replace(s,'const saved=upsertDailyRevenue(values,editing?.id);','if(values?.operationalSaved){toast({variant:"success",title:"Операционные данные сохранены",description:"Команда, ФОТ, списания и происшествия сохранены."});closeSheet();return}const saved=upsertDailyRevenue(values,editing?.id);');
 s=replace(s,'setEditing(date?{date}:void 0);','setEditing(date?revenue.find(row=>row.date?.slice(0,10)===date)||{date}:void 0);');
 s=replace(s,'setEditing(todayState?.operatingDate?{date:todayState.operatingDate}:void 0);','setEditing(todayState?.operatingDate?revenue.find(row=>row.date?.slice(0,10)===todayState.operatingDate)||{date:todayState.operatingDate}:void 0);');
 s=replace(s,'timeline.find(item=>String(item.row?.id||"")===linkedShift)','timeline.find(item=>String(item.row?.id||"")===linkedShift||(item.row?._bdOperationalDay&&"operational-report:"+item.row._bdOperationalDay.venueId+":"+item.date===linkedShift))');
 s=replace(s,'contextModel=bdShiftContextModelV156(todayState,nextWorking,schedule,canManage)','contextModel=bdShiftContextModelV156(todayState,nextWorking,schedule,canManage),activeOperationalDay=revenue.find(row=>row._bdOperationalDay?.status==="OPERATING")?._bdOperationalDay');
 s=replace(s,'function closeSheet(){','if(activeOperationalDay){contextModel.title="Касса открыта";contextModel.detail="Выручка предварительная";contextModel.actionLabel=canManage?"Заполнить день":null;}\nfunction closeSheet(){');
 s=replace(s,'openCloseDate(todayState?.operatingDate)','openCloseDate(activeOperationalDay?.businessDate||todayState?.operatingDate)');
 s=replace(s,'row?i.jsxs("div",{className:"bd-shift-card-metrics"','row?i.jsxs("div",{className:"bd-shift-card-metrics"');
 s=replace(s,'children:hasRevenue?Mn(Number(row.revenue)):"—"}),row?', 'children:hasRevenue?Mn(Number(row.revenue)):"—"}),row?._bdOperationalDay&&i.jsx("small",{children:bdOperationalRevenueCopy(row._bdOperationalDay)}),row?');
 s=s.replace('closedRecords.reduce((result,row)','records.filter(row=>!row.isDraft).reduce((result,row)').replace('children:closedRecords.length?Mn(totals.revenue)','children:records.length?Mn(totals.revenue)');
 return s;
});
fn('bdShiftViewV156',s=>{
 s=replace(s,'(e.kind==="closed"||e.kind==="draft")','(e.kind==="closed"||e.kind==="draft"||e.kind==="operating"||e.kind==="awaiting")');
 s=replace(s,'children:"Редактировать смену"','children:d?._bdOperationalDay?.revenue?.readOnly?"Заполнить операционные данные":"Редактировать смену"');
 s=replace(s,'children:[v&&i.jsxs','children:[d?._bdOperationalDay&&i.jsx("p",{children:bdOperationalRevenueCopy(d._bdOperationalDay)}),v&&i.jsxs');
 return s;
});
fn('bdShiftCloseApiV272',s=>replace(s,'r.assortment&&Vm','r.revenues&&Vm("bd_finance_revenue",r.revenues),r.incidents&&Vm("bd_cases",r.incidents),setTimeout(()=>["bd_finance_revenue","bd_cases"].forEach(a=>window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:a}}))),0),r.assortment&&Vm'));
fn('PAe',s=>{
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
source=patchReceiptCost(source);
parse(source,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,source);console.log('Operational Day Phase 1A applied');
