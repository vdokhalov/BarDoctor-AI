import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");
const marker = 'const bdInvoiceRecognitionV2="invoice-recognition-v2";';

if (!bundle.includes(marker)) {
  const replacements = [
    [
      'G("Распознаю документ и позиции…"),oe=await fetch("/api/purchases/scan"',
      'G("Читаем документ…"),setTimeout(()=>G("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
    ],
    [
      'E("Распознаю документ и позиции…"),oe=await fetch("/api/purchases/scan"',
      'E("Читаем документ…"),setTimeout(()=>E("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
    ],
  ];
  for (const [before, after] of replacements) {
    const count = bundle.split(before).length - 1;
    if (count !== 1) throw new Error(`Invoice Recognition V2 UI target expected once, found ${count}`);
    bundle = bundle.replace(before, after);
  }
  bundle = `${marker}${bundle}`;
}
bundle = bundle.replaceAll('children:["AI ",Math.round((Number(p.confidence)||0)*100),"%"]', 'children:["Распознано ",Math.round((Number(p.confidence)||0)*100),"%"]');

for (const path of [bootstrapPath, appHtmlPath]) {
  let source = readFileSync(path, "utf8");
  if (!source.includes("20260826-invoice-recognition-v2")) {
    source = source.replaceAll(
      "20260826-tech-card-consistency-v299a",
      "20260826-tech-card-consistency-v299a-20260826-invoice-recognition-v2",
    );
  }
  writeFileSync(path, source);
}

writeFileSync(bundlePath, bundle);
console.log("Applied Invoice Recognition V2 UX patch.");
