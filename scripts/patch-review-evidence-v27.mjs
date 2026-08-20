import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");

const marker = 'const bdReviewEvidenceUiVersion="review-evidence-v27"';
if (source.includes(marker)) {
  console.log("Review evidence UI v27 is already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  'function Bl({title:e,items:t,tone:n}){',
  `${marker};function Bl({title:e,items:t,tone:n}){`,
  "review evidence version marker",
);

replaceOnce(
  'i.jsx("p",{className:"text-[12px] text-muted-foreground",children:r.impact})',
  'i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("p",{className:"text-[12px] text-muted-foreground",children:r.impact}),i.jsxs("p",{className:"text-[11px] text-foreground/70 leading-relaxed",children:["Основание: ",r.basisSummary??"требует проверки по данным заведения"]}),r.evidence?.length>0&&i.jsxs("details",{className:"mt-1 text-[11px] text-muted-foreground",children:[i.jsxs("summary",{className:"font-semibold cursor-pointer",children:["Факты · ",r.evidence.length]}),i.jsx("div",{className:"mt-1 flex flex-col gap-1",children:r.evidence.map((s,l)=>i.jsxs("p",{className:"leading-relaxed",children:[i.jsxs("strong",{children:[s.label,": "]}),s.fact]},s.id??l))})]})]})',
  "review correlation action evidence",
);

writeFileSync(bundlePath, source);
console.log("Applied review evidence UI patch v27");
