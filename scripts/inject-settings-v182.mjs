import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const bundlePath = join(projectRoot, "public/assets/index-BQGspy0I.js");
const fragmentPath = join(scriptDirectory, "fragments/settings-v182.fragment.txt");
const startMarker = "/* bd-settings-v182:start */";
const endMarker = "/* bd-settings-v182:end */";
const insertionMarker = "const n_e=";

let bundle = await readFile(bundlePath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).trim();
const existingStart = bundle.indexOf(startMarker);
const existingEnd = bundle.indexOf(endMarker, existingStart);

if (existingStart >= 0 && existingEnd > existingStart) {
  bundle = bundle.slice(0, existingStart) + bundle.slice(existingEnd + endMarker.length);
}

const insertionIndex = bundle.indexOf(insertionMarker);
if (insertionIndex < 0) throw new Error("Settings insertion marker was not found");
bundle = bundle.slice(0, insertionIndex) + fragment + "\n" + bundle.slice(insertionIndex);

const routeBefore = 'path:"/settings",component:()=>i.jsx(pt,{component:Ll})';
const routeAfter = 'path:"/settings",component:()=>i.jsx(pt,{component:bdSettingsPageV182})';
if (bundle.includes(routeBefore)) bundle = bundle.replace(routeBefore, routeAfter);
if (!bundle.includes(routeAfter)) throw new Error("Settings route was not updated");

bundle = bundle.replace(
  'y&&{key:"settings",icon:m$,title:"Настройки",description:"Профиль, язык, безопасность",onClick:()=>e("/settings")}',
  '{key:"settings",icon:m$,title:"Настройки",description:"Аккаунт, приложение и безопасность",onClick:()=>e("/settings")}',
);

bundle = bundle.replace(
  'bdMoreReleaseNumberV166=171',
  'bdMoreReleaseNumberV166=typeof document!=="undefined"&&document.querySelector(\'meta[name="bd-app-version"]\')?.content||"—"',
);

bundle = bundle.replace(
  'children:"Сборка RC · 8 августа 2026"',
  'children:["Сборка ",document.querySelector(\'meta[name="bd-app-version"]\')?.content||"—"]',
);

await writeFile(bundlePath, bundle);
console.log("Settings v182 injected");
