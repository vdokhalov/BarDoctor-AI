import fs from "node:fs";
const asset = "public/assets/index-BQGspy0I.js";
let code = fs.readFileSync(asset, "utf8");
function replace(label, before, after) {
  if (label === "shared React bridge" && code.includes("function bdVenueScheduleReact(")) return;
  if (label === "wizard payload" && code.includes("workingDays:u.workingDays,timezone:u.timezone")) return;
  if (label === "main profile visible schedule" && code.includes("workingDays:C.workingDays,timezone:C.timezone??N.timezone")) return;
  if (label === "profile duplicate days" && !code.includes(before)) return;
  if (after && code.includes(after)) return;
  if (!code.includes(before)) throw new Error("Schedule patch anchor missing: " + label);
  code = code.replace(before, after);
}
function range(label, start, end, replacement) {
  if (label === "first wizard hours" && code.includes('value:e,suggestTimezone:!0,onChange:')) return;
  if (label === "legacy modal hours and days" && code.includes('workingDays:b.workingDays,timezone:b.timezone??N.timezone')) return;
  if (label === "profile duplicate time" && code.indexOf(start,code.indexOf("function bdProfileVenueV281")) < 0) return;
  if (replacement && code.includes(replacement)) return;
  const first = code.indexOf(start, label === "profile duplicate time" ? code.indexOf("function bdProfileVenueV281") : 0);
  if (first < 0) throw new Error("Schedule patch start missing: " + label);
  const last = code.indexOf(end, first + start.length);
  if (last < 0) throw new Error("Schedule patch end missing: " + label);
  code = code.slice(0, first) + replacement + code.slice(last);
}
const widget = 'function bdVenueScheduleReact({value:e,onChange:t}){const n=S.useRef(null),r=S.useRef(t),p=S.useRef(null);r.current=t;S.useEffect(()=>{const a=n.current;if(!a)return;const s=l=>{p.current=l.detail;r.current(l.detail)};a.addEventListener("schedulechange",s);return()=>a.removeEventListener("schedulechange",s)},[]);S.useEffect(()=>{if(!n.current)return;const a={openTime:e.openTime,closeTime:e.closeTime,workingDays:e.workingDays};if(p.current){if(JSON.stringify(a)!==JSON.stringify(p.current))return;p.current=null}n.current.value=a},[e.openTime,e.closeTime,e.workingDays]);return i.jsx("bd-venue-schedule",{ref:n})}';
const oldWidget = 'function bdVenueScheduleReact({value:e,onChange:t}){const n=S.useRef(null),r=S.useRef(t);r.current=t;S.useEffect(()=>{const a=n.current;if(!a)return;const s=l=>r.current(l.detail);a.addEventListener("schedulechange",s);return()=>a.removeEventListener("schedulechange",s)},[]);S.useEffect(()=>{if(n.current)n.current.value={openTime:e.openTime,closeTime:e.closeTime,workingDays:e.workingDays}},[e.openTime,e.closeTime,e.workingDays]);return i.jsx("bd-venue-schedule",{ref:n})}';
if (code.includes(oldWidget)) code = code.replace(oldWidget, widget);
else replace("shared React bridge", "function Ule({d:e,upd:t})", widget + "function Ule({d:e,upd:t})");
range("first wizard hours",
  'i.jsxs("div",{children:[i.jsx(ja,{children:"Часы работы"})',
  ',i.jsx("p",{className:"text-[12px] text-muted-foreground px-1 -mt-1"',
  'i.jsx(bdVenueScheduleReact,{value:e,onChange:n=>{t("openTime",n.openTime),t("closeTime",n.closeTime),t("workingDays",n.workingDays)}})');
replace("wizard payload",
  'openTime:u.openTime,closeTime:u.closeTime,areas:u.areas',
  'openTime:u.openTime,closeTime:u.closeTime,workingDays:u.workingDays,areas:u.areas');
replace("profile existing default",
  'workingDays:e.workingDays??{...Um}',
  'workingDays:e.workingDays');
replace("profile new default",
  'workingDays:{...Um}}}function ZCe',
  'workingDays:void 0}}function ZCe');
range("legacy modal hours and days",
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Часы работы"})',
  ',i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2",children:"Зоны заведения"})',
  'i.jsx(bdVenueScheduleReact,{value:a,onChange:b=>s(N=>({...N,openTime:b.openTime,closeTime:b.closeTime,workingDays:b.workingDays}))})');
replace("main profile visible schedule",
  'bdDetailsOpen&&i.jsxs("section",{className:"bd-profile-extra-v281"',
  'i.jsx(bdVenueScheduleReact,{value:a,onChange:C=>{y(!0),s(N=>({...N,openTime:C.openTime,closeTime:C.closeTime,workingDays:C.workingDays}))}}),bdDetailsOpen&&i.jsxs("section",{className:"bd-profile-extra-v281"');
range("profile duplicate time",
  'i.jsxs("div",{className:"bd-profile-field-grid-v281",children:[i.jsxs("label",{className:"bd-profile-field-v281",children:[i.jsx("span",{children:"Открытие"})',
  ',i.jsxs("fieldset",{className:"bd-profile-choice-v281",children:[i.jsx("legend",{children:"Зоны и услуги"})',
  '');
replace("profile duplicate days",
  ',i.jsxs("fieldset",{className:"bd-profile-choice-v281",children:[i.jsx("legend",{children:"Рабочие дни"}),i.jsx("div",{children:$se.map(C=>i.jsx("button",{type:"button","aria-pressed":a.workingDays[C]!==!1,onClick:()=>M(C),children:Lse[C].slice(0,2)},C))})]})',
  '');
replace("finance label",
  'function bdFinanceScheduleLabel(e){const t=e?.workingDays??Um,n=$se.filter(r=>t[r]!==!1);return n.length?n.map(r=>bdFinanceDayShort[r]).join(", "):"рабочие дни не выбраны"}',
  'function bdFinanceScheduleLabel(e){const t=typeof window==="undefined"?e?.workingDays?$se.map(r=>e.workingDays[r]!==!1):null:window.bdVenueSchedule?.daysOf(e?.workingDays);if(!t)return"рабочие дни не указаны";const n=$se.filter(r=>t[r-1]===!0);return n.length?n.map(r=>bdFinanceDayShort[r]).join(", "):"рабочие дни не выбраны"}');
replace("finance overnight",
  'return e?.openTime&&e?.closeTime?t+" · "+e.openTime+"–"+e.closeTime:t',
  'return e?.openTime&&e?.closeTime?t+" · "+e.openTime+"–"+e.closeTime+(e.closeTime<=e.openTime?" следующего дня":""):t');
replace("home unknown",
  'function bdHomeTodayState(e,t,n){const r=new Date(n);',
  'function bdHomeTodayState(e,t,n){if(e&&!window.bdVenueSchedule?.daysOf(e.workingDays))return{status:"unspecified",operatingDate:bdDateKey(n),reportFilled:!1,schedule:window.bdVenueSchedule?.summary(e)||"Рабочие дни не указаны",venueStatus:"Рабочие дни не указаны",shiftStatus:"График не указан",reportStatus:"Не определён",actionLabel:"Проверить смену",actionHref:"/finance"};const r=new Date(n);');
code = code.replace('workingDays:e.workingDays??{...Um}','workingDays:e.workingDays');
code = code.replaceAll(']}),,i.jsxs("fieldset"',']}),i.jsxs("fieldset"');
fs.writeFileSync(asset, code);
for (const path of ["public/app.html","app/bar-doctor-response.ts"]) {
  let html = fs.readFileSync(path,"utf8");
  // The isolated browser server serves public/app.html; match the production editor CSS.
  if (path === "public/app.html" && !html.includes('href="/profile-v281.css')) {
    html = html.replace('<link rel="stylesheet" href="/venue-schedule.css', '<link rel="stylesheet" href="/profile-v280.css?v=20260825-profile-v280" media="print" onload="this.media=\'all\'" />\n    <link rel="stylesheet" href="/profile-v281.css?v=20260825-profile-v282" media="print" onload="this.media=\'all\'" />\n    <link rel="stylesheet" href="/venue-schedule.css');
    fs.writeFileSync(path, html);
  }
  if (!html.includes('/venue-schedule.js?v=working-days-v447')) {
    const marker = '<link rel="modulepreload" href="/assets/index-BQGspy0I.js';
    if (!html.includes(marker)) throw new Error("HTML asset anchor missing: " + path);
    html = html.replace(marker, '<link rel="stylesheet" href="/venue-schedule.css?v=working-days-v447" />\n    <script src="/venue-schedule.js?v=working-days-v447" defer></script>\n    ' + marker);
    fs.writeFileSync(path,html);
  }
}
let route = fs.readFileSync("app/venues/new/route.ts","utf8");
if (!route.includes("venue-schedule.js?v=working-days-v447")) {
  route = route.replace('<script src="/venue-create.js?v=first-venue-setup-v444" defer></script>',
    '<link rel="stylesheet" href="/venue-schedule.css?v=working-days-v447" />\n    <script src="/venue-schedule.js?v=working-days-v447" defer></script>\n    <script src="/venue-create.js?v=first-venue-setup-v444" defer></script>');
  const start = route.indexOf('          <div class="two-columns">',route.indexOf('<h2>Когда вы открыты</h2>'));
  const end = route.indexOf('          <div class="two-columns">',start+1);
  if(start<0||end<0)throw new Error("Additional venue schedule markup missing");
  route=route.slice(0,start)+'          <bd-venue-schedule></bd-venue-schedule>\n'+route.slice(end);
  fs.writeFileSync("app/venues/new/route.ts",route);
}
let standalone=fs.readFileSync("public/venue-create.js","utf8");
if (!standalone.includes('form.querySelector("bd-venue-schedule").value')) {
  const start=standalone.indexOf('  function workingDays(data) {');
  const end=standalone.indexOf('  function payloadFromForm()',start);
  if(start<0||end<0)throw new Error("Additional venue schedule payload missing");
  standalone=standalone.slice(0,start)+standalone.slice(end);
  standalone=standalone.replace('    return {\n      name: String(data.get("name") || "").trim(),',
    '    var schedule = form.querySelector("bd-venue-schedule").value;\n    return {\n      name: String(data.get("name") || "").trim(),');
  standalone=standalone.replace('openTime: String(data.get("openTime") || "10:00"),\n      closeTime: String(data.get("closeTime") || "23:00"),',
    'openTime: schedule.openTime,\n      closeTime: schedule.closeTime,');
  standalone=standalone.replace('workingDays: workingDays(data),','workingDays: schedule.workingDays,');
  fs.writeFileSync("public/venue-create.js",standalone);
}
console.log("Shared venue schedule applied");
