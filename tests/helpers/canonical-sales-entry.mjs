import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Sales moved out of the Warehouse tab. Keep both its canonical route and
// backwards-compatible deep links covered instead of requiring the removed CTA.
export function assertCanonicalSalesEntry(bundle) {
  assert.match(bundle, /path:"\/sales-import",component:/);
  assert.match(bundle, /function bdSalesImportPage\(\)\{return i\.jsx\(bdSalesPosPage/);
  const route=readFileSync(new URL('../../app/sales-import/route.ts',import.meta.url),'utf8');
  assert.match(route, /Импортировать продажи/);
  assert.match(route, /data-sales-view="import"/);
  const redirect=bundle.match(/const bdLegacySalesTab=new URL\(window\.location\.href\);if\(bdLegacySalesTab\.searchParams\.get\("tab"\)===?"sales"\)\{[^}]+\}/)?.[0];
  assert.ok(redirect,'legacy Warehouse Sales links retain their redirect');
  const routes=[];
  const window={location:{href:'https://qa.test/warehouse?tab=sales&venue=42&batch=sale-1#details'},bdNavigate:value=>routes.push(value)};
  vm.runInNewContext(redirect,{window,URL});
  assert.deepEqual(routes,['/sales-import?venue=42&batch=sale-1#details']);
  window.location.href='https://qa.test/warehouse?tab=stock&venue=42';
  vm.runInNewContext(redirect,{window,URL});
  assert.equal(routes.length,1,'other warehouse tabs do not redirect');
}
