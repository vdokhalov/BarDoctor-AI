import {env} from 'cloudflare:workers';
import {getD1} from '../../../db';
import {authenticateReadOnlyRequest,unauthorized} from '../../../lib/bardoctor/auth';
import {readJsonRequest} from '../../../lib/bardoctor/http';
import {businessBackup,businessBackupPolicy} from '../../../lib/bardoctor/business-backup';
import {streamBackupParts} from '../../../lib/bardoctor/qa-backup-download';
import type {BackupBucket} from '../../../lib/bardoctor/qa-pos-backup';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const bucket=()=>(env as unknown as {BUCKET:BackupBucket}).BUCKET;
async function context(request:Request){
 const account=await authenticateReadOnlyRequest(request);
 if(!account)return null;
 const scope={accountId:account.id,venueId:account.venueId,actorId:account.actorAccountId};
 const policy=businessBackupPolicy(scope);await policy.authorizeQaBackup(getD1(),scope);
 return {scope,policy,engine:businessBackup(scope)};
}
function error(value:unknown){return reply({ok:false,code:value instanceof Error?value.message:'BACKUP_FAILED',instruction:'Read status before retrying. Expired or aborted captures cannot become complete; start a new capture. Existing business data is never restored by this API.'},/OWNER_OR_ISOLATION|SCOPE_FORBIDDEN/.test(String(value))?403:409);}
export async function GET(request:Request){
 try{
  const c=await context(request);if(!c)return unauthorized();
  const {scope,engine,policy}=c,params=new URL(request.url).searchParams;
  if(params.has('venueId')&&Number(params.get('venueId'))!==scope.venueId||params.has('accountId')&&Number(params.get('accountId'))!==scope.accountId)return reply({ok:false,code:'SCOPE_MISMATCH'},403);
  if(params.get('preflight')==='1')return reply({ok:true,...await engine.qaBackupStatus(getD1(),scope),preflight:await engine.qaBackupPreflight(getD1(),scope,bucket())});
  if(params.get('attachment')==='1'){
   const runId=params.get('runId')??'',hash=params.get('hash')??'';
   if(!/^[a-zA-Z0-9-]{1,64}$/.test(runId)||!/^[a-f0-9]{64}$/.test(hash))return reply({ok:false,code:'RUN_HASH_REQUIRED'},400);
   return streamBackupParts(getD1(),bucket(),scope,runId,hash,{authorize:policy.authorizeQaBackup,run:policy.run,loadManifest:engine.loadManifest,readPart:engine.readPart,filename:'venue-'+scope.venueId+'-business-backup.ndjson'});
  }
  if(params.get('download')==='1'){
   const data=await engine.loadManifest(getD1(),bucket(),scope),part=params.get('part');
   if(part===null)return reply({ok:true,...data});
   if(params.get('hash')!==data.hash)return reply({ok:false,code:'RUN_CHANGED'},409);
   const index=Number(part);if(!Number.isSafeInteger(index)||index<0||index>=data.manifest.parts.length)return reply({ok:false,code:'PART_INDEX'},400);
   return new Response(await engine.readPart(bucket(),data.manifest.parts[index]),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
  }
  return reply({ok:true,...await engine.qaBackupStatus(getD1(),scope)});
 }catch(e){return error(e);}
}
export async function POST(request:Request){
 try{
  const c=await context(request);if(!c)return unauthorized();
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,code:'ORIGIN_REQUIRED'},403);
  const parsed=await readJsonRequest<{venueId:number;accountId:number;confirmation:string;action:string;runId?:string}>(request,{maxBytes:8000});if(!parsed.ok)return parsed.response;
  const body=parsed.data,{scope,engine}=c;
  if(body.venueId!==scope.venueId||body.accountId!==scope.accountId||body.confirmation!=='CURRENT_VENUE_BUSINESS_BACKUP')return reply({ok:false,code:'SCOPE_REQUIRED'},403);
  if(body.action==='prepare')return reply({ok:true,...await engine.prepareQaBackup(getD1(),bucket(),scope)});
  if(!body.runId||!/^[a-zA-Z0-9-]{1,64}$/.test(body.runId))return reply({ok:false,code:'RUN_ID_REQUIRED'},400);
  if(body.action==='resume')return reply({ok:true,...await engine.resumeQaBackup(getD1(),bucket(),scope,body.runId)});
  if(body.action==='abort')return reply({ok:true,...await engine.abortQaBackup(getD1(),scope,body.runId)});
  return reply({ok:false,code:'ACTION_INVALID'},400);
 }catch(e){return error(e);}
}
