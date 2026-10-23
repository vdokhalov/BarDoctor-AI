import {lifecycleRuntime} from './lifecycle-runtime';
export async function emptyMonthFixture(extraRoutes:Record<string,string>={}){
 const r=await lifecycleRuntime({closing:'./app/api/month-close/route',...extraRoutes},{now:'2026-10-23T12:00:00Z'}),user=await r.register('empty-month@local.test'),venueId=user.activeVenueId;
 const account=Number(r.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(venueId)!.id);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовый отчёт',currency:'MDL',timezone:'UTC',trackingStartDate:'2026-10-01',workingDays:{1:false,2:false,3:false,4:false,5:false,6:false,7:false}}),account);
 const seed=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(account,key,JSON.stringify(value));
 seed('bd_finance_revenue',[{id:'oct',venueId,date:'2026-10-02',revenue:100,currency:'MDL',manualTotalsVersion:2,manualCostOfGoods:20}]);
 seed('bd_operational_reports_v1',[{id:'oct-report',venueId,date:'2026-10-02',payrollBreakdown:{total:10}}]);
 const get=async()=>await r.api.closing.GET(r.request(user,'/api/month-close?monthKey=2026-09')) as Omit<Response,'json'> & {json():Promise<{report:Record<string,unknown>;eligible:boolean}>};
 return {...r,user,venueId,account,seed,get};
}
