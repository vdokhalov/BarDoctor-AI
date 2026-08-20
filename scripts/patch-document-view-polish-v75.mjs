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

function replaceInSection(source, startNeedle, endNeedle, transform, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start === -1 || end === -1) throw new Error(`Missing section: ${label}`);
  const section = source.slice(start, end);
  return source.slice(0, start) + transform(section) + source.slice(end);
}

let bundle = await readFile(bundlePath, "utf8");

bundle = replaceInSection(
  bundle,
  "function bdDocumentDetailSheet",
  "function bdDetailFact",
  (section) => replaceOnce(
    section,
    'style:{maxWidth:430,margin:"0 auto",maxHeight:"94dvh"}',
    'style:{maxWidth:n?760:500,margin:"0 auto",maxHeight:"94dvh"}',
    "responsive document viewer width",
  ),
  "document detail viewer",
);

bundle = replaceInSection(bundle, "function BAe(){", "function Ge(", (section) => {
  section = replaceOnce(
    section,
    'bdPurchaseDocuments=bdProcArray("bd_purchase_documents");S.useEffect',
    'bdPurchaseDocuments=bdProcArray("bd_purchase_documents"),bdCanManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect',
    "finance edit permission",
  );
  section = replaceOnce(
    section,
    'onEdit:()=>{const ve=bdFinanceView.record',
    'onEdit:bdCanManageFinance?()=>{const ve=bdFinanceView.record',
    "finance viewer edit guard start",
  );
  section = replaceOnce(
    section,
    ':(A(ve),_("revenue"))}}),i.jsxs(qe',
    ':(A(ve),_("revenue"))}:null}),i.jsxs(qe',
    "finance viewer edit guard end",
  );
  return section;
}, "finance page");

bundle = replaceInSection(
  bundle,
  "function bdSuppliersPage(){",
  "const bdPhotoGalleryVersion",
  (section) => {
    section = replaceOnce(
      section,
      'A=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect',
      'A=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner",bdCanManageFinance=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("finance.manage"):localStorage.getItem("bd_active_role")==="owner";S.useEffect',
      "supplier finance edit permission",
    );
    section = replaceOnce(
      section,
      'onEdit:A?()=>{const p=bdViewedPurchase;',
      'onEdit:A&&(bdViewedPurchase.documentType==="price_list"||bdCanManageFinance)?()=>{const p=bdViewedPurchase;',
      "supplier viewer edit guard",
    );
    return section;
  },
  "supplier page",
);

await writeFile(bundlePath, bundle);
