import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const targets = [
  "public/assets/index-BQGspy0I.js",
  "scripts/fragments/procurement-command-v168.fragment.txt",
].map((file) => resolve(root, file));

function required(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  if (source.includes(replacement)) return source;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing ${label}`);
  return source.slice(0, start) + replacement + "\n" + source.slice(end);
}

const deleteHandler = String.raw`async function bdProcDeleteV191(w){const R=m.filter(P=>bdProcActivePaymentV186(P,w.id)),P=R.reduce((c,p)=>c+bdProcNumberV168(p?.amount),0);if(R.length){a({variant:"error",title:"Накладная не удалена",description:"По накладной есть "+R.length+" "+bdProcPluralV168(R.length,"активный платёж","активных платежа","активных платежей")+" на "+bdProcMoneyV168(P,w.currency||"RUB")+". Сначала отмените связанные платежи в блоке «Платежи», затем повторите удаление."});return}const c=w.documentType==="price_list",p=w.status==="confirmed",X=p?"Удалить накладную «"+(w.supplierName||"Поставщик")+"»?\n\nНакладная уже проведена. При удалении её влияние на склад будет отменено. История действия сохранится.":w.status==="cancelled"?"Удалить накладную «"+(w.supplierName||"Поставщик")+"»?\n\nПроведение уже отменено. Документ будет исключён из актуальных расчётов, история действия сохранится.":c?"Удалить прайс «"+(w.supplierName||"Поставщик")+"»?\n\nПрайс будет удалён из актуальных предложений.":"Удалить накладную «"+(w.supplierName||"Поставщик")+"»?\n\nЧерновик будет удалён. Склад и финансы не изменятся.";if(!window.confirm(X))return;bdSetProcLifecycleBusy(!0);let Z=null;try{if(p){const oe=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id,reason:"Накладная удалена пользователем: проведение отменено перед удалением"})});Z=await oe.json();if(!oe.ok||!Z.ok)throw new Error(Z.error||"Не удалось отменить складское влияние накладной")}const oe=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id})}),ie=await oe.json();if(!oe.ok||!ie.ok)throw new Error(ie.error||"Не удалось удалить накладную");bdProcApplyServerResultV186(ie),M(null),e(bdProcQueryUrlV168({documentId:null,edit:null})),a({variant:"success",title:c?"Прайс удалён":"Накладная удалена",description:p?"Складское влияние отменено, документ исключён из актуальных расчётов. История сохранена.":w.status==="draft"?"Черновик удалён. Склад и финансы не изменились.":"Документ удалён из актуальных расчётов. История сохранена."})}catch(oe){Z?.ok&&bdProcApplyServerResultV186(Z),a({variant:"error",title:"Накладная не удалена",description:Z?.ok?"Проведение отменено, но документ не удалён: "+(oe instanceof Error?oe.message:"повторите попытку."):oe instanceof Error?oe.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}`;

function patchPurchaseDelete(source) {
  source = required(
    source,
    'const bdProcurementSettlementUiV190="v190";',
    'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191";',
    "delete UI marker",
  );
  source = required(
    source,
    ',B=P.paymentStatus,U=!M&&(e?.status==="draft"||D&&T.length===0)||z;return',
    ',B=P.paymentStatus;return',
    "obsolete delete visibility calculation",
  );
  source = required(
    source,
    'U&&y&&f&&i.jsx("button",{type:"button",className:"danger",onClick:f,disabled:v,children:z?"Удалить прайс":"Удалить закупку"})',
    'y&&f&&i.jsx("button",{type:"button",className:"danger",onClick:f,disabled:v,children:z?"Удалить прайс":"Удалить накладную"}),!y&&!z&&i.jsx("span",{className:"bd-proc-action-reason-v191",children:"Удалить накладную нельзя: у вашей роли нет права управления закупками."})',
    "visible invoice delete action",
  );
  source = replaceBlock(
    source,
    "async function bdProcDeleteV186(",
    "async function bdProcSavePaymentV186(",
    deleteHandler,
    "purchase delete handler",
  );
  source = required(
    source,
    "onDelete:ue?()=>bdProcDeleteV186(O):null",
    "onDelete:ue?()=>bdProcDeleteV191(O):null",
    "delete handler invocation",
  );
  return source;
}

for (const target of targets) {
  const source = await readFile(target, "utf8");
  await writeFile(target, patchPurchaseDelete(source));
}

console.log("Purchase delete UI v191 applied.");
