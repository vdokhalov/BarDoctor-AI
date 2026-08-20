import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

const isApplied =
  source.includes('hookah:"Кальяны"') &&
  source.includes('household:"Хоз.товары"') &&
  source.includes("function bdExpenseArea(") &&
  source.includes('"consumables","hookah"');

if (isApplied) {
  console.log("Expense categories v7 are already applied.");
  process.exit(0);
}

if (!source.includes('household:"Хозтовары"')) {
  throw new Error("Household expense category v6 must be applied first.");
}

if (!source.includes('"data-bd-month-result":"expenses-v5"')) {
  throw new Error("Period expense breakdown v5 must be applied first.");
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  source = source.slice(0, index) + replacement + source.slice(index + search.length);
}

source = source.replaceAll('household:"Хозтовары"', 'household:"Хоз.товары"');

replaceOnce(
  'consumables:"Расходники",household:"Хоз.товары",writeoff:"Списания"',
  'consumables:"Расходники",hookah:"Кальяны",household:"Хоз.товары",writeoff:"Списания"',
);

replaceOnce(
  'roe=new Set(["alcohol","food","products","consumables"])',
  'roe=new Set(["alcohol","food","products","consumables","hookah"])',
);

replaceOnce(
  "function bdPeriodExpenseBreakdown",
  'function bdExpenseArea(e){return e.area||(e.category==="hookah"?"Кальяны":"Не распределено")}function bdPeriodExpenseBreakdown',
);

replaceOnce(
  'const a=r.area||"Не распределено";n.set(a,',
  "const a=bdExpenseArea(r);n.set(a,",
);

replaceOnce(
  '...v.map(q=>q.area||"Не распределено"),...b.map(q=>q.area||"Не распределено")',
  "...v.map(q=>bdExpenseArea(q)),...b.map(q=>bdExpenseArea(q))",
);

replaceOnce(
  'v.filter(C=>(C.area||"Не распределено")===q)',
  "v.filter(C=>bdExpenseArea(C)===q)",
);

replaceOnce(
  'b.filter(C=>(C.area||"Не распределено")===q)',
  "b.filter(C=>bdExpenseArea(C)===q)",
);

await writeFile(bundlePath, source);
console.log("Expense categories v7 applied.");
