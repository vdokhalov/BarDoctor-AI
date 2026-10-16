import {env} from 'cloudflare:workers';
import {getD1} from '../../../../db';
import {authenticateReadOnlyRequest,unauthorized} from '../../../../lib/bardoctor/auth';
import {readJsonRequest} from '../../../../lib/bardoctor/http';
import {prepareJournalMigration,stepJournalMigration,abortJournalMigration,refreshJournalBackup,migrationStatus,type BackupStore} from '../../../../lib/bardoctor/journal-migration-runner';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function scope(request:Request){const account=await authenticateReadOnlyRequest(request);if(!account)return null;return {accountId:account.id,venueId:account.venueId,actorId:account.actorAccountId};}
function error(e:unknown){if(/JOURNAL_MIGRATION_|STOCK_JOURNAL_|SALES_EVENT_|persisted domain state changed|NOT NULL constraint failed/.test(String(e)))return reply({ok:false,code:String(e instanceof Error?e.message:e),pausedMayRemain:true,instruction:'Read status; resume the same run. Never restore old JSON after cutover.'},409);throw e;}
export async function GET(request:Request){const selected=await scope(request);if(!selected)return unauthorized();try{return reply({ok:true,...await migrationStatus(getD1(),selected)});}catch(e){return error(e);}}
export async function POST(request:Request){
 const selected=await scope(request);if(!selected)return unauthorized();
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({ok:false,code:'ORIGIN_REQUIRED'},403);
 const parsed=await readJsonRequest<{venueId:number;action:string;confirmation:string;runId?:string}>(request,{maxBytes:4096});if(!parsed.ok)return parsed.response;const body=parsed.data;
 if(body.venueId!==3389||selected.venueId!==3389||body.confirmation!=='QA3389_JOURNAL_CUTOVER')return reply({ok:false,code:'JOURNAL_MIGRATION_SCOPE_FORBIDDEN'},403);
 const db=getD1(),bucket=(env as unknown as {BUCKET:BackupStore}).BUCKET;
 try{
  if(body.action==='prepare')return reply({ok:true,...await prepareJournalMigration(db,bucket,selected)});
  if(!body.runId||body.runId.length>64)return reply({ok:false,code:'RUN_ID_REQUIRED'},400);
  if(body.action==='step')return reply({ok:true,...await stepJournalMigration(db,bucket,selected,body.runId)});
  if(body.action==='refresh')return reply({ok:true,...await refreshJournalBackup(db,bucket,selected,body.runId)});
  if(body.action==='abort')return reply({ok:true,...await abortJournalMigration(db,selected,body.runId)});
  return reply({ok:false,code:'ACTION_INVALID'},400);
 }catch(e){return error(e);}
}
