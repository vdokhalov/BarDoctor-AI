import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compareRecoveryParity} from './lib/reference-slice-recovery-compare.mjs';
import {reportDayLabel} from './lib/released-reports-more-parity.mjs';

const actionIds=['context:/reports:Продолжить закрытие','context:/reports:'+reportDayLabel];
export function supplementChromiumEvidence(ci,narrow,width){
 for(const data of [ci,narrow])assert.deepEqual(data.capture,{engine:'chromium',width},'independent Chromium profile required');
 for(const version of ['v485','candidate'])for(const path of ['/more','/reports']){
  for(const key of ['url','venue','contract','surface','entries','frames'])assert.deepEqual(narrow[version][path].before[key],ci[version][path].before[key],'same observed origin '+version+path+key);
  assert.deepEqual(narrow[version][path].baselineDefects,[],'no narrow runtime defect');
 }
 const merged=structuredClone(ci),report=merged.candidate['/reports'];
 assert.equal(merged.candidate['/more'].salesEntry,undefined,'supplement only missing CI measurement');
 assert.ok(narrow.candidate['/more'].salesEntry,'measured Sales entry required');
 merged.candidate['/more'].salesEntry=structuredClone(narrow.candidate['/more'].salesEntry);
 for(const id of actionIds){
  assert.deepEqual(narrow.v485['/reports'].actions[id],ci.v485['/reports'].actions[id],'same measured historical Reports action');
  assert.deepEqual(report.actions[id],{absent:true},'only old-label absence may be supplemented');
  const action=narrow.candidate['/reports'].actions[id];
  assert.ok(action&&!action.absent&&!action.disabled&&action.reloaded,'new Reports click/reload must be measured');
  report.actions[id]=structuredClone(action);
 }
 assert.equal(narrow.candidate['/reports'].masterNavigation?.noDomainWrites,true,'wizard browser navigation and read-only proof required');
 report.masterNavigation=structuredClone(narrow.candidate['/reports'].masterNavigation);
 return merged;
}
export function replayChromium(ciDir,narrowDir,out){
 const manifest=JSON.parse(readFileSync('tests/fixtures/parity-chromium-269-manifest.json'));
 const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
 const read=(kind,name)=>{const bytes=readFileSync(resolve(kind==='ci'?ciDir:narrowDir,name));assert.equal(digest(bytes),manifest[kind][name],kind+'/'+name+' exact captured evidence');return JSON.parse(bytes);};
 const inventory=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v485-functional-inventory.json'));
 const narrowInventory={...inventory,items:inventory.items.filter(x=>['route:/more','route:/reports',...actionIds].includes(x.id))};
 assert.equal(inventory.items.length,290);assert.equal(narrowInventory.items.length,4);
 mkdirSync(out,{recursive:true});const results=[];
 for(const width of manifest.widths){
  const ci={capture:{engine:'chromium',width}},narrow={capture:read('narrow',`capture-${width}.json`)};
  const original=read('ci',`parity-matrix-${width}.json`);
  assert.deepEqual(original.map(x=>[x.id,x.engine,x.width]),inventory.items.map(x=>[x.id,'chromium',width]));
  for(const kind of ['ci','narrow']){
   const inputs=read(kind,`candidate-${width}-inputs.json`);assert.deepEqual(read(kind,`v485-${width}-inputs.json`),inputs,'same business fixture');
   assert.equal(inputs.clientHash,digest(readFileSync('public/assets/index-BQGspy0I.js')),'same canonical client');
   assert.equal(inputs.inventoryHash,digest(JSON.stringify(kind==='ci'?inventory:narrowInventory)));
   const other=read('ci',`candidate-${width}-inputs.json`);
   for(const key of ['clientHash','baselineCommit','domainHash','healthHash'])assert.equal(inputs[key],other[key],'same '+key);
   for(const version of ['v485','candidate']){
    (kind==='ci'?ci:narrow)[version]=read(kind,`${version}-${width}-runtime.json`);
    assert.deepEqual(read(kind,`${version}-${width}-requests.json`).filter(r=>r.status>=500),[]);
    const errors=read(kind,`${version}-${width}-runtime-errors.json`);
    if(kind==='ci'&&version==='v485'){assert.equal(errors.length,1);assert.equal(errors[0].knownPayroll,true);assert.equal(errors[0].path,'/salaries');assert.match(errors[0].message,/e\.split is not a function/);}else assert.deepEqual(errors,[]);
   }
  }
  const without=compareRecoveryParity(inventory,ci,'chromium',width);
  assert.equal(without.filter(x=>x.verdict==='FAIL').length,34,'missing observations stay FAIL');
  const matrix=compareRecoveryParity(inventory,supplementChromiumEvidence(ci,narrow,width),'chromium',width);
  writeFileSync(resolve(out,`parity-matrix-${width}.json`),JSON.stringify(matrix,null,2)+'\n');
  results.push({width,ciOriginal:{pass:206,fail:84},offlineBeforeSupplement:{pass:256,fail:34},combinedEvidence:{pass:matrix.filter(x=>x.verdict==='PASS').length,fail:matrix.filter(x=>x.verdict!=='PASS').length}});
 }
 const summary={run:manifest.run,head:manifest.head,artifact:manifest.artifact,mode:'Immutable CI observations plus independently measured four-item Chromium More/Reports supplement; no full browser rerun',results};
 writeFileSync(resolve(out,'results.json'),JSON.stringify(summary,null,2)+'\n');return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.ok(process.argv[2]&&process.argv[3],'Supply CI and narrow snapshot directories');
 const result=replayChromium(process.argv[2],process.argv[3],resolve(process.argv[4]??'outputs/parity-chromium-ci-offline'));
 console.log(JSON.stringify(result));if(result.results.some(x=>x.combinedEvidence.fail))process.exitCode=1;
}
