import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('household:"Хозтовары"')) {
  console.log("Household expense category v6 is already applied.");
  process.exit(0);
}

if (!source.includes('"data-bd-month-result":"expenses-v5"')) {
  throw new Error("Period expense breakdown v5 must be applied first.");
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  source = source.slice(0, index) + replacement + source.slice(index + search.length);
}

replaceOnce(
  'transport:"Транспорт",consumables:"Расходники",writeoff:"Списания"',
  'transport:"Транспорт",consumables:"Расходники",household:"Хозтовары",writeoff:"Списания"',
);

replaceOnce(
  'transport:"Транспорт",other:"Прочее"',
  'transport:"Транспорт",household:"Хозтовары",other:"Прочее"',
);

await writeFile(bundlePath, source);
console.log("Household expense category v6 applied.");
