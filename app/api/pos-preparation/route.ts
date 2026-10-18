import {authenticateRequest,unauthorized} from '../../../lib/bardoctor/auth';
import {hasPermission,canManagePosPrivilegedAction} from '../../../lib/bardoctor/access-control';
import {getD1} from '../../../db';
import {readStoreSnapshots,runStoreCasBatch,withStoreCasRetries} from '../../../lib/bardoctor/store-cas';
import {posMembershipGuard} from '../../../lib/bardoctor/pos-auth-guard';
import {readJsonRequest} from '../../../lib/bardoctor/http';
import {preparationConfig,preparationKey,preparationSections} from '../../../lib/bardoctor/pos-preparation';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){return handle(request,false)}
export async function POST(request:Request){return withStoreCasRetries(request,attempt=>handle(attempt,true))}
async function handle(request:Request,write:boolean):Promise<Response>{
 const account=await authenticateRequest(request);if(!account)return unauthorized();
 if(!hasPermission(account,'sales.create')||!canManagePosPrivilegedAction(account))return reply({ok:false,code:'ACCESS_DENIED',error:'Настройка доступна только руководителю.'},403);
 try{
 const db=getD1(),key=preparationKey(account.venueId),snapshots=await readStoreSnapshots(db,account.id,[key,'bd_assortment_v1']);
 const config=preparationConfig(JSON.parse(snapshots[0].dataJson??'null'),account.venueId),assortment=JSON.parse(snapshots[1].dataJson??'{}'),sections=preparationSections(assortment);
 if(!write)return reply({ok:true,venueId:account.venueId,config,sections,hardwareConnected:false});
 const parsed=await readJsonRequest<{venueId:number;operationId:string;expectedRevision:number;sectionId:string;printerId:string;printerName:string}>(request,{maxBytes:10000});if(!parsed.ok)return parsed.response;
 const b=parsed.data;if(b.venueId!==account.venueId)return reply({ok:false,code:'VENUE_CHANGED'},409);
 if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||![b.operationId,b.sectionId].every(x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=120)||![b.printerId,b.printerName].every(x=>typeof x==='string'&&x.trim()===x&&x.length<=120)||Boolean(b.printerId)!==Boolean(b.printerName))return reply({ok:false,error:'Проверьте раздел, идентификатор и название логического принтера.'},400);
 const fingerprint=JSON.stringify([b.expectedRevision,b.sectionId,b.printerId,b.printerName]),prior=config.operations.find(o=>o.id===b.operationId);
 if(prior)return prior.fingerprint===fingerprint?reply({ok:true,duplicate:true,config}):reply({ok:false,code:'IDEMPOTENCY_CONFLICT'},409);
 if(config.revision!==b.expectedRevision)return reply({ok:false,error:'Настройка изменилась. Откройте её заново.'},409);
 if(!sections.some(s=>s.id===b.sectionId))return reply({ok:false,error:'Раздел недоступен.'},409);
 const next=preparationConfig({...config,revision:config.revision+1,routes:[...config.routes.filter(r=>r.sectionId!==b.sectionId),...(b.printerId?[{sectionId:b.sectionId,printerId:b.printerId,printerName:b.printerName}]:[])],operations:[...config.operations,{id:b.operationId,fingerprint}]},account.venueId),now=new Date().toISOString();
 await runStoreCasBatch(db,account.id,snapshots,[posMembershipGuard(db,account,now),db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,key,JSON.stringify(next),now),db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,actor_name,actor_role,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(account.id,key,'preparation_route',b.sectionId,account.firstName||'',account.role,JSON.stringify(config),JSON.stringify(next),now)],now);
 return reply({ok:true,config:next,hardwareConnected:false},201);
 }catch(error){if(error instanceof Error&&error.name==='StoreWriteConflictError')throw error;return reply({ok:false,error:'Настройки маршрутизации требуют проверки. Ничего не изменено.'},409)}
}
