import fs from "node:fs";

const targets = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("./fragments/writeoff-workflow-v271.fragment.txt", import.meta.url),
];
const guardedBackClose = 'function x(){window.bdNavigateBack(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}))}';
const shellClose = 'function x(){window.bdNavigate(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}';
const newClose = 'function x(){a(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}';
const hardenedClose = 'function x(){const A=bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"});a(A,{replace:!0}),setTimeout(()=>window.dispatchEvent(new PopStateEvent("popstate",{state:window.history.state})),0)}';
const stateAnchor = '[j,v]=S.useState(!0),b=new URLSearchParams(s),N=b.get("writeoff"),E=';
const stateWithDismissal = '[j,v]=S.useState(!0),[bdDismissedWriteoffV401,bdSetDismissedWriteoffV401]=S.useState(""),b=new URLSearchParams(s),N=b.get("writeoff"),bdWriteoffRouteKeyV401=String(s),E=';
const synchronizedClose = 'function x(){bdSetDismissedWriteoffV401(bdWriteoffRouteKeyV401);const A=bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"});a(A,{replace:!0}),setTimeout(()=>window.dispatchEvent(new PopStateEvent("popstate",{state:window.history.state})),0)}function bdOpenNewWriteoffV401(){bdSetDismissedWriteoffV401(""),a(bdWarehouseNavigationUrlV247({writeoff:"new",tab:"writeoffs"}))}';
const openNew = 'onClick:()=>a(bdWarehouseNavigationUrlV247({writeoff:"new",tab:"writeoffs"}))';
const synchronizedOpenNew = 'onClick:bdOpenNewWriteoffV401';
const newSheet = 'N==="new"&&n&&i.jsx(bdWriteoffSheet,';
const guardedNewSheet = 'N==="new"&&n&&bdDismissedWriteoffV401!==bdWriteoffRouteKeyV401&&i.jsx(bdWriteoffSheet,';

for (const target of targets) {
  let source = fs.readFileSync(target, "utf8");
  if (!source.includes(hardenedClose)) {
    const anchor = source.includes(newClose) ? newClose : source.includes(shellClose) ? shellClose : guardedBackClose;
    if (!source.includes(anchor)) throw new Error(`Write-off close navigation anchor was not found in ${target.pathname}`);
    source = source.replace(anchor, hardenedClose);
  }
  if (!source.includes(stateWithDismissal)) {
    if (!source.includes(stateAnchor)) throw new Error(`Write-off dismissal state anchor was not found in ${target.pathname}`);
    source = source.replace(stateAnchor, stateWithDismissal);
  }
  if (!source.includes(synchronizedClose)) {
    if (!source.includes(hardenedClose)) throw new Error(`Write-off close navigation anchor was not found in ${target.pathname}`);
    source = source.replace(hardenedClose, synchronizedClose);
  }
  if (!source.includes(synchronizedOpenNew)) {
    const openCount = source.split(openNew).length - 1;
    if (openCount !== 2) throw new Error(`Expected two new write-off actions in ${target.pathname}, found ${openCount}`);
    source = source.replaceAll(openNew, synchronizedOpenNew);
  }
  if (!source.includes(guardedNewSheet)) {
    if (!source.includes(newSheet)) throw new Error(`New write-off sheet anchor was not found in ${target.pathname}`);
    source = source.replace(newSheet, guardedNewSheet);
  }
  fs.writeFileSync(target, source);
  if (!source.includes(synchronizedClose) || !source.includes(guardedNewSheet)) {
    throw new Error(`Write-off close synchronization was not applied to ${target.pathname}`);
  }
}

console.log("Write-off close navigation v401 patched");
