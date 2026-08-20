import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

const redundantSubtitle = ',i.jsx("p",{style:{margin:"5px 0 0",fontSize:16,fontWeight:800,color:"rgba(255,255,255,.94)"},children:"Данные отдельно от оценки"})';
const subtitleCount = source.split(redundantSubtitle).length - 1;
if (subtitleCount !== 1) {
  throw new Error(`Expected 1 diagnostic subtitle, found ${subtitleCount}`);
}

const previousVersion = "rc-v71";
const versionCount = source.split(previousVersion).length - 1;
if (versionCount !== 1) {
  throw new Error(`Expected 1 occurrence, found ${versionCount}: ${previousVersion}`);
}

source = source.replace(redundantSubtitle, "");
source = source.replace(previousVersion, "rc-v72");
fs.writeFileSync(bundlePath, source);

console.log("removed redundant home diagnostic subtitle and applied rc-v72");
