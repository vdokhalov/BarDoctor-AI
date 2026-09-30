import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { parse } from "acorn";

const source = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const node = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body.find(n => n.type === "FunctionDeclaration" && n.id.name === "Woe");

// Execute the shipped provider with React effect dependency/cleanup semantics.
function provider() {
  let cursor = 0, profile = { isReady: true, profile: { name: "QA", currency: "MDL" } };
  const hooks = [], pendingEffects = [], reads = [], commits = [];
  const context = vm.createContext({
    Un: () => profile, Ot: () => "synthetic-session", r7: { Provider: "cloud" }, PM: [],
    i: { jsx: (_, props) => props.value },
    bdApplyHomeFinanceWarmV349: async () => false,
    Xse: () => new Promise(resolve => reads.push(resolve)),
    cz: () => false, Kse: (key, value) => commits.push([key, value]),
    bdServerStoreKeysV324: [], bdClearMissingServerStoreV324: () => {}, pM: () => {},
    window: { addEventListener() {}, removeEventListener() {} },
    S: {
      useState(value) { const id = cursor++; hooks[id] ??= { value }; return [hooks[id].value, next => { hooks[id].value = next; }]; },
      useRef(value) { const id = cursor++; hooks[id] ??= { current: value }; return hooks[id]; },
      useEffect(callback, deps) {
        const id = cursor++, previous = hooks[id];
        if (previous && deps.every((value, index) => Object.is(value, previous.deps[index]))) return;
        previous?.cleanup?.(); hooks[id] = { deps };
        pendingEffects.push(() => { hooks[id].cleanup = callback(); });
      },
    },
  });
  vm.runInContext(source.slice(node.start, node.end), context);
  const render = () => { cursor = 0; const value = context.Woe({ children: null }); while (pendingEffects.length) pendingEffects.shift()(); return value; };
  const refresh = () => { profile = { ...profile, profile: { ...profile.profile } }; return render(); };
  const settle = async (index, name = "current") => { reads[index]({ entries: { bd_assortment_v1: { name } } }); await new Promise(resolve => setImmediate(resolve)); return render(); };
  const unmount = () => hooks.forEach(hook => hook.cleanup?.());
  return { render, refresh, settle, unmount, reads, commits };
}

test("cached profile → fresh equivalent profile during store read still reaches CloudSync ready", async () => {
  const app = provider();
  assert.equal(app.render().isReady, false);
  app.refresh();
  await app.settle(0, "cancelled");
  if (app.reads.length > 1) await app.settle(1);
  assert.equal(app.render().isReady, true, "successful current hydration must release the existing Menu readiness gate");
});

test("cancelled profile read cannot apply stale stores after fresh hydration", async () => {
  const app = provider(); app.render(); app.refresh();
  await app.settle(0, "stale");
  assert.equal(app.commits.length, 0);
  await app.settle(1, "fresh");
  assert.deepEqual(app.commits, [["bd_assortment_v1", { name: "fresh" }]]);
});

test("same dependency rerender retains one read; later profile hydration remains ready", async () => {
  const app = provider(); app.render(); app.render(); assert.equal(app.reads.length, 1);
  assert.equal((await app.settle(0)).isReady, true);
  app.refresh(); if (app.reads.length > 1) await app.settle(1);
  assert.equal(app.render().isReady, true);
});

test("unmounted hydration cannot commit stores", async () => {
  const app = provider(); app.render(); app.unmount(); await app.settle(0);
  assert.equal(app.commits.length, 0);
});
