import {authenticateRequest,unauthorized} from '../../../lib/bardoctor/auth';
import {hasPermission,canManagePosPrivilegedAction} from '../../../lib/bardoctor/access-control';
import {readJsonRequest} from '../../../lib/bardoctor/http';
import {withStoreCasRetries} from '../../../lib/bardoctor/store-cas';
import {posMembershipGuard} from '../../../lib/bardoctor/pos-auth-guard';
import {loadPrint,savePrint,publicPrint,hash,secret,archivedJob,archivePrefix,printJobView,printHasRoom} from '../../../lib/bardoctor/print-cloud';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(r:Request){return handle(r,false)}
export async function POST(r:Request){return withStoreCasRetries(r,r=>handle(r,true))}
async function handle(r:Request,write:boolean):Promise<Response>{
 const a=await authenticateRequest(r);if(!a)return unauthorized();if(!hasPermission(a,'sales.create')||!canManagePosPrivilegedAction(a))return reply({ok:false,code:'ACCESS_DENIED'},403);
 const c=await loadPrint(a.id,a.venueId);
 if(!write){
  const query=new URL(r.url).searchParams;
  if(query.get('archive')==='1'){
   const prefix=archivePrefix(a.venueId),cursor=query.get('cursor')||prefix;if(!cursor.startsWith(prefix)||cursor.length>600)return reply({ok:false},400);
   const rows=(await c.db.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<? AND store_key>? ORDER BY store_key LIMIT 51').bind(a.id,prefix,prefix+'\uffff',cursor).all<{store_key:string;data_json:string}>()).results;
   return reply({ok:true,jobs:rows.slice(0,50).map(row=>printJobView(JSON.parse(row.data_json))),nextCursor:rows.length>50?rows[49].store_key:null});
  }
  return reply({ok:true,...publicPrint(c.state)});
 }
 const parsed=await readJsonRequest<{action:string;venueId:number;expectedRevision:number;printerId?:string;operationId?:string;nodeId?:string;reason?:string;jobId?:string;acknowledgeUncertain?:boolean}>(r,{maxBytes:4096});if(!parsed.ok)return parsed.response;const b=parsed.data;
 if(b.action==='test'&&b.operationId){const prior=c.state.jobs.find(j=>j.payload.id==='test:'+b.operationId)??await archivedJob(c,'test:'+b.operationId);if(prior)return prior.payload.printerId===b.printerId?reply({ok:true,...publicPrint(c.state)}):reply({ok:false,code:'IDEMPOTENCY_CONFLICT'},409);}
 if(b.venueId!==a.venueId||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||(b.action==='pair'?b.expectedRevision!==c.state.revision:b.expectedRevision>c.state.revision))return reply({ok:false,error:'Заведение или настройка изменились. Обновите экран.'},409);
 let pairing;
 if(b.action==='replace'){
  if(!c.state.node||b.nodeId!==c.state.node.id||b.acknowledgeUncertain!==true||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>500)return reply({ok:false,error:'Подтвердите замену выбранного узла и укажите причину. Выданные ему задания не будут перепечатаны.'},409);
  for(const job of c.state.jobs)if(job.nodeId||['sending','leased','outcome_unknown','failed_before_send'].includes(job.status)){job.status='replacement_review';job.detail='Замена узла: '+b.reason;}
  c.state.retiredTokenHash=c.state.node.hash;delete c.state.node;delete c.state.pair;
  const code=secret();c.state.pair={hash:await hash(code),expires:new Date(Date.now()+10*60_000).toISOString()};pairing={code,accountId:a.id,venueId:a.venueId,expires:c.state.pair.expires,replacement:true};
 }else if(b.action==='resolve'){
  const job=c.state.jobs.find(j=>j.payload.id===b.jobId);
  if(!job||!['replacement_review','blocked_history','unconfigured','outcome_unknown'].includes(job.status)||b.acknowledgeUncertain!==true||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>500)return reply({ok:false,error:'Нужна явная сверка задания и описание ручной обработки.'},409);
  if(job.status==='outcome_unknown'&&c.state.node&&!c.state.node.revoked)return reply({ok:false,error:'Сначала остановите и отзовите старый узел, чтобы он не продолжил обработку.'},409);
  job.status='operator_resolved';job.detail='Сверено и обработано вручную; НЕ перепечатывать. '+b.reason;job.reviewedBy=a.actorAccountId;job.reviewedAt=new Date().toISOString();
 }else if(b.action==='pair'){
  if(c.state.node)return reply({ok:false,error:'Для другого компьютера используйте явную замену узла.'},409);
  const code=secret();c.state.pair={hash:await hash(code),expires:new Date(Date.now()+10*60_000).toISOString()};
  if(c.snapshots[0].dataJson===null)c.state.baseline=c.tickets.map(t=>t.id);
  pairing={code,accountId:a.id,venueId:a.venueId,expires:c.state.pair.expires};
 }else if(b.action==='test'){
  if(!c.state.node||c.state.node.revoked||c.state.node.expires<new Date().toISOString()||!c.state.node.printers.some(p=>p.id===b.printerId)||typeof b.operationId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.operationId))return reply({ok:false,error:'Выберите принтер активного узла.'},409);
  const testJob={status:'queued',payload:{id:'test:'+b.operationId,venueId:a.venueId,orderId:'TEST',tableNumber:'TEST',sectionId:'TEST',sectionName:'Проверка принтера',printerId:b.printerId!,routeRevision:0,kind:'TEST',originalTicketId:null,reason:null,createdAt:new Date().toISOString(),lines:[{name:'Тест АБВГД абвгд Ёё 123',quantity:1}]}};if(!printHasRoom(c.state,testJob))return reply({ok:false,error:'Активная очередь заполнена. Завершите отправки или сверку перед новым тестом.'},409);c.state.jobs.push(testJob);
 }else if(b.action==='revoke'){
  if(c.state.node)c.state.node.revoked=true;delete c.state.pair;
  for(const j of c.state.jobs)if(j.status==='sending'){j.status='outcome_unknown';j.detail='Доступ отозван во время отправки; проверьте устройство'}
 }else return reply({ok:false,code:'ACTION_INVALID'},400);
 const now=new Date().toISOString();await savePrint(c,[posMembershipGuard(c.db,a,now),c.db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,actor_name,actor_role,created_at) VALUES(?,?,?,?,?,?,?)').bind(a.id,c.key,'print.'+b.action,String(b.jobId??b.nodeId??a.venueId),a.firstName||'',a.role,now)]);
 return reply({ok:true,...publicPrint(c.state),pairing});
}
