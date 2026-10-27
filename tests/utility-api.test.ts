import test from 'node:test';import assert from 'node:assert/strict';import {emptyMonthFixture} from './helpers/empty-month-fixture';
test('utility API preview/commit/replay/tenant and closed history; no expense write',async t=>{
 const r=await emptyMonthFixture({utilities:'./app/api/utilities/route'});t.after(r.close);const url='/api/utilities?venue='+r.venueId+'&month=2026-10';
 const get=async():Promise<any>=>await(await r.api.utilities.GET(r.request(r.user,url)) as Response).json();let state:any=await get();assert.equal(state.revision,0);let serial=0;
 const save=async(command:object)=>{const body={command,operationId:'op-'+(++serial),venueId:r.venueId,revision:state.revision};const preview=await r.api.utilities.POST(r.request(r.user,url,'POST',{...body,preview:true})) as Response;assert.equal(preview.status,200,await preview.clone().text());const p:any=await preview.json();const response=await r.api.utilities.POST(r.request(r.user,url,'POST',{...body,previewToken:p.previewToken})) as Response;assert.equal(response.status,200,await response.clone().text());state=await response.json();return {...body,previewToken:p.previewToken}};
 await save({action:'create',meterId:'water',kind:'water',name:'Кухня',included:true,startMonth:'2026-10'});
 await save({action:'tariff',meterId:'water',tariffId:'rate1',date:'2026-10-01',amount:2});
 await save({action:'reading',meterId:'water',readingId:'r1',date:'2026-10-01',value:100});
 const last=await save({action:'reading',meterId:'water',readingId:'r2',date:'2026-10-20',value:108});assert.equal(state.total.amount,16);
 const replay:any=await(await r.api.utilities.POST(r.request(r.user,url,'POST',last)) as Response).json();assert.equal(replay.duplicate,true);assert.equal(replay.revision,state.revision);
 await save({action:'payment',meterId:'water',readingId:'r2',paymentId:'p1',date:'2026-10-21',amount:5});assert.equal(state.total.amount,16);assert.equal(state.payments[0].amount,5);
 const paidEdit=await r.api.utilities.POST(r.request(r.user,url,'POST',{command:{action:'reading',meterId:'water',readingId:'r2',date:'2026-10-20',value:110},operationId:'edit-paid',venueId:r.venueId,revision:state.revision,preview:true})) as Response;assert.equal(paidEdit.status,422);
 await save({action:'rename',meterId:'water',name:'Бар'});assert.equal(state.meters[0].readings.length,2);assert.equal(state.meters[0].name,'Бар');
 assert.equal((await get()).total.amount,16);assert.equal(r.sqlite.prepare("SELECT COUNT(*) n FROM domain_data WHERE account_id=? AND store_key='bd_finance_expenses'").get(r.account)!.n,0);

 r.seed('bd_finance_settings',[{id:'primary',venueId:r.venueId,utilityModel:{mode:'fixed',amount:900},taxModel:{mode:'manual'}}]);
 for(const query of ['monthKey=current&view=current','monthKey=2026-10']){const response=await r.api.closing.GET(r.request(r.user,'/api/month-close?'+query)) as Response;assert.equal(response.status,200,await response.clone().text());const data:any=await response.json();assert.equal(data.report.utilities,16);assert.equal(data.report.resultBeforeCost,74);assert.equal(data.report.cashResult,85);}
 await save({action:'payment',meterId:'water',readingId:'r2',paymentId:'p2',date:'2026-10-22',amount:11});assert.equal(state.payments.reduce((n:number,p:any)=>n+p.amount,0),16);assert.equal(state.total.amount,16);
 const fullyPaid:any=await(await r.api.closing.GET(r.request(r.user,'/api/month-close?monthKey=current&view=current')) as Response).json();assert.equal(fullyPaid.report.resultBeforeCost,74);assert.equal(fullyPaid.report.cashResult,74);
 const overpay=await r.api.utilities.POST(r.request(r.user,url,'POST',{venueId:r.venueId,revision:state.revision,operationId:'overpay',preview:true,command:{action:'payment',meterId:'water',readingId:'r2',paymentId:'extra',date:'2026-10-22',amount:1}})) as Response;assert.equal(overpay.status,422);
 const foreign=await r.register('foreign-utility@local.test');const denied=await r.api.utilities.GET(r.request(foreign,url)) as Response;assert.equal(denied.status,409);
 const conflict=await r.api.utilities.POST(r.request(r.user,url,'POST',{...last,operationId:'conflict'})) as Response;assert.equal(conflict.status,409);
});
test('utility API failed save retains data, revision races and closed-month edit fail safely',async t=>{
 const r=await emptyMonthFixture({utilities:'./app/api/utilities/route'});t.after(r.close);const url='/api/utilities?venue='+r.venueId+'&month=2026-10';
 const call=async(body:object)=>r.api.utilities.POST(r.request(r.user,url,'POST',body)) as Promise<Response>;
 let body:any={venueId:r.venueId,revision:0,operationId:'create',command:{action:'create',meterId:'m',kind:'gas',included:true,name:'Газ',startMonth:'2026-10'}};
 const preview:any=await(await call({...body,preview:true})).json();body.previewToken=preview.previewToken;
 assert.equal(r.sqlite.prepare("SELECT COUNT(*) n FROM domain_data WHERE account_id=? AND store_key='bd_utility_meters_v1'").get(r.account)!.n,0);
 const replies=await Promise.all([call(body),call(body)]);assert.ok(replies.some(x=>x.status===200));assert.ok(replies.every(x=>[200,409].includes(x.status)));assert.equal((await call(body)).status,200);
 r.seed('bd_month_closings',[{id:'closed',venueId:r.venueId,monthKey:'2026-10',status:'closed',snapshot:{resultBeforeCost:777}}]);
 const edit=await call({venueId:r.venueId,revision:1,operationId:'read',preview:true,command:{action:'reading',meterId:'m',readingId:'r',date:'2026-10-10',value:10}});assert.equal(edit.status,422);
 const data:any=await(await r.api.utilities.GET(r.request(r.user,url)) as Response).json();assert.equal(data.meters[0].readings.length,0);
 const report:any=await(await r.api.closing.GET(r.request(r.user,'/api/month-close?monthKey=2026-10')) as Response).json();assert.equal(report.report.resultBeforeCost,777);
 const unpreviewed=await call({venueId:r.venueId,revision:1,operationId:'rename',command:{action:'rename',meterId:'m',name:'Новый'}});assert.equal(unpreviewed.status,409);
});
