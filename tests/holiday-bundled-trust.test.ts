import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseSignedSourceConfig, BUNDLED_HOLIDAY_ROOT_ID} from '../lib/bardoctor/holiday-signed-config';
import {pullVerifiedFeed} from '../lib/bardoctor/signed-feed/runtime.mjs';
const base='tests/fixtures/signed-release-40821389360/';
const root=JSON.parse(readFileSync(base+'trusted-root.json','utf8'));
const policy=JSON.parse(readFileSync(base+'policy.json','utf8'));
const bundle=JSON.parse(readFileSync(base+'bundle.json','utf8'));
const payload=readFileSync(base+'payload.json');
const compact=readFileSync('docs/examples/holiday-signed-source-pinned.json','utf8');
const now=Date.parse('2026-10-29T05:10:00Z');
const prefix='https://raw.githubusercontent.com/vdokhalov/BarDoctor-AI/'+'a'.repeat(40)+'/qa/holiday-source-20261029';
const verify=async(c:any,bytes=payload)=>(await pullVerifiedFeed({...c,source:{payloadUrl:prefix+'.json',bundleUrl:prefix+'.sigstore.json'},validate:(x:any)=>x,fetcher:async(url:string)=>new Response(url.endsWith('.sigstore.json')?JSON.stringify(bundle):bytes.toString()),now})).checkpoint;
test('compact binding preserves complete trust material and old policy checkpoint identity',async()=>{
 assert.ok(Buffer.byteLength(compact)<5120);
 const c=parseSignedSourceConfig(compact)!;assert.ok(c);
 assert.deepEqual(c.root,root);
 assert.equal(BUNDLED_HOLIDAY_ROOT_ID,'sha256:'+createHash('sha256').update(JSON.stringify(root)).digest('hex'));
 const legacy=parseSignedSourceConfig(JSON.stringify({source:c.source,policy:c.policy,root}))!;
 assert.deepEqual(c,legacy);
 assert.deepEqual(await verify(c),await verify(legacy));
 assert.equal((await verify(c)).status,'verified');
});
test('missing, malformed or unknown root selector and changed inline roots fail closed',()=>{
 const c=JSON.parse(compact);
 for(const value of [undefined,'{',JSON.stringify({...c,rootId:undefined}),JSON.stringify({...c,rootId:'sha256:'+'0'.repeat(64)}),JSON.stringify({...c,root:{...root,certificateAuthorities:[]}})])assert.equal(parseSignedSourceConfig(value),null);
 const altered=structuredClone(root);altered.tlogs[0].publicKey.rawBytes='AAAA';
 assert.equal(parseSignedSourceConfig(JSON.stringify({...c,root:altered})),null);
});
test('returned trust material cannot mutate the bundled root',()=>{
 const c=parseSignedSourceConfig(compact)!;(c.root as any).certificateAuthorities=[];
 assert.deepEqual(parseSignedSourceConfig(compact)!.root,root);
});
test('same verifier rejects payload tampering and wrong trust anchors',async()=>{
 const c=parseSignedSourceConfig(compact)!;
 await assert.rejects(()=>verify(c,Buffer.concat([payload,Buffer.from(' ')])));
 await assert.rejects(()=>verify({...c,root:{...c.root,certificateAuthorities:[]}}));
});
test('same verifier rejects changed producer, owner and missing immutable pin',async()=>{
 const c=parseSignedSourceConfig(compact)!;
 for(const patch of [{ownerId:'1'},{immutableProducer:{...policy.immutableProducer,sha:'0'.repeat(40)}},{immutableProducer:undefined}])await assert.rejects(()=>verify({...c,policy:{...c.policy,...patch}}));
});
