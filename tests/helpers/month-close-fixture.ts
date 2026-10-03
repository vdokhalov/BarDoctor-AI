import { readFileSync } from 'node:fs';
import { lifecycleRuntime } from './lifecycle-runtime';
const captured = JSON.parse(readFileSync(new URL('../fixtures/financial-reconciliation-phase7.json', import.meta.url), 'utf8'));
type QAReply = {eligible:boolean; previewRevision:string; report:Record<string,unknown>; closing:{snapshot:Record<string,unknown>}; evidenceStatus:string};
const qa = (response:Response) => response as Omit<Response,'json'> & {json():Promise<QAReply>};
export async function closingFixture() {
 const runtime=await lifecycleRuntime({closing:'./app/api/month-close/route',store:'./app/api/store/[key]/route', bulkStore:'./app/api/store/route', restaurant:'./app/api/restaurants/me/route', users:'./app/api/users/me/route', overview:'./app/api/assortment/overview/route', health:'./app/api/business-health/route'},{now:'2026-10-03T12:00:00Z'});
 const user=await runtime.register('month-close@isolated.test');
 const venue=runtime.sqlite.prepare("SELECT * FROM venues WHERE id=?").get(user.activeVenueId)!;const account=Number(venue.data_account_id),venueId=user.activeVenueId;
 const mapVenue=(value: unknown): unknown => Array.isArray(value)?value.map(mapVenue):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,key==='venueId'?venueId:mapVenue(value)])):value;
 const seed=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(account,key,JSON.stringify(mapVenue(value)),'2026-10-03T12:00:00Z');
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC',workingDays:{1:false,2:false,3:true,4:false,5:false,6:false,7:false},trackingStartDate:'2026-09-02'}),account);
 seed('bd_finance_revenue',captured.revenues);seed('bd_sales_events_v1',captured.events);seed('bd_stock_movements',captured.movements);
 seed('bd_operational_reports_v1',[{id:'qa-report',venueId,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:90}}]);
 seed('bd_finance_expenses',[{id:'expense',venueId,date:'2026-09-02',amount:30,category:'rent',currency:'MDL'}]);seed('bd_payroll_entries',[{id:'bonus',venueId,date:'2026-09-02',amount:10,type:'bonus',currency:'MDL'},{id:'paid',venueId,date:'2026-09-02',amount:999,type:'payment',currency:'MDL'}]);
 seed('bd_inventory_snapshots',[{id:'open',venueId,date:'2026-09-01',currency:'MDL',total:600,sections:{bar:600}},{id:'end',venueId,date:'2026-10-01',currency:'MDL',total:324,sections:{bar:324}}]);
 seed('bd_finance_gap_reasons',['2026-09-09','2026-09-16','2026-09-23','2026-09-30'].map(date=>({id:date,venueId,date,resolved:true})));
 const get=async()=>qa(await runtime.api.closing.GET(runtime.request(user,'/api/month-close?monthKey=2026-09')));
 const post=async(body:unknown)=>qa(await runtime.api.closing.POST(runtime.request(user,'/api/month-close','POST',{monthKey:'2026-09',...body as object})));
 return{...runtime,user,account,venueId,seed,get,post};
}
