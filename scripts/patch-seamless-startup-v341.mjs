import fs from "node:fs";

const bundlePaths = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("../dist/client/assets/index-BQGspy0I.js", import.meta.url),
];

const startup = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201"||e.getAttribute("data-bd-startup-completing")==="v341")return;e.setAttribute("data-bd-startup-completing","v341");const t=document.querySelector('[data-bd-static-startup="v201"]'),n=()=>{e.removeAttribute("data-bd-startup-pending"),e.removeAttribute("data-bd-startup-completing"),t?.remove(),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:bdStartupFirstPaintVersion}}))};t?(t.classList.add("bd-static-startup-leaving-v341"),window.setTimeout(n,180)):n()}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai();bdUseLiveBusinessHealthV335(n&&r&&!!t);const{snapshot:j}=bdUseBusinessHealthSnapshotV284(),[v]=S.useState(()=>{const E=window.location.pathname,q=E==="/"?Cle():E;return q==="/home"&&bdHealthLaunchBeginV155()}),[E,q]=S.useState(()=>v?"SPLASH_LOADING":"HOME"),[B,U]=S.useState(!1);S.useEffect(()=>{if(!v)return;const V=window.setTimeout(()=>U(!0),900);return()=>window.clearTimeout(V)},[v]),S.useEffect(()=>{if(!v||E!=="SPLASH_LOADING"||!B||!n||!r)return;bdHealthDiagnosticV155("server-bootstrap-ready",{snapshotId:j?.snapshotId??null,score:j?.score??null,venueReady:n,cloudReady:r,calculationVersion:j?.calculationVersion,venueId:j?.venueId}),bdHealthLaunchCompleteV155("server-bootstrap-ready"),bdHealthStartupRouteHomeV155(),q("HOME")},[v,E,B,n,t,r,j]),S.useLayoutEffect(()=>{(!v||E==="HOME")&&bdStartupFirstPaintCompleteV201()},[v,E]);return!v||E==="HOME"?e:i.jsx("div",{"data-bd-root-splash":"seamless-startup-v341","data-bd-health-startup-machine":"v335","data-bd-health-startup-state":"SPLASH_LOADING","aria-hidden":"true",style:{minHeight:"100dvh",width:"100%",background:"#070911"}})}
`;

function patchBundle(bundlePath) {
  if (!fs.existsSync(bundlePath)) return false;
  let source = fs.readFileSync(bundlePath, "utf8");
  const start = source.indexOf("function bdStartupFirstPaintCompleteV201");
  const end = source.indexOf("function cEe(){", start);
  if (start < 0 || end < 0) {
    throw new Error(`Seamless startup anchors not found in ${bundlePath.pathname}`);
  }
  source = source.slice(0, start) + startup + source.slice(end);
  const coordinator = source.slice(
    source.indexOf("function bdHealthStartupGateV155"),
    source.indexOf("function cEe(){"),
  );
  if (!coordinator.includes('data-bd-root-splash":"seamless-startup-v341')) {
    throw new Error("Seamless startup v341 was not installed");
  }
  if (coordinator.includes("5200") || coordinator.includes("server-bootstrap-timeout")) {
    throw new Error("Startup can still reveal Home before bootstrap is ready");
  }
  if (coordinator.includes("children:i.jsx(ble")) {
    throw new Error("A second branded splash is still rendered by React");
  }
  fs.writeFileSync(bundlePath, source);
  return true;
}

const patched = bundlePaths.filter(patchBundle).length;
console.log(`Seamless startup v341 applied to ${patched} bundle${patched === 1 ? "" : "s"}`);
