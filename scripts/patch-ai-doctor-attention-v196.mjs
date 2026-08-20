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

if (bundle.includes('bdAIDoctorAttentionVersion="attention-v196"')) {
  console.log("AI Doctor attention v196 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdRecommendationConfidenceVersion="confidence-reason-v51",IC="bd_ai_diagnosis_v9";',
  'bdRecommendationConfidenceVersion="confidence-reason-v51",bdAIDoctorAttentionVersion="attention-v196",IC="bd_ai_diagnosis_v9";',
  "AI Doctor version marker",
);

const home = String.raw`function bdHomeFreshAi({diagnosis:e,health:t,latestDataAt:n,onNavigate:r}){const a=!!e&&t.hasEnoughData&&t.coveragePercent>=60&&Number(e.cachedAt||0)>=n,s=e?.data?.attention,l=Array.isArray(s?.priorities)?s.priorities[0]:e?.data?.actions?.[0],u=Number(s?.counts?.requiresAttention??e?.data?.actions?.length??0),d=bdHomeTextV151(l?.title)||bdHomeTextV151(e?.data?.topPriority?.title),f=bdHomeTextV151(l?.hypothesis)||bdHomeTextV151(l?.whyImportant)||bdHomeTextV151(e?.data?.summary),m=e?d?"Главный риск: "+d:"Новых срочных действий нет":"Анализ ещё не запускался",h=e?f||(a?"Ключевые показатели проверены.":"Данные изменились — обновите анализ."):"Запустите AI Doctor, чтобы получить приоритетное действие.";return i.jsxs(W.section,{"data-bd-home-ai":"attention-v196",className:"bd-home-ai bd-home-ai-v196",initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.34,delay:.08},children:[i.jsxs("div",{className:"bd-home-ai-main",children:[i.jsx("span",{className:"bd-home-ai-mark","aria-hidden":!0,children:"AI"}),i.jsxs("div",{className:"bd-home-ai-copy",children:[i.jsx("p",{className:"bd-home-ai-kicker",children:"AI Doctor"}),i.jsx("h2",{children:m}),i.jsx("p",{className:"bd-home-ai-effect",children:h}),e&&i.jsxs("strong",{className:"bd-home-ai-count",children:[u," ",u===1?"действие требует":"действия требуют"," внимания"]})]}),i.jsx(Br,{size:18,className:"bd-home-ai-chevron","aria-hidden":!0})]}),i.jsx("button",{type:"button",onClick:()=>r("/analysis"),className:"bd-home-ai-action",children:e?"Открыть AI Doctor":"Запустить анализ"})]})}
`;

replaceBetween(
  "function bdHomeFreshAi(",
  "async function bdHomeLoadOpportunitiesV151(",
  home,
  "compact Home AI card",
);

const result = String.raw`const bdAIDoctorLifecycleLabelsV196={new:"Новая",accepted:"Принята",in_progress:"В работе",verify_result:"Проверить результат",closed:"Закрыта",rejected:"Отклонена",overdue:"Просрочено"};
function bdAIDoctorPriorityLabelV196(e){return e==="critical"?"Критично":e==="high"?"Важно":e==="low"?"Планово":"Требует внимания"}
function bdAIDoctorDateV196(e){if(!e)return"Срок не задан";const t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}
function bdAIDoctorOpenTaskV196(e){window.location.assign("/tasks?tab="+bdTaskView(e))}
function bdAIDoctorPrepareTaskV196(e,t){const n=bdCurrentTasks(),r=n.find(a=>!a.hidden&&a.recommendationId===e.recommendationId);if(r){bdAIDoctorOpenTaskV196(r);return}const a=new Date().toISOString(),s=bdRecommendationTaskFields(e,t),l=bdNormalizeTask({...s,id:yue(),approvalStatus:"pending",approvedAt:void 0,status:"not_started",statusHistory:[{status:"proposed",at:a,by:"AI Doctor"}],createdAt:a,updatedAt:a});bdSaveTasks([l,...n]),window.location.assign("/tasks?tab=proposed")}
function bdAIDoctorSourcesV196(e){return Array.isArray(e?.dataSources)&&e.dataSources.length?e.dataSources:Array.isArray(e?.evidence)?e.evidence:[]}
function bdAIDoctorPriorityCardV196({item:e,runAt:t}){const n=bdCurrentTasks().find(u=>!u.hidden&&u.recommendationId===e.recommendationId),r=bdAIDoctorSourcesV196(e),a=e.priorityBreakdown??{},s=Array.isArray(e.impactAreas)?e.impactAreas:[],l=bdAIDoctorLifecycleLabelsV196[e.lifecycle]??bdAIDoctorLifecycleLabelsV196.new;return i.jsxs("article",{"data-bd-ai-priority":e.issueKey,className:"bd-ai-priority-card "+(e.criticalOverride?"is-critical":""),children:[i.jsxs("div",{className:"bd-ai-priority-meta",children:[i.jsxs("span",{className:"bd-ai-priority-level "+(e.priority??"medium"),children:[bdAIDoctorPriorityLabelV196(e.priority)," · ",e.whyNow??e.deadline??"в текущем цикле"]}),i.jsx("span",{className:"bd-ai-lifecycle",children:l})]}),i.jsx("h3",{children:e.title}),Number(e.signalCount)>1&&i.jsxs("p",{className:"bd-ai-confirmation",children:["Подтверждается ",e.signalCount," сигналами"]}),i.jsx("p",{className:"bd-ai-reason",children:e.hypothesis??e.whyImportant??e.consequence??e.fact}),e.resultMessage&&i.jsx("p",{className:"bd-ai-result-message",children:e.resultMessage}),i.jsxs("dl",{className:"bd-ai-owner-grid",children:[i.jsxs("div",{children:[i.jsx("dt",{children:"Ответственный"}),i.jsx("dd",{children:e.responsibleRole??"Управляющий"})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Срок"}),i.jsx("dd",{children:e.deadline??"Не задан"})]})]}),i.jsxs("div",{className:"bd-ai-check",children:[i.jsx("strong",{children:"Проверка: "}),e.resolutionCheck??e.successCriterion??e.expectedResult??"Результат подтверждён в данных BarDoctor."]}),s.length>0&&i.jsx("div",{className:"bd-ai-impact-list",children:s.map(u=>i.jsx("span",{children:u},u))}),i.jsxs("p",{className:"bd-ai-risk",children:["Риск бездействия: ",i.jsx("b",{children:e.riskWithoutAction??"средний"})]}),i.jsx("p",{className:"bd-ai-financial-effect",children:e.financialEffect??"Финансовый эффект пока нельзя надёжно оценить."}),i.jsxs("details",{className:"bd-ai-why",children:[i.jsxs("summary",{children:["Почему?",i.jsxs("small",{children:[r.length," ",r.length===1?"источник":"источника"]})]}),i.jsxs("div",{className:"bd-ai-why-body",children:[i.jsxs("p",{children:[i.jsx("b",{children:"Факт: "}),e.fact??e.basisSummary??"Требует проверки"]}),i.jsxs("p",{children:[i.jsx("b",{children:"Причина: "}),e.hypothesis??"Возможная гипотеза"]}),i.jsxs("p",{children:[i.jsx("b",{children:"Подтверждённость: "}),e.confirmationLevel??bdRecommendationConfidenceLabel(e.hypothesisConfidence),e.confidenceScore!=null?" · "+e.confidenceScore+"%":""]}),e.confidenceReason&&i.jsxs("p",{children:[i.jsx("b",{children:"Почему такая уверенность: "}),e.confidenceReason]}),r.length>0&&i.jsxs("div",{className:"bd-ai-source-list",children:[i.jsxs("p",{children:[i.jsx("b",{children:"Источники: "}),r.length]}),r.map((u,d)=>i.jsxs("p",{children:[u.label??u.source,u.observedAt?" · "+bdAIDoctorDateV196(u.observedAt):""]},u.id??d))]}),i.jsxs("div",{className:"bd-ai-score",children:[i.jsxs("span",{children:["Влияние ",a.impact??"—","/30"]}),i.jsxs("span",{children:["Срочность ",a.urgency??"—","/20"]}),i.jsxs("span",{children:["Подтверждение ",a.confirmation??"—","/20"]}),i.jsxs("span",{children:["Масштаб ",a.scale??"—","/10"]}),i.jsxs("span",{children:["Управляемость ",a.actionability??"—","/10"]}),i.jsxs("span",{children:["Повторяемость ",a.recurrence??"—","/10"]})]})]})]}),i.jsx("button",{type:"button",className:"bd-ai-task-action",onClick:()=>n?bdAIDoctorOpenTaskV196(n):bdAIDoctorPrepareTaskV196(e,t),children:n?n.approvalStatus==="pending"?"Открыть предложение":"Открыть задачу":"Подготовить задачу"})]})}
function bdAIDoctorCompactCardV196({item:e,kind:t}){return i.jsxs("article",{className:"bd-ai-compact-card",children:[i.jsxs("div",{children:[i.jsx("span",{className:"bd-ai-compact-kind",children:t}),i.jsx("h3",{children:e.title}),i.jsx("p",{children:e.consequence??e.qualityImpact??e.hypothesis??e.fact})]}),e.responsibleRole&&i.jsxs("small",{children:[e.responsibleRole,e.deadline?" · "+e.deadline:""]})]})}
function bdAIDoctorSectionV196({title:e,count:t,items:n,kind:r}){return n?.length?i.jsxs("section",{className:"bd-ai-section",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:e}),t!=null&&i.jsx("span",{children:t})]}),i.jsx("div",{className:"bd-ai-compact-grid",children:n.map((a,s)=>i.jsx(bdAIDoctorCompactCardV196,{item:a,kind:r},a.recommendationId??s))})]}):null}
function Fce({data:e,generatedAt:t,onRefresh:n}){const r=e.attention??{},a=Array.isArray(r.priorities)?r.priorities:Array.isArray(e.actions)?e.actions.slice(0,3):[],s=Array.isArray(r.inProgress)?r.inProgress:[],l=Array.isArray(r.opportunities)?r.opportunities:[],u=Array.isArray(r.dataQuality?.items)?r.dataQuality.items:[],d=Array.isArray(r.history)?r.history:[],f=r.counts??{requiresAttention:a.length,critical:a.filter(b=>b.priority==="critical").length,important:a.filter(b=>b.priority==="high").length,stable:0,moreSignals:0},m=new Date(t),h=Number.isNaN(m.getTime())?"Время обновления неизвестно":"Обновлено "+m.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})+" в "+m.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});return i.jsxs("div",{"data-bd-ai-result":"attention-v196","data-bd-ai-attention":"manager-v196",className:"bd-ai-doctor-v196",children:[i.jsxs("section",{className:"bd-ai-overview",children:[i.jsxs("div",{className:"bd-ai-overview-head",children:[i.jsxs("div",{children:[i.jsx("p",{children:"AI Doctor"}),i.jsxs("h2",{children:["Требуют внимания: ",f.requiresAttention??a.length]})]}),i.jsx("span",{className:"bd-ai-overview-mark","aria-hidden":!0,children:"AI"})]}),i.jsxs("div",{className:"bd-ai-status-row",children:[i.jsxs("span",{className:"critical",children:[f.critical??0," критично"]}),i.jsxs("span",{className:"important",children:[f.important??0," важно"]}),i.jsxs("span",{className:"stable",children:[f.stable??0," стабильно"]})]}),i.jsx("p",{className:"bd-ai-diagnostic",children:r.diagnosticSentence??e.summary}),i.jsx("small",{children:h})]}),i.jsxs("section",{className:"bd-ai-section bd-ai-now",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:"Что делать сейчас"}),i.jsx("span",{children:"TOP-3"})]}),a.length?i.jsx("div",{className:"bd-ai-priority-grid",children:a.slice(0,3).map((b,N)=>i.jsx(bdAIDoctorPriorityCardV196,{item:b,runAt:t},b.recommendationId??N))}):i.jsx("div",{className:"bd-ai-empty",children:"Новых проблем, требующих немедленного действия, не найдено."}),Number(f.moreSignals)>0&&i.jsxs("p",{className:"bd-ai-more",children:["Ещё ",f.moreSignals," сигналов — они учтены в приоритизации"]})]}),i.jsx(bdAIDoctorSectionV196,{title:"В работе",count:s.length,items:s,kind:"Уже принято"}),i.jsx(bdAIDoctorSectionV196,{title:"Возможности",count:l.length,items:l,kind:"Потенциал"}),i.jsxs("section",{className:"bd-ai-section bd-ai-data-quality",children:[i.jsxs("div",{className:"bd-ai-section-head",children:[i.jsx("h2",{children:"Качество данных"}),i.jsxs("span",{children:["Достоверность ",r.dataQuality?.reliabilityPercent??e.confidence?.percent??"—","%"]})]}),u.length?i.jsx("div",{className:"bd-ai-compact-grid",children:u.map((b,N)=>i.jsx(bdAIDoctorCompactCardV196,{item:b,kind:"Мешает анализу"},b.recommendationId??N))}):i.jsx("div",{className:"bd-ai-empty",children:"Критичных пробелов данных не найдено."}),u.length>0&&i.jsx("button",{type:"button",className:"bd-ai-secondary-action",onClick:()=>window.location.assign("/data-control"),children:"Улучшить данные"})]}),e.financialAssessment&&i.jsxs("details",{className:"bd-ai-finance-details",children:[i.jsxs("summary",{children:["Финансовый контекст",i.jsx("small",{children:"Подробнее"})]}),i.jsx(bdDiagnosisFinancialCardV48,{value:e.financialAssessment})]}),d.length>0&&i.jsxs("details",{className:"bd-ai-history",children:[i.jsxs("summary",{children:["История AI Doctor",i.jsxs("small",{children:[d.length," решений"]})]}),i.jsx("div",{className:"bd-ai-history-list",children:d.map((b,N)=>i.jsxs("article",{children:[i.jsxs("div",{children:[i.jsx("strong",{children:b.title}),i.jsx("span",{children:bdAIDoctorLifecycleLabelsV196[b.lifecycle]??b.lifecycle})]}),i.jsxs("small",{children:[b.decidedAt,b.responsible?" · "+b.responsible:""]}),b.outcomeSummary&&i.jsx("p",{children:b.outcomeSummary})]},b.recommendationId??N))})]}),i.jsx("button",{type:"button",onClick:n,className:"bd-ai-refresh",children:"Обновить анализ"})]})}
`;

replaceBetween("function Fce(", "function Uce(", result, "AI Doctor result information architecture");

const analysisStart = bundle.indexOf("function Uce(");
const analysisEnd = bundle.indexOf("const Vce=", analysisStart);
if (analysisStart < 0 || analysisEnd < 0) throw new Error("Missing AI Doctor page");
let analysisPage = bundle.slice(analysisStart, analysisEnd);
analysisPage = analysisPage.replace('children:"AI Доктор"', 'children:"AI Doctor"');
analysisPage = analysisPage.replace('"Обновить"]})', '"Обновить анализ"]})');
if (!analysisPage.includes('children:"AI Doctor"') || !analysisPage.includes('"Обновить анализ"]})')) {
  throw new Error("Could not update AI Doctor header labels");
}
bundle = bundle.slice(0, analysisStart) + analysisPage + bundle.slice(analysisEnd);

replaceOnce(
  'bdTaskStatus(j)!=="cancelled"&&v&&v<=g',
  'bdTaskStatus(j)==="completed"&&v&&v<=g',
  "outcome checks only after task completion",
);

writeFileSync(bundlePath, bundle);
console.log("Installed AI Doctor attention v196");
