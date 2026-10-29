import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {freeHolidayRaw,loadFreeHolidays,parsePublicHolidays,holidayCountry} from '../lib/bardoctor/free-holiday-calendar';
import fallback from '../lib/bardoctor/data/holiday-fallback.json';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const fixture=(code:string)=>JSON.parse(readFileSync(`tests/fixtures/holidays/openholidays-${code}-2027.json`,'utf8'));
test('live-captured 2027 national dates agree across OpenHolidays and holidays 0.107 for MD DE',()=>{
 for(const code of ['MD','DE'] as const){const rows=parsePublicHolidays(fixture(code),'2027-01-01','2027-12-31');assert.deepEqual([...new Set(rows.map(r=>r.date))].sort(),fallback.countries[code]['2027'].map(r=>r.date).sort());}
 const dates=parsePublicHolidays(fixture('MD'),'2027-01-01','2027-12-31');for(const date of ['2027-05-02','2027-05-03','2027-05-10'])assert.ok(dates.some(row=>row.date===date));
 assert.equal(holidayCountry('Молдова'),'MD');assert.equal(holidayCountry('Russia'),'RU');assert.equal(holidayCountry('Romania'),null);
});
test('network/malformed data fallback is explicit and never invents dates outside reserve coverage',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};
 try{const data=await loadFreeHolidays('MD','2027-01-01','2027-12-31');assert.equal(data.reserve,true);assert.match(data.warning!,/2026–2027/);await assert.rejects(()=>loadFreeHolidays('MD','2028-01-01','2028-12-31'),/резервных дат/);}finally{globalThis.fetch=old}
 assert.throws(()=>parsePublicHolidays([{nationwide:true,type:'Public',startDate:'2027-02-30',endDate:'2027-02-30'}],'2027-01-01','2027-12-31'));
});
test('new official dates have no invented score and local listings do not recur',async()=>{
 const data={rows:parsePublicHolidays(fixture('DE'),'2027-01-01','2027-12-31'),url:'https://openholidaysapi.org/PublicHolidays',source:'OpenHolidays · ODbL',reserve:false,warning:null};
 const raw=freeHolidayRaw({venueName:'Local',businessType:'Ресторан',venueFormat:'',country:'Germany',city:'Berlin',region:'',openTime:'',closeTime:'',workingDays:null},'2027-01-01','2027-12-31',data,'DE');
 const reserveRaw=freeHolidayRaw({venueName:'Local',businessType:'Ресторан',venueFormat:'',country:'Germany',city:'Berlin',region:'',openTime:'',closeTime:'',workingDays:null},'2027-01-01','2027-12-31',{...data,rows:fallback.countries.DE['2027']},'DE');assert.deepEqual(raw.raw.events.map(e=>[e.startDate,e.title]),reserveRaw.raw.events.map(e=>[e.startDate,e.title]));
 assert.ok(raw.raw.events.filter(e=>e.calendarType==='official').every(e=>e.assessmentAvailable===false));assert.ok(raw.raw.events.every(e=>e.category!=='city'&&e.calendarType!=='local'));
});
test('actual refresh calls only free dates API, preserves saved score/decision and isolates venues',async()=>{
 const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route'}, {now:'2026-10-28T06:00:00Z'});const old=globalThis.fetch;const calls:string[]=[];
 globalThis.fetch=async(input)=>{const url=new URL(String(input));calls.push(url.toString());assert.equal(url.origin,'https://openholidaysapi.org');assert.equal(url.pathname,'/PublicHolidays');assert.equal(url.searchParams.has('api_key'),false);return Response.json(fixture(url.searchParams.get('countryIsoCode')!));};
 try{
 const user=await r.register('free-calendar@local.test'),other=await r.register('other-calendar@local.test');
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Молдова',city:'Кишинёв',timezone:'Europe/Chisinau'}),user.userId);
 const api=r.api as any;let response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));assert.equal(response.status,200);let body=await response.json();assert.equal(body.calendar.model,'openholidays');assert.ok(body.calendar.events.some((e:any)=>e.title==='Пасха'&&e.startDate==='2027-05-02'));
 const stored=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(user.userId)?.data_json));
 stored.events.push({...stored.events[0],id:'old-local',title:'Местная афиша 2026',calendarType:'local',startDate:'2026-10-01',activationDate:'2026-10-01'});
 stored.events[0].potentialScore=77;stored.events[0].decision='planned';const targetId=stored.events[0].id;
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(stored),user.userId);
 response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));body=await response.json();const saved=body.calendar.events.find((e:any)=>e.id===targetId);assert.equal(saved.potentialScore,77);assert.equal(saved.decision,'planned');assert.equal(body.calendar.events.find((e:any)=>e.id==='old-local').startDate,'2026-10-01');
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(other.userId)?.n,0);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,0);
 assert.equal(calls.length,2);
 globalThis.fetch=async()=>{throw Error('offline')};response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));body=await response.json();assert.equal(response.status,200);assert.equal(body.partial,true);assert.equal(body.calendar.model,'holidays-0.107-reserve');
 const before=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(user.userId)?.data_json;
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Romania',city:'Bucharest'}),user.userId);
 response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh'}));assert.equal(response.status,400);assert.equal(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(user.userId)?.data_json,before);
 }finally{globalThis.fetch=old;r.close()}
});

test('Moldova reviewed professional date survives source failure without stale September date or invented assessment',async()=>{
 const old=globalThis.fetch;try{
  for(const offline of [false,true]){
   globalThis.fetch=async()=>{if(offline)throw Error('offline');return Response.json(fixture('MD'));};
   const data=await loadFreeHolidays('MD','2027-01-01','2027-12-31');
   const rows=data.rows.filter(row=>row.name==='День работника гражданской авиации');assert.equal(rows.length,1);assert.equal(rows[0].date,'2027-06-24');assert.equal(rows[0].kind,'observance');assert.match(data.warning!,/Список неполный/);
   const result=freeHolidayRaw({venueName:'Test',businessType:'Ресторан',venueFormat:'',country:'Молдова',city:'',region:'',openTime:'',closeTime:'',workingDays:null},'2027-01-01','2027-12-31',data,'MD');
   const event=result.raw.events.find(e=>e.title===rows[0].name)!;assert.equal(event.assessmentAvailable,false);assert.match(String(event.summary),/не означает выходной/);assert.deepEqual(event.sourceUrls,[rows[0].source]);
   assert.ok(!result.raw.events.some(e=>e.title===rows[0].name&&e.startDate==='2027-09-19'));
  }
 }finally{globalThis.fetch=old;}
});
test('provider identity is namespaced; ambiguous UUID rejected and range days are not guessed after a move',()=>{
 const one={id:'091f8ddb-fe35-496a-b9ed-abf9c36688cd',nationwide:true,type:'Public',startDate:'2027-01-01',endDate:'2027-01-01',name:[{language:'EN',text:'Holiday'}]};
 const rows=parsePublicHolidays([one],'2027-01-01','2027-12-31');assert.equal(rows[0].sourceIdentity,one.id);
 assert.throws(()=>parsePublicHolidays([one,{...one,startDate:'2027-01-02',endDate:'2027-01-02'}],'2027-01-01','2027-12-31'),/идентификатор/);
 const range=parsePublicHolidays([{...one,endDate:'2027-01-02'}],'2027-01-01','2027-12-31');assert.deepEqual(range.map(r=>r.sourceIdentity),[one.id+':2027-01-01',one.id+':2027-01-02']);
 const context={venueName:'Local',businessType:'',venueFormat:'',country:'',city:'',region:'',openTime:'',closeTime:'',workingDays:null};const data={rows,url:'https://openholidaysapi.org/PublicHolidays',source:'OpenHolidays',reserve:false,warning:null};
 assert.notEqual(freeHolidayRaw(context,'2027-01-01','2027-12-31',data,'MD').raw.events[0].sourceIdentity,freeHolidayRaw(context,'2027-01-01','2027-12-31',data,'DE').raw.events[0].sourceIdentity);
});
test('Moldova English API fallback stays Russian; an unknown new name blocks automatic replacement through reserve status',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json(fixture('MD'));
  const data=await loadFreeHolidays('MD','2027-01-01','2027-12-31');assert.equal(data.reserve,false);
  const context={venueName:'Local',country:'Молдова',city:'',region:'',businessType:'',venueFormat:'',openTime:'',closeTime:'',workingDays:null};
  const raw=freeHolidayRaw(context,'2027-01-01','2027-12-31',data,'MD');assert.ok(raw.raw.events.every(e=>/[А-Яа-я]/.test(String(e.title))));assert.ok(raw.raw.events.every(e=>!String(e.title).includes('New Year')));
  globalThis.fetch=async()=>Response.json([...fixture('MD'),{id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',nationwide:true,type:'Public',startDate:'2027-06-15',endDate:'2027-06-15',name:[{language:'EN',text:'Newly added holiday'}]}]);
  const guarded=await loadFreeHolidays('MD','2027-01-01','2027-12-31');assert.equal(guarded.reserve,true);assert.ok(!guarded.rows.some(r=>r.name==='Newly added holiday'));
 }finally{globalThis.fetch=original}
});
