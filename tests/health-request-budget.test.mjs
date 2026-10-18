import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {patchHealthRequestBudget} from '../scripts/lib/health-request-budget.mjs';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration');
const code=name=>{const n=nodes.find(n=>n.id.name===name);return source.slice(n.start,n.end)};
function fixture(fetch){let timer,cleared=false;const ctx={AbortController,Error,Promise,ca:()=>({}),fetch,window:{setTimeout:(fn,ms)=>{assert.equal(ms,15000);timer=fn;return 1},clearTimeout:()=>cleared=true}};vm.createContext(ctx);vm.runInContext(code('bdFetchBusinessHealthV377'),ctx);return{ctx,expire:()=>timer(),get cleared(){return cleared}};}
test('single deadline aborts stalled body and clears timer',async()=>{let signal;const f=fixture(async(_,o)=>{signal=o.signal;return{json:()=>new Promise(()=>{})}});const p=f.ctx.bdFetchBusinessHealthV377('qa');await Promise.resolve();const rejected=assert.rejects(p,/timed out/);f.expire();await rejected;assert.equal(signal.aborted,true);assert.equal(f.cleared,true)});
test('invalid JSON rejects explicitly and clears timer',async()=>{const f=fixture(async()=>({json:async()=>{throw SyntaxError()}}));await assert.rejects(f.ctx.bdFetchBusinessHealthV377('qa'),/invalid JSON/);assert.equal(f.cleared,true)});
for(const variant of ['invalid','scope'])test(variant+' envelope cannot commit or mark context ready',async()=>{let commits=0;let contextCalls=0;const ctx={window:{},Ot:()=> 'qa',bdBusinessHealthAccountContextV284:()=>variant==='scope'&&contextCalls++?'new':'old',bdFetchBusinessHealthV377:async()=>({response:{ok:true,status:200},data:{success:true}}),bdBusinessHealthSafeSnapshotV342:()=>null,bdRestrictedAnalysisContextsPhase3a5:new Set(),bdBusinessHealthCommitEnvelopeV284:()=>commits++};vm.createContext(ctx);vm.runInContext('let bdLiveBusinessHealthPromiseV335=null,bdLiveBusinessHealthContextV335="";'+code('bdRefreshLiveBusinessHealthV335'),ctx);await assert.rejects(ctx.bdRefreshLiveBusinessHealthV335(),variant==='scope'?/context changed/:/invalid envelope/);assert.equal(commits,0)});
test('budget patch changes only approved functions and is idempotent',()=>{const old=execFileSync('git',['show','57c6a74e:public/assets/index-BQGspy0I.js'],{maxBuffer:32e6}).toString();assert.equal(patchHealthRequestBudget(old),source);assert.equal(patchHealthRequestBudget(source),source);const strip=s=>{for(const n of parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&['bdFetchBusinessHealthV377','bdRefreshLiveBusinessHealthV335','bdUseLiveBusinessHealthV335','c_e'].includes(n.id.name)).reverse())s=s.slice(0,n.start)+s.slice(n.end);return s};assert.equal(strip(old),strip(source))});
