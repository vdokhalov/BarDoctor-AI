import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const first = bundle.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (bundle.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
}

if (bundle.includes('bdAISelfServiceVersion="self-service-v255"')) {
  console.log("AI Doctor self-service analytics v255 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdAIManagementBriefingVersion="management-briefing-v254",bdStartupFirstPaintVersion=',
  'bdAIManagementBriefingVersion="management-briefing-v254",bdAISelfServiceVersion="self-service-v255",bdStartupFirstPaintVersion=',
  "self-service version marker",
);
replaceOnce(
  'd=p.briefing??{},f=d.diagnosis??null,m=Array.isArray(d.keyDrivers)?d.keyDrivers:[],h=',
  'd=p.briefing??{},f=d.diagnosis??null,m=Array.isArray(d.keyDrivers)?d.keyDrivers:[],z=Array.isArray(d.findings)?d.findings:[],h=',
  "briefing findings binding",
);
replaceOnce(
  'N=d.dataQualitySummary??{},E=new Date(',
  'N=d.dataQualitySummary??{},C=d.externalContextState??{},R=d.verificationPlan??{},E=new Date(',
  "briefing state binding",
);
replaceOnce(
  '"data-bd-ai-result":"management-briefing-v254","data-bd-management-briefing":"coherent-v1","data-bd-ai-attention":"runtime-v199",className:"bd-ai-doctor-v196 bd-ai-management-v254"',
  '"data-bd-ai-result":"self-service-v255","data-bd-management-briefing":"self-service-v1","data-bd-ai-attention":"runtime-v199",className:"bd-ai-doctor-v196 bd-ai-management-v254 bd-ai-self-service-v255"',
  "self-service result hook",
);

const todayStart = ']}),i.jsxs("section",{className:"bd-ai-management-section bd-ai-management-today"';
const findingsSection = ']}),i.jsxs("section",{className:"bd-ai-management-section bd-ai-management-findings",children:[i.jsxs("div",{className:"bd-ai-management-section-head",children:[i.jsx("h2",{children:"Что AI уже выяснил"}),i.jsx("span",{children:z.length?z.length+" выводов":"Выводов пока нет"})]}),z.length?i.jsx("div",{className:"bd-ai-management-findings-list",children:z.map(c=>i.jsxs("article",{className:"is-"+(c.status??"finding"),children:[i.jsxs("div",{children:[i.jsx("strong",{children:c.status==="limitation"?"Ограничение":c.status==="hypothesis"?"Гипотеза":"Вывод"}),i.jsx("h3",{children:c.title})]}),i.jsx("p",{children:c.detail}),c.contribution&&i.jsxs("small",{children:["Вклад: ",c.contribution]})]},c.id))}):i.jsx("div",{className:"bd-ai-management-empty",children:"Новых расчётных выводов для этой смены пока нет."})]}),i.jsxs("section",{className:"bd-ai-management-section bd-ai-management-today"';
replaceOnce(todayStart, findingsSection, "self-service findings section");

replaceOnce(
  'i.jsx("div",{className:"bd-ai-management-empty",children:"Значимых внешних факторов на текущую смену не обнаружено."})',
  'i.jsx("div",{className:"bd-ai-management-empty",children:C.message??"Недостаточно внешних данных для уверенного вывода."})',
  "honest external state",
);

const checksStart = 'y.length?i.jsx("div",{className:"bd-ai-management-checks"';
replaceOnce(
  checksStart,
  'R.status==="completed"&&R.result?i.jsxs("article",{className:"bd-ai-verification-result",children:[i.jsx("strong",{children:R.result.summary}),Array.isArray(R.result.confirmed)&&R.result.confirmed.length>0&&i.jsx("ul",{children:R.result.confirmed.map(c=>i.jsx("li",{children:c},c))}),Array.isArray(R.result.notConfirmed)&&R.result.notConfirmed.length>0&&i.jsx("p",{children:R.result.notConfirmed.join(" ")}),i.jsx("small",{children:R.result.actionOutcome})]}):y.length?i.jsx("div",{className:"bd-ai-management-checks"',
  "post-shift verification result",
);

replaceOnce(
  'i.jsxs("p",{children:["Достоверность гипотезы: ",c.confidencePercent,"% · ",c.causalStatus]})',
  'i.jsxs("p",{children:["Достоверность гипотезы: ",c.confidencePercent,"%"]})',
  "technical hypothesis enum",
);

writeFileSync(bundlePath, bundle);
console.log("Installed AI Doctor self-service analytics v255");
