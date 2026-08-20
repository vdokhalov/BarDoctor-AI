import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceSection(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Missing section start: ${label}`);
  if (source.indexOf(startMarker, start + startMarker.length) !== -1) {
    throw new Error(`Section start is not unique: ${label}`);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`Missing section end: ${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const employeeRow = String.raw`
function bdTeamEmployeeCount(e){const t=Math.abs(Number(e)||0)%100,n=t%10,r=t>10&&t<20?"сотрудников":n===1?"сотрудник":n>=2&&n<=4?"сотрудника":"сотрудников";return e+" "+r}
function bdTeamActiveLabel(e){return Number(e)===1?"1 активен":e+" активны"}
function bdTeamStatusLabel(e){return{active:"Активен",on_leave:"В отпуске",dismissed:"Уволен"}[e]||"Не указан"}
function bdTeamShiftLabel(e){return YV[e]?.label||"Не указан"}
function bdTeamListAvatar({name:e,status:t}){return i.jsxs("div",{className:"bd-team-avatar",children:[i.jsx("span",{children:lCe(e)||"?"}),i.jsx("i",{className:X("bd-team-avatar-status",X_[t]?.dot||"bg-slate-400")})]})}
function mCe({employee:e,onEdit:t}){const n=jo(e),r=e.department?n+" · "+e.department:n,a=e.phone||e.email||"Не указан";return i.jsxs(W.button,{type:"button",onClick:()=>t(e),initial:{opacity:0,y:6},animate:{opacity:1,y:0},exit:{opacity:0,scale:.985},transition:{duration:.22,ease:[.22,1,.36,1]},className:"bd-team-row",title:e.name,"aria-label":"Открыть карточку сотрудника: "+e.name,children:[i.jsx(bdTeamListAvatar,{name:e.name,status:e.status}),i.jsxs("div",{className:"bd-team-person",children:[i.jsx("strong",{children:e.name}),i.jsx("span",{children:r})]}),i.jsxs("div",{className:"bd-team-work",children:[i.jsx("span",{className:"bd-team-cell-label",children:"График"}),i.jsx("strong",{children:bdTeamShiftLabel(e.shift)})]}),i.jsxs("div",{className:"bd-team-state",children:[i.jsx("span",{className:"bd-team-cell-label",children:"Статус"}),i.jsxs("strong",{children:[i.jsx("i",{className:X("bd-team-status-dot",X_[e.status]?.dot||"bg-slate-400")}),bdTeamStatusLabel(e.status)]})]}),i.jsxs("div",{className:"bd-team-contact",children:[i.jsx("span",{className:"bd-team-cell-label",children:"Контакт"}),i.jsx("strong",{title:a,children:a})]}),i.jsx(Br,{size:16,className:"bd-team-arrow"})]})}
`;

const employeeEmpty = String.raw`
function xCe({onAdd:e}){return i.jsxs("section",{className:"bd-team-empty",children:[i.jsx("div",{className:"bd-team-empty-icon",children:i.jsx(zr,{size:24})}),i.jsx("h2",{children:"Команда пока не добавлена"}),i.jsx("p",{children:"Добавьте сотрудников, чтобы вести смены, правила оплаты и персональные показатели в одном месте."}),i.jsxs("button",{type:"button",onClick:e,className:"bd-team-empty-action",children:[i.jsx(Vt,{size:15}),"Добавить первого сотрудника"]})]})}
`;

const filteredEmpty = String.raw`
function gCe({onClear:e}){return i.jsxs("section",{className:"bd-team-empty bd-team-empty--filtered",children:[i.jsx("div",{className:"bd-team-empty-icon",children:i.jsx(xi,{size:22})}),i.jsx("h2",{children:"Сотрудники не найдены"}),i.jsx("p",{children:"Измените запрос или верните полный список команды."}),i.jsx("button",{type:"button",onClick:e,className:"bd-team-clear-action",children:"Сбросить фильтры"})]})}
`;

const employeeList = String.raw`
function vCe(){const[,bdEmployeeNavigate]=bt(),{employees:e,addEmployee:t,updateEmployee:n,deleteEmployee:r}=_i(),{toast:a}=sn(),[s,l]=S.useState("all"),[u,d]=S.useState(""),[f,m]=S.useState(null),h=S.useMemo(()=>{let T=e;if(s!=="all"&&(T=T.filter(A=>A.status===s)),u.trim()){const A=u.toLowerCase();T=T.filter(k=>k.name.toLowerCase().includes(A)||jo(k).toLowerCase().includes(A)||String(k.department||"").toLowerCase().includes(A))}return T},[e,s,u]),g=S.useMemo(()=>({all:e.length,active:e.filter(T=>T.status==="active").length,on_leave:e.filter(T=>T.status==="on_leave").length,dismissed:e.filter(T=>T.status==="dismissed").length}),[e]);function y(){m({mode:"add"})}function j(T){bdEmployeeNavigate("/employees/"+encodeURIComponent(T.id))}function v(){m(null)}function b(T){const A=new Date().toISOString();if(f?.mode==="add"){const k=t({id:oCe(),...T,createdAt:A,updatedAt:A});a(k?{variant:"success",title:"Сотрудник добавлен",description:T.name}:{variant:"warning",title:"Мало памяти",description:"Сотрудник добавлен в текущую сессию, но не сохранён постоянно."})}else f?.employee&&(n(f.employee.id,T),a({variant:"success",title:"Изменения сохранены"}));v()}function N(){if(!f?.employee)return;const T=f.employee.name;r(f.employee.id),v(),a({variant:"success",title:"Сотрудник удалён",description:T})}const E=e.length>0,_=h.length>0;return i.jsxs(nt,{showBottomNav:!0,children:[i.jsxs($e,{className:"bd-team-list-page","data-bd-team-list":"directory-v83",children:[i.jsxs("header",{className:"bd-team-header",children:[i.jsxs("div",{className:"bd-team-heading",children:[i.jsx("p",{children:"Управление командой"}),i.jsx("h1",{children:"Сотрудники"}),E&&i.jsxs("span",{children:[bdTeamEmployeeCount(e.length)," · ",bdTeamActiveLabel(g.active)]})]}),E&&i.jsxs("button",{type:"button",onClick:y,"aria-label":"Добавить сотрудника",className:"bd-team-add-button",children:[i.jsx(Vt,{size:16}),i.jsx("span",{children:"Добавить сотрудника"})]})]}),E?i.jsxs(i.Fragment,{children:[i.jsxs("section",{className:"bd-team-controls",children:[i.jsxs("div",{className:"bd-team-search",children:[i.jsx(xi,{size:17,"aria-hidden":"true"}),i.jsx("input",{type:"search",placeholder:"Имя, должность или отдел",value:u,onChange:T=>d(T.target.value),"aria-label":"Поиск сотрудников"}),u&&i.jsx("button",{type:"button",onClick:()=>d(""),"aria-label":"Очистить поиск",children:i.jsx(vt,{size:15})})]}),i.jsx("nav",{className:"bd-team-filters","aria-label":"Фильтр сотрудников",children:uCe.map(T=>{const A=g[T.key];return i.jsxs("button",{type:"button",onClick:()=>l(T.key),"aria-pressed":s===T.key,className:s===T.key?"active":"",children:[i.jsx("span",{children:T.label}),i.jsx("b",{children:A})]},T.key)})})]}),i.jsxs("section",{className:"bd-team-directory","aria-label":"Список сотрудников",children:[i.jsxs("div",{className:"bd-team-directory-head","aria-hidden":"true",children:[i.jsx("span",{}),i.jsx("span",{children:"Сотрудник"}),i.jsx("span",{children:"График"}),i.jsx("span",{children:"Статус"}),i.jsx("span",{children:"Контакт"}),i.jsx("span",{})]}),i.jsx("div",{className:"bd-team-directory-body",children:i.jsx(qe,{mode:"popLayout",children:_?h.map(T=>i.jsx(mCe,{employee:T,onEdit:j},T.id)):i.jsx(gCe,{onClear:()=>{l("all"),d("")}},"empty")})})]})]}):i.jsx(xCe,{onAdd:y})]}),i.jsx(qe,{children:f&&i.jsx(yCe,{mode:f.mode,initial:f.employee,onClose:v,onSave:b,onDelete:f.mode==="edit"?N:void 0},"sheet")})]})}
`;

let bundle = await readFile(bundlePath, "utf8");

bundle = replaceSection(
  bundle,
  "function mCe({employee:e,onEdit:t}){",
  "function xCe({onAdd:e}){",
  employeeRow,
  "professional employee row",
);

bundle = replaceSection(
  bundle,
  "function xCe({onAdd:e}){",
  "function gCe({onClear:e}){",
  employeeEmpty,
  "professional employee empty state",
);

bundle = replaceSection(
  bundle,
  "function gCe({onClear:e}){",
  "function yCe({mode:e,initial:t,onClose:n,onSave:r,onDelete:a}){",
  filteredEmpty,
  "professional filtered empty state",
);

bundle = replaceSection(
  bundle,
  "function vCe(){",
  "function bCe({rule:e,usage:t,onEdit:n,onDuplicate:r,onArchiveToggle:a}){",
  employeeList,
  "professional employee directory",
);

bundle = replaceOnce(
  bundle,
  'const bdReleaseCandidateVersion="rc-v81"',
  'const bdReleaseCandidateVersion="rc-v83"',
  "release version",
);

await writeFile(bundlePath, bundle);
console.log("Professional employee directory v83 applied");
