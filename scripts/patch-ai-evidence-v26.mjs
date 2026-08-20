import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const versionMarker = 'const bdAiEvidenceVersion="evidence-and-tasks-v26"';
if (source.includes(versionMarker)) {
  console.log("AI evidence and task conversion v26 is already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceBetween(startMarker, endMarker, replacement, label, from = 0) {
  const start = source.indexOf(startMarker, from);
  if (start === -1) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceOnce(
  'const IC="bd_ai_diagnosis_v3",lle=',
  `${versionMarker},IC="bd_ai_diagnosis_v4",lle=`,
  "AI cache version",
);

replaceOnce(
  'function Foe(e,t,n,r=[]){const a=new Date().toISOString(),s=e.equipmentName?r.find(l=>l.name.trim().toLowerCase()===e.equipmentName.trim().toLowerCase()):void 0;return{id:n7(),planId:n,title:e.title,priority:e.priority,category:t,status:"not_started",dueDate:qoe(e.estimatedTime),estimatedTime:e.estimatedTime,costTier:e.costTier,recommendedRole:e.responsibleRole,impact:e.impact,aiExplanation:e.impact,expectedImpact:e.expectedResult,equipmentId:s?.id,equipmentName:s?.name,notes:[],createdAt:a,updatedAt:a}}',
  'function Foe(e,t,n,r=[]){const a=new Date().toISOString(),s=e.equipmentName?r.find(l=>l.name.trim().toLowerCase()===e.equipmentName.trim().toLowerCase()):void 0;return{id:n7(),planId:n,title:e.title,priority:e.priority,category:t,status:"not_started",dueDate:qoe(e.estimatedTime),estimatedTime:e.estimatedTime,costTier:e.costTier,recommendedRole:e.responsibleRole,impact:e.impact,aiExplanation:e.impact,expectedImpact:e.expectedResult,recommendationId:e.recommendationId,evidence:e.evidence??[],basisSummary:e.basisSummary,requiresVerification:!!e.requiresVerification,source:"ai_doctor",equipmentId:s?.id,equipmentName:s?.name,notes:[],createdAt:a,updatedAt:a}}',
  "action plan evidence fields",
);

const actionPlanStart = 'u=S.useCallback(h=>{const{problemTitle:g,problemCategory:y,problemUrgency:j,dailyDiagnosis:v,aiExplanation:b,expectedImpact:N,actions:E,knownEquipment:_=[]}=h,';
const actionPlanEnd = '},[]),d=S.useCallback((h,g)=>';
const actionPlanReplacement = String.raw`u=S.useCallback(h=>{const{problemTitle:g,problemCategory:y,problemUrgency:j,dailyDiagnosis:v,aiExplanation:b,expectedImpact:N,actions:E,knownEquipment:_=[],knownEmployees:bdKnownEmployees=[]}=h,T=new Date().toISOString(),A=Boe(),k=kM(),O=a.current.plans.find(U=>U.diagnosisDate===k&&U.status==="active"),M=E.map(U=>Foe(U,y,A,_));M.length===0&&M.push({id:n7(),planId:A,title:g,priority:j??"high",category:y,status:"not_started",impact:N,aiExplanation:b,expectedImpact:N,evidence:[],basisSummary:"Требует проверки исходных данных",requiresVerification:!0,source:"ai_doctor",notes:[],createdAt:T,updatedAt:T});const D={id:A,diagnosisDate:k,problemTitle:g,problemCategory:y,problemUrgency:j,dailyDiagnosis:v,aiExplanation:b,expectedImpact:N,taskIds:M.map(U=>U.id),status:"active",createdAt:T},z=a.current.plans.filter(U=>U.id!==O?.id),L=O?a.current.tasks.filter(U=>U.planId!==O.id):a.current.tasks,q=[...M,...L],B=[D,...z],bdToday=k,bdSimpleAiTasks=E.map((U,bdIndex)=>{const bdRole=String(U.responsibleRole??"").trim().toLocaleLowerCase("ru"),bdEmployee=bdKnownEmployees.find(bdPerson=>{const bdPosition=String(bdPerson.position??"").toLocaleLowerCase("ru"),bdLabel=String(bdPerson.role??"").toLocaleLowerCase("ru");return bdRole&&(bdPosition.includes(bdRole)||bdRole.includes(bdPosition)||bdLabel.includes(bdRole)||bdRole.includes(bdLabel))}),bdDue=qoe(U.estimatedTime),bdTab=bdDue?bdDue<bdToday?"overdue":bdDue===bdToday?"today":"week":"week";return{id:yue(),title:U.title,category:"AI",priority:U.priority??"medium",deadline:bdDue??U.estimatedTime??"Без срока",responsible:bdEmployee?.name??U.responsibleRole??"Не назначен",responsibleId:bdEmployee?.id,tab:bdTab,aiGenerated:!0,aiDiagnosisDate:k,sourcePlanId:A,recommendationId:U.recommendationId??"ai-"+(bdIndex+1),evidence:U.evidence??[],basisSummary:U.basisSummary,expectedResult:U.expectedResult,createdAt:T,updatedAt:T}}),bdExistingTasks=bdCurrentTasks().filter(U=>U.aiDiagnosisDate!==k),bdNextTasks=[...bdSimpleAiTasks,...bdExistingTasks];return TM(q),FS(B),bdSaveTasks(bdNextTasks),r(()=>({plans:B,tasks:q})),!0`;
replaceBetween(actionPlanStart, actionPlanEnd, actionPlanReplacement, "AI action plan conversion");

replaceOnce(
  'knownEquipment:s.map(U=>({id:U.id,name:U.name}))',
  'knownEquipment:s.map(U=>({id:U.id,name:U.name})),knownEmployees:r.filter(U=>U.status==="active").map(U=>({id:U.id,name:U.name,role:jo(U),position:U.position}))',
  "diagnosis employee assignment context",
);

replaceOnce(
  'knownEquipment:d.map(he=>({id:he.id,name:he.name}))',
  'knownEquipment:d.map(he=>({id:he.id,name:he.name})),knownEmployees:l.filter(he=>he.status==="active").map(he=>({id:he.id,name:he.name,role:jo(he),position:he.position}))',
  "review employee assignment context",
);

const functionStart = source.indexOf("function Fce(");
if (functionStart === -1) throw new Error("AI result component not found");
const recommendationsBlock = String.raw`e.actions&&e.actions.length>0&&i.jsxs(W.div,{custom:6,variants:li,initial:"hidden",animate:"show","data-bd-ai-recommendations":"evidence-v26",style:{display:"flex",flexDirection:"column",gap:12},children:[i.jsxs("div",{style:{borderRadius:20,padding:"16px 17px",background:"linear-gradient(145deg,#F1F2FF 0%,#F8F8FF 100%)",border:"1px solid #DADCF8"},children:[i.jsx("p",{style:{margin:0,fontSize:11,fontWeight:850,letterSpacing:".09em",textTransform:"uppercase",color:"#5854D8"},children:"Рекомендации → поручения"}),i.jsxs("p",{style:{margin:"6px 0 0",fontSize:13,lineHeight:1.45,color:"#5B6075"},children:["Создано поручений: ",e.actions.length,". Перед выполнением видно, на каких фактах основано каждое действие."]})]}),i.jsx("div",{style:{display:"grid",gap:12},children:e.actions.map((d,f)=>i.jsxs("article",{style:{minWidth:0,overflow:"hidden",borderRadius:20,padding:"17px",background:"#FFFFFF",border:"1px solid #E2E4EC",boxShadow:"0 7px 22px rgba(31,37,70,.055)"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[i.jsx("span",{style:{fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:".06em",color:d.priority==="critical"?"#C62F43":d.priority==="high"?"#D56A18":"#5754C7"},children:d.priority==="critical"?"Критично":d.priority==="high"?"Высокий приоритет":d.priority==="low"?"Низкий приоритет":"Средний приоритет"}),i.jsx("span",{style:{maxWidth:"52%",fontSize:10,fontWeight:750,color:"#74798B",textAlign:"right",overflowWrap:"anywhere"},children:d.responsibleRole??"Управляющий"})]}),i.jsx("h3",{style:{margin:"9px 0 0",fontSize:16,lineHeight:1.35,fontWeight:850,color:"#171A29",overflowWrap:"anywhere"},children:d.title}),i.jsx("p",{style:{margin:"7px 0 0",fontSize:12,lineHeight:1.5,color:"#62687C",overflowWrap:"anywhere"},children:d.basisSummary??"Основание сформировано из данных заведения"}),i.jsxs("details",{style:{marginTop:12,borderRadius:14,padding:"11px 12px",background:"#F7F8FB",border:"1px solid #E8E9EF"},children:[i.jsxs("summary",{style:{cursor:"pointer",fontSize:12,fontWeight:800,color:"#383D52"},children:["Основания · ",(d.evidence??[]).length]}),i.jsx("div",{style:{display:"grid",gap:9,marginTop:10},children:(d.evidence??[]).map((h,g)=>i.jsxs("div",{style:{minWidth:0,paddingTop:g?9:0,borderTop:g?"1px solid #E4E6ED":"none"},children:[i.jsx("strong",{style:{display:"block",fontSize:11,color:"#3E4356",overflowWrap:"anywhere"},children:h.label}),i.jsx("span",{style:{display:"block",marginTop:3,fontSize:11,lineHeight:1.45,color:"#74798B",overflowWrap:"anywhere"},children:h.fact}),h.sourceUrl&&i.jsx("a",{href:h.sourceUrl,target:"_blank",rel:"noreferrer",style:{display:"inline-block",marginTop:5,fontSize:10,fontWeight:800,color:"#5754D8"},children:"Открыть источник ↗"})]},h.id??g))})]}),i.jsxs("div",{style:{display:"flex",justifyContent:"space-between",gap:10,marginTop:12,paddingTop:11,borderTop:"1px solid #ECEEF3"},children:[i.jsx("span",{style:{fontSize:11,color:"#8A8FA1"},children:d.estimatedTime??"Срок не задан"}),i.jsx("span",{style:{fontSize:11,fontWeight:750,color:d.requiresVerification?"#B46618":"#168153"},children:d.requiresVerification?"Сначала проверить":"Факты подтверждены"})]})]},d.recommendationId??f))}),i.jsx("button",{type:"button",onClick:()=>window.location.assign("/tasks"),style:{width:"100%",minHeight:48,border:0,borderRadius:16,background:"#5754D8",color:"#FFFFFF",fontSize:14,fontWeight:800,cursor:"pointer"},children:"Открыть поручения"})]})`;
replaceBetween(
  'e.actions&&e.actions.length>0&&i.jsx(W.div,{custom:6',
  ',i.jsx(W.div,{custom:7',
  recommendationsBlock,
  "recommendation evidence UI",
  functionStart,
);

replaceOnce(
  'i.jsx("p",{className:X("text-[15px] font-semibold text-foreground leading-snug mb-3",t&&"line-through text-muted-foreground"),children:e.title}),i.jsxs("div",{className:"flex items-center gap-4",children:',
  'i.jsx("p",{className:X("text-[15px] font-semibold text-foreground leading-snug mb-3",t&&"line-through text-muted-foreground"),children:e.title}),e.aiGenerated&&i.jsxs("div",{style:{margin:"-2px 0 11px",padding:"9px 10px",borderRadius:12,background:"#F3F3FF",border:"1px solid #E0E1FA"},children:[i.jsx("p",{style:{margin:0,fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:".06em",color:"#5A56D7"},children:"Поручение от AI"}),i.jsx("p",{style:{margin:"4px 0 0",fontSize:11,lineHeight:1.4,color:"#676C80",overflowWrap:"anywhere"},children:e.basisSummary??e.evidence?.[0]?.fact??"Основано на диагностике заведения"})]}),i.jsxs("div",{className:"flex items-center gap-4",children:',
  "AI task evidence summary",
);

writeFileSync(bundlePath, source);
console.log("Applied AI evidence and task conversion patch v26");
