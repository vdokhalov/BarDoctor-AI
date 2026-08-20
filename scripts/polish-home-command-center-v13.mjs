import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const replacements = [
  [
    'className:"home-card relative overflow-hidden min-h-[154px] p-4 text-left flex flex-col justify-between"',
    'className:"home-card relative overflow-hidden p-4 text-left flex flex-col justify-between "+(e.wide?"col-span-2 min-h-[132px]":"min-h-[154px]")',
  ],
  [
    'className:"text-[12.5px] font-extrabold mt-1.5 truncate"',
    'className:"text-[12.5px] font-extrabold mt-1.5 leading-tight break-words"',
  ],
  [
    '{label:"Месячный отчёт",value:g+" · "+e.coveragePercent+"% смен"',
    '{label:"Месячный отчёт",wide:!0,value:g+" · "+e.coveragePercent+"% смен"',
  ],
  [
    'l===1?"активное поручение":"активных поручения"',
    'l===1?"активное поручение":"активных поручений"',
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) {
    throw new Error(`Expected home command-center fragment was not found: ${from}`);
  }
  source = source.replace(from, to);
}

await writeFile(bundlePath, source);
console.log("Home command center v13 polished for a balanced mobile grid.");
