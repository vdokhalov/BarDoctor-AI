import fs from "node:fs";
import path from "node:path";

const bundlePath = path.join(process.cwd(), "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v53"')) {
  console.log("release candidate v53 already applied");
  process.exit(0);
}

function replaceOnce(oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`${label} anchor was not found`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${label} anchor is not unique`);
  }
  source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}

replaceOnce(
  'bdReleaseCandidateVersion="rc-v52"',
  'bdReleaseCandidateVersion="rc-v53"',
  "release marker",
);

// The narrative AI summary duplicated the actionable recommendation cards and
// looked like a second, unstructured task list. Keep it only as a fallback when
// the AI response has no structured actions.
replaceOnce(
  "e.analysis?.how&&i.jsx(W.div",
  "e.analysis?.how&&(!e.actions||e.actions.length===0)&&i.jsx(W.div",
  "duplicate AI plan visibility",
);
replaceOnce(
  'children:"Что делать по шагам"',
  'children:"Краткий план"',
  "AI fallback plan title",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v53");
