import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let bundle = readFileSync(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const first = bundle.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (bundle.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  bundle = bundle.slice(0, first) + replacement + bundle.slice(first + search.length);
}

if (bundle.includes('bdSeamlessStartupVersion="seamless-v202"')) {
  console.log("Seamless startup v202 is already installed");
  process.exit(0);
}

replaceOnce(
  'bdStartupFirstPaintVersion="startup-v201",IC="bd_ai_diagnosis_v9";',
  'bdStartupFirstPaintVersion="startup-v201",bdSeamlessStartupVersion="seamless-v202",IC="bd_ai_diagnosis_v9";',
  "seamless startup version marker",
);

replaceOnce(
  'initial:{opacity:0,y:12,scale:.97},animate:{opacity:1,y:0,scale:1},transition:{duration:.65,ease:[.22,1,.36,1]},style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:390,padding:"32px 28px",textAlign:"center"}',
  'initial:!1,animate:{opacity:1,y:0,scale:1},transition:{duration:.65,ease:[.22,1,.36,1]},style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:390,padding:"32px 28px",textAlign:"center"}',
  "Splash content entry animation",
);

writeFileSync(bundlePath, bundle);
console.log("Installed seamless startup v202");
