import {authorizeQaBackup,run,backupFail,type BackupBucket,type QaScope} from './qa-pos-backup';
import {loadManifest,readPart} from './qa-chunked-backup';
/** One authorized request, backpressure, one verified part in memory; no new access tokens. */
export async function streamQaBackup(db:D1Database,bucket:BackupBucket,s:QaScope,runId:string,expectedHash:string){return streamBackupParts(db,bucket,s,runId,expectedHash,{authorize:authorizeQaBackup,run,loadManifest,readPart,filename:'qa3389-business-backup.ndjson'});}
type DownloadPolicy={authorize:typeof authorizeQaBackup;run:(db:D1Database,expected?:string)=>Promise<any>;loadManifest:typeof loadManifest;readPart:typeof readPart;filename:string};
export async function streamBackupParts(db:D1Database,bucket:BackupBucket,s:QaScope,runId:string,expectedHash:string,policy:DownloadPolicy){
 const {authorize:authorizeQaBackup,run,loadManifest,readPart}=policy;
 if(!/^[a-zA-Z0-9.-]+$/.test(policy.filename))throw Error('BACKUP_FILENAME');
 const data=await loadManifest(db,bucket,s);
 if(data.manifest.runId!==runId||data.hash!==expectedHash)backupFail('RUN_CHANGED');
 let index=-1,cancelled=false;const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({
  async pull(controller){if(cancelled)return;try{
   await authorizeQaBackup(db,s);const current=await run(db,runId);
   if(current?.backup_hash!==expectedHash||current.backup_key!==data.key)backupFail('RUN_CHANGED');
   if(index<0){controller.enqueue(encoder.encode(JSON.stringify({manifest:data.manifest,hash:data.hash})+'\n'));index=0;return}
   if(index===data.manifest.parts.length){controller.close();return}
   const part=await readPart(bucket,data.manifest.parts[index]);if(cancelled)return;
   controller.enqueue(encoder.encode('{"index":'+index+',"part":'+part+'}\n'));index++;
  }catch{cancelled=true;controller.error(new Error('QA_POS_BACKUP_DOWNLOAD_INTERRUPTED'))}},
  cancel(){cancelled=true},
 },{highWaterMark:0});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Content-Disposition':'attachment; filename="'+policy.filename+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
