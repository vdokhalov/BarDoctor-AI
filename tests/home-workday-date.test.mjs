import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parse}from'acorn';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8'),nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body;
const functions=['bdHomeTodayState','bdHomeLongDateV151','bdHomeDateLabel'].map(name=>{const n=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(n.start,n.end)}).join('\n');
const context=vm.createContext({Date,Intl,window:{bdVenueSchedule:{daysOf:()=>[true,true,true,true,true,true,true]}},bdShiftRecordKindV156:()=> 'closed'});vm.runInContext(functions,context);
test('calendar today follows venue timezone regardless of browser, and persisted overnight date is separate',()=>{
 const old=process.env.TZ;try{for(const browser of ['America/Los_Angeles','Asia/Tokyo','UTC','Europe/Chisinau']){process.env.TZ=browser;
 for(const [zone,instant,date]of [['Europe/Chisinau','2026-10-10T22:30:00Z','2026-10-11'],['America/Los_Angeles','2026-10-11T05:30:00Z','2026-10-10'],['UTC','2026-10-11T00:00:00Z','2026-10-11']]){
 const p={timezone:zone,openTime:'18:00',closeTime:'04:00',workingDays:{}};
 const saved={businessDate:'2026-10-10',report:{workdayStatus:'OPEN'}};
 const r=context.bdHomeTodayState(p,[],new Date(instant),[saved]);assert.equal(r.calendarDate,date);assert.equal(r.operatingDate,'2026-10-10');assert.equal(r.status,'active');assert.match(r.contextLabel,/Рабочий день/);assert.match(r.actionHref,/workday=2026-10-10/);
 const closed=context.bdHomeTodayState(p,[],new Date(instant),[{businessDate:date,report:{workdayStatus:'CLOSED'}}]);assert.equal(closed.reportFilled,true);assert.equal(closed.shiftStatus,'Рабочий день закрыт');
 }
 }}finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
test('no saved day uses an explicitly labelled schedule; midnight recomputes calendar date',()=>{
 const p={timezone:'UTC',openTime:'18:00',closeTime:'04:00',workingDays:{}};
 const before=context.bdHomeTodayState(p,[],new Date('2026-10-10T23:59:59Z'));
 const after=context.bdHomeTodayState(p,[],new Date('2026-10-11T00:00:00Z'));
 assert.equal(before.calendarDate,'2026-10-10');assert.equal(after.calendarDate,'2026-10-11');assert.equal(after.operatingDate,'2026-10-10');assert.match(after.contextLabel,/По графику/);assert.equal(after.shiftStatus,'Рабочий день не открыт');
});
test('navigation leaves one Sales menu, no Home cashier or Warehouse sales tab/import button; document links retained',()=>{
 const get=name=>{const n=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(n.start,n.end)};
 assert.ok(!get('Dce').includes('i.jsx(bdCashierEntry,'));assert.ok(get('bdShiftsPage').includes('i.jsx(bdCashierEntry,'));assert.match(get('t_e'),/title:"Продажи"/);assert.ok(!get('t_e').includes('title:"Касса"'));
 const warehouse=get('bdWarehousePage');assert.ok(!warehouse.includes('data-bd-warehouse-sales-entry'));assert.ok(!warehouse.includes('sales:"Продажи"'));assert.match(warehouse,/Документ продаж/);assert.match(warehouse,/sourceDocumentId/);assert.match(warehouse,/bdLegacySalesTab/);
});
test('executable Home component receives saved days and rerenders its calendar across midnight',()=>{
 const node=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdHomeDaily');const memo=[],profile={timezone:'UTC',openTime:'18:00',closeTime:'04:00',workingDays:{}},revenue=[],days=[{businessDate:'2026-10-09',report:{workdayStatus:'OPEN'}}];let slot=0,clockCalls=0,now=new Date('2026-10-10T23:59:59Z');
 const c=vm.createContext({Date,Intl,window:{bdVenueSchedule:{daysOf:()=>[true,true,true,true,true,true,true]}},bdShiftRecordKindV156:()=> 'closed',useHomeCalendarClock:()=>{clockCalls++;return now},S:{useMemo:(fn,deps)=>{const index=slot++,old=memo[index];if(old&&old.deps.length===deps.length&&deps.every((d,i)=>Object.is(d,old.deps[i])))return old.value;const value=fn();memo[index]={deps,value};return value}},i:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},bdUseHomeReviewsV409:()=>({}),bdDateKey:d=>d.toISOString().slice(0,10),bdBuildMonthlyReport:()=>({}),bdMonthDisplay:x=>x,...Object.fromEntries(['bdHomeHealthIndexV200','bdHomeAttention','bdHomeMoneyCard','bdHomeReviewsCardV409','bdHomeTodayCard','bdLegacyDoctorEntryV493','bdHomeContextCardsV151'].map(k=>[k,k]))});vm.runInContext(functions+'\n'+source.slice(node.start,node.end),c);
 const render=()=>{slot=0;return c.bdHomeDaily({profile,revenue,operationalDays:days}).props.children.find(x=>x.type==='bdHomeTodayCard').props.today};const first=render();assert.equal(first.operatingDate,'2026-10-09');assert.equal(first.calendarDate,'2026-10-10');assert.equal(first.shiftStatus,'Рабочий день открыт');now=new Date('2026-10-11T00:00:01Z');const second=render();assert.equal(second.calendarDate,'2026-10-11');assert.equal(second.operatingDate,'2026-10-09');assert.equal(clockCalls,2);
});
