import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");

const versionMarker = 'bdRecommendationOutcomeVersion="recommendation-outcomes-v50"';
if (bundle.includes(versionMarker)) {
  console.log("Recommendation outcome workflow v50 is already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

function replaceBetween(startMarker, endMarker, replacement, label) {
  const start = bundle.indexOf(startMarker);
  if (start === -1) throw new Error(`${label}: start marker not found`);
  const end = bundle.indexOf(endMarker, start);
  if (end === -1) throw new Error(`${label}: end marker not found`);
  bundle = bundle.slice(0, start) + replacement + bundle.slice(end);
}

replaceOnce(
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",bdDiagnosisFinancialCoreVersion="closed-month-management-v48",bdDiagnosisFinancialFOTVersion="financial-fot-v49",IC="bd_ai_diagnosis_v8";',
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",bdDiagnosisFinancialCoreVersion="closed-month-management-v48",bdDiagnosisFinancialFOTVersion="financial-fot-v49",bdRecommendationOutcomeVersion="recommendation-outcomes-v50",IC="bd_ai_diagnosis_v9";',
  "diagnosis cache and workflow version",
);

const helpers = String.raw`function bdSaveTasks(e){return qr(bdTasksStoreKey,bdNormalizeTasks(e))}
function bdRecommendationFormatMetric(e){if(!e)return"Нет измеримого показателя";const t=Number(e.value),n=Number.isFinite(t)?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(t):"—",r=e.unit==="percent"?"%":e.unit==="rating"?" / 5":e.unit==="currency"?" ден. ед.":"";return(e.label??"Показатель")+": "+n+r}
function bdRecommendationConfidenceLabel(e){return e==="high"?"Высокая":e==="medium"?"Средняя":"Низкая"}
function bdRecommendationOutcomeMeta(e){return e==="helped"?{label:"Помогло",color:"#168153",bg:"#ECF9F3"}:e==="not_helped"?{label:"Не помогло",color:"#C62F43",bg:"#FFF0F2"}:e==="insufficient_data"?{label:"Недостаточно данных",color:"#9A6700",bg:"#FFF8E7"}:{label:"Ожидает проверки",color:"#5754D8",bg:"#F3F3FF"}}
function bdRecommendationTaskFields(e,t){const n=new Date().toISOString(),r=bdTaskDueDate({dueDate:e.verificationDate??e.deadline??e.estimatedTime})??qoe(e.estimatedTime),a=r?r<kM()?"overdue":r===kM()?"today":"week":"week";return{title:e.title,description:e.action??e.expectedResult??"",category:"AI",priority:e.priority??"medium",deadline:r??e.verificationDate??e.deadline??"Без срока",responsible:e.responsibleRole??"Не назначен",responsibleRole:e.responsibleRole??"Не назначен",tab:a,status:"not_started",approvalStatus:"approved",approvedAt:n,aiGenerated:!0,aiDiagnosisDate:String(t??n).slice(0,10),aiRunId:t??n,recommendationId:e.recommendationId,evidence:e.evidence??[],basisSummary:e.basisSummary,expectedResult:e.expectedResult,steps:e.steps??[],fact:e.fact,factPeriod:e.factPeriod,dataSources:e.dataSources??[],hypothesis:e.hypothesis,hypothesisConfidence:e.hypothesisConfidence,confidenceReason:e.confidenceReason,consequence:e.consequence,action:e.action??e.title,baselineMetric:e.baselineMetric??null,targetMetric:e.targetMetric??null,verificationDate:e.verificationDate??r,actualResult:e.actualResult??null,outcomeStatus:e.outcomeStatus??"pending",recommendationContractVersion:e.recommendationContractVersion??"result-loop-v1",statusHistory:[{status:"approved",at:n,by:"Пользователь"}],createdAt:n,updatedAt:n}}
function bdRecommendationToTask(e,t){const n=bdCurrentTasks(),r=bdRecommendationTaskFields(e,t),a=n.findIndex(s=>!s.hidden&&s.recommendationId===e.recommendationId&&(s.aiRunId===t||!s.aiRunId));let s,l;if(a>=0){s=bdNormalizeTask({...n[a],...r,id:n[a].id,createdAt:n[a].createdAt??r.createdAt,status:bdTaskClosedStatuses.has(bdTaskStatus(n[a]))?n[a].status:"not_started",actualResult:n[a].actualResult??r.actualResult,outcomeStatus:n[a].outcomeStatus??r.outcomeStatus}),l=n.map((u,d)=>d===a?s:u)}else s=bdNormalizeTask({...r,id:yue()}),l=[s,...n];bdSaveTasks(l),window.location.assign("/tasks?tab="+bdTaskView(s))}
async function bdCheckRecommendationOutcomes(e){const t=await fetch("/api/recommendations/check",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({recommendations:e.slice(0,20)})}),n=await t.json();if(!t.ok||n?.success!==!0)throw new Error(n?.error??"Не удалось проверить рекомендации");return Array.isArray(n.outcomes)?n.outcomes:[]}
function bdRecommendationContractCard({task:e}){const t=e.actualResult,n=bdRecommendationOutcomeMeta(t?.status??e.outcomeStatus),r=Array.isArray(e.dataSources)&&e.dataSources.length?e.dataSources:e.evidence??[];return i.jsxs("details",{"data-bd-recommendation-contract":"result-loop-v50",open:!!t&&t.status!=="insufficient_data",style:{marginTop:12,borderRadius:14,padding:"0 12px",background:"#F7F8FB",border:"1px solid #E8E9EF"},children:[i.jsxs("summary",{style:{cursor:"pointer",minHeight:44,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,listStyle:"none"},children:[i.jsx("strong",{style:{fontSize:11.5,color:"#383D52"},children:"Контроль результата"}),i.jsx("span",{style:{flex:"0 0 auto",borderRadius:999,padding:"4px 7px",background:n.bg,color:n.color,fontSize:9.5,fontWeight:850},children:n.label})]}),i.jsxs("div",{style:{display:"grid",gap:8,padding:"0 0 12px",borderTop:"1px solid #E5E7EE"},children:[e.fact&&i.jsxs("p",{style:{margin:"10px 0 0",fontSize:11,lineHeight:1.45,color:"#5B6073"},children:[i.jsx("b",{style:{color:"#303548"},children:"Факт: "}),e.fact,e.factPeriod?" · "+e.factPeriod:""]}),r.length>0&&i.jsxs("p",{style:{margin:0,fontSize:10.5,lineHeight:1.4,color:"#777C8E"},children:[i.jsx("b",{children:"Источник: "}),r.map(a=>a.label??a.source).filter(Boolean).join(", ")]}),e.hypothesis&&i.jsxs("p",{style:{margin:0,fontSize:11,lineHeight:1.45,color:"#5B6073"},children:[i.jsx("b",{style:{color:"#303548"},children:"Гипотеза: "}),e.hypothesis," · ",bdRecommendationConfidenceLabel(e.hypothesisConfidence)," уверенность"]}),e.consequence&&i.jsxs("p",{style:{margin:0,fontSize:11,lineHeight:1.45,color:"#5B6073"},children:[i.jsx("b",{style:{color:"#303548"},children:"Последствия: "}),e.consequence]}),i.jsxs("div",{style:{display:"grid",gap:5,padding:"9px 10px",borderRadius:11,background:"#FFFFFF",border:"1px solid #E4E6ED"},children:[i.jsx("span",{style:{fontSize:10.5,color:"#62687C"},children:"Исходный · "+bdRecommendationFormatMetric(e.baselineMetric)}),i.jsx("span",{style:{fontSize:10.5,color:"#62687C"},children:"Цель · "+bdRecommendationFormatMetric(e.targetMetric)}),i.jsx("span",{style:{fontSize:10.5,color:"#62687C"},children:"Проверка · "+(e.verificationDate??e.deadline??"Срок не задан")}),t?.actualMetric&&i.jsx("span",{style:{fontSize:10.5,fontWeight:800,color:n.color},children:"Факт · "+bdRecommendationFormatMetric(t.actualMetric)})]}),t?.summary&&i.jsx("p",{style:{margin:0,padding:"9px 10px",borderRadius:11,background:n.bg,color:n.color,fontSize:11,fontWeight:750,lineHeight:1.4},children:t.summary})]})]})}
const yue=()=>crypto.randomUUID(),vue=bdCurrentTasks();`;

replaceOnce(
  'function bdSaveTasks(e){return qr(bdTasksStoreKey,bdNormalizeTasks(e))}\nconst yue=()=>crypto.randomUUID(),vue=bdCurrentTasks();',
  helpers,
  "recommendation task helpers",
);

replaceOnce(
  'basisSummary:e.basisSummary,requiresVerification:!!e.requiresVerification,source:"ai_doctor"',
  'basisSummary:e.basisSummary,fact:e.fact,factPeriod:e.factPeriod,dataSources:e.dataSources??[],hypothesis:e.hypothesis,hypothesisConfidence:e.hypothesisConfidence,confidenceReason:e.confidenceReason,consequence:e.consequence,action:e.action,baselineMetric:e.baselineMetric??null,targetMetric:e.targetMetric??null,verificationDate:e.verificationDate,actualResult:e.actualResult??null,outcomeStatus:e.outcomeStatus??"pending",recommendationContractVersion:e.recommendationContractVersion??"result-loop-v1",requiresVerification:!!e.requiresVerification,source:"ai_doctor"',
  "action-plan recommendation contract",
);

replaceOnce(
  'basisSummary:U.basisSummary,expectedResult:U.expectedResult,statusHistory:[{status:"proposed",at:T}]',
  'basisSummary:U.basisSummary,expectedResult:U.expectedResult,steps:U.steps??[],fact:U.fact,factPeriod:U.factPeriod,dataSources:U.dataSources??[],hypothesis:U.hypothesis,hypothesisConfidence:U.hypothesisConfidence,confidenceReason:U.confidenceReason,consequence:U.consequence,action:U.action??U.title,baselineMetric:U.baselineMetric??null,targetMetric:U.targetMetric??null,verificationDate:U.verificationDate??bdDue,actualResult:U.actualResult??null,outcomeStatus:U.outcomeStatus??"pending",recommendationContractVersion:U.recommendationContractVersion??"result-loop-v1",statusHistory:[{status:"proposed",at:T}]',
  "generated task recommendation contract",
);

replaceOnce(
  'basisSummary:T.basisSummary,expectedResult:T.expectedResult,statusHistory:[{status:"proposed",at:N}]',
  'basisSummary:T.basisSummary,expectedResult:T.expectedResult,steps:T.steps??[],fact:T.fact,factPeriod:T.factPeriod,dataSources:T.dataSources??[],hypothesis:T.hypothesis,hypothesisConfidence:T.hypothesisConfidence,confidenceReason:T.confidenceReason,consequence:T.consequence,action:T.action??T.title,baselineMetric:T.baselineMetric??null,targetMetric:T.targetMetric??null,verificationDate:T.verificationDate??z,actualResult:T.actualResult??null,outcomeStatus:T.outcomeStatus??"pending",recommendationContractVersion:T.recommendationContractVersion??"result-loop-v1",statusHistory:[{status:"proposed",at:N}]',
  "hydrated task recommendation contract",
);

replaceOnce(
  'bdTaskHydratedRef=S.useRef(!1);',
  'bdTaskHydratedRef=S.useRef(!1),bdOutcomeCheckRef=S.useRef(!1);',
  "outcome check guard",
);

replaceOnce(
  '},[bdTaskCloudReady]);const u=bdTaskSort(n.filter(g=>bdTaskView(g)===e),e)',
  '},[bdTaskCloudReady]);S.useEffect(()=>{if(!bdTaskCloudReady||!bdTaskHydratedRef.current||bdOutcomeCheckRef.current)return;const g=kM(),y=n.filter(j=>{const v=bdTaskDueDate({dueDate:j.verificationDate??j.deadline}),b=j.actualResult?.status,N=String(j.actualResult?.checkedAt??"").slice(0,10);return j.aiGenerated===!0&&j.approvalStatus==="approved"&&!j.hidden&&bdTaskStatus(j)!=="cancelled"&&v&&v<=g&&!(["helped","not_helped"].includes(b))&&N!==g});if(!y.length)return;bdOutcomeCheckRef.current=!0,bdCheckRecommendationOutcomes(y).then(j=>{j.length&&(r(v=>bdNormalizeTasks(v.map(b=>{const N=j.find(E=>E.taskId===b.id||!E.taskId&&E.recommendationId===b.recommendationId);return N?{...b,actualResult:N,outcomeStatus:N.status,outcomeCheckedAt:N.checkedAt,updatedAt:N.checkedAt}:b}))),j.slice(0,3).forEach(v=>{const b=bdRecommendationOutcomeMeta(v.status);l({variant:v.status==="helped"?"success":v.status==="not_helped"?"destructive":"default",title:"Проверка рекомендации: "+b.label.toLocaleLowerCase("ru"),description:v.summary})}))}).catch(()=>{}).finally(()=>{bdOutcomeCheckRef.current=!1})},[bdTaskCloudReady,n.length]);const u=bdTaskSort(n.filter(g=>bdTaskView(g)===e),e)',
  "automatic due-date outcome checks",
);

replaceOnce(
  ']}),!f&&i.jsx("p",{"data-bd-task-readonly":""',
  ']}),e.aiGenerated&&i.jsx(bdRecommendationContractCard,{task:e}),!f&&i.jsx("p",{"data-bd-task-readonly":""',
  "task outcome card",
);

const recommendationSection = String.raw`e.actions&&e.actions.length>0&&i.jsxs(W.div,{custom:6,variants:li,initial:"hidden",animate:"show","data-bd-ai-recommendations":"recommendation-outcomes-v50",style:{display:"flex",flexDirection:"column",gap:12},children:[i.jsxs("div",{style:{borderRadius:20,padding:"16px 17px",background:"linear-gradient(145deg,#F1F2FF 0%,#F8F8FF 100%)",border:"1px solid #DADCF8"},children:[i.jsx("p",{style:{margin:0,fontSize:11,fontWeight:850,letterSpacing:".09em",textTransform:"uppercase",color:"#5854D8"},children:"Рекомендации BarDoctor"}),i.jsx("p",{style:{margin:"6px 0 0",fontSize:13,lineHeight:1.45,color:"#5B6075"},children:"Каждая рекомендация теперь имеет исходную точку, цель и дату автоматической проверки результата."})]}),i.jsx("div",{style:{display:"grid",gap:12},children:e.actions.map((d,f)=>{const h=bdCurrentTasks().find(g=>!g.hidden&&g.recommendationId===d.recommendationId&&(g.aiRunId===t||!g.aiRunId)),g=h?.actualResult??d.actualResult,y=bdRecommendationOutcomeMeta(g?.status??d.outcomeStatus),j=Array.isArray(d.dataSources)&&d.dataSources.length?d.dataSources:d.evidence??[];return i.jsxs("article",{style:{minWidth:0,overflow:"hidden",borderRadius:20,padding:"17px",background:"#FFFFFF",border:"1px solid #E2E4EC",boxShadow:"0 7px 22px rgba(31,37,70,.055)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[i.jsx("span",{style:{fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:".06em",color:d.priority==="critical"?"#C62F43":d.priority==="high"?"#D56A18":"#5754C7"},children:d.priority==="critical"?"Критично":d.priority==="high"?"Высокий приоритет":d.priority==="low"?"Низкий приоритет":"Средний приоритет"}),i.jsx("span",{style:{maxWidth:"52%",fontSize:10,fontWeight:750,color:"#74798B",textAlign:"right",overflowWrap:"anywhere"},children:["Ответственный: ",d.responsibleRole??"Управляющий"]})]}),i.jsx("h3",{style:{margin:"9px 0 0",fontSize:16,lineHeight:1.35,fontWeight:850,color:"#171A29",overflowWrap:"anywhere"},children:d.title}),i.jsxs("div",{style:{display:"grid",gap:8,marginTop:11},children:[i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.47,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Факт: "}),d.fact??d.basisSummary,d.factPeriod?" · "+d.factPeriod:""]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.47,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Причина / гипотеза: "}),d.hypothesis??"Требует проверки",i.jsx("span",{style:{marginLeft:6,borderRadius:999,padding:"2px 6px",background:"#F3F3FF",color:"#5754D8",fontSize:9.5,fontWeight:800},children:bdRecommendationConfidenceLabel(d.hypothesisConfidence)+" уверенность"})]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.47,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Последствия: "}),d.consequence??d.expectedEffect??d.impact]})]}),d.steps&&d.steps.length>0&&i.jsxs("div",{style:{marginTop:12,borderRadius:14,padding:"12px 13px",background:"#F3F3FF",border:"1px solid #E0E1FA"},children:[i.jsx("p",{style:{margin:0,fontSize:10.5,fontWeight:850,letterSpacing:".06em",textTransform:"uppercase",color:"#5754D8"},children:"Действие"}),i.jsx("ol",{style:{display:"grid",gap:7,margin:"9px 0 0",paddingLeft:18},children:d.steps.map((A,k)=>i.jsx("li",{style:{paddingLeft:2,fontSize:11.5,lineHeight:1.45,color:"#4E546A",overflowWrap:"anywhere"},children:A},k))})]}),i.jsxs("div",{style:{display:"grid",gap:7,marginTop:12,padding:"11px 12px",borderRadius:14,background:"#F7F8FB",border:"1px solid #E8E9EF"},children:[i.jsx("p",{style:{margin:0,fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:".06em",color:"#777C8E"},children:"Контроль результата"}),i.jsx("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:"Исходный · "+bdRecommendationFormatMetric(d.baselineMetric)}),i.jsx("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:"Цель · "+bdRecommendationFormatMetric(d.targetMetric)}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:[i.jsx("b",{style:{color:"#303548"},children:"Проверка: "}),d.verificationDate??d.deadline??"Срок не задан"]}),g?.actualMetric&&i.jsx("p",{style:{margin:0,fontSize:11.5,fontWeight:800,color:y.color},children:"Факт · "+bdRecommendationFormatMetric(g.actualMetric)}),i.jsx("span",{style:{justifySelf:"start",borderRadius:999,padding:"4px 7px",background:y.bg,color:y.color,fontSize:9.5,fontWeight:850},children:y.label}),g?.summary&&i.jsx("p",{style:{margin:0,fontSize:11,lineHeight:1.45,color:y.color},children:g.summary})]}),j.length>0&&i.jsxs("details",{style:{marginTop:10,borderRadius:14,padding:"0 12px",background:"#FAFAFC",border:"1px solid #E8E9EF"},children:[i.jsxs("summary",{style:{cursor:"pointer",minHeight:42,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11.5,fontWeight:800,color:"#383D52"},children:["Источники данных",i.jsxs("small",{style:{fontSize:10,color:"#858A9A"},children:[j.length," · подробнее"]})]}),i.jsx("div",{style:{display:"grid",gap:8,padding:"0 0 11px",borderTop:"1px solid #ECEEF3"},children:j.map((A,k)=>i.jsxs("div",{style:{paddingTop:9},children:[i.jsx("strong",{style:{display:"block",fontSize:10.5,color:"#3E4356"},children:A.label??A.source}),A.observedAt&&i.jsx("small",{style:{display:"block",marginTop:3,fontSize:9.5,color:"#8A8F9F"},children:"Данные на "+String(A.observedAt).slice(0,10)})]},A.id??k))})]}),i.jsx("button",{type:"button",disabled:!!h,onClick:()=>bdRecommendationToTask(d,t),style:{width:"100%",minHeight:46,marginTop:12,border:0,borderRadius:14,background:h?"#E7E8ED":"#5754D8",color:h?"#777C8E":"#FFFFFF",fontSize:13,fontWeight:850,cursor:h?"default":"pointer"},children:h?"Задача уже создана":"Создать задачу"})]},d.recommendationId??f)})})]})`;

replaceBetween(
  'e.actions&&e.actions.length>0&&i.jsxs(W.div,{custom:6',
  ',i.jsx(W.div,{custom:7',
  recommendationSection,
  "closed-loop recommendation cards",
);

writeFileSync(bundlePath, bundle);
console.log("Applied recommendation outcome workflow v50");
