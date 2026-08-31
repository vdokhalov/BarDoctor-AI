import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;
const marker = 'const bdAuthenticatedHomeShellVersionV345="v345"';

if (!bundle.includes(marker)) {
  const anchor = 'const bdAuthoritativeHomeStartupVersionV344="v344"';
  if (!bundle.includes(anchor)) throw new Error("Authoritative Home v344 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const desiredSplashGate = 'function ble(){return Ot()&&gz()&&bdVenueAccessV249()?i.jsx(bdAuthenticatedHomeBootV345,{}):';
if (!bundle.includes(desiredSplashGate)) {
  const existingShell = bundle.indexOf("function bdAuthenticatedHomeBootV345(){");
  const existingSplash = bundle.indexOf("function ble(){", existingShell);
  if (existingShell >= 0 && existingSplash > existingShell) {
    bundle = bundle.slice(0, existingShell) + bundle.slice(existingSplash);
  }
  const start = bundle.indexOf("function ble(){");
  const end = bundle.indexOf("\nconst j7=", start);
  if (start < 0 || end < 0) throw new Error("Brand splash component was not found.");
  const oldSplash = bundle.slice(start, end);
  const shell = `function bdAuthenticatedHomeBootV345(){const e=bdVenueAccessV249(),t=e?.name||"Заведение";return i.jsxs("main",{"data-bd-authenticated-home-shell":"v345",style:{minHeight:"100dvh",padding:"max(42px,env(safe-area-inset-top)) 18px max(100px,calc(82px + env(safe-area-inset-bottom)))",background:"#f7f8fc",color:"#171a2b",fontFamily:"Inter,system-ui,sans-serif"},children:[i.jsxs("header",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22},children:[i.jsx("strong",{style:{fontSize:28},children:"Главная"}),i.jsx("span",{style:{maxWidth:"55%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"13px 16px",border:"1px solid #dfe2f1",borderRadius:18,background:"#fff",fontSize:14,fontWeight:800},children:t})]}),i.jsxs("section",{style:{padding:"16px 18px",border:"1px solid #e2e5ef",borderRadius:22,background:"#fff",boxShadow:"0 12px 30px rgba(34,42,77,.06)"},children:[i.jsx("small",{style:{fontWeight:800,letterSpacing:".08em",color:"#747b8d"},children:"BUSINESS HEALTH"}),i.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,marginTop:12},children:[i.jsx("span",{style:{width:10,height:10,borderRadius:99,background:"#5b5ceb",boxShadow:"0 0 0 5px rgba(91,92,235,.12)"}}),i.jsxs("span",{style:{display:"grid",gap:3},children:[i.jsx("strong",{style:{fontSize:14},children:"Загружаем актуальное состояние"}),i.jsx("small",{style:{color:"#747b8d"},children:"Финансы и операции обновляются параллельно"})]})]})]}),i.jsxs("section",{style:{marginTop:18,minHeight:104,padding:"18px 20px",display:"grid",alignContent:"center",gap:6,borderRadius:24,background:"linear-gradient(145deg,#141b3d,#222d68)",color:"#fff"},children:[i.jsx("small",{style:{color:"rgba(255,255,255,.62)",fontWeight:800,letterSpacing:".1em"},children:"ФИНАНСОВЫЙ РЕЗУЛЬТАТ"}),i.jsx("strong",{style:{fontSize:17},children:"Сверяем данные с сервером"}),i.jsx("small",{style:{color:"rgba(255,255,255,.62)"},children:"Покажем только актуальные суммы"})]}),i.jsx("div",{style:{position:"fixed",left:0,right:0,bottom:0,height:"calc(76px + env(safe-area-inset-bottom))",borderTop:"1px solid #e5e7ef",background:"#fff"}})]})}function ble(){return Ot()&&gz()&&bdVenueAccessV249()?i.jsx(bdAuthenticatedHomeBootV345,{}):${oldSplash.slice("function ble(){return ".length,-1)}}`;
  bundle = bundle.slice(0, start) + shell + bundle.slice(end);
  changed = true;
}

if (!bootstrap.includes("20260829-authenticated-home-v345")) {
  const token = "20260829-authoritative-home-v344";
  if (!bootstrap.includes(token)) throw new Error("Authoritative Home v344 token not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-authenticated-home-v345`);
  changed = true;
}

const authProbe = `
        try {
          var bdSessionV345 = localStorage.getItem("bd_session");
          var bdTokenV345 = localStorage.getItem("bd_session_token");
          var bdVenueIdV345 = localStorage.getItem("bd_active_venue_id");
          var bdContextV345 = bdSessionV345 ? JSON.parse(localStorage.getItem("bd_venue_context__" + bdSessionV345) || "null") : null;
          var bdVenueV345 = Array.isArray(bdContextV345 && bdContextV345.venues) ? bdContextV345.venues.find(function (venue) { return String(venue && venue.id) === String(bdVenueIdV345) && venue.status !== "inactive" && venue.hasProfile !== false; }) : null;
          if (bdSessionV345 && bdTokenV345 && bdVenueV345) {
            document.documentElement.setAttribute("data-bd-authenticated-startup", "v345");
            window.__bdStartupVenueV345 = String(bdVenueV345.name || "Заведение");
          }
        } catch (error) { /* keep the public brand splash */ }`;

const authCss = `
      /* authenticated-home-shell-v345 */
      .bd-static-auth-home-v345 { display: none; }
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"],
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] body { background: #f7f8fc; color: #171a2b; }
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] .bd-static-startup-v201 { display: block; padding: max(42px, env(safe-area-inset-top)) 18px max(100px, calc(82px + env(safe-area-inset-bottom))); background: #f7f8fc; color: #171a2b; }
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] .bd-static-startup-v201::before,
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] .bd-static-startup-v201::after,
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] .bd-static-startup-content-v202 { display: none; }
      html[data-bd-startup-pending="v201"][data-bd-authenticated-startup="v345"] .bd-static-auth-home-v345 { display: block; width: 100%; max-width: 760px; margin: 0 auto; }
      .bd-static-auth-head-v345 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
      .bd-static-auth-head-v345 strong { font-size: 28px; }
      .bd-static-auth-venue-v345 { max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 13px 16px; border: 1px solid #dfe2f1; border-radius: 18px; background: #fff; font-size: 14px; font-weight: 800; }
      .bd-static-auth-health-v345 { padding: 16px 18px; border: 1px solid #e2e5ef; border-radius: 22px; background: #fff; box-shadow: 0 12px 30px rgba(34,42,77,.06); }
      .bd-static-auth-health-v345 > small, .bd-static-auth-money-v345 > small:first-child { color: #747b8d; font-weight: 800; letter-spacing: .08em; }
      .bd-static-auth-health-row-v345 { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
      .bd-static-auth-health-row-v345 i { width: 10px; height: 10px; border-radius: 99px; background: #5b5ceb; box-shadow: 0 0 0 5px rgba(91,92,235,.12); }
      .bd-static-auth-health-row-v345 span { display: grid; gap: 3px; }
      .bd-static-auth-health-row-v345 span small { color: #747b8d; }
      .bd-static-auth-money-v345 { min-height: 104px; margin-top: 18px; padding: 18px 20px; display: grid; align-content: center; gap: 6px; border-radius: 24px; background: linear-gradient(145deg,#141b3d,#222d68); color: #fff; }
      .bd-static-auth-money-v345 > small { color: rgba(255,255,255,.62); }
      .bd-static-auth-nav-v345 { position: fixed; left: 0; right: 0; bottom: 0; height: calc(76px + env(safe-area-inset-bottom)); border-top: 1px solid #e5e7ef; background: #fff; }`;

const authMarkup = `
        <div class="bd-static-auth-home-v345" data-bd-authenticated-home-shell="v345">
          <header class="bd-static-auth-head-v345"><strong>Главная</strong><span class="bd-static-auth-venue-v345">Заведение</span></header>
          <section class="bd-static-auth-health-v345"><small>BUSINESS HEALTH</small><div class="bd-static-auth-health-row-v345"><i aria-hidden="true"></i><span><strong>Загружаем актуальное состояние</strong><small>Финансы и операции обновляются параллельно</small></span></div></section>
          <section class="bd-static-auth-money-v345"><small>ФИНАНСОВЫЙ РЕЗУЛЬТАТ</small><strong>Сверяем данные с сервером</strong><small>Покажем только актуальные суммы</small></section>
          <div class="bd-static-auth-nav-v345" aria-hidden="true"></div>
        </div>`;

for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  if (!html.includes('name="bd-authenticated-home-shell"') && !html.includes('data-bd-authenticated-startup", "v345"')) html = html.replace(/(document\.documentElement\.setAttribute\("data-bd-startup-pending", "v201"\);)/, `$1${authProbe}`);
  if (!html.includes("/* authenticated-home-shell-v345 */")) html = html.replace("      @keyframes bd-static-startup-spin-v201", `${authCss}\n      @keyframes bd-static-startup-spin-v201`);
  if (!html.includes('data-bd-authenticated-home-shell="v345"')) html = html.replace('        <div class="bd-static-startup-content-v202">', `${authMarkup}\n        <div class="bd-static-startup-content-v202">`);
  if (!html.includes('name="bd-authenticated-home-shell"')) html = html.replace('<meta name="bd-authoritative-home" content="v344" />', '<meta name="bd-authoritative-home" content="v344" />\n    <meta name="bd-authenticated-home-shell" content="v345" />');
  html = html.replace(/(bardoctor-preview\.js\?v=[^"\n]*authoritative-home-v344)(?![^"\n]*authenticated-home-v345)/g, "$1-20260829-authenticated-home-v345");
  html = html.replace('</div>\n    </div>\n    <script src="/bardoctor-preview.js', '</div>\n      <script>if(window.__bdStartupVenueV345){var bdVenueLabelV345=document.querySelector(".bd-static-auth-venue-v345");if(bdVenueLabelV345)bdVenueLabelV345.textContent=window.__bdStartupVenueV345}</script>\n    </div>\n    <script src="/bardoctor-preview.js');
  if (html !== initial) { writeFileSync(path, html); changed = true; }
}

if (changed) {
  writeFileSync(bundlePath, bundle);
  writeFileSync(bootstrapPath, bootstrap);
  console.log("Applied authenticated Home shell v345.");
} else console.log("Authenticated Home shell v345 is already applied.");
