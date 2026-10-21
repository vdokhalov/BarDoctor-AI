import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {patchHealthRequestBudget} from '../scripts/lib/health-request-budget.mjs';

const artifact=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const n=parse(artifact,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdFetchBusinessHealthV377');
const health=artifact.slice(n.start,n.end);
const monthly=readFileSync('scripts/fragments/monthly-report-v165.fragment.txt','utf8');
const monthNode=parse(monthly,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&monthly.slice(n.start,n.end).includes('FINANCIAL_READ_PENDING'));
const month=monthly.slice(monthNode.start,monthNode.end),monthName=monthNode.id.name;
const pending=revision=>({status:202,ok:true,json:async()=>({pending:true,code:'FINANCIAL_READ_PENDING',jobId:'pinned-source',revision})});
const ready={status:200,ok:true,json:async()=>({ok:true,success:true,report:{resultAfterCost:99},marker:'complete'})};
function fixture(responses){
 let calls=0,context='venue-A';
 const ctx={AbortController,DOMException,Error,Promise,Number,ca:()=>({}),bdBusinessHealthAccountContextV284:()=>context,
 window:{setTimeout(){return 1},clearTimeout(){}},
 fetch:async()=>{calls++;return responses.shift()??ready}};
 vm.createContext(ctx);vm.runInContext(health,ctx);
 return {ctx,get calls(){return calls},switchVenue(){context='venue-B'}};
}
test('Health continues verified pages without returning an interim envelope',async()=>{
 const f=fixture([pending(4),pending(8),ready]);
 const value=await f.ctx.bdFetchBusinessHealthV377('session');
 assert.equal(f.calls,3);assert.equal(value.data.marker,'complete');
});
test('Health rejects stalled progress and permits a separate retry',async()=>{
 const f=fixture([pending(4),pending(4),ready]);
 await assert.rejects(f.ctx.bdFetchBusinessHealthV377('session'),/no progress/);
 assert.equal((await f.ctx.bdFetchBusinessHealthV377('session')).data.marker,'complete');
});
test('venue change cancels continuation before another tenant request',async()=>{
 const f=fixture([]);f.ctx.fetch=async()=>{f.switchVenue();return pending(4)};
 await assert.rejects(f.ctx.bdFetchBusinessHealthV377('session'),/context changed/);
});
test('monthly continuation retains external abort signal',async()=>{
 const controller=new AbortController();let calls=0;
 const ctx={DOMException,Error,Number,fetch:async()=>{calls++;controller.abort();return pending(4)}};
 vm.createContext(ctx);vm.runInContext(month,ctx);
 // Signature is asserted separately to avoid bypassing the real fetch wrapper.
 assert.match(month,/signal/);
 const args=month.slice(month.indexOf('(')+1,month.indexOf(')'));
 assert.equal(args,'venueId, monthKey, signal');
 await assert.rejects(ctx[monthName](71,'current',controller.signal),/Aborted/);assert.equal(calls,1);
});

test('emitted Health function includes the latest progress guard',()=>assert.equal(patchHealthRequestBudget(artifact),artifact));
for(const revision of [-1,1.5,Number.MAX_SAFE_INTEGER+1])test('invalid progress revision '+revision+' is rejected',async()=>{
 const f=fixture([pending(revision)]);await assert.rejects(f.ctx.bdFetchBusinessHealthV377('session'),/no progress/);assert.equal(f.calls,1);
});
test('changed source stops continuation instead of looping across changing data',async()=>{
 const changed={status:202,json:async()=>({pending:true,code:'FINANCIAL_READ_PENDING',jobId:'changed-source',revision:8})};
 const f=fixture([pending(4),changed]);await assert.rejects(f.ctx.bdFetchBusinessHealthV377('session'),/no progress/);assert.equal(f.calls,2);
});
function monthlyFixture(fetch){
 const node=parse(monthly,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdMonthlyReadControllerV513');
 const ctx={DOMException,AbortController,Error,Number,fetch};
 vm.createContext(ctx);vm.runInContext(month+';'+monthly.slice(node.start,node.end),ctx);return ctx;
}
const monthlyReady=(venueId=71,key='2026-10')=>({status:200,ok:true,json:async()=>({ok:true,inputManifest:{scope:{venueId}},report:{meta:{key},costOfGoods:7826.69,resultAfterCost:13632.96,finalProfit:null}})});
test('report publishes the exact completed open-month result, never a pending page',async()=>{
 let release;const replies=[pending(4),new Promise(resolve=>release=resolve)],published=[];
 const ctx=monthlyFixture(async()=>await replies.shift());
 const reader=ctx.bdMonthlyReadControllerV513(signal=>ctx[monthName](71,'2026-10',signal),value=>published.push(value));
 const running=reader.refresh();await new Promise(resolve=>setImmediate(resolve));assert.equal(published.length,0);
 release(monthlyReady());await running;
 assert.equal(published.length,1);assert.equal(published[0].report.resultAfterCost,13632.96);assert.equal(published[0].report.finalProfit,null);
});
for(const variation of ['venue','period'])test('late response after '+variation+' change cannot display in the new context',async()=>{
 let release;const published=[];const ctx=monthlyFixture(()=>new Promise(resolve=>release=resolve));
 const old=ctx.bdMonthlyReadControllerV513(signal=>ctx[monthName](71,'2026-10',signal),value=>published.push(value));
 const running=old.refresh();old.dispose();release(monthlyReady());await running;assert.equal(published.length,0);
 const nextVenue=variation==='venue'?72:71,nextMonth=variation==='period'?'2026-11':'2026-10';
 ctx.fetch=async()=>monthlyReady(nextVenue,nextMonth);
 const next=ctx.bdMonthlyReadControllerV513(signal=>ctx[monthName](nextVenue,nextMonth,signal),value=>published.push(value));await next.refresh();
 assert.equal(published.length,1);assert.equal(published[0].report.meta.key,nextMonth);
});
test('report error clears the result and explicit retry recovers',async()=>{
 let attempt=0;const published=[];const ctx=monthlyFixture(async()=>{if(++attempt===1)throw Error('network failed');return monthlyReady()});
 const reader=ctx.bdMonthlyReadControllerV513(signal=>ctx[monthName](71,'2026-10',signal),value=>published.push(value));
 await reader.refresh();assert.equal(published[0].report,null);await reader.refresh();assert.equal(published[1].report.resultAfterCost,13632.96);assert.equal(published[1].error,null);
});
