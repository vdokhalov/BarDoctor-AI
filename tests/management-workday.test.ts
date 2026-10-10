import test from "node:test";
import assert from "node:assert/strict";
import { managementWorkday } from "../lib/bardoctor/management-workday";
import { operationalDay } from "../lib/bardoctor/operational-day";
import { readFinanceInputs } from "../lib/bardoctor/finance-inputs";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const date="2026-10-10", scope={venueId:1};
const revenues=[{id:"morning",venueId:1,date,revenue:20,currency:"MDL",revenueSource:"sales_events_v1",closingStatus:"closed"},{id:"night",venueId:1,date,revenue:30,currency:"MDL",revenueSource:"sales_events_v1",closingStatus:"closed",closedAt:"2026-10-11T03:00:00Z"}];
const events=revenues.map(row=>({id:"sale:"+row.id,venueId:1,businessDate:date,revenueRowId:row.id,status:"POSTED",source:"POS_API",revenue:row.revenue,currency:"MDL"}));
const employees=[{id:"anna",name:"Anna",venueId:1,payrollRuleId:"hourly"},{id:"other",name:"Foreign",venueId:2}];
const rules=[{id:"hourly",blocks:[{enabled:true,type:"hourly_rate",rate:10}]}];
function day(reports:unknown[]=[]){return operationalDay({...scope,businessDate:date,asOf:"2026-10-11T04:00:00Z",currency:"MDL",revenues,events,reports});}
test("multiple POS shifts including overnight share one recorded daily FOT without a second accrual",()=>{
 const reports=[{id:"report",venueId:1,date,closingStatus:"closed",staffing:[{employeeId:"anna",hours:7}],payrollBreakdown:{total:70,perEmployee:{anna:70}}}];
 const d=day(reports), summary=managementWorkday(d,employees,rules,scope);
 assert.equal(d.businessDate,date);assert.equal(d.cashShifts.length,2);assert.equal(d.revenue.amount,50);assert.equal(d.payroll.amount,70);
 assert.equal(summary.people[0].hours,7);assert.equal(summary.people[0].recordedPayroll,70);assert.deepEqual(summary.missing,[]);
 const finance=readFinanceInputs({...scope,currency:"MDL",startDate:date,endDate:date,asOf:"2026-10-11T04:00:00Z",revenues,events,reports});
 assert.equal(finance.revenue,50);assert.equal(finance.payrollBase,70);assert.equal(finance.payrollByDay.length,1);
 assert.deepEqual(managementWorkday(d,employees,[],scope).people[0].missing,[],"later rule removal cannot invalidate recorded history");
 assert.match(managementWorkday(d,employees,[],scope).people[0].notes[0],/Текущее правило оплаты не задано/);
});
test("missing team, hours and payroll remain unknown; no inferred POS attendance or zero",()=>{
 const d=day();assert.equal(d.payroll.amount,null);assert.deepEqual(managementWorkday(d,employees,rules,scope).people,[]);
 assert.deepEqual(managementWorkday(d,employees,rules,scope).missing,["Не указан состав команды","ФОТ не сохранён"]);
 const incomplete=day([{venueId:1,date,closingStatus:"closed",staffing:[{employeeId:"anna"},{employeeId:"other"}]}]);
 const result=managementWorkday(incomplete,employees,rules,scope);
 assert.equal(result.people[0].hours,null);assert.equal(result.people[0].recordedPayroll,null);assert.deepEqual(result.people[0].missing,["Не указаны часы"]);
 assert.equal(result.people[1].name,"Сотрудник недоступен");assert.ok(!JSON.stringify(result).includes("Foreign"));
});
test("real API: leaders read the daily team projection, POS staff and foreign venues are denied, reload does not write",async t=>{
 const r=await lifecycleRuntime({days:"./app/api/operational-days/route",sales:"./app/api/sales-events/route"});t.after(r.close);
 const owner=await r.register("workday-owner@isolated.test"),member=await r.register("workday-member@isolated.test");
 const venue=owner.activeVenueId,workspace=r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,member.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'manager','active')").run(venue,member.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)").run(owner.userId,key,JSON.stringify(value));
 put("bd_finance_revenue",revenues.map(row=>({...row,venueId:venue})));
 put("bd_sales_events_v1",events.map(row=>({...row,venueId:venue})));
 put("bd_operational_reports_v1",[{venueId:venue,date,closingStatus:"closed",staffing:[{employeeId:"anna",hours:7}],payrollBreakdown:{total:70,perEmployee:{anna:70}}}]);
 put("bd_employees",[{id:"anna",name:"Anna",venueId:venue}]);
 const req=(user=member,selected=venue)=>{const headers=new Headers(r.request(user,"/api/operational-days").headers);headers.set("X-Venue-Id",String(selected));return new Request("https://isolated.test/api/operational-days",{headers});};
 const before=r.sqlite.prepare("SELECT * FROM domain_data WHERE account_id=? ORDER BY store_key").all(owner.userId);
 for(const role of ["manager","shift_manager"]){
  r.sqlite.prepare("UPDATE venue_memberships SET role=?,permissions_json=NULL WHERE venue_id=? AND account_id=?").run(role,venue,member.userId);
  const response=await r.api.days.GET(req());assert.equal(response.status,200);
  const body=await response.json() as {days:{management:{people:{name:string}[]}}[]};assert.equal(body.days[0].management.people[0].name,"Anna");
 }
 assert.equal((await r.api.days.GET(req(owner))).status,200);
 r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({deny:["team.view"]}),venue,member.userId);
 const limited=await (await r.api.days.GET(req())).json() as {days:{management?:unknown}[]};assert.equal(limited.days[0].management,undefined);
 r.sqlite.prepare("UPDATE venue_memberships SET role='cashier',permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({allow:["shifts.view","team.view","payroll.view"]}),venue,member.userId);
 assert.equal((await r.api.days.GET(req())).status,403);
 assert.equal((await r.api.days.GET(req(owner,member.activeVenueId))).status,401);
 assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data WHERE account_id=? ORDER BY store_key").all(owner.userId),before);
});
