import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v57"')) {
  console.log("release candidate v57 already applied");
  process.exit(0);
}
if (!source.includes('bdReleaseCandidateVersion="rc-v56"')) {
  throw new Error("release candidate v56 marker was not found");
}

function replaceRequired(from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  source = source.split(from).join(to);
}

source = source.replace(
  'bdReleaseCandidateVersion="rc-v56"',
  'bdReleaseCandidateVersion="rc-v57"',
);

replaceRequired(
  'function ca(e){const t=gz();return t?{"X-Session-Email":e,"X-Session-Token":t}:{}}async function Dse',
  'function ca(e){const t=gz();return t?{"X-Session-Email":e,"X-Session-Token":t}:{}}async function bdLogoutSession(){const e=Ot();if(!e||!gz())return;try{await fetch(`${hz}/logout`,{method:"POST",headers:ca(e)})}catch{}}async function Dse',
  1,
  "logout request helper",
);

replaceRequired(
  'onClick:()=>{sz(),yz(),window.location.replace("/".replace(/\\\/$/,"")+"/login")}',
  'onClick:async()=>{await bdLogoutSession(),sz(),yz(),window.location.replace("/".replace(/\\\/$/,"")+"/login")}',
  1,
  "profile logout action",
);

replaceRequired(
  'onClick:()=>{y(!1);try{localStorage.clear()}',
  'onClick:async()=>{y(!1),await bdLogoutSession();try{localStorage.clear()}',
  1,
  "clear-device logout action",
);

replaceRequired(
  'async function aEe(){const e=[];',
  'async function aEe(){await bdLogoutSession();const e=[];',
  1,
  "data reset logout action",
);

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v57");
