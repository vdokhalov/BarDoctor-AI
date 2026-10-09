import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
const baseline='8d1cee041167cc1b01916cb9363eec982b8051f0';
const implementation='e07454968c3c2f2564c55e7e3a88cd90cf3a1409';
const asset='public/assets/index-BQGspy0I.js';
export const businessDateFunctions=Object.freeze(['sg','bdFinanceResultStack','bdBuildMonthlyReport','bdMonthlyChainV165','bdMonthlyReadinessV165','bdFinanceMonthResultV160','bdFinanceReadinessV160','bdFinanceSummaryV160']);
export const businessDateBackend='lib/bardoctor/month-report-calculation.js';
const revision=(commit,path)=>execFileSync('git',['show',commit+':'+path],{encoding:'utf8',maxBuffer:64*1024*1024});
const digest=s=>createHash('sha256').update(s).digest('hex');
function nodes(source){return parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&businessDateFunctions.includes(n.id.name)||n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.type==='Identifier'&&n.expression.left.name==='bdBuildMonthlyReport'&&source.slice(n.start,n.end).includes('bdMonthlyReportBeforePhase3a6('));}
const key=n=>n.type==='FunctionDeclaration'?'fn:'+n.id.name:'monthly-adapter';
/** Restore only exact reviewed replacements; arbitrary later edits fail before legacy guards run. */
export function restoreBusinessDateBaseline(source=readFileSync(asset,'utf8')){
 const before=revision(baseline,asset),after=revision(implementation,asset);
 const old=new Map(nodes(before).map(n=>[key(n),before.slice(n.start,n.end)]));
 const approved=new Map(nodes(after).map(n=>[key(n),after.slice(n.start,n.end)]));
 const actual=nodes(source);assert.equal(actual.length,9);assert.equal(old.size,9);assert.equal(approved.size,9);
 for(const n of actual.reverse()){assert.equal(source.slice(n.start,n.end),approved.get(key(n)),key(n)+' exact business-date implementation');source=source.slice(0,n.start)+old.get(key(n))+source.slice(n.end);}
 assert.equal(source,before,'no other client changes since v504');return source;
}
export function businessDateApprovedHashes(){restoreBusinessDateBaseline();const source=readFileSync(asset,'utf8');return Object.fromEntries(nodes(source).filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,digest(source.slice(n.start,n.end))]));}
export function assertBusinessDateBackend(source=readFileSync(businessDateBackend,'utf8')){assert.equal(source,revision(implementation,businessDateBackend),'exact monthly counter implementation');}
