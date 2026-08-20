import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const bundlePath = resolve(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = resolve(root, "scripts/fragments/procurement-command-v168.fragment.txt");

const oldCacheToken = "20260814-purchase-delete-visible-v193";
const newCacheToken = "20260814-purchase-delete-one-step-v194";
const cacheTargets = [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
  "tests/assortment-command-v170.test.mjs",
  "tests/brand-identity.test.mjs",
  "tests/equipment-command-v167.test.mjs",
  "tests/finance-dashboard-v160.test.mjs",
  "tests/health-score-experience.test.mjs",
  "tests/more-hub-v166.test.mjs",
  "tests/payroll-dashboard-v164.test.mjs",
  "tests/procurement-command-v168.test.mjs",
  "tests/rendered-html.test.mjs",
  "tests/settings-experience-v182.test.mjs",
  "tests/shifts-experience.test.mjs",
  "tests/team-management-v163.test.mjs",
];

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

const procurementDeleteHandler = String.raw`async function bdProcDeleteV194(w){const active=m.filter(payment=>bdProcActivePaymentV186(payment,w.id)),paymentTotal=active.reduce((sum,payment)=>sum+bdProcNumberV168(payment?.amount),0),isPriceList=w.documentType==="price_list",isPosted=w.status==="confirmed";if(active.length&&!de){a({variant:"error",title:"Накладная не удалена",description:"По накладной есть связанные оплаты. Для их автоматической отмены требуется право управления финансами."});return}const actions=[];active.length&&actions.push("— отмена "+active.length+" "+bdProcPluralV168(active.length,"связанного платежа","связанных платежей","связанных платежей")+" на "+bdProcMoneyV168(paymentTotal,w.currency||"RUB")),isPosted&&actions.push("— отмена поступления на склад"),actions.push("— удаление накладной");const warning=isPriceList?"Удалить прайс «"+(w.supplierName||"Поставщик")+"»?\n\nПрайс будет исключён из актуальных предложений.":w.status==="draft"&&!active.length?"Удалить черновик накладной «"+(w.supplierName||"Поставщик")+"»?\n\nСклад и финансы не изменятся.":"Удалить накладную «"+(w.supplierName||"Поставщик")+"»?\n\nБудет выполнено автоматически:\n"+actions.join("\n")+".\n\nИстория операций сохранится.";if(!window.confirm(warning))return;bdSetProcLifecycleBusy(!0);let cancelResult=null,lastPaymentResult=null,reversedCount=0;try{if(isPosted){const response=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id,reason:"Накладная удалена пользователем: складское влияние отменено автоматически"})});cancelResult=await response.json();if(!response.ok||!cancelResult.ok)throw new Error(cancelResult.error||"Не удалось отменить складское влияние накладной");bdProcApplyServerResultV186(cancelResult)}for(const payment of active){const response=await fetch("/api/purchases/payment/reverse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId:payment.id,reason:"Оплата автоматически отменена при удалении накладной"})});lastPaymentResult=await response.json();if(!response.ok||!lastPaymentResult.ok)throw new Error(lastPaymentResult.error||"Не удалось отменить связанную оплату");reversedCount+=1,bdProcApplyServerResultV186(lastPaymentResult)}const response=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id})}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"Не удалось удалить накладную");bdProcApplyServerResultV186(result),M(null),e(bdProcQueryUrlV168({documentId:null,edit:null})),a({variant:"success",title:isPriceList?"Прайс удалён":"Накладная удалена",description:active.length?"Связанные оплаты отменены, склад и расчёты пересчитаны. История операций сохранена.":isPosted?"Поступление на склад отменено, накладная удалена. История сохранена.":w.status==="draft"?"Черновик удалён. Склад и финансы не изменились.":"Документ исключён из актуальных расчётов. История сохранена."})}catch(error){cancelResult?.ok&&bdProcApplyServerResultV186(cancelResult),lastPaymentResult?.ok&&bdProcApplyServerResultV186(lastPaymentResult);const message=error instanceof Error?error.message:"Повторите попытку.",description=reversedCount?reversedCount+" "+bdProcPluralV168(reversedCount,"оплата отменена","оплаты отменены","оплат отменено")+". Накладная сохранена: "+message:cancelResult?.ok?"Поступление на склад уже отменено. Накладная сохранена: "+message:message;a({variant:"error",title:"Удаление не завершено",description})}finally{bdSetProcLifecycleBusy(!1)}}`;

const financeDeleteHandler = String.raw`async function deleteViewedPurchase(){const e=viewedPurchaseDocument;if(!e)return;const active=expenses.filter(payment=>bdProcActivePaymentV186(payment,e.id)),paymentTotal=active.reduce((sum,payment)=>sum+bdProcNumberV168(payment?.amount),0),isPosted=e.status==="confirmed";if(active.length&&!canManageFinance){toast({variant:"error",title:"Накладная не удалена",description:"По накладной есть связанные оплаты. Для их автоматической отмены требуется право управления финансами."});return}const actions=[];active.length&&actions.push("— отмена "+active.length+" "+bdProcPluralV168(active.length,"связанного платежа","связанных платежей","связанных платежей")+" на "+bdProcMoneyV168(paymentTotal,e.currency||"RUB")),isPosted&&actions.push("— отмена поступления на склад"),actions.push("— удаление накладной");const warning=e.status==="draft"&&!active.length?"Удалить черновик накладной «"+(e.supplierName||"Поставщик")+"»?\n\nСклад и финансы не изменятся.":"Удалить накладную «"+(e.supplierName||"Поставщик")+"»?\n\nБудет выполнено автоматически:\n"+actions.join("\n")+".\n\nИстория операций сохранится.";if(!window.confirm(warning))return;setPurchaseDeleteBusy(!0);let cancelResult=null,lastPaymentResult=null,reversedCount=0;try{if(isPosted){const response=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:e.id,reason:"Накладная удалена пользователем: складское влияние отменено автоматически"})});cancelResult=await response.json();if(!response.ok||!cancelResult.ok)throw new Error(cancelResult.error||"Не удалось отменить складское влияние накладной");bdProcApplyServerResultV186(cancelResult)}for(const payment of active){const response=await fetch("/api/purchases/payment/reverse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId:payment.id,reason:"Оплата автоматически отменена при удалении накладной"})});lastPaymentResult=await response.json();if(!response.ok||!lastPaymentResult.ok)throw new Error(lastPaymentResult.error||"Не удалось отменить связанную оплату");reversedCount+=1,bdProcApplyServerResultV186(lastPaymentResult)}const response=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:e.id})}),result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"Не удалось удалить накладную");bdProcApplyServerResultV186(result),setDocumentView(null),toast({variant:"success",title:"Накладная удалена",description:active.length?"Связанные оплаты отменены, склад и расчёты пересчитаны. История операций сохранена.":isPosted?"Поступление на склад отменено, накладная удалена. История сохранена.":e.status==="draft"?"Черновик удалён. Склад и финансы не изменились.":"Документ исключён из актуальных расчётов. История сохранена."})}catch(error){cancelResult?.ok&&bdProcApplyServerResultV186(cancelResult),lastPaymentResult?.ok&&bdProcApplyServerResultV186(lastPaymentResult);const message=error instanceof Error?error.message:"Повторите попытку.",description=reversedCount?reversedCount+" "+bdProcPluralV168(reversedCount,"оплата отменена","оплаты отменены","оплат отменено")+". Накладная сохранена: "+message:cancelResult?.ok?"Поступление на склад уже отменено. Накладная сохранена: "+message:message;toast({variant:"error",title:"Удаление не завершено",description})}finally{setPurchaseDeleteBusy(!1)}}`;

function patchProcurement(source) {
  let next = required(
    source,
    'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193";',
    'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193",bdPurchaseDeleteOneStepV194="v194";',
    "one-step delete marker",
  );
  next = replaceBlock(
    next,
    "async function bdProcDeleteV191(",
    "async function bdProcSavePaymentV186(",
    procurementDeleteHandler,
    "procurement delete handler",
  );
  next = required(
    next,
    "onDelete:ue?()=>bdProcDeleteV191(O):null",
    "onDelete:ue?()=>bdProcDeleteV194(O):null",
    "one-step delete invocation",
  );
  return next;
}

let bundle = await readFile(bundlePath, "utf8");
bundle = patchProcurement(bundle);
bundle = replaceBlock(
  bundle,
  "async function deleteViewedPurchase()",
  "function openRevenueAdd()",
  financeDeleteHandler,
  "finance delete handler",
);
await writeFile(bundlePath, bundle);

let fragment = await readFile(fragmentPath, "utf8");
fragment = patchProcurement(fragment);
await writeFile(fragmentPath, fragment);

for (const file of cacheTargets) {
  const path = resolve(root, file);
  const source = await readFile(path, "utf8");
  if (!source.includes(oldCacheToken) && !source.includes(newCacheToken)) {
    throw new Error(`Missing cache token in ${file}`);
  }
  await writeFile(path, source.replaceAll(oldCacheToken, newCacheToken));
}

console.log("Purchase delete one-step flow v194 applied.");
