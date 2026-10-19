import {authenticateRequest,unauthorized} from '../../../lib/bardoctor/auth';
import {hasPermission,canManagePosPrivilegedAction} from '../../../lib/bardoctor/access-control';
import {readJsonRequest} from '../../../lib/bardoctor/http';
import {withStoreCasRetries} from '../../../lib/bardoctor/store-cas';
import {posMembershipGuard} from '../../../lib/bardoctor/pos-auth-guard';
import {loadPrint,savePrint,publicPrint,hash,secret} from '../../../lib/bardoctor/print-cloud';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(r:Request){return handle(r,false)}
export async function POST(r:Request){return withStoreCasRetries(r,r=>handle(r,true))}
async function handle(r:Request,write:boolean):Promise<Response>{
 const a=await authenticateRequest(r);if(!a)return unauthorized();if(!hasPermission(a,'sales.create')||!canManagePosPrivilegedAction(a))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const c=await loadPrint(a.id,a.venueId);
 if(!write)return reply({ok:true,...publicPrint(c.state)});
 const parsed=await readJsonRequest<{action:string;venueId:number;expectedRevision:number;printerId?:string;operationId?:string}>(r,{maxBytes:4096});if(!parsed.ok)return parsed.response;const b=parsed.data;
 if(b.action==='test'&&b.operationId&&c.state.jobs.some(j=>j.payload.id==='test:'+b.operationId&&j.payload.printerId===b.printerId))return reply({ok:true,...publicPrint(c.state)});
 if(b.venueId!==a.venueId||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||(b.action==='pair'?b.expectedRevision!==c.state.revision:b.expectedRevision>c.state.revision))return reply({ok:false,error:'Заведение или настройка изменились. Обновите экран.'},409);
 let pairing;
 if(b.action==='pair'){
  if(c.state.node)return reply({ok:false,error:'Узел уже зарегистрирован. Повторное сопряжение после потери базы требует разбора очереди; не создавайте новый узел для повтора.'},409);
  const code=secret();c.state.pair={hash:await hash(code),expires:new Date(Date.now()+10*60_000).toISOString()};
  if(c.snapshots[0].dataJson===null)c.state.baseline=c.tickets.map(t=>t.id);
  pairing={code,accountId:a.id,venueId:a.venueId,expires:c.state.pair.expires};
 }else if(b.action==='test'){
  if(!c.state.node||c.state.node.revoked||c.state.node.expires<new Date().toISOString()||!c.state.node.printers.some(p=>p.id===b.printerId)||typeof b.operationId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.operationId))return reply({ok:false,error:'Выберите принтер активного узла.'},409);
  c.state.jobs.push({status:'queued',payload:{id:'test:'+b.operationId,venueId:a.venueId,orderId:'TEST',tableNumber:'TEST',sectionId:'TEST',sectionName:'Проверка принтера',printerId:b.printerId!,routeRevision:0,kind:'TEST',originalTicketId:null,reason:null,createdAt:new Date().toISOString(),lines:[{name:'Тест АБВГД абвгд Ёё 123',quantity:1}]}});
 }else if(b.action==='revoke'){
  if(c.state.node)c.state.node.revoked=true;delete c.state.pair;
  for(const j of c.state.jobs)if(j.status==='sending'){j.status='outcome_unknown';j.detail='Доступ отозван во время отправки; проверьте устройство'}
 }else return reply({ok:false,code:'ACTION_INVALID'},400);
 const now=new Date().toISOString();await savePrint(c,[posMembershipGuard(c.db,a,now),c.db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,actor_name,actor_role,created_at) VALUES(?,?,?,?,?,?,?)').bind(a.id,c.key,'print.'+b.action,String(a.venueId),a.firstName||'',a.role,now)]);
 return reply({ok:true,...publicPrint(c.state),pairing});
}
