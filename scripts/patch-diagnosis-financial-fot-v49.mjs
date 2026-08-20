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
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",bdDiagnosisFinancialCoreVersion="closed-month-management-v48",IC="bd_ai_diagnosis_v7";',
  'const bdAiEvidenceVersion="evidence-and-proposals-v32",bdUnifiedAiContextVersion="venue-ai-context-v45",bdDiagnosisSpecificityVersion="diagnosis-specificity-v46",bdDiagnosisFinancialCoreVersion="closed-month-management-v48",bdDiagnosisFinancialFOTVersion="financial-fot-v49",IC="bd_ai_diagnosis_v8";',
  "financial diagnosis cache",
);

bundle = replaceOnce(
  bundle,
  '"data-bd-financial-assessment":"closed-month-management-v48"',
  '"data-bd-financial-assessment":"financial-fot-v49"',
  "financial assessment marker",
);

const financialSummary = String.raw`i.jsxs("p",{style:{margin:"5px 0 0",fontSize:11.5,color:"#7A8092"},children:["Чистая прибыль",e.profitMarginPercent!=null?" · "+new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(Number(e.profitMarginPercent))+"% от выручки":""]}),i.jsx("p",{style:{margin:"14px 0 0",fontSize:13,lineHeight:1.55,color:"#3F455A",overflowWrap:"anywhere"},children:e.evaluation})`;
const financialSummaryWithFOT = String.raw`i.jsxs("p",{style:{margin:"5px 0 0",fontSize:11.5,color:"#7A8092"},children:[t?"Чистый убыток":"Чистая прибыль",e.profitMarginPercent!=null?" · "+new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(Number(e.profitMarginPercent))+"% от выручки":""]}),e.payroll!=null&&i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:12,padding:"10px 11px",borderRadius:13,background:"#F7F8FC",border:"1px solid #E8EAF0"},children:[i.jsxs("span",{style:{fontSize:11.5,fontWeight:850,color:"#3E4357"},children:["ФОТ · ",bdDiagnosisMoneyV48(e.payroll)]}),i.jsx("span",{style:{fontSize:11,fontWeight:800,color:"#777D90",whiteSpace:"nowrap"},children:e.payrollSharePercent!=null?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(Number(e.payrollSharePercent))+"% выручки":"доля не рассчитана"})]}),i.jsx("p",{style:{margin:"14px 0 0",fontSize:13,lineHeight:1.55,color:"#3F455A",overflowWrap:"anywhere"},children:e.evaluation})`;
bundle = replaceOnce(bundle, financialSummary, financialSummaryWithFOT, "FOT financial summary");

bundle = replaceOnce(
  bundle,
  'children:"Диагноз дня"',
  'children:"Управленческий диагноз"',
  "diagnosis heading",
);

bundle = replaceOnce(
  bundle,
  'const WM=["Сверяем факты и актуальность данных","Ищем отклонения и операционные риски","Определяем главный приоритет","Готовим конкретный план действий"]',
  'const WM=["Читаем закрытый месячный результат","Сопоставляем прибыль, ФОТ и расходы","Ищем операционные причины результата","Готовим план на следующий период"]',
  "diagnosis loader stages",
);

writeFileSync(bundlePath, bundle);

const oldVersion = "20260802-diagnosis-financial-v48";
const newVersion = "20260802-diagnosis-financial-fot-v49";
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

console.log("Diagnosis financial FOT v49 applied.");
