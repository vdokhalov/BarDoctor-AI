import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { salesEventFixture } from "./helpers/sales-event-fixture";
const routes={sales:"./app/api/sales-events/route",orders:"./app/api/pos-orders/route",batches:"./app/api/sales-batches/route",overview:"./app/api/pos-overview/route",cost:"./app/api/evidence/facts/sale-cost/route",evidence:"./app/api/evidence/resolve/route"};
test("real-auth POS retries recheck membership denial and private cashier history excludes colleagues",async t=>{
 const r=await lifecycleRuntime(routes);t.after(r.close);
 const owner=await r.register("secure-owner@isolated.test"),staff=await r.register("secure-staff@isolated.test"),foreign=await r.register("secure-foreign@isolated.test");
 const venue=owner.activeVenueId,workspace=r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venue,staff.userId);
 r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({currency:"MDL"}),owner.userId);
 r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(owner.userId,"bd_assortment_v1",JSON.stringify(salesEventFixture().assortment));
 function request(user:typeof owner,method="GET",body?:object,selected=venue){const headers=new Headers(r.request(user,"/api").headers);headers.set("X-Venue-Id",String(selected));return new Request("https://isolated.test/api",{method,headers,...(body?{body:JSON.stringify({venueId:selected,...body})}:{})});}
 assert.equal((await r.api.sales.POST(request(owner,"POST",{action:"open_shift",shiftId:"shift",name:"Synthetic",openingFloat:0}))).status,201);
 const command=(id:string)=>({id,source:"POS_API",shiftId:"shift",payments:[{id:"p",method:"CASH",amount:20}],lines:[{id:"l",menuItemId:"beer",quantity:1}]});
 const c=command("private-owner");let preview=await (await r.api.sales.POST(request(owner,"POST",{action:"preview",command:c}))).json() as {previewHash:string};
 assert.equal((await r.api.sales.POST(request(owner,"POST",{action:"post",command:c,previewHash:preview.previewHash}))).status,201);
 const list=await (await r.api.sales.GET(request(staff))).json() as {events:unknown[];shifts:unknown[]};assert.deepEqual(list.events,[]);assert.doesNotMatch(JSON.stringify(list),/totalTheoreticalCost|originalMovements|recipes|closingReport|openingFloat/);
 assert.equal((await r.api.sales.POST(request(staff,"POST",{action:"post",command:c,previewHash:preview.previewHash}))).status,403);
 assert.equal((await r.api.batches.GET(request(staff))).status,403);assert.equal((await r.api.overview.GET(request(staff))).status,403);
 assert.equal((await r.api.orders.GET(request(foreign))).status,401);
 const mine=command("staff-sale");preview=await (await r.api.sales.POST(request(staff,"POST",{action:"preview",command:mine}))).json() as {previewHash:string};
 r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({deny:["sales.post"],allow:["finance.view"]}),venue,staff.userId);});
 assert.equal((await r.api.sales.POST(request(staff,"POST",{action:"post",command:mine,previewHash:preview.previewHash}))).status,403);
 const persisted=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));assert.equal(persisted.length,1);
 // Nullable legacy title must not prevent a valid cashier sale after rights are restored.
 r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=NULL WHERE venue_id=? AND account_id=?").run(venue,staff.userId);
 assert.equal((await r.api.sales.POST(request(staff,"POST",{action:"post",command:mine,previewHash:preview.previewHash}))).status,201);
 const safe=await (await r.api.sales.GET(request(staff))).json() as {events:{id:string;externalId:string}[]};assert.deepEqual(safe.events.map(e=>e.externalId),["staff-sale"]);
 assert.doesNotMatch(JSON.stringify(safe),/totalTheoreticalCost|originalMovements|recipeSnapshot/);
 const ownId=safe.events[0].id;
 const getAt=(path:string)=>new Request("https://isolated.test"+path,{headers:request(staff).headers});
 const before=r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all();
 for(const saleId of [ownId,persisted[0].id]){
   const cost=await r.api.cost.GET(getAt("/api/evidence/facts/sale-cost?saleId="+encodeURIComponent(saleId)));
   const body=await cost.json() as {code:string};assert.equal(body.code,"ACCESS_DENIED");assert.doesNotMatch(JSON.stringify(body),/capturedTotalCost|recipeSnapshot|totalTheoreticalCost/);
   for(const kind of ["CAPTURED_COST","CAPTURED_RECIPE"]){
     const ref={contractVersion:1,kind,id:saleId,venueId:venue,workspaceId:Number(workspace),...(kind==="CAPTURED_RECIPE"?{partId:"l"}:{})};
     const body=await (await r.api.evidence.GET(getAt("/api/evidence/resolve?ref="+encodeURIComponent(JSON.stringify(ref))))).json() as Record<string,unknown>;
     assert.equal(body.code,"ACCESS_DENIED");assert.doesNotMatch(JSON.stringify(body),/capturedTotalCost|recipeSnapshot|totalTheoreticalCost/);
   }
 }
 const saleRef={contractVersion:1,kind:"SALE_EVENT",id:ownId,venueId:venue,workspaceId:Number(workspace)};
 const evidence=await (await r.api.evidence.GET(getAt("/api/evidence/resolve?ref="+encodeURIComponent(JSON.stringify(saleRef))))).json() as Record<string,unknown>;
 assert.ok(evidence.evidence);assert.doesNotMatch(JSON.stringify(evidence),/CAPTURED_COST|recipeSnapshot|totalTheoreticalCost/);
 assert.equal((await r.api.sales.GET(getAt("/api/sales-events?reportShiftId=shift"))).status,403);
 const replay=await (await r.api.sales.POST(request(staff,"POST",{action:"post",command:mine,previewHash:preview.previewHash}))).json() as Record<string,unknown>;
 assert.equal(replay.duplicate,true);assert.doesNotMatch(JSON.stringify(replay),/totalTheoreticalCost|originalMovements|recipeSnapshot/);
 assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all(),before);

});
