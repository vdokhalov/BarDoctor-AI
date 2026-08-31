import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const healthCssPath = new URL("../public/health-score-experience-v152.css", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;
const marker = 'const bdAuthoritativeHomeStartupVersionV344="v344"';

function replaceOnce(before, after, label) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
  changed = true;
}

if (!bundle.includes(marker)) {
  const anchor = 'const bdStartupPerformanceVersionV343="v343"';
  if (!bundle.includes(anchor)) throw new Error("Startup performance v343 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const oldGate = "function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai();bdUseLiveBusinessHealthV335(n&&r&&!!t);bdUseBusinessHealthSnapshotV284();S.useLayoutEffect(()=>{bdStartupFirstPaintCompleteV201()},[]);return e}";
const newGate = "function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un();bdUseLiveBusinessHealthV335(n&&!!t);bdUseBusinessHealthSnapshotV284();S.useLayoutEffect(()=>{bdStartupFirstPaintCompleteV201()},[]);return e}";
if (!bundle.includes(newGate)) replaceOnce(oldGate, newGate, "start Business Health before cloud-store reconciliation");

const oldHomeHead = "function Dce(){const{isReady:bdHomeCloudReady}=Ai(),bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHomeCloudReady),{profile:e}=Un(),";
const newHomeHead = "function Dce(){const{isReady:bdHomeCloudReady}=Ai(),{profile:e}=Un(),bdLiveHealthStatus=bdUseLiveBusinessHealthV335(!!e),";
if (!bundle.includes(newHomeHead)) replaceOnce(oldHomeHead, newHomeHead, "refresh Home Health in the first request wave");

const oldLoading = 'if(n)return i.jsxs("section",{className:"bd-home-health-card-v332 is-loading","data-bd-home-health-index":"business-health-v334-loading","aria-label":"Business Health загружается",children:[i.jsx("div",{className:"bd-health-skeleton-v332 wide"}),i.jsx("div",{className:"bd-health-skeleton-v332 score"}),i.jsx("div",{className:"bd-health-skeleton-v332 insight"}),i.jsx("div",{className:"bd-health-skeleton-v332 zones"}),i.jsx("div",{className:"bd-health-skeleton-v332 action"})]});';
const newLoading = 'if(n)return i.jsxs("section",{className:"bd-home-health-card-v332 is-loading is-compact-loading-v344","data-bd-home-health-index":"business-health-v344-loading","aria-live":"polite",children:[i.jsx("p",{className:"bd-home-health-kicker-v332",children:"Business Health"}),i.jsxs("div",{className:"bd-home-health-loading-row-v344",children:[i.jsx("span",{className:"bd-home-health-loading-dot-v344","aria-hidden":!0}),i.jsxs("span",{children:[i.jsx("strong",{children:"Загружаем актуальное состояние"}),i.jsx("small",{children:"Финансы, операции и данные обновляются параллельно"})]})]})]});';
if (!bundle.includes(newLoading)) replaceOnce(oldLoading, newLoading, "replace the oversized Health skeleton");

const oldDailyHead = "function bdHomeDaily({profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,snapshot:bdHealthSnapshot,health:m,healthLoading:bdHealthLoading,latestDataAt:h,onNavigate:g})";
const newDailyHead = "function bdHomeDaily({cloudReady:bdHomeCloudReady,profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,snapshot:bdHealthSnapshot,health:m,healthLoading:bdHealthLoading,latestDataAt:h,onNavigate:g})";
if (!bundle.includes(newDailyHead)) replaceOnce(oldDailyHead, newDailyHead, "pass authoritative store readiness into Home");

const moneyCard = 'i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g})';
const guardedMoneyCard = 'bdHomeCloudReady?i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g}):i.jsxs("section",{className:"bd-home-money-loading-v344","data-bd-home-money":"authoritative-loading-v344","aria-live":"polite",children:[i.jsx("p",{children:"Финансовый результат · "+bdMonthDisplay(y)}),i.jsx("strong",{children:"Сверяем данные с сервером"}),i.jsx("small",{children:"Старые локальные суммы не показываются"})]})';
if (!bundle.includes(guardedMoneyCard)) replaceOnce(moneyCard, guardedMoneyCard, "hide stale Finance totals until server reconciliation");

const oldDailyCall = "i.jsx(bdHomeDaily,{profile:e,revenue:d,expenses:f,gapReasons:bdHomeGapReasons";
const newDailyCall = "i.jsx(bdHomeDaily,{cloudReady:bdHomeCloudReady,profile:e,revenue:d,expenses:f,gapReasons:bdHomeGapReasons";
if (!bundle.includes(newDailyCall)) replaceOnce(oldDailyCall, newDailyCall, "wire Home cloud readiness");

if (!bootstrap.includes("20260829-authoritative-home-v344")) {
  const token = "20260829-startup-performance-v343";
  if (!bootstrap.includes(token)) throw new Error("Startup performance v343 token not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-authoritative-home-v344`);
  changed = true;
}

const cssMarker = "/* authoritative-home-startup-v344 */";
let healthCss = readFileSync(healthCssPath, "utf8");
if (!healthCss.includes(cssMarker)) {
  healthCss += `\n${cssMarker}\n.bd-home-health-card-v332.is-loading.is-compact-loading-v344 { min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; }\n.bd-home-health-loading-row-v344 { display: flex; align-items: center; gap: 12px; }\n.bd-home-health-loading-row-v344 > span:last-child { display: grid; gap: 3px; min-width: 0; }\n.bd-home-health-loading-row-v344 strong { color: #171a2b; font-size: 14px; line-height: 1.25; }\n.bd-home-health-loading-row-v344 small { color: #747b8d; font-size: 11px; line-height: 1.35; }\n.bd-home-health-loading-dot-v344 { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 999px; background: #5b5ceb; box-shadow: 0 0 0 5px rgba(91,92,235,.12); animation: bd-health-v344-pulse 1.25s ease-in-out infinite; }\n.bd-home-money-loading-v344 { min-height: 104px; border-radius: 24px; padding: 18px 20px; display: grid; align-content: center; gap: 5px; background: linear-gradient(145deg,#141b3d,#222d68); color: #fff; box-shadow: 0 16px 34px rgba(21,29,69,.16); }\n.bd-home-money-loading-v344 p { margin: 0; color: rgba(255,255,255,.62); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }\n.bd-home-money-loading-v344 strong { font-size: 17px; line-height: 1.25; }\n.bd-home-money-loading-v344 small { color: rgba(255,255,255,.62); font-size: 11px; }\n@keyframes bd-health-v344-pulse { 50% { opacity: .42; transform: scale(.82); } }\n`;
  writeFileSync(healthCssPath, healthCss);
  changed = true;
}

for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  if (!html.includes('name="bd-authoritative-home"')) {
    html = html.replace('<meta name="bd-startup-performance" content="v343" />', '<meta name="bd-startup-performance" content="v343" />\n    <meta name="bd-authoritative-home" content="v344" />');
  }
  html = html.replace(/(bardoctor-preview\.js\?v=[^"\n]*startup-runtime-v342)(?![^"\n]*authoritative-home-v344)/g, "$1-20260829-authoritative-home-v344");
  html = html.replace(/(health-score-experience-v152\.css\?v=[^"\n]*business-health-canonical-v335)(?![^"\n]*authoritative-home-v344)/g, "$1-20260829-authoritative-home-v344");
  if (html !== initial) {
    writeFileSync(path, html);
    changed = true;
  }
}

if (changed) {
  writeFileSync(bundlePath, bundle);
  writeFileSync(bootstrapPath, bootstrap);
  console.log("Applied authoritative Home startup v344.");
} else {
  console.log("Authoritative Home startup v344 is already applied.");
}
