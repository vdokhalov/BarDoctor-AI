import assert from 'node:assert/strict';
import { lifecycleRuntime } from './lifecycle-runtime';

export type JsonObject = Record<string, unknown>;
export function object(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected JSON object');
  return value as JsonObject;
}
export function objects(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) throw new Error('Expected JSON array');
  return value.map(object);
}
export async function responseObject(response: Response): Promise<JsonObject> { return object(await response.json()); }
export function seedLegacy(r: Awaited<ReturnType<typeof lifecycleRuntime>>, accountId: number, venueId: number) {
  const productKey='stock:qa legacy spirit|ml', at='2026-10-01T10:00:00.000Z';
  const put=(key:string,value:unknown):void => {
    r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(accountId,key,JSON.stringify(value),at);
  };
  put('bd_assortment_v1',{stockBalances:[{productKey,key:productKey,name:'QA Legacy Spirit',venueId,unit:'ml',current:100000,inventoryValue:2377,averageUnitCost:.02377}],nomenclature:[],recipes:[]});
  put('bd_purchase_documents',[{id:'legacy-invoice',venueId,status:'confirmed',currency:'MDL',date:'2026-10-01',items:[{id:'legacy-line',name:'QA Legacy Spirit',quantity:10,unit:'l',packageSize:'10 l',unitPrice:237.7,lineTotal:2377,category:'products',purchaseProductKey:productKey}]}]);
  put('bd_stock_movements',[{id:'legacy-receipt',venueId,type:'receipt',status:'active',date:'2026-10-01',createdAt:at,sourceDocumentId:'legacy-invoice',sourceLineId:'legacy-line',productKey,productName:'QA Legacy Spirit',amount:100000,unit:'ml',costAmount:2377,costStatus:'KNOWN',currency:'MDL'}]);
  return {put,productKey};
}
export function canonicalSnapshot(r: Awaited<ReturnType<typeof lifecycleRuntime>>) {
  return {domain:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),audit:r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all()};
}
export async function repairFixture() {
  const r=await lifecycleRuntime({products:'./app/api/inventory/products/route'});
  try {
    const owner=await r.register('repair-owner@isolated.test'),manager=await r.register('repair-manager@isolated.test'),foreign=await r.register('repair-foreign@isolated.test');
    const venueId=owner.activeVenueId,workspaceId=Number(r.sqlite.prepare('SELECT workspace_id id FROM venues WHERE id=?').get(venueId)?.id);
    r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId,manager.userId);
    r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(venueId,manager.userId);
    const call=async(user=owner,target=venueId,body:unknown={action:'repair'})=>{
      const request=r.request(user,'/api/inventory/products','POST',body);request.headers.set('X-Venue-Id',String(target));
      const response=await r.api.products.POST(request);return {response,body:await responseObject(response)};
    };
    // Auth/account/venue initialization is completed before any read-only or denial baseline.
    for(const user of [owner,manager,foreign]) {
      const req=r.request(user,'/api/auth/bootstrap','POST',{});req.headers.set('X-Venue-Id',String(user===manager?venueId:user.activeVenueId));
      const res=await r.api.bootstrap.POST(req);assert.equal(res.status,200);await responseObject(res);
    }
    return {...r,owner,manager,foreign,venueId,workspaceId,call,...seedLegacy(r,owner.userId,venueId),snapshot:()=>canonicalSnapshot(r)};
  } catch(error) {r.close();throw error;}
}
