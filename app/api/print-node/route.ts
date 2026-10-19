import {getD1} from '../../../db';
import {readJsonRequest} from '../../../lib/bardoctor/http';
import {withStoreCasRetries} from '../../../lib/bardoctor/store-cas';
import {loadPrint,savePrint,hash,archivedJob,type PrintJob} from '../../../lib/bardoctor/print-cloud';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const validSecret=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export async function POST(request:Request){return withStoreCasRetries(request,command)}
async function command(request:Request):Promise<Response>{
 const p=await readJsonRequest<{action:string;accountId:number;venueId:number;code?:string;token?:string;printers?:{id:string;name:string}[];jobId?:string;status?:string;detail?:string}>(request,{maxBytes:16000});if(!p.ok)return p.response;const b=p.data;
 if(!Number.isSafeInteger(b.accountId)||b.accountId<=0||!Number.isSafeInteger(b.venueId)||b.venueId<=0)return reply({ok:false},400);
 const venue=await getD1().prepare("SELECT id FROM venues WHERE id=? AND data_account_id=? AND status='active'").bind(b.venueId,b.accountId).first();if(!venue)return reply({ok:false},401);
 const c=await loadPrint(b.accountId,b.venueId),s=c.state,now=new Date().toISOString();
 if(b.action==='pair'){
  if(!validSecret(b.code)||!validSecret(b.token)||!s.pair||s.pair.hash!==await hash(b.code)||s.pair.expires<now)return reply({ok:false},401);
  if(s.retiredTokenHash===await hash(b.token))return reply({ok:false,error:'A replacement requires a new credential'},409);
  if(s.node){return !s.node.revoked&&s.node.hash===await hash(b.token)?reply({ok:true,nodeId:s.node.id}):reply({ok:false},409)}
  if(!Array.isArray(b.printers)||!b.printers.length||b.printers.length>50||new Set(b.printers.map(p=>p.id)).size!==b.printers.length||b.printers.some(p=>![p.id,p.name].every(v=>typeof v==='string'&&v.length>0&&v.length<=120&&!/[\x00-\x1f]/.test(v))))return reply({ok:false},400);
  s.node={id:crypto.randomUUID(),hash:await hash(b.token),expires:new Date(Date.now()+90*86400000).toISOString(),revoked:false,printers:b.printers,lastSeen:now};await savePrint(c);return reply({ok:true,nodeId:s.node.id});
 }
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!validSecret(token)||!s.node||s.node.revoked||s.node.expires<now||s.node.hash!==await hash(token))return reply({ok:false},401);
 s.node.lastSeen=now;
 if(b.action==='poll'){
  const printers=new Set(s.node.printers.map(p=>p.id));
  // Leases never expire into an automatic resend. The same paired node owns them until reviewed.
  for(const j of s.jobs)if(j.status==='queued'&&j.payload.printerId&&printers.has(j.payload.printerId)){
   const parent=j.payload.originalTicketId?(s.jobs.find(p=>p.payload.id===j.payload.originalTicketId)??await archivedJob(c,j.payload.originalTicketId)):null;
   if(j.payload.originalTicketId&&(!parent||parent.nodeId&&parent.nodeId!==s.node.id||['replacement_review','blocked_history'].includes(parent.status))){j.status='replacement_review';j.detail='Исходное задание другого узла требует сверки';continue}
   j.status='leased';j.nodeId=s.node.id;
  }
  const own=s.jobs.filter(j=>j.nodeId===s.node!.id),dependencies:PrintJob[]=[];
  for(const j of own)if(j.payload.originalTicketId&&!own.some(p=>p.payload.id===j.payload.originalTicketId)){
   const parent=await archivedJob(c,j.payload.originalTicketId);if(parent&&parent.nodeId===s.node.id&&!dependencies.some(p=>p.payload.id===parent.payload.id))dependencies.push(parent);
  }
  await savePrint(c);return reply({ok:true,nodeId:s.node.id,jobs:[...dependencies,...own].map(j=>({payload:j.payload,status:j.status}))});
 }
 if(typeof b.jobId!=='string'||b.jobId.length>160)return reply({ok:false},400);
 const active=s.jobs.find(j=>j.payload.id===b.jobId&&j.nodeId===s.node!.id),job=active??await archivedJob(c,b.jobId);if(!job||job.nodeId!==s.node.id)return reply({ok:false},404);
 if(b.action==='start'){
  const earlier=s.jobs.slice(0,s.jobs.indexOf(job)).some(j=>j.payload.printerId===job.payload.printerId&&!['accepted_by_transport','operator_confirmed','operator_resolved'].includes(j.status));
  const go=!!active&&!earlier&&['leased','failed_before_send'].includes(job.status);if(go)job.status='sending';await savePrint(c);return reply({ok:true,go,status:job.status});
 }
 if(b.action==='ack'){
  const allowed=['accepted_by_transport','failed_before_send','outcome_unknown','operator_confirmed','operator_resolved'];
  if(!allowed.includes(b.status??'')||typeof b.detail!=='string'||b.detail.length>500)return reply({ok:false},400);
  if(job.status!==b.status){
   const transition=job.status==='sending'||job.status==='leased'&&['failed_before_send','outcome_unknown'].includes(b.status!)||['outcome_unknown','accepted_by_transport'].includes(job.status)&&['operator_confirmed','operator_resolved'].includes(b.status!);
   if(!transition)return reply({ok:false,error:'PRINT_STATUS_CONFLICT'},409);
   job.status=b.status!;job.detail=b.detail;
  }
  if(!active)c.archives.set(job.payload.id,job);await savePrint(c);return reply({ok:true});
 }
 return reply({ok:false},400);
}
