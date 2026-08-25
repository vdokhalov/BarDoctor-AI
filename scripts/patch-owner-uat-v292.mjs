import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV292="owner-uat-v292";';
if (source.includes(marker)) {
  console.log("Owner UAT v292 patch already applied");
  process.exit(0);
}

const oldReadModel = 'he=bdAssortmentLocal.menuItems.length?{...bdAssortmentLocal,economics:V?.economics??bdAssortmentLocal.economics,costChanges:V?.costChanges??bdAssortmentLocal.costChanges,period:V?.period??bdAssortmentLocal.period}:V||bdAssortmentLocal';
const newReadModel = 'he=V?.menuItems?.length?V:bdAssortmentLocal.menuItems.length?{...bdAssortmentLocal,economics:V?.economics??bdAssortmentLocal.economics,costChanges:V?.costChanges??bdAssortmentLocal.costChanges,period:V?.period??bdAssortmentLocal.period}:V||bdAssortmentLocal';
if (!source.includes(oldReadModel)) throw new Error("Owner UAT v292 server assortment preference target not found");
source = source.replace(oldReadModel, newReadModel);

const oldFallbackStatus = 'recipeId:h?.id||null,recipeStatus:h?.status||"missing",status:y';
const newFallbackStatus = 'recipeId:h?.id||null,recipeStatus:h?.status||"missing",techCardStatus:h?h.reviewStatus==="approved"||h.status==="confirmed"?"approved":h.reviewStatus==="ai_draft"?"ai_draft":"requires_review":"missing",status:y';
if (!source.includes(oldFallbackStatus)) throw new Error("Owner UAT v292 fallback tech-card status target not found");
source = marker + source.replace(oldFallbackStatus, newFallbackStatus);
writeFileSync(bundlePath, source);
console.log("Owner UAT v292 patch applied");
