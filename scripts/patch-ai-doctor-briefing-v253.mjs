import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const first = bundle.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (bundle.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
}

if (bundle.includes('bdAIDoctorBriefingVersion="briefing-first-v253"')) {
  console.log("AI Doctor briefing-first v253 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdBusinessHealthUiVersion="business-health-v252",bdStartupFirstPaintVersion=',
  'bdBusinessHealthUiVersion="business-health-v252",bdAIDoctorBriefingVersion="briefing-first-v253",bdStartupFirstPaintVersion=',
  "briefing version marker",
);

const briefingFunction = String.raw`function Fce({data:e,generatedAt:t,onRefresh:n}){const p=e.intelligence??{},r=bdAIDoctorNormalizeV199(e),a=r.priorities,s=Array.isArray(r.inProgress)?r.inProgress:[],l=r.opportunities,u=r.dataQuality.items,d=Array.isArray(r.history)?r.history:[],f=r.counts,m=new Date(r.updatedAt??t),h=Number.isNaN(m.getTime())?"Время обновления неизвестно":"Обновлено "+m.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})+" в "+m.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}),g=p.briefing??{},y=g.diagnosis??null,j=a[0]??null,v=y?.title??j?.title??(a.length?"Требуется управленческое действие":"Критичных отклонений не обнаружено"),b=y?.fact??j?.fact??r.diagnosticSentence,N=Array.isArray(y?.metrics)?y.metrics:[],E=y?.periodLabel??j?.factPeriod??p.demand?.period?.label??"Период не определён",_=p.businessHealth?.confidencePercent??e.confidence?.percent??"—",T=Array.isArray(g.context)?g.context:[],A=a.length===1?"1 действие":a.length>1?a.length+" действия":"Действий нет";return i.jsxs("div",{"data-bd-ai-result":"briefing-first-v253","data-bd-ai-attention":"runtime-v199",className:"bd-ai-doctor-v196 bd-ai-briefing-first",children:[i.jsxs("section",{className:"bd-ai-briefing",children:[i.jsxs("div",{className:"bd-ai-briefing-head",children:[i.jsx("p",{children:"Что происходит"}),i.jsxs("span",{children:["Достоверность диагноза ",_,"%"]})]}),i.jsx("h2",{children:v}),i.jsx("p",{className:"bd-ai-briefing-fact",children:b}),N.length>0&&i.jsx("div",{className:"bd-ai-briefing-metrics",children:N.slice(0,3).map(c=>i.jsxs("span",{children:[i.jsx("small",{children:c.label}),i.jsx("strong",{children:c.value})]},c.label))}),i.jsxs("div",{className:"bd-ai-briefing-period",children:[i.jsx("span",{children:E}),i.jsx("small",{children:h})]})]}),i.jsxs("section",{className:"bd-ai-section bd-ai-now bd-ai-today",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:"Что делать сегодня"}),i.jsx("span",{children:A})]}),a.length?i.jsx("div",{className:"bd-ai-priority-grid bd-ai-priority-count-"+Math.min(a.length,3),children:a.slice(0,3).map((c,o)=>i.jsx(bdAIDoctorPriorityCardV196,{item:c,runAt:t},c.recommendationId??o))}):i.jsx("div",{className:"bd-ai-empty",children:"Подтверждённых проблем нет. AI Doctor не создаёт искусственный TOP-3."}),Number(f.moreSignals)>0&&i.jsxs("p",{className:"bd-ai-more",children:["Ещё ",f.moreSignals," сигналов учтены ниже приоритета"]})]}),T.length>0&&i.jsxs("section",{className:"bd-ai-context-today",children:[i.jsx("div",{className:"bd-ai-context-title",children:"Контекст сегодня"}),T.map(c=>i.jsxs("article",{children:[i.jsxs("div",{children:[i.jsx("strong",{children:c.status==="fact"?"Факт":"Гипотеза"}),i.jsx("span",{children:c.title})]}),i.jsx("p",{children:c.reason}),i.jsxs("small",{children:["Проверка: ",c.verification]})]},c.id))]}),p.businessHealth&&i.jsxs("details",{className:"bd-ai-health-details",children:[i.jsxs("summary",{children:[i.jsxs("span",{children:[i.jsx("small",{children:"Business Health"}),i.jsx("strong",{children:p.businessHealth.score==null?"Недостаточно данных":p.businessHealth.score+" / 100"})]}),i.jsx("b",{children:"Методика и факты"})]}),i.jsxs("div",{className:"bd-ai-health-detail-body",children:[i.jsx("p",{children:p.businessHealth.explanation}),Array.isArray(p.businessHealth.adjustments)&&p.businessHealth.adjustments.length>0&&i.jsx("ul",{children:p.businessHealth.adjustments.map(c=>i.jsx("li",{children:c},c))}),i.jsx("div",{className:"bd-ai-health-periods",children:[p.periods?.currentFinance,p.periods?.closedFinance,p.periods?.demand].filter(Boolean).map(c=>i.jsxs("span",{children:[i.jsx("strong",{children:c.label}),i.jsx("small",{children:c.comparisonBaseline})]},c.id))}),Array.isArray(p.businessHealth.components)&&i.jsx("div",{className:"bd-ai-health-components",children:p.businessHealth.components.map(c=>i.jsxs("article",{children:[i.jsx("span",{children:c.label}),i.jsx("strong",{children:c.score==null?"—":c.score}),i.jsx("small",{children:c.evidence?.[0]??c.gaps?.[0]??"Нет фактической оценки"})]},c.id))}),p.demand?.decomposition&&i.jsxs("div",{className:"bd-ai-demand-note",children:[i.jsx("strong",{children:"Разложение коммерческого результата"}),i.jsx("p",{children:p.demand.decomposition.explanation}),p.trafficMetric?.limitation&&i.jsx("small",{children:p.trafficMetric.limitation})]}),i.jsx("small",{className:"bd-ai-health-method",children:p.businessHealth.methodology})]})]}),i.jsx(bdAIDoctorSectionV198,{title:"В работе",count:s.length,items:s,kind:"Уникальные активные проблемы",mode:"in_progress",runAt:t}),i.jsx(bdAIDoctorSectionV198,{title:"Возможности",count:l.length,items:l,kind:"Потенциал",mode:"opportunity",runAt:t}),i.jsx(bdAIDoctorDataQualityV198,{items:u,reliability:r.dataQuality?.reliabilityPercent??p.dataQuality?.percent,runAt:t}),Array.isArray(p.hypotheses)&&p.hypotheses.length>0&&i.jsxs("details",{className:"bd-ai-hypotheses",children:[i.jsxs("summary",{children:["Все гипотезы внешнего влияния",i.jsx("small",{children:p.hypotheses.length})]}),i.jsx("div",{children:p.hypotheses.map(c=>i.jsxs("article",{children:[i.jsx("strong",{children:c.statement}),i.jsxs("p",{children:["Достоверность гипотезы: ",c.confidencePercent,"% · ",c.causalStatus]}),i.jsx("small",{children:c.verificationPlan?.successCriterion})]},c.id))})]}),e.financialAssessment&&i.jsxs("details",{className:"bd-ai-finance-details",children:[i.jsxs("summary",{children:["Финансовый контекст закрытого периода",i.jsx("small",{children:"Подробнее"})]}),i.jsx(bdDiagnosisFinancialCardV48,{value:e.financialAssessment})]}),d.length>0&&i.jsxs("details",{className:"bd-ai-history",children:[i.jsxs("summary",{children:["История AI Doctor",i.jsxs("small",{children:[d.length," решений"]})]}),i.jsx("div",{className:"bd-ai-history-list",children:d.map((c,o)=>i.jsxs("article",{children:[i.jsxs("div",{children:[i.jsx("strong",{children:c.title}),i.jsx("span",{children:bdAIDoctorLifecycleLabelsV196[c.lifecycle]??c.lifecycle})]}),i.jsxs("small",{children:[c.decidedAt,c.responsible?" · "+c.responsible:""]}),c.outcomeSummary&&i.jsx("p",{children:c.outcomeSummary})]},c.recommendationId??o))})]}),i.jsx("div",{className:"bd-ai-footer-actions",children:i.jsx("button",{type:"button",onClick:n,className:"bd-ai-refresh",children:"Обновить анализ"})})]})}`;

const start = bundle.indexOf("function Fce(");
const end = bundle.indexOf("function Uce()", start);
if (start < 0 || end < 0) throw new Error("Missing AI Doctor result function");
bundle = bundle.slice(0, start) + briefingFunction + bundle.slice(end);

replaceOnce(
  'd=Number.isFinite(u)?Math.max(0,Math.min(100,Math.round(u))):0,f=r?.businessHealth?.lowersScore?.[0]??',
  'd=Number.isFinite(u)?Math.max(0,Math.min(100,Math.round(u))):0,bdHomeDiagnosisConfidence=Number(r?.businessHealth?.confidencePercent),bdHomeDiagnosisPeriod=r?.briefing?.diagnosis?.periodLabel,f=r?.briefing?.diagnosis?.fact??r?.businessHealth?.lowersScore?.[0]??',
  "Home canonical diagnosis binding",
);
replaceOnce(
  'h="Достоверность "+d+"%",g=a===null?',
  'h="Достоверность диагноза "+(Number.isFinite(bdHomeDiagnosisConfidence)?Math.round(bdHomeDiagnosisConfidence):"—")+"%"+(bdHomeDiagnosisPeriod?" · "+bdHomeDiagnosisPeriod:""),g=a===null?',
  "Home canonical confidence",
);

writeFileSync(bundlePath, bundle);
console.log("Installed AI Doctor briefing-first v253");
