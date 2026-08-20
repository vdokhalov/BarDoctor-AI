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

let bundle = await readFile(bundlePath, "utf8");

bundle = replaceOnce(
  bundle,
  "function Kse(e,t){Vm(e,t)}",
  'function Kse(e,t){Vm(e,t);try{window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:e}}))}catch{}}',
  "server-store update event",
);

bundle = replaceOnce(
  bundle,
  "S.useEffect(()=>{t&&(r(ss(gM())),s(ss(yM())),u(vM()))},[t]);const j=S.useRef(m);",
  'S.useEffect(()=>{t&&(r(ss(gM())),s(ss(yM())),u(vM()))},[t]);S.useEffect(()=>{const M=D=>{const z=D?.detail?.storeKey;z===Wm?r(ss(gM())):z===Km?s(ss(yM())):z===Vd&&u(vM())};return window.addEventListener("bd:store-updated",M),()=>window.removeEventListener("bd:store-updated",M)},[]);const j=S.useRef(m);',
  "finance provider live refresh",
);

bundle = replaceOnce(
  bundle,
  'Array.isArray(c.suppliers)&&(Kse(bdSupplierStoreKey,c.suppliers),l(c.suppliers)),Array.isArray(c.documents)&&(Kse(bdPurchaseStoreKey,c.documents),d(c.documents)),Array.isArray(c.expenses)&&Kse("bd_finance_expenses",c.expenses),m(null),n({variant:"success",title:f.documentType==="price_list"?"Прайс сохранён":"Закупка учтена",description:f.documentType==="price_list"?"Цены доступны для сравнения.":"Расход и история цен созданы один раз из этого документа."})',
  'f.documentType!=="price_list"&&!c.expense&&(()=>{throw new Error("Закупка сохранена, но расход не подтверждён. Повторите сохранение — дубли не создадутся.")})(),Array.isArray(c.suppliers)&&(Kse(bdSupplierStoreKey,c.suppliers),l(c.suppliers)),Array.isArray(c.documents)&&(Kse(bdPurchaseStoreKey,c.documents),d(c.documents)),Array.isArray(c.expenses)&&Kse("bd_finance_expenses",c.expenses),c.assortment&&Kse("bd_assortment_v1",c.assortment),Array.isArray(c.stockMovements)&&Kse("bd_stock_movements",c.stockMovements),m(null),n({variant:"success",title:f.documentType==="price_list"?"Прайс сохранён":"Закупка и расход учтены",description:f.documentType==="price_list"?"Цены доступны для сравнения.":`${bdProcMoney(Number(c.expense?.amount)||Number(f.total)||0,f.currency)} добавлено в расходы. ${Number(c.inventorySummary?.postedLines)||f.items?.length||0} позиций поставлено на приход.`})',
  "purchase confirmation state propagation",
);

bundle = replaceOnce(
  bundle,
  'bdSupplierWorkspaceVersion="procurement-v33"',
  'bdSupplierWorkspaceVersion="procurement-v34"',
  "supplier workspace version",
);

bundle = replaceOnce(
  bundle,
  'const bdReleaseCandidateVersion="rc-v73"',
  'const bdReleaseCandidateVersion="rc-v74"',
  "release candidate version",
);

await writeFile(bundlePath, bundle);
