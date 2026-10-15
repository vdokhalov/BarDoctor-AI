import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {classifyChanges,classifyRange} from '../scripts/ci-change-scope.mjs';
import {assertRequiredGates,fullGates} from '../scripts/ci-required-gates.mjs';
const css={path:'public/sales-journal.css',status:'M',oldMode:'100644',newMode:'100644',before:'.journal{padding:12px;color:red}',after:'.journal{padding:14px;color:red}'};
test('only known local CSS value edits get both-consumer presentation coverage',()=>assert.equal(classifyChanges([css]).mode,'sales-css'));
test('unknown, shared, auth, data, dependency, build, CI and mixed diffs require full CI',()=>{
 for(const path of ['public/app-shell-v185.css','public/sales-navigation.css','public/new.css','app/api/auth/login/route.ts','lib/bardoctor/auth.ts','db/schema.ts','package-lock.json','package.json','vite.config.ts','.github/workflows/google-reviews-setup-v400.yml','scripts/ci-change-scope.mjs','tests/fixtures/p0-release-amendment-v517.json']){
  assert.equal(classifyChanges([{...css,path}]).mode,'full',path);
  assert.equal(classifyChanges([css,{...css,path}]).mode,'full',path+' mixed');
 }
 assert.equal(classifyChanges([]).mode,'full');
});
test('new/deleted/renamed files, symlinks and non-presentation CSS cannot opt into narrow CI',()=>{
 for(const status of ['A','D','R100','T'])assert.equal(classifyChanges([{...css,status}]).mode,'full');
 assert.equal(classifyChanges([{...css,newMode:'120000'}]).mode,'full');
 for(const after of ['.other{padding:14px;color:red}','@import "remote.css";'+css.after,'.journal{padding:14px!important;color:red}',css.after+'.new{color:red}', '.journal{padding:url(remote);color:red}', '.journal{padding:14px;color:red',''])assert.equal(classifyChanges([{...css,after}]).mode,'full',after);
 assert.equal(classifyChanges([{...css,before:'.a{--global:1}',after:'.a{--global:2}'}]).mode,'full');
 assert.equal(classifyRange('missing','missing').mode,'full');
});
test('approval companion can change only the exact bound CSS digest',()=>{
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const before={baseline:'fixed',files:{[css.path]:{before:'historical',after:hash(css.before)}}};
 const after=structuredClone(before);after.files[css.path].after=hash(css.after);
 const companion={...css,path:'tests/fixtures/p0-release-amendment-v517.json',before:JSON.stringify(before),after:JSON.stringify(after)};
 assert.equal(classifyChanges([css,companion]).mode,'sales-css');
 for(const mutated of [{...after,baseline:'HEAD'},{...after,scope:'new approval'},{files:{}},{}])assert.equal(classifyChanges([css,{...companion,after:JSON.stringify(mutated)}]).mode,'full');
 assert.equal(classifyChanges([css,companion,{...css,path:'app/api/auth/login/route.ts'}]).mode,'full');
});
test('real Git diff parsing and absent revisions fail closed',()=>{
 const cwd=process.cwd(),dir=mkdtempSync(tmpdir()+'/bd-scope-');
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
 try{
  git('init','-q');git('config','user.name','QA');git('config','user.email','qa@isolated.test');
  mkdirSync(dir+'/public');writeFileSync(dir+'/'+css.path,css.before);git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
  writeFileSync(dir+'/'+css.path,css.after);git('commit','-qam','CSS');const head=git('rev-parse','HEAD');
  process.chdir(dir);assert.equal(classifyRange(base,head).mode,'sales-css');
  assert.equal(classifyRange(head,base).mode,'full');
  writeFileSync(dir+'/unknown.txt','mixed');git('add','.');git('commit','-qm','unknown');assert.equal(classifyRange(base,git('rev-parse','HEAD')).mode,'full');
 }finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
});
function results(mode){return Object.fromEntries([['changes',{result:'success',outputs:{mode}}],...fullGates.map(n=>[n,{result:mode==='full'?'success':'skipped'}]),['sales-presentation',{result:mode==='full'?'skipped':'success'}]]);}
test('aggregate rejects failed, cancelled, missing or skipped selected gates',()=>{
 for(const mode of ['full','sales-css']){
  assert.doesNotThrow(()=>assertRequiredGates(results(mode)));
  for(const name of ['changes',...(mode==='full'?fullGates:['sales-presentation'])])for(const result of ['failure','cancelled','skipped',undefined]){
   const jobs=results(mode);jobs[name].result=result;assert.throws(()=>assertRequiredGates(jobs));
  }
 }
 assert.throws(()=>assertRequiredGates(results('unknown')));
});
const cashier={...css,path:'public/cashier.css'};
const inset='\n/* The shared host already accounts for the mobile top safe area. */\n@media(max-width:600px){html[data-bd-embedded="true"] body{padding-top:0}}\n';
test('cashier allows existing presentation values and only the reviewed embedded inset addition',()=>{
 assert.equal(classifyChanges([cashier]).mode,'sales-css');
 const change={...cashier,after:cashier.before+inset};
 assert.equal(classifyChanges([change]).mode,'sales-css');
 for(const after of [change.after.replace('600px','601px'),change.after.replace('padding-top:0','padding-top:10px'),change.after.replace('html[data-bd-embedded="true"] body','body'),change.after+inset,change.after+'body{display:none}',change.after.replace('color:red','color:blue')])assert.equal(classifyChanges([{...change,after}]).mode,'full',after);
 for(const path of ['app/cashier/route.ts','public/cashier.js','public/sales-journal.css','lib/bardoctor/auth.ts','db/schema.ts','unknown.txt'])assert.equal(classifyChanges([change,{...css,path}]).mode,'full',path);
 for(const status of ['A','D','R100','T'])assert.equal(classifyChanges([{...change,status}]).mode,'full');
 assert.equal(classifyChanges([{...change,newMode:'120000'}]).mode,'full');
});
test('cashier manifest updates must bind exact bytes and cannot grant new approvals',()=>{
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const before={baseline:'fixed',files:{[cashier.path]:{before:'historical',after:hash(cashier.before)}}};
 const after=structuredClone(before);after.files[cashier.path].after=hash(cashier.after);
 const companion={...css,path:'tests/fixtures/p0-release-amendment-v517.json',before:JSON.stringify(before),after:JSON.stringify(after)};
 assert.equal(classifyChanges([cashier,companion]).mode,'sales-css');
 for(const mutated of [{...after,baseline:'HEAD'},{...after,files:{...after.files,'app/cashier/route.ts':{after:'x'}}},{...after,files:{[cashier.path]:{before:'changed',after:hash(cashier.after)}}}])assert.equal(classifyChanges([cashier,{...companion,after:JSON.stringify(mutated)}]).mode,'full');
 assert.equal(classifyChanges([cashier,{...companion,before:'{"files":{}}'}]).mode,'full');
});
test('aggregate never accepts fabricated success for unselected full gates or missing evidence',()=>{
 for(const name of fullGates){const jobs=results('sales-css');jobs[name].result='success';assert.throws(()=>assertRequiredGates(jobs));}
 const missing=results('sales-css');delete missing['sales-presentation'];assert.throws(()=>assertRequiredGates(missing));
});
