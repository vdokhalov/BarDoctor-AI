import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/modern-polish.css", import.meta.url);

async function loadSyncPresentation() {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdSyncPresentationV158(");
  const end = bundle.indexOf("function Pse()", start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.present = bdSyncPresentationV158;`,
    context,
  );
  return context.present;
}

test("global sync presentation is quiet on success and Russian in every active state", async () => {
  const present = await loadSyncPresentation();

  assert.deepEqual({ ...present("synced") }, {
    visible: false,
    label: "Синхронизировано",
    tone: "success",
    retry: false,
  });
  assert.equal(present("syncing").label, "Синхронизация…");
  assert.equal(present("offline").label, "Нет сети");
  assert.equal(present("pending").label, "Не синхронизировано");
  assert.equal(present("pending").retry, true);
  assert.equal(present("conflict").label, "Конфликт данных");
});

test("global sync component uses a transient success toast and actionable retry", async () => {
  const [bundle, css, homeCss] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/home-visual-v151.css", import.meta.url), "utf8"),
  ]);
  const start = bundle.indexOf("const Mse=");
  const end = bundle.indexOf("const hz=", start);
  const sync = bundle.slice(start, end);

  assert.match(sync, /e==="synced"&&n\(\{variant:"success",title:"Синхронизировано"/);
  assert.match(sync, /duration:1800/);
  assert.match(sync, /l\.retry\?\(\)=>\{pM\(\)\}:null/);
  assert.match(sync, /aria-label":"Повторить синхронизацию"/);
  assert.doesNotMatch(sync, /label:"Synced"|label:"Syncing|Pending upload|Conflict detected/);
  assert.match(css, /button\.bd-sync-status\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /\.bd-sync-indicator\s*\{[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(homeCss, /data-bd-route="\/home"\][^{]*\.bd-sync-indicator/);
});
