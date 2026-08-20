import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const versionMarker = 'bdHealthScoreExperienceVersion="health-score-v154"';
const globalGateMarker = 'data-bd-health-global-startup":"v154';
if (source.includes(versionMarker) && source.includes(globalGateMarker)) {
  console.log("Health Score startup lifecycle v154 is already applied.");
  process.exit(0);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

if (!source.includes(versionMarker)) {
  source = source.replace(
    'bdHealthScoreExperienceVersion="health-score-v153"',
    'bdHealthScoreExperienceVersion="health-score-v154"',
  );
}

if (!source.includes(versionMarker)) {
  throw new Error("Health Score v153 version marker was not found.");
}

// The existing root Splash now owns the startup wait. It keeps the exact same
// visual component mounted until cloud-backed venue data is ready. The 2.7 s
// timer remains the minimum branded-Splash duration; 5.2 s is the hard fallback.
// On fallback, the runtime launch is completed before /home mounts so Home opens
// directly and cannot start a late Health Score Entry.
const rootSplash = String.raw`function _le(){const[,e]=bt(),{isReady:t}=Ai(),[n,r]=S.useState(!1),[a,s]=S.useState(!1),[l]=S.useState(Cle),u=S.useRef(!1);S.useEffect(()=>{const d=setTimeout(()=>s(!0),2700);return()=>clearTimeout(d)},[]),S.useEffect(()=>{if(u.current||!a)return;(l!=="/home"||t)&&(u.current=!0,r(!0))},[a,l,t]),S.useEffect(()=>{if(l!=="/home")return;const d=setTimeout(()=>{u.current||(u.current=!0,bdHealthLaunchCompleteV153(),r(!0))},5200);return()=>clearTimeout(d)},[l]);function d(){e(l)}return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse","data-bd-health-startup-gate":"v154",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:n?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{n&&d()},children:i.jsx(ble,{})})}`;

replaceBetween("function _le(){", "const Ele=", rootSplash);

// /home normally mounts only after the root gate reports ready, therefore it
// enters Health Score immediately. A direct /home cold load still receives the
// same existing Splash (never a blank or visible Home) and has its own timeout.
const updatedHome = String.raw`function Dce(){const{isReady:bdHomeCloudReady}=Ai(),{profile:e}=Un(),{settings:bdHealthSettings,snapshots:bdHealthSnapshots}=bdUseAccountingStore(e),{equipment:bdHealthEquipment}=Fr(),{events:t}=Ci(),{cases:n}=za(),{employees:r}=_i(),[,a]=bt(),s=e?.name??"",{revenue:d,expenses:f,gapReasons:bdHomeGapReasons}=Ur(),{reviews:m}=Vg(),h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),[g,bdSetHomeDiagnosis]=S.useState(()=>WS()),y=_ce(),j=S.useMemo(()=>bdHomeLatestUpdatedAt(t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,[bdHealthSettings]),[t,n,r,d,f,m,bdHealthEquipment,bdHealthSnapshots,bdHealthSettings]),v=S.useMemo(()=>bdHealthLatestClosedMonthV153(e,d,f,bdHealthSnapshots,bdHealthSettings,bdHomeGapReasons),[e,d,f,bdHealthSnapshots,bdHealthSettings,bdHomeGapReasons]),[bdHomeLaunchRequested]=S.useState(()=>bdHealthLaunchBeginV153()),[bdHomeLaunchPhase,bdSetHomeLaunchPhase]=S.useState(()=>bdHomeLaunchRequested?(bdHomeCloudReady?"entry":"waiting"):"home");S.useEffect(()=>{bdHomeCloudReady&&bdSetHomeDiagnosis(WS())},[bdHomeCloudReady]);S.useEffect(()=>{if(!bdHomeLaunchRequested||bdHomeLaunchPhase!=="waiting")return;if(bdHomeCloudReady){bdSetHomeLaunchPhase("entry");return}const bdHealthTimeout=window.setTimeout(()=>{bdHealthLaunchCompleteV153(),bdSetHomeLaunchPhase("home")},2500);return()=>window.clearTimeout(bdHealthTimeout)},[bdHomeLaunchRequested,bdHomeLaunchPhase,bdHomeCloudReady]);function bdFinishHomeLaunch(){bdHealthLaunchCompleteV153(),bdSetHomeLaunchPhase("home")}if(bdHomeLaunchPhase==="waiting")return i.jsx(W.div,{"data-bd-root-splash":"ai-pulse","data-bd-health-direct-startup":"v154",style:{minHeight:"100dvh",width:"100%",background:"#070911"},children:i.jsx(ble,{})});const bdHomeConcealed=bdHomeLaunchPhase==="entry";return i.jsx(nt,{showBottomNav:!0,className:"bg-[#F9FAFB]",children:i.jsx($e,{className:"bd-home-shell pt-5 pb-36",children:i.jsxs(i.Fragment,{children:[i.jsxs("div",{"data-bd-home-page":"v151",className:"bd-home-page bd-home-launch-content"+(bdHomeConcealed?" is-concealed":""),"aria-hidden":bdHomeConcealed,inert:bdHomeConcealed,children:[i.jsx(bdHomeHeaderV151,{venueName:s,isReady:bdHomeCloudReady,latestDataAt:j,health:h,onNavigate:a}),i.jsx(bdHomeDaily,{profile:e,revenue:d,expenses:f,gapReasons:bdHomeGapReasons,employees:r,equipment:bdHealthEquipment,equipmentAlerts:y,settings:bdHealthSettings,snapshots:bdHealthSnapshots,diagnosis:g,health:h,latestDataAt:j,onNavigate:a})]}),bdHomeConcealed&&i.jsx(bdHealthScoreEntryV153,{health:h,venueName:s,diagnosis:g,closedMonthToken:v,onComplete:bdFinishHomeLaunch})]})})})}`;

replaceBetween("function Dce(){", "const q7=", updatedHome);

// Installed PWAs start directly on /home. Gate that initial route above the
// router so the existing Splash stays continuously mounted while providers load
// and Dce cannot paint its own second loading state. The gate's decision is
// captured once, so later in-app navigation back to /home never restarts it.
const globalStartupGate = String.raw`function bdHealthStartupGateV154({children:e}){const{isReady:t}=Ai(),[n]=S.useState(()=>window.location.pathname==="/home"&&bdHealthLaunchBeginV153()),[r,a]=S.useState(()=>n?"waiting":"ready"),[s,l]=S.useState(!1),u=S.useRef(!1);S.useEffect(()=>{if(!n)return;const d=window.setTimeout(()=>l(!0),2700);return()=>window.clearTimeout(d)},[n]),S.useEffect(()=>{!n||r!=="waiting"||u.current||!s||!t||(u.current=!0,a("leaving"))},[n,r,s,t]),S.useEffect(()=>{if(!n||r!=="waiting")return;const d=window.setTimeout(()=>{u.current||(u.current=!0,bdHealthLaunchCompleteV153(),a("leaving"))},5200);return()=>window.clearTimeout(d)},[n,r]);return r==="ready"?e:i.jsx(W.div,{"data-bd-root-splash":"ai-pulse","data-bd-health-global-startup":"v154",style:{minHeight:"100dvh",width:"100%",background:"#070911"},initial:{opacity:1},animate:{opacity:r==="leaving"?0:1},transition:{duration:.4,ease:"easeInOut"},onAnimationComplete:()=>{r==="leaving"&&a("ready")},children:i.jsx(ble,{})})}`;

if (!source.includes(globalGateMarker)) {
  const componentAnchor = "function cEe(){";
  if (!source.includes(componentAnchor)) {
    throw new Error("Application shell component anchor was not found.");
  }
  source = source.replace(componentAnchor, globalStartupGate + componentAnchor);

  const shellAnchor = 'i.jsxs(Lee,{children:[i.jsxs(bse,{children:[i.jsx(cL,{base:"/".replace(/\\/$/,""),children:i.jsx(lEe,{})}),i.jsx(jse,{}),i.jsx(Pse,{})]}),i.jsx(rJ,{})]})';
  const gatedShell = 'i.jsxs(Lee,{children:[i.jsx(bdHealthStartupGateV154,{children:i.jsxs(bse,{children:[i.jsx(cL,{base:"/".replace(/\\/$/,""),children:i.jsx(lEe,{})}),i.jsx(jse,{}),i.jsx(Pse,{})]})}),i.jsx(rJ,{})]})';
  if (!source.includes(shellAnchor)) {
    throw new Error("Application router shell anchor was not found.");
  }
  source = source.replace(shellAnchor, gatedShell);
}

await writeFile(bundlePath, source);
console.log("Applied Health Score startup lifecycle v154.");
