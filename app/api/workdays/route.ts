import {selectWorkShift,shiftRevenues,workShiftRows} from "../../../lib/bardoctor/work-shifts";
import {prepareClosedHealth,FinancialReadPending} from '../../../lib/bardoctor/closed-health';
import { SALES_ACCOUNTING_KEY, parseSalesAccounting, salesModeForDate } from "../../../lib/bardoctor/sales-accounting";
import { workdayPersonalSales, staffingWithPersonalSales } from '../../../lib/bardoctor/workday-personal-sales';
import {readSalesEvents} from '../../../lib/bardoctor/sales-event-storage';
import { authenticatedEvidenceContext } from "../../../lib/bardoctor/evidence-resolver";
import { unauthorized } from "../../../lib/bardoctor/auth";
import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { canReadManagementWorkday } from "../../../lib/bardoctor/management-workday";
import { calculateWorkdayPayroll, workdayPayrollRequirements } from "../../../lib/bardoctor/workday-payroll";
import { businessRecord as record, scopedBusinessRows } from "../../../lib/bardoctor/business-day-rows";
import { OPERATIONAL_REPORT_STORE_KEY, operationalDay } from "../../../lib/bardoctor/operational-day";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, storeCasGuard, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { stableSalesValue } from "../../../lib/bardoctor/sales-events";
import { venueDate, venueClock, venueTimeFromJson } from "../../../lib/bardoctor/venue-time";
type Row=Record<string,unknown>;
const keys=[OPERATIONAL_REPORT_STORE_KEY,"bd_finance_revenue","bd_sales_events_v1","bd_sales_documents","bd_employees","bd_payroll_rules","bd_finance_gap_reasons","bd_inventory_writeoffs","bd_cases","bd_month_closings",SALES_ACCOUNTING_KEY];
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const validDate=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
async function load(request:Request,commandDate?:string){
 const context=await authenticatedEvidenceContext(request);if(!context)return {error:unauthorized()};const account=context.account;
 if(!canReadManagementWorkday(account))return {error:reply({ok:false,code:"ACCESS_DENIED"},403)};
 const db=getD1(),snapshots=await readStoreSnapshots(db,account.id,keys),scope={venueId:account.venueId,workspaceId:context.workspaceId,dataAccountId:account.id};
 try{
  const raw=Object.fromEntries(keys.map(key=>[key,JSON.parse(snapshots.find(s=>s.key===key)?.dataJson??(key==="bd_month_closings"||key===SALES_ACCOUNTING_KEY?"null":"[]"))]));
  const timezone=venueTimeFromJson(account.restaurantJson).timezone,now=new Date().toISOString();
  const requested=commandDate||new URL(request.url).searchParams.get('date');
  const openReport=Array.isArray(raw[keys[0]])?raw[keys[0]].find((r:Row)=>r.venueId===account.venueId&&r.workdayStatus==='OPEN'):null;
  const config=record(JSON.parse(account.restaurantJson||'{}')),clock=venueClock(now,timezone),today=venueDate(now,timezone);
  const overnight=typeof config.openTime==='string'&&typeof config.closeTime==='string'&&config.closeTime<=config.openTime&&clock<config.closeTime;
  const defaultDate=overnight?new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10):today;
  const eventDate=requested&&validDate(requested)?requested:String(openReport?.date||defaultDate);
  raw.bd_sales_events_v1=await readSalesEvents(db,account.id,snapshots.find(s=>s.key==='bd_sales_events_v1')?.dataJson,{date:eventDate});
  for(const key of keys.filter(k=>k!=="bd_month_closings"&&k!==SALES_ACCOUNTING_KEY))if(!Array.isArray(raw[key])||raw[key].some((r:unknown)=>!r||typeof r!=="object"||Array.isArray(r)))throw Error("Invalid store");
  const rows=(key:string)=>scopedBusinessRows(raw[key],scope);
  const profile=record(JSON.parse(account.restaurantJson||"{}"));
  const memberships=(await db.prepare('SELECT account_id,employee_id FROM venue_memberships WHERE venue_id=? AND employee_id IS NOT NULL').bind(account.venueId).all<Row>()).results;
  return {context,account,db,snapshots,raw,rows,profile,memberships,now:new Date().toISOString(),timezone:venueTimeFromJson(account.restaurantJson).timezone};
 }catch{return {error:reply({ok:false,code:"WORKDAY_STORE_NEEDS_REVIEW",error:"Данные рабочего дня требуют проверки"},409)};}
}
type Loaded=Extract<Awaited<ReturnType<typeof load>>,{account:unknown}>;
function shiftInputs(c:Loaded,date:string,shift?:Row){
 const revenues=shift?shiftRevenues(c.rows(keys[1]),c.rows(keys[0]),shift):c.rows(keys[1]);
 const ids=new Set(revenues.map(r=>r.id));
 return {revenues,events:shift?c.rows(keys[2]).filter(r=>ids.has(r.revenueRowId)):c.rows(keys[2]),reports:shift?[shift]:c.rows(keys[0])};
}
function projection(c:Loaded,date:string,shift?:Row){const projected=operationalDay({venueId:c.account.venueId,workspaceId:c.context.workspaceId,dataAccountId:c.account.id,businessDate:date,asOf:c.now,currency:accountingCurrencyFromRestaurantJson(c.account.restaurantJson),...shiftInputs(c,date,shift),documents:c.rows(keys[3]).filter(d=>!shift||shiftInputs(c,date,shift).revenues.some(r=>Array.isArray(r.salesDocumentIds)&&r.salesDocumentIds.includes(d.id))),writeOffs:c.rows(keys[7]),incidents:c.rows(keys[8])});const saved=record(shift?.workdaySummary);return shift?.workdayStatus==="CLOSED"&&saved.revenue&&saved.operations?{...projected,revenue:saved.revenue as typeof projected.revenue,operations:saved.operations as typeof projected.operations}:projected;}
function personalSales(c:Loaded,date:string,shift?:Row){return workdayPersonalSales({date,venueId:c.account.venueId,currency:accountingCurrencyFromRestaurantJson(c.account.restaurantJson),employees:c.rows(keys[4]),memberships:c.memberships,...shiftInputs(c,date,shift)});}
function openingBlockers(c:Loaded){return [...c.rows(keys[0]).filter(r=>r.workdayStatus==="OPEN").map(r=>({kind:"workday",id:r.id,date:r.date,name:"Рабочий день",href:"/shifts?venue="+c.account.venueId+"&workday="+encodeURIComponent(String(r.date))+"&month="+String(r.date).slice(0,7)})),...c.rows(keys[1]).filter(r=>r.closingStatus==="open").map(r=>({kind:"cash",id:r.id,date:r.date,name:r.shiftName||"Касса",href:"/cashier?venue="+c.account.venueId}))];}
export async function GET(request:Request){
 const c=await load(request);if(c.error)return c.error;
 const localDate=venueDate(c.now,c.timezone),clock=venueClock(c.now,c.timezone),overnight=typeof c.profile.openTime==="string"&&typeof c.profile.closeTime==="string"&&c.profile.closeTime<=c.profile.openTime&&clock<c.profile.closeTime,defaultDate=overnight?new Date(Date.parse(localDate+"T12:00:00Z")-86400000).toISOString().slice(0,10):localDate;
 const open=c.rows(keys[0]).find(r=>r.workdayStatus==="OPEN"),query=new URL(request.url).searchParams.get("date"),date=query||String(open?.date||defaultDate);
 if(!validDate(date))return reply({ok:false,code:"DATE_INVALID"},400);
 if(new URL(request.url).searchParams.get("view")==="incidents"){
  if(!hasPermission(c.account,"incidents.view"))return reply({ok:false,code:"ACCESS_DENIED"},403);
  if(new URL(request.url).searchParams.get("venue")!==String(c.account.venueId))return reply({ok:false,code:"VENUE_CHANGED",error:"Выберите заведение этой смены, затем откройте происшествия снова."},409);
  const incidents=c.rows("bd_cases").filter(row=>String(row.businessDate??row.eventDate??row.date).slice(0,10)===date);
  return reply({ok:true,venueId:c.account.venueId,date,incidents});
 }
 const same=workShiftRows(c.rows(keys[0]),c.account.venueId,date),report=selectWorkShift(same,new URL(request.url).searchParams.get("workdayId")),rules=c.rows(keys[5]);
 if(new URL(request.url).searchParams.has("workdayId")&&!report)return reply({ok:false,code:"WORKDAY_NOT_FOUND"},404);
 return reply({ok:true,personalSales:report?.workdayStatus==="CLOSED"?null:personalSales(c,date,report),openingBlockers:openingBlockers(c),venueId:c.account.venueId,date,timezone:c.timezone,startTime:venueClock(c.now,c.timezone),shifts:same.map(r=>({id:r.id,sequence:r.workdaySequence||1,status:r.workdayStatus})),canOpenNext:date===defaultDate&&report?.workdayStatus==="CLOSED"&&report===selectWorkShift(same)&&!openingBlockers(c).length,day:projection(c,date,report),cashSessions:shiftInputs(c,date,report).revenues.filter(r=>r.date===date&&r.revenueSource==="sales_events_v1").map(r=>({id:r.id,name:r.shiftName,status:r.closingStatus,cash:record(r.closingReport).cash??null})),workday:report?.workdayStatus?report:null,legacyReport:Boolean(!report?.workdayStatus&&(report||projection(c,date).report)),canManage:hasPermission(c.account,"shifts.manage"),employees:c.rows(keys[4]).map(e=>({id:e.id,name:e.name,position:e.position||"",customPositionLabel:e.customPositionLabel||"",active:e.active!==false&&!e.archived&&(!e.status||e.status==="active"),requirements:workdayPayrollRequirements(e,rules)}))});
}
export async function POST(request:Request){return withStoreCasRetries(request,command);}
async function command(request:Request):Promise<Response>{
 const parsed=await readJsonRequest<Row>(request,{maxBytes:100_000});if(!parsed.ok)return parsed.response;const body=parsed.data;
 const c=await load(request,validDate(body.date)?body.date:undefined);if(c.error)return c.error;
 if(!hasPermission(c.account,"shifts.manage"))return reply({ok:false,code:"ACCESS_DENIED"},403);

 if(body.venueId!==c.account.venueId)return reply({ok:false,code:"VENUE_CHANGED"},409);
 if(!validDate(body.date)||!["open","open_next","team","preview","close"].includes(String(body.action))||typeof body.operationId!=="string"||!body.operationId.trim()||body.operationId.length>120||!Number.isSafeInteger(body.expectedRevision)||Number(body.expectedRevision)<0)return reply({ok:false,code:"WORKDAY_COMMAND_INVALID"},422);
 const date=body.date,reports=c.rows(keys[0]),same=workShiftRows(reports,c.account.venueId,date),opening=body.action==="open"||body.action==="open_next";
 const replay=reports.find(r=>Array.isArray(r.workdayReceipts)&&r.workdayReceipts.some((x:Row)=>x.id===body.operationId));
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stableSalesValue(body)));
 const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 if(replay){const seen=(replay.workdayReceipts as Row[]).find(r=>r.id===body.operationId)!;return seen.fingerprint===fingerprint?reply({ok:true,duplicate:true,workday:replay,day:projection(c,date,replay)}):reply({ok:false,code:"WORKDAY_IDEMPOTENCY_CONFLICT"},409);}
 if(!opening&&same.length>1&&!body.workdayId)return reply({ok:false,code:"WORKDAY_ID_REQUIRED"},409);
 const target=selectWorkShift(same,body.workdayId),previous=opening?undefined:target;
 const sequence=opening?Math.max(0,...same.map(r=>Number(r.workdaySequence||1)))+1:Number(previous?.workdaySequence||1);
 const id=previous?.id??(sequence===1?`operational-report:${c.account.venueId}:${date}`:`workday:${c.account.venueId}:${body.operationId}`);
 const receipts=Array.isArray(previous?.workdayReceipts)?previous.workdayReceipts.map(record):[];
 if(closedMonthsFromStore(c.raw[keys[9]]).has(date.slice(0,7)))return reply({ok:false,code:"MONTH_LOCKED"},423);
 if(Number((body.action==="open_next"?target:previous)?.workdayRevision||0)!==body.expectedRevision)return reply({ok:false,code:"WORKDAY_REVISION_CONFLICT",error:"Рабочая смена изменена. Обновите её перед сохранением."},409);
 if(opening){
  if(body.startTime!==undefined&&(typeof body.startTime!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)))return reply({ok:false,code:"WORKDAY_START_TIME_INVALID"},422);
  if(body.action==="open"&&(same.length||projection(c,date).report))return reply({ok:false,code:"WORKDAY_ALREADY_EXISTS",error:"Отчёт дня уже существует. Откройте его для просмотра."},409);
  if(body.action==="open_next"){
   const today=venueDate(c.now,c.timezone),clock=venueClock(c.now,c.timezone),overnight=typeof c.profile.openTime==='string'&&typeof c.profile.closeTime==='string'&&c.profile.closeTime<=c.profile.openTime&&clock<c.profile.closeTime;
   const currentDate=overnight?new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10):today;
   if(date!==currentDate||!target||target!==selectWorkShift(same)||target.workdayStatus!=="CLOSED"||same.some(r=>r.workdayStatus!=="CLOSED"))return reply({ok:false,code:"WORKDAY_NEXT_NOT_ALLOWED",error:"Следующую смену можно открыть только после последней закрытой смены текущего рабочего дня."},409);
  }
  const blockers=openingBlockers(c);if(blockers.length)return reply({ok:false,code:"WORKDAY_ALREADY_OPEN",blockers,error:"Сначала завершите: "+blockers.map(b=>b.name+" · "+b.date).join(", ")+"."},409);
 }else if(previous?.workdayStatus!=="OPEN")return reply({ok:false,code:"WORKDAY_NOT_OPEN"},409);
 const staffing=body.action==="close"?previous?.staffing:body.staffing;
 if(!Array.isArray(staffing)||!staffing.length||staffing.length>200||new Set(staffing.map(s=>record(s).employeeId)).size!==staffing.length)return reply({ok:false,code:"WORKDAY_TEAM_REQUIRED",error:"Выберите работавших сотрудников."},422);
 const employees=c.rows(keys[4]),normalized:Row[]=[];
 for(const value of staffing){const staff=record(value);if(!employees.some(e=>e.id===staff.employeeId))return reply({ok:false,code:"WORKDAY_EMPLOYEE_INVALID"},422);const row:Row={employeeId:staff.employeeId,...(staff.personalSalesSource==="AUTO"?{personalSalesSource:"AUTO"}:{})};for(const field of ["hours","personalSales","units"]){if(staff[field]!==undefined&&staff[field]!==null&&staff[field]!==""){if(typeof staff[field]!=="number"||!Number.isFinite(staff[field])||Number(staff[field])<0)return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);row[field]=staff[field];}}normalized.push(row);}
 const subject:Row=previous??{id,venueId:c.account.venueId,date,workdaySequence:sequence};
 const facts=personalSales(c,date,subject);const resolved=normalized.map(staff=>workdayPayrollRequirements(employees.find(e=>e.id===staff.employeeId)!,c.rows(keys[5])).personalSales?staffingWithPersonalSales([staff],facts)[0]:staff);normalized.splice(0,normalized.length,...resolved);
 const day=projection(c,date,subject);
 const shiftVenueSales=day.revenue.readOnly?day.revenue.amount??undefined:body.action==="close"?previous?.shiftVenueSales:body.shiftVenueSales,shiftDepartmentSales=body.action==="close"?previous?.shiftDepartmentSales:body.shiftDepartmentSales;
 if(shiftVenueSales!==undefined&&(typeof shiftVenueSales!=="number"||!Number.isFinite(shiftVenueSales)||shiftVenueSales<0))return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);
 if(shiftDepartmentSales!==undefined&&(shiftDepartmentSales===null||typeof shiftDepartmentSales!=="object"||Array.isArray(shiftDepartmentSales)||Object.keys(shiftDepartmentSales).length>100||Object.values(shiftDepartmentSales).some(value=>typeof value!=="number"||!Number.isFinite(value)||value<0)))return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);
 const payroll=calculateWorkdayPayroll({date,staffing:normalized,employees,rules:c.rows(keys[5]),profile:c.profile,revenues:c.rows(keys[1]),gaps:c.rows(keys[6]),venueId:c.account.venueId,shiftVenueSales,shiftDepartmentSales,previous,priorReports:same.filter(r=>r.id!==id&&r.workdayStatus==="CLOSED")});
 if(body.action==="preview")return reply({ok:true,payroll});
 if(body.action==="close"){
  if(day.revenue.consistency==="MISMATCH")return reply({ok:false,code:"WORKDAY_REVENUE_NEEDS_REVIEW",error:"Продажи и финансовая выручка расходятся. Проверьте данные перед закрытием рабочего дня."},409);
  if(day.cashShifts.some(s=>s.status==="OPEN"))return reply({ok:false,code:"WORKDAY_CASH_OPEN",error:"Сначала закройте все смены продаж дня, включая ручные."},409);
  if(stableSalesValue(record(previous?.workdayPayrollDraft).payrollBreakdown)!==stableSalesValue(payroll.payrollBreakdown))return reply({ok:false,code:"WORKDAY_PAYROLL_CHANGED",error:"Расчёт ФОТ изменился. Вернитесь к команде, сохраните часы и проверьте новую сумму перед закрытием."},409);
  if(payroll.status!=="COMPLETE")return reply({ok:false,code:"WORKDAY_PAYROLL_INCOMPLETE",error:"Заполните недостающие данные ФОТ.",payroll},422);
  if(record(body.reviewedOperations).writeoffs!==day.operations.writeOffCount||record(body.reviewedOperations).incidents!==day.operations.incidentCount)return reply({ok:false,code:"WORKDAY_OPERATIONS_CHANGED",error:"Списания или происшествия изменились. Обновите день и проверьте их снова."},409);
  for(const [field,count] of [["writeoffs",day.operations.writeOffCount],["incidents",day.operations.incidentCount]] as const)if(record(body.confirmations)[field]!== (count?"recorded":"none"))return reply({ok:false,code:"WORKDAY_OPERATIONS_UNCONFIRMED",error:"Проверьте списания и происшествия; если их не было, подтвердите это явно."},422);
 }
 const actor={accountId:c.account.actorAccountId,name:[c.account.firstName,c.account.lastName].filter(Boolean).join(" "),role:c.account.role};
 const next:Row={...previous,id,workdaySequence:sequence,venueId:c.account.venueId,date,accountingMonth:date.slice(0,7),staffing:normalized,shiftVenueSales,shiftDepartmentSales,salesModeSnapshot:previous?.salesModeSnapshot??(parseSalesAccounting(c.raw[SALES_ACCOUNTING_KEY]??null,c.account.venueId)?.shiftChanges?"PER_SHIFT":salesModeForDate(parseSalesAccounting(c.raw[SALES_ACCOUNTING_KEY]??null,c.account.venueId),date)),workdayStatus:body.action==="close"?"CLOSED":"OPEN",closingStatus:body.action==="close"?"closed":"open",workdayRevision:Number(previous?.workdayRevision||0)+1,workdayPayrollDraft:payroll,workdayOpenedAt:previous?.workdayOpenedAt||c.now,workdayOpenedBy:previous?.workdayOpenedBy||actor,createdAt:previous?.createdAt||c.now,updatedAt:c.now,workdayReceipts:[...receipts,{id:body.operationId,fingerprint}]};
 next.workdayStartTime=previous?.workdayStartTime||body.startTime||venueClock(c.now,c.timezone);
 if(body.action==="close")Object.assign(next,{payrollBreakdown:payroll.payrollBreakdown,workdayClosedAt:c.now,workdayClosedBy:actor,workdayConfirmations:body.confirmations,workdaySummary:{asOf:c.now,revenue:day.revenue,payroll:payroll.payrollBreakdown,team:normalized.map(staff=>({...staff,name:employees.find(e=>e.id===staff.employeeId)?.name||"Сотрудник"})),operations:day.operations,cashShifts:shiftInputs(c,date,subject).revenues.filter(r=>r.date===date&&r.revenueSource==="sales_events_v1").map(r=>({id:r.id,name:r.shiftName,status:r.closingStatus,cash:record(r.closingReport).cash??null}))}});
 else delete next.payrollBreakdown;
 const updated=(c.raw[keys[0]] as Row[]).filter(r=>r!==previous&&!(r.id===id&&r.venueId===c.account.venueId));updated.push(next);
 const statements=[posMembershipGuard(c.db,c.account,c.now),c.db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(c.account.id,keys[0],JSON.stringify(updated),c.now),c.db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(c.account.id,keys[0],"workday."+body.action,id,"Рабочая смена "+date,date.slice(0,7),JSON.stringify(previous||null),JSON.stringify(next),'["workdayStatus","staffing","payrollBreakdown"]',actor.name,actor.role,"Подтверждённая операция рабочей смены",c.now)];
 let health:Awaited<ReturnType<typeof prepareClosedHealth>>=null;
 if(body.action==='close')try{health=await prepareClosedHealth(c.account,next,c.snapshots,c.now);}catch(error){if(error instanceof FinancialReadPending)return reply({ok:true,pending:true,code:'HEALTH_CLOSE_PENDING'},202);throw error;}
 const snapshots=[...c.snapshots,...(health?.snapshots??[]).filter(x=>!c.snapshots.some(y=>y.key===x.key))];
 if(health)statements.push(...health.statements);
 const guards=[];for(let offset=0;offset<snapshots.length;offset+=16)guards.push(storeCasGuard(c.db,c.account.id,snapshots.slice(offset,offset+16),c.now));
 await runStoreCasBatch(c.db,c.account.id,[],[...guards,...statements],c.now);return reply({ok:true,workday:next,payroll},201);
}
