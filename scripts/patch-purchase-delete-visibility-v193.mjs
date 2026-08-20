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
        'className:"fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-[60]"',
        'className:"bd-document-detail-backdrop-v193 fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-[60]"',
        "document detail backdrop layer",
      );
      const originalSheet = 'className:"fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden",style:{maxWidth:n?760:500,margin:"0 auto",maxHeight:"94dvh"}';
      const overRaisedSheet = 'className:"bd-document-detail-sheet-v193 fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden",style:{maxWidth:n?760:500,margin:"0 auto",maxHeight:"94dvh",zIndex:1600}';
      const layeredSheet = 'className:"bd-document-detail-sheet-v193 fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden",style:{maxWidth:n?760:500,margin:"0 auto",maxHeight:"94dvh",zIndex:80}';
      if (next.includes(originalSheet)) next = next.replace(originalSheet, layeredSheet);
      else if (next.includes(overRaisedSheet)) next = next.replace(overRaisedSheet, layeredSheet);
      else if (!next.includes(layeredSheet)) throw new Error("Missing document detail sheet layer");
      const ambiguousMenu = 'i.jsxs("div",{className:"bd-document-detail-header-actions-v192",children:[(bdOnDelete||bdDeleteBlockedReason)&&i.jsxs("details",{className:"bd-document-detail-menu-v192",children:[i.jsx("summary",{role:"button","aria-label":"Действия с накладной",title:"Действия с накладной",children:"⋯"}),i.jsx("div",{role:"menu","aria-label":"Действия с накладной",children:bdOnDelete?i.jsx("button",{type:"button",role:"menuitem",disabled:bdDeleteBusy,onClick:bdOnDelete,children:bdDeleteBusy?"Удаляю…":"Удалить накладную"}):i.jsx("p",{children:bdDeleteBlockedReason})})]}),i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0",children:i.jsx(vt,{size:16,className:"text-foreground"})})]})';
      const closeOnly = 'i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0",children:i.jsx(vt,{size:16,className:"text-foreground"})})';
      if (next.includes(ambiguousMenu)) next = next.replace(ambiguousMenu, closeOnly);
      else if (next.includes("bd-document-detail-menu-v192")) throw new Error("Missing ambiguous header menu");
      next = required(
        next,
        'i.jsxs("footer",{className:"flex-shrink-0 px-6 pb-8 pt-3 border-t border-border flex gap-2",children:[i.jsx("button",{type:"button",onClick:a,className:"h-12 flex-1 rounded-2xl border border-border bg-white text-[14px] font-bold text-foreground",children:"Закрыть"}),s&&i.jsx("button",{type:"button",onClick:s,className:"h-12 flex-1 rounded-2xl bg-primary text-white text-[14px] font-bold",children:n?"Редактировать накладную":"Редактировать"})]})',
        'i.jsxs("footer",{className:"bd-document-detail-footer-v193 flex-shrink-0 px-6 pb-8 pt-3 border-t border-border",children:[bdOnDelete?i.jsx("button",{type:"button","aria-label":"Удалить накладную",disabled:bdDeleteBusy,onClick:bdOnDelete,className:"bd-document-detail-delete-v193",children:bdDeleteBusy?"Удаляю накладную…":"Удалить накладную"}):bdDeleteBlockedReason?i.jsx("p",{className:"bd-document-detail-delete-reason-v193",children:bdDeleteBlockedReason}):null,i.jsx("button",{type:"button",onClick:a,className:"bd-document-detail-close-v193 h-12 rounded-2xl border border-border bg-white text-[14px] font-bold text-foreground",children:"Закрыть"}),s&&i.jsx("button",{type:"button",onClick:s,className:"bd-document-detail-edit-v193 h-12 rounded-2xl bg-primary text-white text-[14px] font-bold",children:n?"Редактировать накладную":"Редактировать"})]})',
        "visible footer delete action",
      );
      return next;
    },
    "document detail function",
  );
}

function patchFinanceLayer(source) {
  return required(
    source,
    '"data-bd-finance-dashboard":"v160","data-bd-finance-density":"v161",className:"bd-finance-page-v160"',
    '"data-bd-finance-dashboard":"v160","data-bd-finance-density":"v161",className:"bd-finance-page-v160 "+(documentView?"bd-finance-document-open-v193":"")',
    "finance document layer state",
  );
}

let bundle = await readFile(bundlePath, "utf8");
bundle = required(
  bundle,
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192";',
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193";',
  "delete visibility marker",
);
bundle = patchDocumentDetail(bundle);
bundle = patchFinanceLayer(bundle);
await writeFile(bundlePath, bundle);

let fragment = await readFile(procurementFragmentPath, "utf8");
fragment = required(
  fragment,
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192";',
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193";',
  "fragment delete visibility marker",
);
await writeFile(procurementFragmentPath, fragment);

console.log("Purchase delete visibility v193 applied.");
