import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync("public/bardoctor-preview-v397.js", "utf8");
const start = source.indexOf('  var bdCachedSessionV397 =');
const end = source.indexOf('  var bdStartupRecoveryVersionV341', start);
const cached = source.slice(start, end);
function classify(venue, extra = {}) {
  const store = {
    bd_session: "new@example.invalid", bd_session_token: "test-token",
    bd_active_venue_id: "12",
    bd_venue_context__new: null,
    "bd_venue_context__new@example.invalid": JSON.stringify({ venues: venue ? [venue] : [] }),
    ...extra,
  };
  const context = {window: {},localStorage:{getItem:key=>store[key]??null}};
  vm.runInNewContext(cached, context);
  return context.window.__bdAuthBootstrapV274.state;
}
test("allocated primary venue without profile is onboarding, never ready", () => {
  assert.equal(classify({id:12,role:"owner",isPrimary:true,hasProfile:false,status:"active"}), "onboarding_required");
});
test("only matching completed cached profile may render ready shell", () => {
  assert.equal(classify({id:12,role:"owner",isPrimary:true,hasProfile:true,status:"active"}), "ready");
  for (const venue of [null, {id:13,hasProfile:true}, {id:12}, {id:12,hasProfile:true,status:"inactive"},
    {id:12,hasProfile:false,role:"manager",isPrimary:true}, {id:12,hasProfile:false,role:"owner",isPrimary:false}]) {
    assert.equal(classify(venue), "loading");
  }
  assert.equal(classify(null,{"bd_venue_context__new@example.invalid":"invalid"}), "loading");
  assert.equal(classify(null,{bd_session:null}), "unauthenticated");
});

test("all final route guards observe bootstrap changes without conditional profile hooks", () => {
  const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  assert.match(bundle, /function _le\(\)\{bdUseBootstrapRevisionV445\(\);/);
  assert.match(bundle, /function oEe\(\{component:e\}\)\{bdUseBootstrapRevisionV445\(\);/);
  assert.match(bundle, /function pt\(\{component:e\}\)\{bdUseBootstrapRevisionV445\(\);const\{profile:r,isReady:a\}=Un\(\);if/);
});
