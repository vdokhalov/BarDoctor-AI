import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {parse} from 'acorn';
test('timed-out Health request can retry fresh without accepting late response',async()=>{
 const source=readFileSync('public/assets/index-BQGspy0I.js','utf8'),node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdFetchBusinessHealthV377');
 let timer,late,attempt=0;const signals=[];const ctx={AbortController,Error,Promise,ca:()=>({}),window:{setTimeout(fn,ms){assert.equal(ms,15000);timer=fn;return 1},clearTimeout(){}},fetch:async(_,options)=>{signals.push(options.signal);return ++attempt===1?{json:()=>new Promise(resolve=>late=resolve)}:{ok:true,json:async()=>({success:true,generatedAt:'fresh'})};}};
 vm.createContext(ctx);vm.runInContext(source.slice(node.start,node.end),ctx);
 const first=ctx.bdFetchBusinessHealthV377('qa');await Promise.resolve();await Promise.resolve();const rejected=assert.rejects(first,/timed out/);timer();await rejected;assert.equal(signals[0].aborted,true);
 const retry=await ctx.bdFetchBusinessHealthV377('qa');assert.equal(retry.data.generatedAt,'fresh');assert.equal(signals[1].aborted,false);late({success:true,generatedAt:'late-old'});await Promise.resolve();assert.equal(retry.data.generatedAt,'fresh');assert.equal(attempt,2);
});
