import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("20260825-profile-v280a")) {
  bootstrap = bootstrap.replace(
    "20260824-auth-bootstrap-state-v274\";",
    "20260824-auth-bootstrap-state-v274-20260825-profile-v280a\";",
  );
  fs.writeFileSync(bootstrapPath, bootstrap);
}
let source = fs.readFileSync(bundlePath, "utf8");
const marker = 'const bdProfileVersionV280="profile-v280";';
if (source.includes(marker)) {
  source = source.replace(
    'S.useEffect(()=>{e&&t&&(s(QCe(t)),bdSetLogoFile(null),bdSetLogoRemoved(!1))},[e,t]);',
    'S.useEffect(()=>{e&&t&&s(QCe(t))},[e,t]);S.useEffect(()=>{e&&(bdSetLogoFile(null),bdSetLogoRemoved(!1))},[e]);',
  ).replace(
    'function ZCe({open:e,profile:t,onClose:n,onSave:r}){const[a,s]=',
    'function ZCe({open:e,profile:t,onClose:n,onSave:r}){const{toast:bdToast}=sn(),[a,s]=',
  ).replace(
    'catch(b){window.alert(b?.message||"Не удалось сохранить логотип заведения")}finally{bdSetSaving(!1)}',
    'catch(b){bdToast({variant:"error",title:"Не удалось сохранить",description:b?.message||"Проверьте соединение и попробуйте ещё раз."})}finally{bdSetSaving(!1)}',
  ).replace(
    'async function z(C){try{await n(C),u({variant:"success",title:"Сохранено",description:"Данные заведения обновлены."})}catch{throw u({variant:"error",title:"Ошибка",description:"Не удалось сохранить. Попробуйте ещё раз."})}}',
    'async function z(C){await n(C),u({variant:"success",title:"Сохранено",description:"Данные заведения обновлены."})}',
  );
  const userEditorStart = source.indexOf("function JCe");
  const userEditorEnd = source.indexOf(marker, userEditorStart);
  let userEditor = source.slice(userEditorStart, userEditorEnd);
  userEditor = userEditor.replace(
    'i.jsx("button",{type:"button",onClick:t,className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
    'i.jsx("button",{type:"button",onClick:t,"aria-label":"Закрыть редактирование профиля",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
  );
  source = source.slice(0, userEditorStart) + userEditor + source.slice(userEditorEnd);
  fs.writeFileSync(bundlePath, source);
  process.exit(0);
}

const profileStart = source.indexOf("function e_e(){");
const moreStart = source.indexOf("const QI=[", profileStart);
if (profileStart < 0 || moreStart < 0) throw new Error("Profile anchors not found");

const helpers = `const bdProfileVersionV280="profile-v280";
function bdVenueLogoV280({profile:e,size:t=64,previewUrl:n=""}){const[r,a]=S.useState(!1),s=n||e?.logoId? n||\`/api/venues/logo/\${e.logoId}\`:"",l=Use(e?.name||"Заведение");S.useEffect(()=>a(!1),[s]);return i.jsx("span",{className:"bd-venue-logo-v280",style:{"--bd-venue-logo-size":t+"px"},"aria-hidden":!0,children:s&&!r?i.jsx("img",{src:s,alt:"",onError:()=>a(!0)}):l})}
function bdProfileRowV280({icon:e,title:t,subtitle:n,value:r,onClick:a,destructive:s=!1}){const l=a?"button":"div";return i.jsxs(l,{type:a?"button":void 0,onClick:a,className:"bd-profile-row-v280"+(a?" is-action":"")+(s?" is-destructive":""),children:[e&&i.jsx("span",{className:"bd-profile-row-icon-v280","aria-hidden":!0,children:i.jsx(e,{size:18})}),i.jsxs("span",{className:"bd-profile-row-copy-v280",children:[i.jsx("strong",{children:t}),n&&i.jsx("small",{children:n})]}),r&&i.jsx("span",{className:"bd-profile-row-value-v280",children:r}),a&&i.jsx(Br,{size:16,className:"bd-profile-row-chevron-v280","aria-hidden":!0})]})}
function bdProfileSectionV280({title:e,children:t}){return i.jsxs("section",{className:"bd-profile-section-v280",children:[i.jsx("h2",{children:e}),i.jsx("div",{className:"bd-profile-card-v280",children:t})]})}
`;

const profile = `function e_e(){const[,e]=bt(),{profile:t,save:n}=Un(),{user:r,saveUserProfile:a}=Joe(),{revenue:s,expenses:l}=Ur(),{toast:u}=sn(),[d,f]=S.useState(!1),[m,h]=S.useState(()=>window.bdReadNavigationQuery("edit","")==="venue"),[g,y]=S.useState({status:"idle",sessions:[]}),[j,v]=S.useState(!1),[b,N]=S.useState(!1),E=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("settings.manage"):r?.role==="owner",_=S.useCallback(async()=>{y(T=>({...T,status:"loading"}));const T=Ot();if(!T){y({status:"error",sessions:[]});return}try{const A=await fetch("/api/users/sessions",{headers:{Accept:"application/json",...ca(T)},cache:"no-store"}),k=await A.json();if(!A.ok||!k?.ok||!Array.isArray(k.sessions))throw new Error("SESSION_LIST_FAILED");y({status:"ready",sessions:k.sessions})}catch{y(T=>({status:"error",sessions:Array.isArray(T.sessions)?T.sessions:[]}))}},[]);S.useEffect(()=>{_()},[_]);const T=[r?.firstName,r?.lastName].filter(Boolean).join(" ").trim()||"Пользователь",A=r?.role?i7[r.role]:"Владелец",k=Qoe(r),O=S.useMemo(()=>{if(!t)return null;const C=wo(t,new Date);return C.periodEnd?wn(s,l,C.monthStart,C.periodEnd).avgReceipt:null},[t,s,l]),M=g.status==="loading"?"Загрузка…":g.status==="ready"?String(g.sessions.length):"";function D(C,P,R,I,V){a({firstName:C,lastName:P||void 0,email:R||void 0,phone:I||void 0,role:V}),u({variant:"success",title:"Сохранено",description:"Данные профиля обновлены."})}async function z(C){await n(C),u({variant:"success",title:"Сохранено",description:"Данные заведения обновлены."})}async function L(){N(!0);const C=Ot();try{const P=await fetch("/api/users/sessions",{method:"DELETE",headers:{Accept:"application/json",...ca(C||"")},cache:"no-store"}),R=await P.json();if(!P.ok||!R?.ok)throw new Error("SESSION_REVOKE_FAILED");y({status:"ready",sessions:Array.isArray(R.sessions)?R.sessions:[]}),u({variant:"success",title:"Готово",description:"Остальные сессии завершены."})}catch{u({variant:"error",title:"Не удалось завершить сессии",description:"Повторите попытку позже."})}finally{N(!1)}}async function q(){await bdLogoutSession(),sz(),yz(),localStorage.removeItem("bd_active_venue_id"),localStorage.removeItem("bd_active_venue_is_primary"),localStorage.removeItem("bd_active_role"),localStorage.removeItem("bd_active_permissions"),window.location.replace("/login")}const B=[t?.seats>0&&{value:String(t.seats),label:"мест"},t?.employees>0&&{value:String(t.employees),label:"сотрудников"},O!==null&&{value:bdAccountingMoneyV243(O,t?.currency),label:"средний чек"}].filter(Boolean);return i.jsxs(nt,{showBottomNav:!0,className:"bd-profile-shell-v280",children:[i.jsx(WCe,{title:"Профиль",showBack:!0,onBack:()=>window.bdNavigateBack("/more")}),i.jsxs("main",{"data-bd-profile":bdProfileVersionV280,children:[i.jsxs("section",{className:"bd-profile-user-v280",children:[i.jsx("span",{className:"bd-profile-user-avatar-v280","aria-hidden":!0,children:k==="?"?i.jsx(zc,{size:21}):k}),i.jsxs("span",{className:"bd-profile-user-copy-v280",children:[i.jsx("strong",{children:T}),i.jsx("small",{children:[A,t?.name].filter(Boolean).join(" · ")})]}),i.jsx("button",{type:"button",onClick:()=>f(!0),className:"bd-profile-edit-v280","aria-label":"Редактировать личные данные",children:i.jsx(rS,{size:18})})]}),i.jsx(bdProfileSectionV280,{title:"Аккаунт",children:i.jsxs(i.Fragment,{children:[i.jsx(bdProfileRowV280,{icon:zc,title:"Личные данные",onClick:()=>f(!0)}),i.jsx(bdProfileRowV280,{icon:Tm,title:"Безопасность",subtitle:r?.auth?.canChangePassword?"Пароль и подтверждение личности":"Управляется способом входа",onClick:r?.auth?.canChangePassword?()=>window.location.assign("/forgot-password"):void 0}),i.jsx(bdProfileRowV280,{icon:lQ,title:"Язык интерфейса",value:"Русский"})]})}),t?i.jsx(bdProfileSectionV280,{title:"Заведение",children:i.jsxs(i.Fragment,{children:[i.jsxs(E?"button":"div",{type:E?"button":void 0,onClick:E?()=>h(!0):void 0,className:"bd-profile-venue-head-v280"+(E?" is-action":""),children:[i.jsx(bdVenueLogoV280,{profile:t,size:64}),i.jsxs("span",{className:"bd-profile-venue-copy-v280",children:[i.jsx("strong",{children:t.name||"Заведение"}),i.jsx("small",{children:[t.businessType,t.city].filter(Boolean).join(" · ")||"Данные заведения"})]}),E&&i.jsx(Br,{size:17,className:"bd-profile-row-chevron-v280","aria-hidden":!0})]}),B.length>0&&i.jsx("div",{className:"bd-profile-venue-metrics-v280",children:B.map(C=>i.jsxs("span",{className:"bd-profile-metric-v280",children:[i.jsx("strong",{children:C.value}),i.jsx("small",{children:C.label})]},C.label))}),i.jsx(bdProfileRowV280,{icon:lQ,title:"Валюта учёта",value:t.currency||"Не выбрана",onClick:E?()=>h(!0):void 0})]})}):i.jsx(bdProfileSectionV280,{title:"Заведение",children:i.jsx(bdProfileRowV280,{icon:J2,title:"Заведение не настроено",subtitle:"Добавьте данные текущего заведения",onClick:()=>e("/setup")})}),i.jsx(bdProfileSectionV280,{title:"Система",children:i.jsxs(i.Fragment,{children:[i.jsx(bdProfileRowV280,{icon:m$,title:"Устройства и сессии",value:M,onClick:()=>v(!0)}),i.jsx(bdProfileRowV280,{icon:kQ,title:"Выйти из аккаунта",destructive:!0,onClick:q})]})})]}),i.jsx(JCe,{open:d,onClose:()=>f(!1),onSave:D,initialFirstName:r?.firstName??"",initialLastName:r?.lastName??"",initialEmail:r?.email??"",initialPhone:r?.phone??"",initialRole:r?.role??"owner"},d?"ue-open":"ue-closed"),i.jsx(ZCe,{open:m,profile:t,onClose:()=>h(!1),onSave:z},m?"re-open":"re-closed"),i.jsx(bdSettingsSessionsSheetV182,{open:j,onClose:()=>v(!1),state:g,onRetry:_,onRevokeOthers:L,revoking:b})]})}`;

source = source.slice(0, profileStart) + helpers + profile + source.slice(moreStart);
{
  const userEditorStart = source.indexOf("function JCe");
  const userEditorEnd = source.indexOf(marker, userEditorStart);
  let userEditor = source.slice(userEditorStart, userEditorEnd);
  userEditor = userEditor.replace(
    'i.jsx("button",{type:"button",onClick:t,className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
    'i.jsx("button",{type:"button",onClick:t,"aria-label":"Закрыть редактирование профиля",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
  );
  source = source.slice(0, userEditorStart) + userEditor + source.slice(userEditorEnd);
}

source = source.replace(
  'competitorsText:(e.competitors??[]).join(", "),seats:',
  'competitorsText:(e.competitors??[]).join(", "),logoId:e.logoId??null,seats:'
).replace(
  'venueFormat:"",competitorsText:"",seats:',
  'venueFormat:"",competitorsText:"",logoId:null,seats:'
);

const editorStart = source.indexOf("function ZCe({open:e,profile:t,onClose:n,onSave:r})");
const editorEnd = source.indexOf("function JCe", editorStart);
let editor = source.slice(editorStart, editorEnd);
editor = editor.replace(
  'const[a,s]=S.useState(()=>QCe(t));S.useEffect(()=>{e&&t&&s(QCe(t))},[e,t]);',
  'const{toast:bdToast}=sn(),[a,s]=S.useState(()=>QCe(t)),[bdLogoFile,bdSetLogoFile]=S.useState(null),[bdLogoRemoved,bdSetLogoRemoved]=S.useState(!1),[bdSaving,bdSetSaving]=S.useState(!1),bdLogoInput=S.useRef(null),bdLogoPreview=S.useMemo(()=>bdLogoFile?URL.createObjectURL(bdLogoFile):"",[bdLogoFile]);S.useEffect(()=>()=>{bdLogoPreview&&URL.revokeObjectURL(bdLogoPreview)},[bdLogoPreview]);S.useEffect(()=>{e&&t&&s(QCe(t))},[e,t]);S.useEffect(()=>{e&&(bdSetLogoFile(null),bdSetLogoRemoved(!1))},[e]);'
);
editor = editor.replace(
  /function y\(\)\{if\(t\?\.currency[\s\S]*?r\(N\),n\(\)\}/,
  `async function y(){if(t?.currency&&bdAccountingCurrencyV243(a.currency)!==bdAccountingCurrencyV243(t.currency)&&!window.confirm("Изменить валюту учёта?\\n\\nИсходные суммы и валюты документов не изменятся. Денежные показатели заведения будут отображаться в новой валюте учёта."))return;bdSetSaving(!0);let bdNextLogoId=bdLogoRemoved?null:a.logoId;try{if(bdLogoFile){const bdPrepared=await bdProcPrepareImage(bdLogoFile,{targetBytes:900*1024,force:!0}),bdForm=new FormData;bdForm.append("file",bdPrepared.file,"venue-logo."+bdPrepared.extension);const bdResponse=await fetch("/api/venues/logo",{method:"POST",headers:{...ca(Ot()||"")},body:bdForm}),bdBody=await bdResponse.json();if(!bdResponse.ok||!bdBody?.ok||!bdBody.logo?.id)throw new Error(bdBody?.error||"Не удалось загрузить логотип заведения");bdNextLogoId=bdBody.logo.id}const b=As.find(E=>E.code===a.countryCode)?.name??t?.country??"",N={name:a.name.trim()||t?.name||"",businessType:a.businessType||t?.businessType||"",country:b,city:a.city,region:a.region.trim(),venueFormat:a.venueFormat.trim(),currency:bdAccountingCurrencyV243(a.currency),seats:Number(a.seats)||0,employees:Number(a.employees)||0,openTime:a.openTime,closeTime:a.closeTime,areas:a.areas,workingDays:a.workingDays,competitors:a.competitorsText.split(",").map(E=>E.trim()).filter(Boolean),logoId:bdNextLogoId};await r(N);if(a.logoId&&a.logoId!==bdNextLogoId)fetch("/api/venues/logo/"+a.logoId,{method:"DELETE",headers:{...ca(Ot()||"")}}).catch(()=>{});n()}catch(b){bdToast({variant:"error",title:"Не удалось сохранить",description:b?.message||"Проверьте соединение и попробуйте ещё раз."})}finally{bdSetSaving(!1)}}`
);
const contentAnchor = 'children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Название заведения *"})';
const logoBlock = 'children:[i.jsxs("div",{className:"bd-venue-logo-editor-v280",children:[i.jsx(bdVenueLogoV280,{profile:{...t,logoId:bdLogoRemoved?null:a.logoId,name:a.name},size:72,previewUrl:bdLogoPreview}),i.jsxs("div",{className:"bd-venue-logo-editor-actions-v280",children:[i.jsx("input",{ref:bdLogoInput,type:"file",accept:"image/jpeg,image/png,image/webp",hidden:!0,onChange:b=>{const N=b.target.files?.[0]||null;N&&(bdSetLogoFile(N),bdSetLogoRemoved(!1));b.target.value=""}}),i.jsx("button",{type:"button",onClick:()=>bdLogoInput.current?.click(),children:a.logoId||bdLogoFile?"Заменить логотип":"Загрузить логотип"}),(a.logoId||bdLogoFile)&&i.jsx("button",{type:"button",className:"is-remove",onClick:()=>{bdSetLogoFile(null),bdSetLogoRemoved(!0)},children:"Удалить"})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Название заведения *"})';
if (!editor.includes(contentAnchor)) throw new Error("Venue editor content anchor not found");
editor = editor.replace(contentAnchor, logoBlock);
editor = editor.replace(/,i\.jsxs\("div",\{children:\[i\.jsx\("p",\{className:"text-\[11px\] font-bold uppercase tracking-wider text-muted-foreground mb-1\.5",children:"Конкуренты рядом"\}\),i\.jsx\("input",\{type:"text",value:a\.competitorsText,onChange:b=>f\("competitorsText",b\.target\.value\),placeholder:"Через запятую: название 1, название 2…",className:"bd-field-input"\}\)\]\}\)/, "");
editor = editor.replace('onClick:y,disabled:!v,className:', 'onClick:y,disabled:!v||bdSaving,className:').replace('children:"Сохранить"', 'children:bdSaving?"Сохраняем…":"Сохранить"');
source = source.slice(0, editorStart) + editor + source.slice(editorEnd);

fs.writeFileSync(bundlePath, source);
console.log("Profile v280 patch applied");
