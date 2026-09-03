import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-business-health-detail-v377";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

if (!source.includes(marker)) {
  const oldRequest = 'function bdWarmCriticalHomeV349(){if(typeof window>"u"||window.__bdStartupWarmStartedV349)return;const e=Ot();if(!e)return;window.__bdStartupWarmStartedV349=!0,window.__bdStartupBusinessHealthWarmV349=fetch("/api/business-health",{headers:ca(e),cache:"no-store"}).then(async t=>({response:t,data:await t.json()})),window.__bdStartupFinanceWarmV349=Promise.all(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].map(async t=>({key:t,data:await Yse(t,e)})))}';
  const newRequest = `/* ${marker} */
async function bdFetchBusinessHealthV377(session){const controller=new AbortController,timeout=window.setTimeout(()=>controller.abort(),8e3);try{const request=fetch("/api/business-health",{headers:ca(session),cache:"no-store",signal:controller.signal}).then(async response=>{let data=null;try{data=await response.json()}catch{}return{response,data}}),deadline=new Promise((resolve,reject)=>window.setTimeout(()=>reject(new Error("Business Health request timed out")),8100));return await Promise.race([request,deadline])}finally{window.clearTimeout(timeout)}}
function bdWarmCriticalHomeV349(){if(typeof window>"u"||window.__bdStartupWarmStartedV349)return;const e=Ot();if(!e)return;window.__bdStartupWarmStartedV349=!0,window.__bdStartupBusinessHealthWarmV349=bdFetchBusinessHealthV377(e),window.__bdStartupFinanceWarmV349=Promise.all(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].map(async t=>({key:t,data:await Yse(t,e)})))}`;
  replaceOnce(oldRequest, newRequest, "bounded Business Health request");

  const oldRefresh = 'const{response:r,data:a}=n?await n:await fetch("/api/business-health",{headers:ca(e),cache:"no-store"}).then(async s=>({response:s,data:await s.json()}));';
  const newRefresh = 'const{response:r,data:a}=n?await n:await bdFetchBusinessHealthV377(e);';
  replaceOnce(oldRefresh, newRefresh, "reuse bounded request");

  const oldDetail = 'function c_e(){const[,e]=bt(),{isReady:t}=Ai(),bdLiveHealthStatus=bdUseLiveBusinessHealthV335(t),{snapshot:n,diagnosis:r}=bdUseBusinessHealthSnapshotV284(),[a,s]=S.useState(null),l=t?n:null,u=l?bdHealthDetailZonesV332(l):[],d=l?bdHealthUiStatusV332(l.score,l.status):bdHealthUiStatusV332(null),f=l?bdHealthTrendV332(l):null,m=l?bdHealthLivePeriodV334(l):null,bdHealthLoading=!t||!n&&bdLiveHealthStatus!=="error";';
  const newDetail = 'function c_e(){const[,e]=bt(),{profile:bdHealthProfile}=Un(),bdHealthCanLoad=!!bdHealthProfile,bdLiveHealthStatus=bdUseLiveBusinessHealthV335(bdHealthCanLoad),{snapshot:n,diagnosis:r}=bdUseBusinessHealthSnapshotV284(),[a,s]=S.useState(null),l=bdHealthCanLoad?n:null,u=l?bdHealthDetailZonesV332(l):[],d=l?bdHealthUiStatusV332(l.score,l.status):bdHealthUiStatusV332(null),f=l?bdHealthTrendV332(l):null,m=l?bdHealthLivePeriodV334(l):null,bdHealthLoading=!bdHealthCanLoad||!n&&bdLiveHealthStatus!=="error";';
  replaceOnce(oldDetail, newDetail, "decouple Health detail from full cloud-store readiness");
}

for (const required of [
  marker,
  "function bdFetchBusinessHealthV377",
  "bdUseLiveBusinessHealthV335(bdHealthCanLoad)",
  'bdHealthLoading=!bdHealthCanLoad||!n&&bdLiveHealthStatus!=="error"',
  'children:"Состояние бизнеса"',
]) {
  if (!source.includes(required)) throw new Error(`Business Health v377 invariant missing: ${required}`);
}

if (source.includes('function c_e(){const[,e]=bt(),{isReady:t}=Ai()')) {
  throw new Error("Business Health detail still waits for full cloud-store readiness");
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
