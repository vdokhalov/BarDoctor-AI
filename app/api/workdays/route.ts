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
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { stableSalesValue } from "../../../lib/bardoctor/sales-events";
import { venueDate, venueClock, venueTimeFromJson } from "../../../lib/bardoctor/venue-time";
type Row=Record<string,unknown>;
const keys=[OPERATIONAL_REPORT_STORE_KEY,"bd_finance_revenue","bd_sales_events_v1","bd_sales_documents","bd_employees","bd_payroll_rules","bd_finance_gap_reasons","bd_inventory_writeoffs","bd_cases","bd_month_closings"];
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const validDate=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
async function load(request:Request){
 const context=await authenticatedEvidenceContext(request);if(!context)return {error:unauthorized()};const account=context.account;
 if(!canReadManagementWorkday(account))return {error:reply({ok:false,code:"ACCESS_DENIED"},403)};
 const db=getD1(),snapshots=await readStoreSnapshots(db,account.id,keys),scope={venueId:account.venueId,workspaceId:context.workspaceId,dataAccountId:account.id};
 try{
  const raw=Object.fromEntries(keys.map(key=>[key,JSON.parse(snapshots.find(s=>s.key===key)?.dataJson??(key==="bd_month_closings"?"null":"[]"))]));
  for(const key of keys.filter(k=>k!=="bd_month_closings"))if(!Array.isArray(raw[key])||raw[key].some((r:unknown)=>!r||typeof r!=="object"||Array.isArray(r)))throw Error("Invalid store");
  const rows=(key:string)=>scopedBusinessRows(raw[key],scope);
  const profile=record(JSON.parse(account.restaurantJson||"{}"));
  return {context,account,db,snapshots,raw,rows,profile,now:new Date().toISOString(),timezone:venueTimeFromJson(account.restaurantJson).timezone};
 }catch{return {error:reply({ok:false,code:"WORKDAY_STORE_NEEDS_REVIEW",error:"Данные рабочего дня требуют проверки"},409)};}
}
type Loaded=Extract<Awaited<ReturnType<typeof load>>,{account:unknown}>;
function projection(c:Loaded,date:string){return operationalDay({venueId:c.account.venueId,workspaceId:c.context.workspaceId,dataAccountId:c.account.id,businessDate:date,asOf:c.now,currency:accountingCurrencyFromRestaurantJson(c.account.restaurantJson),revenues:c.rows(keys[1]),events:c.rows(keys[2]),documents:c.rows(keys[3]),reports:c.rows(keys[0]),writeOffs:c.rows(keys[7]),incidents:c.rows(keys[8])});}
export async function GET(request:Request){
 const c=await load(request);if(c.error)return c.error;
 const localDate=venueDate(c.now,c.timezone),clock=venueClock(c.now,c.timezone),overnight=typeof c.profile.openTime==="string"&&typeof c.profile.closeTime==="string"&&c.profile.closeTime<=c.profile.openTime&&clock<c.profile.closeTime,defaultDate=overnight?new Date(Date.parse(localDate+"T12:00:00Z")-86400000).toISOString().slice(0,10):localDate;
 const open=c.rows(keys[0]).find(r=>r.workdayStatus==="OPEN"),query=new URL(request.url).searchParams.get("date"),date=query||String(open?.date||defaultDate);
 if(!validDate(date))return reply({ok:false,code:"DATE_INVALID"},400);
 const report=c.rows(keys[0]).find(r=>r.date===date),rules=c.rows(keys[5]);
 return reply({ok:true,venueId:c.account.venueId,date,timezone:c.timezone,startTime:venueClock(c.now,c.timezone),day:projection(c,date),cashSessions:c.rows(keys[1]).filter(r=>r.date===date&&r.revenueSource==="sales_events_v1").map(r=>({id:r.id,name:r.shiftName,status:r.closingStatus,cash:record(r.closingReport).cash??null})),workday:report?.workdayStatus?report:null,legacyReport:Boolean(!report?.workdayStatus&&(report||projection(c,date).report)),canManage:hasPermission(c.account,"shifts.manage"),employees:c.rows(keys[4]).map(e=>({id:e.id,name:e.name,position:e.position||"",customPositionLabel:e.customPositionLabel||"",active:e.active!==false&&!e.archived&&(!e.status||e.status==="active"),requirements:workdayPayrollRequirements(e,rules)}))});
}
export async function POST(request:Request){return withStoreCasRetries(request,command);}
async function command(request:Request):Promise<Response>{
 const c=await load(request);if(c.error)return c.error;
 if(!hasPermission(c.account,"shifts.manage"))return reply({ok:false,code:"ACCESS_DENIED"},403);
 const parsed=await readJsonRequest<Row>(request,{maxBytes:100_000});if(!parsed.ok)return parsed.response;const body=parsed.data;
 if(body.venueId!==c.account.venueId)return reply({ok:false,code:"VENUE_CHANGED"},409);
 if(!validDate(body.date)||!["open","team","preview","close"].includes(String(body.action))||typeof body.operationId!=="string"||!body.operationId.trim()||body.operationId.length>120||!Number.isSafeInteger(body.expectedRevision)||Number(body.expectedRevision)<0)return reply({ok:false,code:"WORKDAY_COMMAND_INVALID"},422);
 const date=body.date,id=`operational-report:${c.account.venueId}:${date}`,reports=c.rows(keys[0]),previous=reports.find(r=>r.id===id||r.date===date);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stableSalesValue(body)));
 const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join(""),receipts=Array.isArray(previous?.workdayReceipts)?previous.workdayReceipts.map(record):[],seen=receipts.find(r=>r.id===body.operationId);
 if(seen)return seen.fingerprint===fingerprint?reply({ok:true,duplicate:true,workday:previous,day:projection(c,date)}):reply({ok:false,code:"WORKDAY_IDEMPOTENCY_CONFLICT"},409);
 if(closedMonthsFromStore(c.raw[keys[9]]).has(date.slice(0,7)))return reply({ok:false,code:"MONTH_LOCKED"},423);
 if(Number(previous?.workdayRevision||0)!==body.expectedRevision)return reply({ok:false,code:"WORKDAY_REVISION_CONFLICT",error:"Рабочая смена изменена. Обновите её перед сохранением."},409);
 if(body.action==="open"){
  if(body.startTime!==undefined&&(typeof body.startTime!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)))return reply({ok:false,code:"WORKDAY_START_TIME_INVALID"},422);
  if(previous||projection(c,date).report)return reply({ok:false,code:"WORKDAY_ALREADY_EXISTS",error:"Отчёт дня уже существует. Откройте его для просмотра."},409);
  if(reports.some(r=>r.workdayStatus==="OPEN")||c.rows(keys[1]).some(r=>r.closingStatus==="open"&&r.date!==date))return reply({ok:false,code:"WORKDAY_ALREADY_OPEN",error:"Сначала завершите ранее открытую рабочую или кассовую смену."},409);
 }else if(previous?.workdayStatus!=="OPEN")return reply({ok:false,code:"WORKDAY_NOT_OPEN"},409);
 const staffing=body.action==="close"?previous?.staffing:body.staffing;
 if(!Array.isArray(staffing)||!staffing.length||staffing.length>200||new Set(staffing.map(s=>record(s).employeeId)).size!==staffing.length)return reply({ok:false,code:"WORKDAY_TEAM_REQUIRED",error:"Выберите работавших сотрудников."},422);
 const employees=c.rows(keys[4]),normalized:Row[]=[];
 for(const value of staffing){const staff=record(value);if(!employees.some(e=>e.id===staff.employeeId))return reply({ok:false,code:"WORKDAY_EMPLOYEE_INVALID"},422);const row:Row={employeeId:staff.employeeId};for(const field of ["hours","personalSales","units"]){if(staff[field]!==undefined&&staff[field]!==null&&staff[field]!==""){if(typeof staff[field]!=="number"||!Number.isFinite(staff[field])||Number(staff[field])<0)return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);row[field]=staff[field];}}normalized.push(row);}
 const day=projection(c,date);
 const shiftVenueSales=day.revenue.readOnly?day.revenue.amount:body.action==="close"?previous?.shiftVenueSales:body.shiftVenueSales,shiftDepartmentSales=body.action==="close"?previous?.shiftDepartmentSales:body.shiftDepartmentSales;
 if(shiftVenueSales!==undefined&&(typeof shiftVenueSales!=="number"||!Number.isFinite(shiftVenueSales)||shiftVenueSales<0))return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);
 if(shiftDepartmentSales!==undefined&&(shiftDepartmentSales===null||typeof shiftDepartmentSales!=="object"||Array.isArray(shiftDepartmentSales)||Object.keys(shiftDepartmentSales).length>100||Object.values(shiftDepartmentSales).some(value=>typeof value!=="number"||!Number.isFinite(value)||value<0)))return reply({ok:false,code:"WORKDAY_INPUT_INVALID"},422);
 const payroll=calculateWorkdayPayroll({date,staffing:normalized,employees,rules:c.rows(keys[5]),profile:c.profile,revenues:c.rows(keys[1]),gaps:c.rows(keys[6]),venueId:c.account.venueId,shiftVenueSales,shiftDepartmentSales,previous});
 if(body.action==="preview")return reply({ok:true,payroll});
 if(body.action==="close"){
  if(day.revenue.consistency==="MISMATCH")return reply({ok:false,code:"WORKDAY_REVENUE_NEEDS_REVIEW",error:"Продажи и финансовая выручка расходятся. Проверьте данные перед закрытием рабочего дня."},409);
  if(day.cashShifts.some(s=>s.status==="OPEN"))return reply({ok:false,code:"WORKDAY_CASH_OPEN",error:"Сначала закройте все кассовые смены дня."},409);
  if(stableSalesValue(record(previous?.workdayPayrollDraft).payrollBreakdown)!==stableSalesValue(payroll.payrollBreakdown))return reply({ok:false,code:"WORKDAY_PAYROLL_CHANGED",error:"Расчёт ФОТ изменился. Вернитесь к команде, сохраните часы и проверьте новую сумму перед закрытием."},409);
  if(payroll.status!=="COMPLETE")return reply({ok:false,code:"WORKDAY_PAYROLL_INCOMPLETE",error:"Заполните недостающие данные ФОТ.",payroll},422);
  if(record(body.reviewedOperations).writeoffs!==day.operations.writeOffCount||record(body.reviewedOperations).incidents!==day.operations.incidentCount)return reply({ok:false,code:"WORKDAY_OPERATIONS_CHANGED",error:"Списания или происшествия изменились. Обновите день и проверьте их снова."},409);
  for(const [field,count] of [["writeoffs",day.operations.writeOffCount],["incidents",day.operations.incidentCount]] as const)if(record(body.confirmations)[field]!== (count?"recorded":"none"))return reply({ok:false,code:"WORKDAY_OPERATIONS_UNCONFIRMED",error:"Проверьте списания и происшествия; если их не было, подтвердите это явно."},422);
 }
 const actor={accountId:c.account.actorAccountId,name:[c.account.firstName,c.account.lastName].filter(Boolean).join(" "),role:c.account.role};
 const next:Row={...previous,id,venueId:c.account.venueId,date,accountingMonth:date.slice(0,7),staffing:normalized,shiftVenueSales,shiftDepartmentSales,workdayStatus:body.action==="close"?"CLOSED":"OPEN",closingStatus:body.action==="close"?"closed":"open",workdayRevision:Number(previous?.workdayRevision||0)+1,workdayPayrollDraft:payroll,workdayOpenedAt:previous?.workdayOpenedAt||c.now,workdayOpenedBy:previous?.workdayOpenedBy||actor,createdAt:previous?.createdAt||c.now,updatedAt:c.now,workdayReceipts:[...receipts,{id:body.operationId,fingerprint}]};
 next.workdayStartTime=previous?.workdayStartTime||body.startTime||venueClock(c.now,c.timezone);
 if(body.action==="close")Object.assign(next,{payrollBreakdown:payroll.payrollBreakdown,workdayClosedAt:c.now,workdayClosedBy:actor,workdayConfirmations:body.confirmations,workdaySummary:{asOf:c.now,revenue:day.revenue,payroll:payroll.payrollBreakdown,team:normalized.map(staff=>({...staff,name:employees.find(e=>e.id===staff.employeeId)?.name||"Сотрудник"})),operations:day.operations,cashShifts:c.rows(keys[1]).filter(r=>r.date===date&&r.revenueSource==="sales_events_v1").map(r=>({id:r.id,name:r.shiftName,status:r.closingStatus,cash:record(r.closingReport).cash??null}))}});
 else delete next.payrollBreakdown;
 const updated=(c.raw[keys[0]] as Row[]).filter(r=>r!==previous&&!(r.id===id&&r.venueId===c.account.venueId));updated.push(next);
 const statements=[posMembershipGuard(c.db,c.account,c.now),c.db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(c.account.id,keys[0],JSON.stringify(updated),c.now),c.db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(c.account.id,keys[0],"workday."+body.action,id,"Рабочая смена "+date,date.slice(0,7),JSON.stringify(previous||null),JSON.stringify(next),'["workdayStatus","staffing","payrollBreakdown"]',actor.name,actor.role,"Подтверждённая операция рабочей смены",c.now)];
 await runStoreCasBatch(c.db,c.account.id,c.snapshots,statements,c.now);return reply({ok:true,workday:next,payroll},201);
}
