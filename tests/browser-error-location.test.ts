import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

test("browser error location preserves native error delivery and excludes sensitive messages/URLs",()=>{
  const logs:string[]=[];let fetches=0, delivered=0;
  const target=new EventTarget();
  const window={location:{href:"https://local.invalid/home?private=secret",origin:"https://local.invalid"},
    addEventListener:target.addEventListener.bind(target),fetch:async()=>{fetches++;return new Response();}};
  const source=readFileSync("public/bd-request-observability.js","utf8");
  const context={window,URL,Headers,Request,crypto,performance,console:{info:(s:string)=>logs.push(s)}};
  runInNewContext(source,context);runInNewContext(source,context);
  target.addEventListener("error",()=>delivered++);
  const fixtures=[
    ["https://local.invalid/assets/index-BQGspy0I-df191a7b87d6.js?token=SECRET", "app_bundle", "/assets/index-BQGspy0I-df191a7b87d6.js"],
    ["https://local.invalid/bardoctor-preview-v397.js?private=SECRET", "app_script", "/bardoctor-preview-v397.js"],
    ["https://local.invalid/cdn-cgi/challenge-platform/SECRET", "platform", null],
    ["https://private.example.invalid/SECRET", "external", null],
    ["https://local.invalid/private/SECRET", "same_origin_other", null],
    ["", "unknown", null],
  ];
  for(const [filename,expectedSource,file] of fixtures){
    const event=new Event("error",{cancelable:true});
    Object.assign(event,{filename,lineno:12,colno:34,error:new TypeError("SECRET financial record"),message:"Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'. SECRET"});
    assert.equal(target.dispatchEvent(event),true);assert.equal(event.defaultPrevented,false);
    const row=JSON.parse(logs.at(-1)!);
    assert.equal(row.source,expectedSource);assert.equal(row.file,file);
    assert.equal(row.line,12);assert.equal(row.column,34);
    assert.equal(row.category,"mutation_observer_target");assert.equal(row.errorType,"TypeError");
  }
  assert.equal(logs.length,fixtures.length,"one handler despite repeated installation");
  assert.equal(delivered,fixtures.length);assert.equal(fetches,0,"no telemetry request");
  assert.doesNotMatch(logs.join(""),/SECRET|private|financial|token|record/);
});
