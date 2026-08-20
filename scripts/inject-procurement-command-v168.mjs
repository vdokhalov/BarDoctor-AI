import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const bundlePath = join(projectRoot, "public/assets/index-BQGspy0I.js");
const fragmentPath = join(scriptDirectory, "fragments/procurement-command-v168.fragment.txt");
const startMarker = "/* bd-procurement-command-v168:start */";
const endMarker = "/* bd-procurement-command-v168:end */";
const insertionMarker = "/* bd-more-hub-v166:start */";

let bundle = await readFile(bundlePath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).trim();
const existingStart = bundle.indexOf(startMarker);
const existingEnd = bundle.indexOf(endMarker);

if (existingStart >= 0 && existingEnd > existingStart) {
  bundle = bundle.slice(0, existingStart) + bundle.slice(existingEnd + endMarker.length);
}

if (!bundle.includes("function bdSuppliersPage()")) {
  throw new Error("Legacy procurement component was not found");
}

const routeNeedle = "component:bdSuppliersPage";
if (bundle.includes(routeNeedle)) {
  bundle = bundle.replace(routeNeedle, "component:bdProcurementCommandPageV168");
}
if (!bundle.includes("component:bdProcurementCommandPageV168")) {
  throw new Error("Procurement route was not updated");
}

const homeDeclaration = "const m=bdHealthInventoryStatus({settings:s,snapshots:l}),h=bdHomeMissingReports(e,n,r,t),g=bdHomeOverdueTasks(),y=bdHomeDataRisks(),j=[]";
const homeDeclarationPatched = "const m=bdHealthInventoryStatus({settings:s,snapshots:l}),h=bdHomeMissingReports(e,n,r,t),g=bdHomeOverdueTasks(),y=bdHomeDataRisks(),bdProcSignals=bdProcurementHomeSignalsV168(),j=[]";
if (bundle.includes(homeDeclaration)) {
  bundle = bundle.replace(homeDeclaration, homeDeclarationPatched);
}

const homeInsertion = 'a.length&&j.push({label:"Оборудование требует внимания",detail:a.length+" "+(a.length===1?"предупреждение":"предупреждения"),href:"/equipment",tone:"red"}),g.length&&j.push';
const homeInsertionPatched = 'a.length&&j.push({label:"Оборудование требует внимания",detail:a.length+" "+(a.length===1?"предупреждение":"предупреждения"),href:"/equipment",tone:"red"}),bdProcSignals.length&&j.push({...bdProcSignals[0],tone:bdProcSignals[0].tone==="red"?"red":"amber"}),g.length&&j.push';
if (bundle.includes(homeInsertion)) {
  bundle = bundle.replace(homeInsertion, homeInsertionPatched);
}
if (!bundle.includes("bdProcSignals=bdProcurementHomeSignalsV168()") || !bundle.includes("bdProcSignals.length&&j.push")) {
  throw new Error("Unified Home attention signal was not connected");
}

bundle = bundle.replace("bdMoreReleaseNumberV166=167", "bdMoreReleaseNumberV166=168");

const insertionIndex = bundle.indexOf(insertionMarker);
if (insertionIndex < 0) throw new Error("Procurement insertion marker was not found");

bundle = bundle.slice(0, insertionIndex) + fragment + "\n\n" + bundle.slice(insertionIndex);
await writeFile(bundlePath, bundle);
console.log("Procurement command center v168 injected");
