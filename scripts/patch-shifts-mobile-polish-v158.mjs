import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (
  source.includes('"data-bd-shifts-page":"v158"') &&
  source.includes("function bdSyncPresentationV158(")
) {
  const legacyConflictCopy = 'description:l+" "+(l===1?"запись изменилась":"записей изменились")+" на другом устройстве. Проверьте последние изменения."';
  const currentConflictCopy = 'description:l===1?"Одна запись изменилась на другом устройстве. Проверьте последние изменения.":"Несколько записей изменились на другом устройстве. Проверьте последние изменения."';
  if (source.includes(legacyConflictCopy)) {
    source = source.replace(legacyConflictCopy, currentConflictCopy);
    await writeFile(bundlePath, source);
    console.log("Shifts mobile polish v158 compatibility copy updated.");
    process.exit(0);
  }
  console.log("Shifts mobile polish v158 is already applied.");
  process.exit(0);
}

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  const second = source.indexOf(before, first + before.length);
  if (first === -1) throw new Error(`${label}: source contract was not found.`);
  if (second !== -1) throw new Error(`${label}: source contract is not unique.`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  "coverage copy helper",
  "function bdShiftRowsV156(",
  'function bdShiftCoverageCopyV158(e){if(!e||e.scheduledCompletedShifts<=0)return{label:"Учтено прошедших",value:"—",hint:"смен по графику"};return{label:"Учтено прошедших",value:(e.revenueEntered+e.explainedClosures)+"/"+e.scheduledCompletedShifts,hint:"смен по графику"}}\nfunction bdShiftRowsV156(',
);

replaceOnce(
  "coverage view model",
  "coverage=S.useMemo(()=>profile&&period?kC(profile,revenue,gapReasons,now,period):null,[profile,period,revenue,gapReasons,now.getDate()]),records=",
  "coverage=S.useMemo(()=>profile&&period?kC(profile,revenue,gapReasons,now,period):null,[profile,period,revenue,gapReasons,now.getDate()]),coverageCopy=bdShiftCoverageCopyV158(coverage),records=",
);

replaceOnce(
  "coverage summary copy",
  'i.jsx("span",{children:"Заполнено"}),i.jsx("strong",{className:coverage?.unexplainedGaps>0?"warning":"success",children:coverage&&coverage.scheduledCompletedShifts>0?(coverage.revenueEntered+coverage.explainedClosures)+"/"+coverage.scheduledCompletedShifts:"—"}),coverage&&coverage.scheduledCompletedShifts>0&&i.jsx("div",{className:"bd-shifts-progress","aria-hidden":!0,children:i.jsx("i",{style:{width:Math.min(100,coverage.coveragePercent)+"%"}})})',
  'i.jsx("span",{children:coverageCopy.label}),i.jsx("strong",{className:coverage?.unexplainedGaps>0?"warning":"success",children:coverageCopy.value}),i.jsx("small",{children:coverageCopy.hint}),coverage&&coverage.scheduledCompletedShifts>0&&i.jsx("div",{className:"bd-shifts-progress","aria-hidden":!0,children:i.jsx("i",{style:{width:Math.min(100,coverage.coveragePercent)+"%"}})})',
);

replaceOnce(
  "compact missing shift card",
  'return i.jsxs("button",{type:"button",className:"bd-shift-card "+item.kind,onClick:()=>setViewing(item),children:[',
  'if(item.kind==="missing")return i.jsxs("button",{type:"button",className:"bd-shift-card bd-shift-card-compact missing",onClick:()=>setViewing(item),"aria-label":bdShiftDateLabelV156(item.date)+". Смена не заполнена. Требует внимания",children:[i.jsxs("span",{className:"bd-shift-card-compact-copy",children:[i.jsx("strong",{children:bdShiftDateLabelV156(item.date)}),i.jsx("small",{children:"Смена не заполнена"})]}),i.jsxs("span",{className:"bd-shift-card-compact-action",children:["Требует внимания",i.jsx(Br,{size:15,"aria-hidden":!0})]})]},item.key);return i.jsxs("button",{type:"button",className:"bd-shift-card "+item.kind,onClick:()=>setViewing(item),children:[',
);

replaceOnce(
  "shifts experience version",
  '"data-bd-shifts-page":"v156"',
  '"data-bd-shifts-page":"v158"',
);

const syncStart = source.indexOf("const Mse=");
const syncEnd = source.indexOf("const hz=", syncStart);
if (syncStart === -1 || syncEnd <= syncStart) {
  throw new Error("Global sync presentation contract was not found.");
}

const syncExperience = String.raw`const Mse={synced:{icon:HX},syncing:{icon:$r,spin:!0},offline:{icon:WX},pending:{icon:YX},conflict:{icon:Qn}};
function bdSyncPresentationV158(e){return{synced:{visible:!1,label:"Синхронизировано",tone:"success",retry:!1},syncing:{visible:!0,label:"Синхронизация…",tone:"syncing",retry:!1},offline:{visible:!0,label:"Нет сети",tone:"offline",retry:!1},pending:{visible:!0,label:"Не синхронизировано",tone:"error",retry:!0},conflict:{visible:!0,label:"Конфликт данных",tone:"conflict",retry:!1}}[e]??{visible:!0,label:"Ошибка синхронизации",tone:"error",retry:!0}}
function Pse(){const e=kse(),t=Ose(),{toast:n}=sn(),r=S.useRef(0),a=S.useRef(e),s=!!Ot();if(S.useEffect(()=>{if(t.length>r.current){const l=t.length-r.current;n({variant:"warning",title:"Конфликт данных",description:l===1?"Одна запись изменилась на другом устройстве. Проверьте последние изменения.":"Несколько записей изменились на другом устройстве. Проверьте последние изменения.",duration:6e3});const u=setTimeout(()=>Tse(),6e3);return r.current=0,()=>clearTimeout(u)}r.current=t.length},[t,n]),S.useEffect(()=>{const l=a.current;a.current=e,l!=="synced"&&e==="synced"&&n({variant:"success",title:"Синхронизировано",description:"Все изменения сохранены.",duration:1800})},[e,n]),!s)return null;const l=bdSyncPresentationV158(e);if(!l.visible)return null;const u=Mse[e]??Mse.pending,d=u.icon,f=u.spin===!0,m=l.retry?()=>{pM()}:null,h=i.jsxs(i.Fragment,{children:[i.jsx(d,{className:"bd-sync-status-icon"+(f?" is-spinning":""),"aria-hidden":!0}),i.jsx("span",{children:l.label}),m&&i.jsx("span",{className:"bd-sync-status-action",children:"Повторить"})]});return i.jsx("div",{className:"bd-sync-indicator","aria-live":"polite",children:i.jsx(qe,{mode:"wait",children:i.jsx(W.div,{initial:{opacity:0,y:-6},animate:{opacity:1,y:0},exit:{opacity:0,y:-6},transition:{duration:.18},className:"bd-sync-status-shell "+l.tone,children:m?i.jsx("button",{type:"button",className:"bd-sync-status bd-sync-retry",onClick:m,"aria-label":"Повторить синхронизацию",children:h}):i.jsx("div",{className:"bd-sync-status",role:e==="offline"||e==="conflict"?"alert":"status",children:h})},e)})})}`;

source = source.slice(0, syncStart) + syncExperience + source.slice(syncEnd);

await writeFile(bundlePath, source);
console.log("Shifts mobile polish and global sync presentation v158 applied.");
