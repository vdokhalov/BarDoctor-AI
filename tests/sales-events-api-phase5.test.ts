import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import * as sales from "../lib/bardoctor/sales-events";
import { salesEventFixture, saleCommand } from "./helpers/sales-event-fixture";

function runtime() {
  const r = openingRuntime(new URL("../app/api/sales-events/route.ts", import.meta.url), sales);
  r.put("bd_assortment_v1", salesEventFixture().assortment);
  const send = (body: object, venue = 1) => r.api.POST(new Request("http://localhost/api/sales-events", {
    method:"POST", headers:{"Content-Type":"application/json", "X-Venue-Id":String(venue)}, body:JSON.stringify({venueId:venue,...body}),
  }));
  return {...r, send};
}

test("sales HTTP persists converted litres atomically, retries and reverses once", async () => {
  const r = runtime();
  try {
    const command = saleCommand("whisky", 2);
    const preview = await r.send({action:"preview",command});
    assert.equal(preview.status,200);
    const quote = await preview.json() as {previewHash:string};
    assert.equal(r.get(sales.SALES_EVENT_STORE_KEY),null);
    const response = await r.send({action:"post",command,previewHash:quote.previewHash});
    assert.equal(response.status,201);
    const result = await response.json() as {event:sales.SalesEvent};
    assert.equal((r.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[1].current,1.9);
    const saved = r.get(sales.SALES_EVENT_STORE_KEY);
    assert.equal((await r.send({action:"post",command,previewHash:quote.previewHash})).status,200);
    assert.deepEqual(r.get(sales.SALES_EVENT_STORE_KEY),saved);
    assert.equal(r.sqlite.prepare("SELECT count(*) AS n FROM audit_log").get()?.n,1);
    assert.equal((await r.send({action:"reverse",eventId:result.event.id})).status,201);
    const movements = r.get("bd_stock_movements");
    assert.equal((await r.send({action:"reverse",eventId:result.event.id})).status,200);
    assert.deepEqual(r.get("bd_stock_movements"),movements);
    assert.equal((r.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[1].current,2);
    assert.equal((r.get("bd_finance_revenue") as {revenue:number}[])[0].revenue,0);
  } finally {r.close();}
});

test("sales HTTP concurrent CAS retry preserves intervening stock and rolls back failed transactions", async () => {
  for (const failure of [false,true]) {
    const r = runtime();
    try {
      const command = saleCommand("whisky",2);
      const quote = await (await r.send({action:"preview",command})).json() as {previewHash:string};
      const before = r.get("bd_assortment_v1");
      if (failure) r.failAt(3);
      else r.beforeBatch(() => {
        const updated = r.get("bd_assortment_v1") as {stockBalances:{current:number}[]};
        updated.stockBalances[1].current=3;
        r.put("bd_assortment_v1",updated);
      });
      const post = () => r.send({action:"post",command,previewHash:quote.previewHash});
      if (failure) {
        await assert.rejects(post,/SIMULATED_D1_WRITE_FAILURE/);
        assert.deepEqual(r.get("bd_assortment_v1"),before);
        assert.equal(r.get(sales.SALES_EVENT_STORE_KEY),null);
        assert.equal(r.get("bd_stock_movements"),null);
        assert.equal(r.get("bd_finance_revenue"),null);
        assert.equal(r.sqlite.prepare("SELECT count(*) AS n FROM audit_log").get()?.n,0);
      } else {
        assert.equal((await post()).status,201);
        assert.equal((r.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[1].current,2.9);
        assert.equal((r.get(sales.SALES_EVENT_STORE_KEY) as unknown[]).length,1);
        assert.equal(r.batches(),2);
      }
    } finally {r.close();}
  }
});

test("sales HTTP rejects stale prices, permissions and foreign venue before writes", async () => {
  const r = runtime();
  try {
    const command = saleCommand("whisky",2);
    const quote = await (await r.send({action:"preview",command})).json() as {previewHash:string};
    const assortment = r.get("bd_assortment_v1") as {menuItems:{salePrice:number}[]};
    assortment.menuItems[1].salePrice=100;r.put("bd_assortment_v1",assortment);
    const stale = await r.send({action:"post",command,previewHash:quote.previewHash});
    assert.equal(stale.status,409);
    assert.equal((await stale.json() as {code:string}).code,"SALES_EVENT_PREVIEW_CHANGED");
    assert.equal((await r.send({action:"preview",command,venueId:2})).status,409);
    r.setAllowed(false);assert.equal((await r.send({action:"preview",command})).status,403);
    r.setSignedIn(false);assert.equal((await r.send({action:"preview",command})).status,401);
    assert.equal(r.batches(),0);
    assert.equal(r.get(sales.SALES_EVENT_STORE_KEY),null);
  } finally {r.close();}
});
