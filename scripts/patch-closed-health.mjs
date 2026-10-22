import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';let s=fs.readFileSync(path,'utf8');
const anchor='const n=bdBusinessHealthSafeSnapshotV342(e);if(!n)return bdBusinessHealthSharedStoreV284.current;';
const replacement='const n=bdBusinessHealthSafeSnapshotV342(e);if(!n||n.closedWorkdayCapture!==true)return bdBusinessHealthSharedStoreV284.current;';
if(!s.includes(replacement)){if(!s.includes(anchor))throw Error('Closed Health client anchor missing');s=s.replace(anchor,replacement);}
const safe='function bdBusinessHealthSafeSnapshotV342(e){try{return bdBusinessHealthSnapshotFromEnvelopeV334(e)}catch{return null}}';
const filtered='function bdBusinessHealthSafeSnapshotV342(e){try{if(e?.data?.businessHealthSnapshot?.closedWorkdayCapture!==true)return null;const n=bdBusinessHealthSnapshotFromEnvelopeV334(e);return n?{...n,closedWorkdayCapture:true}:null}catch{return null}}';
if(!s.includes(filtered)){if(!s.includes(safe))throw Error('Closed Health snapshot reader missing');s=s.replace(safe,filtered)}
fs.writeFileSync(path,s);
