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

if (bundle.includes('bdAIDoctorFollowThroughVersion="attention-v197"')) {
  console.log("AI Doctor follow-through v197 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdAIDoctorAttentionVersion="attention-v196",IC="bd_ai_diagnosis_v9";',
  'bdAIDoctorAttentionVersion="attention-v196",bdAIDoctorFollowThroughVersion="attention-v197",IC="bd_ai_diagnosis_v9";',
  "AI Doctor follow-through version marker",
);

const home = String.raw`function bdHomeFreshAi({diagnosis:e,health:t,latestDataAt:n,onNavigate:r}){const a=!!e&&t.hasEnoughData&&t.coveragePercent>=60&&Number(e.cachedAt||0)>=n,s=e?.data?.attention,l=Array.isArray(s?.priorities)?s.priorities[0]:e?.data?.actions?.[0],u=Array.isArray(s?.opportunities)?s.opportunities[0]:null,d=Number(s?.counts?.requiresAttention??e?.data?.actions?.length??0),f=bdHomeTextV151(l?.title)||(!s?bdHomeTextV151(e?.data?.topPriority?.title):""),m=bdHomeTextV151(u?.title),h=l??u,p=bdHomeTextV151(h?.hypothesis)||bdHomeTextV151(h?.whyImportant)||bdHomeTextV151(h?.consequence)||bdHomeTextV151(s?.diagnosticSentence)||bdHomeTextV151(e?.data?.summary),g=e?f?"Главный риск: "+f:m?"Главная возможность: "+m:"Новых срочных действий нет":"Анализ ещё не запускался",y=e?p||(a?"Ключевые показатели проверены.":"Данные изменились — обновите анализ."):"Запустите AI Doctor, чтобы получить приоритетное действие.";return i.jsxs(W.section,{"data-bd-home-ai":"attention-v197",className:"bd-home-ai bd-home-ai-v196",initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.34,delay:.08},children:[i.jsxs("div",{className:"bd-home-ai-main",children:[i.jsx("span",{className:"bd-home-ai-mark","aria-hidden":!0,children:"AI"}),i.jsxs("div",{className:"bd-home-ai-copy",children:[i.jsx("p",{className:"bd-home-ai-kicker",children:"AI Doctor"}),i.jsx("h2",{children:g}),i.jsx("p",{className:"bd-home-ai-effect",children:y}),e&&d>0&&i.jsxs("strong",{className:"bd-home-ai-count",children:[d," ",d===1?"действие требует":"действия требуют"," внимания"]})]}),i.jsx(Br,{size:18,className:"bd-home-ai-chevron","aria-hidden":!0})]}),i.jsx("button",{type:"button",onClick:()=>r("/analysis"),className:"bd-home-ai-action",children:e?"Открыть AI Doctor":"Запустить анализ"})]})}
`;

replaceBetween(
  "function bdHomeFreshAi(",
  "async function bdHomeLoadOpportunitiesV151(",
  home,
  "Home AI risk/opportunity state",
);

replaceOnce(
  'r.map((u,d)=>i.jsxs("p",{children:[u.label??u.source,u.observedAt?" · "+bdAIDoctorDateV196(u.observedAt):""]},u.id??d))',
  'r.map((u,d)=>i.jsxs("p",{children:[u.label??u.source,u.fact?" — "+u.fact:"",u.observedAt?" · "+bdAIDoctorDateV196(u.observedAt):""]},u.id??d))',
  "AI Doctor source facts",
);

const result = String.raw`function bdAIDoctorCompactCardV197({item:e,kind:t,mode:n,runAt:r}){const a=bdCurrentTasks().find(s=>!s.hidden&&(s.id===e.linkedTaskId||s.recommendationId===e.recommendationId)),l=n==="in_progress"||n==="opportunity",u=a?a.approvalStatus==="pending"?"Открыть предложение":"Открыть задачу":n==="opportunity"?"Подготовить задачу":null;return i.jsxs("article",{className:"bd-ai-compact-card",children:[i.jsxs("div",{className:"bd-ai-compact-row",children:[i.jsxs("div",{children:[i.jsx("span",{className:"bd-ai-compact-kind",children:t}),i.jsx("h3",{children:e.title}),i.jsx("p",{children:e.consequence??e.qualityImpact??e.hypothesis??e.fact})]}),e.responsibleRole&&i.jsxs("small",{children:[e.responsibleRole,e.deadline?" · "+e.deadline:""]})]}),l&&u&&i.jsx("button",{type:"button",className:"bd-ai-compact-action",onClick:()=>a?bdAIDoctorOpenTaskV196(a):bdAIDoctorPrepareTaskV196(e,r),children:u})]})}
function bdAIDoctorSectionV197({title:e,count:t,items:n,kind:r,mode:a,runAt:s}){return n?.length?i.jsxs("section",{className:"bd-ai-section",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:e}),t!=null&&i.jsx("span",{children:t})]}),i.jsx("div",{className:"bd-ai-compact-grid",children:n.map((l,u)=>i.jsx(bdAIDoctorCompactCardV197,{item:l,kind:r,mode:a,runAt:s},l.recommendationId??u))})]}):null}
function Fce({data:e,generatedAt:t,onRefresh:n}){const r=e.attention??{},a=Array.isArray(r.priorities)?r.priorities:Array.isArray(e.actions)?e.actions.slice(0,3):[],s=Array.isArray(r.inProgress)?r.inProgress:[],l=Array.isArray(r.opportunities)?r.opportunities:[],u=Array.isArray(r.dataQuality?.items)?r.dataQuality.items:[],d=Array.isArray(r.history)?r.history:[],f=r.counts??{requiresAttention:a.length,critical:a.filter(b=>b.priority==="critical").length,important:a.filter(b=>b.priority==="high").length,stable:0,moreSignals:0},m=new Date(t),h=Number.isNaN(m.getTime())?"Время обновления неизвестно":"Обновлено "+m.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})+" в "+m.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});return i.jsxs("div",{"data-bd-ai-result":"attention-v197","data-bd-ai-attention":"manager-v197",className:"bd-ai-doctor-v196",children:[i.jsxs("section",{className:"bd-ai-overview",children:[i.jsxs("div",{className:"bd-ai-overview-head",children:[i.jsxs("div",{children:[i.jsx("p",{children:"AI Doctor"}),i.jsxs("h2",{children:["Требуют внимания: ",f.requiresAttention??a.length]})]}),i.jsx("span",{className:"bd-ai-overview-mark","aria-hidden":!0,children:"AI"})]}),i.jsxs("div",{className:"bd-ai-status-row",children:[i.jsxs("span",{className:"critical",children:[f.critical??0," критично"]}),i.jsxs("span",{className:"important",children:[f.important??0," важно"]}),i.jsxs("span",{className:"stable",children:[f.stable??0," стабильно"]})]}),i.jsx("p",{className:"bd-ai-diagnostic",children:r.diagnosticSentence??e.summary}),i.jsx("small",{children:h})]}),i.jsxs("section",{className:"bd-ai-section bd-ai-now",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:"Что делать сейчас"}),i.jsx("span",{children:"TOP-3"})]}),a.length?i.jsx("div",{className:"bd-ai-priority-grid",children:a.slice(0,3).map((b,N)=>i.jsx(bdAIDoctorPriorityCardV196,{item:b,runAt:t},b.recommendationId??N))}):i.jsx("div",{className:"bd-ai-empty",children:"Новых проблем, требующих немедленного действия, не найдено."}),Number(f.moreSignals)>0&&i.jsxs("p",{className:"bd-ai-more",children:["Ещё ",f.moreSignals," сигналов — они учтены в приоритизации"]})]}),i.jsx(bdAIDoctorSectionV197,{title:"В работе",count:s.length,items:s,kind:"Уже принято",mode:"in_progress",runAt:t}),i.jsx(bdAIDoctorSectionV197,{title:"Возможности",count:l.length,items:l,kind:"Потенциал",mode:"opportunity",runAt:t}),i.jsxs("section",{className:"bd-ai-section bd-ai-data-quality",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:"Качество данных"}),i.jsxs("span",{children:["Достоверность ",r.dataQuality?.reliabilityPercent??e.confidence?.percent??"—","%"]})]}),u.length?i.jsx("div",{className:"bd-ai-compact-grid",children:u.map((b,N)=>i.jsx(bdAIDoctorCompactCardV197,{item:b,kind:"Мешает анализу",mode:"data_quality",runAt:t},b.recommendationId??N))}):i.jsx("div",{className:"bd-ai-empty",children:"Критичных пробелов данных не найдено."}),u.length>0&&i.jsx("button",{type:"button",className:"bd-ai-secondary-action",onClick:()=>window.location.assign("/data-control"),children:"Улучшить данные"})]}),e.financialAssessment&&i.jsxs("details",{className:"bd-ai-finance-details",children:[i.jsxs("summary",{children:["Финансовый контекст",i.jsx("small",{children:"Подробнее"})]}),i.jsx(bdDiagnosisFinancialCardV48,{value:e.financialAssessment})]}),d.length>0&&i.jsxs("details",{className:"bd-ai-history",children:[i.jsxs("summary",{children:["История AI Doctor",i.jsxs("small",{children:[d.length," решений"]})]}),i.jsx("div",{className:"bd-ai-history-list",children:d.map((b,N)=>i.jsxs("article",{children:[i.jsxs("div",{children:[i.jsx("strong",{children:b.title}),i.jsx("span",{children:bdAIDoctorLifecycleLabelsV196[b.lifecycle]??b.lifecycle})]}),i.jsxs("small",{children:[b.decidedAt,b.responsible?" · "+b.responsible:""]}),b.outcomeSummary&&i.jsx("p",{children:b.outcomeSummary})]},b.recommendationId??N))})]}),i.jsx("button",{type:"button",onClick:n,className:"bd-ai-refresh",children:"Обновить анализ"})]})}
`;

replaceBetween(
  "function bdAIDoctorCompactCardV196(",
  "function Uce(",
  result,
  "AI Doctor follow-through sections",
);

writeFileSync(bundlePath, bundle);
console.log("Installed AI Doctor follow-through v197");
