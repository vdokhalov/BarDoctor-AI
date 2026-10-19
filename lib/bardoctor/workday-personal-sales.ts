import { buildPosShiftReport } from './pos-shift-report';
import type { SalesEvent } from './sales-events';
type Row=Record<string,unknown>;
/** Read-only daily attribution across the day's cash sessions. Never infer identity from names. */
export function workdayPersonalSales(input:{date:string;venueId:number;currency:string|null;employees:Row[];memberships:Row[];revenues:Row[];events:Row[]}) {
 const result:Record<string,number|null>=Object.fromEntries(input.employees.map(e=>[String(e.id),null]));
 const shifts=input.revenues.filter(r=>r.date===input.date);
 if(input.events.some(e=>e.businessDate===input.date&&(!shifts.some(s=>s.id===e.revenueRowId)||e.venueId!==input.venueId)))return result;
 if(!shifts.length||shifts.some(r=>r.venueId!==input.venueId||r.revenueSource!=='sales_events_v1'||r.currency!==input.currency))return result;
 try {
  const reports=shifts.map(s=>buildPosShiftReport({venueId:input.venueId,revenues:input.revenues,events:input.events as SalesEvent[]},String(s.id)));
  // Missing authors make an employee's true total unknowable, not zero.
  if(reports.some(r=>r.employees.some(e=>e.accountId==null&&e.paidReceipts>0)))return result;
  for(const employee of input.employees){
   const links=input.memberships.filter(m=>m.employee_id===employee.id);
   if(links.length!==1||input.memberships.filter(m=>m.account_id===links[0].account_id).length!==1)continue;
   const accountId=Number(links[0].account_id);if(!Number.isSafeInteger(accountId)||accountId<=0)continue;
   result[String(employee.id)]=reports.reduce((sum,r)=>sum+Math.round((r.employees.find(e=>e.accountId===accountId)?.paidRevenue??0)*100),0)/100;
  }
 }catch{/* Incomplete or inconsistent evidence remains unknown. */}
 return result;
}
export function staffingWithPersonalSales(staffing:Row[],facts:Record<string,number|null>):Row[]{
 return staffing.map(staff=>{
  if(staff.personalSalesSource!=='AUTO'&&staff.personalSales!=null)return {...staff,personalSalesSource:'MANUAL'};
  const value=facts[String(staff.employeeId)];
  return {...staff,personalSales:value==null?undefined:value,personalSalesSource:'AUTO'};
 });
}
