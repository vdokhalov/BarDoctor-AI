import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
let bundle = readFileSync(bundlePath, "utf8");
const marker = 'const bdInvoiceRecognitionV2="invoice-recognition-v2";';

function replaceRequired(before, after, label) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label} expected once, found ${count}`);
  bundle = bundle.replace(before, after);
}

function replacePhaseTimer({ direct, unsafe, guarded, declaration, guardedDeclaration, cleanup, guardedCleanup, label }) {
  if (bundle.includes(unsafe)) {
    replaceRequired(unsafe, guarded, `${label} unsafe phase timer`);
  } else if (bundle.includes(direct)) {
    replaceRequired(direct, guarded, `${label} phase timer`);
  } else if (!bundle.includes(guarded)) {
    throw new Error(`${label} phase timer target not found`);
  }
  if (!bundle.includes(guardedDeclaration)) {
    replaceRequired(declaration, guardedDeclaration, `${label} phase timer declaration`);
  }
  if (!bundle.includes(guardedCleanup)) {
    replaceRequired(cleanup, guardedCleanup, `${label} phase timer cleanup`);
  }
}

replacePhaseTimer({
  direct: 'G("Распознаю документ и позиции…"),oe=await fetch("/api/purchases/scan"',
  unsafe: 'G("Читаем документ…"),setTimeout(()=>G("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
  guarded: 'G("Читаем документ…"),bdInvoiceRecognitionPhaseTimer=setTimeout(()=>G("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
  declaration: 'let p=[];try{let oe;if(c.every(X=>bdClientImageInfo(X).isImage))',
  guardedDeclaration: 'let p=[],bdInvoiceRecognitionPhaseTimer;try{let oe;if(c.every(X=>bdClientImageInfo(X).isImage))',
  cleanup: '}finally{G("")}}async function Ne',
  guardedCleanup: '}finally{clearTimeout(bdInvoiceRecognitionPhaseTimer),G("")}}async function Ne',
  label: "Procurement command",
});

replacePhaseTimer({
  direct: 'E("Распознаю документ и позиции…"),oe=await fetch("/api/purchases/scan"',
  unsafe: 'E("Читаем документ…"),setTimeout(()=>E("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
  guarded: 'E("Читаем документ…"),bdInvoiceRecognitionPhaseTimer=setTimeout(()=>E("Сопоставляем позиции…"),650),oe=await fetch("/api/purchases/scan"',
  declaration: 'let bdStagedPurchaseFiles=[];try{let oe;if(R.every(Y=>bdClientImageInfo(Y).isImage))',
  guardedDeclaration: 'let bdStagedPurchaseFiles=[],bdInvoiceRecognitionPhaseTimer;try{let oe;if(R.every(Y=>bdClientImageInfo(Y).isImage))',
  cleanup: '}finally{E("")}}async function V',
  guardedCleanup: '}finally{clearTimeout(bdInvoiceRecognitionPhaseTimer),E("")}}async function V',
  label: "Supplier procurement",
});

if (!bundle.includes(marker)) bundle = `${marker}${bundle}`;
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
