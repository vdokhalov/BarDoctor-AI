import fs from "node:fs";
import path from "node:path";

const bundlePath = path.join(process.cwd(), "public/assets/index-BQGspy0I.js");
const cssPath = path.join(process.cwd(), "public/assets/index-D0AhgpbR.css");
let source = fs.readFileSync(bundlePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (source.includes('bdReleaseCandidateVersion="rc-v54"')) {
  console.log("release candidate v54 already applied");
  process.exit(0);
}

function replaceOnce(oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`${label} anchor was not found`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${label} anchor is not unique`);
  }
  source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}

replaceOnce(
  'bdReleaseCandidateVersion="rc-v53"',
  'bdReleaseCandidateVersion="rc-v54"',
  "release marker",
);

replaceOnce(
  '"data-bd-bottom-nav":"navigation-v29"',
  '"data-bd-bottom-nav":"responsive-v54"',
  "responsive navigation marker",
);
replaceOnce(
  'children:i.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",width:"100%",height:"100%",alignItems:"stretch"},children:u.map(v)})});',
  'children:i.jsxs(i.Fragment,{children:[i.jsxs("div",{"data-bd-desktop-brand":"responsive-v54",children:[i.jsx("span",{children:"BD"}),i.jsx("strong",{children:"BarDoctor"})]}),i.jsx("div",{"data-bd-primary-navigation":"responsive-v54",style:{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",width:"100%",height:"100%",alignItems:"stretch"},children:u.map(v)})]})});',
  "desktop navigation brand",
);
replaceOnce(
  'const k=i.jsxs(W.div,{initial:',
  'const k=i.jsxs(W.div,{"data-bd-add-menu":"responsive-v54",initial:',
  "desktop add menu marker",
);
replaceOnce(
  'function nt({children:e,showBottomNav:t=!1,className:n}){return i.jsx("div",{className:"min-h-[100dvh] w-full bg-background flex justify-center text-foreground",children:i.jsxs("div",{className:"w-full max-w-[430px] relative bg-background shadow-xl overflow-hidden flex flex-col",children:[i.jsx("main",{className:X("flex-1 overflow-y-auto w-full scroll-smooth",t&&"pb-safe-nav",n),children:e}),t&&i.jsx(Tle,{})]})})}',
  'function nt({children:e,showBottomNav:t=!1,className:n}){return i.jsx("div",{"data-bd-app-shell":"responsive-v54",className:"min-h-[100dvh] w-full bg-background flex justify-center text-foreground",children:i.jsxs("div",{"data-bd-app-frame":"responsive-v54",className:"w-full max-w-[430px] relative bg-background shadow-xl overflow-hidden flex flex-col",children:[i.jsx("main",{"data-bd-app-main":"responsive-v54",className:X("flex-1 overflow-y-auto w-full scroll-smooth",t&&"pb-safe-nav",n),children:e}),t&&i.jsx(Tle,{})]})})}',
  "responsive application shell",
);

const cssMarker = "/* bd-responsive-desktop-v54 */";
if (!css.includes(cssMarker)) {
  css += `
${cssMarker}
@media (min-width:1024px){
  [data-bd-app-shell="responsive-v54"]{display:block!important;min-height:100dvh!important;background:#f4f6fb!important}
  [data-bd-app-frame="responsive-v54"]{display:block!important;width:100%!important;max-width:none!important;min-height:100dvh!important;padding-left:240px!important;overflow:visible!important;background:#f4f6fb!important;box-shadow:none!important}
  [data-bd-app-main="responsive-v54"]{width:100%!important;min-height:100dvh!important;overflow:visible!important;padding-bottom:0!important;background:#f4f6fb!important}
  [data-bd-app-main="responsive-v54"]>div{width:min(100%,1180px)!important;margin-inline:auto!important;box-sizing:border-box}
  [data-bd-bottom-nav="responsive-v54"]{position:fixed!important;inset:0 auto 0 0!important;transform:none!important;width:240px!important;max-width:none!important;height:100dvh!important;padding:20px 16px!important;box-sizing:border-box!important;background:rgba(255,255,255,.985)!important;border:0!important;border-right:1px solid rgba(22,27,46,.08)!important;box-shadow:12px 0 34px rgba(35,42,74,.055)!important;backdrop-filter:blur(24px) saturate(180%)!important;z-index:70!important}
  [data-bd-desktop-brand="responsive-v54"]{display:flex!important;align-items:center!important;gap:10px!important;height:58px!important;margin:2px 2px 26px!important;padding:0 12px!important;border:1px solid #e5e7f4!important;border-radius:18px!important;background:linear-gradient(145deg,#f7f7ff,#fff)!important;color:#11172d!important}
  [data-bd-desktop-brand="responsive-v54"]>span{display:grid!important;place-items:center!important;width:34px!important;height:34px!important;border-radius:11px!important;background:linear-gradient(145deg,#6861ff,#4f46e5)!important;color:#fff!important;font-size:12px!important;font-weight:950!important;letter-spacing:-.02em!important;box-shadow:0 8px 18px rgba(79,70,229,.22)!important}
  [data-bd-desktop-brand="responsive-v54"]>strong{font-size:16px!important;font-weight:950!important;letter-spacing:-.025em!important}
  [data-bd-primary-navigation="responsive-v54"]{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:7px!important;width:100%!important;height:auto!important}
  [data-bd-primary-navigation="responsive-v54"]>a,[data-bd-primary-navigation="responsive-v54"]>button{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;height:52px!important;min-height:52px!important;padding:0 15px!important;border-radius:15px!important;color:#7d8498!important;box-sizing:border-box!important}
  [data-bd-primary-navigation="responsive-v54"]>a:hover,[data-bd-primary-navigation="responsive-v54"]>button:hover{background:#f4f4fb!important;color:#4f46e5!important}
  [data-bd-primary-navigation="responsive-v54"]>a:has(>span[style*="position: absolute"]){background:#f0efff!important;color:#4f46e5!important}
  [data-bd-primary-navigation="responsive-v54"]>a>span:last-child,[data-bd-primary-navigation="responsive-v54"]>button>span:last-child{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;min-width:0!important}
  [data-bd-primary-navigation="responsive-v54"]>a>span:last-child>span:last-child,[data-bd-primary-navigation="responsive-v54"]>button>span:last-child>span:last-child{font-size:13px!important;line-height:1.2!important;font-weight:800!important;letter-spacing:0!important}
  [data-bd-primary-navigation="responsive-v54"]>a>span[style*="position: absolute"]{left:0!important;top:50%!important;width:3px!important;height:26px!important;transform:translateY(-50%)!important;border-radius:0 999px 999px 0!important}
  [data-bd-primary-navigation="responsive-v54"] svg{width:21px!important;height:21px!important;flex:0 0 auto!important}
  [data-bd-add-menu="responsive-v54"]{left:auto!important;right:24px!important;bottom:24px!important;width:min(480px,calc(100vw - 288px))!important}
  [data-bd-home-daily="v31"]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px!important;align-items:stretch!important}
  [data-bd-home-daily="v31"]>[data-bd-home-health="split-v19"],[data-bd-home-daily="v31"]>button:not([data-bd-home-money]),[data-bd-home-daily="v31"]>[data-bd-home-sections="v18"],[data-bd-home-daily="v31"]>[data-bd-home-ai="inside-home-v23"]{grid-column:1/-1!important}
  [data-bd-home-daily="v31"]>[data-bd-home-today="v18"],[data-bd-home-daily="v31"]>[data-bd-home-money="cash-v18"],[data-bd-home-daily="v31"]>[data-bd-home-attention="v31"],[data-bd-home-daily="v31"]>[data-bd-setup-checklist="open-v31"],[data-bd-home-daily="v31"]>[data-bd-opportunity-entry],[data-bd-home-daily="v31"]>[data-bd-competitors-entry]{height:100%!important}
  [data-bd-home-sections="v18"]>div.grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
}
@media (min-width:1024px) and (max-width:1180px){
  [data-bd-app-frame="responsive-v54"]{padding-left:216px!important}
  [data-bd-bottom-nav="responsive-v54"]{width:216px!important;padding-inline:12px!important}
  [data-bd-app-main="responsive-v54"]>div{max-width:900px!important}
}
`;
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(cssPath, css);
console.log("applied release candidate v54");
