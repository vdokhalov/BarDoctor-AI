import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  'function bdExpenseArea(e){return e.area||(e.category==="hookah"?"Кальяны":e.category==="household"?"Хоз.товары":"Не распределено")}',
  'function bdExpenseArea(e){return e.area||({products:"Продукты",alcohol:"Алкоголь",food:"Кухня и напитки",consumables:"Расходники",hookah:"Кальяны",household:"Хоз.товары",equipment:"Оборудование",repairs:"Ремонт",marketing:"Маркетинг",other:"Прочее"})[e.category]||"Не распределено"}',
  "purchase expense grouping",
);

replaceOnce(
  'bdProcDocLabel(bdLinkedDocument.documentType)+" · "+(bdLinkedDocument.items?.length||0)+" позиций"',
  'bdProcDocLabel(bdLinkedDocument.documentType)+" · "+(bdLinkedDocument.items?.length||0)+" "+bdProcPluralV168(bdLinkedDocument.items?.length||0,"позиция","позиции","позиций")',
  "finance purchase line pluralization",
);

source += '\nconst bdFinancePurchaseGroupsV212="v212";\n';
await writeFile(bundlePath, source);
