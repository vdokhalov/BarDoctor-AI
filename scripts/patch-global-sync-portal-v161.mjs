import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes("bdSyncHostV161")) {
  console.log("Global sync portal v161 is already applied.");
  process.exit(0);
}

const start = source.indexOf("function Pse(){");
const end = source.indexOf("const hz=", start);
if (start === -1 || end === -1) {
  throw new Error("Global sync status component was not found for portal v161.");
}

const syncStatus = String.raw`function Pse(){const e=kse(),t=Ose(),{toast:n}=sn(),r=S.useRef(0),a=S.useRef(e),s=!!Ot(),[bdSyncHostV161,bdSetSyncHostV161]=S.useState(null);if(S.useEffect(()=>{const l=()=>bdSetSyncHostV161(document.querySelector("[data-bd-sync-host]"));l();const u=new MutationObserver(l);return u.observe(document.documentElement,{childList:!0,subtree:!0}),()=>u.disconnect()},[]),S.useEffect(()=>{if(t.length>r.current){const l=t.length-r.current;n({variant:"warning",title:"Конфликт данных",description:l===1?"Одна запись изменилась на другом устройстве. Проверьте последние изменения.":"Несколько записей изменились на другом устройстве. Проверьте последние изменения.",duration:6e3});const u=setTimeout(()=>Tse(),6e3);return r.current=0,()=>clearTimeout(u)}r.current=t.length},[t,n]),S.useEffect(()=>{const l=a.current;a.current=e,l!=="synced"&&e==="synced"&&n({variant:"success",title:"Синхронизировано",description:"Все изменения сохранены.",duration:1800})},[e,n]),!s)return null;const l=bdSyncPresentationV158(e);if(!l.visible)return null;const u=Mse[e]??Mse.pending,d=u.icon,f=u.spin===!0,m=l.retry?()=>{pM()}:null,h=i.jsxs(i.Fragment,{children:[i.jsx(d,{className:"bd-sync-status-icon"+(f?" is-spinning":""),"aria-hidden":!0}),i.jsx("span",{children:l.label}),m&&i.jsx("span",{className:"bd-sync-status-action",children:"Повторить"})]}),g=i.jsx("div",{className:"bd-sync-indicator","aria-live":"polite",children:i.jsx(qe,{mode:"wait",children:i.jsx(W.div,{initial:{opacity:0,y:-6},animate:{opacity:1,y:0},exit:{opacity:0,y:-6},transition:{duration:.18},className:"bd-sync-status-shell "+l.tone,children:m?i.jsx("button",{type:"button",className:"bd-sync-status bd-sync-retry",onClick:m,"aria-label":"Повторить синхронизацию",children:h}):i.jsx("div",{className:"bd-sync-status",role:e==="offline"||e==="conflict"?"alert":"status",children:h})},e)})});return bdSyncHostV161?ug.createPortal(g,bdSyncHostV161):g}`;

source = source.slice(0, start) + syncStatus + source.slice(end);
await writeFile(bundlePath, source);
console.log("Global sync portal v161 applied.");
