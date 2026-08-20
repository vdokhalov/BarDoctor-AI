import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL(
  "../public/assets/index-BQGspy0I.js",
  import.meta.url,
);

let source = await readFile(bundlePath, "utf8");

if (source.includes('data-bd-health-index":"diagnostic-ring"')) {
  const inventoryAwareReadiness =
    "j=u.finance.score!==null&&y>=60&&d.length>=3&&(!m.tracked||m.ready)";
  const currentReadiness =
    /j=u\.finance\.score!==null&&y>=60&&d\.length>=3(?:&&\(!m\.tracked\|\|m\.ready\))*/;
  const normalized = source.replace(currentReadiness, inventoryAwareReadiness);
  if (normalized !== source) {
    source = normalized;
    await writeFile(bundlePath, source);
    console.log("Health index readiness normalized.");
  } else {
    console.log("Health index patch is already applied.");
  }
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 140)}`);
  }
  source =
    source.slice(0, index) +
    replacement +
    source.slice(index + search.length);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

function replaceInside(startMarker, endMarker, search, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  const local = source.slice(start, end);
  const index = local.indexOf(search);
  if (index === -1) {
    throw new Error(`Scoped marker not found: ${search.slice(0, 140)}`);
  }
  const next =
    local.slice(0, index) +
    replacement +
    local.slice(index + search.length);
  source = source.slice(0, start) + next + source.slice(end);
}

const issueScoring = String.raw`const sce={critical:28,high:18,medium:10,low:5},oce=8,lce=4,cce=12,uce=1440*60*60*1e3,dce=336*60*60*1e3,ZS=720*60*60*1e3;function BC(e){return["open","in_progress","waiting","new","acknowledged"].includes(e)}function R7(e){return["resolved","closed"].includes(e)}function fce(e){return Date.now()-new Date(e).getTime()>uce?.5:1}function I7(e){return Date.now()-new Date(e).getTime()<dce}function $7(e,t){return e?BC(t)&&new Date(e).getTime()<Date.now():!1}function dc(e){return Math.round(Math.max(0,Math.min(100,e)))}function Kg(e){if(e.length===0)return null;const t=e.filter(s=>BC(s.status)),n=e.filter(s=>R7(s.status)&&I7(s.updatedAt)).length;let r=70;for(const s of t){const l=fce(s.createdAt);r-=(sce[s.priority]??8)*l,$7(s.dueDate,s.status)&&(r-=oce*l)}return r+=Math.min(n*lce,cce),dc(r)}`;

replaceBetween("const sce=", "function Yg(", issueScoring);

const staffScoring = String.raw`function yce(e,t,n,r){const a=e.filter(N=>N.category==="conflict"),s=t.filter(N=>N.type==="conflict"),l=[...a.map(N=>({priority:N.priority,status:N.status,createdAt:N.createdAt,updatedAt:N.updatedAt})),...s.map(N=>({priority:N.priority,status:N.status,createdAt:N.createdAt,updatedAt:N.updatedAt,dueDate:N.dueDate||void 0}))],u=new Date,d=new Date(u.getTime()-ZS),f=r.filter(N=>L7(N.date,d,u)),m=f.filter(N=>(N.staffing?.length??0)>0),h=f.length>0?1-m.length/f.length:null,g=a.length>0||s.length>0||n.length>0||f.length>0;if(!g)return{id:"staff",hasData:!1,score:null,openCount:0,resolvedCount:0,factors:[]};let y=l.length>0?Kg(l)??68:68;const j=[];if(n.length>0){const E=n.filter(T=>T.status==="dismissed").length/n.length,_=Math.round(E*18);_>0&&(y-=_,j.push({text:"Высокая доля увольнений в команде",positive:!1}));const T=n.filter(E=>E.status==="active").length/n.length;T>=.8&&(y+=3)}h!==null&&(h>=.5?(y-=10,j.push({text:"Смены часто фиксируются без учёта персонала",positive:!1})):h===0&&f.length>=3&&(y+=4,j.push({text:"Учёт персонала по сменам ведётся регулярно",positive:!0})));const{openCount:v,resolvedCount:b}=Yg(l);return{id:"staff",hasData:g,score:dc(y),openCount:v,resolvedCount:b,factors:j}}`;

replaceBetween("function yce(", "function vce(", staffScoring);

const financeScoring = String.raw`function vce(e,t,n,r,o){const a=e.filter(N=>N.category==="finance"),s=t.filter(N=>N.type==="finance"),l=[...a.map(N=>({priority:N.priority,status:N.status,createdAt:N.createdAt,updatedAt:N.updatedAt})),...s.map(N=>({priority:N.priority,status:N.status,createdAt:N.createdAt,updatedAt:N.updatedAt,dueDate:N.dueDate||void 0}))],u=new Date,d=new Date(u.getTime()-ZS),f=new Date(u.getTime()-2*ZS),m=wn(n,r,d,u),h=wn(n,r,f,d),g=l.length>0||m.hasRevenueData;if(!g)return{id:"finance",hasData:!1,score:null,openCount:0,resolvedCount:0,factors:[]};let y=l.length>0?Kg(l)??62:62;const j=[];if(m.hasRevenueData){const N=yd(m.revenue,h.hasRevenueData?h.revenue:null);N!==null&&(N>=5?(y+=8,j.push({text:"Выручка растёт по сравнению с прошлым сопоставимым периодом",positive:!0})):N<=-10&&(y-=12,j.push({text:"Выручка снижается по сравнению с прошлым сопоставимым периодом",positive:!1})));const E=LC(m.daysWithData>0?n.filter(_=>L7(_.date,d,u)):[],m.revenue);if(E.payrollPercentOfRevenue!==null&&(E.payrollPercentOfRevenue>35?(y-=12,j.push({text:"Высокая доля ФОТ в выручке",positive:!1})):E.payrollPercentOfRevenue>=18&&E.payrollPercentOfRevenue<=32&&(y+=6,j.push({text:"ФОТ находится в рабочем диапазоне",positive:!0}))),m.revenue>0){const _=m.cashMovement/m.revenue;_<-.1?(y-=10,j.push({text:"Отрицательный денежный поток",positive:!1})):_>.15&&(y+=6,j.push({text:"Положительный денежный поток",positive:!0}))}}const C=bdHealthShiftCoverage(o?.profile,n,u);C&&C.expected>=3&&(C.percent<50?(y-=10,j.push({text:"Данные внесены только по "+C.entered+" из "+C.expected+" завершённых смен",positive:!1})):C.percent<80?(y-=5,j.push({text:"Не все завершённые смены учтены: "+C.entered+" из "+C.expected,positive:!1})):C.percent===100&&(y+=4,j.push({text:"Все последние завершённые смены учтены",positive:!0})));const P=bdHealthInventoryStatus(o);P.tracked&&(P.ready?(y+=3,j.push({text:"Остатки внесены в срок по настройкам заведения",positive:!0})):(y-=8,j.push({text:P.note,positive:!1})));const{openCount:v,resolvedCount:b}=Yg(l);return{id:"finance",hasData:g,score:dc(y),openCount:v,resolvedCount:b,factors:j}}`;

replaceBetween("function vce(", "function bce(", financeScoring);

const reviewsScoring = String.raw`function bce(e){if(!(e.length>0))return{id:"guestExperience",hasData:!1,score:null,openCount:0,resolvedCount:0,factors:[]};const n=D7(e),r=[];if(n.sentiment.total===0)return{id:"guestExperience",hasData:!0,score:null,openCount:0,resolvedCount:0,factors:[]};const a=n.sentiment.negative/n.sentiment.total,s=n.sentiment.positive/n.sentiment.total;let l=dc(65-a*45+s*25);return n.topComplaints.length>0&&r.push({text:"Повторяющиеся жалобы: "+n.topComplaints.map(u=>u.label).join(", "),positive:!1}),n.topCompliments.length>0&&r.push({text:"Часто хвалят: "+n.topCompliments.map(u=>u.label).join(", "),positive:!0}),n.trend.ratingDeltaPercent!==null&&(n.trend.ratingDeltaPercent<=-10?(l-=10,r.push({text:"Средний рейтинг отзывов снижается",positive:!1})):n.trend.ratingDeltaPercent>=10&&(l+=6,r.push({text:"Средний рейтинг отзывов растёт",positive:!0}))),n.trend.negativeShareDeltaPoints!==null&&n.trend.negativeShareDeltaPoints>=15&&(l-=10,r.push({text:"Доля негативных отзывов выросла за последний период",positive:!1})),{id:"guestExperience",hasData:!0,score:dc(l),openCount:n.topComplaints.reduce((u,d)=>u+d.count,0),resolvedCount:0,factors:r}}`;

replaceBetween("function bce(", "const jce=", reviewsScoring);

const aggregateScoring = String.raw`const jce={equipment:"Оборудование",guests:"Гости",guestExperience:"Отзывы гостей",staff:"Персонал",operations:"Операции",finance:"Финансы",maintenance:"Обслуживание",tasks:"Задачи"},bdHealthWeights={finance:35,staff:20,operations:15,tasks:5,equipment:10,maintenance:5,guests:5,guestExperience:5},bdHealthDomainDefinitions=[{id:"finance",label:"Финансы",ids:["finance"]},{id:"staff",label:"Команда",ids:["staff"]},{id:"operations",label:"Операции",ids:["operations","tasks"]},{id:"equipment",label:"Оборудование",ids:["equipment","maintenance"]},{id:"guests",label:"Гости",ids:["guests","guestExperience"]}];function bdHealthDateKey(e){return[e.getFullYear(),String(e.getMonth()+1).padStart(2,"0"),String(e.getDate()).padStart(2,"0")].join("-")}function bdHealthShiftCoverage(e,t,n=new Date){if(!e)return null;const r=[];for(let a=0;a<70&&r.length<8;a+=1){const s=new Date(n);s.setHours(12,0,0,0),s.setDate(s.getDate()-a);if(!Rg(e,s))continue;const l=$g(e,s,n);l.status==="completed"&&r.push(l.bounds.operatingDate)}if(r.length===0)return null;const a=new Set(t.map(s=>s.date.slice(0,10))),s=r.filter(l=>a.has(l)).length;return{expected:r.length,entered:s,percent:Math.round(s/r.length*100)}}function bdHealthInventoryStatus(e){const t=e?.settings,n=Array.isArray(e?.snapshots)?e.snapshots:[];if(!t)return{tracked:!1,ready:!0,note:""};const r=new Date,a=bdHealthDateKey(r),s=[...n].filter(f=>f?.date).sort((f,m)=>m.date.localeCompare(f.date));if(t.inventoryFrequency==="monthly"){const f=a.slice(0,7)+"-01",m=s.some(h=>h.date.slice(0,10)===f);return{tracked:!0,ready:m,note:m?"":"Не внесены остатки на начало текущего месяца"}}const l=t.inventoryFrequency==="weekly"?7:Math.max(1,Number(t.customFrequencyDays)||30),u=s[0]?.date?new Date(s[0].date+"T12:00:00"):null,d=u?Math.floor((r.getTime()-u.getTime())/864e5):1/0;return{tracked:!0,ready:d<=l,note:d<=l?"":"Остатки просрочены по настройке «каждые "+l+" дн.»"}}function bdHealthDomainReport(e,t){return bdHealthDomainDefinitions.map(n=>{const r=n.ids.reduce((s,l)=>s+(bdHealthWeights[l]??0),0),a=n.ids.some(s=>e[s].score!==null),s=n.ids.reduce((l,u)=>l+(e[u].score===null?50:e[u].score)*(bdHealthWeights[u]??0),0);return{id:n.id,label:n.label,score:a?dc(s/r):null,hasData:a}})}function zC(e,t,n,r=[],a=[],s=[],o={}){const l=e.filter(b=>b.category!=="idea").length+t.length,u={equipment:pce(e,t),guests:hce(e,t),guestExperience:bce(s),staff:yce(e,t,n,r),operations:mce(e,t),finance:vce(e,t,r,a,o),maintenance:xce(e,t),tasks:gce(t)},d=Object.values(u).filter(b=>b.score!==null),f=d.reduce((b,N)=>b+(bdHealthWeights[N.id]??0),0),m=bdHealthInventoryStatus(o),h=bdHealthShiftCoverage(o?.profile,r),g=(m.tracked&&!m.ready?10:0)+(h&&h.expected>=3&&h.percent<50?10:h&&h.expected>=3&&h.percent<80?5:0),y=dc(f-g),j=u.finance.score!==null&&y>=60&&d.length>=3&&(!m.tracked||m.ready),v=j?dc(Object.values(u).reduce((b,N)=>b+(N.score===null?50:N.score)*(bdHealthWeights[N.id]??0),0)/100):null,b=y>=85?"high":y>=60?"medium":"low",N=Object.values(u).filter(E=>E.score===null).map(E=>jce[E.id]),E=!j?u.finance.score===null?"Для расчёта внесите выручку и расходы завершённых смен.":m.tracked&&!m.ready?m.note+". Точная финансовая оценка пока недоступна.":"Собрано "+y+"% необходимых данных. Для индекса нужно не менее 60%.":y<85?"Предварительная оценка · подтверждено "+y+"% данных":"Расчёт подтверждён · заполнено "+y+"% данных",_=[];for(const T of Object.values(u))for(const A of T.factors)_.push({...A,weight:bdHealthWeights[T.id]??1});const T=_.sort((A,k)=>k.weight-A.weight).slice(0,6).map(({text:A,positive:k})=>({text:A,positive:k}));return{categories:u,domains:bdHealthDomainReport(u),overall:v,confidence:b,confidenceNote:E,coveragePercent:y,isPreliminary:j&&y<85,missingDomains:N,inventoryReady:!m.tracked||m.ready,shiftCoverage:h,factors:T,hasEnoughData:j,totalRecords:l}}`;

replaceBetween("const jce=", "function fc(", aggregateScoring);

const healthCard = String.raw`function bdHealthPolar(e,t,n,r){const a=(r-90)*Math.PI/180;return{x:e+n*Math.cos(a),y:t+n*Math.sin(a)}}function bdHealthArcPath(e){const t=-140+e*57,n=t+46,r=bdHealthPolar(85,85,61,n),a=bdHealthPolar(85,85,61,t);return"M "+r.x+" "+r.y+" A 61 61 0 0 0 "+a.x+" "+a.y}function bdHealthScoreColor(e,t){return e===null?"rgba(255,255,255,0.16)":e<55?"#FF6B77":e<70?"#F6B84B":t}function wce({report:e,onDetail:t}){const n=e.overall!==null?fc(e.overall):null,r=e.overall===null?"Недостаточно данных":e.isPreliminary?"Предварительно":n?.label??"Диагностика",a={finance:"#7080FF",staff:"#5DE0C4",operations:"#F6B84B",equipment:"#FF7B83",guests:"#B79BFF"};return i.jsxs("button",{type:"button",onClick:t,"data-bd-health-index":"diagnostic-ring","aria-label":"Открыть подробную диагностику заведения",className:"w-full text-left active:scale-[0.985] transition-transform",style:{position:"relative",overflow:"hidden",borderRadius:28,padding:"22px 20px 18px",background:"linear-gradient(155deg, #171C39 0%, #11162D 58%, #211742 100%)",boxShadow:"0 18px 46px rgba(20,25,55,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",color:"#fff"},children:[i.jsx(W.div,{"aria-hidden":!0,initial:{opacity:0,scale:.7},animate:{opacity:.8,scale:1},transition:{duration:1.1,ease:[.22,1,.36,1]},style:{position:"absolute",width:220,height:220,borderRadius:"50%",left:"50%",top:54,marginLeft:-110,background:"radial-gradient(circle, rgba(112,128,255,0.19) 0%, rgba(93,224,196,0.06) 46%, transparent 72%)",filter:"blur(10px)"}}),i.jsxs("div",{style:{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{children:[i.jsx("p",{style:{margin:0,fontSize:11,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)"},children:"Диагностика заведения"}),i.jsx("p",{style:{margin:"5px 0 0",fontSize:16,fontWeight:750,letterSpacing:"-0.015em",color:"rgba(255,255,255,0.92)"},children:e.overall===null?"Собираем факты":"Состояние на сегодня"})]}),i.jsx("span",{style:{flexShrink:0,padding:"6px 10px",borderRadius:999,fontSize:10,fontWeight:800,color:e.overall===null?"#B9C1E7":e.isPreliminary?"#F8CB72":n?.color??"#fff",background:e.overall===null?"rgba(185,193,231,0.10)":e.isPreliminary?"rgba(246,184,75,0.12)":n?.bg??"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.08)"},children:r})]}),i.jsxs("div",{style:{position:"relative",zIndex:1,width:190,height:178,margin:"2px auto 0",display:"flex",alignItems:"center",justifyContent:"center"},children:[i.jsx("svg",{width:170,height:170,viewBox:"0 0 170 170",fill:"none","aria-hidden":!0,children:e.domains.map((t,n)=>i.jsxs(i.Fragment,{children:[i.jsx("path",{d:bdHealthArcPath(n),stroke:"rgba(255,255,255,0.105)",strokeWidth:10,strokeLinecap:"round",fill:"none",strokeDasharray:t.hasData?void 0:"3 7"}),t.hasData&&i.jsx(W.path,{d:bdHealthArcPath(n),stroke:bdHealthScoreColor(t.score,a[t.id]),strokeWidth:10,strokeLinecap:"round",fill:"none",initial:{pathLength:0,opacity:.15},animate:{pathLength:1,opacity:1},transition:{duration:.72,delay:.12+n*.1,ease:[.22,1,.36,1]}})]},t.id))}),i.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:3},children:[e.overall!==null?i.jsx(W.span,{initial:{opacity:0,scale:.78},animate:{opacity:1,scale:1},transition:{delay:.48,duration:.45,ease:[.22,1,.36,1]},style:{fontSize:48,fontWeight:900,lineHeight:1,letterSpacing:"-0.06em",color:"#fff"},children:e.overall}):i.jsx(W.span,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.42},style:{fontSize:45,fontWeight:800,lineHeight:1,color:"rgba(255,255,255,0.28)"},children:"—"}),i.jsx("span",{style:{fontSize:10,fontWeight:750,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.38)",marginTop:6},children:e.overall!==null?"из 100":"оценки пока нет"})]})]}),i.jsx("div",{style:{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:5,marginTop:-8},children:e.domains.map(t=>i.jsxs("div",{style:{minWidth:0,textAlign:"center"},children:[i.jsx("span",{style:{display:"inline-block",width:6,height:6,borderRadius:"50%",background:bdHealthScoreColor(t.score,a[t.id]),boxShadow:t.hasData?"0 0 10px "+bdHealthScoreColor(t.score,a[t.id])+"66":"none"}}),i.jsx("p",{style:{margin:"4px 0 0",fontSize:8.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:t.hasData?"rgba(255,255,255,0.62)":"rgba(255,255,255,0.25)"},children:t.label})]},t.id))}),i.jsxs("div",{style:{position:"relative",zIndex:1,marginTop:18,paddingTop:15,borderTop:"1px solid rgba(255,255,255,0.08)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[i.jsx("span",{style:{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.48)"},children:"Полнота данных"}),i.jsxs("span",{style:{fontSize:12,fontWeight:850,color:e.coveragePercent>=60?"#FFFFFF":"#C6CBE6"},children:[e.coveragePercent,"%"]})]}),i.jsx("div",{style:{height:5,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,0.09)",marginTop:8},children:i.jsx(W.div,{initial:{width:0},animate:{width:e.coveragePercent+"%"},transition:{duration:.9,delay:.35,ease:[.22,1,.36,1]},style:{height:"100%",borderRadius:999,background:e.coveragePercent>=60?"linear-gradient(90deg,#7080FF,#5DE0C4)":"linear-gradient(90deg,#6A719B,#9CA4CF)"}})}),i.jsx("p",{style:{margin:"11px 0 0",fontSize:12,lineHeight:1.45,color:"rgba(255,255,255,0.55)"},children:e.confidenceNote}),i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:13},children:[i.jsx("span",{style:{fontSize:10,fontWeight:650,color:"rgba(255,255,255,0.30)"},children:e.missingDomains.length?"Не хватает: "+e.missingDomains.slice(0,2).join(", "):"Все основные блоки заполнены"}),i.jsx("span",{style:{fontSize:12,fontWeight:800,color:"#AEB7FF"},children:"Подробнее →"})]})]})]})}`;

replaceBetween("function wce(", "const HM=", healthCard);

replaceOnce(
  "function Dce(){const{profile:e}=Un(),{events:t}=Ci()",
  "function Dce(){const{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{events:t}=Ci()",
);
replaceOnce(
  "h=S.useMemo(()=>zC(t,n,r,d,f,m),[t,n,r,d,f,m])",
  "h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots])",
);

replaceOnce(
  "function Uce(){const{profile:e}=Un(),{events:t}=Ci()",
  "function Uce(){const{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{events:t}=Ci()",
);
replaceInside(
  "function Uce()",
  "function Lh(",
  "Le=zC(t,n,r,u,d,m),Rn={overall:Le.overall,confidence:Le.confidence,confidenceNote:Le.confidenceNote,factors:Le.factors",
  "Le=zC(t,n,r,u,d,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots}),Rn={overall:Le.overall,coveragePercent:Le.coveragePercent,isPreliminary:Le.isPreliminary,confidence:Le.confidence,confidenceNote:Le.confidenceNote,factors:Le.factors",
);
replaceInside(
  "function Uce()",
  "function Lh(",
  "[e,t,n,r,s,g,u,d,f]),A=S.useCallback",
  "[e,t,n,r,s,g,u,d,f,m,bdHealthSettings,bdHealthSnapshots]),A=S.useCallback",
);

replaceOnce(
  "function c_e(){const[,e]=bt(),{events:t}=Ci()",
  "function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(bdHealthProfile),{events:t}=Ci()",
);
replaceInside(
  "function c_e()",
  "function q_e(",
  "u=S.useMemo(()=>zC(t,n,r,a,s,l),[t,n,r,a,s])",
  "u=S.useMemo(()=>zC(t,n,r,a,s,l,{profile:bdHealthProfile,settings:bdHealthSettings,snapshots:bdHealthSnapshots}),[t,n,r,a,s,l,bdHealthProfile,bdHealthSettings,bdHealthSnapshots])",
);
replaceInside(
  "function c_e()",
  "function q_e(",
  'children:"Здоровье заведения"',
  'children:"Диагностика заведения"',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  'children:"Общий балл"',
  'children:u.overall===null?"Оценка ещё не готова":u.isPreliminary?"Предварительная оценка":"Подтверждённый индекс"',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  "style:{color:d.color,background:d.bg},children:d.label",
  'style:{color:u.isPreliminary?"#F8CB72":d.color,background:u.isPreliminary?"rgba(246,184,75,0.12)":d.bg},children:u.isPreliminary?"Предварительно":d.label',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  'children:"Уверенность:"',
  'children:"Полнота данных:"',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  "style:{color:f.color,background:f.bg},children:f.label",
  'style:{color:f.color,background:f.bg},children:u.coveragePercent+"%"',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  'children:"Добавьте первое событие, дело или выручку — балл появится сразу"',
  'children:"Индекс появится после финансовых данных и 60% покрытия."',
);
replaceInside(
  "function c_e()",
  "function q_e(",
  '["Категории считаются из событий, дел и реальных операционных данных (выручка, ФОТ, денежный поток)","Критические проблемы снижают балл сильнее, давние — вполовину","Решённые проблемы за последние 14 дней дают бонус",\'Общий балл — среднее по категориям, где есть данные; балл не ждёт "достаточного" объёма\']',
  '["Финансы — 35%, персонал — 20%, операции и задачи — 20%","Оборудование и обслуживание — 15%, гости и отзывы — 10%","Отсутствующие данные получают нейтральную оценку, а не 100 баллов","Индекс показывается только при наличии финансов и не менее 60% покрытия","График смен и периодичность остатков берутся из настроек заведения"]',
);

await writeFile(bundlePath, source);
console.log("Transparent animated health index patch applied.");
