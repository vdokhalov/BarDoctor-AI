import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("authoritative bootstrap replaces present stores and invalidates missing server caches", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  assert.match(bundle, /bdAuthoritativeBootstrapVersionV324="authoritative-bootstrap-v324"/);
  assert.match(bundle, /return\{entries:r,persistenceBoundary:n\.persistenceBoundary\?\?null\}/);
  assert.match(bundle, /Object\.prototype\.hasOwnProperty\.call\(d\.entries,f\)\|\|cz\(f\)\|\|bdClearMissingServerStoreV324\(f\)/);
  assert.match(bundle, /localStorage\.removeItem\(Sz\(e\)\)/);
  assert.match(bundle, /"bd_finance_expenses"/);
  assert.match(bundle, /"bd_ai_diagnosis_v9"/);
  assert.doesNotMatch(bundle, /\(async\(\)=>\{await Qse\(Goe\(\)\);const d=await Xse\(\)/);
});

test("bootstrap preserves pending offline edits while invalidating only after a successful server read", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  assert.match(bundle, /if\(!n\.ok\|\|!n\.entries\)return null/);
  assert.match(bundle, /if\(d\)\{for\(const\[f,m\]of Object\.entries\(d\.entries\)\)cz\(f\)\|\|Kse\(f,m\)/);
  assert.match(bundle, /hasOwnProperty\.call\(d\.entries,f\)\|\|cz\(f\)\|\|bdClearMissingServerStoreV324\(f\)/);
});
