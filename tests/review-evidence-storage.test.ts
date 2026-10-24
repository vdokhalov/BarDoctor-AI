import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {groundedReviewSummary,reviewEvidenceCatalog} from '../lib/bardoctor/review-evidence';
test('native storage: exact source, tenant isolation, reload, stale input, repeat and failed save',async()=>{
 const r=await lifecycleRuntime({service:'./lib/bardoctor/review-layer',layer:'./app/api/review-layer/route',analysis:'./app/api/review-layer/analysis/route'});
 try{
  const owner=await r.register('ex13-owner@test.invalid'),other=await r.register('ex13-other@test.invalid');
  const account=await r.api.auth.authenticateRequest(r.request(owner,'/api/review-layer'));assert.ok(account);
  const service=r.api.service as any;
  const review={id:'review-1',venueId:account.venueId,source:'other',text:'Кухня вкусная, но заказ ждали час',rating:3,date:'2026-10-24',publishedAt:'2026-10-24T12:00:00Z',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z',aiStatus:'pending'};
  const write=(v:unknown)=>r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_guest_reviews',?,'2026-10-24') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(account.id,JSON.stringify(v));write([review]);
  const read=async(user=owner)=>(await(await r.api.layer.GET(r.request(user,'/api/review-layer'))).json() as any).data;
  const update={id:review.id,analysisText:review.text,sentiment:'negative',topicEvidence:[{reviewId:review.id,topic:'kitchen',sentiment:'positive',quote:'Кухня вкусная'},{reviewId:review.id,topic:'wait_time',sentiment:'negative',quote:'заказ ждали час'}]};
  const apply=async(updates:unknown[],user=owner)=>r.api.analysis.POST(r.request(user,'/api/review-layer/analysis','POST',{updates}));
  assert.equal((await read()).doctorSnapshot.status,'absent');
  await apply([{...update,id:'other-id'}]);assert.equal((await read()).reviews[0].aiStatus,'pending');
  await apply([update],other);assert.equal((await read()).reviews[0].aiStatus,'pending');
  await apply([{...update,analysisText:'old text'}]);assert.equal((await read()).reviews[0].aiStatus,'pending');
  assert.equal((await apply([update])).status,200);
  let input=await service.reviewAnalysisInput(account);const evidence=reviewEvidenceCatalog(input.reviews);
  const data=groundedReviewSummary({recommendations:[{title:'Wait',topic:'wait_time',evidenceIds:[evidence.find(e=>e.topic==='wait_time')!.id]}]},input.reviews);
  const saved=await service.saveReviewDoctorSnapshot(account,input.signature,data);
  assert.equal((await read()).doctorSnapshot.status,'current');assert.deepEqual((await read()).doctorSnapshot.data,data);assert.equal((await read(other)).doctorSnapshot.status,'absent');
  assert.equal((await service.saveReviewDoctorSnapshot(account,input.signature,data)).generatedAt,saved.generatedAt);
  r.failDatabase();await assert.rejects(()=>service.saveReviewDoctorSnapshot(account,input.signature,{...data,test:'failed'}));assert.deepEqual((await read()).doctorSnapshot.data,data);
  write([{...review,text:'Новый отзыв',aiStatus:'pending'}]);assert.equal((await read()).doctorSnapshot.status,'stale');assert.deepEqual((await read()).doctorSnapshot.data,data);
  await assert.rejects(()=>service.saveReviewDoctorSnapshot(account,input.signature,data),/Отзывы изменились/);
  const current=await service.reviewAnalysisInput(account);await service.saveReviewDoctorSnapshot(account,current.signature,groundedReviewSummary({},current.reviews));assert.equal((await read()).doctorSnapshot.status,'current');
  input=await service.reviewAnalysisInput(account);r.beforeNextBatch(()=>{write([{...review,text:'Concurrent source'}]);});await assert.rejects(()=>service.saveReviewDoctorSnapshot(account,input.signature,{new:true}));assert.equal((await read()).doctorSnapshot.status,'stale');
  input=await service.reviewAnalysisInput(account);
  r.beforeNextBatch(()=>{r.sqlite.prepare('INSERT INTO google_connections(account_id,google_account_id,google_location_id) VALUES(?,?,?)').run(account.id,'a','new-location');});
  await assert.rejects(()=>service.saveReviewDoctorSnapshot(account,input.signature,{bindingRace:true}));
  assert.equal((await read()).doctorSnapshot.data.bindingRace,undefined);
 }finally{r.close()}
});
