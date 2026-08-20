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
  'e(`/suppliers?documentId=${encodeURIComponent(Re.id)}&edit=1`)',
  'e(`/suppliers?documentId=${encodeURIComponent(Re.id)}&edit=1&returnTo=finance`)',
  "finance edit return path",
);
bundle = replaceOnce(
  bundle,
  'function bdSuppliersPage(){const[,e]=bt(),bdSupplierQuery=ste(),{isReady:t}=Ai()',
  'function bdSuppliersPage(){const[,e]=bt(),bdSupplierQuery=ste(),bdSupplierReturnTo=new URLSearchParams(bdSupplierQuery).get("returnTo")==="finance"?"/finance":"/suppliers",{isReady:t}=Ai()',
  "supplier return path",
);
bundle = replaceOnce(
  bundle,
  'if(p?.status==="confirmed"){e("/suppliers");return}',
  'if(p?.status==="confirmed"){e(bdSupplierReturnTo);return}',
  "confirmed edit cancel destination",
);
bundle = replaceOnce(
  bundle,
  'm(null),bdEditingConfirmed&&e("/suppliers"),n({variant:',
  'm(null),bdEditingConfirmed&&e(bdSupplierReturnTo),n({variant:',
  "confirmed edit success destination",
);
bundle = replaceOnce(
  bundle,
  'bdSupplierQuery&&e("/suppliers")},onEdit:',
  'bdSupplierQuery&&e(bdSupplierReturnTo)},onEdit:',
  "document viewer close destination",
);

await writeFile(bundlePath, bundle);
