import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const first = bundle.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (bundle.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
}

if (bundle.includes('bdBusinessHealthUiVersion="business-health-v252"')) {
  console.log("Business Health UI v252 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdHomeHealthIndexVersion="home-health-v200",bdStartupFirstPaintVersion=',
  'bdHomeHealthIndexVersion="home-health-v200",bdBusinessHealthUiVersion="business-health-v252",bdStartupFirstPaintVersion=',
  "Business Health UI version marker",
);

replaceOnce(
  'verify_result:"Проверить результат",closed:',
  'verify_result:"Проверить результат",reopened:"Открыта повторно",closed:',
  "reopened lifecycle label",
);

replaceOnce(
  'function Fce({data:e,generatedAt:t,onRefresh:n}){const r=bdAIDoctorNormalizeV199(e),a=r.priorities,',
  'function Fce({data:e,generatedAt:t,onRefresh:n}){const p=e.intelligence??{},r=bdAIDoctorNormalizeV199(e),a=r.priorities,',
  "AI Doctor intelligence binding",
);

const healthCard = String.raw`i.jsx("small",{children:h})]}),p.businessHealth&&i.jsxs("section",{className:"bd-ai-business-health",children:[i.jsxs("div",{className:"bd-ai-health-head",children:[i.jsxs("div",{children:[i.jsx("p",{children:"Business Health"}),i.jsx("h2",{children:p.businessHealth.score==null?"Недостаточно данных":p.businessHealth.score+" / 100"})]}),i.jsxs("span",{children:["Достоверность ",p.businessHealth.confidencePercent??"—","%"]})]}),i.jsx("p",{className:"bd-ai-health-explanation",children:p.businessHealth.explanation}),Array.isArray(p.businessHealth.components)&&i.jsx("div",{className:"bd-ai-health-components",children:p.businessHealth.components.map(c=>i.jsxs("article",{children:[i.jsx("span",{children:c.label}),i.jsx("strong",{children:c.score==null?"—":c.score}),i.jsx("small",{children:c.evidence?.[0]??c.gaps?.[0]??"Нет фактической оценки"})]},c.id))}),p.demand?.explanation&&i.jsxs("div",{className:"bd-ai-demand-note",children:[i.jsx("strong",{children:"Трафик и средний чек"}),i.jsx("p",{children:p.demand.explanation}),p.trafficMetric?.limitation&&i.jsx("small",{children:p.trafficMetric.limitation})]}),Array.isArray(p.hypotheses)&&p.hypotheses.length>0&&i.jsxs("details",{className:"bd-ai-hypotheses",children:[i.jsxs("summary",{children:["Гипотезы внешнего влияния",i.jsx("small",{children:p.hypotheses.length})]}),i.jsx("div",{children:p.hypotheses.map(c=>i.jsxs("article",{children:[i.jsx("strong",{children:c.statement}),i.jsxs("p",{children:["Confidence: ",c.confidencePercent,"% · ",c.causalStatus]}),i.jsx("small",{children:c.verificationPlan?.successCriterion})]},c.id))})]})]}),i.jsxs("section",{className:"bd-ai-section bd-ai-now"`;

replaceOnce(
  'i.jsx("small",{children:h})]}),i.jsxs("section",{className:"bd-ai-section bd-ai-now"',
  healthCard,
  "Business Health card insertion",
);

const homeHealth = String.raw`function bdHomeHealthIndexV200({health:e,diagnosis:t,onNavigate:n}){const r=t?.data?.intelligence??t?.data?.businessHealth?{businessHealth:t?.data?.businessHealth,dataQuality:t?.data?.intelligence?.dataQuality}:null,a=r?.businessHealth?.score??bdHealthScoreValueV153(e),s=bdHealthScoreMetaV153({...e,stateScore:a}),l=a===null?0:a,u=Number(r?.dataQuality?.percent??e?.dataQualityPercent??e?.coveragePercent),d=Number.isFinite(u)?Math.max(0,Math.min(100,Math.round(u))):0,f=r?.businessHealth?.lowersScore?.[0]??(bdHealthPrimaryFactorV153(e)?.label?"Главный фактор: "+bdHealthPrimaryFactorV153(e).label:"Откройте подробную диагностику"),m=a===null?"Добавьте закрытый финансовый период и ещё одно направление":f,h="Достоверность "+d+"%",g=a===null?"Business Health пока не рассчитан. Открыть диагностику заведения":"Business Health "+a+" из 100. Открыть диагностику заведения";return i.jsxs("button",{type:"button",onClick:()=>n("/health"),className:"bd-home-health-index","data-bd-home-health-index":"business-health-v252","aria-label":g,children:[i.jsxs("span",{className:"bd-home-health-ring",style:{"--bd-health-score-color":s.stroke},"aria-hidden":!0,children:[i.jsxs("svg",{viewBox:"0 0 100 100",children:[i.jsx("circle",{className:"bd-home-health-ring-track",cx:50,cy:50,r:42}),a!==null&&i.jsx("circle",{className:"bd-home-health-ring-progress",cx:50,cy:50,r:42,pathLength:100,transform:"rotate(-90 50 50)",style:{strokeDasharray:l+" 100"}})]}),i.jsxs("span",{className:"bd-home-health-value",children:[i.jsx("strong",{children:a===null?"—":a}),i.jsx("small",{children:"/100"})]})]}),i.jsxs("span",{className:"bd-home-health-copy",children:[i.jsx("span",{className:"bd-home-health-kicker",children:"Business Health"}),i.jsx("strong",{className:"bd-home-health-status",style:{"--bd-health-score-color":s.stroke},children:a===null?"Недостаточно данных":a<45?"Критично":a<70?"Требует внимания":"Стабильно"}),i.jsx("span",{className:"bd-home-health-factor",children:m}),i.jsx("span",{className:"bd-home-health-confidence",children:h})]}),i.jsx(Br,{size:19,className:"bd-home-health-chevron","aria-hidden":!0})]})}
`;

const homeStart = bundle.indexOf("function bdHomeHealthIndexV200(");
const homeEnd = bundle.indexOf("function bdHomeDaily(", homeStart);
if (homeStart < 0 || homeEnd < 0) throw new Error("Missing Home Health Index function");
bundle = bundle.slice(0, homeStart) + homeHealth + bundle.slice(homeEnd);
replaceOnce(
  'i.jsx(bdHomeHealthIndexV200,{health:m,onNavigate:g})',
  'i.jsx(bdHomeHealthIndexV200,{health:m,diagnosis:f,onNavigate:g})',
  "Home Business Health diagnosis binding",
);

replaceOnce(
  'u=S.useMemo(()=>zC(t,n,r,a,s,l,{profile:bdHealthProfile,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,a,s,l,bdHealthProfile,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),d=u.stateScore!==null?fc(u.stateScore):null;',
  'bdHealthLocal=S.useMemo(()=>zC(t,n,r,a,s,l,{profile:bdHealthProfile,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,a,s,l,bdHealthProfile,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),bdHealthIntel=WS()?.data?.intelligence,u=bdHealthIntel?.businessHealth?{...bdHealthLocal,stateScore:bdHealthIntel.businessHealth.score,dataQualityPercent:bdHealthIntel.dataQuality?.percent??bdHealthLocal.dataQualityPercent,stateNote:bdHealthIntel.businessHealth.explanation,stateDomainsCount:bdHealthIntel.businessHealth.components?.filter(f=>f.score!=null).length??bdHealthLocal.stateDomainsCount}:bdHealthLocal,d=u.stateScore!==null?fc(u.stateScore):null;',
  "Health page Business Health source",
);

writeFileSync(bundlePath, bundle);
console.log("Installed Business Health UI v252");
