import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v56"')) {
  console.log("release candidate v56 already applied");
  process.exit(0);
}

if (!source.includes('bdReleaseCandidateVersion="rc-v55"')) {
  throw new Error("release candidate v55 marker was not found");
}

function replaceRequired(from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  source = source.split(from).join(to);
}

source = source.replace(
  'bdReleaseCandidateVersion="rc-v55"',
  'bdReleaseCandidateVersion="rc-v56"',
);

const backClass =
  'className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"';

for (const [from, count] of [
  [`onClick:()=>navigate("/home"),${backClass}`, 1],
  [`onClick:()=>e("/home"),${backClass}`, 1],
  [`onClick:()=>t("/finance"),${backClass}`, 1],
  [`onClick:t,${backClass}`, 5],
]) {
  replaceRequired(
    from,
    from.replace(`,${backClass}`, `,"aria-label":"Назад",${backClass}`),
    count,
    "back button accessible name",
  );
}

const fabClass =
  'className:"fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)] active:scale-95 transition-transform z-30"';
replaceRequired(
  `onClick:()=>{A(void 0),O(void 0),L(void 0),_(b==="revenue"?"revenue":"expense")},${fabClass}`,
  `onClick:()=>{A(void 0),O(void 0),L(void 0),_(b==="revenue"?"revenue":"expense")},"aria-label":"Добавить операцию",${fabClass}`,
  1,
  "finance floating action button accessible name",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v56");
