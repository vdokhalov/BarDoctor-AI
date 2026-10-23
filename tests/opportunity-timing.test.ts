import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scope:any={};runInNewContext(readFileSync('public/opportunity-timing.js','utf8'),scope);const t=scope.bdOpportunityTiming;
const event={startDate:'2026-10-31',activationDate:'2026-10-31',recommendation:{decisionDeadline:'2026-09-16',promotion:'Тизер за 30 дней, полная программа за 14 дней, напоминание за 48 часов.'}};
function projection(date:string,zone='UTC',e=event){return t.project(e,zone,new Date(date));}
test('saved Halloween plan eight days away: past30/14, future48h; original unchanged',()=>{const original=JSON.stringify(event),p=projection('2026-10-23T12:00:00Z');assert.equal(p.remaining,8);assert.equal(p.deadlineState,'Срок прошёл');assert.equal(JSON.stringify(t.advice(event.recommendation.promotion,p).map((r:any)=>r.status)),JSON.stringify(['Срок прошёл','Срок прошёл','']));assert.equal(JSON.stringify(event),original);});
test('distant date retains future deadlines',()=>{const p=projection('2026-08-01T12:00:00Z');assert.equal(p.deadlineState,'');assert.ok(t.advice(event.recommendation.promotion,p).every((r:any)=>!r.status));});
test('today and past event remain distinct',()=>{assert.equal(projection('2026-10-31T12:00:00Z').remaining,0);const p=projection('2026-11-01T12:00:00Z');assert.equal(p.past,true);assert.ok(t.advice('Проверить запас',p)[0].status==='Событие прошло');});
test('venue midnight and year boundary independent of browser timezone',()=>{assert.equal(projection('2026-10-30T23:30:00Z','Europe/Chisinau').remaining,0);assert.equal(projection('2026-10-30T23:30:00Z','America/New_York').remaining,1);const e={...event,startDate:'2027-01-01',activationDate:'2027-01-01'};assert.equal(projection('2026-12-31T23:30:00Z','Europe/Chisinau',e).remaining,0);});
test('ranges/unknown dates and invalid zone never invent a deadline',()=>{assert.equal(t.advice('Анонс за 10–14 дней',projection('2026-10-23T12:00:00Z'))[0].status,'Срок прошёл');assert.equal(t.day('2026-02-30'),null);assert.equal(projection('2026-10-23T12:00:00Z','invalid').remaining,null);assert.equal(t.advice('Без срока',projection('2026-10-23T12:00:00Z'))[0].status,'');});
test('activation date and inclusive multi-day end respected',()=>{const p=projection('2026-11-01T12:00:00Z','UTC',{...event,endDate:'2026-11-02'} as any);assert.equal(p.past,false);});
