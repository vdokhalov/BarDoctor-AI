import test from 'node:test';
import assert from 'node:assert/strict';
import {installApiReadTracker} from '../scripts/qa/api-read-tracker.mjs';
const realm = fetch => ({fetch,location:{href:'https://qa.isolated.test/home'}});
const deferred = () => { let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}; };

test('headers keep native Response identity; ignored body is unread; an actual delayed reader stays pending', {timeout:1000}, async()=>{
 let stream;const body=new ReadableStream({start(controller){stream=controller}});
 const response=new Response(body,{status:201,headers:{'X-QA':'same-response'}}),headers=deferred();
 const target=realm(()=>headers.promise);installApiReadTracker({target});
 const fetching=target.fetch('/api/slow');assert.equal(target.__qaPendingApi,1);
 headers.resolve(response);const returned=await fetching;
 assert.equal(returned,response);assert.equal(returned.status,201);assert.equal(returned.headers.get('X-QA'),'same-response');
 assert.equal(returned.bodyUsed,false);assert.equal(target.__qaPendingApi,0,'Ignoring a body must not create an endless lease');
 const reading=returned.json();assert.equal(target.__qaPendingApi,1);assert.equal(returned.bodyUsed,true);
 await Promise.resolve();assert.equal(target.__qaPendingApi,1,'Body remains incomplete after the headers');
 stream.enqueue(new TextEncoder().encode('{"ok":true}'));stream.close();
 assert.deepEqual(await reading,{ok:true});assert.equal(target.__qaPendingApi,0);
});

test('auth raw text is consumed exactly once without a tracker clone and can be reconstructed for the caller',async()=>{
 const response=Response.json({ok:true,email:'qa@isolated.test',token:'isolated-only'});let reads=0,clones=0;
 const nativeText=response.text,nativeClone=response.clone;
 response.text=function(...args){reads++;return Reflect.apply(nativeText,this,args)};
 response.clone=function(...args){clones++;return Reflect.apply(nativeClone,this,args)};
 const target=realm(async()=>response);installApiReadTracker({target});
 const original=await target.fetch('/api/auth/login'),body=await original.text();
 const callerResponse=new Response(body,{status:original.status,headers:original.headers});
 assert.equal((await callerResponse.json()).ok,true);assert.equal(reads,1);assert.equal(clones,0);
 assert.equal(original,response);assert.equal(target.__qaPendingApi,0);
});

test('an application-requested clone keeps native semantics and tracks its actual reader',async()=>{
 const response=Response.json({ok:true}),nativeClone=response.clone;let clones=0;
 response.clone=function(...args){clones++;return Reflect.apply(nativeClone,this,args)};
 const target=realm(async()=>response);installApiReadTracker({target});const original=await target.fetch('/api/clone');
 assert.equal(clones,0);const clone=original.clone();assert.equal(clones,1);assert.ok(clone instanceof Response);assert.notEqual(clone,original);
 const reading=clone.json();assert.equal(target.__qaPendingApi,1);assert.deepEqual(await reading,{ok:true});assert.equal(target.__qaPendingApi,0);
 assert.equal(original.bodyUsed,false);assert.deepEqual(await original.json(),{ok:true});assert.equal(target.__qaPendingApi,0);
 assert.throws(()=>original.clone(),TypeError,'Native consumed-body clone failure remains intact');
});

test('native stream and parse errors are preserved and end pending reads',async()=>{
 const bodyError=new Error('Native QA body abort');let stream;
 const response=new Response(new ReadableStream({start(controller){stream=controller}}));
 const target=realm(async()=>response);installApiReadTracker({target});const returned=await target.fetch('/api/error');
 const reading=returned.json();assert.equal(target.__qaPendingApi,1);stream.error(bodyError);
 await assert.rejects(reading,error=>error===bodyError);assert.equal(target.__qaPendingApi,0);
 const malformed=realm(async()=>new Response('invalid json'));installApiReadTracker({target:malformed});
 await assert.rejects((await malformed.fetch('/api/parse')).json(),SyntaxError);assert.equal(malformed.__qaPendingApi,0);
});

test('fetch and reader synchronous throws and native network rejection keep their original errors',async()=>{
 const fetchError=new Error('Native fetch synchronous error'),sync=realm(()=>{throw fetchError});installApiReadTracker({target:sync});
 assert.throws(()=>sync.fetch('/api/error'),error=>error===fetchError);assert.equal(sync.__qaPendingApi,0);
 const rejected=realm(()=>Promise.reject(fetchError));installApiReadTracker({target:rejected});
 await assert.rejects(rejected.fetch('/api/error'),error=>error===fetchError);assert.equal(rejected.__qaPendingApi,0);
 const readError=new Error('Native reader synchronous error'),response={json(){throw readError}};
 const body=realm(async()=>response);installApiReadTracker({target:body});
 assert.throws(()=>(response.json()),error=>error===readError);assert.equal(body.__qaPendingApi,0);
 await body.fetch('/api/read');assert.throws(()=>response.json(),error=>error===readError);assert.equal(body.__qaPendingApi,0);
});

test('invalid classification preserves native Request failure and non-API requests remain untouched',async()=>{
 const originalError=new TypeError('Native invalid Request'),bad={get url(){throw Error('Classifier getter')}};
 const target=realm(input=>{assert.equal(input,bad);throw originalError});installApiReadTracker({target});
 assert.throws(()=>target.fetch(bad),error=>error===originalError);assert.equal(target.__qaPendingApi,0);
 const response=new Response('static'),nativeText=response.text,native=Promise.resolve(response);
 const staticTarget=realm(()=>native);installApiReadTracker({target:staticTarget});
 assert.equal(staticTarget.fetch('/asset.txt'),native);assert.equal((await native).text,nativeText);assert.equal(staticTarget.__qaPendingApi,0);
});

test('repeat installation is idempotent and native borrowed-reader this is retained',async()=>{
 const response=Response.json({first:true}),target=realm(async()=>response);installApiReadTracker({target});
 const wrapped=target.fetch;installApiReadTracker({target});assert.equal(target.fetch,wrapped);
 const tracked=await target.fetch(new Request('https://qa.isolated.test/api/borrow'));
 const other=Response.json({other:true});const reading=tracked.json.call(other);
 assert.equal(target.__qaPendingApi,1);assert.deepEqual(await reading,{other:true});assert.equal(target.__qaPendingApi,0);assert.equal(tracked.bodyUsed,false);
});
