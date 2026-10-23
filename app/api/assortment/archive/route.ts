import {getD1} from '../../../../db';
import {authenticateRequest,unauthorized} from '../../../../lib/bardoctor/auth';
import {hasPermission} from '../../../../lib/bardoctor/access-control';
import {canReadStore} from '../../../../lib/bardoctor/data-trust';
import {readStoreSnapshots,runStoreCasBatch,withStoreCasRetries} from '../../../../lib/bardoctor/store-cas';
import {archivePositions,isArchivedPosition,restoreArchivedPosition} from '../../../../lib/bardoctor/assortment-archive';
const KEY='bd_assortment_v1';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 const account=await authenticateRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'inventory.view')||!canReadStore(account,KEY))return reply({ok:false,error:'Нет доступа'},403);
 const kind=new URL(request.url).searchParams.get('kind');if(kind!=='menu'&&kind!=='inventory')return reply({ok:false,error:'Неверный раздел'},400);
 const snapshots=await readStoreSnapshots(getD1(),account.id,[KEY]);const data=JSON.parse(snapshots[0]?.dataJson||'{}');
 return reply({ok:true,venueId:account.venueId,items:archivePositions(data,kind,account.venueId).filter(isArchivedPosition).map(v=>({id:v.archiveKey,name:v.name||'Без названия'})),canRestore:hasPermission(account,'inventory.manage')});
}
async function restore(request:Request){
 const account=await authenticateRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'inventory.manage')||!canReadStore(account,KEY))return reply({ok:false,error:'Нет права восстанавливать позиции'},403);
 const raw=await request.text();if(raw.length>2000)return reply({ok:false,error:'Слишком много данных'},413);
 let body;try{body=JSON.parse(raw)}catch{return reply({ok:false,error:'Неверные данные'},400)}
 if(!body||!['menu','inventory'].includes(body.kind)||typeof body.id!=='string'||!body.id||body.id.length>300)return reply({ok:false,error:'Неверная позиция'},400);
 const db=getD1(),snapshots=await readStoreSnapshots(db,account.id,[KEY]),now=new Date().toISOString();
 const result=restoreArchivedPosition(JSON.parse(snapshots[0]?.dataJson||'{}'),body.kind,body.id,account.venueId,now);
 if(!result)return reply({ok:false,error:'Позиция недоступна'},404);
 if(result.changed)await runStoreCasBatch(db,account.id,snapshots,[
  db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(JSON.stringify(result.data),now,account.id,KEY),
  db.prepare("INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES (?,?,'update',?,?,?,?,?,?,?,?,?)").bind(account.id,KEY,body.id,String(result.before.name||'Позиция'),JSON.stringify(result.before),JSON.stringify(result.after),JSON.stringify(['active','archived']),[account.firstName,account.lastName].filter(Boolean).join(' ')||account.appEmail,account.role,'Восстановление из архива',now)
 ],now);
 return reply({ok:true,venueId:account.venueId,id:body.id});
}
export const POST=(request:Request)=>withStoreCasRetries(request,restore);
