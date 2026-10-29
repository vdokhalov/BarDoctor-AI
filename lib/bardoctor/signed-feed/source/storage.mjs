import {createHash}from'node:crypto';
import {pullVerifiedFeed}from'./reader.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const PREFIX='calendar-sources/signed-holidays-v2/';
const CURRENT=PREFIX+'current.json';
function advance(next,old){
 if(!old)return;
 if(next.policyId!==old.policyId)throw Error('TRUST_POLICY_CHANGED');
 if(next.signedAt<old.signedAt)throw Error('ROLLBACK');
 if(next.signedAt===old.signedAt&&(next.digest!==old.digest||next.invocation!==old.invocation))throw Error('REVISION_CONFLICT');
}
async function state(bucket){
 const pointerObject=await bucket.get(CURRENT);if(!pointerObject)return null;
 const pointer=JSON.parse(await pointerObject.text());
 if(!/^[a-f0-9]{64}$/.test(pointer.objectHash))throw Error('POINTER_INVALID');
 const object=await bucket.get(PREFIX+'versions/'+pointer.objectHash+'.json');
 if(!object)throw Error('VERSION_MISSING');const text=await object.text();
 if(text.length>2_000_000||digest(text)!==pointer.objectHash)throw Error('VERSION_INTEGRITY');
 const snapshot=JSON.parse(text);
 if(JSON.stringify(snapshot.checkpoint)!==JSON.stringify(pointer.checkpoint)||digest(snapshot.text)!==pointer.checkpoint.digest)throw Error('CHECKPOINT_INTEGRITY');
 return {etag:pointerObject.etag,pointer,snapshot};
}
// Internal state transition, receives a candidate from cryptographic verifier, never request data.
// Exported for isolated fault/concurrency tests. Public integration exposes updateFromSource only.
export async function commitCandidate(bucket,candidate){
 const {status,...checkpoint}=candidate.checkpoint;
 const bytes=JSON.stringify({text:candidate.text,bundle:candidate.bundle,checkpoint});
 if(bytes.length>2_000_000||digest(candidate.text)!==checkpoint.digest)throw Error('CANDIDATE_INTEGRITY');
 const objectHash=digest(bytes),key=PREFIX+'versions/'+objectHash+'.json';
 for(let i=0;i<4;i++){
  const current=await state(bucket);advance(checkpoint,current?.pointer.checkpoint);
  if(current?.pointer.checkpoint.digest===checkpoint.digest&&current.pointer.checkpoint.invocation===checkpoint.invocation)return {status:'unchanged',checkpoint:current.pointer.checkpoint};
  const prior=await bucket.get(key);
  if(prior){if(await prior.text()!==bytes)throw Error('VERSION_CONFLICT')}
  else{const saved=await bucket.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'}});if(!saved){const concurrent=await bucket.get(key);if(!concurrent||await concurrent.text()!==bytes)throw Error('VERSION_CONFLICT')}}
  const pointer=JSON.stringify({objectHash,checkpoint});
  // Atomic pointer owns BOTH feed identity and antirollback checkpoint. Never update them separately.
  try{
   const saved=await bucket.put(CURRENT,pointer,{onlyIf:current?{etagMatches:current.etag}:{etagDoesNotMatch:'*'}});
   if(saved)return {status:'stored',checkpoint};
  }catch(error){
   // Lost response may mean CAS committed; read before reporting failure or retrying.
   const observed=await state(bucket);
   if(observed?.pointer.objectHash===objectHash)return {status:'stored',checkpoint,reconciled:true};
   throw error;
  }
 }
 throw Error('UPDATE_CONFLICT');
}
export async function readCurrent(bucket,validate){const current=await state(bucket);if(!current)return null;return {feed:await validate(JSON.parse(current.snapshot.text)),checkpoint:current.pointer.checkpoint};}
export async function updateFromSource(bucket,args){const candidate=await pullVerifiedFeed(args);return commitCandidate(bucket,candidate);}
