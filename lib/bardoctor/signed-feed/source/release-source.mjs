async function bounded(response,max=1_000_000){if(!response.body)throw Error('SOURCE_EMPTY');const reader=response.body.getReader();const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('SOURCE_SIZE')}chunks.push(value)}const out=new Uint8Array(size);let i=0;for(const c of chunks){out.set(c,i);i+=c.length}return new TextDecoder('utf-8',{fatal:true}).decode(out)}
export async function discoverRelease(repository,fetcher){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository))throw Error('SOURCE_REPOSITORY');
 const response=await fetcher(`https://api.github.com/repos/${repository}/releases?per_page=100`,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json','User-Agent':'BarDoctor-holiday-source'}});
 if(!response.ok)throw Error('SOURCE_HTTP_'+response.status);
 const rows=JSON.parse(await bounded(response));if(!Array.isArray(rows))throw Error('RELEASE_SCHEMA');
 const releases=rows.filter(r=>!r.draft&&!r.prerelease&&/^holiday-feed-[1-9]\d*-[1-9]\d*$/.test(r.tag_name)&&Number.isFinite(Date.parse(r.published_at))).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
 const r=releases[0];if(!r)throw Error('NO_SIGNED_RELEASE');
 const prefix=`https://github.com/${repository}/releases/download/${r.tag_name}/`;
 function asset(name){const a=(r.assets??[]).filter(a=>a.name===name);if(a.length!==1||a[0].state!=='uploaded'||a[0].size<1||a[0].size>1_000_000||a[0].browser_download_url!==prefix+name)throw Error('RELEASE_ASSET');return a[0].browser_download_url}
 return {payloadUrl:asset('holiday-source.json'),bundleUrl:asset('holiday-source.sigstore.json'),releaseTag:r.tag_name};
}
export async function downloadReleaseAsset(url,fetcher){
 let current=url;
 for(let i=0;i<3;i++){
  const response=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/octet-stream','User-Agent':'BarDoctor-holiday-source'}});
  if(response.ok)return bounded(response);
  if(![301,302,303,307,308].includes(response.status))throw Error('SOURCE_HTTP_'+response.status);
  const location=response.headers.get('location');if(!location)throw Error('SOURCE_REDIRECT');
  const next=new URL(location,current);if(next.protocol!=='https:'||next.hostname!=='release-assets.githubusercontent.com'||next.username||next.password||next.port)throw Error('SOURCE_REDIRECT');current=next.href;
 }
 throw Error('SOURCE_REDIRECT_LIMIT');
}
