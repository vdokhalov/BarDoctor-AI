import fs from "node:fs/promises";

const paths = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("./patch-tech-card-costing-v376.mjs", import.meta.url),
];
const stale = "Средневзвешенная складская стоимость; резерв — последняя подтверждённая закупка";
const current = "Последний применимый подтверждённый приход";

for (const path of paths) {
  const source = await fs.readFile(path, "utf8");
  if (!source.includes(stale)) {
    if (!source.includes(current)) throw new Error(`Cost rule copy not found in ${path.pathname}`);
    continue;
  }
  await fs.writeFile(path, source.replaceAll(stale, current));
}

console.log("Latest applicable receipt copy v412 applied");
