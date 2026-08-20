import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

function replaceRangeOnce(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  const secondStartIndex = source.indexOf(start, startIndex + start.length);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || secondStartIndex >= 0 || endIndex < 0) {
    throw new Error(`${label}: expected one ordered range`);
  }
  return source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

let bundle = readFileSync(bundlePath, "utf8");
bundle = replaceOnce(
  bundle,
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",IC="bd_ai_diagnosis_v5";',
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",IC="bd_ai_diagnosis_v6";',
  "diagnosis cache version",
);

const coverageStart = ',e.contextCoverage&&e.contextCoverage.length>0&&i.jsx(W.div,{custom:1';
const coverageEnd = ',e.topPriority&&i.jsx(W.div,{custom:1';
const collapsedCoverage = String.raw`,e.contextCoverage&&e.contextCoverage.length>0&&i.jsx(W.div,{custom:1,variants:li,initial:"hidden",animate:"show",children:i.jsxs("details",{"data-bd-ai-context":"diagnosis-specificity-v46","data-bd-collapsed-default":!0,style:{overflow:"hidden",borderRadius:20,padding:"0 17px",background:"#FFFFFF",border:"1px solid #E2E4EC",boxShadow:"0 7px 22px rgba(31,37,70,.045)"},children:[i.jsxs("summary",{style:{cursor:"pointer",minHeight:56,listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,WebkitTapHighlightColor:"transparent"},children:[i.jsxs("span",{style:{minWidth:0,display:"grid",gap:4},children:[i.jsx("strong",{style:{fontSize:11,fontWeight:850,letterSpacing:".09em",textTransform:"uppercase",color:"#5754D8"},children:"Что вошло в диагноз"}),i.jsxs("small",{style:{fontSize:11.5,lineHeight:1.35,color:"#74798B"},children:[e.contextCoverage.filter(d=>d.available).length," из ",e.contextCoverage.length," направлений содержат данные"]})]}),i.jsx("span",{style:{flex:"0 0 auto",fontSize:11,fontWeight:800,color:"#5754D8"},children:"Подробнее"})]}),i.jsxs("div",{style:{padding:"0 0 16px",borderTop:"1px solid #ECEEF3"},children:[i.jsx("p",{style:{margin:"12px 0 0",fontSize:12,lineHeight:1.45,color:"#74798B"},children:"По каждому направлению указаны полнота и актуальность данных, использованных агентом."}),i.jsx("div",{style:{display:"grid",gap:9,marginTop:13},children:e.contextCoverage.map((d,f)=>{const h=!d.available?"Нет данных":d.freshness==="fresh"?"Актуально":d.freshness==="aging"?"Нужно обновить":"Устарело",g=!d.available?"#B45309":d.freshness==="fresh"?"#168153":d.freshness==="aging"?"#9A6700":"#C62F43",y=d.updatedAt?new Date(d.updatedAt).toLocaleDateString("ru-RU",{day:"2-digit",month:"short"}):null;return i.jsxs("article",{style:{minWidth:0,borderRadius:14,padding:"11px 12px",background:"#F7F8FB",border:"1px solid #E8E9EF"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[i.jsx("strong",{style:{fontSize:12,color:"#303548",overflowWrap:"anywhere"},children:d.label}),i.jsx("span",{style:{flex:"0 0 auto",fontSize:9.5,fontWeight:850,color:g},children:h})]}),i.jsx("p",{style:{margin:"5px 0 0",fontSize:11,lineHeight:1.4,color:"#74798B",overflowWrap:"anywhere"},children:d.detail}),y&&i.jsxs("small",{style:{display:"block",marginTop:4,fontSize:9.5,color:"#A0A4B2"},children:["Данные на ",y]})]},d.id??f)})})]})]})})`;
bundle = replaceRangeOnce(
  bundle,
  coverageStart,
  coverageEnd,
  collapsedCoverage,
  "collapsed diagnosis context",
);

bundle = replaceOnce(
  bundle,
  'children:"Главное сегодня"',
  'children:"Что делать дальше"',
  "next actions heading",
);
bundle = replaceOnce(
  bundle,
  'children:"Как это устроено"',
  'children:"Что делать по шагам"',
  "steps heading",
);
bundle = replaceOnce(
  bundle,
  '"data-bd-ai-areas":"venue-ai-context-v45"',
  '"data-bd-ai-areas":"diagnosis-specificity-v46"',
  "diagnosis areas version",
);
bundle = replaceOnce(
  bundle,
  '"data-bd-ai-recommendations":"evidence-v26"',
  '"data-bd-ai-recommendations":"diagnosis-specificity-v46"',
  "diagnosis recommendations version",
);

bundle = replaceOnce(
  bundle,
  'children:d.responsibleRole??"Управляющий"',
  'children:["Ответственный: ",d.responsibleRole??"Управляющий"]',
  "recommendation responsible label",
);

const basisBlock = String.raw`i.jsx("p",{style:{margin:"7px 0 0",fontSize:12,lineHeight:1.5,color:"#62687C",overflowWrap:"anywhere"},children:d.basisSummary??"Основание сформировано из данных заведения"})`;
const stepsBlock = String.raw`${basisBlock},d.steps&&d.steps.length>0&&i.jsxs("div",{style:{marginTop:12,borderRadius:14,padding:"12px 13px",background:"#F3F3FF",border:"1px solid #E0E1FA"},children:[i.jsx("p",{style:{margin:0,fontSize:10.5,fontWeight:850,letterSpacing:".06em",textTransform:"uppercase",color:"#5754D8"},children:"Что сделать"}),i.jsx("ol",{style:{display:"grid",gap:7,margin:"9px 0 0",paddingLeft:18},children:d.steps.map((h,g)=>i.jsx("li",{style:{paddingLeft:2,fontSize:11.5,lineHeight:1.45,color:"#4E546A",overflowWrap:"anywhere"},children:h},g))})]})`;
bundle = replaceOnce(bundle, basisBlock, stepsBlock, "recommendation steps");

const oldFooter = String.raw`i.jsxs("div",{style:{display:"flex",justifyContent:"space-between",gap:10,marginTop:12,paddingTop:11,borderTop:"1px solid #ECEEF3"},children:[i.jsx("span",{style:{fontSize:11,color:"#8A8FA1"},children:d.estimatedTime??"Срок не задан"}),i.jsx("span",{style:{fontSize:11,fontWeight:750,color:d.requiresVerification?"#B46618":"#168153"},children:d.requiresVerification?"Сначала проверить":"Факты подтверждены"})]})`;
const concreteFooter = String.raw`i.jsxs("div",{style:{display:"grid",gap:7,marginTop:12,paddingTop:11,borderTop:"1px solid #ECEEF3"},children:[i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:[i.jsx("b",{style:{color:"#303548"},children:"Срок: "}),d.deadline??d.estimatedTime??"Срок не задан"]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:[i.jsx("b",{style:{color:"#303548"},children:"Готово, когда: "}),d.successCriterion??d.expectedResult??"Критерий не задан"]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#62687C"},children:[i.jsx("b",{style:{color:"#303548"},children:"Ожидаемый эффект: "}),d.expectedEffect??d.impact??"Эффект требует проверки"]}),i.jsx("span",{style:{fontSize:11,fontWeight:750,color:d.requiresVerification?"#B46618":"#168153"},children:d.requiresVerification?"Сначала подтвердить исходный факт":"Основание подтверждено данными"})]})`;
bundle = replaceOnce(bundle, oldFooter, concreteFooter, "recommendation execution criteria");

bundle = replaceOnce(
  bundle,
  "Агент подготовил предложения по этим рекомендациям. Проверьте ответственного и срок, затем утвердите или удалите каждое.",
  "Ниже — конкретные шаги, ответственный, срок и критерий готовности. После проверки утвердите задачу или удалите её.",
  "recommendations introduction",
);
writeFileSync(bundlePath, bundle);

const oldVersion = "20260801-ai-context-v45";
const newVersion = "20260801-diagnosis-specificity-v46";
let bootstrap = readFileSync(bootstrapPath, "utf8");
bootstrap = replaceOnce(
  bootstrap,
  `/assets/index-BQGspy0I.js?v=${oldVersion}`,
  `/assets/index-BQGspy0I.js?v=${newVersion}`,
  "module cache key",
);
writeFileSync(bootstrapPath, bootstrap);

for (const path of [appHtmlPath, responsePath]) {
  let source = readFileSync(path, "utf8");
  source = replaceOnce(
    source,
    `/bardoctor-preview.js?v=${oldVersion}`,
    `/bardoctor-preview.js?v=${newVersion}`,
    `bootstrap cache key in ${path.pathname}`,
  );
  writeFileSync(path, source);
}
