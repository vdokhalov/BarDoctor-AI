import fs from 'node:fs';
import {transformSync} from 'esbuild';
const file='public/assets/index-BQGspy0I.js',restore=process.argv.includes('--restore');let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('M.length===0&&M.push({id:n7(),planId:A,title:g'),end=s.indexOf(';const D={id:A,diagnosisDate:k',start);
const fallback=start>=0?s.slice(start,end):null;
const baseline='M.length===0&&M.push({id:n7(),planId:A,title:g,priority:j??"high",category:y,status:"proposed",approvalStatus:"pending",impact:N,aiExplanation:b,expectedImpact:N,evidence:[],basisSummary:"Требует проверки исходных данных",requiresVerification:!0,source:"ai_doctor",notes:[],createdAt:T,updatedAt:T})';
const changes=[
 ['actions:E,knownEquipment:_=[]','actions:bdRawActions,knownEquipment:_=[]'],
 ['}=h,T=new Date().toISOString(),A=Boe()', '}=h,E=bdDoctorActionCandidates(bdRawActions);if(!E.length)return!1;if(bdDiagnosisGeneratedAt&&bdCurrentTasks().some(task=>task.aiGenerated===!0&&task.aiRunId===bdDiagnosisGeneratedAt))return!1;const T=new Date().toISOString(),A=Boe()'],
 [baseline,'/* No synthetic task for an informational diagnosis. */'],
 ['(B.actions?.length||B.topPriority)&&y({','bdDoctorActionCandidates(B.actions).length>0&&y({']
];
for(const[a,b]of [...changes].reverse())s=s.replace(b,a);
s=s.replace(/\/\* doctor-action-candidates:start \*\/[\s\S]*?\/\* doctor-action-candidates:end \*\//g,'');
if(!restore){for(const[a,b]of changes){if(!s.includes(a))throw Error('Doctor action patch anchor missing: '+a.slice(0,70));s=s.replace(a,b)}s+='\n/* doctor-action-candidates:start */\n'+fs.readFileSync('scripts/fragments/doctor-action-candidates.js','utf8')+'\n/* doctor-action-candidates:end */\n';}
transformSync(s,{loader:'js',logLevel:'silent'});fs.writeFileSync(file,s);
