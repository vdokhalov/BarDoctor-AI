import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {bundleFromJSON} from '@sigstore/bundle';
import {Verifier,toSignedEntity,toTrustMaterial} from '@sigstore/verify';
import {TrustedRoot} from '@sigstore/protobuf-specs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Error(code)};
function oid(identity,n){
 const values=(identity.oids??[]).filter(x=>x.oid?.id.join('.')===`1.3.6.1.4.1.57264.1.${n}`);
 if(values.length!==1)fail('IDENTITY_OID');
 const b=values[0].value;if(b[0]!==12)fail('IDENTITY_DER');let len=b[1],offset=2;
 if(len&128){const size=len&127;if(size<1||size>2||b[2]===0)fail('IDENTITY_DER');len=0;for(let i=0;i<size;i++)len=len*256+b[2+i];offset+=size;if(len<128)fail('IDENTITY_DER')}
 if(offset+len!==b.length)fail('IDENTITY_DER');return new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(offset));
}
export function verifySignedVersion(payload,bundleJSON,policy,trustedRoot,previous=null,now=Date.now()){
 const bytes=Buffer.from(payload);if(bytes.length>1_000_000||Buffer.byteLength(JSON.stringify(bundleJSON))>250_000)fail('INPUT_SIZE');
 const producer=policy.immutableProducer;
 if(producer&&(!/^\.github\/workflows\/[a-zA-Z0-9_-]+\.ya?ml$/.test(producer.workflow)||!/^[a-f0-9]{40}$/.test(producer.sha)))fail('TRUST_POLICY');
 if(!producer&&(!Array.isArray(policy.allowedSourceSHAs)||!policy.allowedSourceSHAs.length||policy.allowedSourceSHAs.some(x=>!/^[a-f0-9]{40}$/.test(x))))fail('TRUST_POLICY');
 if(!Number.isFinite(policy.notBefore)||!Number.isFinite(policy.maxAgeMs)||policy.maxAgeMs<=0)fail('TRUST_POLICY');
 const bundle=bundleFromJSON(bundleJSON);
 if(bundle.content.$case!=='dsseEnvelope'||bundle.content.dsseEnvelope.payloadType!=='application/vnd.in-toto+json')fail('ATTESTATION_TYPE');
 // Library verifies certificate chain, SCT, Rekor inclusion/checkpoint and DSSE signature, each threshold >=1.
 const signer=new Verifier(toTrustMaterial(TrustedRoot.fromJSON(trustedRoot)),{ctlogThreshold:1,tlogThreshold:1,timestampThreshold:1}).verify(toSignedEntity(bundle));
 const id=signer.identity;if(!id)fail('CERTIFICATE_REQUIRED');
 const repo=`https://github.com/${policy.repository}`,workflow=`${repo}/${policy.workflow}@${policy.ref}`,signerWorkflow=producer?`${repo}/${producer.workflow}@${producer.sha}`:workflow;
 if(id.subjectAlternativeName!==signerWorkflow||id.extensions?.issuer!=='https://token.actions.githubusercontent.com')fail('SIGNER_IDENTITY');
 const expected={9:signerWorkflow,11:'github-hosted',12:repo,14:policy.ref,15:policy.repositoryId,16:`https://github.com/${policy.repository.split('/')[0]}`,17:policy.ownerId,18:workflow,22:'public',24:`repo:${policy.repository}:ref:${policy.ref}`};
 for(const [n,v]of Object.entries(expected))if(oid(id,n)!==v)fail('SOURCE_IDENTITY');
 const sourceSHA=oid(id,13);if(!/^[a-f0-9]{40}$/.test(sourceSHA)||oid(id,19)!==sourceSHA)fail('SOURCE_REVISION');
 if(producer){if(oid(id,10)!==producer.sha)fail('PRODUCER_REVISION')}else if(!policy.allowedSourceSHAs.includes(sourceSHA)||oid(id,10)!==sourceSHA)fail('SOURCE_REVISION');
 const trigger=oid(id,20);if(!['workflow_dispatch','schedule'].includes(trigger))fail('SOURCE_TRIGGER');
 const invocation=oid(id,21),prefix=`${repo}/actions/runs/`;if(!invocation.startsWith(prefix)||!/^\d+\/attempts\/[1-9]\d*$/.test(invocation.slice(prefix.length)))fail('RUN_IDENTITY');
 const statement=JSON.parse(Buffer.from(bundle.content.dsseEnvelope.payload).toString('utf8'));
 const digest=sha(bytes);if(statement._type!=='https://in-toto.io/Statement/v1'||statement.predicateType!=='https://slsa.dev/provenance/v1'||statement.subject?.length!==1||statement.subject[0].digest?.sha256!==digest)fail('ARTIFACT_DIGEST');
 const def=statement.predicate?.buildDefinition,run=statement.predicate?.runDetails;
 if(def?.buildType!=='https://actions.github.io/buildtypes/workflow/v1'||def.externalParameters?.workflow?.repository!==repo||def.externalParameters?.workflow?.path!==policy.workflow||def.externalParameters?.workflow?.ref!==policy.ref||run?.builder?.id!==signerWorkflow||run?.metadata?.invocationId!==invocation)fail('PROVENANCE_MISMATCH');
 const gh=def.internalParameters?.github;if(gh?.repository_id!==policy.repositoryId||gh?.repository_owner_id!==policy.ownerId||gh?.runner_environment!=='github-hosted'||gh?.event_name!==trigger)fail('PROVENANCE_MISMATCH');
 if(!def.resolvedDependencies?.some(x=>x.uri===`git+${repo}@${policy.ref}`&&x.digest?.gitCommit===sourceSHA))fail('PROVENANCE_REVISION');
 // All included timestamps were cryptographically checked above. Reject stale/future/unordered versions.
 const times=bundle.verificationMaterial.tlogEntries.map(e=>Number(e.integratedTime)*1000);
 if(!times.length||times.some(t=>!Number.isSafeInteger(t)||t<policy.notBefore||t>now+30000||now-t>policy.maxAgeMs))fail('ATTESTATION_TIME');
 const signedAt=Math.min(...times),policyId=sha(Buffer.from(JSON.stringify(policy)));
 if(previous){
  if(previous.policyId!==policyId)fail('TRUST_POLICY_CHANGED');
  if(signedAt<previous.signedAt)fail('ROLLBACK');
  if(signedAt===previous.signedAt&&(digest!==previous.digest||invocation!==previous.invocation))fail('REVISION_CONFLICT');
 }
 return {digest,sourceSHA,invocation,signedAt,policyId,status:previous?.digest===digest&&previous?.invocation===invocation?'unchanged':'verified'};
}
