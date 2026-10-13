import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdSalesFrameSource');
const choose=new Function('URL','window','return ('+source.slice(fn.start,fn.end)+')')(URL,{location:{origin:'https://qa.test'}});
const old='/sales-import?venue=1&embedded=1',next='/sales-import?venue=1&view=import&embedded=1';
const frame=url=>({contentWindow:{location:{href:'https://qa.test'+url}}});
test('child-owned query echo preserves the existing iframe src and therefore its document',()=>{
 assert.equal(choose(old,next,frame('/sales-import?embedded=1&view=import&venue=1')),old);
 assert.equal(choose(old,old,frame(old)),old);
});
test('external query, route, hash, and venue transitions still navigate',()=>{
 for(const target of [next,'/cashier?venue=1&embedded=1','/sales-import?venue=2&embedded=1',old+'#document'])assert.equal(choose(old,target,frame(old)),target);
 assert.equal(choose(null,next,frame(next)),next);
 assert.equal(choose(old,next,null),next);
 assert.equal(choose(old,next,{contentWindow:{location:{href:'about:blank'}}}),next);
 assert.equal(choose(old,next,{contentWindow:{location:{href:'https://other.test'+next}}}),next);
 assert.equal(choose(old,next,{get contentWindow(){throw Error('cross origin')}}),next);
});
test('owning Sales generator restores this repair and is byte-idempotent',()=>{
 const root=mkdtempSync(join(tmpdir(),'bd-sales-frame-'));
 try{
  mkdirSync(join(root,'public/assets'),{recursive:true});
  writeFileSync(join(root,'public/assets/index-BQGspy0I.js'),execFileSync('git',['show','a621a80eece7d5c7a97aa476356acd667102f9aa:public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}));
  const script=resolve('scripts/patch-sales-navigation-performance.mjs');
  for(let i=0;i<2;i++){execFileSync(process.execPath,[script],{cwd:root});assert.equal(readFileSync(join(root,'public/assets/index-BQGspy0I.js'),'utf8'),source);}
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('emitted component avoids an echo reload but handles returning externally to its initial src',()=>{
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdSalesPosPage');
 const refs=[],effects=[],writes=[];let cursor=0,search='?venue=1',href='https://qa.test'+old;
 const window={location:{origin:'https://qa.test',pathname:'/sales-import',hash:''}};
 const S={useRef(value){const at=cursor++;return refs[at]??(refs[at]={current:value});},useLayoutEffect(fn){effects.push(fn);}};
 const render=new Function('S','bt','ste','window','URLSearchParams','i','nt','bdSalesFrameSource','return ('+source.slice(node.start,node.end)+')')(S,()=>[null,()=>{}],()=>search,window,URLSearchParams,{jsx:(_type,props)=>props},'shell',choose);
 const frame={contentWindow:{location:{get href(){return href;}}},set src(value){writes.push(value);href='https://qa.test'+value;}};
 const run=()=>{cursor=0;const ui=render();refs[0].current=frame;effects.splice(0).forEach(fn=>fn());return ui.children.src;};
 assert.equal(run(),old);assert.deepEqual(writes,[],'initial React src is not loaded twice');
 search='?venue=1&view=import';href='https://qa.test'+next;
 assert.equal(run(),old);assert.deepEqual(writes,[],'child query is echoed without a load');
 search='?venue=1';assert.equal(run(),old);assert.deepEqual(writes,[old],'external return loads even when the initial src attribute is unchanged');
 run();assert.deepEqual(writes,[old],'unrelated rerender does not issue another navigation');
 search='?venue=2';run();assert.equal(writes.at(-1),'/sales-import?venue=2&embedded=1');
});
