import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPaths = [
  new URL("../public/bardoctor-preview.js", import.meta.url),
  new URL("../public/bardoctor-preview-v397.js", import.meta.url),
  ...["bardoctor-preview.js", "bardoctor-preview-v397.js"].map(file => new URL("../dist/client/" + file, import.meta.url)).filter(file => fs.existsSync(file)),
];
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);
const cacheToken = "20260906-home-reviews-auth-v415";
let source = fs.readFileSync(bundlePath, "utf8");
const homeReviewsHookV415 = 'function bdHomeReviewsAuthReadyV415(){return window.__bdBootstrapPending!==!0&&window.__bdAuthBootstrapV274?.state==="ready"}function bdUseHomeReviewsV409(e,t){const[n,r]=S.useState({status:"loading",data:null});return S.useEffect(()=>{let a=!0,s=0;const l=()=>{const e=++s;if(r({status:"loading",data:null}),!bdHomeReviewsAuthReadyV415())return;bdFetchHomeReviewsV409().then(t=>{a&&e===s&&r(t)}).catch(t=>{a&&e===s&&r({status:t?.status===403?"forbidden":"error",data:null,error:t?.message||"Отзывы временно недоступны"})})},u=()=>{bdHomeReviewsCacheV409.clear(),bdHomeReviewsPromisesV409.clear(),l()},d=()=>l();return l(),window.addEventListener("bd:active-venue-changed",u),window.addEventListener("bd:bootstrap-complete",d),()=>{a=!1,s++,window.removeEventListener("bd:active-venue-changed",u),window.removeEventListener("bd:bootstrap-complete",d)}},[e,t]),n}';

function replaceRequired(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Home Reviews v409 anchor missing: ${label}`);
  source = source.replace(before, after);
}

if (!source.includes("function bdUseHomeReviewsV409")) {
  const anchor = "function bdHomeDaily(";
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error("Home Reviews v409 Home anchor missing");
  const reviewCard = String.raw`
const bdHomeReviewsCacheV409=new Map(),bdHomeReviewsPromisesV409=new Map();
function bdHomeReviewsKeyV409(){return String(localStorage.getItem("bd_session")||"")+"::"+String(localStorage.getItem("bd_active_venue_id")||"")}
async function bdFetchHomeReviewsV409(){const e=Ot(),t=bdHomeReviewsKeyV409();if(!e)return{status:"error",error:"Нет активной сессии"};const n=bdHomeReviewsCacheV409.get(t);if(n&&Date.now()-n.at<6e4)return n.value;if(bdHomeReviewsPromisesV409.has(t))return bdHomeReviewsPromisesV409.get(t);const r=fetch("/api/reviews/home",{headers:ca(e),cache:"no-store"}).then(async a=>{let s=null;try{s=await a.json()}catch{}if(!a.ok||!s?.success){const l=new Error(s?.error||"Отзывы временно недоступны");throw l.status=a.status,l}const l={status:"ready",data:s.data};return bdHomeReviewsCacheV409.set(t,{at:Date.now(),value:l}),l}).finally(()=>bdHomeReviewsPromisesV409.delete(t));return bdHomeReviewsPromisesV409.set(t,r),r}
${homeReviewsHookV415}
function bdHomeReviewDateV409(e){if(!e)return"ещё не было";const t=new Date(e);if(Number.isNaN(t.getTime()))return"дата не определена";return t.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+", "+t.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}
function bdHomeReviewTopicV409(e){return{staff:"команда",kitchen:"кухня",bar:"бар",music:"громкая музыка",hookah:"кальяны",cleanliness:"чистота",wait_time:"долгое ожидание",price:"цены",atmosphere:"атмосфера",other:"другое"}[String(e||"")]||String(e||"").replaceAll("_"," ")}
function bdHomeReviewsCardV409({state:e,onNavigate:t}){const n=e?.data,r=n?.provider,a=n?.metrics,s=r?.status==="connected",l=Array.isArray(a?.complaints)?a.complaints:[],u=l.map(d=>bdHomeReviewTopicV409(d.topic)).filter(Boolean).slice(0,3);if(e?.status==="loading")return i.jsxs("section",{className:"bd-home-reviews-v409 is-loading","data-bd-home-reviews":"loading-v409","aria-live":"polite",children:[i.jsx("div",{className:"bd-home-reviews-skeleton-v409 wide"}),i.jsx("div",{className:"bd-home-reviews-skeleton-v409 metrics"}),i.jsx("div",{className:"bd-home-reviews-skeleton-v409 actions"})]});if(e?.status==="forbidden")return null;if(e?.status==="error")return i.jsxs("section",{className:"bd-home-reviews-v409 is-error","data-bd-home-reviews":"error-v409",children:[i.jsx("p",{className:"bd-home-reviews-kicker-v409",children:"Отзывы и репутация"}),i.jsx("h2",{children:"Данные об отзывах временно недоступны"}),i.jsx("p",{children:e.error||"Повторите попытку позже."}),i.jsx("button",{type:"button",onClick:()=>t("/reviews"),children:"Открыть модуль отзывов"})]});if(!s)return i.jsxs("section",{className:"bd-home-reviews-v409 is-empty","data-bd-home-reviews":"disconnected-v409",children:[i.jsxs("div",{className:"bd-home-reviews-title-v409",children:[i.jsx("span",{className:"bd-home-reviews-icon-v409","aria-hidden":!0,children:i.jsx(Mf,{size:19})}),i.jsx("div",{children:i.jsx("h2",{children:"Отзывы и репутация"})})]}),i.jsx("p",{children:"Подключите Google Business Profile, чтобы видеть рейтинг, новые отзывы и обращения, требующие ответа."}),i.jsx("button",{type:"button",onClick:()=>t("/integrations?flow=google"),children:"Подключить Google Business Profile"})]});if(!a?.total)return i.jsxs("section",{className:"bd-home-reviews-v409 is-empty","data-bd-home-reviews":"empty-v409",children:[i.jsxs("div",{className:"bd-home-reviews-head-v409",children:[i.jsxs("div",{className:"bd-home-reviews-title-v409",children:[i.jsx("span",{className:"bd-home-reviews-icon-v409","aria-hidden":!0,children:i.jsx(Mf,{size:19})}),i.jsx("div",{children:i.jsx("h2",{children:"Отзывы и репутация"})})]}),i.jsx("small",{children:"Последняя синхронизация: "+bdHomeReviewDateV409(r.lastSyncedAt)})]}),i.jsx("p",{children:r.lastSyncError?"Синхронизация требует внимания: "+r.lastSyncError:"Google подключён, но отзывов пока нет."}),i.jsx("button",{type:"button",onClick:()=>t("/reviews"),children:"Открыть отзывы"})]});return i.jsxs("section",{className:"bd-home-reviews-v409"+(r.lastSyncError?" has-sync-error":""),"data-bd-home-reviews":"ready-v409",children:[i.jsxs("div",{className:"bd-home-reviews-head-v409",children:[i.jsxs("div",{className:"bd-home-reviews-title-v409",children:[i.jsx("span",{className:"bd-home-reviews-icon-v409","aria-hidden":!0,children:i.jsx(Mf,{size:19})}),i.jsxs("div",{children:[i.jsx("h2",{children:"Отзывы и репутация"}),i.jsx("small",{children:r.locationName||"Google Business Profile"})]})]}),i.jsx("small",{className:"bd-home-reviews-sync-v409",children:"Синхронизация: "+bdHomeReviewDateV409(r.lastSyncedAt)})]}),r.lastSyncError&&i.jsx("p",{className:"bd-home-reviews-error-v409",children:"Синхронизация требует внимания: "+r.lastSyncError}),i.jsxs("div",{className:"bd-home-reviews-metrics-v409",children:[i.jsxs("div",{className:"is-rating",children:[i.jsx("small",{children:"Google рейтинг"}),i.jsxs("strong",{children:[a.averageRating==null?"—":new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(a.averageRating),i.jsx("span",{children:" / 5"})]}),i.jsxs("p",{children:[new Intl.NumberFormat("ru-RU").format(a.total)," отзывов"]})]}),i.jsxs("div",{children:[i.jsx("small",{children:"Новые отзывы"}),i.jsx("strong",{children:new Intl.NumberFormat("ru-RU").format(a.new7d)}),i.jsxs("p",{children:["7 дней · ",new Intl.NumberFormat("ru-RU").format(a.new30d)," за 30 дней"]})]}),i.jsxs("div",{className:a.needsAttention>0?"is-attention":"",children:[i.jsx("small",{children:"Требуют внимания"}),i.jsx("strong",{children:new Intl.NumberFormat("ru-RU").format(a.needsAttention)}),i.jsxs("p",{children:[new Intl.NumberFormat("ru-RU").format(a.unanswered)," без ответа"]})]})]}),i.jsxs("div",{className:"bd-home-reviews-insight-v409",children:[i.jsx("span",{"aria-hidden":!0,children:"AI"}),i.jsxs("div",{children:[i.jsx("strong",{children:u.length?"Основные жалобы: "+u.join(", "):"Анализ отзывов"}),i.jsx("p",{children:u.length?"По уже обработанным отзывам.":"Анализ появится после обработки отзывов."})]})]}),i.jsxs("div",{className:"bd-home-reviews-actions-v409",children:[i.jsx("button",{type:"button",onClick:()=>t("/reviews"),children:"Все отзывы"}),i.jsx("button",{type:"button",onClick:()=>t("/reviews?filter=unanswered"),disabled:!n.canManage,children:"Подготовить ответы"})]})]})}
`;
  source = source.slice(0, index) + reviewCard + source.slice(index);
}
const homeReviewsAuthHookStartV414 = source.indexOf("function bdHomeReviewsAuthReadyV414(");
const homeReviewsAuthHookStart = homeReviewsAuthHookStartV414 >= 0 ? homeReviewsAuthHookStartV414 : source.indexOf("function bdHomeReviewsAuthReadyV415(");
const homeReviewsHookStart = homeReviewsAuthHookStart >= 0 ? homeReviewsAuthHookStart : source.indexOf("function bdUseHomeReviewsV409(");
const homeReviewsHookEnd = source.indexOf("\nfunction bdHomeReviewDateV409", homeReviewsHookStart);
if (homeReviewsHookStart < 0 || homeReviewsHookEnd < 0) throw new Error("Home Reviews lifecycle hook missing");
if (source.slice(homeReviewsHookStart, homeReviewsHookEnd) !== homeReviewsHookV415) {
  source = source.slice(0, homeReviewsHookStart) + homeReviewsHookV415 + source.slice(homeReviewsHookEnd);
}
if (!source.includes("function bdHomeReviewTopicV409")) source = source.replace("function bdHomeReviewsCardV409(", 'function bdHomeReviewTopicV409(e){return{staff:"команда",kitchen:"кухня",bar:"бар",music:"громкая музыка",hookah:"кальяны",cleanliness:"чистота",wait_time:"долгое ожидание",price:"цены",atmosphere:"атмосфера",other:"другое"}[String(e||"")]||String(e||"").replaceAll("_"," ")}\nfunction bdHomeReviewsCardV409(');
source = source.replace('l.map(d=>String(d.topic||"").trim()).filter(Boolean)', 'l.map(d=>bdHomeReviewTopicV409(d.topic)).filter(Boolean)');
source = source.replace("Темы взяты из сохранённого Review Layer анализа.", "По уже обработанным отзывам.");

const homeDailyWithReviewsV409 = "function bdHomeDaily({cloudReady:bdHomeCloudReady,profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,snapshot:bdHealthSnapshot,health:m,healthLoading:bdHealthLoading,latestDataAt:h,onNavigate:g}){const bdHomeReviewState=bdUseHomeReviewsV409(String(e?.id??e?.name??\"venue\")),y=bdDateKey(new Date).slice(0,7)";
const homeDailyWithReviewLifecycleV414 = "function bdHomeDaily({cloudReady:bdHomeCloudReady,reviewsReady:bdHomeReviewsReady,profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,snapshot:bdHealthSnapshot,health:m,healthLoading:bdHealthLoading,latestDataAt:h,onNavigate:g}){const bdHomeReviewState=bdUseHomeReviewsV409(String(e?.id??e?.name??\"venue\"),bdHomeReviewsReady),y=bdDateKey(new Date).slice(0,7)";
if (!source.includes(homeDailyWithReviewLifecycleV414)) {
  replaceRequired(
    "function bdHomeDaily({cloudReady:bdHomeCloudReady,profile:e,revenue:t,expenses:n,gapReasons:r,employees:a,equipment:s,equipmentAlerts:l,settings:u,snapshots:d,diagnosis:f,snapshot:bdHealthSnapshot,health:m,healthLoading:bdHealthLoading,latestDataAt:h,onNavigate:g}){const y=bdDateKey(new Date).slice(0,7)",
    homeDailyWithReviewsV409,
    "Home review state",
  );
}
replaceRequired(homeDailyWithReviewsV409, homeDailyWithReviewLifecycleV414, "Home review authenticated lifecycle");

replaceRequired(
  "i.jsx(bdHomeDaily,{cloudReady:!0,profile:e",
  "i.jsx(bdHomeDaily,{cloudReady:!0,reviewsReady:bdHomeCloudReady,profile:e",
  "Home review bootstrap readiness",
);

replaceRequired(
  "i.jsx(bdHomeTodayCard,{today:N,onNavigate:g}),i.jsx(bdHomeAttention,{profile:e,report:E,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,health:m,employees:a,onNavigate:g})",
  "i.jsx(bdHomeReviewsCardV409,{state:bdHomeReviewState,onNavigate:g}),i.jsx(bdHomeAttention,{profile:e,report:E,revenue:t,gapReasons:r,equipmentAlerts:l,settings:u,snapshots:d,health:m,employees:a,reviewsState:bdHomeReviewState,onNavigate:g}),i.jsx(bdHomeTodayCard,{today:N,onNavigate:g})",
  "Home information hierarchy",
);

replaceRequired(
  "function bdHomeAttention({profile:e,report:t,revenue:n,gapReasons:r,equipmentAlerts:a,settings:s,snapshots:l,health:u,employees:d,onNavigate:f})",
  "function bdHomeAttention({profile:e,report:t,revenue:n,gapReasons:r,equipmentAlerts:a,settings:s,snapshots:l,health:u,employees:d,reviewsState:bdReviewsState,onNavigate:f})",
  "Today signals props",
);

replaceRequired(
  ";y.length&&j.push({label:\"Ошибки и риски в данных\"",
  ";const bdReviewNeedsAttention=Number(bdReviewsState?.data?.metrics?.needsAttention||0);bdReviewNeedsAttention>0&&j.push({label:bdReviewNeedsAttention+\" негативных отзывов без ответа\",detail:\"Ответьте гостям — это может повлиять на рейтинг\",href:\"/reviews?filter=negative\",tone:\"red\"}),y.length&&j.push({label:\"Ошибки и риски в данных\"",
  "Today review signal",
);
replaceRequired("const N=j.slice(0,3);", "const N=j.slice(0,4);", "Today signal limit");
replaceRequired('children:C?"Требует внимания":"Подготовка к работе"', 'children:"Что важно сегодня"', "Today heading");

if (!source.includes('{key:"reviews",name:"Отзывы",href:"/reviews",icon:Mf}')) {
  source = source.replace(
    '{key:"finance",name:"Финансы",href:"/finance",icon:$c},',
    '{key:"finance",name:"Финансы",href:"/finance",icon:$c},bdMoreHasPermissionV166("reviews.view")&&{key:"reviews",name:"Отзывы",href:"/reviews",icon:Mf},',
  );
}
source = source.replace(
  '{key:"finance",name:"Финансы",href:"/finance",icon:$c},{key:"reviews",name:"Отзывы",href:"/reviews",icon:Mf},',
  '{key:"finance",name:"Финансы",href:"/finance",icon:$c},bdMoreHasPermissionV166("reviews.view")&&{key:"reviews",name:"Отзывы",href:"/reviews",icon:Mf},',
);
source = source.replace(
  /    \{key:"more",name:"Ещё",href:"\/more",icon:tS\}\r?\n  \];\r?\n  const d=\[/,
  '    {key:"more",name:"Ещё",href:"/more",icon:tS}\n  ].filter(Boolean);\n  const d=[',
);
if (!source.includes('m.key==="reviews"?e==="/reviews"')) {
  const before = 'm.key==="more"?Ele.some(g=>e===g||e.startsWith(g+"/")):!1;';
  const after = 'm.key==="reviews"?e==="/reviews"||e.startsWith("/reviews/"):m.key==="more"?Ele.some(g=>(g!=="/reviews"||window.matchMedia("(max-width: 1023px)").matches)&&(e===g||e.startsWith(g+"/"))):!1;';
  if (!source.includes(before)) throw new Error("Home Reviews v409 anchor missing: Desktop Reviews navigation state");
  source = source.replace(before, after);
}

if (!source.includes('data-bd-home-reviews":"ready-v409')) throw new Error("Home Reviews v409 card missing");
if (!source.includes('bdHomeReviewsCardV409,{state:bdHomeReviewState,onNavigate:g}')) throw new Error("Home Reviews v409 card is not mounted on Home");
if (!/]\.filter\(Boolean\);\r?\n  const d=\[/.test(source)) throw new Error("Home Reviews v409 navigation filtering is missing");
if (!source.includes('data-bd-home-health-index":"business-health-snapshot-v334')) throw new Error("Canonical Business Health card was lost");
if (!source.includes('data-bd-home-money":"result-v151')) throw new Error("Canonical Finance card was lost");
if (source.includes('fetch("/api/reviews/sources"') && source.slice(source.indexOf("function bdFetchHomeReviewsV409"), source.indexOf("function bdHomeReviewsCardV409")).includes('/api/reviews/sources')) throw new Error("Home must not use the sync-capable review sources endpoint");

const bootstraps = bootstrapPaths.map((bootstrapPath) => {
  let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
  if (!new RegExp(`index-BQGspy0I(?:-[a-f0-9]{12})?\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) bootstrap = bootstrap.replace(/(script\.src = "\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=[^"]+)";/, `$1-${cacheToken}";`);
  if (!new RegExp(`index-BQGspy0I(?:-[a-f0-9]{12})?\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) throw new Error(`Home Reviews cache token missing from ${bootstrapPath.pathname}`);
  return [bootstrapPath, bootstrap];
});
let appHtml = fs.readFileSync(appHtmlPath, "utf8");
const homeReviewsStyleTag = '<link rel="stylesheet" href="/home-reviews-v409.css?v=20260903-home-reviews-ux-v409" />';
if (!appHtml.includes("/home-reviews-v409.css")) appHtml = appHtml.replace('<link rel="stylesheet" href="/home-visual-v151.css?v=20260811-home-v151" />', `<link rel="stylesheet" href="/home-visual-v151.css?v=20260811-home-v151" />\n    ${homeReviewsStyleTag}`);
appHtml = appHtml.replace(/<link rel="stylesheet" href="\/home-reviews-v409\.css[^"]*"[^>]*>/, homeReviewsStyleTag);
if (!new RegExp(`bardoctor-preview-v397\\.js\\?v=[^\"]*${cacheToken}`).test(appHtml)) appHtml = appHtml.replace(/(src="\/bardoctor-preview-v397\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
let response = fs.readFileSync(responsePath, "utf8");
if (!response.includes("/home-reviews-v409.css")) response = response.replace('<link rel="stylesheet" href="/home-visual-v151.css?v=20260811-home-v151" />', `<link rel="stylesheet" href="/home-visual-v151.css?v=20260811-home-v151" />\n    ${homeReviewsStyleTag}`);
response = response.replace(/<link rel="stylesheet" href="\/home-reviews-v409\.css[^"]*"[^>]*>/, homeReviewsStyleTag);
if (!new RegExp(`bardoctor-preview-v397\\.js\\?v=[^\"]*${cacheToken}`).test(response)) response = response.replace(/(src="\/bardoctor-preview-v397\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);

fs.writeFileSync(bundlePath, source);
for (const [bootstrapPath, bootstrap] of bootstraps) fs.writeFileSync(bootstrapPath, bootstrap);
fs.writeFileSync(appHtmlPath, appHtml);
fs.writeFileSync(responsePath, response);
const emittedHtmlPath = new URL("../dist/client/app.html", import.meta.url);
if (fs.existsSync(emittedHtmlPath)) {
  let emittedHtml = fs.readFileSync(emittedHtmlPath, "utf8");
  if (!new RegExp(`bardoctor-preview-v397\\.js\\?v=[^\"]*${cacheToken}`).test(emittedHtml)) emittedHtml = emittedHtml.replace(/(src="\/bardoctor-preview-v397\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
  fs.writeFileSync(emittedHtmlPath, emittedHtml);
}
await import("./patch-latest-cost-copy-v412.mjs");
console.log("Home + Reviews UX v409 applied");
