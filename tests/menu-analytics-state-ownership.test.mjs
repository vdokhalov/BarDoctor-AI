import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { parse } from "acorn";

const source = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const component = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body.find(node => node.id?.name === "bdAssortmentCommandPageV170");
const nodes = [];
function visit(node) {
  if (!node || typeof node !== "object") return;
  if (node.type) nodes.push(node);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") visit(value);
}
visit(component.body);
const text = node => source.slice(node.start, node.end);
const effect = nodes.find(node => node.type === "CallExpression" && node.callee.property?.name === "useEffect" && text(node.arguments[0]).includes('fetch("/api/assortment/overview?period='));
const chooser = nodes.find(node => node.type === "LogicalExpression" && node.right.type === "CallExpression" && node.right.arguments[0]?.name === "bdAssortmentSourceChoiceV170");
const status = nodes.find(node => node.type === "Property" && node.key.value === "data-analytics-state");
const open = nodes.find(node => node.type === "VariableDeclarator" && node.id.name === "ze").init;
const close = chooser.right.arguments[1].properties.find(node => node.key.name === "onClose").value;
const bindings = nodes.filter(node => node.type === "VariableDeclarator" && node.id.type === "ArrayPattern" && ["$", "V", "bdAnalyticsStatusPhase2"].includes(node.id.elements[0]?.name));

// Execute the shipped request effect and actual Add/dismiss handlers. Only the
// hook runtime and network completion are controlled; state ownership isn't
// reimplemented as a parallel test model.
function app() {
  const hooks = [], requests = []; let cursor = 0;
  const context = vm.createContext({
    s: { activeVenueId: 17 }, n: true, m: "2026-10", fe: { current: 0 }, AbortController,
    S: { useState(initial) { const id = cursor++; if (!(id in hooks)) hooks[id] = initial; return [hooks[id], value => { hooks[id] = value; }]; } },
    fetch(url) { return new Promise(resolve => requests.push({ url, resolve })); },
  });
  const render = () => {
    cursor = 0;
    vm.runInContext(bindings.map(node => "var " + text(node) + ";").join("\n"), context);
    return JSON.parse(JSON.stringify(vm.runInContext(`({ chooserVisible: ${text(chooser.left)}, analyticsStatus: ${text(status.value)}, analytics: V })`, context)));
  };
  render();
  const read = period => { context.m = period; return vm.runInContext(`(${text(effect.arguments[0])})()`, context); };
  const add = () => { vm.runInContext(`(${text(open)})()`, context); return render(); };
  const dismiss = () => { vm.runInContext(`(${text(close)})()`, context); return render(); };
  const deliver = async (index, { ok = true, analytics = { period: context.m } } = {}) => {
    requests[index].resolve({ ok, json: async () => ({ ok, venueId: 17, analytics, error: "Analytics unavailable" }) });
    await new Promise(resolve => setImmediate(resolve)); return render();
  };
  return { read, add, dismiss, deliver, render, requests };
}

test("successful delayed analytics update data and preserve the open source chooser", async () => {
  const ui = app(); ui.read("2026-09"); assert.equal(ui.add().chooserVisible, true);
  const result = await ui.deliver(0, { analytics: { period: "2026-09", marker: "real result" } });
  assert.equal(result.chooserVisible, true); assert.equal(result.analyticsStatus, null);
  assert.deepEqual(result.analytics, { period: "2026-09", marker: "real result" });
});

test("analytics errors preserve the chooser and expose an independent error status", async () => {
  const ui = app(); ui.read("2026-09"); ui.add(); const result = await ui.deliver(0, { ok: false });
  assert.equal(result.chooserVisible, true); assert.equal(result.analyticsStatus, "error"); assert.equal(result.analytics, null);
});

test("starting another analytics request cannot close an already open chooser", () => {
  const ui = app(); ui.add(); ui.read("2026-09");
  assert.deepEqual(ui.render(), { chooserVisible: true, analyticsStatus: "loading", analytics: null });
});

test("repeated period changes retain chooser ownership and reject superseded results", async () => {
  const ui = app(); const cleanup = ui.read("2026-09"); ui.add(); cleanup(); ui.read("2026-08");
  const latest = await ui.deliver(1, { analytics: { period: "2026-08" } });
  assert.equal(latest.chooserVisible, true); assert.deepEqual(latest.analytics, { period: "2026-08" });
  assert.deepEqual(await ui.deliver(0, { analytics: { period: "2026-09" } }), latest);
});

test("explicit close stays closed after analytics completion, then Add reopens", async () => {
  const ui = app(); ui.read("2026-09"); ui.add(); assert.equal(ui.dismiss().chooserVisible, false);
  assert.equal((await ui.deliver(0)).chooserVisible, false); assert.equal(ui.add().chooserVisible, true);
});

test("analytics completion cannot open a chooser that the user never opened", async () => {
  const ui = app(); ui.read("2026-09"); assert.equal((await ui.deliver(0)).chooserVisible, false);
  ui.read("2026-08"); assert.equal((await ui.deliver(1, { ok: false })).chooserVisible, false);
});
