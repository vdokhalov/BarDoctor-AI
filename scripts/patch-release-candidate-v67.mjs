import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");
const before = "rc-v66";
const count = source.split(before).length - 1;
if (count !== 1) {
  throw new Error(`Expected 1 occurrence, found ${count}: ${before}`);
}
source = source.replace(before, "rc-v67");
fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v67");
