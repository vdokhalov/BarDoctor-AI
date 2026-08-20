import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

const loginBack =
  'i.jsxs("div",{className:"bd-auth-topline",children:[i.jsx(bdAuthBack,{onClick:()=>e("/")}),i.jsx(bdAuthBrand,{})]})';
const loginBrandOnly =
  'i.jsx("div",{className:"bd-auth-topline",children:i.jsx(bdAuthBrand,{})})';
const loginBackCount = source.split(loginBack).length - 1;
if (loginBackCount !== 1) {
  throw new Error(`Expected 1 misleading login back button, found ${loginBackCount}`);
}
source = source.replace(loginBack, loginBrandOnly);

const reportsRoute =
  'i.jsx(Xe,{path:"/reports",component:()=>i.jsx(pt,{component:bdMonthlyReportPage})})';
const legacyMonthClosingRoute =
  'i.jsx(Xe,{path:"/month-closing",component:()=>i.jsx(cS,{to:Ot()?"/reports?closeMonth=1":"/login"})})';
const reportsRouteCount = source.split(reportsRoute).length - 1;
if (reportsRouteCount !== 1) {
  throw new Error(`Expected 1 reports route, found ${reportsRouteCount}`);
}
if (source.includes(legacyMonthClosingRoute)) {
  throw new Error("Legacy month-closing route already exists");
}
source = source.replace(reportsRoute, `${reportsRoute},${legacyMonthClosingRoute}`);

const previousVersion = 'bdReleaseCandidateVersion="rc-v72"';
const nextVersion = 'bdReleaseCandidateVersion="rc-v73"';
const versionCount = source.split(previousVersion).length - 1;
if (versionCount !== 1) {
  throw new Error(`Expected 1 occurrence, found ${versionCount}: ${previousVersion}`);
}
source = source.replace(previousVersion, nextVersion);

fs.writeFileSync(bundlePath, source);
console.log("removed inert login back action, repaired month-closing route, and applied rc-v73");
