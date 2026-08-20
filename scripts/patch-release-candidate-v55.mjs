import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const appCssPath = path.join(root, "public/assets/index-D0AhgpbR.css");
let source = fs.readFileSync(bundlePath, "utf8");
let appCss = fs.readFileSync(appCssPath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v55"')) {
  console.log("release candidate v55 already applied");
  process.exit(0);
}

if (!source.includes('bdReleaseCandidateVersion="rc-v54"')) {
  throw new Error("release candidate v54 marker was not found");
}
source = source.replace(
  'bdReleaseCandidateVersion="rc-v54"',
  'bdReleaseCandidateVersion="rc-v55"',
);

const appMarker = "/* bd-responsive-polish-v55 */";
if (!appCss.includes(appMarker)) {
  appCss += `
${appMarker}
@media (min-width:1024px){
  [data-bd-home-daily="v31"]>button:not([data-bd-home-money]){min-height:58px!important;background:linear-gradient(135deg,#615af3,#4f46dc)!important;color:#fff!important;box-shadow:0 12px 30px rgba(79,70,229,.24)!important}
  [data-bd-home-daily="v31"]>button:not([data-bd-home-money]) .text-indigo-100{color:#dddfff!important}
  .bd-sync-indicator{top:auto!important;right:18px!important;bottom:18px!important}
}
`;
}

const standaloneNavCss = `
@media (min-width:1024px){
  body{padding-left:240px!important;padding-bottom:0!important}
  .market-page,.opportunity-page,.trust-page{width:min(100%,1060px)!important}
  .market-bottom-nav,.opportunity-bottom-nav,.trust-bottom-nav{position:fixed!important;inset:0 auto 0 0!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:7px!important;width:240px!important;height:100dvh!important;padding:106px 16px 20px!important;border:0!important;border-right:1px solid rgba(22,27,46,.08)!important;background:rgba(255,255,255,.985)!important;box-shadow:12px 0 34px rgba(35,42,74,.055)!important;box-sizing:border-box!important;z-index:70!important}
  .market-bottom-nav:before,.opportunity-bottom-nav:before,.trust-bottom-nav:before{content:"BD  BarDoctor";position:absolute;top:22px;left:18px;right:18px;display:flex;align-items:center;height:56px;padding:0 16px;border:1px solid #e5e7f4;border-radius:18px;background:linear-gradient(145deg,#f7f7ff,#fff);color:#11172d;font-size:15px;font-weight:950;letter-spacing:-.02em;box-sizing:border-box}
  .market-bottom-nav a,.market-bottom-nav button,.opportunity-bottom-nav a,.opportunity-bottom-nav button,.trust-bottom-nav a{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;height:52px!important;min-height:52px!important;padding:0 15px!important;border-radius:15px!important;color:#7d8498!important;background:transparent!important;font-size:13px!important;font-weight:800!important;text-align:left!important;box-sizing:border-box!important}
  .market-bottom-nav a:hover,.market-bottom-nav button:hover,.opportunity-bottom-nav a:hover,.opportunity-bottom-nav button:hover,.trust-bottom-nav a:hover{color:#4f46e5!important;background:#f4f4fb!important}
  .market-bottom-nav a.active,.opportunity-bottom-nav a.active,.trust-bottom-nav a.active{color:#4f46e5!important;background:#f0efff!important}
  .market-bottom-nav a>span,.market-bottom-nav button>span,.opportunity-bottom-nav a>span,.opportunity-bottom-nav button>span,.trust-bottom-nav a>span{display:grid!important;place-items:center!important;width:22px!important;height:22px!important;border-radius:0!important;background:transparent!important;font-size:20px!important;line-height:1!important;flex:0 0 auto!important}
  .market-quick-sheet,.quick-sheet{left:auto!important;right:24px!important;width:min(480px,calc(100vw - 288px))!important}
}
@media (min-width:1024px) and (max-width:1180px){
  body{padding-left:216px!important}
  .market-bottom-nav,.opportunity-bottom-nav,.trust-bottom-nav{width:216px!important;padding-inline:12px!important}
}
`;

for (const name of ["market.css", "opportunities.css", "data-control.css"]) {
  const filePath = path.join(root, "public", name);
  let css = fs.readFileSync(filePath, "utf8");
  const marker = "/* bd-standalone-desktop-v55 */";
  if (!css.includes(marker)) css += `\n${marker}${standaloneNavCss}`;
  fs.writeFileSync(filePath, css);
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(appCssPath, appCss);
console.log("applied release candidate v55");
