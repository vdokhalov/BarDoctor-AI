import assert from 'node:assert/strict';
import test from 'node:test';
import {opportunityEvidence} from '../lib/bardoctor/opportunity-evidence';
import {operationalDays} from '../lib/bardoctor/operational-day';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const context={venueName:'Local',businessType:'Ресторан',venueFormat:'',country:'Germany',city:'Berlin',region:'',openTime:'10:00',closeTime:'18:00',workingDays:{'4':true}};
const input={date:'2026-12-25',context,timezone:'Europe/Berlin',currency:'EUR',venueId:1,asOf:'2026-10-28T12:00:00Z',days:[] as ReturnType<typeof operationalDays>};
const day={venueId:1,businessDate:'2026-10-23',status:'COMPLETE',closedWorkShiftCount:1,revenue:{status:'FINAL',consistency:'MATCH',currency:'EUR',currencyStatus:'KNOWN',source:'BARDOC_POS'},cashShift:{status:'CLOSED',openedAt:'2026-10-23T08:00:00Z',closedAt:'2026-10-23T16:00:00Z'}} as unknown as ReturnType<typeof operationalDays>[number];
test('known schedule and compatible closed history are observations, never a score or profit',()=>{
 const result=opportunityEvidence({...input,days:[day,day]});assert.equal(result.comparableDays,1);assert.match(result.history,/не прогноз/);assert.match(result.conclusion,/не подтверждено/);assert.equal('score' in result,false);assert.equal('profit' in result,false);
});
test('unknown schedule/history/timezone stay unknown; explicit closed day stays closed',()=>{
 assert.equal(opportunityEvidence({...input,days:null}).comparableDays,null);
 assert.equal(opportunityEvidence({...input,timezone:undefined}).comparableDays,null);
 assert.match(opportunityEvidence({...input,context:{...context,workingDays:null}}).schedule,/не указан/);
 assert.match(opportunityEvidence({...input,context:{...context,workingDays:{'4':false}}}).schedule,/закрыто/);
 assert.equal(opportunityEvidence({...input,date:'2026-02-30'}).comparableDays,null);
});
test('open, conflicting, foreign, mixed shifts, unknown currency and changed hours are excluded',()=>{
 for(const candidate of [{...day,venueId:2},{...day,status:'OPERATING'},{...day,closedWorkShiftCount:2},{...day,revenue:{...day.revenue,consistency:'MISMATCH'}},{...day,revenue:{...day.revenue,currency:'MDL'}},{...day,revenue:{...day.revenue,currencyStatus:'UNKNOWN'}},{...day,cashShift:{...day.cashShift,openedAt:'2026-10-23T09:00:00Z'}},{...day,businessDate:'2026-10-30'},{...day,businessDate:'2025-10-24'}])assert.equal(opportunityEvidence({...input,days:[candidate as typeof day]}).comparableDays,0);
});
test('overnight and DST use venue clocks; unknown missing timestamps excluded',()=>{
 const overnight={...day,cashShift:{id:'shift',status:'CLOSED',openedAt:'2026-10-23T20:00:00Z',closedAt:'2026-10-24T00:00:00Z'}} as typeof day;
 assert.equal(opportunityEvidence({...input,context:{...context,openTime:'22:00',closeTime:'02:00'},days:[overnight]}).comparableDays,1);
 assert.equal(opportunityEvidence({...input,days:[{...day,cashShift:null}]}).comparableDays,0);
});
test('real calendar GET adds fresh evidence without storing it or modifying existing assessment',async()=>{
 const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route'},{now:'2026-10-28T12:00:00Z'});
 try{
 const user=await r.register('evidence@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...context,name:'Local',timezone:'Europe/Berlin',currency:'EUR'}),user.userId);
 const api=r.api as any;await api.opportunities.GET(r.request(user,'/api/opportunities'));
 const row=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(user.userId);const calendar=JSON.parse(String(row?.data_json));calendar.events[0].assessmentAvailable=false;calendar.events[0].potentialScore=73;
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(calendar),user.userId);
 const date='2026-10-23';calendar.events[0].startDate='2026-12-25';
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(calendar),user.userId);
 const revenue={id:'shift',shiftId:'shift',venueId:user.userId,date,currency:'EUR',revenue:20,receipts:2,revenueSource:'MANUAL_SUMMARY',manualTotalsVersion:2,accountingScope:'SHIFT',closingStatus:'closed',openedAt:date+'T08:00:00Z',closedAt:date+'T16:00:00Z'};
 // Resolve real venue id from the authenticated user's isolated account.
 const venue=r.sqlite.prepare('SELECT id FROM venues WHERE data_account_id=?').get(user.userId) as {id:number};revenue.venueId=venue.id;
 const report={id:'workday',venueId:venue.id,date,workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:0}};
 for(const [key,rows] of [['bd_finance_revenue',[revenue]],['bd_operational_reports_v1',[report]]] as const)r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(user.userId,key,JSON.stringify(rows));
 const before=JSON.stringify(calendar);const response=await api.opportunities.GET(r.request(user,'/api/opportunities'));assert.equal(response.status,200);const body=await response.json();assert.equal(body.calendar.events[0].evidenceAssessment.label,'Предварительная оценка');assert.equal(body.calendar.events[0].potentialScore,73);assert.equal(body.calendar.events[0].evidenceAssessment.comparableDays,1);
 assert.equal(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(user.userId)?.data_json,before);
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_finance_revenue'").run('{broken',user.userId);const failed=await api.opportunities.GET(r.request(user,'/api/opportunities'));const fallback=await failed.json();assert.equal(fallback.calendar.events[0].evidenceAssessment.comparableDays,null);
 }finally{r.close()}
});
test('history reader does not expand calendar-only permissions',async()=>{
 const r=await lifecycleRuntime({evidence:'./lib/bardoctor/opportunity-evidence-storage'});
 try{const result=await (r.api as any).evidence.loadOpportunityEvidenceDays({id:999,venueId:999,permissions:['calendar.view'],role:'staff'});assert.equal(result,null);}finally{r.close()}
});
