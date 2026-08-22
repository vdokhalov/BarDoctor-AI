import fs from "node:fs";

const file = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(file, "utf8");

const replacements = [
  ['window.location.assign("/catalog")', 'window.bdNavigate("/catalog")'],
  ['window.location.assign("/data-control")', 'window.bdNavigate("/data-control")'],
  ['window.location.href="/suppliers?tab=purchases&filter=unpaid"', 'window.bdNavigate("/suppliers?tab=purchases&filter=unpaid")'],
  ['window.location.assign("/tasks?tab="+bdTaskView(e))', 'window.bdNavigate("/tasks?tab="+bdTaskView(e))'],
  ['window.location.assign("/tasks?tab=proposed")', 'window.bdNavigate("/tasks?tab=proposed")'],
  ['window.location.assign("/tasks?tab="+bdTaskView(s))', 'window.bdNavigate("/tasks?tab="+bdTaskView(s))'],
  ['window.location.assign("/tasks?new=1&title="+', 'window.bdNavigate("/tasks?new=1&title="+'],
  ['window.location.href="/catalog"', 'window.bdNavigate("/catalog")'],
  ['window.location.href="/supplier-alternatives"', 'window.bdNavigate("/supplier-alternatives")'],
  ['window.location.href="/tasks?new=1&title="+u', 'window.bdNavigate("/tasks?new=1&title="+u)'],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) continue;
  source = source.split(from).join(to);
}

source = source.replace("\n\nfunction bdNomenclatureDefaultStructure", "\n\nwindow.bdNavigationHardcodedPatchV247=true;\nfunction bdNomenclatureDefaultStructure");
fs.writeFileSync(file, source);
console.log("Navigation hardcoded transitions v247 patched");
