import {send,endpoint,beforeSend} from './transports.mjs';
export function cloudClient(config,token,fetcher=fetch){
 const origin=new URL(config.site);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Site must be an HTTPS origin');
 return async(action,body={})=>{const response=await fetcher(new URL('/api/print-node',origin),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,accountId:config.accountId,venueId:config.venueId,...body}),signal:AbortSignal.timeout(20000)});if(!response.ok){const e=Error('Print API refused request: '+response.status);e.status=response.status;throw e}return response.json()};
}
/** Durable local state is authoritative about whether bytes may already have been sent. */
export async function syncOnce(q,config,api,transport=send){
 const response=await api('poll');const jobs=response.jobs;
 q.import({version:1,venueId:q.venueId,tickets:jobs.map(j=>j.payload)});
 for(const remote of jobs){const local=q.get(remote.payload.id);
  if(local.status==='pending'&&remote.status!=='leased'&&remote.status!=='failed_before_send')q.finish(local.id,remote.status==='sending'?'outcome_unknown':remote.status,'Restored from cloud; no resend');
 }
 // Persist acknowledgements independently from the bounded cloud active window.
 q.db.exec('CREATE TABLE IF NOT EXISTS cloud_ack(id TEXT PRIMARY KEY,status TEXT NOT NULL)');
 async function acknowledge(){for(const local of q.list()){
  if(local.copy_of||!['accepted_by_transport','failed_before_send','outcome_unknown','operator_confirmed','operator_resolved'].includes(local.status))continue;
  const last=q.db.prepare('SELECT status FROM cloud_ack WHERE id=?').get(local.id);if(last?.status===local.status)continue;
  await api('ack',{jobId:local.id,status:local.status,detail:String(local.detail??'').slice(0,500)});
  q.db.prepare('INSERT INTO cloud_ack(id,status) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status').run(local.id,local.status);
 }}
 // Never reconstruct a lost physical route from today's mapping.
 for(const remote of jobs){const local=q.get(remote.payload.id),parentId=remote.payload.originalTicketId;if(local.status==='pending'&&parentId&&!q.get(parentId).endpoint)q.finish(local.id,'outcome_unknown','Original local route is unavailable; operator review required');}

 await acknowledge();
 while(await q.runOne(id=>endpoint(config.printers?.[id]),async(p,t,copy)=>{
  // Copies are explicit local operations, never fetched again as original jobs.
  if(!copy){const grant=await api('start',{jobId:t.id});if(!grant.go)throw (grant.status==='leased'?beforeSend('Cloud predecessor unresolved; review queue'):Error('Send permission already consumed; inspect previous outcome'))}
  else {await api('poll')} // revocation check immediately before explicit local copy
  return transport(p,t,copy);
 })){await acknowledge()}
 await acknowledge();
 return q.list().map(j=>({id:j.id,status:j.status,detail:j.detail}));
}
