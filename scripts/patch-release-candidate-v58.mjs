import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v58"')) {
  console.log("release candidate v58 already applied");
  process.exit(0);
}
if (!source.includes('bdReleaseCandidateVersion="rc-v57"')) {
  throw new Error("release candidate v57 marker was not found");
}

function replaceRequired(from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  source = source.split(from).join(to);
}

replaceRequired(
  'bdReleaseCandidateVersion="rc-v57"',
  'bdReleaseCandidateVersion="rc-v58"',
  1,
  "release marker",
);

replaceRequired(
  'tt=y-k-q-O-$;return{meta:u',
  'tt=y-k-q-O-(ae?B+U:$);return{meta:u',
  1,
  "full recurring costs for completed months",
);

replaceRequired(
  'const m=e==="final"?t.taxes:t.allocatedTaxes,h=e==="final"?t.utilities:t.allocatedUtilities;',
  'const m=e==="final"||t.periodPast?t.taxes:t.allocatedTaxes,h=e==="final"||t.periodPast?t.utilities:t.allocatedUtilities;',
  1,
  "month-closing operation breakdown",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v58");
