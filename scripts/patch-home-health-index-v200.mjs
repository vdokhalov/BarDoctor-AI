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

if (bundle.includes('bdHomeHealthIndexVersion="home-health-v200"')) {
  console.log("Home Health Index v200 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdAIDoctorRuntimeVersion="attention-v199",IC="bd_ai_diagnosis_v9";',
  'bdAIDoctorRuntimeVersion="attention-v199",bdHomeHealthIndexVersion="home-health-v200",IC="bd_ai_diagnosis_v9";',
  "Home Health Index version marker",
);

const homeHealth = String.raw`function bdHomeHealthIndexV200({health:e,onNavigate:t}){const n=bdHealthScoreValueV153(e),r=bdHealthScoreMetaV153(e),a=n===null?0:n,s=Number(e?.dataQualityPercent??e?.coveragePercent),l=Number.isFinite(s)?Math.max(0,Math.min(100,Math.round(s))):0,u=bdHealthPrimaryFactorV153(e),d=bdHealthStateCopyV153(r.label),f=n===null?"Добавьте рабочие данные, чтобы получить объективную оценку":u?.label?"Главный фактор: "+u.label:"Откройте подробную диагностику",m="Достоверность "+l+"%",h=n===null?"Индекс здоровья пока не рассчитан. Открыть диагностику заведения":"Индекс здоровья "+n+" из 100. "+d+". Открыть диагностику заведения";return i.jsxs("button",{type:"button",onClick:()=>t("/health"),className:"bd-home-health-index","data-bd-home-health-index":"hero-v200","aria-label":h,children:[i.jsxs("span",{className:"bd-home-health-ring",style:{"--bd-health-score-color":r.stroke},"aria-hidden":!0,children:[i.jsxs("svg",{viewBox:"0 0 100 100",children:[i.jsx("circle",{className:"bd-home-health-ring-track",cx:50,cy:50,r:42}),n!==null&&i.jsx("circle",{className:"bd-home-health-ring-progress",cx:50,cy:50,r:42,pathLength:100,transform:"rotate(-90 50 50)",style:{strokeDasharray:a+" 100"}})]}),i.jsxs("span",{className:"bd-home-health-value",children:[i.jsx("strong",{children:n===null?"—":n}),i.jsx("small",{children:"/100"})]})]}),i.jsxs("span",{className:"bd-home-health-copy",children:[i.jsx("span",{className:"bd-home-health-kicker",children:"Индекс здоровья"}),i.jsx("strong",{className:"bd-home-health-status",style:{"--bd-health-score-color":r.stroke},children:d}),i.jsx("span",{className:"bd-home-health-factor",children:f}),i.jsx("span",{className:"bd-home-health-confidence",children:m})]}),i.jsx(Br,{size:19,className:"bd-home-health-chevron","aria-hidden":!0})]})}
function bdHomeDaily({profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,health:m,latestDataAt:h,onNavigate:g}){const y=bdDateKey(new Date).slice(0,7),j=S.useMemo(()=>bdBuildMonthlyReport(e,y,t,n,d,u,r),[e,y,t,n,d,u,r]),v=S.useMemo(()=>{const b=new Date(y+"-01T12:00:00");return b.setMonth(b.getMonth()-1),bdBuildMonthlyReport(e,bdDateKey(b).slice(0,7),t,n,d,u,r)},[e,y,t,n,d,u,r]),N=S.useMemo(()=>bdHomeTodayState(e,t,new Date),[e,t]),E=S.useMemo(()=>({...j,settings:u,snapshots:d}),[j,u,d]);return i.jsxs("div",{"data-bd-home-daily":"v151",className:"bd-home-daily",children:[i.jsx(bdHomeHealthIndexV200,{health:m,onNavigate:g}),i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g}),i.jsx(bdHomeTodayCard,{today:N,onNavigate:g}),i.jsx(bdHomeAttention,{profile:e,report:E,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,health:m,employees:a,onNavigate:g}),i.jsx(bdHomeFreshAi,{diagnosis:f,health:m,latestDataAt:h,onNavigate:g}),i.jsx(bdHomeContextCardsV151,{profileKey:String(e?.id??e?.name??"venue"),onNavigate:g})]})}
`;

replaceBetween(
  "function bdHomeDaily(",
  "function Dce()",
  homeHealth,
  "Home Health Index hero card",
);

writeFileSync(bundlePath, bundle);
console.log("Installed Home Health Index v200");
