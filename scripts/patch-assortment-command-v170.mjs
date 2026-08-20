import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/assortment-command-v170.fragment.txt");
let bundle = fs.readFileSync(bundlePath, "utf8");
let fragment = fs.readFileSync(fragmentPath, "utf8").trim();

const menuFunctionMatches = [...fragment.matchAll(/function bdAssortmentMenuV170\(/g)];
if (menuFunctionMatches.length === 2) {
  const legacyIndex = menuFunctionMatches[0].index;
  fragment =
    fragment.slice(0, legacyIndex)
    + "function bdAssortmentMenuFlatV170("
    + fragment.slice(legacyIndex + "function bdAssortmentMenuV170(".length);
} else if (menuFunctionMatches.length !== 1) {
  throw new Error(`Expected one current menu renderer and optional legacy renderer, found ${menuFunctionMatches.length}`);
}

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

if (bundle.includes("bd-assortment-command-v170:start")) {
  const start = bundle.indexOf("/* bd-assortment-command-v170:start */");
  const endMarker = "/* bd-assortment-command-v170:end */";
  const end = bundle.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Incomplete assortment command marker pair");
  bundle = bundle.slice(0, start) + fragment + bundle.slice(end + endMarker.length);
} else {
  bundle = replaceOnce(
    bundle,
    "function bdAboutPage()",
    `${fragment}\nfunction bdAboutPage()`,
    "assortment command insertion",
  );
}

if (!bundle.includes("priceHistory:bdCatArray(t.priceHistory)")) {
  bundle = replaceOnce(
    bundle,
    "menuItems:l,recipes:bdCatArray(t.recipes),stockBalances:",
    "menuItems:l,recipes:bdCatArray(t.recipes),priceHistory:bdCatArray(t.priceHistory),stockBalances:",
    "catalog price history persistence",
  );
}

bundle = bundle.replace(
  'path:"/catalog",component:()=>i.jsx(pt,{component:bdCatalogPage})',
  'path:"/catalog",component:()=>i.jsx(pt,{component:bdAssortmentCommandPageV170})',
);

if (!bundle.includes("bdAssortmentSignals=bdAssortmentHomeSignalsV170()")) {
  bundle = replaceOnce(
    bundle,
    "bdProcSignals=bdProcurementHomeSignalsV168(),j=[]",
    "bdProcSignals=bdProcurementHomeSignalsV168(),bdAssortmentSignals=bdAssortmentHomeSignalsV170(),j=[]",
    "home assortment signal declaration",
  );
  bundle = replaceOnce(
    bundle,
    'bdProcSignals.length&&j.push({...bdProcSignals[0],tone:bdProcSignals[0].tone==="red"?"red":"amber"}),g.length&&',
    'bdProcSignals.length&&j.push({...bdProcSignals[0],tone:bdProcSignals[0].tone==="red"?"red":"amber"}),bdAssortmentSignals.length&&j.push({...bdAssortmentSignals[0],tone:bdAssortmentSignals[0].tone==="red"?"red":"amber"}),g.length&&',
    "home assortment signal row",
  );
}

bundle = bundle.replace(/bdMoreReleaseNumberV166=(?:168|170)/, "bdMoreReleaseNumberV166=171");

if (!bundle.includes('component:bdAssortmentCommandPageV170')) {
  throw new Error("Catalog route was not switched to the assortment command page");
}

fs.writeFileSync(bundlePath, bundle);
console.log("Applied assortment command v170 bundle patch");
