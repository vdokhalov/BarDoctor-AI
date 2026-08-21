import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/more-hub-v166.css", import.meta.url);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("More v166 is a compact permission-aware hub without upsell", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const hub = sliceBetween(bundle, "/* bd-more-hub-v166:start */", "/* bd-more-hub-v166:end */");

  assert.match(bundle, /function bdMoreLegacyPageV165\(\)/);
  assert.equal((bundle.match(/function t_e\(\)/g) || []).length, 1);
  assert.match(hub, /data-bd-more-hub/);
  assert.match(hub, /Управление заведением/);
  assert.match(hub, /Данные и система/);
  assert.match(hub, /Быстрые действия/);
  assert.match(hub, /icon:kX,title:"Ассортимент и техкарты"/);
  assert.match(hub, /icon:Pf,title:"Поставщики"/);
  assert.match(hub, /key:"nomenclature",icon:kX,title:"Номенклатура"/);
  assert.match(hub, /key:"warehouse",icon:kX,title:"Склад"/);
  assert.match(hub, /onClick:\(\)=>e\("\/warehouse"\)/);
  assert.match(hub, /bdMoreHasPermissionV166\("inventory\.view"\)/);
  assert.match(hub, /bdMoreHasPermissionV166\("integrations.manage"\)/);
  assert.match(hub, /bdMoreHasPermissionV166\("audit.view"\)/);
  assert.match(hub, /bdCanAudit&&\{key:"control"/);
  assert.match(hub, /История, источники и закрытые периоды/);
  assert.doesNotMatch(hub, /data-control#exchange|key:"import".*data-control|key:"export".*data-control/);
  assert.doesNotMatch(hub, /Тариф|premium|paywall|Расширьте возможности|подписк/i);
});

test("More v166 derives statuses only from existing data", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const hub = sliceBetween(bundle, "/* bd-more-hub-v166:start */", "/* bd-more-hub-v166:end */");

  assert.match(hub, /\["needs_maintenance","under_repair","broken"\]\.includes/);
  assert.match(hub, /E>0\?bdMoreSignalBadgeV166\(E\):null/);
  assert.match(hub, /r\.venues\.length/);
  assert.match(hub, /\/api\/integration-hub/);
  assert.match(hub, /status==="connected"&&f\.syncEnabled!==!1/);
  assert.doesNotMatch(hub, /70%|3 новых|1 сигнал|3 активных/);
  assert.doesNotMatch(hub, /unread|isNew|dataQualityScore/);
});

test("More v166 links the native venue switcher and suppresses legacy rows", async () => {
  const [bundle, bootstrap, venueSwitcher] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
    readFile(new URL("../public/venue-switcher.js", import.meta.url), "utf8"),
  ]);
  const hub = sliceBetween(bundle, "/* bd-more-hub-v166:start */", "/* bd-more-hub-v166:end */");

  assert.match(hub, /data-bd-venue-host":"more-v166/);
  assert.match(hub, /data-bd-more-venues-native/);
  assert.match(hub, /data-bd-data-control-native/);
  assert.match(bootstrap, /data-bd-more-hub=\"v166\"/);
  assert.match(venueSwitcher, /data-bd-more-hub=\"v166\"/);
  assert.match(bootstrap, /if \(path === "\/equipment"\) return "\/more"/);
  assert.match(bootstrap, /if \(path === "\/warehouse"\) return "\/more"/);
  assert.match(bundle, /bdAccountingHeader,\{title:"Склад",back:"\/more"/);
});

test("More v166 is linked in both app documents and has responsive overflow-safe CSS", async () => {
  const [css, appHtml, response, fixture] = await Promise.all([
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/more-hub-qa-v166.js", import.meta.url), "utf8"),
  ]);

  for (const source of [appHtml, response]) {
    assert.match(source, /more-hub-v166\.css\?v=20260812-more-v166/);
    assert.match(source, /more-hub-qa-v166\.js\?v=20260812-more-v166/);
    assert.match(source, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(css, /\.bd-more-header-v166/);
  assert.match(css, /position: sticky/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /text-overflow: ellipsis/);
  assert.match(css, /overflow: hidden/);
  assert.match(fixture, /qaMore/);
  assert.match(fixture, /state === "single"/);
  assert.match(fixture, /state === "long"/);
  assert.match(fixture, /state === "limited"/);
  assert.match(fixture, /state === "empty"/);
});
