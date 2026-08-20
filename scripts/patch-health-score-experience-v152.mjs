import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const versionMarker = 'bdHealthScoreExperienceVersion="health-score-v152"';
if (source.includes(versionMarker)) {
  console.log("Health Score Experience v152 is already applied.");
  process.exit(0);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

source = source.replace(
  'const bdHomeVisualVersion="home-v151";',
  'const bdHomeVisualVersion="home-v151",bdHealthScoreExperienceVersion="health-score-v152";',
);

const experienceComponents = String.raw`
function bdHealthScoreValueV152(e){const t=e?.stateScore??e?.overall;return typeof t==="number"&&Number.isFinite(t)?Math.max(0,Math.min(100,Math.round(t))):null}
function bdHealthScoreMetaV152(e){const t=bdHealthScoreValueV152(e);return t===null?{color:"#8E97AA",label:"Недостаточно данных",bg:"rgba(142,151,170,.12)",stroke:"#A6ADBE"}:fc(t)}
function bdHealthStateCopyV152(e){if(!e)return"Недостаточно данных";return e==="Внимание"?"Требует внимания":e==="Проблемы"?"Есть проблемы":e==="Критично"?"Критическое состояние":e}
function bdHealthPrimaryFactorV152(e){const t=window.bdHealthScoreExperience;return t&&typeof t.mainFactor==="function"?t.mainFactor(e):null}
function bdHealthDiagnosisTokenV152(e){const t=window.bdHealthScoreExperience;return t&&typeof t.diagnosisToken==="function"?t.diagnosisToken(e):""}
function bdHealthLatestClosedMonthV152(e,t,n,r,a,s){if(!e)return"";const l=bdRecentMonthKeys(12);for(const u of l){const d=bdBuildMonthlyReport(e,u,t,n,r,a,s);if(d.isClosed)return d.meta.key}return""}
function bdHealthExperienceReadV152(){try{const e=localStorage.getItem(Pt("bd_health_score_experience_v152"));return e?JSON.parse(e):{}}catch{return{}}}
function bdHealthExperienceWriteV152(e){try{localStorage.setItem(Pt("bd_health_score_experience_v152"),JSON.stringify(e))}catch{}}
function bdHealthTrendCopyV152(e){return!e?"История за 30 дней ещё не накоплена":e.delta>0?"Рост на "+Math.abs(e.delta)+" за 30 дней":e.delta<0?"Снижение на "+Math.abs(e.delta)+" за 30 дней":"Без изменений за 30 дней"}
function bdHealthScoreIndicatorV152({health:e,onNavigate:t}){const n=bdHealthScoreValueV152(e),r=bdHealthScoreMetaV152(e),a=n===null?0:n,s=n===null?"Health Score пока не рассчитан. Открыть диагностику заведения":"Health Score "+n+" из 100. Открыть диагностику заведения";return i.jsx("button",{type:"button",onClick:()=>t("/health"),className:"bd-health-score-button","data-bd-health-score-resting":"v152","aria-label":s,title:s,children:i.jsxs("span",{className:"bd-health-score-compact",style:{"--bd-health-score-color":r.stroke},children:[i.jsxs("svg",{viewBox:"0 0 40 40","aria-hidden":!0,children:[i.jsx("circle",{className:"bd-health-score-track",cx:20,cy:20,r:17}),n!==null&&i.jsx("circle",{className:"bd-health-score-progress",cx:20,cy:20,r:17,pathLength:100,transform:"rotate(-90 20 20)",style:{strokeDasharray:a+" 100"}})]}),i.jsx("span",{className:"bd-health-score-number",children:n===null?"—":n})]})})}
function bdHealthScoreEntryV152({health:e,venueName:t,isReady:n,diagnosis:r,closedMonthToken:a}){const s=window.bdHealthScoreExperience,l=bdHealthScoreValueV152(e),u=Number(e?.dataQualityPercent??e?.coveragePercent),d=Number.isFinite(u)?Math.max(0,Math.min(100,Math.round(u))):0,f=bdHealthScoreMetaV152(e),m=bdHealthPrimaryFactorV152(e),h=bdHealthDiagnosisTokenV152(r),g=bdDateKey(new Date),[y,j]=S.useState({phase:"hidden",reason:"",trend:null,targetX:0,targetY:0}),v=S.useRef("hidden"),b=S.useRef(""),N=S.useRef(null),E=S.useRef(null),_=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;S.useEffect(()=>{if(!n||!s||typeof s.evaluate!=="function")return;const T=[Pt("bd_health_score_experience_v152"),g,l===null?"null":l,d,h,a].join("|");if(b.current===T)return;const A=window.setTimeout(()=>{b.current=T;const k=s.evaluate(bdHealthExperienceReadV152(),{dateKey:g,score:l,diagnosisToken:h,closedMonthToken:a});bdHealthExperienceWriteV152(k.state),k.show&&(v.current="visible",j({phase:"visible",reason:k.reason,trend:k.trend,targetX:0,targetY:0}))},180);return()=>window.clearTimeout(A)},[n,s,g,l,d,h,a]);function T(){if(v.current!=="visible")return;const A=document.querySelector("[data-bd-health-score-resting=\"v152\"]"),k=A?.getBoundingClientRect(),O=k?k.left+k.width/2-window.innerWidth/2:0,M=k?k.top+k.height/2-window.innerHeight/2:-window.innerHeight*.4;v.current="leaving",j(D=>({...D,phase:"leaving",targetX:O,targetY:M})),N.current&&window.clearTimeout(N.current),N.current=window.setTimeout(()=>{v.current="hidden",j(D=>({...D,phase:"hidden"}))},_?20:430)}S.useEffect(()=>{if(y.phase!=="visible")return;N.current=window.setTimeout(T,1450);const A=k=>{k.key==="Escape"&&T()};return window.addEventListener("keydown",A),()=>{window.removeEventListener("keydown",A),N.current&&window.clearTimeout(N.current)}},[y.phase]);S.useEffect(()=>{if(y.phase==="hidden")return;const A=document.body.style.overflow;return document.body.style.overflow="hidden",window.requestAnimationFrame(()=>E.current?.focus({preventScroll:!0})),()=>{document.body.style.overflow=A}},[y.phase]);S.useEffect(()=>()=>{N.current&&window.clearTimeout(N.current)},[]);if(y.phase==="hidden")return null;const A=l===null?0:l,k=bdHealthStateCopyV152(f.label),O=m?m.label:"Недостаточно данных",M={"--bd-health-score-color":f.stroke,"--bd-health-target-x":y.targetX+"px","--bd-health-target-y":y.targetY+"px"};return i.jsx("div",{className:"bd-health-entry is-"+y.phase,style:M,"data-bd-health-entry":"v152","data-bd-health-entry-reason":y.reason,role:"dialog","aria-modal":!0,"aria-label":"Состояние заведения",onClick:T,children:i.jsx("div",{className:"bd-health-entry-panel",children:i.jsxs("div",{className:"bd-health-entry-content",children:[i.jsxs("p",{className:"bd-health-entry-brand",children:["Bar",i.jsx("span",{children:"Doctor"})]}),i.jsxs("h1",{className:"bd-health-entry-kicker",children:["Состояние ",t||"заведения"]}),i.jsxs("div",{className:"bd-health-entry-score",style:{"--bd-health-score-color":f.stroke},"aria-hidden":!0,children:[i.jsxs("svg",{viewBox:"0 0 140 140",children:[i.jsx("circle",{className:"bd-health-entry-ring-track",cx:70,cy:70,r:60}),l!==null&&i.jsx("circle",{className:"bd-health-entry-ring-progress",cx:70,cy:70,r:60,pathLength:100,transform:"rotate(-90 70 70)",style:{strokeDasharray:A+" 100"}})]}),i.jsxs("span",{className:"bd-health-entry-score-copy",children:[i.jsx("strong",{children:l===null?"—":l}),i.jsx("small",{children:"/ 100"})]})]}),i.jsx("p",{className:"bd-health-entry-status",style:{"--bd-health-score-color":f.stroke},children:k}),i.jsx("p",{className:"bd-health-entry-trend",children:bdHealthTrendCopyV152(y.trend)}),i.jsxs("p",{className:"bd-health-entry-factor",children:["Главный фактор: ",i.jsx("strong",{children:O})]}),i.jsxs("p",{className:"bd-health-entry-confidence",children:["Достоверность диагноза: ",i.jsxs("strong",{children:[d,"%"]})]}),i.jsx("button",{ref:E,type:"button",onClick:T,className:"bd-health-entry-skip","aria-label":"Пропустить Health Score и открыть Главную",children:"Нажмите, чтобы пропустить"})]})})})}
function bdHomeHeaderV151({venueName:e,isReady:t,latestDataAt:n,health:r,onNavigate:a}){const s=bdHomeStoredVenueInfoV151(),l=s.active?.name||e||"Заведение",u=localStorage.getItem("bd_active_role")||s.active?.role||"owner",d=bdHomeRoleLabelV151(u),f=s.count>1,m=i.jsxs(i.Fragment,{children:[i.jsx("span",{className:"bd-home-venue-mark","aria-hidden":!0,children:(l.trim().slice(0,1)||"B").toUpperCase()}),i.jsxs("span",{className:"bd-home-venue-copy",children:[i.jsx("strong",{children:l}),i.jsx("small",{children:d})]}),f&&i.jsx(gg,{size:15,className:"bd-home-venue-chevron","aria-hidden":!0})]});return i.jsxs("header",{"data-bd-home-header":"v151",className:"bd-home-header",children:[f?i.jsx("button",{type:"button",className:"bd-home-venue",onClick:()=>bdHomeOpenVenueV151(a),"aria-label":"Переключить заведение",children:m}):i.jsx("div",{className:"bd-home-venue is-single",children:m}),i.jsxs("div",{className:"bd-home-header-actions",children:[i.jsxs("span",{className:"bd-home-sync",role:"status","aria-label":bdHomeSyncCopyV151(t,n),children:[i.jsx("span",{className:"bd-home-sync-dot","aria-hidden":!0}),i.jsx("span",{children:bdHomeSyncCopyV151(t,n)})]}),i.jsx(bdHealthScoreIndicatorV152,{health:r,onNavigate:a}),i.jsx("button",{type:"button","aria-label":"Уведомления",onClick:()=>a("/notifications"),className:"bd-home-notifications",children:i.jsx(i$,{size:18})})]})]})}
`;

replaceBetween(
  "function bdHomeHeaderV151(",
  "function bdHomeResultV151(",
  experienceComponents,
);

const oldHome = source.slice(
  source.indexOf("function Dce()"),
  source.indexOf("const q7=", source.indexOf("function Dce()")),
);
if (!oldHome) throw new Error("Current Home page function was not found.");

const updatedHome = String.raw`function Dce(){const{isReady:bdHomeCloudReady}=Ai(),{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{equipment:bdHealthEquipment}=Fr(),{events:t}=Ci(),{cases:n}=za(),{employees:r}=_i(),[,a]=bt(),s=e?.name??"",{revenue:d,expenses:f,gapReasons:bdHomeGapReasons}=Ur(),{reviews:m}=Vg(),h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),[g,bdSetHomeDiagnosis]=S.useState(()=>WS()),y=_ce(),j=S.useMemo(()=>bdHomeLatestUpdatedAt(t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,[bdHealthSettings]),[t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,bdHealthSettings]),v=S.useMemo(()=>bdHealthLatestClosedMonthV152(e,d,f,bdHealthSnapshots,bdHealthSettings,bdHomeGapReasons),[e,d,f,bdHealthSnapshots,bdHealthSettings,bdHomeGapReasons]);return S.useEffect(()=>{bdHomeCloudReady&&bdSetHomeDiagnosis(WS())},[bdHomeCloudReady]),i.jsx(nt,{showBottomNav:!0,className:"bg-[#F9FAFB]",children:i.jsx($e,{className:"bd-home-shell pt-5 pb-36",children:i.jsxs("div",{"data-bd-home-page":"v151",className:"bd-home-page",children:[i.jsx(bdHomeHeaderV151,{venueName:s,isReady:bdHomeCloudReady,latestDataAt:j,health:h,onNavigate:a}),i.jsx(bdHomeDaily,{profile:e,revenue:d,expenses:f,gapReasons:bdHomeGapReasons,employees:r,equipment:bdHealthEquipment,equipmentAlerts:y,settings:bdHealthSettings,snapshots:bdHealthSnapshots,diagnosis:g,health:h,latestDataAt:j,onNavigate:a}),i.jsx(bdHealthScoreEntryV152,{health:h,venueName:s,isReady:bdHomeCloudReady,diagnosis:g,closedMonthToken:v})]})})})}`;

source = source.replace(oldHome, updatedHome);

await writeFile(bundlePath, source);
console.log("Applied Health Score Experience v152.");
