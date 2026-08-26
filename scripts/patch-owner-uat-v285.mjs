import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV285="owner-uat-v285";';
source = source.replaceAll(marker, "");

function replaceOnce(label, before, after) {
  if (source.includes(after)) return;
  if (
    label === "active venue cache after profile save"
    && source.includes('const a=r.restaurant??e;jz(a)')
    && source.includes('window.dispatchEvent(new CustomEvent("bd:venue-context"')
  ) return;
  if (
    label === "closed current shift participates in weekly finance"
    && source.includes('for(const m of n){const h=m.date.slice(0,10);h>=LS(a)&&h<=LS(s)')
  ) return;
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Owner UAT v285 target not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Owner UAT v285 target is ambiguous: ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "active venue cache after profile save",
  'async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify(e)})).json();if(!r.ok)throw new Error(r.error??"Ошибка сохранения");jz(r.restaurant??e);const a=window.__bdAuthBootstrapV274||{};window.__bdAuthBootstrapV274={...a,state:"ready",reason:"active_venue_ready"};try{const s="bd_venue_context__"+t,l=JSON.parse(localStorage.getItem(s)||"null"),u=localStorage.getItem("bd_active_venue_id"),d=Array.isArray(l?.venues)?l.venues.map(f=>String(f?.id)===String(u)?{...f,hasProfile:!0}:f):null;d&&(l.venues=d,localStorage.setItem(s,JSON.stringify(l)))}catch{}}',
  'async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify(e)})).json();if(!r.ok)throw new Error(r.error??"Ошибка сохранения");const a=r.restaurant??e;jz(a);const s=window.__bdAuthBootstrapV274||{};window.__bdAuthBootstrapV274={...s,state:"ready",reason:"active_venue_ready"};try{const l="bd_venue_context__"+t,u=JSON.parse(localStorage.getItem(l)||"null"),d=localStorage.getItem("bd_active_venue_id"),f=Array.isArray(u?.venues)?u.venues.map(m=>String(m?.id)===String(d)?{...m,name:a?.name||m.name,currency:a?.currency||m.currency,logoId:a?.logoId??null,hasProfile:!0}:m):null;f&&(u.venues=f,localStorage.setItem(l,JSON.stringify(u)),window.dispatchEvent(new CustomEvent("bd:venue-context",{detail:u})))}catch{}}',
);

source = source.replaceAll(
  "bdHomeTodayState(e,new Date)?.operatingDate",
  "bdHomeTodayState(e,[],new Date)?.operatingDate",
);

replaceOnce(
  "primary venue tracking start",
  'async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify(e)})).json();',
  'async function uM(e){const t=Ot();if(!t)throw new Error("Нет активной сессии");const r=await(await fetch(`${vz}/`,{method:"POST",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({...e,trackingStartDate:e?.trackingStartDate||bdHomeTodayState(e,[],new Date)?.operatingDate||bdDateKey(new Date)})})).json();',
);

replaceOnce(
  "planned shifts begin when tracking begins",
  'function bdPlannedShiftDates(e,t){const n=[];for(let r=new Date(t.startDate);r<=t.endDate;r.setDate(r.getDate()+1))Rg(e,r)&&n.push(bdDateKey(r));return n}',
  'function bdPlannedShiftDates(e,t){const n=[],a=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";for(let r=new Date(t.startDate);r<=t.endDate;r.setDate(r.getDate()+1)){const s=bdDateKey(r);Rg(e,r)&&(!a||s>=a)&&n.push(s)}return n}',
);

replaceOnce(
  "completed shift coverage begins when tracking begins",
  'function _z(e,t,n){const r=[];for(let a=new Date(t.monthStart);a<=t.monthEnd&&!(a>n);a.setDate(a.getDate()+1)){const{status:s,bounds:l}=$g(e,a,n);s==="completed"&&r.push(l.operatingDate)}return r}',
  'function _z(e,t,n){const r=[],a=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";for(let s=new Date(t.monthStart);s<=t.monthEnd&&!(s>n);s.setDate(s.getDate()+1)){const{status:l,bounds:u}=$g(e,s,n);l==="completed"&&(!a||u.operatingDate>=a)&&r.push(u.operatingDate)}return r}',
);

replaceOnce(
  "monthly expected shifts begin when tracking begins",
  'function Jse(e,t,n){const r=new Set(n.revenueDates.map(l=>l.slice(0,10))),a=new Set(n.cancelledDates.map(l=>l.slice(0,10))),s=[];for(let l=new Date(t.monthStart);l<=t.monthEnd;l.setDate(l.getDate()+1)){const u=Cz(l);if(r.has(u)){s.push(u);continue}Rg(e,l)&&!a.has(u)&&s.push(u)}return s}',
  'function Jse(e,t,n){const r=new Set(n.revenueDates.map(l=>l.slice(0,10))),a=new Set(n.cancelledDates.map(l=>l.slice(0,10))),s=[],u=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";for(let d=new Date(t.monthStart);d<=t.monthEnd;d.setDate(d.getDate()+1)){const f=Cz(d);if(r.has(f)){s.push(f);continue}(!u||f>=u)&&Rg(e,d)&&!a.has(f)&&s.push(f)}return s}',
);

replaceOnce(
  "missing shift streak begins when tracking begins",
  'function uoe(e,t,n,r){const a=new Set(t.map(d=>d.date.slice(0,10))),s=new Set(n.filter(d=>d.resolved).map(d=>d.date));let l=0;const u=new Date(r);for(let d=0;d<90;d++){const f=Ig(e,u);if(Rg(e,u)&&f.end<=r){const h=f.operatingDate;if(!a.has(h)&&!s.has(h))l++;else break}u.setDate(u.getDate()-1)}return l}',
  'function uoe(e,t,n,r){const a=new Set(t.map(d=>d.date.slice(0,10))),s=new Set(n.filter(d=>d.resolved).map(d=>d.date)),l=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";let u=0;const d=new Date(r);for(let f=0;f<90;f++){const m=Ig(e,d);if(l&&m.operatingDate<l)break;if(Rg(e,d)&&m.end<=r){const h=m.operatingDate;if(!a.has(h)&&!s.has(h))u++;else break}d.setDate(d.getDate()-1)}return u}',
);

replaceOnce(
  "closed current shift participates in coverage",
  'function kC(e,t,n,r,a){const s=_z(e,a,r),l=new Set(t.map(g=>g.date.slice(0,10))),u=new Set(n.filter(g=>g.resolved).map(g=>g.date)),d=s.filter(g=>l.has(g)).length,f=s.filter(g=>!l.has(g)&&u.has(g)).length,m=s.length-d-f,h=s.length===0?100:Math.round((d+f)/s.length*100);return{scheduledCompletedShifts:s.length,revenueEntered:d,explainedClosures:f,unexplainedGaps:m,coveragePercent:h}}',
  'function kC(e,t,n,r,a){const s=_z(e,a,r),l=new Set(s),u=LS(a.monthStart),d=LS(a.monthEnd),f=LS(r),m=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";for(const b of t){const N=b.date.slice(0,10);N>=u&&N<=d&&N<=f&&(!m||N>=m)&&Rg(e,new Date(N+"T12:00:00"))&&!l.has(N)&&(l.add(N),s.push(N))}const h=new Set(t.map(b=>b.date.slice(0,10))),g=new Set(n.filter(b=>b.resolved).map(b=>b.date)),y=s.filter(b=>h.has(b)).length,j=s.filter(b=>!h.has(b)&&g.has(b)).length,v=s.length-y-j,B=s.length===0?100:Math.round((y+j)/s.length*100);return{scheduledCompletedShifts:s.length,revenueEntered:y,explainedClosures:j,unexplainedGaps:v,coveragePercent:B}}',
);

replaceOnce(
  "closed current shift participates in monthly report",
  're=bdDateKey(new Date),pe=Z.filter(oe=>oe<re),Y=pe.filter(oe=>R.has(oe)||K.has(oe)).length',
  're=bdDateKey(new Date),pe=[...new Set([...Z.filter(oe=>oe<re),...d.map(oe=>oe.date.slice(0,10)).filter(oe=>Z.includes(oe))])],Y=pe.filter(oe=>R.has(oe)||K.has(oe)).length',
);

replaceOnce(
  "closed current shift participates in weekly finance",
  'function bdFinanceWeekContext(e,t,n,r){const a=ec(t),s=new Date(a);s.setDate(s.getDate()+6),s.setHours(23,59,59,999);const l=new Date(t);l.setHours(23,59,59,999);const u=[],d=[];for(let m=new Date(a);m<=s;m.setDate(m.getDate()+1)){if(Rg(e,m)&&d.push(LS(m)),m>t)continue;const h=$g(e,m,t);h.status==="completed"&&u.push(h.bounds.operatingDate)}const f=new Set(u),g=n.filter(m=>f.has(m.date.slice(0,10))),y=wn(g,r,a,l);let j;',
  'function bdFinanceWeekContext(e,t,n,r){const a=ec(t),s=new Date(a);s.setDate(s.getDate()+6),s.setHours(23,59,59,999);const l=new Date(t);l.setHours(23,59,59,999);const u=[],d=[];for(let m=new Date(a);m<=s;m.setDate(m.getDate()+1)){if(Rg(e,m)&&d.push(LS(m)),m>t)continue;const h=$g(e,m,t);h.status==="completed"&&u.push(h.bounds.operatingDate)}const f=new Set(u);for(const m of n){const h=m.date.slice(0,10);h>=LS(a)&&h<=LS(s)&&Rg(e,new Date(h+"T12:00:00"))&&!f.has(h)&&(f.add(h),u.push(h))}const g=n.filter(m=>f.has(m.date.slice(0,10))),y=wn(g,r,a,l);let j;',
);

replaceOnce(
  "weekly finance begins when tracking begins",
  'const u=[],d=[];for(let m=new Date(a);m<=s;m.setDate(m.getDate()+1)){if(Rg(e,m)&&d.push(LS(m)),m>t)continue;const h=$g(e,m,t);h.status==="completed"&&u.push(h.bounds.operatingDate)}const f=new Set(u);',
  'const u=[],d=[],bdWeekTrackingStart=typeof e?.trackingStartDate==="string"?e.trackingStartDate:"";for(let m=new Date(a);m<=s;m.setDate(m.getDate()+1)){const h=LS(m);if(Rg(e,m)&&(!bdWeekTrackingStart||h>=bdWeekTrackingStart)&&d.push(h),m>t)continue;const g=$g(e,m,t);g.status==="completed"&&(!bdWeekTrackingStart||g.bounds.operatingDate>=bdWeekTrackingStart)&&u.push(g.bounds.operatingDate)}const f=new Set(u);',
);

replaceOnce(
  "manual purchase currency",
  'function bdProcManualDraftV207(e){const t=new Date().toISOString(),n=crypto.randomUUID();return{id:n,idempotencyKey:n,venueId:e||void 0,documentType:"receipt",supplierName:"",supplierType:"retail",date:t.slice(0,10),documentNumber:"",currency:"RUB",expenseCategory:"auto",paymentMethod:"unknown",total:0,items:[{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:"auto",confidence:1}],confidence:1,warnings:[],source:"manual",sourceType:"manual",sourceLabel:"Ручной ввод",status:"draft",createdAt:t,updatedAt:t}}',
  'function bdProcManualDraftV207(e,t="RUB"){const n=new Date().toISOString(),r=crypto.randomUUID();return{id:r,idempotencyKey:r,venueId:e||void 0,documentType:"receipt",supplierName:"",supplierType:"retail",date:n.slice(0,10),documentNumber:"",currency:t||"RUB",expenseCategory:"auto",paymentMethod:"unknown",total:0,items:[{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:"auto",confidence:1}],confidence:1,warnings:[],source:"manual",sourceType:"manual",sourceLabel:"Ручной ввод",status:"draft",createdAt:n,updatedAt:n}}',
);

replaceOnce(
  "manual purchase active venue currency",
  'bdProcManualDraftV207(s.activeVenueId)',
  'bdProcManualDraftV207(s.activeVenueId,s.venues.find(w=>Number(w.id)===Number(s.activeVenueId))?.currency||r?.currency||"RUB")',
);

replaceOnce(
  "procurement overview currency",
  'e.aiContext?.confirmedPurchases?.[0]?.currency||"RUB"',
  'e.aiContext?.confirmedPurchases?.[0]?.currency||o.find(C=>C?.currency)?.currency||"RUB"',
);

replaceOnce(
  "empty write-off currency",
  'C.find(p=>p.item.currency)?.item.currency||"RUB"',
  'C.find(p=>p.item.currency)?.item.currency||r.currency||r.accountingCurrency||"RUB"',
);

replaceOnce(
  "shift closing accounting currency",
  'const bdShiftClosingVersion="guided-v17",{expenses:pe}=Ur()',
  'const bdShiftClosingVersion="guided-v17",bdShiftCurrency=bdAccountingCurrencyV243(a?.currency)||"RUB",bdShiftMoney=ye=>bdAccountingMoneyV243(ye,bdShiftCurrency),{expenses:pe}=Ur()',
);

replaceOnce(
  "shift revenue currency label",
  'children:"Выручка (₽) *"',
  'children:["Выручка (",bdShiftCurrency,") *"]',
);

replaceOnce(
  "shift revenue currency accessible name",
  '"aria-label":"Выручка, ₽"',
  '"aria-label":"Выручка, "+bdShiftCurrency',
);

{
  const start = source.indexOf("function PAe(");
  const end = source.indexOf("function DAe(", start);
  if (start < 0 || end <= start) throw new Error("Owner UAT v285 shift closing function not found");
  const current = source.slice(start, end);
  const updated = current.replaceAll("Mn(", "bdShiftMoney(");
  if (!current.includes("bdShiftMoney(") && current === updated) {
    throw new Error("Owner UAT v285 shift money targets not found");
  }
  source = source.slice(0, start) + updated + source.slice(end);
}

source = marker + source;
writeFileSync(bundlePath, source);
console.log("Owner UAT v285 bundle fixes applied");
