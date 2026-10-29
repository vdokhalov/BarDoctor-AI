import {discoverRelease,downloadReleaseAsset}from'./release-source.mjs';
import {verifySignedVersion}from'./verifier.mjs';
async function download(url,fetcher){
 const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('SOURCE_HTTP_'+response.status);if(!response.body)throw Error('SOURCE_EMPTY');
 const reader=response.body.getReader(),parts=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1_000_000){await reader.cancel();throw Error('SOURCE_SIZE')}parts.push(value)}
 const all=new Uint8Array(size);let i=0;for(const p of parts){all.set(p,i);i+=p.length}return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
// source/trust/checkpoint are server-owned; never take them from visitor query/body.
// Returns a candidate only. Caller must atomically persist checkpoint+feed after a successful CAS, never before verification.
export async function pullVerifiedFeed({source,policy,root,previous=null,validate,fetcher=fetch,now=Date.now()}){
 const discovered=source.releaseFeed===true;
 if(discovered)source=await discoverRelease(policy.repository,fetcher);
 const prefix=`https://raw.githubusercontent.com/${policy.repository}/`;
 if(!discovered&&(!source.payloadUrl.startsWith(prefix)||!source.bundleUrl.startsWith(prefix)))throw Error('SOURCE_URL');
 const path=source.payloadUrl.slice(prefix.length),bundlePath=source.bundleUrl.slice(prefix.length);
 if(!discovered&&(!/^[a-f0-9]{40}\/qa\/holiday-source-\d{8}\.json$/.test(path)||bundlePath!==path.replace(/\.json$/,'.sigstore.json')))throw Error('SOURCE_URL');
 const load=discovered?downloadReleaseAsset:download;
 const text=await load(source.payloadUrl,fetcher),bundle=JSON.parse(await load(source.bundleUrl,fetcher));
 const candidate=verifySignedVersion(new TextEncoder().encode(text),bundle,policy,root,previous,now);
 const feed=await validate(JSON.parse(text));
 return {feed,checkpoint:candidate,text,bundle};
}
