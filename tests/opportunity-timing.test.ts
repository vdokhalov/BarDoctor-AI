import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scope:any={};runInNewContext(readFileSync((process.env.ARTIFACT_ROOT||'public')+'/opportunity-timing.js','utf8'),scope);const t=scope.bdOpportunityTiming;
const event={startDate:'2026-10-31',activationDate:'2026-10-31',recommendation:{decisionDeadline:'2026-09-16',promotion:'Тизер за 30 дней, полная программа за 14 дней, напоминание за 48 часов.'}};
function projection(date:string,zone='UTC',e=event){return t.project(e,zone,new Date(date));}
test('saved Halloween plan eight days away: past30/14, future48h; original unchanged',()=>{const original=JSON.stringify(event),p=projection('2026-10-23T12:00:00Z');assert.equal(p.remaining,8);assert.equal(p.deadlineState,'Срок прошёл');assert.equal(JSON.stringify(t.advice(event.recommendation.promotion,p).map((r:any)=>r.status)),JSON.stringify(['Срок прошёл','Срок прошёл','']));assert.equal(JSON.stringify(event),original);});
test('distant date retains future deadlines',()=>{const p=projection('2026-08-01T12:00:00Z');assert.equal(p.deadlineState,'');assert.ok(t.advice(event.recommendation.promotion,p).every((r:any)=>!r.status));});
test('today and past event remain distinct',()=>{assert.equal(projection('2026-10-31T12:00:00Z').remaining,0);const p=projection('2026-11-01T12:00:00Z');assert.equal(p.past,true);assert.ok(t.advice('Проверить запас',p)[0].status==='Событие прошло');});
test('venue midnight and year boundary independent of browser timezone',()=>{assert.equal(projection('2026-10-30T23:30:00Z','Europe/Chisinau').remaining,0);assert.equal(projection('2026-10-30T23:30:00Z','America/New_York').remaining,1);const e={...event,startDate:'2027-01-01',activationDate:'2027-01-01'};assert.equal(projection('2026-12-31T23:30:00Z','Europe/Chisinau',e).remaining,0);});
test('ranges/unknown dates and invalid zone never invent a deadline',()=>{assert.equal(t.advice('Анонс за 10–14 дней',projection('2026-10-23T12:00:00Z'))[0].status,'Срок прошёл');assert.equal(t.day('2026-02-30'),null);assert.equal(projection('2026-10-23T12:00:00Z','invalid').remaining,null);assert.equal(t.advice('Без срока',projection('2026-10-23T12:00:00Z'))[0].status,'');});
test('activation date and inclusive multi-day end respected',()=>{const p=projection('2026-11-01T12:00:00Z','UTC',{...event,endDate:'2026-11-02'} as any);assert.equal(p.past,false);});

test('event countdown uses31Oct while preparation retains29Oct;24Oct shows7',()=>{const e={...event,activationDate:'2026-10-29'},before=JSON.stringify(e),p=projection('2026-10-24T12:00:00Z','Europe/Chisinau',e);assert.equal(p.remaining,7);assert.equal(p.preparationRemaining,5);assert.equal(p.past,false);assert.equal(t.advice('Напоминание за 48 часов',projection('2026-10-27T12:00:00Z','UTC',e))[0].status,'Сегодня');assert.equal(JSON.stringify(e),before);});
test('past working date never labels upcoming event today or past',()=>{const e={...event,activationDate:'2026-10-29'};assert.equal(projection('2026-10-29T12:00:00Z','UTC',e).remaining,2);assert.equal(projection('2026-10-30T12:00:00Z','UTC',e).past,false);assert.equal(projection('2026-10-31T12:00:00Z','UTC',e).remaining,0);assert.equal(projection('2026-11-01T12:00:00Z','UTC',e).past,true);});
test('different work year does not affect event timezone countdown',()=>{const e={...event,startDate:'2027-01-01',activationDate:'2026-12-29'};assert.equal(projection('2026-12-31T23:30:00Z','Europe/Chisinau',e).remaining,0);assert.equal(projection('2026-12-31T23:30:00Z','America/New_York',e).remaining,1);});

test('Chisinau midnight before and after DST uses calendar days, not elapsed 24 hours',()=>{
 const e={...event,activationDate:'2026-10-29'};
 for(const [instant,remaining] of [
  ['2026-10-24T20:59:59Z',7],['2026-10-24T21:00:00Z',6],
  ['2026-10-25T00:59:59Z',6],['2026-10-25T01:00:00Z',6],
  ['2026-10-25T21:59:59Z',6],['2026-10-25T22:00:00Z',5],
  ['2026-10-30T21:59:59Z',1],['2026-10-30T22:00:00Z',0],
  ['2026-10-31T21:59:59Z',0],['2026-10-31T22:00:00Z',-1]
 ] as const)assert.equal(projection(instant,'Europe/Chisinau',e).remaining,remaining,instant);
});
