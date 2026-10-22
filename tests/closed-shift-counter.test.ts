import test from 'node:test';import assert from 'node:assert/strict';
import {operationalDays} from '../lib/bardoctor/operational-day';
test('closed shift count survives a second open shift and includes each closed ID once',()=>{
 const reports:any[]=[{id:'21',venueId:1,date:'2026-10-21',workdayStatus:'CLOSED'},{id:'22a',venueId:1,date:'2026-10-22',workdayStatus:'CLOSED'}];
 const read=()=>operationalDays({venueId:1,reports,revenues:[],asOf:'2026-10-22T12:00:00Z'});
 assert.equal(read().reduce((n,d)=>n+d.closedWorkShiftCount,0),2);
 reports.push({id:'22b',venueId:1,date:'2026-10-22',workdayStatus:'OPEN',workdaySequence:2});assert.equal(read().reduce((n,d)=>n+d.closedWorkShiftCount,0),2);
 reports[2].workdayStatus='CLOSED';assert.equal(read().reduce((n,d)=>n+d.closedWorkShiftCount,0),3);
 reports.push({...reports[2]},{id:'foreign',venueId:2,date:'2026-10-22',workdayStatus:'CLOSED'});assert.equal(read().reduce((n,d)=>n+d.closedWorkShiftCount,0),3);
 assert.equal(read().filter(d=>d.businessDate.startsWith('2026-09')).reduce((n,d)=>n+d.closedWorkShiftCount,0),0);
});
