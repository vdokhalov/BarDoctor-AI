import assert from "node:assert/strict";
import test from "node:test";
import { classifyWebKitLifecycle } from "../scripts/qa/webkit-environment-classifier.mjs";

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
  f.trace = f.trace.split("\n")[0]; assert.equal(classifyWebKitLifecycle(f).status, "PASS");
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
  ['unproven WPEWebProcess signal',(f:ReturnType<typeof teardownFixture>)=>{f.trace=f.trace.replace('SIGSEGV','SIGABRT');}],
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
