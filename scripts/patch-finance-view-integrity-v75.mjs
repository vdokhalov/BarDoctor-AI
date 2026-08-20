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

const source = await readFile(bundlePath, "utf8");
const start = source.indexOf("function BAe(){");
const end = source.indexOf("function Ge(", start);
if (start === -1 || end === -1) throw new Error("Finance page not found");
let finance = source.slice(start, end);

finance = replaceOnce(
  finance,
  'i.jsx("button",{type:"button",onClick:lt=>{lt.stopPropagation(),D({type:"revenue",id:ve.id})},className:',
  'bdCanManageFinance&&i.jsx("button",{type:"button","aria-label":"Удалить запись о выручке",onClick:lt=>{lt.stopPropagation(),D({type:"revenue",id:ve.id})},className:',
  "revenue delete permission",
);
finance = replaceOnce(
  finance,
  'i.jsx("button",{type:"button",onClick:ot=>{ot.stopPropagation(),D({type:"expense",id:ve.id})},className:',
  '!bdLinkedDocument&&bdCanManageFinance&&i.jsx("button",{type:"button","aria-label":"Удалить расход",onClick:ot=>{ot.stopPropagation(),D({type:"expense",id:ve.id})},className:',
  "linked expense integrity",
);
finance = replaceOnce(
  finance,
  'i.jsx("button",{type:"button",onClick:()=>{A(void 0),O(void 0),L(void 0),_(b==="revenue"?"revenue":"expense")},"aria-label":"Добавить операцию"',
  'bdCanManageFinance&&i.jsx("button",{type:"button",onClick:()=>{A(void 0),O(void 0),L(void 0),_(b==="revenue"?"revenue":"expense")},"aria-label":"Добавить операцию"',
  "finance create permission",
);

await writeFile(bundlePath, source.slice(0, start) + finance + source.slice(end));
