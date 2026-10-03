import assert from 'node:assert/strict';
import { lifecycleRuntime } from './lifecycle-runtime';
import { consolidateInventoryDuplicates } from '../../lib/bardoctor/inventory';
import type { EvidenceReference, EvidenceResourceKind, EvidenceResolution } from '../../lib/bardoctor/evidence-contracts';
export type StockRow = Record<string, unknown>;
export async function stockRuntime(options: { now?: string | null } = {}) {
  const heads = new Map<string, { size: number; etag: string; httpMetadata: { contentType: string }; customMetadata?: Record<string,string> }>();
  const clock = { now: options.now === undefined ? '2026-10-02T12:00:00.000Z' : options.now ?? undefined,
    bindings: { BUCKET: { head: async (key: string) => heads.get(key) ?? null, get: async (key: string) => {const meta=heads.get(key);return meta?{...meta,body:'SYNTHETIC FILE',writeHttpMetadata:(headers:Headers)=>headers.set('Content-Type',meta.httpMetadata.contentType)}:null;} } } };
  const r = await lifecycleRuntime({ confirm: './app/api/purchases/confirm/route', evidence: './app/api/evidence/resolve/route',
    file: './app/api/purchases/files/[id]/route', valuation: './app/api/inventory/valuation/route', counts: './app/api/inventory/counts/route', opening: './app/api/inventory/opening/route', sales: './app/api/sales-events/route' },
    clock);
  const owner = await r.register('stock-owner@isolated.test'), member = await r.register('stock-manager@isolated.test'), foreign = await r.register('stock-foreign@isolated.test');
  const venueId = owner.activeVenueId, workspaceId = Number(r.sqlite.prepare('SELECT workspace_id id FROM venues WHERE id=?').get(venueId)!.id);
  const put = (key: string, data: unknown) => r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId, key, JSON.stringify(data), '2026-10-02T11:00:00.000Z');
  const get = (key: string): StockRow | StockRow[] => JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json ?? 'null'));
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Isolated stock QA',currency:'MDL',timezone:'UTC'}),owner.userId);
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId,member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(venueId,member.userId);
  const permissions = (deny: string[]) => r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=?,status='active' WHERE venue_id=? AND account_id=?").run(JSON.stringify({deny}),venueId,member.userId);
  const initial = consolidateInventoryDuplicates({ assortment: { stockBalances: [], nomenclature: ['pcs','l','kg'].map((unit,i)=>({id:'nom-'+i,productKey:'product-'+i,key:'product-'+i,name:'QA product '+i,unit,venueId,active:true})), recipes: [] }, stockMovements: [], now: '2026-10-01T00:00:00.000Z' });
  put('bd_assortment_v1',initial.assortment); put('bd_stock_movements',[]); put('bd_suppliers',[{id:'qa-supplier',name:'QA supplier',venueId,status:'active'}]); put('bd_warehouses',[{id:'qa-warehouse',name:'QA warehouse',venueId,active:true}]);
  const reference = (kind: EvidenceResourceKind,id:string,more:object={}) => ({contractVersion:1,kind,id,venueId,workspaceId,...more} as EvidenceReference);
  const snapshot = () => ({domain:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),audit:r.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all(),files:[...heads.entries()]});
  const call = async (api:string,path:string,method='GET',body?:unknown,user=owner) => { const req=r.request(user,path,method,body);req.headers.set('X-Venue-Id',String(venueId));const response=await r.api[api][method](req);return {response,body:await response.json() as StockRow}; };
  const confirm = async (id:string,unit='pcs',quantity=2,price=20,date='2026-10-01',extras:StockRow={}) => {
    const nom=((get('bd_assortment_v1') as StockRow).nomenclature as StockRow[]).find(n=>n.unit===unit)!;assert.ok(nom);
    const document={id,venueId,documentType:'invoice',supplierId:'qa-supplier',supplierName:'QA supplier',date,currency:'MDL',source:'manual',paymentMethod:'unknown',total:quantity*price,items:[{id:id+'-line',name:nom.name,nomenclatureId:nom.id,purchaseProductKey:nom.productKey,quantity,unit,quantityMode:'measure',unitPrice:price,lineTotal:quantity*price,category:'products',mappingSource:'manual'}],...extras};
    return call('confirm','/api/purchases/confirm','POST',{venueId,document});
  };
  const resolve = async (ref:unknown,user=owner,query='') => { const before=snapshot();const result=await call('evidence','/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ref))+query,'GET',undefined,user);assert.deepEqual(snapshot(),before,'Every success/failed evidence read preserves canonical bytes, timestamps, audit and files');return {...result,body:result.body as unknown as EvidenceResolution}; };
  return {...r,owner,member,foreign,venueId,workspaceId,put,get,reference,snapshot,call,confirm,resolve,permissions,heads,
    setTime: (now: string) => { assert.ok(clock.now, 'Use real elapsed time for an unfrozen runtime'); clock.now = now; } };
}
