import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFreeHolidays,freeHolidayRaw,holidayCountry} from '../lib/bardoctor/free-holiday-calendar';
import cis from '../lib/bardoctor/data/cis-holidays.json';
test('verified CIS subset has Russian names, primary attribution and no network or invented assessment',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Unexpected network')};
 try{for(const [code,entry] of Object.entries(cis.countries)){
  const country=holidayCountry(code)!;assert.ok(country);
  const data=await loadFreeHolidays(country,'2027-01-01','2027-12-31');
  assert.equal(data.rows.length,Object.keys(entry.dates).length+cis.additionalDates.filter(row=>row.country===code&&row.date.startsWith('2027-')).length);assert.equal(data.url,entry.source);assert.ok(data.warning);assert.equal(data.reserve,false);
  assert.ok(data.rows.every(row=>/[А-Яа-я]/.test(row.name)&&row.date.startsWith('2027-')));
  assert.equal(new Set(data.rows.map(row=>row.date+'|'+row.name)).size,data.rows.length);
  const raw=freeHolidayRaw({venueName:'Test',businessType:'Ресторан',venueFormat:'',country:code,city:'',region:'',openTime:'',closeTime:'',workingDays:null},'2027-01-01','2027-12-31',data,country);
  assert.equal(raw.raw.events.length,data.rows.length);assert.ok(raw.raw.events.every(e=>e.assessmentAvailable===false));
  await assert.rejects(()=>loadFreeHolidays(country,'2027-12-01','2028-01-01'),/2026–2027/);
 }}finally{globalThis.fetch=old;}
});
test('disputed, transferred and estimated dates are absent',async()=>{
 const absent:Record<string,string[]>={BY:['05-14'],KZ:['05-16','08-30'],AZ:['03-20','03-21','03-09','05-16'],KG:['03-22','03-09','05-16'],TJ:['03-09','05-16'],TM:['03-09','05-16'],UZ:['03-09','05-16']};
 for(const [code,days] of Object.entries(absent)){const data=await loadFreeHolidays(holidayCountry(code)!,'2027-01-01','2027-12-31');for(const day of days)assert.ok(!data.rows.some(row=>row.date===`2027-${day}`),`${code} ${day}`);}
});
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
test('actual CIS refresh and reload preserve legacy identities and never call network',async()=>{
 const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route'},{now:'2026-10-28T06:00:00Z'});const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No network')};
 try{const user=await r.register('cis@local.test');const other=await r.register('other-cis@local.test');
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Беларусь',city:'Минск',timezone:'Europe/Minsk'}),user.userId);
 const api=r.api as any;let response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));assert.equal(response.status,200);let body=await response.json();assert.equal(body.calendar.model,'verified-cis-2026-2027');assert.equal(body.partial,true);assert.ok(body.calendar.events.every((e:any)=>e.assessmentAvailable===false));
 const ids=body.calendar.events.map((e:any)=>e.id).sort();const stored=body.calendar;const target=stored.events[0];target.potentialScore=73;target.assessmentAvailable=true;target.decision='planned';stored.events.push({...target,id:'legacy-unverified',title:'Старая местная запись',startDate:'2026-10-01',activationDate:'2026-10-01'});
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(stored),user.userId);
 response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));body=await response.json();assert.equal(response.status,200);assert.equal(body.calendar.events.find((e:any)=>e.id===target.id).potentialScore,73);assert.equal(body.calendar.events.find((e:any)=>e.id==='legacy-unverified').startDate,'2026-10-01');assert.deepEqual(body.calendar.events.filter((e:any)=>e.id!=='legacy-unverified').map((e:any)=>e.id).sort(),ids);
 response=await api.opportunities.GET(r.request(user,'/api/opportunities','GET'));body=await response.json();assert.equal(body.calendar.events.length,ids.length+1);assert.equal(calls,0);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(other.userId)?.n,0);
 }finally{globalThis.fetch=old;r.close()}
});

test('official additions override gaps without silently following stale library rules',async()=>{
 const am=await loadFreeHolidays('AM','2027-01-01','2027-12-31');
 assert.ok(am.rows.some(row=>row.date==='2027-04-19'&&row.name==='День налогоплательщика'));
 assert.ok(!am.rows.some(row=>row.date==='2027-04-18'));
 assert.ok(am.rows.some(row=>row.date==='2027-08-23'&&row.name==='День государственных символов'));
 const by=await loadFreeHolidays('BY','2027-01-01','2027-12-31');assert.ok(by.rows.some(row=>row.date==='2027-05-11'&&row.name==='Радуница'));
 const tj=await loadFreeHolidays('TJ','2027-01-01','2027-12-31');for(const date of ['2027-06-27','2027-09-09'])assert.ok(tj.rows.some(row=>row.date===date));
 const az=await loadFreeHolidays('AZ','2026-01-01','2026-12-31');assert.equal(az.rows.filter(row=>row.date==='2026-03-20').length,2);assert.equal(az.rows.filter(row=>row.date==='2026-05-28').length,2);
 const tm=await loadFreeHolidays('TM','2026-01-01','2026-12-31');assert.equal(tm.rows.filter(row=>row.name==='Курбан байрамы').length,3);
 const context={venueName:'Test',businessType:'Ресторан',venueFormat:'',country:'Армения',city:'',region:'',openTime:'',closeTime:'',workingDays:null};
 const raw=freeHolidayRaw(context,'2027-01-01','2027-12-31',am,'AM');assert.match(String(raw.raw.events.find(e=>e.title==='День налогоплательщика')?.summary),/не означает выходной/);assert.match(raw.raw.summary,/Список неполный/);
});

test('verified transfers are separated from holidays and future religious guesses remain absent',async()=>{
 const data=await loadFreeHolidays('RU','2027-01-01','2027-12-31');for(const day of ['02-22','11-05','12-31'])assert.ok(data.rows.some(row=>row.date==='2027-'+day&&row.kind==='transfer'));
 const kg=await loadFreeHolidays('KG','2027-01-01','2027-12-31');assert.ok(kg.rows.some(row=>row.date==='2027-02-23'&&row.kind==='observance'));assert.match(kg.warning!,/официального уточнения/);
});

test('actual refresh retains more than24 reviewed dates and reload has the same set',async()=>{
 const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route'},{now:'2026-10-28T06:00:00Z'});try{
 const user=await r.register('am-complete@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Армения',city:'Ереван',timezone:'Asia/Yerevan'}),user.userId);
 const api=r.api as any;const response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));assert.equal(response.status,200);const body=await response.json();
 const expected=await loadFreeHolidays('AM',body.calendar.windowStart,body.calendar.windowEnd);assert.ok(expected.rows.length>24);assert.equal(body.calendar.events.length,expected.rows.length);
 const reload=await (await api.opportunities.GET(r.request(user,'/api/opportunities','GET'))).json();assert.deepEqual(reload.calendar.events.map((e:any)=>e.id).sort(),body.calendar.events.map((e:any)=>e.id).sort());assert.match(reload.calendar.summary,/Список неполный/);
 }finally{r.close()}
});

test('professional additions use current rules, correct weekdays and no city-wide claims',async()=>{
 for(const year of [2026,2027]){
  const tm=await loadFreeHolidays('TM',`${year}-01-01`,`${year}-12-31`);
  const observances=tm.rows.filter(row=>row.kind==='observance');assert.equal(observances.length,15);
  assert.ok(observances.some(row=>row.date===`${year}-10-10`&&row.name.includes('здравоохранения')));
  assert.ok(!tm.rows.some(row=>row.date===`${year}-07-21`||row.name.includes('Ашхабад')));
  for(const [title,date] of [['скакуна',year===2026?'04-26':'04-25'],['алабая',year===2026?'10-25':'10-31'],['урожая',year===2026?'11-08':'11-14']])assert.ok(observances.some(row=>row.name.includes(title)&&row.date===`${year}-${date}`));
  const ru=await loadFreeHolidays('RU',`${year}-01-01`,`${year}-12-31`);
  assert.ok(ru.rows.some(row=>row.date===`${year}-${year===2026?'06-21':'06-20'}`&&row.name==='День медицинского работника'&&row.kind==='observance'));
  const tj=await loadFreeHolidays('TJ',`${year}-01-01`,`${year}-12-31`);
  for(const md of ['08-18','10-05'])assert.ok(tj.rows.some(row=>row.date===`${year}-${md}`&&row.kind==='observance'));
 }
});
