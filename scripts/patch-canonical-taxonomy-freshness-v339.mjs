import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCanonicalTaxonomyFreshnessVersion="v339"';
if (source.includes(marker)) {
  console.log("Canonical taxonomy freshness v339 is already applied.");
  process.exit(0);
}
if (!source.includes('const bdCanonicalTaxonomyReuseVersion="v338"')) {
  throw new Error("Canonical taxonomy reuse v338 must be applied first.");
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

source = source.replace(
  "function bdTaxonomyManagerV336",
  marker + ";\nfunction bdTaxonomyManagerV336",
);
replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  '[f,m]=S.useState(null),[h,g]=S.useState("");',
  '[f,m]=S.useState(null),[h,g]=S.useState(""),[bdTaxUpdatedV339,bdSetTaxUpdatedV339]=S.useState("");',
  "taxonomy freshness state",
);
replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  'n(C.taxonomy),a(C.usage||[]),l("ready")',
  'n(C.taxonomy),a(C.usage||[]),bdSetTaxUpdatedV339(C.updatedAt||""),l("ready")',
  "remember taxonomy freshness",
);
replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  'body:JSON.stringify(C)',
  'body:JSON.stringify({...C,expectedUpdatedAt:bdTaxUpdatedV339})',
  "send taxonomy freshness token",
);
replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  'n(x.taxonomy),a(x.usage||[]),x.assortment&&',
  'n(x.taxonomy),a(x.usage||[]),bdSetTaxUpdatedV339(x.updatedAt||""),x.assortment&&',
  "refresh taxonomy freshness token",
);
replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  'if(x.code==="TAXONOMY_NOT_EMPTY")m({mutation:C,count:x.details?.itemCount||0});else d(x.message)',
  'if(x.code==="TAXONOMY_NOT_EMPTY")m({mutation:C,count:x.details?.itemCount||0});else if(x.code==="DATA_STALE")await y();else d(x.message)',
  "recover stale taxonomy mutation",
);

writeFileSync(bundlePath, source);
console.log("Applied canonical taxonomy freshness v339.");
