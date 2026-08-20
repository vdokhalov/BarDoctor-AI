import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const versionMarker = 'const bdTaskLifecycleVersion="proposals-v32"';
if (source.includes(versionMarker)) {
  console.log("AI persistence and proposal workflow v32 are already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceBetween(startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

const diagnosisPersistence = String.raw`const bdAiEvidenceVersion="evidence-and-proposals-v32",IC="bd_ai_diagnosis_v4";
function WS(){try{const e=xr(IC)??(()=>{const n=localStorage.getItem(Pt(IC));return n?JSON.parse(n):null})();if(!e)return null;const t={...e,data:bdFilterDiagnosisRecommendations(e.data)};return xr(IC)||qr(IC,t).catch(()=>{}),t}catch{return null}}
function cle(e,t){const n={data:e,generatedAt:t,cachedAt:Date.now()};try{localStorage.setItem(Pt(IC),JSON.stringify(n))}catch{}qr(IC,n).catch(()=>{})}
function Js(){try{const e=WS();if(!e)return;const t={...e,staleAt:Date.now()};localStorage.setItem(Pt(IC),JSON.stringify(t)),qr(IC,t).catch(()=>{})}catch{}}`;

replaceBetween(
  "const bdAiEvidenceVersion=",
  "function ule(",
  diagnosisPersistence,
  "durable AI diagnosis cache",
);

replaceOnce(
  "knownEmployees:bdKnownEmployees=[]}=h",
  "knownEmployees:bdKnownEmployees=[],diagnosisGeneratedAt:bdDiagnosisGeneratedAt}=h",
  "diagnosis run id input",
);

replaceOnce(
  "M=E.map(U=>Foe(U,y,A,_));",
  'M=E.map(U=>Foe(U,y,A,_)).map(U=>({...U,status:"proposed",approvalStatus:"pending"}));',
  "proposed action-plan tasks",
);

replaceOnce(
  'status:"not_started",impact:N,aiExplanation:b,expectedImpact:N,evidence:[],basisSummary:"Требует проверки исходных данных"',
  'status:"proposed",approvalStatus:"pending",impact:N,aiExplanation:b,expectedImpact:N,evidence:[],basisSummary:"Требует проверки исходных данных"',
  "proposed fallback action-plan task",
);

const aiProposalBuilder = String.raw`bdToday=k,bdSimpleAiTasks=M.map((bdActionTask,bdIndex)=>{const U=E[bdIndex]??{title:bdActionTask.title,priority:bdActionTask.priority,responsibleRole:bdActionTask.recommendedRole,estimatedTime:bdActionTask.dueDate,recommendationId:bdActionTask.recommendationId,evidence:bdActionTask.evidence,basisSummary:bdActionTask.basisSummary,expectedResult:bdActionTask.expectedImpact},bdRole=String(U.responsibleRole??"").trim().toLocaleLowerCase("ru"),bdEmployee=bdKnownEmployees.find(bdPerson=>{const bdPosition=String(bdPerson.position??"").toLocaleLowerCase("ru"),bdLabel=String(bdPerson.role??"").toLocaleLowerCase("ru");return bdRole&&(bdPosition.includes(bdRole)||bdRole.includes(bdPosition)||bdLabel.includes(bdRole)||bdRole.includes(bdLabel))}),bdDue=bdTaskDueDate({dueDate:bdActionTask.dueDate})??qoe(U.estimatedTime),bdTab=bdDue?bdDue<bdToday?"overdue":bdDue===bdToday?"today":"week":"week";return{id:yue(),actionTaskId:bdActionTask.id,title:U.title,description:U.expectedResult??"",category:"AI",priority:U.priority??"medium",deadline:bdDue??U.estimatedTime??"Без срока",responsible:bdEmployee?.name??U.responsibleRole??"Не назначен",responsibleId:bdEmployee?.id,tab:bdTab,status:"not_started",approvalStatus:"pending",aiGenerated:!0,aiDiagnosisDate:k,aiRunId:bdDiagnosisGeneratedAt??T,sourcePlanId:A,recommendationId:U.recommendationId??"ai-"+(bdIndex+1),evidence:U.evidence??[],basisSummary:U.basisSummary,expectedResult:U.expectedResult,statusHistory:[{status:"proposed",at:T}],createdAt:T,updatedAt:T}})`;

replaceBetween(
  "bdToday=k,bdSimpleAiTasks=",
  ",bdExistingTasks=",
  aiProposalBuilder,
  "agent-created task proposals",
);

replaceOnce(
  "bdExistingTasks=bdCurrentTasks(),bdNextTasks=bdExistingTasks;",
  'bdExistingTasks=bdCurrentTasks(),bdOpenRecommendationIds=new Set(bdExistingTasks.filter(U=>!U.hidden&&U.approvalStatus!=="pending"&&!bdTaskClosedStatuses.has(bdTaskStatus(U))).map(U=>U.recommendationId).filter(Boolean)),bdNewAiTasks=bdSimpleAiTasks.filter(U=>!bdOpenRecommendationIds.has(U.recommendationId)),bdNextTasks=bdNormalizeTasks([...bdNewAiTasks,...bdExistingTasks.filter(U=>!(U.aiGenerated===!0&&U.approvalStatus==="pending"))]);',
  "replace stale proposals without duplicating active work",
);

replaceOnce(
  "actions:B.actions??[],knownEquipment:",
  "actions:B.actions??[],diagnosisGeneratedAt:q.generatedAt,knownEquipment:",
  "pass diagnosis generation timestamp",
);

replaceOnce(
  "function Uce(){const{profile:e}=Un(),",
  "function Uce(){const{isReady:bdAiCloudReady}=Ai(),{profile:e}=Un(),",
  "analysis waits for cloud data",
);

replaceOnce(
  'j=S.useMemo(()=>WS(),[]),[v,b]=S.useState(()=>j?"ready":"idle"),[N,E]=S.useState(j),_=t.length+n.length,T=S.useCallback',
  'j=S.useMemo(()=>WS(),[]),[v,b]=S.useState(()=>j?"ready":"idle"),[N,E]=S.useState(j),_=t.length+n.length;S.useEffect(()=>{if(!bdAiCloudReady)return;const bdSavedDiagnosis=WS();bdSavedDiagnosis&&(E(bdSavedDiagnosis),b("ready"))},[bdAiCloudReady]);const T=S.useCallback',
  "analysis hydrates after cloud sync",
);

const taskSection = String.raw`const bdTaskLifecycleVersion="proposals-v32",mue={proposed:"На утверждении",today:"Сегодня",week:"На неделе",overdue:"Просрочено",history:"История",done:"История"},UC={critical:{label:"Критично",color:"text-destructive",bg:"bg-destructive/10",dot:"bg-destructive",border:"border-l-destructive"},high:{label:"Высокий",color:"text-[#B45309]",bg:"bg-[#F59E0B]/10",dot:"bg-[#F59E0B]",border:"border-l-[#F59E0B]"},medium:{label:"Средний",color:"text-[#1D4ED8]",bg:"bg-[#3B82F6]/10",dot:"bg-[#3B82F6]",border:"border-l-[#3B82F6]"},low:{label:"Низкий",color:"text-muted-foreground",bg:"bg-muted",dot:"bg-muted-foreground/50",border:"border-l-border"}},xue=[{key:"proposed",label:"Предложенные"},{key:"today",label:"Сегодня"},{key:"week",label:"На неделе"},{key:"overdue",label:"Просрочено"},{key:"history",label:"История"}],bdTaskClosedStatuses=new Set(["completed","cancelled"]),bdTaskStatuses=new Set(["not_started","in_progress","completed","cancelled"]),bdTaskPersistenceVersion="cloud-v32",bdTasksStoreKey="bd_tasks";
function bdTaskStatus(e){const t=String(e?.status??"").toLowerCase();return bdTaskStatuses.has(t)?t:e?.tab==="done"?"completed":"not_started"}
function bdTaskIsPending(e){const t=bdTaskStatus(e);return e?.approvalStatus==="pending"||e?.status==="proposed"||e?.aiGenerated===!0&&!e?.approvalStatus&&t==="not_started"}
function bdNormalizeTask(e){const t=bdTaskStatus(e),n=e?.createdAt??new Date().toISOString(),r={...e,status:t,createdAt:n,updatedAt:e?.updatedAt??n};return bdTaskIsPending(e)&&(r.approvalStatus="pending",r.status="not_started"),e?.aiGenerated===!0&&!r.approvalStatus&&(r.approvalStatus="approved"),t==="completed"&&!r.completedAt&&(r.completedAt=r.updatedAt),t==="cancelled"&&!r.cancelledAt&&(r.cancelledAt=r.updatedAt),r}
function bdNormalizeTasks(e){return Array.isArray(e)?e.filter(t=>t&&typeof t==="object").map(bdNormalizeTask):[]}
function bdTaskDueDate(e){const t=String(e?.dueDate??e?.deadline??"").trim(),n=t.match(/^(\d{4}-\d{2}-\d{2})/);return n?n[1]:null}
function bdTaskView(e,t=kM()){if(e?.hidden||e?.approvalStatus==="deleted")return"hidden";if(bdTaskIsPending(e))return"proposed";const n=bdTaskStatus(e);if(bdTaskClosedStatuses.has(n))return"history";const r=bdTaskDueDate(e);return r?r<t?"overdue":r===t?"today":"week":e?.tab==="overdue"?"overdue":e?.tab==="today"?"today":"week"}
function bdTaskDateLabel(e){if(!e)return"";const t=new Date(e);return Number.isNaN(t.getTime())?"":t.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
function bdTaskSort(e,t){const n={critical:0,high:1,medium:2,low:3};return[...e].sort((r,a)=>t==="history"?String(a.completedAt??a.cancelledAt??a.updatedAt??"").localeCompare(String(r.completedAt??r.cancelledAt??r.updatedAt??"")):(n[r.priority]??9)-(n[a.priority]??9)||String(bdTaskDueDate(r)??"9999").localeCompare(String(bdTaskDueDate(a)??"9999")))}
function bdLoadTasks(){try{const e=localStorage.getItem(Pt(bdTasksStoreKey))||Zn(bdTasksStoreKey);return bdNormalizeTasks(e?JSON.parse(e):[])}catch{return[]}}
function bdCurrentTasks(){return bdNormalizeTasks(xr(bdTasksStoreKey)??bdLoadTasks())}
function bdSaveTasks(e){return qr(bdTasksStoreKey,bdNormalizeTasks(e))}
const yue=()=>crypto.randomUUID(),vue=bdCurrentTasks();
function bue({priority:e}){const t=UC[e]??UC.medium;return i.jsxs("span",{className:X("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide",t.color,t.bg),children:[i.jsx("span",{className:X("w-1.5 h-1.5 rounded-full",t.dot)}),t.label]})}
function jue({task:e,viewTab:t,onStart:n,onComplete:r,onCancel:a,onRestore:s,onApprove:l,onEdit:u,onDelete:d,canManage:f=!1}){const m=UC[e.priority]??UC.medium,h=bdTaskStatus(e),g=bdTaskClosedStatuses.has(h),y=bdTaskIsPending(e),j=h==="completed"?"Выполнено":h==="cancelled"?"Отменено":h==="in_progress"?"В работе":"Не начато",v=e.completedAt??e.cancelledAt??e.updatedAt;return i.jsx("article",{"data-bd-task-card":"proposals-v32",className:X("relative bg-card border border-border rounded-[20px] mb-3 border-l-[3px] shadow-[var(--shadow-card)]",m.border,g&&"opacity-75"),style:{overflow:"hidden"},children:i.jsxs("div",{className:"px-4 py-4",children:[i.jsxs("div",{className:"flex items-center justify-between mb-2.5",children:[i.jsx(bue,{priority:e.priority}),i.jsxs("div",{className:"flex items-center gap-1.5",children:[i.jsx("span",{className:"text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full",children:e.category}),i.jsx("span",{className:X("text-[11px] font-semibold px-2 py-0.5 rounded-full",y?"bg-[#F3F3FF] text-[#5754D8]":g?h==="completed"?"bg-[#22C55E]/10 text-[#16A34A]":"bg-muted text-muted-foreground":h==="in_progress"?"bg-primary/10 text-primary":t==="overdue"?"bg-destructive/10 text-destructive":"bg-primary/10 text-primary"),children:y?"На утверждении":g?j:mue[t]})]})]}),i.jsx("p",{className:X("text-[15px] font-semibold text-foreground leading-snug mb-3",g&&"line-through text-muted-foreground"),children:e.title}),e.description&&i.jsx("p",{style:{margin:"-3px 0 11px",fontSize:12,lineHeight:1.45,color:"#6B7082",overflowWrap:"anywhere"},children:e.description}),e.aiGenerated&&i.jsxs("div",{style:{margin:"-2px 0 11px",padding:"9px 10px",borderRadius:12,background:"#F3F3FF",border:"1px solid #E0E1FA"},children:[i.jsx("p",{style:{margin:0,fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:".06em",color:"#5A56D7"},children:y?"Предложение агента":"Поручение от AI"}),i.jsx("p",{style:{margin:"4px 0 0",fontSize:11,lineHeight:1.4,color:"#676C80",overflowWrap:"anywhere"},children:e.basisSummary??e.evidence?.[0]?.fact??"Основано на диагностике заведения"})]}),i.jsxs("div",{className:"flex items-center gap-4",style:{flexWrap:"wrap"},children:[i.jsxs("span",{className:"flex items-center gap-1.5 text-[12px] text-muted-foreground",children:[i.jsx(La,{size:12,className:"opacity-70"}),e.deadline??e.dueDate??"Без срока"]}),i.jsxs("span",{className:"flex items-center gap-1.5 text-[12px] text-muted-foreground",children:[i.jsx(zc,{size:12,className:"opacity-70"}),e.responsible??"Не назначен"]})]}),!f&&i.jsx("p",{"data-bd-task-readonly":"",style:{margin:"13px 0 0",paddingTop:11,borderTop:"1px solid #ECEEF3",fontSize:12,color:"#858A9A"},children:y?"Только просмотр — утвердить предложение может пользователь с правом управления поручениями.":"Только просмотр — изменение поручений отключено владельцем."}),f&&i.jsx("div",{"data-bd-task-actions":"proposal-v32",style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:14,paddingTop:13,borderTop:"1px solid #ECEEF3"},children:y?i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",onClick:()=>l(e.id),style:{minHeight:44,padding:"0 16px",borderRadius:13,border:0,background:"#21A366",color:"#FFFFFF",fontSize:13,fontWeight:850,boxShadow:"0 4px 12px rgba(33,163,102,.18)"},children:"Утвердить"}),i.jsx("button",{type:"button",onClick:()=>u(e.id),style:{minHeight:44,padding:"0 14px",borderRadius:13,border:"1px solid #DADCF8",background:"#F3F3FF",color:"#5754D8",fontSize:13,fontWeight:850},children:"Редактировать"}),i.jsx("button",{type:"button",onClick:()=>d(e.id),style:{minHeight:44,marginLeft:"auto",padding:"0 8px",border:0,background:"transparent",color:"#B45353",fontSize:12,fontWeight:800},children:"Удалить"})]}):g?i.jsxs(i.Fragment,{children:[i.jsxs("span",{style:{marginRight:"auto",fontSize:12,fontWeight:800,color:h==="completed"?"#168153":"#777C8E"},children:[j,v?" · "+bdTaskDateLabel(v):""]}),i.jsx("button",{type:"button",onClick:()=>s(e.id),style:{minHeight:42,padding:"0 14px",borderRadius:13,border:"1px solid #DADCE7",background:"#FFFFFF",color:"#4B5062",fontSize:12,fontWeight:800},children:"Вернуть в работу"})]}):i.jsxs(i.Fragment,{children:[h==="not_started"&&i.jsx("button",{type:"button",onClick:()=>n(e.id),style:{minHeight:44,padding:"0 14px",borderRadius:13,border:"1px solid #DADCF8",background:"#F3F3FF",color:"#5754D8",fontSize:13,fontWeight:850},children:"В работу"}),i.jsx("button",{type:"button",onClick:()=>r(e.id),style:{minHeight:44,padding:"0 16px",borderRadius:13,border:0,background:"#21A366",color:"#FFFFFF",fontSize:13,fontWeight:850,boxShadow:"0 4px 12px rgba(33,163,102,.18)"},children:"Выполнить"}),i.jsx("button",{type:"button",onClick:()=>u(e.id),style:{minHeight:44,padding:"0 10px",border:0,background:"transparent",color:"#5754D8",fontSize:12,fontWeight:800},children:"Редактировать"}),i.jsx("button",{type:"button",onClick:()=>a(e.id),style:{minHeight:44,marginLeft:"auto",padding:"0 8px",border:0,background:"transparent",color:"#B45353",fontSize:12,fontWeight:800},children:"Отменить"})]})})]})})}
function wue({tab:e,onAdd:t,canManage:n}){const r={proposed:{title:"Новых предложений нет",body:"После AI-анализа агент сам подготовит поручения для проверки.",cta:void 0},today:{title:"Поручений на сегодня нет",body:"Все поручения на сегодня закрыты или срок ещё не наступил.",cta:"Создать поручение"},week:{title:"На этой неделе поручений нет",body:"Можно заранее назначить сотрудника и срок выполнения.",cta:"Создать поручение"},overdue:{title:"Просроченных поручений нет",body:"Отличный результат — всё выполняется вовремя.",cta:void 0},history:{title:"История пока пустая",body:"Выполненные и отменённые поручения будут храниться здесь.",cta:void 0}},{title:a,body:s,cta:l}=r[e];return i.jsxs(W.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.35,ease:[.22,1,.36,1]},className:"flex flex-col items-center justify-center py-16 text-center px-8",children:[i.jsx("div",{className:"w-14 h-14 rounded-[18px] bg-muted flex items-center justify-center mb-4",children:e==="overdue"?i.jsx(TA,{size:26,className:"text-[#22C55E]/70"}):i.jsx(km,{size:26,className:e==="history"?"text-primary/40":"text-muted-foreground/60"})}),i.jsx("p",{className:"text-[16px] font-bold text-foreground mb-1.5",children:a}),i.jsx("p",{className:"text-[13px] text-muted-foreground leading-relaxed mb-5",children:s}),l&&t&&n&&i.jsx("button",{type:"button",onClick:t,className:"px-5 py-2.5 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_4px_14px_rgba(91,92,235,0.22)]",children:l})]})}
const bdEmployeeSelectorsVersion="team-v11";
function Sue({onClose:e,onAdd:t,defaultTab:n,defaultTitle:bdDefaultTitle="",defaultResponsible:bdDefaultResponsible=""}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),[r,a]=S.useState(bdDefaultTitle),[s,l]=S.useState("medium"),[u,d]=S.useState(""),[f,m]=S.useState(bdDefaultResponsible),h=()=>{if(!r.trim())return;const g=new Date().toISOString(),y=n==="history"||n==="overdue"||n==="proposed"?"today":n,bdEmployee=bdActiveEmployees.find(j=>j.name===f);t({title:r.trim(),category:"Поручение",priority:s,deadline:u||"Без срока",responsible:f||"Не назначен",responsibleId:bdEmployee?.id,tab:y,status:"not_started",source:"manual",statusHistory:[{status:"not_started",at:g}],createdAt:g,updatedAt:g}),e()};return i.jsx(W.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[70] flex items-end justify-center",style:{backdropFilter:"blur(4px)",backgroundColor:"rgba(22,27,46,0.32)"},onClick:g=>g.target===g.currentTarget&&e(),children:i.jsxs(W.div,{initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},transition:{type:"spring",stiffness:320,damping:34},className:"w-full max-w-[430px] bg-background rounded-t-[28px] pt-3 pb-8 px-6 shadow-[var(--shadow-dialog)]",children:[i.jsx("div",{className:"bd-sheet-handle mb-5"}),i.jsxs("div",{className:"flex items-center justify-between mb-6",children:[i.jsx("h2",{className:"text-[18px] font-bold text-foreground tracking-tight",children:"Новое поручение"}),i.jsx("button",{type:"button",onClick:e,className:"w-8 h-8 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:15,className:"text-muted-foreground"})})]}),i.jsxs("div",{className:"flex flex-col gap-4",children:[i.jsx(ze,{label:"Название",placeholder:"Что поручить сотруднику?",value:r,onChange:g=>a(g.target.value)}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2",children:"Приоритет"}),i.jsx("div",{className:"flex gap-2",children:["critical","high","medium","low"].map(g=>{const y=UC[g];return i.jsx("button",{type:"button",onClick:()=>l(g),className:X("flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95",s===g?y.bg+" "+y.color+" border-current":"border-border text-muted-foreground bg-card hover:border-border/80"),children:y.label},g)})})]}),i.jsx(ze,{label:"Срок выполнения",type:"date",value:u,onChange:g=>d(g.target.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"}),i.jsxs("select",{value:f,onChange:g=>m(g.target.value),className:"h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all",children:[i.jsx("option",{value:"",children:"Без ответственного"}),...bdActiveEmployees.map(g=>i.jsxs("option",{value:g.name,children:[g.name," · ",jo(g)]},g.id))]}),bdActiveEmployees.length===0&&i.jsx("p",{className:"text-[11.5px] text-muted-foreground mt-1.5",children:"Сначала добавьте сотрудников в разделе «Сотрудники»."})]}),i.jsx(ke,{fullWidth:!0,onClick:h,disabled:!r.trim(),className:"mt-1",children:"Создать поручение"})]})]})})}
function bdTaskEditSheet({task:e,onClose:t,onSave:n}){const{employees:r}=_i(),a=S.useMemo(()=>r.filter(b=>b.status==="active"),[r]),[s,l]=S.useState(e.title??""),[u,d]=S.useState(e.description??""),[f,m]=S.useState(e.priority??"medium"),[h,g]=S.useState(bdTaskDueDate(e)??""),[y,j]=S.useState(e.responsible==="Не назначен"?"":e.responsible??""),v=()=>{if(!s.trim())return;const b=a.find(N=>N.name===y);n({...e,title:s.trim(),description:u.trim(),priority:f,deadline:h||"Без срока",responsible:y||"Не назначен",responsibleId:b?.id,updatedAt:new Date().toISOString()}),t()};return i.jsx(W.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[75] flex items-end justify-center",style:{backdropFilter:"blur(4px)",backgroundColor:"rgba(22,27,46,0.32)"},onClick:b=>b.target===b.currentTarget&&t(),children:i.jsxs(W.div,{initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},transition:{type:"spring",stiffness:320,damping:34},className:"w-full max-w-[430px] bg-background rounded-t-[28px] pt-3 pb-8 px-6 shadow-[var(--shadow-dialog)]",style:{maxHeight:"94dvh",overflowY:"auto"},children:[i.jsx("div",{className:"bd-sheet-handle mb-5"}),i.jsxs("div",{className:"flex items-center justify-between mb-6",children:[i.jsx("h2",{className:"text-[18px] font-bold text-foreground tracking-tight",children:bdTaskIsPending(e)?"Проверить предложение":"Редактировать поручение"}),i.jsx("button",{type:"button",onClick:t,className:"w-8 h-8 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:15,className:"text-muted-foreground"})})]}),i.jsxs("div",{className:"flex flex-col gap-4",children:[i.jsx(ze,{label:"Название",placeholder:"Что нужно сделать?",value:s,onChange:b=>l(b.target.value)}),i.jsx(So,{label:"Описание",placeholder:"Ожидаемый результат или важные детали",rows:3,value:u,onChange:b=>d(b.target.value)}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2",children:"Приоритет"}),i.jsx("div",{className:"flex gap-2",children:["critical","high","medium","low"].map(b=>{const N=UC[b];return i.jsx("button",{type:"button",onClick:()=>m(b),className:X("flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95",f===b?N.bg+" "+N.color+" border-current":"border-border text-muted-foreground bg-card"),children:N.label},b)})})]}),i.jsx(ze,{label:"Срок выполнения",type:"date",value:h,onChange:b=>g(b.target.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"}),i.jsxs("select",{value:y,onChange:b=>j(b.target.value),className:"h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12",children:[i.jsx("option",{value:"",children:"Без ответственного"}),...a.map(b=>i.jsxs("option",{value:b.name,children:[b.name," · ",jo(b)]},b.id))]})]}),i.jsx(ke,{fullWidth:!0,onClick:v,disabled:!s.trim(),className:"mt-1",children:"Сохранить изменения"})]})]})})}
const Nue={initial:{opacity:0,y:12},animate:{opacity:1,y:0},exit:{opacity:0,y:-8},transition:{duration:.28,ease:[.22,1,.36,1]}};
function Aue(){const bdTaskQuery=new URLSearchParams(window.location.search),bdInitialTasks=bdCurrentTasks(),bdRequestedTab=bdTaskQuery.get("tab"),[e,t]=S.useState(()=>xue.some(g=>g.key===bdRequestedTab)?bdRequestedTab:bdInitialTasks.some(bdTaskIsPending)?"proposed":"today"),[n,r]=S.useState(()=>bdInitialTasks),[a,s]=S.useState(()=>bdTaskQuery.get("new")==="1"),[bdEditingId,bdSetEditingId]=S.useState(null),{toast:l}=sn(),{tasks:bdActionTasks,updateTask:bdUpdateActionTask}=RC(),{employees:bdTaskEmployees}=_i(),{user:bdTaskUser}=Joe(),bdCanManage=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("tasks.manage"):localStorage.getItem("bd_active_role")==="owner",bdTaskDefaultTitle=bdTaskQuery.get("title")??"",bdTaskDefaultResponsible=bdTaskQuery.get("responsible")??"",bdActor=[bdTaskUser?.firstName,bdTaskUser?.lastName].filter(Boolean).join(" ")||bdTaskUser?.email||"Пользователь",bdEditingTask=n.find(g=>g.id===bdEditingId)??null;S.useEffect(()=>{bdSaveTasks(n)},[n]);S.useEffect(()=>{const g=WS(),y=Array.isArray(g?.data?.actions)?g.data.actions:[],j=String(g?.generatedAt??g?.cachedAt??"");if(!y.length||!j)return;const v=j.slice(0,10);r(b=>{const N=new Date().toISOString(),E=[];for(let _=0;_<y.length;_+=1){const T=y[_],A=T.recommendationId??"ai-"+(_+1),k=b.some(O=>O.recommendationId===A&&(O.aiRunId===j||!O.aiRunId&&O.aiDiagnosisDate===v));if(k)continue;const O=String(T.responsibleRole??"").trim().toLocaleLowerCase("ru"),M=bdTaskEmployees.find(D=>{const z=String(D.position??"").toLocaleLowerCase("ru"),L=String(D.role??"").toLocaleLowerCase("ru");return O&&(z.includes(O)||O.includes(z)||L.includes(O)||O.includes(L))}),D=bdActionTasks.find(z=>z.recommendationId===A),z=bdTaskDueDate({dueDate:D?.dueDate})??qoe(T.estimatedTime);E.push({id:yue(),actionTaskId:D?.id,title:T.title,description:T.expectedResult??"",category:"AI",priority:T.priority??"medium",deadline:z??T.estimatedTime??"Без срока",responsible:M?.name??T.responsibleRole??"Не назначен",responsibleId:M?.id,tab:z?z<kM()?"overdue":z===kM()?"today":"week":"week",status:"not_started",approvalStatus:"pending",aiGenerated:!0,aiDiagnosisDate:v,aiRunId:j,sourcePlanId:D?.planId,recommendationId:A,evidence:T.evidence??[],basisSummary:T.basisSummary,expectedResult:T.expectedResult,statusHistory:[{status:"proposed",at:N}],createdAt:N,updatedAt:N})}return E.length?bdNormalizeTasks([...E,...b]):b})},[]);const u=bdTaskSort(n.filter(g=>bdTaskView(g)===e),e),d={proposed:n.filter(g=>bdTaskView(g)==="proposed").length,today:n.filter(g=>bdTaskView(g)==="today").length,week:n.filter(g=>bdTaskView(g)==="week").length,overdue:n.filter(g=>bdTaskView(g)==="overdue").length,history:n.filter(g=>bdTaskView(g)==="history").length},f=(g,y,j,v={})=>{const b=bdActionTasks.find(N=>N.id===g.actionTaskId||g.sourcePlanId&&N.planId===g.sourcePlanId&&(g.recommendationId?N.recommendationId===g.recommendationId:N.title===g.title));b&&bdUpdateActionTask(b.id,{status:y,updatedAt:j,...v})},m=(g,y)=>{const j=n.find(v=>v.id===g);if(!j||!bdCanManage||bdTaskIsPending(j))return;if(y==="cancelled"&&!window.confirm("Отменить поручение? Оно останется в истории."))return;const v=new Date().toISOString(),b={status:y,approvalStatus:"approved",updatedAt:v,lastStatusBy:bdActor,statusHistory:[...(Array.isArray(j.statusHistory)?j.statusHistory:[]),{status:y,at:v,by:bdActor}]};y==="in_progress"&&(b.startedAt=j.startedAt??v,b.completedAt=void 0,b.cancelledAt=void 0),y==="completed"&&(b.completedAt=v),y==="cancelled"&&(b.cancelledAt=v),r(N=>bdNormalizeTasks(N.map(E=>E.id===g?{...E,...b}:E))),f({...j,...b},y,v,{approvalStatus:"approved"}),l({variant:y==="completed"?"success":"default",title:y==="completed"?"Поручение выполнено":y==="cancelled"?"Поручение отменено":j.status==="completed"||j.status==="cancelled"?"Поручение возвращено в работу":"Поручение взято в работу",description:j.title})},h=g=>{const y=bdNormalizeTask({...g,id:yue()});r(j=>[y,...j]),l({variant:"success",title:"Поручение создано",description:g.title})},bdApprove=g=>{const y=n.find(j=>j.id===g);if(!y||!bdCanManage)return;const j=new Date().toISOString(),v={approvalStatus:"approved",approvedAt:j,approvedBy:bdActor,status:"not_started",updatedAt:j,statusHistory:[...(Array.isArray(y.statusHistory)?y.statusHistory:[]),{status:"approved",at:j,by:bdActor}]};r(b=>bdNormalizeTasks(b.map(N=>N.id===g?{...N,...v}:N))),f({...y,...v},"not_started",j,{approvalStatus:"approved",approvedAt:j,approvedBy:bdActor,title:y.title,dueDate:bdTaskDueDate(y),recommendedRole:y.responsible}),l({variant:"success",title:"Поручение утверждено",description:y.title})},bdDelete=g=>{const y=n.find(j=>j.id===g);if(!y||!bdCanManage||!window.confirm("Удалить предложение агента?"))return;const j=new Date().toISOString(),v={approvalStatus:"deleted",hidden:!0,status:"cancelled",deletedAt:j,cancelledAt:j,updatedAt:j,statusHistory:[...(Array.isArray(y.statusHistory)?y.statusHistory:[]),{status:"deleted",at:j,by:bdActor}]};r(b=>bdNormalizeTasks(b.map(N=>N.id===g?{...N,...v}:N))),f({...y,...v},"cancelled",j,{approvalStatus:"deleted",deletedAt:j}),l({variant:"default",title:"Предложение удалено",description:y.title})},bdSaveEdited=g=>{r(y=>bdNormalizeTasks(y.map(j=>j.id===g.id?g:j)));const y=bdActionTasks.find(j=>j.id===g.actionTaskId||g.recommendationId&&j.recommendationId===g.recommendationId);y&&bdUpdateActionTask(y.id,{title:g.title,dueDate:bdTaskDueDate(g),recommendedRole:g.responsible,updatedAt:g.updatedAt}),l({variant:"success",title:bdTaskIsPending(g)?"Предложение изменено":"Поручение изменено",description:g.title})};return i.jsxs(i.Fragment,{children:[i.jsxs(nt,{showBottomNav:!0,className:"pb-[168px]",children:[i.jsx("div",{className:"sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border",children:i.jsxs($e,{className:"pt-5 pb-0",children:[i.jsx("div",{className:"px-6 mb-4 flex items-center justify-between gap-3",children:i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Поручения"})}),i.jsx("div",{className:"flex overflow-x-auto no-scrollbar px-6 pb-0 gap-1",children:xue.map(({key:g,label:y})=>{const j=e===g,v=d[g];return i.jsxs("button",{type:"button",onClick:()=>t(g),className:X("flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-semibold transition-all shrink-0",j?g==="overdue"?"bg-destructive text-white shadow-sm":"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:text-foreground"),children:[y,v>0&&i.jsx("span",{className:X("min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",j?"bg-white/20 text-white":g==="overdue"?"bg-destructive/10 text-destructive":"bg-muted text-muted-foreground"),children:v})]},g)})}),i.jsxs(qe,{children:[e==="proposed"&&d.proposed>0&&i.jsx(W.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},className:"overflow-hidden",children:i.jsx("div",{style:{margin:"10px 24px 0",padding:"11px 12px",borderRadius:14,background:"#F3F3FF",border:"1px solid #E0E1FA",fontSize:11.5,lineHeight:1.45,color:"#64697C"},children:"Агент подготовил варианты. Пока вы их не утвердили, они не считаются активными поручениями и не отправляют уведомления сотрудникам."})}),e==="overdue"&&d.overdue>0&&i.jsx(W.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},className:"overflow-hidden",children:i.jsxs("div",{className:"flex items-center gap-2 px-6 py-2.5 bg-destructive/5 border-t border-destructive/10",children:[i.jsx(Fn,{size:13,className:"text-destructive flex-shrink-0"}),i.jsxs("p",{className:"text-[12px] text-destructive font-medium",children:[d.overdue," ",d.overdue===1?"поручение просрочено":"поручения просрочены"," — требуют внимания"]})]})}),i.jsx("div",{className:"h-3"})]})}),i.jsx("div",{className:"px-6 pt-4",children:i.jsx(qe,{mode:"wait",children:i.jsx(W.div,{...Nue,children:u.length===0?i.jsx(wue,{tab:e,onAdd:()=>s(!0),canManage:bdCanManage}):u.map(g=>i.jsx(jue,{task:g,viewTab:e,onStart:y=>m(y,"in_progress"),onComplete:y=>m(y,"completed"),onCancel:y=>m(y,"cancelled"),onRestore:y=>m(y,"in_progress"),onApprove:bdApprove,onEdit:bdSetEditingId,onDelete:bdDelete,canManage:bdCanManage},g.id))},e)})})]}),bdCanManage&&i.jsx("div",{className:"fixed left-0 right-0 flex justify-center z-40 pointer-events-none",style:{bottom:"calc(92px + env(safe-area-inset-bottom))"},children:i.jsxs(W.button,{initial:{opacity:0,y:12,scale:.95},animate:{opacity:1,y:0,scale:1},transition:{delay:.25,duration:.4,ease:[.22,1,.36,1]},onClick:()=>s(!0),className:"pointer-events-auto flex items-center gap-2.5 pl-4 pr-5 py-3 bg-foreground text-white rounded-full shadow-[0_8px_32px_rgba(22,27,46,0.28),0_2px_8px_rgba(22,27,46,0.14)] hover:opacity-90 active:scale-[0.97] transition-all",children:[i.jsx("div",{className:"w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0",children:i.jsx(Vt,{size:14,strokeWidth:2.5,className:"text-white"})}),i.jsx("span",{className:"text-[14px] font-semibold tracking-tight",children:"Новое поручение"})]})}),i.jsx(qe,{children:a&&bdCanManage&&i.jsx(Sue,{onClose:()=>s(!1),onAdd:h,defaultTab:e,defaultTitle:bdTaskDefaultTitle,defaultResponsible:bdTaskDefaultResponsible},"add-sheet"),bdEditingTask&&bdCanManage&&i.jsx(bdTaskEditSheet,{task:bdEditingTask,onClose:()=>bdSetEditingId(null),onSave:bdSaveEdited},"edit-sheet")})]})}`;

replaceBetween(
  'const bdTaskLifecycleVersion="workflow-v30"',
  "function So(",
  taskSection,
  "task proposal review workflow",
);

replaceOnce(
  "function Aue(){const bdTaskQuery=",
  "function Aue(){const{isReady:bdTaskCloudReady}=Ai(),bdTaskQuery=",
  "task page waits for cloud data",
);

replaceOnce(
  'bdEditingTask=n.find(g=>g.id===bdEditingId)??null;S.useEffect(()=>{bdSaveTasks(n)},[n]);S.useEffect(()=>{const g=WS(),',
  'bdEditingTask=n.find(g=>g.id===bdEditingId)??null,bdTaskHydratedRef=S.useRef(!1);S.useEffect(()=>{bdTaskCloudReady&&bdTaskHydratedRef.current&&bdSaveTasks(n)},[n,bdTaskCloudReady]);S.useEffect(()=>{if(!bdTaskCloudReady)return;r(bdCurrentTasks()),bdTaskHydratedRef.current=!0},[bdTaskCloudReady]);S.useEffect(()=>{if(!bdTaskCloudReady)return;const g=WS(),',
  "hydrate tasks without overwriting server state",
);

replaceOnce(
  "return E.length?bdNormalizeTasks([...E,...b]):b})},[]);const u=bdTaskSort",
  "return E.length?bdNormalizeTasks([...E,...b]):b})},[bdTaskCloudReady]);const u=bdTaskSort",
  "seed proposals after cloud sync",
);

replaceOnce(
  'i.jsx("div",{className:"h-3"})]})}),i.jsx("div",{className:"px-6 pt-4"',
  'i.jsx("div",{className:"h-3"})]})]})}),i.jsx("div",{className:"px-6 pt-4"',
  "close task-page header containers",
);

replaceOnce(
  'i.jsx(qe,{children:a&&bdCanManage&&i.jsx(Sue,',
  'i.jsxs(qe,{children:[a&&bdCanManage&&i.jsx(Sue,',
  "task-page sheet collection",
);

replaceOnce(
  '"edit-sheet")})]})}function So(',
  '"edit-sheet")]})]})}function So(',
  "close task-page sheet collection",
);

replaceOnce(
  'className:"fixed inset-0 z-[75] flex items-end justify-center",style:{backdropFilter:',
  'className:"fixed inset-0 z-[70] flex items-end justify-center",style:{zIndex:75,backdropFilter:',
  "keep task editor above bottom navigation",
);

replaceOnce(
  'value:u,onChange:g=>d(g.target.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"})',
  'value:u,onChange:g=>d(g.target.value),onInput:g=>d(g.currentTarget.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"})',
  "manual task deadline input",
);

replaceOnce(
  'value:h,onChange:b=>g(b.target.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"})',
  'value:h,onChange:b=>g(b.target.value),onInput:b=>g(b.currentTarget.value)}),i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"})',
  "proposal deadline input",
);

replaceOnce(
  'function ze({label:e,placeholder:t,type:n="text",value:r,defaultValue:a,onChange:s,error:l,',
  'function ze({label:e,placeholder:t,type:n="text",value:r,defaultValue:a,onChange:s,onInput:bdOnInput,error:l,',
  "input component accepts input events",
);

replaceOnce(
  "defaultValue:a,onChange:s,disabled:m,readOnly:h,",
  "defaultValue:a,onChange:s,onInput:bdOnInput,disabled:m,readOnly:h,",
  "input component forwards input events",
);

replaceOnce(
  'function bdHomeOverdueTasks(){const e=bdDateKey(new Date);return bdCurrentTasks().filter(t=>t.tab!=="done"&&(t.tab==="overdue"||/^\\d{4}-\\d{2}-\\d{2}$/.test(t.deadline||"")&&t.deadline<e))}',
  'function bdHomeOverdueTasks(){const e=bdDateKey(new Date);return bdCurrentTasks().filter(t=>!t.hidden&&!bdTaskIsPending(t)&&!bdTaskClosedStatuses.has(bdTaskStatus(t))&&(t.tab==="overdue"||/^\\d{4}-\\d{2}-\\d{2}$/.test(t.deadline||"")&&t.deadline<e))}',
  "home excludes unapproved proposals",
);

replaceOnce(
  "function Dce(){const{profile:e}=Un(),",
  "function Dce(){const{isReady:bdHomeCloudReady}=Ai(),{profile:e}=Un(),",
  "home waits for cloud data",
);

replaceOnce(
  "h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),g=S.useMemo(()=>WS(),[]),y=_ce(),",
  "h=S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment}),[t,n,r,d,f,m,e,bdHealthSettings,bdHealthSnapshots,bdHealthEquipment]),[g,bdSetHomeDiagnosis]=S.useState(()=>WS()),y=_ce(),",
  "home diagnosis state",
);

replaceOnce(
  'v=l>=5&&l<12?"Доброе утро":l>=12&&l<17?"Добрый день":l>=17&&l<22?"Добрый вечер":"Доброй ночи";return i.jsx(nt,',
  'v=l>=5&&l<12?"Доброе утро":l>=12&&l<17?"Добрый день":l>=17&&l<22?"Добрый вечер":"Доброй ночи";S.useEffect(()=>{bdHomeCloudReady&&bdSetHomeDiagnosis(WS())},[bdHomeCloudReady]);return i.jsx(nt,',
  "home hydrates diagnosis after cloud sync",
);

replaceOnce(
  "Это аналитические выводы, а не готовые поручения. Создавайте задачу только когда определены ответственный и срок.",
  "Агент подготовил предложения по этим рекомендациям. Проверьте ответственного и срок, затем утвердите или удалите каждое.",
  "analysis proposal copy",
);

replaceOnce(
  'onClick:()=>history.pushState(null,"","/tasks"),style:',
  'onClick:()=>history.pushState(null,"","/tasks?tab=proposed"),style:',
  "open proposed tasks from analysis",
);

replaceOnce(
  'children:"Открыть поручения"',
  'children:"Проверить предложения"',
  "analysis proposal button label",
);

replaceOnce(
  'style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:16},children:[i.jsxs("button",{type:"button",onClick:()=>r("/analysis")',
  'style:{display:"grid",gridTemplateColumns:"1fr",gap:8,marginTop:16},children:[i.jsxs("button",{type:"button",onClick:()=>r("/analysis")',
  "single AI action column",
);

replaceOnce(
  ',i.jsxs("button",{type:"button",onClick:()=>r("/market"),style:{minHeight:44,borderRadius:14,border:"1px solid rgba(255,255,255,.18)",background:"rgba(255,255,255,.10)",color:"#FFFFFF",padding:"0 10px",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:4},children:["Рынок рядом",i.jsx(Br,{size:14})]})',
  "",
  "remove duplicate nearby-market action",
);

writeFileSync(bundlePath, source);
console.log("Applied AI persistence and task proposal workflow patch v32");
