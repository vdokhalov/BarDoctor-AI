import { parse } from "acorn";
import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");
const marker = 'const bdShiftWriteoffVersionV272="canonical-shift-writeoff-v272";';
source = source.replace(
  "const params=new URLSearchParams(location),linkedShift=",
  "const params=new URLSearchParams(window.location.search),linkedShift=",
);
source = source.replace(
  "noe=Object.keys(Lg).filter(e=>!roe.has(e));",
  'noe=Object.keys(Lg).filter(e=>!roe.has(e)&&e!=="writeoff");',
);
source = source.replace(
  '&&(d!=="writeoff"||(j.trim().length>0&&(!e.length||!!b)))',
  "",
);
source = source.replace(
  'children:d==="writeoff"?"Раздел списания *":"Зона (опционально)"',
  'children:"Зона (опционально)"',
);
source = source.replace(
  'children:d==="writeoff"?"Причина списания *":H?"Описание ремонта":"Описание"',
  'children:H?"Описание ремонта":"Описание"',
);
source = source.replace(
  'placeholder:H?"Что было сделано (необязательно)":d==="writeoff"?"Что списано и почему":void 0,"aria-label":d==="writeoff"?"Причина списания":"Описание расхода"',
  'placeholder:H?"Что было сделано (необязательно)":void 0,"aria-label":"Описание расхода"',
);
source = source.replace(
  'onEdit:canManageFinance?()=>{const e=documentView.record',
  'onEdit:canManageFinance&&documentView.record?.category!=="writeoff"?()=>{const e=documentView.record',
);
source = source.replace(
  'i.jsxs("summary",{role:"button",onClick:e=>{e.preventDefault();const t=e.currentTarget.closest("details");t&&setTimeout(()=>t.open=!0,0)},className:"bd-finance-quick-add-fab"',
  'i.jsxs("summary",{role:"button",className:"bd-finance-quick-add-fab"',
);
const financeMenuWriteOffV272 = ',i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),window.bdNavigate("/warehouse?tab=writeoffs&add=writeoff&returnTo=finance")},children:"Создать списание"})';
source = source.split(financeMenuWriteOffV272).join("");
source = source.replace(
  '{key:"inventory",label:"Внести остатки",icon:Dn,action:()=>e("/warehouse?add=inventory")},{key:"utilities"',
  '{key:"inventory",label:"Внести остатки",icon:Dn,action:()=>e("/warehouse?add=inventory")},{key:"writeoff",label:"Создать списание",icon:Dn,action:()=>window.bdNavigate("/warehouse?tab=writeoffs&writeoff=new&returnTo=finance")},{key:"utilities"',
);
source = source.replaceAll(
  "/warehouse?tab=writeoffs&add=writeoff&returnTo=finance",
  "/warehouse?tab=writeoffs&writeoff=new&returnTo=finance",
);
if (source.includes(marker)) {
  source = source.replace(
    'writeoffs.length===0&&!e&&i.jsxs("div"',
    'writeoffs.length===0&&!e?.id&&i.jsxs("div"',
  );
  source = source.replace(
    '!e&&i.jsx("button",{type:"button",onClick:addWriteoff',
    '!e?.id&&i.jsx("button",{type:"button",onClick:addWriteoff',
  );
  source = source.replace(
    'c>0&&i.jsx("button",{type:"button",onClick:()=>setStep(',
    'c>0&&i.jsx("button",{type:"button","data-bd-internal-step-navigation":"back",onClick:()=>setStep(',
  );
  source = source.replace(
    'children:e?"Редактирование смены":"Ежедневное закрытие смены"',
    'children:e?.id?"Редактирование смены":"Ежедневное закрытие смены"',
  );
  source = source.replace(
    'c===4?e?"Сохранить изменения":"Закрыть смену":"Далее"',
    'c===4?e?.id?"Сохранить изменения":"Закрыть смену":"Далее"',
  );
  source = source.replace(
    'setBdShiftCatalogV272(je.catalog||[]),setBdShiftReasonsV272(je.reasons||bdWriteoffReasonFallbackV271),setBdShiftWriteoffErrorV272("")',
    'setBdShiftCatalogV272(je.catalog||[]),setBdShiftReasonsV272(je.reasons||bdWriteoffReasonFallbackV271),window.bdActiveWriteoffVenueV271=je.venueId,setBdShiftWriteoffErrorV272("")',
  );
  source = source.replace(
    ',d(je.revenueRecord)}catch(ye)',
    ';try{d(je.revenueRecord)}catch{}try{document.querySelectorAll(\'[data-bd-unsaved-changes="true"]\').forEach(fe=>window.bdMarkNavigationClean?.(fe))}catch{}u()}catch(ye)',
  );
  const shiftApiStart = source.indexOf("async function bdShiftCloseApiV272");
  const shiftApiEnd = source.indexOf("\nfunction PAe", shiftApiStart);
  if (shiftApiStart >= 0 && shiftApiEnd > shiftApiStart) {
    let shiftApi = source.slice(shiftApiStart, shiftApiEnd);
    shiftApi = shiftApi
      .replaceAll('Kse("bd_assortment_v1"', 'Vm("bd_assortment_v1"')
      .replaceAll('Kse("bd_stock_movements"', 'Vm("bd_stock_movements"')
      .replaceAll('Kse("bd_inventory_writeoffs"', 'Vm("bd_inventory_writeoffs"')
      .replaceAll('Kse("bd_finance_expenses"', 'Vm("bd_finance_expenses"');
    if (!shiftApi.includes('Vm("bd_inventory_writeoffs"')) {
      shiftApi = shiftApi.replace(
        "return r}",
        'r.assortment&&Vm("bd_assortment_v1",r.assortment),r.stockMovements&&Vm("bd_stock_movements",r.stockMovements),r.writeOffs&&Vm("bd_inventory_writeoffs",r.writeOffs),r.expenses&&Vm("bd_finance_expenses",r.expenses);return r}',
      );
    }
    if (!shiftApi.includes('setTimeout(()=>["bd_assortment_v1"')) {
      shiftApi = shiftApi.replace(
        ";return r}",
        ',setTimeout(()=>["bd_assortment_v1","bd_stock_movements","bd_inventory_writeoffs","bd_finance_expenses"].forEach(a=>window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:a}}))),0);return r}',
      );
    }
    source = source.slice(0, shiftApiStart) + shiftApi + source.slice(shiftApiEnd);
  }
  if (!source.includes("bd-writeoff-shift-link-v272")) {
    source = source.replace(
      'function bdWriteoffDetailV271({document:e,onClose:t,onCancel:n,canManage:r})',
      'function bdWriteoffDetailV271({document:e,onClose:t,onCancel:n,canManage:r,onOpenShift:o})',
    );
    source = source.replace(
      '["Статус",bdWriteoffStatusV271(e.status)]',
      '["Статус",bdWriteoffStatusV271(e.status)],...(e.shiftId?[["Источник","Закрытие смены"]]:[])',
    );
    source = source.replace(
      'e.comment&&i.jsxs("section",{className:"bd-writeoff-detail-comment-v271"',
      'e.shiftId&&i.jsxs("section",{className:"bd-writeoff-shift-link-v272",children:[i.jsx("h3",{children:"Связано со сменой"}),i.jsx("button",{type:"button",onClick:()=>o?.(e.shiftId),children:"Открыть смену"})]}),e.comment&&i.jsxs("section",{className:"bd-writeoff-detail-comment-v271"',
    );
    source = source.replace(
      'i.jsx("span",{children:(A.reasonLabel||"Без причины")+" · "+(A.location||"Основной склад")})',
      'i.jsx("span",{children:(A.reasonLabel||"Без причины")+" · "+(A.location||"Основной склад")+(A.shiftId?" · Смена":"")})',
    );
    source = source.replace(
      'onCancel:()=>D(_),canManage:n}',
      'onCancel:()=>D(_),canManage:n,onOpenShift:L=>a("/shifts?shift="+encodeURIComponent(L))}',
    );
    console.log("Canonical shift write-off links v272 restored after warehouse regeneration");
  } else console.log("Canonical shift write-offs v272 are already applied.");
  parse(source, { ecmaVersion: "latest", sourceType: "module" });
  await writeFile(bundlePath, source);
  process.exit(0);
}

const ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
const form = ast.body.find((node) => node.type === "FunctionDeclaration" && node.id?.name === "PAe");
if (!form) throw new Error("Shift closing form PAe was not found");

const helper = String.raw`${marker}
async function bdShiftCloseApiV272(e){const t=await fetch("/api/shifts/close",{method:"POST",credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json",...ca(Ot()),"Idempotency-Key":e.shiftCloseId},body:JSON.stringify(e)}),n=await t.text();let r={};try{r=n?JSON.parse(n):{}}catch{}if(!t.ok||!r?.ok){const a=new Error(r?.error||"Не удалось закрыть смену");throw a.code=r?.code,a.status=t.status,a}r.assortment&&Vm("bd_assortment_v1",r.assortment),r.stockMovements&&Vm("bd_stock_movements",r.stockMovements),r.writeOffs&&Vm("bd_inventory_writeoffs",r.writeOffs),r.expenses&&Vm("bd_finance_expenses",r.expenses),setTimeout(()=>["bd_assortment_v1","bd_stock_movements","bd_inventory_writeoffs","bd_finance_expenses"].forEach(a=>window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:a}}))),0);return r}
`;
source = source.slice(0, form.start) + helper + source.slice(form.start);

const shiftedAst = parse(source, { ecmaVersion: "latest", sourceType: "module" });
const shiftedForm = shiftedAst.body.find((node) => node.type === "FunctionDeclaration" && node.id?.name === "PAe");
if (!shiftedForm) throw new Error("Shift closing form was lost after helper insertion");
let fn = source.slice(shiftedForm.start, shiftedForm.end);

function replaceFn(search, replacement, label) {
  const first = fn.indexOf(search);
  if (first < 0) throw new Error(`Could not find ${label}`);
  if (fn.indexOf(search, first + search.length) >= 0) throw new Error(`Expected one ${label}`);
  fn = fn.slice(0, first) + replacement + fn.slice(first + search.length);
}

replaceFn('{expenses:pe,addExpense:xe}=Ur()', '{expenses:pe}=Ur()', "legacy expense writer");
replaceFn(
  '[writeoffs,setWriteoffs]=S.useState([]),[incidents,setIncidents]=S.useState([])',
  '[bdShiftCloseIdV272]=S.useState(()=>String(e?.shiftCloseId||("shift-close:"+String(e?.id||crypto.randomUUID())))),[writeoffs,setWriteoffs]=S.useState([]),[bdShiftCatalogV272,setBdShiftCatalogV272]=S.useState([]),[bdShiftReasonsV272,setBdShiftReasonsV272]=S.useState(bdWriteoffReasonFallbackV271),[bdShiftPickerV272,setBdShiftPickerV272]=S.useState(!1),[bdShiftSavingV272,setBdShiftSavingV272]=S.useState(!1),[bdShiftWriteoffErrorV272,setBdShiftWriteoffErrorV272]=S.useState(""),[incidents,setIncidents]=S.useState([])',
  "shift write-off state",
);
replaceFn(
  ',writeoffAreas=S.useMemo(()=>Array.from(new Set([...(Array.isArray(t)?t:[]),"Бар","Кухня","Кальяны","Прочее"])),[t]),Z=',
  ',bdShiftCatalogByKeyV272=S.useMemo(()=>new Map(bdShiftCatalogV272.map(ye=>[ye.productKey,ye])),[bdShiftCatalogV272]),Z=',
  "legacy write-off areas",
);
replaceFn(
  'writeoffsValid=writeoffs.every(ye=>Number.isFinite(Number(ye.amount))&&Number(ye.amount)>0&&ye.description.trim().length>0)',
  'writeoffsValid=writeoffs.every(ye=>ye.productKey&&Number.isFinite(Number(ye.quantity))&&Number(ye.quantity)>0&&ye.reasonCode&&(ye.reasonCode!=="other"||String(ye.comment||"").trim().length>0))',
  "legacy write-off validation",
);
replaceFn(
  'payrollTotal=ce.payrollBreakdown?.total??0,newWriteoffs=writeoffs.reduce((ye,je)=>ye+(Number(je.amount)||0),0),existingWriteoffs=',
  'payrollTotal=ce.payrollBreakdown?.total??0,newWriteoffs=writeoffs.reduce((ye,je)=>{const fe=bdShiftCatalogByKeyV272.get(je.productKey);if(!fe||!(Number(fe.averageUnitCost)>0))return ye;const Ce=bdWriteoffBaseV271(fe,je);return ye+(Ce.amount>0?Ce.amount*Number(fe.averageUnitCost):0)},0),bdShiftUnvaluedV272=writeoffs.filter(ye=>{const je=bdShiftCatalogByKeyV272.get(ye.productKey);return !je||!(Number(je.averageUnitCost)>0)}).length,existingWriteoffs=',
  "manual write-off total",
);
replaceFn(
  'stepValid=[revenueValid,staffValid,writeoffsValid,incidentsValid,!0][c];',
  'stepValid=[revenueValid,staffValid,writeoffsValid,incidentsValid,!0][c];S.useEffect(()=>{let ye=!0;bdWriteoffApiV271(!1).then(je=>{if(!ye)return;setBdShiftCatalogV272(je.catalog||[]),setBdShiftReasonsV272(je.reasons||bdWriteoffReasonFallbackV271),window.bdActiveWriteoffVenueV271=je.venueId,setBdShiftWriteoffErrorV272("")}).catch(je=>{ye&&setBdShiftWriteoffErrorV272(je instanceof Error?je.message:"Не удалось загрузить Номенклатуру")});return()=>{ye=!1}},[]);',
  "shift step validation terminator",
);
replaceFn(
  'function addWriteoff(){setWriteoffs(ye=>[...ye,{id:Yce(),area:writeoffAreas[0]??"Прочее",amount:"",description:""}])}\nfunction updateWriteoff(ye,je,fe){setWriteoffs(Ce=>Ce.map(he=>he.id===ye?{...he,[je]:fe}:he))}',
  'function addWriteoff(){setBdShiftPickerV272(!0)}\nfunction pickWriteoff(ye){setWriteoffs(je=>je.some(fe=>fe.productKey===ye.productKey)?je:[...je,{id:Yce(),productKey:ye.productKey,quantity:"",unit:bdWriteoffDefaultUnitV271(ye),reasonCode:"",comment:"",location:ye.section||ye.category||"Основной склад"}]),setBdShiftPickerV272(!1)}\nfunction updateWriteoff(ye,je,fe){setWriteoffs(Ce=>Ce.map(he=>he.id===ye?{...he,[je]:fe}:he))}',
  "legacy write-off mutators",
);

const saveStart = fn.indexOf("function saveShift(){");
const nextStart = fn.indexOf("function nextStep()", saveStart);
if (saveStart < 0 || nextStart < 0) throw new Error("Shift save function anchors were not found");
const saveFunction = String.raw`async function saveShift(){if(!(revenueValid&&staffValid&&writeoffsValid&&incidentsValid)||bdShiftSavingV272)return;setBdShiftSavingV272(!0),setBdShiftWriteoffErrorV272("");try{const ye=buildRevenueRecord(),je=await bdShiftCloseApiV272({shiftCloseId:bdShiftCloseIdV272,shiftId:e?.id,venueId:window.bdActiveWriteoffVenueV271,revenueRecord:ye,writeOffItems:writeoffs.map(fe=>({id:fe.id,nomenclatureItemId:fe.productKey,productKey:fe.productKey,quantity:Number(fe.quantity),unit:String(fe.unit).startsWith("package:")?"package":fe.unit,packagingLabel:String(fe.unit).startsWith("package:")?String(fe.unit).slice(8):void 0,reasonCode:fe.reasonCode,comment:String(fe.comment||"").trim()||void 0,location:fe.location}))});const fe=new Date().toISOString();for(const Ce of incidents){const he=activeEmployees.find(Ge=>Ge.id===Ce.responsibleId),le=Ce.participantIds.map(Ge=>activeEmployees.find(Be=>Be.id===Ge)?.name).filter(Boolean);we({id:Yce(),category:Ce.category,title:Ce.title.trim(),description:Ce.description.trim(),priority:"medium",status:"open",responsible:he?.name??"",responsibleId:Ce.responsibleId||void 0,participantIds:Ce.participantIds,eventDate:new Date(f+"T12:00:00").toISOString(),photos:[],voiceNote:null,extraField:le.join(", "),createdAt:fe,updatedAt:fe})}Js(),window.dispatchEvent(new CustomEvent("bd:shift-closed",{detail:{date:f,writeoffs:je.writeOffDocuments?.length||0,incidents:incidents.length,canonical:!0}}));try{d(je.revenueRecord)}catch{}try{document.querySelectorAll('[data-bd-unsaved-changes="true"]').forEach(fe=>window.bdMarkNavigationClean?.(fe))}catch{}u()}catch(ye){setBdShiftWriteoffErrorV272(ye instanceof Error?ye.message:"Не удалось закрыть смену"),De({variant:"error",title:"Смена не закрыта",description:ye instanceof Error?ye.message:"Проверьте списания и повторите"}),setStep(2)}finally{setBdShiftSavingV272(!1)}}
`;
fn = fn.slice(0, saveStart) + saveFunction + fn.slice(nextStart);

const uiStart = fn.indexOf('c===2&&i.jsxs("div"');
const uiEnd = fn.indexOf(',c===3&&i.jsxs("div"', uiStart);
if (uiStart < 0 || uiEnd < 0) throw new Error("Shift write-off UI anchors were not found");
const writeoffUi = String.raw`c===2&&i.jsxs("div",{className:"flex flex-col gap-3 bd-shift-writeoffs-v272","data-bd-shift-writeoffs":"canonical-v272",children:[i.jsx("p",{className:"text-[13px] text-muted-foreground leading-relaxed",children:"Добавьте только фактические списания этой смены. Товар, количество и причина сформируют обычный складской документ."}),e?.writeOffDocumentIds?.length?i.jsxs("div",{className:"bd-shift-writeoff-linked-v272",children:[i.jsx("strong",{children:"Списания уже проведены"}),i.jsx("span",{children:"Документы этой смены доступны в Склад → Списания. Проведённые операции здесь не редактируются."})]}):null,bdShiftWriteoffErrorV272&&i.jsx("div",{className:"bd-shift-writeoff-error-v272",role:"alert",children:bdShiftWriteoffErrorV272}),writeoffs.length===0&&!e?.id&&i.jsxs("div",{className:"rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4",children:[i.jsx("p",{className:"text-[14px] font-bold text-emerald-800",children:"Списаний не указано"}),i.jsx("p",{className:"text-[12px] text-emerald-700 mt-1",children:"Если фактических потерь не было, переходите дальше."})]}),writeoffs.map((ye,je)=>{const fe=bdShiftCatalogByKeyV272.get(ye.productKey);return fe?i.jsxs("section",{className:"bd-shift-writeoff-item-v272",children:[i.jsx(bdWriteoffLineV271,{line:ye,item:fe,onChange:Ce=>setWriteoffs(he=>he.map(le=>le.id===ye.id?Ce:le)),onRemove:()=>setWriteoffs(Ce=>Ce.filter(he=>he.id!==ye.id))}),i.jsxs("div",{className:"bd-shift-writeoff-meta-v272",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Причина *"}),i.jsxs("select",{value:ye.reasonCode,onChange:Ce=>updateWriteoff(ye.id,"reasonCode",Ce.target.value),"aria-label":"Причина "+fe.name,children:[i.jsx("option",{value:"",children:"Выберите причину"}),bdShiftReasonsV272.map(Ce=>i.jsx("option",{value:Ce.code,children:Ce.label},Ce.code))]})]}),i.jsxs("label",{children:[i.jsx("span",{children:ye.reasonCode==="other"?"Комментарий *":"Комментарий"}),i.jsx("input",{value:ye.comment||"",onChange:Ce=>updateWriteoff(ye.id,"comment",Ce.target.value),placeholder:"Необязательно","aria-label":"Комментарий "+fe.name})]})]})]},ye.id):null}),!e?.id&&i.jsx("button",{type:"button",onClick:addWriteoff,disabled:!bdShiftCatalogV272.length,className:"h-12 rounded-2xl border border-primary/25 bg-primary/5 text-[13px] font-bold text-primary disabled:opacity-50",children:"+ Добавить позицию"}),writeoffs.length>0&&i.jsxs("div",{className:"bd-shift-writeoff-total-v272",children:[i.jsxs("span",{children:[writeoffs.length," поз."]}),i.jsx("strong",{children:bdShiftUnvaluedV272===writeoffs.length?"Стоимость не рассчитана":"≈ "+bdWarehouseMoney(newWriteoffs,bdShiftCatalogV272.find(ye=>ye.currency)?.currency||"RUB")})]}),!writeoffsValid&&i.jsx("p",{className:"text-[12px] text-destructive font-medium",children:"Для каждой позиции выберите товар, количество и причину. Для «Другое» нужен комментарий."}),bdShiftPickerV272&&i.jsx(bdWriteoffPickerV271,{catalog:bdShiftCatalogV272.filter(ye=>!writeoffs.some(je=>je.productKey===ye.productKey)),onPick:pickWriteoff,onClose:()=>setBdShiftPickerV272(!1)})]})`;
fn = fn.slice(0, uiStart) + writeoffUi + fn.slice(uiEnd);

replaceFn(
  'disabled:!stepValid,onClick:c===4?saveShift:nextStep',
  'disabled:!stepValid||bdShiftSavingV272,onClick:c===4?saveShift:nextStep',
  "shift next button state",
);
replaceFn(
  'children:c===4?e?"Сохранить изменения":"Закрыть смену":"Далее"',
  'children:bdShiftSavingV272?"Закрываю…":c===4?e?.id?"Сохранить изменения":"Закрыть смену":"Далее"',
  "shift next button label",
);
replaceFn(
  'children:e?"Редактирование смены":"Ежедневное закрытие смены"',
  'children:e?.id?"Редактирование смены":"Ежедневное закрытие смены"',
  "new versus persisted shift label",
);
replaceFn(
  'c>0&&i.jsx("button",{type:"button",onClick:()=>setStep(',
  'c>0&&i.jsx("button",{type:"button","data-bd-internal-step-navigation":"back",onClick:()=>setStep(',
  "internal wizard Back marker",
);

source = source.slice(0, shiftedForm.start) + fn + source.slice(shiftedForm.end);

const shiftsEffect = 'S.useEffect(()=>{const params=new URLSearchParams(location);if(params.get("closeShift")==="1"&&profile){setEditing(todayState?.operatingDate?{date:todayState.operatingDate}:void 0);setSheet("revenue")}},[location,profile,todayState?.operatingDate]);';
const shiftsEffectV272 = 'S.useEffect(()=>{const params=new URLSearchParams(location),linkedShift=params.get("shift");if(linkedShift){const linkedItem=timeline.find(item=>String(item.row?.id||"")===linkedShift);if(linkedItem){setViewing(linkedItem),setEditing(void 0),setSheet(null);return}}if(params.get("closeShift")==="1"&&profile){setEditing(todayState?.operatingDate?{date:todayState.operatingDate}:void 0);setSheet("revenue")}},[location,profile,todayState?.operatingDate,timeline]);';
if (!source.includes(shiftsEffect)) throw new Error("Shifts deep-link effect was not found");
source = source.replace(shiftsEffect, shiftsEffectV272);
source = source.replace('onClose:()=>setViewing(null),onEdit:openEdit', 'onClose:()=>{setViewing(null);new URLSearchParams(location).get("shift")&&window.history.back()},onEdit:openEdit');

const detailSignature = 'function bdWriteoffDetailV271({document:e,onClose:t,onCancel:n,canManage:r})';
if (!source.includes(detailSignature)) throw new Error("Write-off detail signature was not found");
source = source.replace(detailSignature, 'function bdWriteoffDetailV271({document:e,onClose:t,onCancel:n,canManage:r,onOpenShift:o})');
source = source.replace('["Статус",bdWriteoffStatusV271(e.status)]', '["Статус",bdWriteoffStatusV271(e.status)],...(e.shiftId?[["Источник","Закрытие смены"]]:[])');
source = source.replace('e.comment&&i.jsxs("section",{className:"bd-writeoff-detail-comment-v271"', 'e.shiftId&&i.jsxs("section",{className:"bd-writeoff-shift-link-v272",children:[i.jsx("h3",{children:"Связано со сменой"}),i.jsx("button",{type:"button",onClick:()=>o?.(e.shiftId),children:"Открыть смену"})]}),e.comment&&i.jsxs("section",{className:"bd-writeoff-detail-comment-v271"');
source = source.replace('i.jsx("span",{children:(A.reasonLabel||"Без причины")+" · "+(A.location||"Основной склад")})', 'i.jsx("span",{children:(A.reasonLabel||"Без причины")+" · "+(A.location||"Основной склад")+(A.shiftId?" · Смена":"")})');
source = source.replace('onCancel:()=>D(_),canManage:n}', 'onCancel:()=>D(_),canManage:n,onOpenShift:L=>a("/shifts?shift="+encodeURIComponent(L))}');

parse(source, { ecmaVersion: "latest", sourceType: "module" });
await writeFile(bundlePath, source);
console.log("Canonical shift write-offs v272 patched");
