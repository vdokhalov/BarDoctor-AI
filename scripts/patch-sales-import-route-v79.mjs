import fs from "node:fs";

const path = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(label, from, to) {
  const index = source.indexOf(from);
  if (index < 0) throw new Error(`Не найден фрагмент: ${label}`);
  if (source.indexOf(from, index + from.length) >= 0) {
    throw new Error(`Фрагмент найден больше одного раза: ${label}`);
  }
  source = source.slice(0, index) + to + source.slice(index + from.length);
}

replaceOnce(
  "маршрут импорта продаж",
  'window.location.assign("/sales-import.html")',
  'window.location.assign("/sales-import")',
);

replaceOnce(
  "версия кнопки импорта продаж",
  'data-bd-warehouse-sales-entry":"native-v76',
  'data-bd-warehouse-sales-entry":"native-v79',
);

replaceOnce(
  "версия релиз-кандидата",
  'const bdReleaseCandidateVersion="rc-v78"',
  'const bdReleaseCandidateVersion="rc-v79"',
);

fs.writeFileSync(path, source);
console.log("Sales import route v79 applied");
