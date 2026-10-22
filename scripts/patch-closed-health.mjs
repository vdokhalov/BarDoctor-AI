import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');
const anchor='const n=bdBusinessHealthSafeSnapshotV342(e);if(!n)return bdBusinessHealthSharedStoreV284.current;';
const replacement='const n=bdBusinessHealthSafeSnapshotV342(e);if(!n||n.closedWorkdayCapture!==true)return bdBusinessHealthSharedStoreV284.current;';
if(!s.includes(replacement)){if(!s.includes(anchor))throw Error('Closed Health client anchor missing');s=s.replace(anchor,replacement);}
const safe='function bdBusinessHealthSafeSnapshotV342(e){try{return bdBusinessHealthSnapshotFromEnvelopeV334(e)}catch{return null}}';
const filtered='function bdBusinessHealthSafeSnapshotV342(e){try{if(e?.data?.businessHealthSnapshot?.closedWorkdayCapture!==true)return null;const n=bdBusinessHealthSnapshotFromEnvelopeV334(e);return n?{...n,closedWorkdayCapture:true}:null}catch{return null}}';
if(!s.includes(filtered)&&!s.includes("if(bdClosedHealthEmptyContexts.has(bdBusinessHealthAccountContextV284())||e?.data?.businessHealthSnapshot?.closedWorkdayCapture!==true)return null;")){if(!s.includes(safe))throw Error('Closed Health snapshot reader missing');s=s.replace(safe,filtered)}
const edits=[
 ['bdHealthLoading=!g&&bdLiveHealthStatus!=="error"','bdHealthLoading=!g&&(bdLiveHealthStatus==="idle"||bdLiveHealthStatus==="loading")'],
 ['let bdLiveBusinessHealthPromiseV335=null,', 'const bdClosedHealthEmptyContexts=new Set();\nlet bdLiveBusinessHealthPromiseV335=null,'],
 ['if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdRestrictedAnalysisContextsPhase3a5.delete(t);', 'if(r.ok&&a?.success===false&&a.code==="HEALTH_NO_SNAPSHOT"){bdClosedHealthEmptyContexts.add(t);for(const[key,entry]of bdBusinessHealthSharedStoreV284.entries)if(entry.context===t)bdBusinessHealthSharedStoreV284.entries.delete(key);bdBusinessHealthSharedStoreV284.current={snapshot:null,diagnosis:null};for(const listener of bdBusinessHealthSharedStoreV284.listeners)listener();bdLiveBusinessHealthContextV335=t;return a}if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdClosedHealthEmptyContexts.delete(t);bdRestrictedAnalysisContextsPhase3a5.delete(t);'],
 ['if(e?.data?.businessHealthSnapshot?.closedWorkdayCapture!==true)return null;', 'if(bdClosedHealthEmptyContexts.has(bdBusinessHealthAccountContextV284())||e?.data?.businessHealthSnapshot?.closedWorkdayCapture!==true)return null;'],
 ['if(!e)return i.jsxs("section",{className:"bd-home-health-card-v332 is-unavailable",', 'if(!e&&bdClosedHealthEmptyContexts.has(bdBusinessHealthAccountContextV284()))return i.jsxs("section",{className:"bd-home-health-card-v332 is-unavailable","data-bd-home-health-index":"business-health-empty",children:[i.jsx("p",{className:"bd-home-health-kicker-v332",children:"Business Health"}),i.jsx("h2",{children:"Оценка пока недоступна"})]});if(!e)return i.jsxs("section",{className:"bd-home-health-card-v332 is-unavailable",']
];
// Validate a new envelope even after an earlier empty response; only cached hydration is blocked.
edits.push(['if(r.ok&&a?.success&&!bdBusinessHealthSafeSnapshotV342(a))', 'if(r.ok&&a?.success)bdClosedHealthEmptyContexts.delete(t);if(r.ok&&a?.success&&!bdBusinessHealthSafeSnapshotV342(a))']);
edits.push(['return a})().finally(()=>{bdLiveBusinessHealthPromiseV335=null});', 'return a})().catch(error=>{bdClosedHealthEmptyContexts.delete(t);throw error}).finally(()=>{bdLiveBusinessHealthPromiseV335=null});']);
if(process.argv.includes("--restore")){for(const[from,to]of [...edits].reverse())s=s.replace(to,from);fs.writeFileSync(path,s);process.exit(0)}
for(const[from,to]of edits){if(!s.includes(to)){if(!s.includes(from))throw Error('Closed Health empty-state anchor missing: '+from);s=s.replace(from,to)}}
fs.writeFileSync(path,s);
