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
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",IC="bd_ai_diagnosis_v6";',
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",bdDiagnosisFinancialCoreVersion="closed-month-management-v48",IC="bd_ai_diagnosis_v7";',
  "diagnosis cache version",
);

const componentAnchor = "function Fce({data:e,generatedAt:t,onRefresh:n}){";
const financialComponent = String.raw`
function bdDiagnosisMoneyV48(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(t)+" ₽":"—"}
function bdDiagnosisFinancialCardV48({value:e}){const t=e.verdict==="loss",n=e.verdict==="break_even",r=t?"#C62F43":n?"#9A6700":"#168153",a=t?"УБЫТОК":n?"БЕЗУБЫТОЧНОСТЬ":"ПРИБЫЛЬ",s=Array.isArray(e.keyDrivers)?e.keyDrivers.slice(0,3):[];return i.jsx(W.div,{custom:0,variants:li,initial:"hidden",animate:"show",children:i.jsxs("section",{"data-bd-financial-assessment":"closed-month-management-v48",style:{overflow:"hidden",borderRadius:22,background:"#FFFFFF",border:"1px solid #DFE3ED",boxShadow:"0 10px 28px rgba(28,35,68,.07)"},children:[i.jsx("div",{style:{height:4,background:r}}),i.jsxs("div",{style:{padding:"17px 17px 16px"},children:[i.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12},children:[i.jsxs("div",{style:{minWidth:0},children:[i.jsx("p",{style:{margin:0,fontSize:10.5,fontWeight:900,letterSpacing:".09em",textTransform:"uppercase",color:"#5754D8"},children:"Итог закрытого месяца"}),i.jsx("p",{style:{margin:"5px 0 0",fontSize:13,fontWeight:800,color:"#34394D",textTransform:"capitalize",overflowWrap:"anywhere"},children:e.periodLabel})]}),i.jsx("span",{style:{flex:"0 0 auto",borderRadius:999,padding:"5px 8px",background:t?"#FFF0F2":n?"#FFF8E7":"#ECF9F3",color:r,fontSize:9.5,fontWeight:900,letterSpacing:".05em"},children:a})]}),i.jsx("p",{style:{margin:"14px 0 0",fontSize:29,lineHeight:1.05,fontWeight:950,color:r,fontVariantNumeric:"tabular-nums",overflowWrap:"anywhere"},children:bdDiagnosisMoneyV48(e.finalProfit)}),i.jsxs("p",{style:{margin:"5px 0 0",fontSize:11.5,color:"#7A8092"},children:["Чистая прибыль",e.profitMarginPercent!=null?" · "+new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(Number(e.profitMarginPercent))+"% от выручки":""]}),i.jsx("p",{style:{margin:"14px 0 0",fontSize:13,lineHeight:1.55,color:"#3F455A",overflowWrap:"anywhere"},children:e.evaluation}),i.jsx("div",{style:{marginTop:12,borderRadius:14,padding:"11px 12px",background:"#F6F7FB",border:"1px solid #E8EAF0"},children:i.jsx("p",{style:{margin:0,fontSize:11.5,lineHeight:1.48,color:"#62687B",overflowWrap:"anywhere"},children:e.comparison})}),s.length>0&&i.jsxs("details",{style:{marginTop:12,borderRadius:14,padding:"0 12px",background:"#FAFAFC",border:"1px solid #E8EAF0"},children:[i.jsxs("summary",{style:{cursor:"pointer",minHeight:43,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,listStyle:"none",fontSize:11.5,fontWeight:850,color:"#3E4357"},children:[i.jsx("span",{children:"Ключевые факторы результата"}),i.jsxs("small",{style:{fontSize:10.5,color:"#777D90"},children:[s.length," · подробнее"]})]}),i.jsx("div",{style:{display:"grid",gap:10,padding:"0 0 12px",borderTop:"1px solid #ECEEF3"},children:s.map((l,u)=>i.jsxs("div",{style:{paddingTop:10,minWidth:0},children:[i.jsx("strong",{style:{display:"block",fontSize:11.5,color:"#34394D",overflowWrap:"anywhere"},children:l.label}),i.jsx("p",{style:{margin:"3px 0 0",fontSize:11.5,lineHeight:1.42,color:"#62687B",overflowWrap:"anywhere"},children:l.fact}),i.jsx("p",{style:{margin:"4px 0 0",fontSize:11,lineHeight:1.42,color:"#858A9B",overflowWrap:"anywhere"},children:l.implication})]},u))})]}),i.jsxs("div",{style:{marginTop:13,borderRadius:15,padding:"12px 13px",background:"#F1F1FF",border:"1px solid #DEDEF9"},children:[i.jsx("p",{style:{margin:0,fontSize:10,fontWeight:900,letterSpacing:".06em",textTransform:"uppercase",color:"#5754D8"},children:"Управленческий вывод"}),i.jsx("p",{style:{margin:"6px 0 0",fontSize:12.5,lineHeight:1.5,color:"#484E66",overflowWrap:"anywhere"},children:e.managementConclusion})]}),i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:13,paddingTop:12,borderTop:"1px solid #ECEEF3"},children:[i.jsx("small",{style:{maxWidth:"58%",fontSize:9.8,lineHeight:1.35,color:"#9296A5"},children:"Здесь только оценка; полная расшифровка остаётся в отчёте."}),i.jsx("a",{href:e.reportPath??"/reports",style:{flex:"0 0 auto",fontSize:11.5,fontWeight:850,color:"#5754D8",textDecoration:"none"},children:"Открыть отчёт →"})]})]})]})})}
`;
bundle = replaceOnce(
  bundle,
  componentAnchor,
  `${financialComponent}${componentAnchor}`,
  "financial assessment component",
);

bundle = replaceOnce(
  bundle,
  'children:[e.topThree&&e.topThree.length>0&&i.jsx(W.div,{custom:0',
  'children:[e.financialAssessment&&i.jsx(bdDiagnosisFinancialCardV48,{value:e.financialAssessment}),e.topThree&&e.topThree.length>0&&i.jsx(W.div,{custom:0',
  "financial assessment placement",
);
writeFileSync(bundlePath, bundle);

const oldVersion = "20260801-diagnosis-loader-v47";
const newVersion = "20260802-diagnosis-financial-v48";
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
