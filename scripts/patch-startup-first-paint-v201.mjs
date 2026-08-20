import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const first = bundle.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (bundle.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
}

function replaceBetween(start, end, replacement, label) {
  const first = bundle.indexOf(start);
  if (first < 0) throw new Error(`Missing start for ${label}`);
  const last = bundle.indexOf(end, first + start.length);
  if (last < 0) throw new Error(`Missing end for ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(last);
}

if (bundle.includes('bdStartupFirstPaintVersion="startup-v201"')) {
  console.log("Startup first paint v201 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdHomeHealthIndexVersion="home-health-v200",IC="bd_ai_diagnosis_v9";',
  'bdHomeHealthIndexVersion="home-health-v200",bdStartupFirstPaintVersion="startup-v201",IC="bd_ai_diagnosis_v9";',
  "startup first-paint version marker",
);

const startupCoordinator = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201")return;e.removeAttribute("data-bd-startup-pending"),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:bdStartupFirstPaintVersion}}))}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai(),{settings:a,snapshots:s}=bdUseAccountingStore(t),{equipment:l}=Fr(),{events:u}=Ci(),{cases:d}=za(),{employees:f}=_i(),{revenue:m,expenses:h,gapReasons:g}=Ur(),{reviews:y}=Vg(),bdHealthRouteActiveV182=window.location.pathname==="/"||window.location.pathname==="/home",j=S.useMemo(()=>bdHealthRouteActiveV182?zC(u,d,f,m,h,y,{profile:t,settings:a,snapshots:s,equipment:l}):null,[bdHealthRouteActiveV182,u,d,f,m,h,y,t,a,s,l]),[v,b]=S.useState(()=>WS()),N=S.useMemo(()=>bdHealthRouteActiveV182?bdHealthLatestClosedMonthV153(t,m,h,s,a,g):"",[bdHealthRouteActiveV182,t,m,h,s,a,g]),E=bdHealthScoreValueV153(j),[q]=S.useState(()=>{const B=window.location.pathname,U=B==="/"?Cle():B;return U==="/home"&&bdHealthLaunchBeginV155()}),[B,U]=S.useState(()=>q?"SPLASH_LOADING":"HOME"),[H,I]=S.useState(!1),[V,F]=S.useState(!1);S.useEffect(()=>{r&&b(WS())},[r]),S.useEffect(()=>{if(!q)return;const R=window.setTimeout(()=>I(!0),2700);return()=>window.clearTimeout(R)},[q]),S.useEffect(()=>{if(!q||B!=="SPLASH_LOADING")return;const R=window.setTimeout(()=>F(!0),5200);return()=>window.clearTimeout(R)},[q,B]),S.useEffect(()=>{if(!q||B!=="SPLASH_LOADING")return;const R=bdHealthLaunchDecisionV155({launchRequested:q,minimumSplashElapsed:H,timedOut:V,venueReady:n,hasProfile:!!t,cloudReady:r,score:E});if(R.next==="HEALTH_ENTRY"){bdHealthDiagnosticV155("health-data-ready",{reason:R.reason,score:E,venueReady:n,cloudReady:r}),bdHealthStartupRouteHomeV155(),U("HEALTH_ENTRY");return}R.next==="HOME"&&R.fallback&&(bdHealthLaunchFallbackV155(R.reason,{score:E,venueReady:n,hasProfile:!!t,cloudReady:r,timeoutMs:5200}),bdHealthStartupRouteHomeV155(),U("HOME"))},[q,B,H,V,n,t,r,E]),S.useLayoutEffect(()=>{(!q||B==="HOME")&&bdStartupFirstPaintCompleteV201()},[q,B]);function Z(R){bdHealthLaunchCompleteV155(R||"entry-finished"),U("HOME")}if(!q)return e;if(B==="SPLASH_LOADING")return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse","data-bd-health-startup-machine":"v155","data-bd-health-startup-state":"SPLASH_LOADING",style:{minHeight:"100dvh",width:"100%",background:"#070911"},children:i.jsx(ble,{})});const R=B==="HEALTH_ENTRY";return i.jsxs(i.Fragment,{children:[i.jsx("div",{className:"bd-health-startup-home"+(R?" is-concealed":""),"aria-hidden":R,inert:R,children:e}),R&&i.jsx(bdHealthScoreEntryV153,{health:j,venueName:t?.name??"",diagnosis:v,closedMonthToken:N,onComplete:Z})]})}`;

replaceBetween(
  "function bdHealthStartupGateV155",
  "function cEe(){",
  startupCoordinator,
  "startup coordinator",
);

writeFileSync(bundlePath, bundle);
console.log("Installed startup first paint v201");
