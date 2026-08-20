import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const bundlePath = resolve(root, "public/assets/index-BQGspy0I.js");
const procurementFragmentPath = resolve(root, "scripts/fragments/procurement-command-v168.fragment.txt");

function required(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
}

function patchFunction(source, startMarker, endMarker, patch, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing ${label}`);
  const block = source.slice(start, end);
  return source.slice(0, start) + patch(block) + source.slice(end);
}

function patchDocumentDetail(source) {
  return patchFunction(
    source,
    "function bdDocumentDetailSheet(",
    "function bdDetailFact(",
    (block) => {
      let next = required(
        block,
        "function bdDocumentDetailSheet({expense:e,revenue:t,document:n,equipment:r,onClose:a,onEdit:s}){",
        "function bdDocumentDetailSheet({expense:e,revenue:t,document:n,equipment:r,onClose:a,onEdit:s,onDelete:bdOnDelete,deleteBusy:bdDeleteBusy=!1,deleteBlockedReason:bdDeleteBlockedReason=\"\"}){",
        "document detail delete props",
      );
      next = required(
        next,
        'i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0",children:i.jsx(vt,{size:16,className:"text-foreground"})})',
        'i.jsxs("div",{className:"bd-document-detail-header-actions-v192",children:[(bdOnDelete||bdDeleteBlockedReason)&&i.jsxs("details",{className:"bd-document-detail-menu-v192",children:[i.jsx("summary",{role:"button","aria-label":"Действия с накладной",title:"Действия с накладной",children:"⋯"}),i.jsx("div",{role:"menu","aria-label":"Действия с накладной",children:bdOnDelete?i.jsx("button",{type:"button",role:"menuitem",disabled:bdDeleteBusy,onClick:bdOnDelete,children:bdDeleteBusy?"Удаляю…":"Удалить накладную"}):i.jsx("p",{children:bdDeleteBlockedReason})})]}),i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0",children:i.jsx(vt,{size:16,className:"text-foreground"})})]})',
        "document detail action menu",
      );
      return next;
    },
    "document detail function",
  );
}

const financeDeleteHandler = String.raw`async function deleteViewedPurchase(){const e=viewedPurchaseDocument;if(!e)return;const t=expenses.filter(n=>bdProcActivePaymentV186(n,e.id)),n=t.reduce((r,a)=>r+bdProcNumberV168(a?.amount),0);if(t.length){toast({variant:"error",title:"Накладная не удалена",description:"По накладной есть "+t.length+" "+bdProcPluralV168(t.length,"активный платёж","активных платежа","активных платежей")+" на "+bdProcMoneyV168(n,e.currency||"RUB")+". Сначала отмените связанные платежи в блоке «Платежи», затем повторите удаление."});return}const r=e.status==="confirmed",a=r?"Удалить накладную «"+(e.supplierName||"Поставщик")+"»?\n\nНакладная уже проведена. При удалении её влияние на склад будет отменено. История действия сохранится.":e.status==="cancelled"?"Удалить накладную «"+(e.supplierName||"Поставщик")+"»?\n\nПроведение уже отменено. Документ будет исключён из актуальных расчётов, история действия сохранится.":"Удалить накладную «"+(e.supplierName||"Поставщик")+"»?\n\nЧерновик будет удалён. Склад и финансы не изменятся.";if(!window.confirm(a))return;setPurchaseDeleteBusy(!0);let s=null;try{if(r){const l=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:e.id,reason:"Накладная удалена пользователем: проведение отменено перед удалением"})});s=await l.json();if(!l.ok||!s.ok)throw new Error(s.error||"Не удалось отменить складское влияние накладной")}const l=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:e.id})}),u=await l.json();if(!l.ok||!u.ok)throw new Error(u.error||"Не удалось удалить накладную");bdProcApplyServerResultV186(u),setDocumentView(null),toast({variant:"success",title:"Накладная удалена",description:r?"Складское влияние отменено, документ исключён из актуальных расчётов. История сохранена.":e.status==="draft"?"Черновик удалён. Склад и финансы не изменились.":"Документ удалён из актуальных расчётов. История сохранена."})}catch(l){s?.ok&&bdProcApplyServerResultV186(s),toast({variant:"error",title:"Накладная не удалена",description:s?.ok?"Проведение отменено, но документ не удалён: "+(l instanceof Error?l.message:"повторите попытку."):l instanceof Error?l.message:"Повторите попытку."})}finally{setPurchaseDeleteBusy(!1)}}`;

function patchFinanceEntry(source) {
  let next = required(
    source,
    '[documentView,setDocumentView]=S.useState(null),[quickAddOpen,setQuickAddOpen]=S.useState(!1),purchaseDocuments=bdProcArray("bd_purchase_documents"),canManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner";',
    '[documentView,setDocumentView]=S.useState(null),[purchaseDeleteBusy,setPurchaseDeleteBusy]=S.useState(!1),[quickAddOpen,setQuickAddOpen]=S.useState(!1),purchaseDocuments=bdProcArray("bd_purchase_documents"),canManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner",canManagePurchases=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner",viewedPurchaseDocument=documentView?.type==="expense"&&documentView.record?.sourceDocumentId?purchaseDocuments.find(e=>e.id===documentView.record.sourceDocumentId):null;',
    "finance purchase delete state",
  );
  next = required(
    next,
    'function confirmDelete(){if(!pendingDelete)return;pendingDelete.type==="revenue"?deleteDailyRevenue(pendingDelete.id):deleteExpense(pendingDelete.id),setPendingDelete(null),toast({variant:"success",title:"Запись удалена"})}\nfunction openRevenueAdd()',
    `function confirmDelete(){if(!pendingDelete)return;pendingDelete.type==="revenue"?deleteDailyRevenue(pendingDelete.id):deleteExpense(pendingDelete.id),setPendingDelete(null),toast({variant:"success",title:"Запись удалена"})}\n${financeDeleteHandler}\nfunction openRevenueAdd()`,
    "finance purchase delete handler",
  );
  next = required(
    next,
    'document:documentView.type==="expense"&&documentView.record?.sourceDocumentId?purchaseDocuments.find(e=>e.id===documentView.record.sourceDocumentId):null,equipment,onClose:',
    'document:viewedPurchaseDocument,equipment,onDelete:viewedPurchaseDocument&&canManagePurchases?deleteViewedPurchase:null,deleteBusy:purchaseDeleteBusy,deleteBlockedReason:viewedPurchaseDocument&&!canManagePurchases?"Удалить накладную нельзя: у вашей роли нет права управления закупками.":"",onClose:',
    "finance document detail delete wiring",
  );
  return next;
}

let bundle = await readFile(bundlePath, "utf8");
bundle = required(
  bundle,
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191";',
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192";',
  "delete entry marker",
);
bundle = patchDocumentDetail(bundle);
bundle = patchFinanceEntry(bundle);
await writeFile(bundlePath, bundle);

let fragment = await readFile(procurementFragmentPath, "utf8");
fragment = required(
  fragment,
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191";',
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192";',
  "fragment delete entry marker",
);
await writeFile(procurementFragmentPath, fragment);

console.log("Purchase delete entry v192 applied.");
