import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-business-health-watchdog-v378";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

if (!source.includes(marker)) {
  const oldDetail = 'function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),bdHealthCanLoad=!!bdHealthProfile,bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHealthCanLoad),{snapshot:n,diagnosis:r}=bdUseBusinessHealthSnapshotV284(),[a,s]=S.useState(null),l=bdHealthCanLoad?n:null,u=l?bdHealthDetailZonesV332(l):[],d=l?bdHealthUiStatusV332(l.score,l.status):bdHealthUiStatusV332(null),f=l?bdHealthTrendV332(l):null,m=l?bdHealthLivePeriodV334(l):null,bdHealthLoading=!bdHealthCanLoad||!n&&bdLiveHealthStatus!=="error";';
  const newDetail = `/* ${marker} */
function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),[bdHealthWaitExpired,setBdHealthWaitExpired]=S.useState(!1),bdHealthCanLoad=!!bdHealthProfile||bdHealthWaitExpired,bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHealthCanLoad),{snapshot:n,diagnosis:r}=bdUseBusinessHealthSnapshotV284(),[a,s]=S.useState(null);S.useEffect(()=>{const timer=window.setTimeout(()=>setBdHealthWaitExpired(!0),8e3);return()=>window.clearTimeout(timer)},[]);const l=n,u=l?bdHealthDetailZonesV332(l):[],d=l?bdHealthUiStatusV332(l.score,l.status):bdHealthUiStatusV332(null),f=l?bdHealthTrendV332(l):null,m=l?bdHealthLivePeriodV334(l):null,bdHealthLoading=!n&&bdLiveHealthStatus!=="error"&&!bdHealthWaitExpired;`;
  replaceOnce(oldDetail, newDetail, "Health detail component watchdog");
}

for (const required of [
  marker,
  "[bdHealthWaitExpired,setBdHealthWaitExpired]=S.useState(!1)",
  "setBdHealthWaitExpired(!0),8e3",
  'bdHealthLoading=!n&&bdLiveHealthStatus!=="error"&&!bdHealthWaitExpired',
]) {
  if (!source.includes(required)) throw new Error(`Business Health v378 invariant missing: ${required}`);
}

if (source.includes('bdHealthLoading=!bdHealthCanLoad||!n&&bdLiveHealthStatus!=="error"')) {
  throw new Error("Business Health loading still depends indefinitely on profile readiness");
}

fs.writeFileSync(bundlePath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
