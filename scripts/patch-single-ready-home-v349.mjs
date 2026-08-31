import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;
const marker = 'const bdSingleReadyHomeVersionV349="v349"';

if (!bundle.includes(marker)) {
  const anchor = 'const bdIosLaunchScreenVersionV348="v348"';
  if (!bundle.includes(anchor)) throw new Error("iOS launch screen v348 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const existingFinanceHelper = bundle.indexOf("function bdApplyHomeFinanceWarmV349()");
const cloudStart = existingFinanceHelper >= 0 ? existingFinanceHelper : bundle.indexOf("function Woe({children:e})");
const cloudEnd = bundle.indexOf("function Ai()", cloudStart);
if (cloudStart < 0 || cloudEnd < 0) throw new Error("Cloud sync provider was not found.");
const cloudProvider = String.raw`function bdApplyHomeFinanceWarmV349(){const e=window.__bdStartupFinanceWarmV349;if(!e)return Promise.resolve(!1);return e.then(t=>{for(const{key:n,data:r}of t)r===void 0?bdClearMissingServerStoreV324(n):Kse(n,r);return!0}).catch(()=>!1)}
function Woe({children:e}){const{isReady:t,profile:n}=Un(),[r,a]=S.useState(!1),[s,l]=S.useState(!1),u=S.useRef(!1);return S.useEffect(()=>{if(!t)return;if(!n){a(!0),l(!0);return}if(u.current)return;if(u.current=!0,!Ot()){a(!0),l(!0);return}let d=!1;return a(!1),l(!1),bdApplyHomeFinanceWarmV349().then(f=>{!d&&f&&l(!0)}),(async()=>{const f=await Xse();if(f){for(const[m,h]of Object.entries(f.entries))cz(m)||Kse(m,h);for(const m of bdServerStoreKeysV324)Object.prototype.hasOwnProperty.call(f.entries,m)||cz(m)||bdClearMissingServerStoreV324(m);l(!0)}d||a(!0),pM(PM)})(),()=>{d=!0}},[t,n]),S.useEffect(()=>{const d=()=>{pM(PM)};return window.addEventListener("online",d),()=>window.removeEventListener("online",d)},[]),i.jsx(r7.Provider,{value:{isReady:r,financeReady:s},children:e})}`;
if (bundle.slice(cloudStart, cloudEnd) !== cloudProvider) {
  bundle = bundle.slice(0, cloudStart) + cloudProvider + bundle.slice(cloudEnd);
  changed = true;
}

if (!bundle.includes("function bdWarmCriticalHomeV349()")) {
  const anchor = "\nlet bdLiveBusinessHealthPromiseV335=null";
  if (!bundle.includes(anchor)) throw new Error("Business Health refresh anchor was not found.");
  const warmup = String.raw`
function bdWarmCriticalHomeV349(){if(typeof window>"u"||window.__bdStartupWarmStartedV349)return;const e=Ot();if(!e)return;window.__bdStartupWarmStartedV349=!0,window.__bdStartupBusinessHealthWarmV349=fetch("/api/business-health",{headers:ca(e),cache:"no-store"}).then(async t=>({response:t,data:await t.json()})),window.__bdStartupFinanceWarmV349=Promise.all(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].map(async t=>({key:t,data:await Yse(t,e)})))}
bdWarmCriticalHomeV349();`;
  bundle = bundle.replace(anchor, `${warmup}${anchor}`);
  changed = true;
}

const healthStart = bundle.indexOf("async function bdRefreshLiveBusinessHealthV335()");
const healthEnd = bundle.indexOf("function bdUseLiveBusinessHealthV335", healthStart);
if (healthStart < 0 || healthEnd < 0) throw new Error("Business Health refresh function was not found.");
const healthRefresh = String.raw`async function bdRefreshLiveBusinessHealthV335(){if(bdLiveBusinessHealthPromiseV335)return bdLiveBusinessHealthPromiseV335;const e=Ot(),t=bdBusinessHealthAccountContextV284();if(!e)return null;bdLiveBusinessHealthPromiseV335=(async()=>{const n=window.__bdStartupBusinessHealthWarmV349;window.__bdStartupBusinessHealthWarmV349=null;const{response:r,data:a}=n?await n:await fetch("/api/business-health",{headers:ca(e),cache:"no-store"}).then(async s=>({response:s,data:await s.json()}));if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdBusinessHealthCommitEnvelopeV284(a,!0),bdLiveBusinessHealthContextV335=t;return a})().finally(()=>{bdLiveBusinessHealthPromiseV335=null});return bdLiveBusinessHealthPromiseV335}`;
if (bundle.slice(healthStart, healthEnd) !== healthRefresh) {
  bundle = bundle.slice(0, healthStart) + healthRefresh + bundle.slice(healthEnd);
  changed = true;
}

if (!bundle.includes("function bdHomeStartupRecoveryV349()")) {
  const anchor = "\nfunction Dce(){";
  const recovery = String.raw`
function bdHomeStartupRecoveryV349(){return i.jsx("main",{"data-bd-home-startup-recovery":"v349",style:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,background:"#f7f8fc"},children:i.jsxs("section",{style:{width:"min(100%,430px)",padding:24,border:"1px solid #e3e6ef",borderRadius:22,background:"#fff",textAlign:"center"},children:[i.jsx("h1",{style:{margin:0,fontSize:22,color:"#151a2d"},children:"Не удалось загрузить Главную"}),i.jsx("p",{style:{margin:"10px 0 18px",fontSize:14,lineHeight:1.5,color:"#667085"},children:"Данные не потеряны. Повторите загрузку — приложение запросит актуальное состояние с сервера."}),i.jsx("button",{type:"button",onClick:()=>window.location.reload(),style:{minHeight:48,width:"100%",border:0,borderRadius:14,background:"#5753e8",color:"#fff",fontSize:14,fontWeight:800},children:"Повторить загрузку"})]})})}`;
  if (!bundle.includes(anchor)) throw new Error("Home component anchor was not found.");
  bundle = bundle.replace(anchor, `${recovery}${anchor}`);
  changed = true;
}

const homeStart = bundle.indexOf("function Dce(){");
const homeEnd = bundle.indexOf("const q7=", homeStart);
if (homeStart < 0 || homeEnd < 0) throw new Error("Home component was not found.");
let home = bundle.slice(homeStart, homeEnd);
home = home.replace(
  "function Dce(){const{isReady:bdHomeCloudReady}=Ai(),",
  "function Dce(){const{isReady:bdHomeCloudReady,financeReady:bdHomeFinanceReady}=Ai(),",
);
home = home.replace(
  'bdHealthLoading=!g&&bdLiveHealthStatus!=="error";return i.jsx(nt,',
  'bdHealthLoading=!g&&bdLiveHealthStatus!=="error",[bdHomeStartupTimedOutV349,bdSetHomeStartupTimedOutV349]=S.useState(!1);S.useEffect(()=>{const e=window.setTimeout(()=>bdSetHomeStartupTimedOutV349(!0),15e3);return()=>window.clearTimeout(e)},[]);if(!g||!bdHomeFinanceReady)return bdHomeStartupTimedOutV349?i.jsx(bdHomeStartupRecoveryV349,{}):i.jsx(W.div,{"data-bd-root-splash":"single-ready-home-v349",style:{minHeight:"100dvh",width:"100%",background:"#070911"},children:i.jsx(ble,{})});return i.jsx(nt,',
);
home = home.replace("i.jsx(bdHomeDaily,{cloudReady:bdHomeCloudReady,", "i.jsx(bdHomeDaily,{cloudReady:!0,");
if (!home.includes('data-bd-root-splash":"single-ready-home-v349"') || !home.includes("cloudReady:!0")) {
  throw new Error("Home readiness gate could not be applied.");
}
if (bundle.slice(homeStart, homeEnd) !== home) {
  bundle = bundle.slice(0, homeStart) + home + bundle.slice(homeEnd);
  changed = true;
}

if (!bootstrap.includes("20260829-single-ready-home-v349")) {
  const token = "20260829-coherent-startup-v347";
  if (!bootstrap.includes(token)) throw new Error("Coherent startup v347 cache token was not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-single-ready-home-v349`);
  changed = true;
}

for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  if (!html.includes('name="bd-single-ready-home"')) {
    html = html.replace('<meta name="bd-ios-launch-screen" content="v348" />', '<meta name="bd-ios-launch-screen" content="v348" />\n    <meta name="bd-single-ready-home" content="v349" />');
  }
  html = html.replace(/(?:-20260829-single-ready-home-v349)+/g, "-20260829-single-ready-home-v349");
  if (!/index-BQGspy0I\.js\?v=[^"\n]*single-ready-home-v349/.test(html)) {
    html = html.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260829-single-ready-home-v349");
  }
  if (!/bardoctor-preview\.js\?v=[^"\n]*single-ready-home-v349/.test(html)) {
    html = html.replace(/(bardoctor-preview\.js\?v=[^"\n]*coherent-startup-v347)/, "$1-20260829-single-ready-home-v349");
  }
  if (html !== initial) {
    writeFileSync(path, html);
    changed = true;
  }
}

if (changed) {
  writeFileSync(bundlePath, bundle);
  writeFileSync(bootstrapPath, bootstrap);
  console.log("Applied single ready Home v349.");
} else console.log("Single ready Home v349 is already applied.");
