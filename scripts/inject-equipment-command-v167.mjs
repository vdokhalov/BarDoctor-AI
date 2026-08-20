import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const bundlePath = join(projectRoot, "public/assets/index-BQGspy0I.js");
const fragmentPath = join(scriptDirectory, "fragments/equipment-command-v167.fragment.txt");
const startMarker = "/* bd-equipment-command-v167:start */";
const endMarker = "/* bd-equipment-command-v167:end */";
const insertionMarker = "/* bd-more-hub-v166:start */";

let bundle = await readFile(bundlePath, "utf8");
let fragment = (await readFile(fragmentPath, "utf8")).trim();
fragment = fragment
  .replace(
    "O=bdEquipmentCostsV167(m,T,d.filter(M=>M.equipmentId===b.id))",
    "O=bdEquipmentCostsV167(m,T,d.filter(M=>M.equipmentId===b.id)).filter(I=>{const V=new Date;V.setMonth(V.getMonth()-12);return new Date(I.date||I.createdAt)>=V})",
  )
  .replace("за 12 мес. / всю историю", "за 12 месяцев");
const existingStart = bundle.indexOf(startMarker);
const existingEnd = bundle.indexOf(endMarker);

if (existingStart >= 0 && existingEnd > existingStart) {
  bundle = bundle.slice(0, existingStart) + bundle.slice(existingEnd + endMarker.length);
}

if (bundle.includes("function kue()")) {
  bundle = bundle.replace("function kue()", "function bdEquipmentLegacyPageV166()");
}
if (bundle.includes("function JAe()")) {
  bundle = bundle.replace("function JAe()", "function bdEquipmentLegacyDetailV166()");
}
if (!bundle.includes("function bdEquipmentLegacyPageV166()") || !bundle.includes("function bdEquipmentLegacyDetailV166()")) {
  throw new Error("Legacy Equipment components were not found");
}

const defaultsNeedle = "bd_equipment:Bz(),bd_equipment_history:Fz(),bd_payroll_rules:Hz()";
if (bundle.includes(defaultsNeedle)) {
  bundle = bundle.replace(
    defaultsNeedle,
    "bd_equipment:Bz(),bd_equipment_history:Fz(),bd_equipment_work_orders:[],bd_payroll_rules:Hz()",
  );
}

const healthNeedle = 'y===0&&f.push({text:"Добавленное оборудование отмечено как исправное",positive:!0})}const{openCount:u,resolvedCount:m}=Yg(s);';
const invalidHealthPatch = 'const x=l.filter(v=>!["working","broken","under_repair","needs_maintenance"].includes(v.status)).length;x>0&&f.push({text:"Нет оценки состояния: "+x+" ед.",positive:!1}),y===0&&x===0&&f.push({text:"Добавленное оборудование отмечено как исправное",positive:!0})}const{openCount:u,resolvedCount:m}=Yg(s);';
const validHealthPatch = 'l.filter(v=>!["working","broken","under_repair","needs_maintenance"].includes(v.status)).length>0&&f.push({text:"Нет оценки состояния: "+l.filter(v=>!["working","broken","under_repair","needs_maintenance"].includes(v.status)).length+" ед.",positive:!1}),y===0&&l.every(v=>v.status==="working")&&f.push({text:"Добавленное оборудование отмечено как исправное",positive:!0})}const{openCount:u,resolvedCount:m}=Yg(s);';
if (bundle.includes(invalidHealthPatch)) {
  bundle = bundle.replace(invalidHealthPatch, validHealthPatch);
}
if (bundle.includes(healthNeedle)) {
  bundle = bundle.replace(
    healthNeedle,
    validHealthPatch,
  );
}

const insertionIndex = bundle.indexOf(insertionMarker);
if (insertionIndex < 0) throw new Error("Equipment insertion marker was not found");

bundle = bundle.slice(0, insertionIndex) + fragment + "\n\n" + bundle.slice(insertionIndex);
await writeFile(bundlePath, bundle);
console.log("Equipment command center v167 injected");
