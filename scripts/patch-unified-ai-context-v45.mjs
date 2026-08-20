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

let bundle = readFileSync(bundlePath, "utf8");
bundle = replaceOnce(
  bundle,
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",IC="bd_ai_diagnosis_v4";',
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",IC="bd_ai_diagnosis_v5";',
  "diagnosis cache version",
);

const coverageNeedle = ',e.topPriority&&i.jsx(W.div,{custom:1';
const coverageBlock = String.raw`,e.contextCoverage&&e.contextCoverage.length>0&&i.jsx(W.div,{custom:1,variants:li,initial:"hidden",animate:"show",children:i.jsxs("section",{"data-bd-ai-context":"venue-ai-context-v45",style:{borderRadius:20,padding:"16px 17px",background:"#FFFFFF",border:"1px solid #E2E4EC",boxShadow:"0 7px 22px rgba(31,37,70,.045)"},children:[i.jsx("p",{style:{margin:0,fontSize:11,fontWeight:850,letterSpacing:".09em",textTransform:"uppercase",color:"#5754D8"},children:"Что вошло в диагноз"}),i.jsxs("p",{style:{margin:"6px 0 0",fontSize:12,lineHeight:1.45,color:"#74798B"},children:[e.contextCoverage.filter(d=>d.available).length," из ",e.contextCoverage.length," направлений содержат данные. По каждому указана актуальность."]}),i.jsx("div",{style:{display:"grid",gap:9,marginTop:13},children:e.contextCoverage.map((d,f)=>{const h=!d.available?"Нет данных":d.freshness==="fresh"?"Актуально":d.freshness==="aging"?"Нужно обновить":"Устарело",g=!d.available?"#B45309":d.freshness==="fresh"?"#168153":d.freshness==="aging"?"#9A6700":"#C62F43",y=d.updatedAt?new Date(d.updatedAt).toLocaleDateString("ru-RU",{day:"2-digit",month:"short"}):null;return i.jsxs("article",{style:{minWidth:0,borderRadius:14,padding:"11px 12px",background:"#F7F8FB",border:"1px solid #E8E9EF"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[i.jsx("strong",{style:{fontSize:12,color:"#303548",overflowWrap:"anywhere"},children:d.label}),i.jsx("span",{style:{flex:"0 0 auto",fontSize:9.5,fontWeight:850,color:g},children:h})]}),i.jsx("p",{style:{margin:"5px 0 0",fontSize:11,lineHeight:1.4,color:"#74798B",overflowWrap:"anywhere"},children:d.detail}),y&&i.jsxs("small",{style:{display:"block",marginTop:4,fontSize:9.5,color:"#A0A4B2"},children:["Данные на ",y]})]},d.id??f)})})]})})`;
bundle = replaceOnce(
  bundle,
  coverageNeedle,
  `${coverageBlock}${coverageNeedle}`,
  "diagnosis context coverage",
);

const areasNeedle = ',e.actions&&e.actions.length>0&&i.jsxs(W.div,{custom:6';
const areasBlock = String.raw`,e.areas&&e.areas.length>0&&i.jsxs(W.div,{custom:6,variants:li,initial:"hidden",animate:"show","data-bd-ai-areas":"venue-ai-context-v45",style:{display:"flex",flexDirection:"column",gap:10},children:[i.jsxs("div",{style:{padding:"0 2px"},children:[i.jsx("p",{style:{margin:0,fontSize:11,fontWeight:850,letterSpacing:".09em",textTransform:"uppercase",color:"#5754D8"},children:"Разбор направлений"}),i.jsx("p",{style:{margin:"5px 0 0",fontSize:12,lineHeight:1.45,color:"#74798B"},children:"Факт → причина или гипотеза → последствия → действие → проверка результата."})]}),e.areas.map((d,f)=>{const h=d.status==="risk"?"Риск":d.status==="opportunity"?"Возможность":d.status==="no_data"?"Нет данных":"Без отклонений",g=d.status==="risk"?"#C62F43":d.status==="opportunity"?"#168153":d.status==="no_data"?"#B45309":"#5754D8";return i.jsxs("details",{open:d.status==="risk",style:{minWidth:0,overflow:"hidden",borderRadius:18,padding:"13px 14px",background:"#FFFFFF",border:"1px solid #E2E4EC"},children:[i.jsxs("summary",{style:{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,listStyle:"none"},children:[i.jsx("strong",{style:{fontSize:13,color:"#272B3B",overflowWrap:"anywhere"},children:d.label}),i.jsx("span",{style:{flex:"0 0 auto",fontSize:9.5,fontWeight:850,color:g},children:h})]}),i.jsxs("div",{style:{display:"grid",gap:9,marginTop:12,paddingTop:11,borderTop:"1px solid #ECEEF3"},children:[i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Факт: "}),d.fact]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Причина / гипотеза: "}),d.hypothesis]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Последствия: "}),d.consequence]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Действие: "}),d.action]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.45,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Проверка: "}),d.verification]})]})]},d.id??f)})]})`;
bundle = replaceOnce(
  bundle,
  areasNeedle,
  `${areasBlock}${areasNeedle}`,
  "diagnosis area findings",
);
writeFileSync(bundlePath, bundle);

const oldVersion = "20260801-catalog-move-v44";
const newVersion = "20260801-ai-context-v45";
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
