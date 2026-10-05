import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { classifyWebKitLifecycle, nativeFatalEvents } from "../scripts/qa/webkit-environment-classifier.mjs";

function fixture() {
  return { suite: "health-inputs-phase3a9", width: 390, exitCode: 1,
    trace: '10 1.000000 execve("/browser/WPENetworkProcess", [], 0) = 0\n10 2.000000 +++ killed by SIGABRT +++',
    evidence: { suite: "health-inputs-phase3a9", width: 390, browser: "webkit",
      events: [
        { type: "cookie-initialized", at: 1001, present: true },
        { type: "state", at: 1500, origin: "http://127.0.0.1:1", documentId: "same-document", auth: { email: true, token: true, marker: true } },
        { type: "health-response", at: 2200, status: 401, body: { ok: false, error: "Необходима авторизация" }, headers: { email: false, token: false, cookie: false } },
      ], pageErrors: [] as { at: number; message: string }[],
      after: { at: 2300, origin: "http://127.0.0.1:1", documentId: "same-document", auth: { email: false, token: false, marker: false }, cookie: false },
      failure: { at: 2400, guard: "authenticated-health-200", name: "AssertionError", actual: 401, expected: 200, operator: "strictEqual" },
    },
  };
}
test("WebKit exception requires live native fatal + preserved-then-lost session + exact Health401 chain", () => {
  assert.equal(classifyWebKitLifecycle(fixture()).status, "ENVIRONMENT_BLOCKED");
  const segfault = fixture(); segfault.trace = segfault.trace.replace("SIGABRT", "SIGSEGV");
  assert.equal(classifyWebKitLifecycle(segfault).status, "ENVIRONMENT_BLOCKED");
});
for (const [name, mutate] of [
  ["no process trace", (f: ReturnType<typeof fixture>) => { f.trace = ""; }],
  ["normal WebKit timeout", (f: ReturnType<typeof fixture>) => { f.evidence.failure.name = "TimeoutError"; }],
  ["wrong canonical score", (f: ReturnType<typeof fixture>) => { f.evidence.failure.actual = 0; f.evidence.failure.expected = 90; }],
  ["unrelated assertion", (f: ReturnType<typeof fixture>) => { f.evidence.failure.guard = "rbac-no-leak"; }],
  ["401 without fatal signal", (f: ReturnType<typeof fixture>) => { f.trace = f.trace.split("\n")[0]; }],
  ["wrong native process", (f: ReturnType<typeof fixture>) => { f.trace += '\n20 1.000000 execve("/browser/WPEWebProcess", [], 0) = 0\n20 2.000000 +++ killed by SIGSEGV +++'; }],
  ["Chromium", (f: ReturnType<typeof fixture>) => { f.evidence.browser = "chromium"; }],
  ["non-allowlisted suite", (f: ReturnType<typeof fixture>) => { f.suite = "finance-inputs-phase3a6"; }],
  ["viewport mismatch", (f: ReturnType<typeof fixture>) => { f.width = 820; }],
  ["process fault after test failure", (f: ReturnType<typeof fixture>) => { f.evidence.failure.at = 1900; }],
  ["no verified session before fault", (f: ReturnType<typeof fixture>) => { f.evidence.events[1].auth!.token = false; }],
  ["session did not disappear", (f: ReturnType<typeof fixture>) => { f.evidence.after.auth.token = true; }],
  ["cookie survived", (f: ReturnType<typeof fixture>) => { f.evidence.after.cookie = true; }],
  ["origin switch", (f: ReturnType<typeof fixture>) => { f.evidence.after.origin = "http://127.0.0.1:2"; }],
  ["document switch", (f: ReturnType<typeof fixture>) => { f.evidence.after.documentId = "replacement-document"; }],
  ["auth headers still present", (f: ReturnType<typeof fixture>) => { f.evidence.events[2].headers!.token = true; }],
  ["wrong HTTP/business response", (f: ReturnType<typeof fixture>) => { f.evidence.events[2].body!.error = "Different application failure"; }],
  ["preceding application pageerror", (f: ReturnType<typeof fixture>) => { f.evidence.pageErrors.push({ at: 1800, message: "Wrong business result" }); }],
] as const) test(`WebKit gate fails normally: ${name}`, () => { const f = fixture(); mutate(f); assert.equal(classifyWebKitLifecycle(f).status, "FAIL"); });
test("Passing assertions with a native crash never turn into ordinary PASS", () => {
  const f = fixture(); f.exitCode = 0; assert.equal(classifyWebKitLifecycle(f).status, "FAIL");
  f.trace = f.trace.split("\n")[0]; assert.equal(classifyWebKitLifecycle(f).status, "FAIL");
  Object.assign(f.evidence, { failure: null, completion: { assertions: "PASS" } }); assert.equal(classifyWebKitLifecycle(f).status, "FAIL");
  f.evidence.events = f.evidence.events.slice(0, 2); assert.equal(classifyWebKitLifecycle(f).status, "PASS");
  f.trace = ""; assert.equal(classifyWebKitLifecycle(f).status, "FAIL");
});

function teardownFixture() {
  return { suite: 'health-inputs-phase3a9', width: 1280, exitCode: 0,
    trace: '10 1.000000 execve("/browser/WPENetworkProcess", [], 0) = 0\n20 1.000000 execve("/browser/WPEWebProcess", [], 0) = 0\n20 2.000000 +++ killed by SIGSEGV +++',
    evidence: { suite: 'health-inputs-phase3a9', width: 1280, browser: 'webkit',
      events: [{type:'context-close-start',at:1900},{type:'health-response',at:1500,status:200,expectedScopeDenial:false}],
      pageErrors: [] as {at:number;message:string}[], consoleErrors: [] as {at:number;message:string}[], failedRequests: [] as {at:number;path:string}[],
      completion: {at:1800,assertions:'PASS',state:{at:1801,auth:{email:true,token:true,marker:true},cookie:true}}, failure: null as null | {name:string},
    },
  };
}
test('WPEWebProcess SIGSEGV is environment blocked only after completed assertions and observed teardown',()=>{
  assert.equal(classifyWebKitLifecycle(teardownFixture()).status,'ENVIRONMENT_BLOCKED');
  const f=teardownFixture();f.trace=f.trace.replace('WPEWebProcess','WPENetworkProcess');assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
});
for(const [name,mutate] of [
  ['ordinary assertion with native crash',(f:ReturnType<typeof teardownFixture>)=>{f.exitCode=1;f.evidence.failure={name:'AssertionError'};}],
  ['incomplete assertions',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.completion.assertions='INCOMPLETE';}],
  ['crash before completed assertions',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.completion.at=2100;}],
  ['crash before context close',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.events[0].at=2100;}],
  ['no context lifecycle evidence',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.events.shift();}],
  ['session absent before teardown',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.completion.state.auth.token=false;}],
  ['cookie absent before teardown',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.completion.state.cookie=false;}],
  ['unknown browser process',(f:ReturnType<typeof teardownFixture>)=>{f.trace=f.trace.replace('WPEWebProcess','UnknownBrowserProcess');}],
  ['unrelated process SIGABRT',(f:ReturnType<typeof teardownFixture>)=>{f.trace=f.trace.replace('/browser/WPEWebProcess','/usr/bin/UnrelatedProcess').replace('SIGSEGV','SIGABRT');}],
  ['pageerror before crash',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.pageErrors.push({at:1700,message:'wrong business result'});}],
  ['unexpected HTTP401',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.events[1].status=401;}],
  ['unexpected network failure',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.failedRequests.push({at:1700,path:'/api/business-health'});}],
  ['unexplained console error',(f:ReturnType<typeof teardownFixture>)=>{f.evidence.consoleErrors.push({at:1700,message:'wrong canonical result'});}],
] as const)test(`Native teardown negative control: ${name}`,()=>{const f=teardownFixture();mutate(f);assert.equal(classifyWebKitLifecycle(f).status,'FAIL');});
test('The exact G06 post-reload Store guard requires the same observed native/session/empty-auth401 chain',()=>{
  const f=fixture();f.evidence.failure.guard='authenticated-store-200';
  // A Health401 cannot stand in for evidence of the failed Store request.
  assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
  Object.assign(f.evidence.events[2],{type:'store-response',path:'/api/store/bd_assortment_v1'});
  assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
  Object.assign(f.evidence.events[2],{path:'/api/store/another-key'});
  assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
  Object.assign(f.evidence.events[2],{path:'/api/store/bd_assortment_v1',headers:{token:true,email:true,cookie:true}});
  assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
});

// Exact raw v485/v486 RCA evidence, independent of the Phase 4B application SHA.
const fixtureRoot = new URL('./fixtures/webkit-native-rca/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureRoot), 'utf8'));
function saved(id: string) {
  const entry = manifest.find((row: {id: string}) => row.id === id);
  return {...entry, trace: readFileSync(new URL(entry.files.process.name, fixtureRoot), 'utf8'),
    evidence: JSON.parse(readFileSync(new URL(entry.files.evidence.name, fixtureRoot), 'utf8'))};
}
for (const entry of manifest) test(`Unmodified RCA control: ${entry.id} (${entry.sourceSHA.slice(0,7)})`, () => {
  for (const file of Object.values(entry.files) as {name:string;sha256:string}[]) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(file.name, fixtureRoot))).digest('hex'), file.sha256);
  }
  const result = classifyWebKitLifecycle(saved(entry.id));
  assert.equal(result.classification, entry.expectedClassification, result.reason);
  assert.equal(result.status, entry.expectedClassification === 'ENVIRONMENT_BLOCKED' ? 'ENVIRONMENT_BLOCKED' : 'FAIL');
});
test('Observed split clone3 attributes TID7793 to successfully executed WPEWebProcess7774', () => {
  const fatal = nativeFatalEvents(saved('v486-split-clone3-teardown').trace).find((e: {pid:number}) => e.pid === 7793);
  assert.ok(fatal);assert.equal(fatal.process, 'WPEWebProcess'); assert.equal(fatal.threadParent, 7774);
  assert.equal(fatal.processPid,7774);assert.equal(fatal.signal,'SIGSEGV');
});
const split = [
 '10 1.000000 execve("/browser/WPEWebProcess", [], 0 <unfinished ...>',
 '20 1.001000 execve("/usr/bin/unrelated", [], 0 <unfinished ...>',
 '10 1.002000 <... execve resumed>) = 0',
 '20 1.003000 <... execve resumed>) = 0',
 '10 1.004000 clone3({flags=CLONE_VM|CLONE_THREAD, parent_tid=0x1}, 88 <unfinished ...>',
 '20 1.005000 clone3({flags=CLONE_VM|CLONE_THREAD, parent_tid=0x2}, 88 <unfinished ...>',
 '20 1.006000 <... clone3 resumed>) = 21',
 '10 1.007000 <... clone3 resumed> => {parent_tid=[11]}, 88) = 11',
 '11 2.000000 +++ killed by SIGSEGV +++',
 '21 2.001000 +++ killed by SIGSEGV +++',
].join('\n');
test('Interleaved split execve/clone3 is joined by PID and syscall, with exact crash timestamp',()=>{
 const fatal=nativeFatalEvents(split);assert.equal(fatal[0].process,'WPEWebProcess');assert.equal(fatal[0].at,2000);
 assert.equal(fatal[1].process,'unrelated');assert.equal(fatal[1].at,2001);
});
for(const [name, trace, process] of [
 ['failed exec','10 1.0 execve("/browser/WPEWebProcess", [], 0) = -1 ENOENT\n10 2.0 +++ killed by SIGSEGV +++','unknown'],
 ['unfinished clone without resume',split.replace('10 1.007000 <... clone3 resumed> => {parent_tid=[11]}, 88) = 11',''),'unknown'],
 ['mismatched resume',split.replace('10 1.007000 <... clone3 resumed>','10 1.007000 <... clone resumed>'),'unknown'],
 ['fork is not a browser thread',split.replace('CLONE_VM|CLONE_THREAD','CLONE_VM'),'unknown'],
 ['failed clone',split.replace('= 11','= -1 EPERM'),'unknown'],
 ['later parent exec cannot relabel old thread',split.replace('11 2.000000','10 1.900000 execve("/usr/bin/new-owner", [], 0) = 0\n11 2.000000'),'WPEWebProcess'],
 ['thread own exec supersedes parent',split.replace('11 2.000000','11 1.900000 execve("/usr/bin/new-owner", [], 0) = 0\n11 2.000000'),'new-owner'],
 ['PID reuse uses latest successful exec','10 1.0 execve("/browser/WPEWebProcess", [], 0) = 0\n10 1.9 execve("/usr/bin/unrelated", [], 0) = 0\n10 2.0 +++ killed by SIGSEGV +++','unrelated'],
] as const) test(`Native identity control: ${name}`,()=>assert.equal(nativeFatalEvents(trace)[0].process,process));

type Saved = ReturnType<typeof saved>;
for(const [name, mutate] of [
 ['selector regression after native crash',(f:Saved)=>{f.evidence.failure.message="locator.waitFor: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Wrong selector' }) to be visible\n";}],
 ['genuine assertion mismatch',(f:Saved)=>{Object.assign(f.evidence.failure,{name:'AssertionError',actual:10,expected:20,operator:'strictEqual'});}],
 ['HTTP500 before crash',(f:Saved)=>{f.evidence.events.push({type:'http-response',path:'/api/month-close',status:500,at:nativeFatalEvents(f.trace)[0].at-1});}],
 ['HTTP500 after crash',(f:Saved)=>{f.evidence.events.push({type:'http-response',path:'/api/month-close',status:500,at:f.evidence.failure.at-1});}],
 ['auth regression without native crash',(f:Saved)=>{f.trace=f.trace.split('\n').filter((line:string)=>!line.includes('killed by')).join('\n');}],
 ['timeout without crash evidence',(f:Saved)=>{f.trace=f.trace.split('\n').filter((line:string)=>!line.includes('killed by')).join('\n');}],
 ['JavaScript exception before crash',(f:Saved)=>{f.evidence.pageErrors.push({at:nativeFatalEvents(f.trace)[0].at-1,message:'TypeError: business logic broke'});}],
 ['JavaScript exception after crash',(f:Saved)=>{f.evidence.pageErrors.push({at:f.evidence.failure.at-1,message:'TypeError: business logic broke'});}],
 ['failure precedes native crash',(f:Saved)=>{f.evidence.failure.at=Math.min(...nativeFatalEvents(f.trace).map((e:{at:number})=>e.at))-1;}],
 ['unrelated process SIGSEGV',(f:Saved)=>{f.trace+='\n9999 1791201500.000000 execve("/usr/bin/unrelated", [], 0) = 0\n9999 1791201510.000000 +++ killed by SIGSEGV +++';}],
 ['deceptive process basename',(f:Saved)=>{f.trace=f.trace.replaceAll('minibrowser-wpe/bin/WPENetworkProcess','unrelated/bin/WPENetworkProcess');}],
 ['lost token explicitly removed',(f:Saved)=>{f.evidence.events.push({type:'storage-write',key:'bd_session_token',present:false,at:f.evidence.failure.at-1});}],
 ['internal network error before crash',(f:Saved)=>{f.evidence.failedRequests.find((e:{error:string})=>e.error==='WebKit encountered an internal error').at=Math.min(...nativeFatalEvents(f.trace).map((e:{at:number})=>e.at))-1;}],
 ['unrelated network internal error',(f:Saved)=>{f.evidence.failedRequests[0].path='/api/unrelated';}],
 ['console JavaScript exception',(f:Saved)=>{f.evidence.consoleErrors.push({at:f.evidence.failure.at-1,message:'Error: invalid business calculation'});}],
 ['no session loss',(f:Saved)=>{f.evidence.after.auth.token=true;}],
 ['second-mount timeout',(f:Saved)=>{f.evidence.failure.stack=f.evidence.failure.stack.replace(':46:2',':47:2');}],
 ['arbitrary timeout callsite',(f:Saved)=>{f.evidence.failure.stack='some test:1:2';}],
 ['live v2 requires explicit checkpoint',(f:Saved)=>{f.evidence.schemaVersion=2;f.evidence.failure.guard='month-close:first-mount';}],
] as const) test(`Saved native timeout negative control: ${name}`,()=>{
 const f=saved('v486-month-timeout');mutate(f);const result=classifyWebKitLifecycle(f);assert.equal(result.status,'FAIL',result.reason);assert.equal(result.classification,'APPLICATION_FAIL');
});
function liveTimeout() {
 const f=saved('v486-month-timeout'), crash=Math.min(...nativeFatalEvents(f.trace).map((e:{at:number})=>e.at));
 f.evidence.schemaVersion=2;f.evidence.failure.guard='month-close:first-mount';
 const before=f.evidence.events.findLast((e:{type:string;at:number})=>e.type==='state'&&e.at<crash);
 f.evidence.events.push({type:'step-start',id:'month-close:first-mount',at:crash-1,state:{...before,cookie:true}});return f;
}
test('Live v2 first-mount checkpoint supports proven session/network-loss timeout',()=>assert.equal(classifyWebKitLifecycle(liveTimeout()).status,'ENVIRONMENT_BLOCKED'));
for(const [name,mutate] of [
 ['checkpoint after crash',(f:Saved)=>{f.evidence.events.at(-1).at=f.evidence.failure.at;}],
 ['wrong document',(f:Saved)=>{f.evidence.events.at(-1).state.documentId='new-document';}],
 ['missing cookie',(f:Saved)=>{f.evidence.events.at(-1).state.cookie=false;}],
 ['wrong mount guard',(f:Saved)=>{f.evidence.failure.guard='month-close:remount';}],
 ['month-close read already started',(f:Saved)=>{f.evidence.events.push({type:'http-response',path:'/api/month-close',status:200,at:f.evidence.failure.at-1});}],
] as const)test(`Live checkpoint negative control: ${name}`,()=>{const f=liveTimeout();mutate(f);assert.equal(classifyWebKitLifecycle(f).status,'FAIL');});

test('Completed assertions → attributed teardown SIGABRT is environment blocked too',()=>{
 const f=teardownFixture();f.trace=f.trace.replace('SIGSEGV','SIGABRT');assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
});
test('Completed assertions → observed browser.close session loss remains environment blocked',()=>{
 const f={...teardownFixture(),exitCode:1,testLog:'browser.close: Target page, context or browser has been closed'};
 assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
 f.testLog='Error: some unrelated teardown error';assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
 f.testLog='browser.close: Target page, context or browser has been closed\nAssertionError';assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
});
function liveTeardown() {
 const f=saved('v486-split-clone3-teardown');f.evidence.schemaVersion=2;
 for(const reply of f.evidence.events.filter((e:{type:string;path:string;status:number})=>e.type==='http-response'&&e.path==='/api/month-close')){
  if(reply.status===401)reply.expectedScopeDenial=true;
  if(reply.status===409){f.evidence.events.push({type:'month-close-response',at:reply.at+1,status:409,code:'MONTH_CLOSE_INPUTS_CHANGED'});f.evidence.events.push({type:'expected-response-asserted',at:f.evidence.completion.at-1,path:reply.path,status:409,code:'MONTH_CLOSE_INPUTS_CHANGED'});}
 }return f;
}
test('Live v2 expected stale409 and proven venue401 are not application errors',()=>assert.equal(classifyWebKitLifecycle(liveTeardown()).status,'ENVIRONMENT_BLOCKED'));
for(const [name,mutate] of [
 ['unasserted stale409',(f:Saved)=>{f.evidence.events=f.evidence.events.filter((e:{type:string})=>e.type!=='expected-response-asserted');}],
 ['wrong409 body code',(f:Saved)=>{f.evidence.events.find((e:{type:string})=>e.type==='month-close-response').code='UNEXPECTED';}],
 ['unproven auth401',(f:Saved)=>{f.evidence.events.find((e:{status:number})=>e.status===401).expectedScopeDenial=false;}],
 ['unrelated404',(f:Saved)=>{f.evidence.events.push({type:'http-response',at:f.evidence.completion.at-1,path:'/api/month-close',status:404});}],
 ['legacy extra409',(f:Saved)=>{delete f.evidence.schemaVersion;f.evidence.events.push({...f.evidence.events.find((e:{status:number})=>e.status===409),at:f.evidence.completion.at-1});}],
 ['genuine assertion failure then teardown',(f:Saved)=>{f.exitCode=1;f.evidence.failure={at:f.evidence.completion.at-1,name:'AssertionError',actual:0,expected:304};}],
 ['HTTP500 then teardown',(f:Saved)=>{f.evidence.events.push({type:'http-response',path:'/api/month-close',status:500,at:f.evidence.completion.at-1});}],
] as const)test(`Completed suite negative control: ${name}`,()=>{const f=liveTeardown();mutate(f);assert.equal(classifyWebKitLifecycle(f).status,'FAIL');});

test('Guarded network read error requires attributed crash, session loss and matching internal request error',()=>{
 const f=saved('v486-health-session');Object.assign(f.evidence.failure,{name:'TypeError',message:'Failed to fetch'});
 assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
 f.evidence.failedRequests=f.evidence.failedRequests.filter((e:{error:string})=>e.error!=='WebKit encountered an internal error');
 assert.equal(classifyWebKitLifecycle(f).status,'FAIL');
});
test('Unrelated selector failure cannot use native teardown even with completion marker',()=>{
 const f=teardownFixture();Object.assign(f.evidence,{failure:{at:1850,name:'TimeoutError',message:'locator.click: Timeout 30000ms exceeded'}});f.exitCode=1;
 assert.equal(classifyWebKitLifecycle(f).classification,'APPLICATION_FAIL');
});

for(const [name,mutate] of [
 ['secondary WPE crash before context close',(f:Saved)=>{f.evidence.events.find((e:{type:string})=>e.type==='context-close-start').at=Number.MAX_SAFE_INTEGER;}],
 ['secondary WPE crash before failed assertion',(f:Saved)=>{f.trace=f.trace.replace(/(\d+)\s+(1791208148\.\d+)(\s+\+\+\+ killed by SIGSEGV)/g,'$1 1791208147.500000$3');}],
 ['fixture internal error without previous404',(f:Saved)=>{f.evidence.events=f.evidence.events.filter((e:{path:string})=>e.path!=='/api/reviews/home');}],
 ['fixture internal error before native crash',(f:Saved)=>{f.evidence.failedRequests.find((e:{path:string;error:string})=>e.path==='/api/reviews/home'&&e.error==='WebKit encountered an internal error').at=1791208146000;}],
 ['fixture HTTP500 after native crash',(f:Saved)=>{f.evidence.events.push({type:'http-response',path:'/api/reviews/home',at:f.evidence.failure.at-1,status:500});}],
 ['missing post-crash timestamp',(f:Saved)=>{delete f.evidence.after.at;}],
] as const)test(`Native sequence extension negative control: ${name}`,()=>{const f=saved('live-network-then-wpe-teardown');mutate(f);assert.equal(classifyWebKitLifecycle(f).status,'FAIL');});

function liveReadinessTimeout(){
 const f=liveTimeout(),crash=Math.min(...nativeFatalEvents(f.trace).map((e:{at:number})=>e.at));
 f.evidence.failure.guard='month-close:first-mount:ready';
 f.evidence.failure.message="locator.waitFor: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('dialog', { name: 'Мастер закрытия месяца' }).locator('nav button').first() to be visible\n";
 f.evidence.events.push({type:'step-start',id:'month-close:first-mount:ready',at:crash+1,state:{...f.evidence.after,at:crash+1}});
 f.evidence.events.push({type:'month-close-server-response',path:'/api/month-close',at:crash+2,status:401,headers:{email:false,token:false,cookie:false},body:{ok:false,code:'UNAVAILABLE'}});
 f.evidence.events.push({type:'http-response',path:'/api/month-close',at:crash+3,status:401});return f;
}
test('First dialog readiness timeout requires server-confirmed native → empty-auth month-close401 chain',()=>assert.equal(classifyWebKitLifecycle(liveReadinessTimeout()).status,'ENVIRONMENT_BLOCKED'));
test('First mount started after confirmed native session loss still needs server-correlated401',()=>{
 const f=liveReadinessTimeout(),ready=f.evidence.events.find((e:{id:string})=>e.id==='month-close:first-mount:ready');
 Object.assign(f.evidence.events.find((e:{id:string})=>e.id==='month-close:first-mount'),{at:ready.at,state:ready.state});
 assert.equal(classifyWebKitLifecycle(f).status,'ENVIRONMENT_BLOCKED');
});
for(const[name,mutate]of[
 ['no server-side401 observation',(f:Saved)=>{f.evidence.events=f.evidence.events.filter((e:{type:string})=>e.type!=='month-close-server-response');}],
 ['auth credentials present',(f:Saved)=>{f.evidence.events.find((e:{type:string})=>e.type==='month-close-server-response').headers.token=true;}],
 ['different auth/business response',(f:Saved)=>{f.evidence.events.find((e:{type:string})=>e.type==='month-close-server-response').body.code='DIFFERENT';}],
 ['401 before native crash',(f:Saved)=>{f.evidence.events.find((e:{type:string})=>e.type==='month-close-server-response').at=1;}],
 ['ready checkpoint missing',(f:Saved)=>{f.evidence.events=f.evidence.events.filter((e:{id:string})=>e.id!=='month-close:first-mount:ready');}],
 ['ready checkpoint wrong document',(f:Saved)=>{f.evidence.events.find((e:{id:string})=>e.id==='month-close:first-mount:ready').state.documentId='different-document';}],
 ['selector regression on first mount',(f:Saved)=>{f.evidence.failure.message=f.evidence.failure.message.replace('nav button','wrong selector');}],
 ['auth regression without crash',(f:Saved)=>{f.trace=f.trace.split('\n').filter((line:string)=>!line.includes('killed by')).join('\n');}],
]as const)test(`Month-close readiness negative control: ${name}`,()=>{const f=liveReadinessTimeout();mutate(f);assert.equal(classifyWebKitLifecycle(f).status,'FAIL');});
