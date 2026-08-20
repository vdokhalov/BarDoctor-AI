import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL(
  "../public/assets/index-BQGspy0I.js",
  import.meta.url,
);

let source = await readFile(bundlePath, "utf8");

const versionMarker =
  'const bdHealthEvidenceVersion="catalog-and-attendance-v9";';

if (source.includes(versionMarker)) {
  console.log("Health evidence v9 is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  }
  source =
    source.slice(0, index) +
    replacement +
    source.slice(index + search.length);
}

const previousEvidence =
  'function pce(e,t){const n=e.filter(s=>s.category==="equipment"),r=t.filter(s=>s.type==="equipment"),a=[...n.map(s=>({priority:s.priority,status:s.status,createdAt:s.createdAt,updatedAt:s.updatedAt})),...r.map(s=>({priority:s.priority,status:s.status,createdAt:s.createdAt,updatedAt:s.updatedAt,dueDate:s.dueDate||void 0}))];return Xg("equipment",a,a.length>0)}function hce(e,t){const n=e.filter(s=>s.category==="complaint"),r=t.filter(s=>s.type==="complaint"),a=[...n.map(s=>({priority:s.priority,status:s.status,createdAt:s.createdAt,updatedAt:s.updatedAt})),...r.map(s=>({priority:s.priority,status:s.status,createdAt:s.createdAt,updatedAt:s.updatedAt,dueDate:s.dueDate||void 0}))];return Xg("guests",a,a.length>0)}';

const catalogAndAttendanceEvidence = String.raw`${versionMarker}function pce(e,t,n=[]){const r=e.filter(u=>u.category==="equipment"),a=t.filter(u=>u.type==="equipment"),s=[...r.map(u=>({priority:u.priority,status:u.status,createdAt:u.createdAt,updatedAt:u.updatedAt})),...a.map(u=>({priority:u.priority,status:u.status,createdAt:u.createdAt,updatedAt:u.updatedAt,dueDate:u.dueDate||void 0}))],l=(Array.isArray(n)?n:[]).filter(u=>!u.archived&&!['decommissioned','replaced'].includes(u.status));if(s.length===0&&l.length===0)return{id:"equipment",hasData:!1,score:null,openCount:0,resolvedCount:0,factors:[]};let d=s.length>0?Kg(s)??70:78;const f=[];if(l.length>0){const u=l.filter(v=>v.status==="broken").length,m=l.filter(v=>v.status==="under_repair").length,h=l.filter(v=>v.status==="needs_maintenance").length,g=l.filter(v=>{if(!v.nextMaintenance)return!1;const b=new Date(v.nextMaintenance);return!Number.isNaN(b.getTime())&&b<new Date}).length,y=Math.min(32,u*12+m*7+h*5+g*4),j=dc(78-y);d=s.length>0?Math.round((d+j)/2):j,u>0&&f.push({text:"Неисправное оборудование: "+u+" ед.",positive:!1}),m>0&&f.push({text:"Оборудование в ремонте: "+m+" ед.",positive:!1}),h>0&&f.push({text:"Требует обслуживания: "+h+" ед.",positive:!1}),g>0&&f.push({text:"Просрочено плановое ТО: "+g+" ед.",positive:!1}),y===0&&f.push({text:"Добавленное оборудование отмечено как исправное",positive:!0})}const{openCount:u,resolvedCount:m}=Yg(s);return{id:"equipment",hasData:!0,score:dc(d),openCount:u,resolvedCount:m,factors:f,equipmentCount:l.length}}function hce(e,t,n=[]){const r=e.filter(v=>v.category==="complaint"),a=t.filter(v=>v.type==="complaint"),s=[...r.map(v=>({priority:v.priority,status:v.status,createdAt:v.createdAt,updatedAt:v.updatedAt})),...a.map(v=>({priority:v.priority,status:v.status,createdAt:v.createdAt,updatedAt:v.updatedAt,dueDate:v.dueDate||void 0}))],l=new Date,u=new Date(l.getTime()-ZS),d=(Array.isArray(n)?n:[]).filter(v=>{const b=new Date(v.date);return!Number.isNaN(b.getTime())&&b>=u&&b<=l}),f=d.filter(v=>{const b=ql(v.guests);return b!==null&&b>0}),m=d.filter(v=>{const b=ql(v.receipts);return b!==null&&b>0}),h=f.length>0||m.length>0;if(s.length===0&&!h)return{id:"guests",hasData:!1,score:null,openCount:0,resolvedCount:0,factors:[]};const g=f.length>0?"guests":m.length>0?"receipts":"complaints",y=f.reduce((v,b)=>v+(ql(b.guests)??0),0),j=m.reduce((v,b)=>v+(ql(b.receipts)??0),0);let N=f.length>0?72:m.length>0?66:Kg(s)??65;const E=[];s.length>0&&h&&(N=Math.round((N+(Kg(s)??65))/2)),g==="guests"&&E.push({text:"Точное количество гостей фиксируется по сменам",positive:!0}),g==="receipts"&&E.push({text:"Посещаемость оценена по "+j+" чекам; точное число гостей не вносилось",positive:!0});const{openCount:_,resolvedCount:T}=Yg(s);return{id:"guests",hasData:!0,score:dc(N),openCount:_,resolvedCount:T,factors:E,attendanceSource:g,guestCount:y,receiptCount:j}}`;

replaceOnce(previousEvidence, catalogAndAttendanceEvidence);

replaceOnce(
  "equipment:pce(e,t),guests:hce(e,t)",
  "equipment:pce(e,t,o.equipment),guests:hce(e,t,r)",
);

replaceOnce(
  'const jce={equipment:"Оборудование",guests:"Гости",guestExperience:"Отзывы гостей"',
  'const jce={equipment:"Оборудование",guests:"Посещаемость",guestExperience:"Отзывы гостей"',
);
replaceOnce(
  '{id:"guests",label:"Гости",ids:["guests","guestExperience"]}',
  '{id:"guests",label:"Посещаемость",ids:["guests","guestExperience"]}',
);
replaceOnce(
  'qC={equipment:{label:"Оборудование",labelShort:"Оборуд."},guests:{label:"Гости",labelShort:"Гости"}',
  'qC={equipment:{label:"Оборудование",labelShort:"Оборуд."},guests:{label:"Посещаемость",labelShort:"Посещ."}',
);
replaceOnce(
  '"Оборудование и обслуживание — 15%, гости и отзывы — 10%"',
  '"Оборудование и обслуживание — 15%, посещаемость и отзывы — 10%"',
);

replaceOnce(
  "function Dce(){const{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{events:t}=Ci()",
  "function Dce(){const{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{equipment:bdHealthEquipment}=Fr(),{events:t}=Ci()",
);
replaceOnce(
  "zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots})",
  "zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment})",
);
replaceOnce(
  "[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots]",
  "[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]",
);

replaceOnce(
  "Le=zC(t,n,r,u,d,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots})",
  "Le=zC(t,n,r,u,d,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:s})",
);

replaceOnce(
  "function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(bdHealthProfile),{events:t}=Ci()",
  "function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(bdHealthProfile),{equipment:bdHealthEquipment}=Fr(),{events:t}=Ci()",
);
replaceOnce(
  "zC(t,n,r,a,s,l,{profile:bdHealthProfile,settings:bdHealthSettings,snapshots:bdHealthSnapshots})",
  "zC(t,n,r,a,s,l,{profile:bdHealthProfile,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment})",
);
replaceOnce(
  "[t,n,r,a,s,l,bdHealthProfile,bdHealthSettings,bdHealthSnapshots]",
  "[t,n,r,a,s,l,bdHealthProfile,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]",
);

await writeFile(bundlePath, source);
console.log("Health evidence now uses the equipment catalog and shift attendance.");
