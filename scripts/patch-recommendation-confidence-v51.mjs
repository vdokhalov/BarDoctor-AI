import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");

const marker = 'bdRecommendationConfidenceVersion="confidence-reason-v51"';
if (bundle.includes(marker)) {
  console.log("Recommendation confidence details v51 are already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  'bdRecommendationOutcomeVersion="recommendation-outcomes-v50",IC="bd_ai_diagnosis_v9";',
  'bdRecommendationOutcomeVersion="recommendation-outcomes-v50",bdRecommendationConfidenceVersion="confidence-reason-v51",IC="bd_ai_diagnosis_v9";',
  "confidence display version",
);

replaceOnce(
  'e.hypothesis," · ",bdRecommendationConfidenceLabel(e.hypothesisConfidence)," уверенность"]}),e.consequence&&',
  'e.hypothesis," · ",bdRecommendationConfidenceLabel(e.hypothesisConfidence)," уверенность"]}),e.confidenceReason&&i.jsxs("p",{style:{margin:0,fontSize:10.5,lineHeight:1.42,color:"#777C8E"},children:[i.jsx("b",{children:"Почему такая уверенность: "}),e.confidenceReason]}),e.consequence&&',
  "task confidence rationale",
);

replaceOnce(
  'children:bdRecommendationConfidenceLabel(d.hypothesisConfidence)+" уверенность"})]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.47,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Последствия: "})',
  'children:bdRecommendationConfidenceLabel(d.hypothesisConfidence)+" уверенность"})]}),d.confidenceReason&&i.jsxs("p",{style:{margin:0,fontSize:10.5,lineHeight:1.42,color:"#777C8E"},children:[i.jsx("b",{children:"Почему такая уверенность: "}),d.confidenceReason]}),i.jsxs("p",{style:{margin:0,fontSize:11.5,lineHeight:1.47,color:"#555B70"},children:[i.jsx("b",{style:{color:"#303548"},children:"Последствия: "})',
  "diagnosis confidence rationale",
);

writeFileSync(bundlePath, bundle);
console.log("Applied recommendation confidence details v51");
