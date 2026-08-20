import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const versionMarker = 'bdHealthScoreExperienceVersion="health-score-v155"';
const coordinatorMarker = 'data-bd-health-startup-machine":"v155';
if (source.includes(versionMarker) && source.includes(coordinatorMarker)) {
  console.log("Health Score startup state machine v155 is already applied.");
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
  'bdHealthScoreExperienceVersion="health-score-v154"',
  'bdHealthScoreExperienceVersion="health-score-v155"',
);
if (!source.includes(versionMarker)) {
  throw new Error("Health Score v154 bundle marker was not found.");
}

const launchHelpers = String.raw`function bdHealthLaunchRuntimeV155(){return window.bdHealthScoreExperience}
function bdHealthLaunchBeginV155(){const e=bdHealthLaunchRuntimeV155();if(e&&typeof e.beginLaunch==="function")return e.beginLaunch();const t=window.__bdHealthLaunchFallbackV155||(window.__bdHealthLaunchFallbackV155={status:"new",entryRendered:!1,diagnostics:[]});if(t.status==="complete")return!1;return t.status="pending",!0}
function bdHealthLaunchRenderedV155(e){const t=bdHealthLaunchRuntimeV155();if(t&&typeof t.markEntryRendered==="function")return t.markEntryRendered(e);const n=window.__bdHealthLaunchFallbackV155||(window.__bdHealthLaunchFallbackV155={status:"new",entryRendered:!1,diagnostics:[]});return n.status="shown",n.entryRendered=!0,!0}
function bdHealthLaunchCompleteV155(e){const t=bdHealthLaunchRuntimeV155();if(t&&typeof t.completeLaunch==="function"){t.completeLaunch(e);return}const n=window.__bdHealthLaunchFallbackV155||(window.__bdHealthLaunchFallbackV155={status:"new",entryRendered:!1,diagnostics:[]});n.status="complete"}
function bdHealthLaunchFallbackV155(e,t){const n=bdHealthLaunchRuntimeV155();if(n&&typeof n.fallbackLaunch==="function"){n.fallbackLaunch(e,t);return}const r=window.__bdHealthLaunchFallbackV155||(window.__bdHealthLaunchFallbackV155={status:"new",entryRendered:!1,diagnostics:[]});r.status="complete",r.diagnostics.push({event:"health-entry-fallback",reason:e,context:t})}
function bdHealthLaunchDecisionV155(e){const t=bdHealthLaunchRuntimeV155();if(t&&typeof t.startupDecision==="function")return t.startupDecision(e);if(!e.launchRequested)return{next:"HOME",reason:"not-a-startup-launch"};if(!e.minimumSplashElapsed)return{next:"SPLASH_LOADING",reason:"minimum-splash"};const n=bdHealthScoreValueV153(e.score)!==null,r=!!e.venueReady&&!!e.hasProfile&&(!!e.cloudReady||n);return r?{next:"HEALTH_ENTRY",reason:e.cloudReady?"health-data-synced":"cached-health-score-ready"}:e.timedOut?{next:"HOME",reason:"health-data-timeout-no-usable-score",fallback:!0}:{next:"SPLASH_LOADING",reason:"health-data-pending"}}
function bdHealthDiagnosticV155(e,t){const n=bdHealthLaunchRuntimeV155();n&&typeof n.diagnostic==="function"&&n.diagnostic(e,t)}
function bdHealthPrepareLaunchV155(e,t,n,r){const a=bdHealthLaunchRuntimeV155(),s=bdHealthExperienceReadV153();if(!a||typeof a.evaluate!=="function")return{trend:null};const l=a.evaluate(s,{dateKey:e,score:t,diagnosisToken:n,closedMonthToken:r});return bdHealthExperienceWriteV153(l.state),{trend:l.trend||null}}`;

replaceBetween(
  "function bdHealthLaunchBeginV153()",
  "function bdHealthScoreIndicatorV153",
  launchHelpers,
);

const entryComponent = String.raw`function bdHealthScoreEntryV153({health:e,venueName:t,diagnosis:n,closedMonthToken:r,onComplete:a}){const s=bdHealthScoreValueV153(e),l=Number(e?.dataQualityPercent??e?.coveragePercent),u=Number.isFinite(l)?Math.max(0,Math.min(100,Math.round(l))):0,d=bdHealthScoreMetaV153(e),f=bdHealthPrimaryFactorV153(e),m=bdHealthDiagnosisTokenV153(n),h=bdDateKey(new Date),g=S.useMemo(()=>bdHealthPrepareLaunchV155(h,s,m,r),[]),[y,j]=S.useState({phase:"visible",reason:"session-launch",trend:g.trend,targetX:0,targetY:0}),v=S.useRef("visible"),b=S.useRef(null),N=S.useRef(null),E=S.useRef(null),_=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;S.useEffect(()=>{bdHealthLaunchRenderedV155({score:s,venueName:t||"",confidence:u})},[]);function T(A=!1){if(v.current!=="visible")return;b.current&&window.clearTimeout(b.current);if(A){v.current="complete",a("skip");return}const k=document.querySelector("[data-bd-health-score-resting=\"v153\"]"),O=k?.getBoundingClientRect(),M=O?O.left+O.width/2-window.innerWidth/2:0,D=O?O.top+O.height/2-window.innerHeight/2:-window.innerHeight*.4;v.current="leaving",j(C=>({...C,phase:"leaving",targetX:M,targetY:D})),N.current&&window.clearTimeout(N.current),N.current=window.setTimeout(()=>{v.current="complete",a("timer")},_?20:430)}S.useEffect(()=>{b.current=window.setTimeout(()=>T(!1),1650);const A=k=>{k.key==="Escape"&&T(!0)};return window.addEventListener("keydown",A),()=>{window.removeEventListener("keydown",A),b.current&&window.clearTimeout(b.current)}},[]);S.useEffect(()=>{const A=document.body.style.overflow;return document.body.style.overflow="hidden",window.requestAnimationFrame(()=>E.current?.focus({preventScroll:!0})),()=>{document.body.style.overflow=A}},[]);S.useEffect(()=>()=>{b.current&&window.clearTimeout(b.current),N.current&&window.clearTimeout(N.current)},[]);const A=s===null?0:s,k=bdHealthStateCopyV153(d.label),O=f?f.label:"Недостаточно данных",M={"--bd-health-score-color":d.stroke,"--bd-health-target-x":y.targetX+"px","--bd-health-target-y":y.targetY+"px"};return i.jsx("div",{className:"bd-health-entry is-"+y.phase,style:M,"data-bd-health-entry":"v155","data-bd-health-entry-reason":y.reason,role:"dialog","aria-modal":!0,"aria-label":"Состояние заведения",onClick:()=>T(!0),onPointerUp:D=>{D.pointerType==="touch"&&T(!0)},children:i.jsx("div",{className:"bd-health-entry-panel",children:i.jsxs("div",{className:"bd-health-entry-content",children:[i.jsxs("p",{className:"bd-health-entry-brand",children:["Bar",i.jsx("span",{children:"Doctor"})]}),i.jsxs("h1",{className:"bd-health-entry-kicker",children:["Состояние ",t||"заведения"]}),i.jsxs("div",{className:"bd-health-entry-score",style:{"--bd-health-score-color":d.stroke},"aria-hidden":!0,children:[i.jsxs("svg",{viewBox:"0 0 140 140",children:[i.jsx("circle",{className:"bd-health-entry-ring-track",cx:70,cy:70,r:60}),s!==null&&i.jsx("circle",{className:"bd-health-entry-ring-progress",cx:70,cy:70,r:60,pathLength:100,transform:"rotate(-90 70 70)",style:{strokeDasharray:A+" 100"}})]}),i.jsxs("span",{className:"bd-health-entry-score-copy",children:[i.jsx("strong",{children:s===null?"—":s}),i.jsx("small",{children:"/ 100"})]})]}),i.jsx("p",{className:"bd-health-entry-status",style:{"--bd-health-score-color":d.stroke},children:k}),i.jsx("p",{className:"bd-health-entry-trend",children:bdHealthTrendCopyV153(y.trend)}),i.jsxs("p",{className:"bd-health-entry-factor",children:["Главный фактор: ",i.jsx("strong",{children:O})]}),i.jsxs("p",{className:"bd-health-entry-confidence",children:["Достоверность диагноза: ",i.jsxs("strong",{children:[u,"%"]})]}),i.jsx("button",{ref:E,type:"button",onClick:D=>{D.stopPropagation(),T(!0)},className:"bd-health-entry-skip","aria-label":"Пропустить Health Score и открыть Главную",children:"Нажмите, чтобы пропустить"})]})})})}
`;

replaceBetween(
  "function bdHealthScoreEntryV153",
  "function bdHomeHeaderV151",
  entryComponent,
);

const homeComponent = String.raw`function Dce(){const{isReady:bdHomeCloudReady}=Ai(),{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{equipment:bdHealthEquipment}=Fr(),{events:t}=Ci(),{cases:n}=za(),{employees:r}=_i(),[,a]=bt(),s=e?.name??"",{revenue:d,expenses:f,gapReasons:bdHomeGapReasons}=Ur(),{reviews:m}=Vg(),h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),[g,bdSetHomeDiagnosis]=S.useState(()=>WS()),y=_ce(),j=S.useMemo(()=>bdHomeLatestUpdatedAt(t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,[bdHealthSettings]),[t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,bdHealthSettings]);S.useEffect(()=>{bdHomeCloudReady&&bdSetHomeDiagnosis(WS())},[bdHomeCloudReady]);return i.jsx(nt,{showBottomNav:!0,className:"bg-[#F9FAFB]",children:i.jsx($e,{className:"bd-home-shell pt-5 pb-36",children:i.jsxs("div",{"data-bd-home-page":"v151",className:"bd-home-page",children:[i.jsx(bdHomeHeaderV151,{venueName:s,isReady:bdHomeCloudReady,latestDataAt:j,health:h,onNavigate:a}),i.jsx(bdHomeDaily,{profile:e,revenue:d,expenses:f,gapReasons:bdHomeGapReasons,employees:r,equipment:bdHealthEquipment,equipmentAlerts:y,settings:bdHealthSettings,snapshots:bdHealthSnapshots,diagnosis:g,health:h,latestDataAt:j,onNavigate:a})]})})})}`;

replaceBetween("function Dce(){", "const q7=", homeComponent);

const rootSplash = String.raw`function _le(){const[,e]=bt(),[t,n]=S.useState(!1),[r]=S.useState(Cle);S.useEffect(()=>{const a=setTimeout(()=>n(!0),2700);return()=>clearTimeout(a)},[]);function a(){e(r)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:t?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{t&&a()},children:i.jsx(ble,{})})}`;

replaceBetween("function _le(){", "const Ele=", rootSplash);

const startupCoordinator = String.raw`function bdHealthStartupRouteHomeV155(){if(window.location.pathname!=="/")return;try{window.history.replaceState(window.history.state,"","/home")}catch{window.location.replace("/home")}}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai(),{settings:a,snapshots:s}=bdUseAccountingStore(t),{equipment:l}=Fr(),{events:u}=Ci(),{cases:d}=za(),{employees:f}=_i(),{revenue:m,expenses:h,gapReasons:g}=Ur(),{reviews:y}=Vg(),j=S.useMemo(()=>zC(u,d,f,m,h,y,{profile:t,settings:a,snapshots:s,equipment:l}),[u,d,f,m,h,y,t,a,s,l]),[v,b]=S.useState(()=>WS()),N=S.useMemo(()=>bdHealthLatestClosedMonthV153(t,m,h,s,a,g),[t,m,h,s,a,g]),E=bdHealthScoreValueV153(j),[q]=S.useState(()=>{const B=window.location.pathname,U=B==="/"?Cle():B;return U==="/home"&&bdHealthLaunchBeginV155()}),[B,U]=S.useState(()=>q?"SPLASH_LOADING":"HOME"),[H,I]=S.useState(!1),[V,F]=S.useState(!1);S.useEffect(()=>{r&&b(WS())},[r]),S.useEffect(()=>{if(!q)return;const R=window.setTimeout(()=>I(!0),2700);return()=>window.clearTimeout(R)},[q]),S.useEffect(()=>{if(!q||B!=="SPLASH_LOADING")return;const R=window.setTimeout(()=>F(!0),5200);return()=>window.clearTimeout(R)},[q,B]),S.useEffect(()=>{if(!q||B!=="SPLASH_LOADING")return;const R=bdHealthLaunchDecisionV155({launchRequested:q,minimumSplashElapsed:H,timedOut:V,venueReady:n,hasProfile:!!t,cloudReady:r,score:E});if(R.next==="HEALTH_ENTRY"){bdHealthDiagnosticV155("health-data-ready",{reason:R.reason,score:E,venueReady:n,cloudReady:r}),bdHealthStartupRouteHomeV155(),U("HEALTH_ENTRY");return}R.next==="HOME"&&R.fallback&&(bdHealthLaunchFallbackV155(R.reason,{score:E,venueReady:n,hasProfile:!!t,cloudReady:r,timeoutMs:5200}),bdHealthStartupRouteHomeV155(),U("HOME"))},[q,B,H,V,n,t,r,E]);function Z(R){bdHealthLaunchCompleteV155(R||"entry-finished"),U("HOME")}if(!q)return e;if(B==="SPLASH_LOADING")return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse","data-bd-health-startup-machine":"v155","data-bd-health-startup-state":"SPLASH_LOADING",style:{minHeight:"100dvh",width:"100%",background:"#070911"},children:i.jsx(ble,{})});const R=B==="HEALTH_ENTRY";return i.jsxs(i.Fragment,{children:[i.jsx("div",{className:"bd-health-startup-home"+(R?" is-concealed":""),"aria-hidden":R,inert:R,children:e}),R&&i.jsx(bdHealthScoreEntryV153,{health:j,venueName:t?.name??"",diagnosis:v,closedMonthToken:N,onComplete:Z})]})}`;

replaceBetween(
  "function bdHealthStartupGateV154",
  "function cEe(){",
  startupCoordinator,
);
source = source.replace(
  "i.jsx(bdHealthStartupGateV154,{children:",
  "i.jsx(bdHealthStartupGateV155,{children:",
);

if (!source.includes(coordinatorMarker)) {
  throw new Error("Health Score v155 coordinator was not installed.");
}
if (source.includes("bdHealthLaunchCompleteV153()")) {
  throw new Error("A v154 pre-render completion path remains in the bundle.");
}

await writeFile(bundlePath, source);
console.log("Applied Health Score startup state machine v155.");
