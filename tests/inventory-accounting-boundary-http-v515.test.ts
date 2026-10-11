import assert from "node:assert/strict";
import test from "node:test";
import { openingRuntime } from "./helpers/opening-runtime";
import * as counts from "../lib/bardoctor/inventory-counts";
async function runtime() {
 const r=openingRuntime();
 const route=r.loadRoute(new URL("../app/api/inventory/counts/route.ts",import.meta.url),counts);
 return {...r,count:()=>route,rawState:()=>({stores:r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all(),audit:r.sqlite.prepare("SELECT * FROM audit_log ORDER BY rowid").all(),batches:r.batches()}),send:async(api:typeof route,body:object,status:number)=>{const response=await api.POST(new Request("http://localhost/api/inventory/counts",{method:"POST",headers:{"Content-Type":"application/json","X-Venue-Id":"1"},body:JSON.stringify({venueId:1,...body})}));const result=await response.json() as {code:string};assert.equal(response.status,status,JSON.stringify(result));return result;}};
}

test("legacy monetary boundaries reject physical lifecycle and ID collision with no store/audit writes", async () => {
  const r = await runtime();
  try {
    const boundary = { id: "monthly-boundary", venueId: 1, date: "2026-09-01", currency: "MDL", sections: { "Бар": 1200 }, total: 1200 };
    for (const stored of [boundary, { ...boundary, sections: undefined }, { ...boundary, sections: "damaged", total: undefined }]) {
    r.put("bd_inventory_snapshots", [stored]);
    const before = r.rawState();
    for (const body of [
      { action: "delete", id: boundary.id },
      { action: "save", id: boundary.id, items: [] },
      { action: "review", id: boundary.id },
      { action: "finalize", id: boundary.id },
      { action: "cancel", id: boundary.id },
      { action: "create", snapshot: { id: boundary.id }, scope: { type: "all" } },
      { action: "create", id: "decoy", snapshot: { id: boundary.id }, scope: { type: "all" } },
      { snapshot: { id: boundary.id, items: [] } },
    ]) {
      const rejected = await r.send(r.count(), body, 409);
      assert.equal(rejected.code, body.action === "delete" ? "INVENTORY_DELETE_PROTECTED" : "INVENTORY_ACCOUNTING_BOUNDARY");
      assert.deepEqual(r.rawState(), before, "boundary, stock, snapshots and audit unchanged");
    }
    }
  } finally { r.close(); }
});
